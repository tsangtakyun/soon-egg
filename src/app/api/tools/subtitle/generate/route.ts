import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await deductCredits({ email: user.email, amount: CREDIT_COSTS.AI_GENERATION, type: "ai_generation", tool: "subtitle", description: "整理字幕" });
  if (!result.success) return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });

  const { title, language, transcript_text } = await req.json();
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });

  const prompt = `你係一個專業字幕編輯。請將以下文字整理成標準 SRT 字幕格式。
語言：${language}
原文：
${transcript_text}

要求：
- 每行字幕唔超過 20 個字
- 自動估算時間戳（假設平均語速）
- 保留原意，唔要改動內容
- 格式：
1
00:00:00,000 --> 00:00:03,000
字幕文字

2
...`;

  const message = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] });
  const srt = message.content[0]?.type === "text" ? message.content[0].text : "";
  const { data: session, error } = await (masterSupabase as any).from("subtitle_sessions").insert({
    user_id: user.id,
    title,
    language,
    srt_content: srt,
    status: "completed",
  }).select("id, title, language, srt_content, status, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ srt_content: srt, session, balance: result.balance });
}
