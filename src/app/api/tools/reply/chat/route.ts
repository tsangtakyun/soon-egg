import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await deductCredits({
    email: user.email,
    amount: CREDIT_COSTS.AI_GENERATION,
    type: "ai_generation",
    tool: "reply",
    description: "Mayan AI 回覆",
  });

  if (!result.success) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const { message, history } = await req.json();
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });

  const apiMessages = [
    ...((history ?? []) as HistoryMessage[]).map((item) => ({ role: item.role, content: item.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `你係 Mayan，一個專為亞洲 KOL 設計的創作夥伴。
你擅長：
- 幫 KOL 回覆品牌合作邀請（專業但友善）
- 寫吸引人的 IG / 小紅書 / YouTube caption
- 回覆粉絲留言（親切、有個性）
- 優化文案（更口語、更有力）
- 提供創作靈感和建議

語言：默認用繁體中文（香港廣東話風格），如果用戶用其他語言提問就跟著用。
風格：親切、專業、有創意，唔會太正式。`,
      messages: apiMessages,
    });

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "";

    await (masterSupabase as any).from("mayan_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ reply, balance: result.balance });
  } catch (error) {
    console.error("[mayan chat] error:", error);
    return NextResponse.json({ error: "Mayan chat failed" }, { status: 500 });
  }
}
