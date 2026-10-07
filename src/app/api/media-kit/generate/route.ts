import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { creator_id } = await req.json();
    const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
    if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
    if (!creator_id || creator_id !== activeWorkspace.id) return NextResponse.json({ error: "無權存取此工作空間" }, { status: 403 });
    const previewBlock = trialPreviewAdmissionResponse();
    if (previewBlock) return previewBlock;
    const { data: creator, error: creatorError } = await admin.from("egg_creator_profiles").select("*").eq("id", activeWorkspace.id).single();
    if (creatorError || !creator) return NextResponse.json({ error: "找不到創作者資料" }, { status: 404 });

    const categories = Array.isArray(creator.content_categories) ? creator.content_categories : [];
    const fallbackCopy = {
      tagline_zh: creator.ai_profile_summary || creator.bio || `${creator.display_name || creator.username} 的創作者 Media Kit`,
      tagline_en: creator.display_name || creator.username,
      about_zh: creator.bio || creator.ai_profile_summary || "尚未填寫創作者介紹。",
      collaboration_types: [] as string[],
      audience_highlight_zh: "尚未有足夠受眾資料。",
      past_brand_categories: categories,
    };

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
