import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Handles = Record<string, string>;

type Analysis = {
  display_name: string;
  bio: string;
  content_categories: string[];
  content_language: string;
  ai_profile_summary: string;
  instagram_followers: number;
  youtube_subscribers: number;
  suggested_theme: string;
};

const fallbackAnalysis: Analysis = {
  display_name: "SOON-EGG",
  bio: "專注亞洲創作者工具、品牌合作與內容變現的創作者。",
  content_categories: ["創作者工具", "品牌合作", "內容變現"],
  content_language: "zh-HK",
  ai_profile_summary: "這位創作者聚焦亞洲創作者經濟，適合與工具平台、生活品牌及數碼產品合作。內容定位清晰，具備建立 Media Kit 與品牌合作管道的潛力。",
  instagram_followers: 0,
  youtube_subscribers: 0,
  suggested_theme: "現代極簡",
};

export async function POST(req: NextRequest) {
  try {
    const { handles = {} } = await req.json() as { handles?: Handles; userId?: string };
    const normalizedHandles = Object.fromEntries(
      Object.entries(handles).map(([key, value]) => [key, String(value ?? "").replace(/^@/, "").trim()]),
    ) as Handles;

    const platformInfo = Object.entries(normalizedHandles)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: @${value}`)
      .join("\n");

    const anthropic = getAnthropic();
    let analysis = fallbackAnalysis;

    if (anthropic && platformInfo) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `你係一個專門分析亞洲創作者嘅 AI 助理。

根據以下社交平台資料分析呢位創作者：
${platformInfo}

請用 JSON 格式回覆（只回 JSON，不要其他文字）：
{
  "display_name": "從handle推斷嘅顯示名稱",
  "bio": "一句話描述創作者定位（繁體中文，書面語）",
  "content_categories": ["最多5個繁體中文類別標籤"],
  "content_language": "zh-HK",
  "ai_profile_summary": "兩句話專業描述（繁體中文，書面語）",
  "instagram_followers": 0,
  "youtube_subscribers": 0,
  "suggested_theme": "日系清透"
}`,
        }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
      analysis = { ...fallbackAnalysis, ...parseJsonFromText<Partial<Analysis>>(text.replace(/```json|```/g, "").trim(), {}) };
    }

    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (supabase && user) {
      const username = normalizedHandles.instagram || normalizedHandles.youtube || normalizedHandles.tiktok || `user_${user.id.slice(0, 8)}`;
      const profilePayload = {
        user_id: user.id,
        username,
        display_name: analysis.display_name,
        bio: analysis.bio,
        instagram_handle: normalizedHandles.instagram || null,
        instagram_followers: analysis.instagram_followers ?? 0,
        youtube_handle: normalizedHandles.youtube || null,
        youtube_subscribers: analysis.youtube_subscribers ?? 0,
        tiktok_handle: normalizedHandles.tiktok || null,
        xiaohongshu_handle: normalizedHandles.xiaohongshu || null,
        content_categories: analysis.content_categories,
        content_language: analysis.content_language || "zh-HK",
        audience_demographics: { social_handles: normalizedHandles },
        ai_profile_summary: analysis.ai_profile_summary,
      };

      const { data: existing } = await supabase
        .from("egg_creator_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("egg_creator_profiles").update(profilePayload).eq("id", existing.id);
      } else {
        await supabase.from("egg_creator_profiles").insert(profilePayload);
      }
    }

    return NextResponse.json({ analysis, handles: normalizedHandles, saved: Boolean(user) });
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
