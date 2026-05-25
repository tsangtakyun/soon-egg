import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";

const model = "claude-sonnet-4-20250514";

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
    tool: "script",
    description: "生成劇本",
  });

  if (!result.success) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const { title, background, tone, framework, hookVariant, targetMinutes, language } = await req.json();
  const anthropic = getAnthropic();

  if (!anthropic) {
    return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });
  }

  const langMap: Record<string, string> = {
    廣東話: "廣東話（香港口語，帶港式表達）",
    普通話: "普通話（簡體字，大陸用語）",
    英文: "英文（口語化，適合 YouTube）",
    台灣中文: "繁體中文（台灣用語）",
  };

  const prompt = `你係一個專業的短影片劇本創作者。請用${langMap[language] ?? language}幫我寫一個影片劇本。

題目：${title}
風格：${tone}
框架：${framework}
Hook 類型：${hookVariant}
目標時長：${targetMinutes} 分鐘
${background ? `背景資料：${background}` : ""}

請生成完整劇本，包括：
1. Hook（開場，吸引觀眾繼續睇）
2. 正文（主要內容，按框架展開）
3. 結尾 Call to Action

格式要求：
- 口語化，易朗讀
- 每段落換行
- 標註旁白 [VO] 或鏡頭提示 [CAM] 如適用
- 預計時長 ${targetMinutes} 分鐘`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const script = message.content[0]?.type === "text" ? message.content[0].text : "";
    const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, "");

    const { data: saved, error } = await (masterSupabase as any)
      .from("scripts")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        title,
        topic: title,
        background: background ?? null,
        tone,
        framework,
        hook_variant: hookVariant,
        target_minutes: targetMinutes,
        ai_draft: script,
        model,
        generated_at: new Date().toISOString(),
      })
      .select("id, title, topic, background, tone, framework, hook_variant, ai_draft, parts, created_at")
      .single();

    if (error) {
      console.error("[script generate] save error:", error);
    }

    return NextResponse.json({
      script,
      script_id: saved?.id,
      saved,
      balance: result.balance,
    });
  } catch (error) {
    console.error("[script generate] error:", error);
    return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
  }
}
