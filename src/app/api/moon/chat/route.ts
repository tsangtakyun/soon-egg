import { getAnthropic } from "@/lib/ai/anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, context, creatorData } = await req.json();
    const anthropic = getAnthropic();

    if (!anthropic) {
      const latest = messages?.at(-1)?.content ?? "";
      return NextResponse.json({
        reply: `我收到：「${latest}」。以 ${context} 角度睇，建議你先揀一個最容易量度成效的行動：更新 pitch、測試一個品牌配對，或者把最高點擊連結放到主頁第一位。`,
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: "你係 MOON，SOON-EGG 的亞洲創作者事業 AI 助理。用繁體中文或廣東話書面語，語氣專業、具體、有溫度。",
      messages: [{
        role: "user",
        content: JSON.stringify({ messages, context, creatorData }),
      }],
    });

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "MOON chat failed" }, { status: 500 });
  }
}
