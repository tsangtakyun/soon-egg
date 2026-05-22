import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { demoCreator } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const fallbackCopy = {
  tagline_zh: "把亞洲生活靈感孵成可合作的內容品牌",
  tagline_en: "Turning Asian lifestyle stories into creator commerce.",
  about_zh: "SOON-EGG 專注香港生活、美食探店與創作者工具內容，以清晰、有溫度的短片連結年輕消費者。內容橫跨 Instagram、YouTube、小紅書與 TikTok，擅長把品牌訊息自然放進日常場景。",
  collaboration_types: ["短片開箱", "探店系列", "限時動態導流", "品牌體驗日記", "Affiliate campaign"],
  audience_highlight_zh: "核心受眾為 18-34 歲香港與台灣城市消費者，對美食、旅遊、美妝和創作者工具有高互動。",
  past_brand_categories: ["餐飲平台", "旅遊體驗", "美妝零售", "食品飲料"],
};

export async function POST(req: NextRequest) {
  try {
    const { creator_id } = await req.json();
    const supabase = await createClient();
    let creator = demoCreator;

    if (supabase && creator_id) {
      const { data } = await supabase.from("creator_profiles").select("*").eq("id", creator_id).single();
      creator = data ?? creator;
    }

    const anthropic = getAnthropic();
    let copy = fallbackCopy;

    if (anthropic) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `幫呢位亞洲創作者生成一份專業 Media Kit 嘅文案內容。

資料：
- 名稱：${creator.display_name}
- 定位：${creator.ai_profile_summary}
- 內容類別：${creator.content_categories?.join(", ")}
- IG 粉絲：${creator.instagram_followers}
- YT 訂閱：${creator.youtube_subscribers}
- 互動率：${creator.instagram_engagement_rate}%

只回覆 JSON：{
  "tagline_zh": "一句話品牌定位（繁體中文）",
  "tagline_en": "English tagline",
  "about_zh": "3-4句自我介紹（繁體中文）",
  "collaboration_types": ["合作形式列表"],
  "audience_highlight_zh": "受眾亮點描述",
  "past_brand_categories": ["曾合作品牌類型"]
}`,
        }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      copy = parseJsonFromText(text, fallbackCopy);
    }

    return NextResponse.json({
      creator,
      copy,
      stats: {
        total_reach: (creator.instagram_followers ?? 0) + (creator.youtube_subscribers ?? 0) + (creator.xiaohongshu_followers ?? 0) + (creator.tiktok_followers ?? 0),
        avg_engagement: creator.instagram_engagement_rate,
        platforms: ["Instagram", "YouTube", creator.xiaohongshu_handle ? "小紅書" : null, creator.tiktok_handle ? "TikTok" : null].filter(Boolean),
      },
    });
  } catch {
    return NextResponse.json({ error: "Media kit generation failed" }, { status: 500 });
  }
}
