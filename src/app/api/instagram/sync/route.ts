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

type InstagramInsightRow = {
  name?: string;
  values?: Array<{ value?: number }>;
  total_value?: { value?: number };
};

type InstagramInsightsResponse = {
  data?: InstagramInsightRow[];
  error?: {
    message?: string;
  };
};

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

async function fetchInstagramProfile(instagramUserId: string | null, accessToken: string): Promise<InstagramProfile> {
  const fields = "id,username,followers_count,media_count";

  if (instagramUserId) {
    const facebookUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}`);
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
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}/media`);
  url.searchParams.set("fields", "id,like_count,comments_count,timestamp");
  url.searchParams.set("limit", "12");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  return (await response.json()) as InstagramMediaResponse;
}

function insightValue(row: InstagramInsightRow) {
  const total = row.total_value?.value;
  if (typeof total === "number" && Number.isFinite(total)) return total;

  return (row.values ?? []).reduce((sum, item) => {
    const value = item.value;
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

async function fetchOfficialInsights(instagramUserId: string, accessToken: string) {
  const until = new Date();
  until.setUTCHours(0, 0, 0, 0);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - 7);
  const baseParams = {
    since: String(Math.floor(since.getTime() / 1000)),
    until: String(Math.floor(until.getTime() / 1000)),
    period: "day",
  };
  const metrics: Record<string, number> = {};
  const errors: string[] = [];
  const attempts = [
    { metric: "reach" },
    { metric: "accounts_engaged,total_interactions", metric_type: "total_value" },
  ];

  for (const attempt of attempts) {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}/insights`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("metric", attempt.metric);
    url.searchParams.set("period", baseParams.period);
    url.searchParams.set("since", baseParams.since);
    url.searchParams.set("until", baseParams.until);
    if (attempt.metric_type) url.searchParams.set("metric_type", attempt.metric_type);

    try {
      const response = await fetch(url.toString(), { next: { revalidate: 0 } });
      const payload = (await response.json()) as InstagramInsightsResponse;
      if (!response.ok || payload.error) {
        errors.push(payload.error?.message || `Meta insights request failed (${response.status})`);
        continue;
      }

      for (const row of payload.data ?? []) {
        if (row.name) metrics[row.name] = insightValue(row);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    available: Object.keys(metrics).length > 0,
    metrics,
    unavailableReason: errors.length ? errors.join(" | ") : null,
    window: {
      since: since.toISOString(),
      until: until.toISOString(),
    },
  };
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
    .select("id, instagram_access_token, instagram_user_id, audience_demographics")
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
  const officialInsights = instagramUserId
    ? await fetchOfficialInsights(instagramUserId, profile.instagram_access_token)
    : {
        available: false,
        metrics: {} as Record<string, number>,
        unavailableReason: "缺少 Instagram account id",
        window: null,
      };
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
        official_insights_available: officialInsights.available,
        official_insights_window: officialInsights.window,
        reach_7d: officialInsights.metrics.reach ?? null,
        accounts_engaged_7d: officialInsights.metrics.accounts_engaged ?? null,
        total_interactions_7d: officialInsights.metrics.total_interactions ?? null,
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

  const { error: snapshotError } = await supabase
    .from("egg_instagram_metric_snapshots")
    .upsert({
      creator_id: profile.id,
      snapshot_date: syncedAt.slice(0, 10),
      followers,
      engagement_rate: engagementRate,
      engagement_sample_size: engagementSampleSize,
      reach_7d: officialInsights.metrics.reach ?? null,
      accounts_engaged_7d: officialInsights.metrics.accounts_engaged ?? null,
      total_interactions_7d: officialInsights.metrics.total_interactions ?? null,
      captured_at: syncedAt,
    }, { onConflict: "creator_id,snapshot_date" });

  if (snapshotError) {
    console.error("Instagram metric snapshot error:", snapshotError);
  }

  return NextResponse.json({
    success: true,
    followers,
    username: data.username,
    engagement_rate: engagementRate,
    engagement_sample_size: engagementSampleSize,
    engagement_unavailable_reason: engagementUnavailableReason,
    official_insights: officialInsights.available ? officialInsights.metrics : null,
    insights_unavailable_reason: officialInsights.unavailableReason,
    synced_at: syncedAt,
  });
}
