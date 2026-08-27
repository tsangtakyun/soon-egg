import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
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

  const { message, history } = (await req.json().catch(() => ({}))) as {
    message?: string;
    history?: HistoryMessage[];
  };
  const cleanMessage = message?.trim();
  if (!cleanMessage) return NextResponse.json({ error: "請輸入想回覆的訊息" }, { status: 400 });
  if (cleanMessage.length > 8000) return NextResponse.json({ error: "訊息太長，請縮短後再試" }, { status: 400 });

  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });

  const apiMessages = [
    ...(history ?? []).slice(-10).filter((item) => item.role === "user" || item.role === "assistant").map((item) => ({ role: item.role, content: String(item.content).slice(0, 8000) })),
    { role: "user" as const, content: cleanMessage },
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

    const { error: persistenceError } = await masterSupabase.from("mayan_messages").insert([
      { user_id: user.id, role: "user", content: cleanMessage },
      { user_id: user.id, role: "assistant", content: reply },
    ]);
    if (persistenceError) console.error("[mayan chat] history persistence failed:", persistenceError.message);

    return NextResponse.json({
      reply,
      warning: persistenceError ? "回覆已生成，但暫時未能儲存到對話記錄。" : undefined,
    });
  } catch (error) {
    console.error("[mayan chat] error:", error);
    return NextResponse.json({ error: "Mayan chat failed" }, { status: 500 });
  }
}
