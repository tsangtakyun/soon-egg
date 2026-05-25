import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";

type Scene = {
  scene: number;
  time: string;
  visual: string;
  voiceover: string;
  shot_type: string;
  notes?: string;
};

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
    tool: "storyboard",
    description: "生成分鏡",
  });

  if (!result.success) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const { script_text, platform, scene_count, title } = await req.json();
  const anthropic = getAnthropic();

  if (!anthropic) {
    return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });
  }

  const prompt = `你係一個專業影片分鏡師。請根據以下劇本生成 ${scene_count} 個分鏡場景。

劇本：
${script_text}

平台：${platform}

請以 JSON 格式輸出，格式如下：
{
  "scenes": [
    {
      "scene": 1,
      "time": "0:00-0:10",
      "visual": "畫面描述，要拍咩",
      "voiceover": "這個場景的旁白或對白",
      "shot_type": "特寫/中景/全景",
      "notes": "拍攝備注（燈光、道具等）"
    }
  ]
}

只輸出 JSON，不要其他文字。`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text : "{}";
    const scenes = parseScenes(raw);
    await getOrCreateKolWorkspace(user.id, user.email, "");

    const { data: saved, error } = await (masterSupabase as any)
      .from("storyboards")
      .insert({
        user_id: user.id,
        title: title || `分鏡 ${new Date().toLocaleDateString("zh-HK")}`,
        scripts: script_text,
        selections: JSON.stringify(scenes),
        status: "draft",
      })
      .select("id, title, scripts, selections, status, created_at")
      .single();

    if (error) {
      console.error("[storyboard generate] save error:", error);
    }

    return NextResponse.json({ scenes, storyboard_id: saved?.id, saved, balance: result.balance });
  } catch (error) {
    console.error("[storyboard generate] error:", error);
    return NextResponse.json({ error: "Storyboard generation failed" }, { status: 500 });
  }
}

function parseScenes(raw: string): Scene[] {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed.scenes ?? [];
  } catch {
    return [];
  }
}
