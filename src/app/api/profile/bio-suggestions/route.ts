import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

type InstagramMedia = {
  caption?: string;
  media_type?: string;
  timestamp?: string;
};

type SuggestionResponse = {
  suggestions?: unknown;
};

function normalizeSuggestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length >= 10 && item.length <= 150)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 3);
}

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = await getActiveCreatorProfile("display_name, username, bio, content_categories, instagram_handle, instagram_followers, instagram_access_token, instagram_user_id");

  if (!profile) {
    return NextResponse.json({ error: "未能讀取創作者資料。" }, { status: 404 });
  }

  const sources: string[] = ["SOON-EGG 創作者資料"];
  let instagramBio = "";
  let instagramName = "";
  let instagramFollowers = Number(profile.instagram_followers || 0);
  let recentCaptions: string[] = [];

  if (profile.instagram_access_token && profile.instagram_user_id) {
    const fields = "name,username,biography,followers_count,media.limit(12){caption,media_type,timestamp}";
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(String(profile.instagram_user_id))}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(String(profile.instagram_access_token))}`,
        { cache: "no-store" },
      );
      const instagram = await response.json();
      if (response.ok) {
        instagramBio = typeof instagram.biography === "string" ? instagram.biography.trim() : "";
        instagramName = typeof instagram.name === "string" ? instagram.name.trim() : "";
        instagramFollowers = Number(instagram.followers_count || instagramFollowers);
        recentCaptions = ((instagram.media?.data ?? []) as InstagramMedia[])
          .map((media) => media.caption?.trim() || "")
          .filter(Boolean)
          .slice(0, 12);
        sources.push("已連接 Instagram 個人簡介及帳戶數據");
        if (recentCaptions.length > 0) sources.push(`Instagram 最近 ${recentCaptions.length} 則內容`);
      } else {
        console.warn("Profile bio Instagram context unavailable", instagram?.error?.code);
      }
    } catch (error) {
      console.warn("Profile bio Instagram context failed", error);
    }
  }

  const anthropic = getAnthropic();
  if (!anthropic) {
    return NextResponse.json({ error: "AI 服務暫時未設定，請稍後再試。" }, { status: 503 });
  }

  const categories = Array.isArray(profile.content_categories)
    ? profile.content_categories.filter((item): item is string => typeof item === "string").slice(0, 10)
    : [];
  const captions = recentCaptions.map((caption, index) => `${index + 1}. ${caption.slice(0, 350)}`).join("\n");

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      messages: [{
        role: "user",
        content: `你是亞洲創作者品牌定位編輯。請根據以下真實資料，撰寫 3 個可用於公開 Creator Profile 的繁體中文一句介紹。

規則：
- 每個版本 25 至 65 個中文字，最多 150 字元。
- 只可使用資料支持的定位，不可虛構獎項、成績、合作品牌、地區或專業。
- 先判斷帳戶是個人創作者、團隊、媒體或內容品牌；如資料顯示是品牌帳戶，不可寫成「一位創作者」。
- 不要寫粉絲數，不要用空泛字句如「正在建立個人品牌」。
- 三個版本角度要有分別：清晰定位、內容特色、品牌合作導向。
- 只回傳 JSON：{"suggestions":["...","...","..."]}

SOON-EGG 資料：
- 顯示名稱：${profile.display_name || "未提供"}
- 用戶名稱：${profile.username || "未提供"}
- 現有介紹：${profile.bio || "未提供"}
- 內容分類：${categories.join("、") || "未提供"}
- Instagram handle：${profile.instagram_handle || "未提供"}
- Instagram 顯示名稱：${instagramName || "未取得"}
- Instagram bio：${instagramBio || "未取得"}
- Instagram followers：${instagramFollowers || "未取得"}
- Instagram 最近內容：
${captions || "未取得"}`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const parsed = parseJsonFromText<SuggestionResponse>(text.replace(/```json|```/g, "").trim(), {});
    const suggestions = normalizeSuggestions(parsed.suggestions);
    if (suggestions.length === 0) throw new Error("No valid suggestions");

    return NextResponse.json({
      suggestions,
      sources,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Profile bio generation failed", error);
    return NextResponse.json({ error: "AI 暫時未能產生介紹，請稍後再試。" }, { status: 502 });
  }
}
