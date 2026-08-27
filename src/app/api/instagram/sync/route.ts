import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type InstagramProfile = {
  id?: string;
  username?: string;
  followers_count?: number;
  media_count?: number;
  error?: {
    message?: string;
  };
};

type InstagramMedia = {
  like_count?: number;
  comments_count?: number;
};

type InstagramMediaResponse = {
  data?: InstagramMedia[];
  error?: {
    message?: string;
  };
};

async function fetchInstagramProfile(instagramUserId: string | null, accessToken: string): Promise<InstagramProfile> {
  const fields = "id,username,followers_count,media_count";

  if (instagramUserId) {
    const facebookUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(instagramUserId)}`);
    facebookUrl.searchParams.set("fields", fields);
    facebookUrl.searchParams.set("access_token", accessToken);

    const facebookRes = await fetch(facebookUrl.toString(), { next: { revalidate: 0 } });
    const facebookData = await facebookRes.json();

    if (facebookRes.ok && !facebookData.error) {
      return facebookData as InstagramProfile;
    }
  }

  const basicUrl = new URL("https://graph.instagram.com/me");
  basicUrl.searchParams.set("fields", fields);
  basicUrl.searchParams.set("access_token", accessToken);

  const basicRes = await fetch(basicUrl.toString(), { next: { revalidate: 0 } });
  return (await basicRes.json()) as InstagramProfile;
}

async function fetchRecentInstagramMedia(instagramUserId: string, accessToken: string): Promise<InstagramMediaResponse> {
  const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(instagramUserId)}/media`);
  url.searchParams.set("fields", "id,like_count,comments_count,timestamp");
  url.searchParams.set("limit", "12");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  return (await response.json()) as InstagramMediaResponse;
}

export async function POST() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("instagram_access_token, instagram_user_id, audience_demographics")
    .eq("user_id", user.id)
    .single();

  if (!profile?.instagram_access_token) {
    return NextResponse.json(
      {
        error: "Instagram 尚未完成授權，請重新連接 Instagram。",
        needs_reconnect: true,
      },
      { status: 400 },
    );
  }

  const data = await fetchInstagramProfile(profile.instagram_user_id ?? null, profile.instagram_access_token);

  if (data.error) {
    return NextResponse.json({ error: data.error.message || "Instagram sync failed" }, { status: 400 });
  }

  const instagramUserId = data.id || profile.instagram_user_id;
  const followers = data.followers_count ?? 0;
  let engagementRate: number | null = null;
  let engagementSampleSize = 0;
  let engagementUnavailableReason: string | null = null;

  if (instagramUserId && followers > 0) {
    const mediaResponse = await fetchRecentInstagramMedia(instagramUserId, profile.instagram_access_token);
    const media = mediaResponse.data ?? [];

    if (mediaResponse.error) {
      engagementUnavailableReason = mediaResponse.error.message || "Meta 暫時未提供貼文互動數據";
    } else if (media.length === 0) {
      engagementUnavailableReason = "未有可用嘅 Instagram 貼文數據";
    } else {
      engagementSampleSize = media.length;
      const totalInteractions = media.reduce(
        (sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0),
        0,
      );
      engagementRate = Number(((totalInteractions / media.length / followers) * 100).toFixed(2));
    }
  } else {
    engagementUnavailableReason = "缺少 Instagram 帳戶或粉絲數據";
  }

  const syncedAt = new Date().toISOString();
  const currentAudience = (
    typeof profile.audience_demographics === "object" &&
    profile.audience_demographics !== null &&
    !Array.isArray(profile.audience_demographics)
  ) ? profile.audience_demographics : {};

  const updates: Record<string, unknown> = {
    instagram_handle: data.username,
    instagram_followers: followers,
    instagram_user_id: data.id,
    audience_demographics: {
      ...currentAudience,
      instagram_sync: {
        synced_at: syncedAt,
        engagement_sample_size: engagementSampleSize,
        engagement_method: "recent_media_interactions_by_followers",
      },
    },
  };

  if (engagementRate !== null) {
    updates.instagram_engagement_rate = engagementRate;
  }

  const { error } = await supabase
    .from("egg_creator_profiles")
    .update(updates)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    followers,
    username: data.username,
    engagement_rate: engagementRate,
    engagement_sample_size: engagementSampleSize,
    engagement_unavailable_reason: engagementUnavailableReason,
    synced_at: syncedAt,
  });
}
