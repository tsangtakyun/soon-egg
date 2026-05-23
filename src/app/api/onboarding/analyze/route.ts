import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Handles = Record<string, string>;
type FollowerCounts = Record<string, string | number>;

type YouTubeData = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  country: string | null;
};

type InstagramData = {
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicUrl: string | null;
  isVerified: boolean;
  category: string | null;
};

type Analysis = {
  display_name: string;
  bio: string;
  content_categories: string[];
  content_language: string;
  ai_profile_summary: string;
  instagram_followers: number;
  youtube_subscribers: number;
  tiktok_followers: number;
  douyin_followers: number;
  xiaohongshu_followers: number;
  suggested_theme: string;
  avatar_url?: string | null;
  real_data_fetched?: boolean;
  provided_data_sources?: string[];
};

const fallbackAnalysis: Analysis = {
  display_name: "SOON-EGG",
  bio: "正在建立您的亞洲創作者檔案。",
  content_categories: ["內容創作", "品牌合作", "創作者工具"],
  content_language: "zh-HK",
  ai_profile_summary: "這是一位正在建立個人品牌的創作者。SOON AI 會根據已連接的平台資料，協助完善 Media Kit、品牌配對與合作報價。",
  instagram_followers: 0,
  youtube_subscribers: 0,
  tiktok_followers: 0,
  douyin_followers: 0,
  xiaohongshu_followers: 0,
  suggested_theme: "藍天白雲",
  avatar_url: null,
  real_data_fetched: false,
  provided_data_sources: [],
};

function normalizeHandles(handles: Handles = {}) {
  return Object.fromEntries(
    Object.entries(handles).map(([key, value]) => [
      key,
      String(value ?? "").replace(/^@/, "").trim(),
    ]),
  ) as Handles;
}

function normalizeFollowerCounts(followerCounts: FollowerCounts = {}) {
  return Object.fromEntries(
    Object.entries(followerCounts).map(([key, value]) => [
      key,
      Number.parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10) || 0,
    ]),
  ) as Record<string, number>;
}

async function fetchYouTubeData(handle: string): Promise<YouTubeData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  const cleanHandle = handle.replace(/^@/, "").trim();

  if (!apiKey || !cleanHandle) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      console.error("YouTube API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const channel = data?.items?.[0];

    if (!channel) return null;

    return {
      title: channel.snippet?.title || cleanHandle,
      description: channel.snippet?.description || "",
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
      subscriberCount: Number.parseInt(channel.statistics?.subscriberCount || "0", 10),
      viewCount: Number.parseInt(channel.statistics?.viewCount || "0", 10),
      videoCount: Number.parseInt(channel.statistics?.videoCount || "0", 10),
      country: channel.snippet?.country || null,
    };
  } catch (error) {
    console.error("YouTube API error:", error);
    return null;
  }
}

async function fetchInstagramData(handle: string): Promise<InstagramData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();

  if (!cleanHandle) return null;

  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "x-ig-app-id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "936619743392459",
        },
        next: { revalidate: 1800 },
      },
    );

    if (!response.ok) {
      console.error("Instagram API error:", response.status);
      return null;
    }

    const data = await response.json();
    const user = data?.data?.user;

    if (!user) return null;

    return {
      fullName: user.full_name || cleanHandle,
      bio: user.biography || "",
      followerCount: user.edge_followed_by?.count || 0,
      followingCount: user.edge_follow?.count || 0,
      postCount: user.edge_owner_to_timeline_media?.count || 0,
      profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || null,
      isVerified: Boolean(user.is_verified),
      category: user.category_name || null,
    };
  } catch (error) {
    console.error("Instagram API error:", error);
    return null;
  }
}

async function fetchStoredInstagramData(): Promise<InstagramData | null> {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!supabase || !user) return null;

  try {
    const { data: profile, error } = await supabase
      .from("egg_creator_profiles")
      .select("instagram_access_token, instagram_user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !profile?.instagram_access_token || !profile?.instagram_user_id) {
      return null;
    }

    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(String(profile.instagram_user_id))}?fields=followers_count,biography,name,username,media_count,profile_picture_url&access_token=${encodeURIComponent(String(profile.instagram_access_token))}`,
      { next: { revalidate: 900 } },
    );
    const igData = await igRes.json();

    if (!igRes.ok || !igData.followers_count) {
      console.error("Instagram refresh error:", igData);
      return null;
    }

    return {
      fullName: igData.name || igData.username || "",
      bio: igData.biography || "",
      followerCount: igData.followers_count || 0,
      followingCount: 0,
      postCount: igData.media_count || 0,
      profilePicUrl: igData.profile_picture_url || null,
      isVerified: false,
      category: "Instagram OAuth",
    };
  } catch (error) {
    console.error("Instagram refresh error:", error);
    return null;
  }
}

async function saveCreatorProfile(
  handles: Handles,
  analysis: Analysis,
  avatarUrl: string | null,
  followerCounts: Record<string, number>,
) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!supabase || !user) return false;

  const username = (
    handles.instagram ||
    handles.youtube ||
    handles.tiktok ||
    `user_${user.id.slice(0, 8)}`
  ).replace(/^@/, "").toLowerCase();

  const basePayload: Record<string, unknown> = {
    user_id: user.id,
    username,
    display_name: analysis.display_name,
    bio: analysis.bio,
    avatar_url: avatarUrl,
    instagram_handle: handles.instagram || null,
    instagram_followers: analysis.instagram_followers ?? 0,
    youtube_handle: handles.youtube || null,
    youtube_subscribers: analysis.youtube_subscribers ?? 0,
    tiktok_handle: handles.tiktok || null,
    tiktok_followers: followerCounts.tiktok || analysis.tiktok_followers || 0,
    xiaohongshu_handle: handles.xiaohongshu || null,
    xiaohongshu_followers: followerCounts.xiaohongshu || analysis.xiaohongshu_followers || 0,
    content_categories: analysis.content_categories,
    content_language: analysis.content_language || "zh-HK",
    audience_demographics: {
      social_handles: handles,
      creator_provided_followers: followerCounts,
      provided_data_sources: analysis.provided_data_sources ?? [],
    },
    ai_profile_summary: analysis.ai_profile_summary,
  };

  const payloadWithOptionalColumns = {
    ...basePayload,
    threads_handle: handles.threads || null,
    facebook_handle: handles.facebook || null,
    douyin_handle: handles.douyin || null,
    douyin_followers: followerCounts.douyin || analysis.douyin_followers || 0,
  };

  const savePayload = async (payload: Record<string, unknown>) => {
    const { data: existing } = await supabase
      .from("egg_creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return supabase.from("egg_creator_profiles").update(payload).eq("id", existing.id);
    }

    return supabase.from("egg_creator_profiles").insert(payload);
  };

  const { error } = await savePayload(payloadWithOptionalColumns);

  if (error && /column|schema|facebook_handle|threads_handle|douyin_handle|douyin_followers/i.test(error.message)) {
    const { error: fallbackError } = await savePayload(basePayload);
    if (fallbackError) console.error("Supabase profile save error:", fallbackError);
    return !fallbackError;
  }

  if (error) console.error("Supabase profile save error:", error);
  return !error;
}

export async function POST(req: NextRequest) {
  try {
    const { handles = {}, followerCounts = {} } = await req.json() as {
      handles?: Handles;
      followerCounts?: FollowerCounts;
      userId?: string;
    };
    const normalizedHandles = normalizeHandles(handles);
    const normalizedFollowerCounts = normalizeFollowerCounts(followerCounts);

    const [youtubeData, publicInstagramData, storedInstagramData] = await Promise.all([
      fetchYouTubeData(normalizedHandles.youtube || ""),
      fetchInstagramData(normalizedHandles.instagram || ""),
      fetchStoredInstagramData(),
    ]);
    const instagramData = storedInstagramData || publicInstagramData;

    const realDataContext: string[] = [];

    if (youtubeData) {
      realDataContext.push(`
YouTube 頻道真實數據：
- 頻道名稱：${youtubeData.title}
- 頻道簡介：${youtubeData.description.slice(0, 200)}
- 訂閱人數：${youtubeData.subscriberCount.toLocaleString()}
- 總觀看次數：${youtubeData.viewCount.toLocaleString()}
- 影片數量：${youtubeData.videoCount}
- 國家：${youtubeData.country || "未知"}
`);
    }

    if (instagramData) {
      realDataContext.push(`
Instagram 帳號真實數據：
- 顯示名稱：${instagramData.fullName}
- 個人簡介：${instagramData.bio.slice(0, 200)}
- 粉絲數：${instagramData.followerCount.toLocaleString()}
- 帖子數：${instagramData.postCount}
- 帳號類別：${instagramData.category || "未知"}
- 已認證：${instagramData.isVerified ? "是" : "否"}
`);
    }

    const hasAutoData = realDataContext.length > 0;
    const providedMetricsContext = [
      normalizedHandles.tiktok && normalizedFollowerCounts.tiktok
        ? `TikTok：@${normalizedHandles.tiktok}，粉絲數 ${normalizedFollowerCounts.tiktok.toLocaleString()}（創作者提供）`
        : "",
      normalizedHandles.douyin && normalizedFollowerCounts.douyin
        ? `抖音：@${normalizedHandles.douyin}，粉絲數 ${normalizedFollowerCounts.douyin.toLocaleString()}（創作者提供）`
        : "",
      normalizedHandles.xiaohongshu && normalizedFollowerCounts.xiaohongshu
        ? `小紅書：@${normalizedHandles.xiaohongshu}，粉絲數 ${normalizedFollowerCounts.xiaohongshu.toLocaleString()}（創作者提供）`
        : "",
    ].filter(Boolean);

    if (providedMetricsContext.length > 0) {
      realDataContext.push(`
創作者提供的平台數據：
${providedMetricsContext.join("\n")}
`);
    }

    const platformInfo = Object.entries(normalizedHandles)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: @${value}`)
      .join("\n");

    const hasRealData = realDataContext.length > 0;
    const anthropic = getAnthropic();
    let analysis = fallbackAnalysis;

    if (anthropic && (hasRealData || platformInfo)) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `你是一個專門分析亞洲創作者的 AI 助理。

${hasRealData ? "以下是創作者的真實社交平台數據：" : "以下是創作者的社交平台帳號："}

${hasRealData ? realDataContext.join("\n") : platformInfo}

請根據以上資料，用 JSON 格式回覆（只回 JSON，不要其他文字）：
{
  "display_name": "創作者名稱（繁體中文，書面語）",
  "bio": "一句話描述創作者定位（繁體中文，書面語，根據真實數據）",
  "content_categories": ["最多5個繁體中文類別標籤，根據真實內容"],
  "content_language": "zh-HK",
  "ai_profile_summary": "兩至三句專業描述（繁體中文，書面語，根據真實數據）",
  "instagram_followers": ${instagramData?.followerCount || 0},
  "youtube_subscribers": ${youtubeData?.subscriberCount || 0},
  "tiktok_followers": ${normalizedFollowerCounts.tiktok || 0},
  "douyin_followers": ${normalizedFollowerCounts.douyin || 0},
  "xiaohongshu_followers": ${normalizedFollowerCounts.xiaohongshu || 0},
  "suggested_theme": "藍天白雲"
}`,
        }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
      analysis = {
        ...fallbackAnalysis,
        ...parseJsonFromText<Partial<Analysis>>(text.replace(/```json|```/g, "").trim(), {}),
      };
    }

    const enrichedAnalysis: Analysis = {
      ...analysis,
      instagram_followers: instagramData?.followerCount || analysis.instagram_followers || 0,
      youtube_subscribers: youtubeData?.subscriberCount || analysis.youtube_subscribers || 0,
      tiktok_followers: normalizedFollowerCounts.tiktok || analysis.tiktok_followers || 0,
      douyin_followers: normalizedFollowerCounts.douyin || analysis.douyin_followers || 0,
      xiaohongshu_followers: normalizedFollowerCounts.xiaohongshu || analysis.xiaohongshu_followers || 0,
      avatar_url: instagramData?.profilePicUrl || youtubeData?.thumbnailUrl || null,
      real_data_fetched: hasAutoData,
      provided_data_sources: Object.entries(normalizedFollowerCounts)
        .filter(([, value]) => value > 0)
        .map(([platform]) => platform),
    };

    const saved = await saveCreatorProfile(
      normalizedHandles,
      enrichedAnalysis,
      enrichedAnalysis.avatar_url || null,
      normalizedFollowerCounts,
    );

    return NextResponse.json({
      analysis: enrichedAnalysis,
      handles: normalizedHandles,
      followerCounts: normalizedFollowerCounts,
      youtubeData,
      instagramData,
      saved,
    });
  } catch (error) {
    console.error("Onboarding analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
