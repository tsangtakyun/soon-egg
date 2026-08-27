import type { SupabaseClient } from "@supabase/supabase-js";

type InstagramProfile = { id?: string; username?: string; followers_count?: number; error?: { message?: string } };
type InstagramMedia = { like_count?: number; comments_count?: number };
type InstagramMediaResponse = { data?: InstagramMedia[]; error?: { message?: string } };
type InstagramInsightRow = { name?: string; values?: Array<{ value?: number }>; total_value?: { value?: number } };
type InstagramInsightsResponse = { data?: InstagramInsightRow[]; error?: { message?: string } };

export type InstagramSyncProfile = {
  id: string;
  user_id: string;
  instagram_access_token: string;
  instagram_user_id: string | null;
  audience_demographics: Record<string, unknown> | null;
};

export type InstagramSyncResult = {
  followers: number;
  username?: string;
  engagementRate: number | null;
  engagementSampleSize: number;
  engagementUnavailableReason: string | null;
  officialInsights: Record<string, number> | null;
  insightsUnavailableReason: string | null;
  syncedAt: string;
};

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

async function fetchInstagramProfile(instagramUserId: string | null, accessToken: string): Promise<InstagramProfile> {
  const fields = "id,username,followers_count,media_count";
  if (instagramUserId) {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = (await response.json()) as InstagramProfile;
    if (response.ok && !data.error) return data;
  }
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString(), { cache: "no-store" });
  return (await response.json()) as InstagramProfile;
}

async function fetchRecentInstagramMedia(instagramUserId: string, accessToken: string): Promise<InstagramMediaResponse> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}/media`);
  url.searchParams.set("fields", "id,like_count,comments_count,timestamp");
  url.searchParams.set("limit", "12");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString(), { cache: "no-store" });
  return (await response.json()) as InstagramMediaResponse;
}

function insightValue(row: InstagramInsightRow) {
  if (typeof row.total_value?.value === "number" && Number.isFinite(row.total_value.value)) return row.total_value.value;
  return (row.values ?? []).reduce((sum, item) => {
    return sum + (typeof item.value === "number" && Number.isFinite(item.value) ? item.value : 0);
  }, 0);
}

async function fetchOfficialInsights(instagramUserId: string, accessToken: string) {
  const until = new Date();
  until.setUTCHours(0, 0, 0, 0);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - 7);
  const metrics: Record<string, number> = {};
  const errors: string[] = [];
  const attempts = [
    { metric: "reach" },
    { metric: "accounts_engaged,total_interactions", metricType: "total_value" },
  ];

  for (const attempt of attempts) {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}/insights`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("metric", attempt.metric);
    url.searchParams.set("period", "day");
    url.searchParams.set("since", String(Math.floor(since.getTime() / 1000)));
    url.searchParams.set("until", String(Math.floor(until.getTime() / 1000)));
    if (attempt.metricType) url.searchParams.set("metric_type", attempt.metricType);
    try {
      const response = await fetch(url.toString(), { cache: "no-store" });
      const payload = (await response.json()) as InstagramInsightsResponse;
      if (!response.ok || payload.error) {
        errors.push(payload.error?.message || `Meta insights request failed (${response.status})`);
        continue;
      }
      for (const row of payload.data ?? []) if (row.name) metrics[row.name] = insightValue(row);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    metrics,
    unavailableReason: errors.length ? errors.join(" | ") : null,
    window: { since: since.toISOString(), until: until.toISOString() },
  };
}

export async function syncInstagramProfile(supabase: SupabaseClient, profile: InstagramSyncProfile): Promise<InstagramSyncResult> {
  const data = await fetchInstagramProfile(profile.instagram_user_id, profile.instagram_access_token);
  if (data.error) throw new Error(data.error.message || "Instagram sync failed");

  const instagramUserId = data.id || profile.instagram_user_id;
  const followers = data.followers_count ?? 0;
  let engagementRate: number | null = null;
  let engagementSampleSize = 0;
  let engagementUnavailableReason: string | null = null;

  if (instagramUserId && followers > 0) {
    const mediaResponse = await fetchRecentInstagramMedia(instagramUserId, profile.instagram_access_token);
    const media = mediaResponse.data ?? [];
    if (mediaResponse.error) engagementUnavailableReason = mediaResponse.error.message || "Meta 暫時未提供貼文互動數據";
    else if (media.length === 0) engagementUnavailableReason = "未有可用嘅 Instagram 貼文數據";
    else {
      engagementSampleSize = media.length;
      const interactions = media.reduce((sum, item) => sum + (item.like_count ?? 0) + (item.comments_count ?? 0), 0);
      engagementRate = Number(((interactions / media.length / followers) * 100).toFixed(2));
    }
  } else engagementUnavailableReason = "缺少 Instagram 帳戶或粉絲數據";

  const official = instagramUserId
    ? await fetchOfficialInsights(instagramUserId, profile.instagram_access_token)
    : { metrics: {} as Record<string, number>, unavailableReason: "缺少 Instagram account id", window: null };
  const syncedAt = new Date().toISOString();
  const currentAudience = profile.audience_demographics && !Array.isArray(profile.audience_demographics)
    ? profile.audience_demographics
    : {};
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
        official_insights_available: typeof official.metrics.reach === "number",
        official_insights_window: official.window,
        reach_7d: official.metrics.reach ?? null,
        accounts_engaged_7d: official.metrics.accounts_engaged ?? null,
        total_interactions_7d: official.metrics.total_interactions ?? null,
      },
    },
  };
  if (engagementRate !== null) updates.instagram_engagement_rate = engagementRate;

  const { error: updateError } = await supabase.from("egg_creator_profiles").update(updates).eq("id", profile.id);
  if (updateError) throw new Error(updateError.message);
  const { error: snapshotError } = await supabase.from("egg_instagram_metric_snapshots").upsert({
    creator_id: profile.id,
    snapshot_date: syncedAt.slice(0, 10),
    followers,
    engagement_rate: engagementRate,
    engagement_sample_size: engagementSampleSize,
    reach_7d: official.metrics.reach ?? null,
    accounts_engaged_7d: official.metrics.accounts_engaged ?? null,
    total_interactions_7d: official.metrics.total_interactions ?? null,
    captured_at: syncedAt,
  }, { onConflict: "creator_id,snapshot_date" });
  if (snapshotError) throw new Error(`Instagram snapshot failed: ${snapshotError.message}`);

  return {
    followers,
    username: data.username,
    engagementRate,
    engagementSampleSize,
    engagementUnavailableReason,
    officialInsights: Object.keys(official.metrics).length ? official.metrics : null,
    insightsUnavailableReason: official.unavailableReason,
    syncedAt,
  };
}
