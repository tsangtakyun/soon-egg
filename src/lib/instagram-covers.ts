import type { SupabaseClient } from "@supabase/supabase-js";

type Media = { media_type?: string | null; media_url?: string | null; thumbnail_url?: string | null };
export function coverUrl(media: Media): string | null {
  const candidate = media.thumbnail_url || (media.media_type !== "VIDEO" ? media.media_url : null);
  if (!candidate) return null;
  try { return new URL(candidate).protocol === "https:" ? candidate : null; } catch { return null; }
}

// Only cover fields are updated: historical engagement metrics must remain intact.
export async function refreshInstagramCover(admin: SupabaseClient, workspaceId: string, mediaId: string) {
  const { data: media, error } = await admin.from("egg_instagram_media")
    .select("id,instagram_media_id").eq("creator_id", workspaceId).eq("id", mediaId).maybeSingle();
  if (error) throw new Error("未能讀取封面資料");
  if (!media) return null;
  const { data: profile, error: profileError } = await admin.from("egg_creator_profiles")
    .select("instagram_access_token,audience_demographics").eq("id", workspaceId).maybeSingle();
  if (profileError || !profile?.instagram_access_token) throw new Error("Instagram 授權暫不可用");
  const provider = profile.audience_demographics?.instagram_sync?.provider === "facebook" ? "facebook" : "instagram";
  const url = new URL(`https://graph.${provider}.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${encodeURIComponent(media.instagram_media_id)}`);
  url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${profile.instagram_access_token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  const fresh = await response.json();
  if (!response.ok || fresh.error) throw new Error("Meta 暫未能提供封面");
  const imageUrl = coverUrl(fresh);
  if (!imageUrl) return null;
  const { error: saveError } = await admin.from("egg_instagram_media").update({
    media_url: fresh.media_url ?? null, thumbnail_url: fresh.thumbnail_url ?? null,
  }).eq("creator_id", workspaceId).eq("id", mediaId);
  if (saveError) throw new Error("未能更新封面");
  return imageUrl;
}

export async function refreshTopInstagramCovers(admin: SupabaseClient, workspaceId: string) {
  const { data, error } = await admin.from("egg_instagram_media")
    .select("id,views,reach,total_interactions,like_count,comments_count")
    .eq("creator_id", workspaceId).order("published_at", { ascending: false }).limit(50);
  if (error) throw new Error("未能讀取最佳內容封面");
  const score = (m: NonNullable<typeof data>[number]) => Number(m.views ?? m.reach ?? m.total_interactions ?? (Number(m.like_count ?? 0) + Number(m.comments_count ?? 0)));
  const top = [...(data ?? [])].sort((a, b) => score(b) - score(a)).slice(0, 5);
  // A deleted/private post must not stop other covers or the metrics sync.
  return Promise.allSettled(top.map((m) => refreshInstagramCover(admin, workspaceId, m.id)));
}
