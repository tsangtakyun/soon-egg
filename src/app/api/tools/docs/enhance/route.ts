import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await deductCredits({ email: user.email, amount: CREDIT_COSTS.AI_GENERATION, type: "ai_generation", tool: "docs", description: "完善文件內容" });
  if (!result.success) return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  const { content, type } = await req.json();
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });
  const prompt = `你係一個專業文案編輯。請幫我完善以下文件內容，保留原有結構，
令文字更專業、清晰，適合用於${type}。

原文：
${content}

請直接輸出完善後的文字，不要加任何說明。`;
  const message = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] });
  const enhanced = message.content[0]?.type === "text" ? message.content[0].text : content;
  return NextResponse.json({ content: enhanced, balance: result.balance });
}
