import { dnaCategories } from "@/lib/creator-dna";
import "server-only";
import { canonicalCountry } from "@/lib/topicGeography";
import { recommendationMatch } from "@/lib/topic-recommendations";
import { topicCountries } from "@/lib/topicCountries";

import { createEggAdmin, type WorkspaceRole } from "@/lib/creator-workspace";
import { persistRemoteTopicCover } from "@/lib/topic-media";

const DEFAULT_TOPIC_API = "https://soon-core.vercel.app/api/topics";
const TOPIC_COVER_FALLBACK = "https://egg.sooncreator.network/creative.jpg";

export type TopicIdea = {
  id: string; title: string; summary: string | null; source_name: string | null; source_url: string | null;
  image_url: string | null; platform: string; category: string; tags: string[]; content_format: string;
  media_urls?: string[];
  created_by?: string | null;
  workspace_id: string | null; created_at: string; saved: boolean; saved_at?: string | null; want_to_create: boolean; manageable?: boolean;
  why_now?: string; hook?: string; suggested_angles?: string[]; countries?: string[]; regions?: string[];
  geography_kind?: string; geography_status?: string;
  localities?: string[]; directions?: string[]; direction_aliases?: string[]; recommended?: boolean;
  recommendation_reason?: string;
  recommendation_score?: number;
  dismissed?: boolean;
  import_state?: "pending" | "ready" | "failed"; import_error?: string | null;
  scope?: "central" | "workspace"; central_available?: boolean;
};

type CentralTopic = {
  id: string; title: string; summary?: string | null; why_now?: string | null; hook?: string | null;
  suggested_angles?: string[] | null; content_formats?: string[] | null; countries?: string[] | null;
  regions?: string[] | null; localities?: string[] | null; keywords?: string[] | null; cover_url?: string | null;
  published_at?: string | null; updated_at?: string | null;
  topic_item_directions?: Array<{ is_primary?: boolean; topic_directions?: { label_zh?: string | null; aliases?: string[] | null } | null }> | null;
  topic_sources?: Array<{ url?: string | null; source_name?: string | null }> | null;
};

export async function getTopicMembership(userId: string, requestedWorkspaceId: string | null) {
  const admin = createEggAdmin();
  const { data: memberships, error } = await admin.from("egg_creator_workspace_members").select("workspace_id,role").eq("user_id", userId);
  if (error) throw error;
  const membership = memberships?.find((item) => item.workspace_id === requestedWorkspaceId) ?? memberships?.[0];
  return { admin, workspaceId: membership?.workspace_id ?? null, role: (membership?.role ?? null) as WorkspaceRole | null };
}

function cleanArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function normalise(value: string) {
  return value.toLocaleLowerCase("zh-HK").replace(/[\s/／、·・_-]+/g, "");
}

function normaliseCountry(value: string) { return canonicalCountry(value).toLowerCase(); }

function countryDisplayName(value: string | undefined) {
  const country = normaliseCountry(value ?? "");
  return ({ gb: "英國", hk: "香港", tw: "台灣", jp: "日本" } as Record<string, string>)[country] || value || "目前國家";
}

function usableCentralCover(value: string | null | undefined) {
  const cover = value?.trim();
  if (!cover) return TOPIC_COVER_FALLBACK;
  try {
    const url = new URL(cover);
    const isMissingLegacyAsset = url.hostname === "soon-core.vercel.app" && url.pathname.startsWith("/topic-covers/");
    return isMissingLegacyAsset ? TOPIC_COVER_FALLBACK : cover;
  } catch {
    return TOPIC_COVER_FALLBACK;
  }
}

function mapCentralTopic(topic: CentralTopic): TopicIdea {
  const directions = (topic.topic_item_directions ?? []).map((item) => item.topic_directions?.label_zh?.trim() ?? "").filter(Boolean);
  const directionAliases = (topic.topic_item_directions ?? []).flatMap((item) => cleanArray(item.topic_directions?.aliases));
  const primaryDirection = (topic.topic_item_directions ?? []).find((item) => item.is_primary)?.topic_directions?.label_zh;
  const source = topic.topic_sources?.[0];
  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary?.trim() || null,
    source_name: source?.source_name?.trim() || "SOON 編輯團隊",
    source_url: source?.url?.trim() || null,
    image_url: usableCentralCover(topic.cover_url),
    platform: "SOON",
    category: primaryDirection?.trim() || directions[0] || "最新精選",
    tags: cleanArray(topic.keywords).slice(0, 6),
    content_format: cleanArray(topic.content_formats)[0] || "short_video",
    workspace_id: null,
    created_at: topic.updated_at || topic.published_at || new Date(0).toISOString(),
    saved: false,
    want_to_create: false,
    why_now: topic.why_now?.trim() || undefined,
    // Opening lines are generated later, after the production style is chosen.
    suggested_angles: cleanArray(topic.suggested_angles),
    countries: topicCountries({ ...topic, tags: cleanArray(topic.keywords) }),
    regions: cleanArray(topic.regions),
    localities: cleanArray(topic.localities),
    directions,
    direction_aliases: directionAliases,
    scope: "central",
  };
}

async function fetchCentralTopics(consumer: "egg-web" | "egg-app") {
  const endpoint = process.env.SOON_TOPIC_API_URL?.trim() || DEFAULT_TOPIC_API;
  const response = await fetch(`${endpoint}?language=zh-HK&limit=60&consumer=${consumer}`, {
    headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`SOON Topic API ${response.status}`);
  const payload = await response.json() as { topics?: CentralTopic[]; delivery?: { token?: string } };
  if (!Array.isArray(payload.topics)) throw new Error("SOON Topic API response is invalid");
  const ideas = payload.topics.map(mapCentralTopic);
  // Core may still speak the older geography contract. Overlay reviewed EGG metadata
  // by public topic ID, without exposing private source text or workspace membership.
  if (ideas.length) {
    const { data, error } = await createEggAdmin().from("egg_topic_ideas")
      .select("id,countries,regions,localities,geography_kind,geography_status")
      .in("id", ideas.map(idea => idea.id)).gte("geography_version", 2);
    if (error) throw error;
    const reviewed = new Map((data ?? []).map(row => [row.id, row]));
    for (const idea of ideas) {
      const location = reviewed.get(idea.id);
      if (location) Object.assign(idea, location);
    }
  }
  return { ideas, receipt: payload.delivery?.token };
}

function hasUsableCover(topic: TopicIdea) {
  if (!topic.image_url) return false;
  try {
    const url = new URL(topic.image_url);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function syncCentralTopicShadows(topics: TopicIdea[]) {
  if (!topics.length) return;
  const admin = createEggAdmin();
  const { data: originals, error: readError } = await admin.from("egg_topic_ideas").select("id,workspace_id,created_by").in("id", topics.map(topic => topic.id));
  if (readError) throw readError;
  const protectedIds = new Set((originals ?? []).filter(row => row.workspace_id || row.created_by).map(row => row.id));
  const shadows = topics.filter(topic => !protectedIds.has(topic.id));
  if (!shadows.length) return;
  const { error } = await admin.from("egg_topic_ideas").upsert(shadows.map((topic) => ({
    id: topic.id, workspace_id: null, title: topic.title, summary: topic.summary, source_name: topic.source_name,
    source_url: topic.source_url, image_url: topic.image_url, platform: topic.platform, category: topic.category,
    countries: topic.countries ?? [], regions: topic.regions ?? [], localities: topic.localities ?? [],
    tags: topic.tags, content_format: topic.content_format, status: "published", updated_at: new Date().toISOString(),
  })), { onConflict: "id" });
  if (error) throw error;
}

async function listLocalTopics(workspaceId: string, userId: string) {
  const admin = createEggAdmin();
  await admin.from("egg_topic_ideas").update({ import_state: "failed", import_error: "整理逾時，請重新分享同一來源。", title: "題材整理未完成", summary: "未能取得完整內容，請重新分享連結並補充原文。", tags: ["待重試"] }).eq("workspace_id", workspaceId).eq("import_state", "pending").lt("import_started_at", new Date(Date.now() - 180_000).toISOString());
  const { data, error } = await admin.from("egg_topic_ideas")
    .select("id,title,summary,source_name,source_url,image_url,media_urls,platform,category,tags,content_format,workspace_id,created_by,created_at,import_state,import_error,countries,regions,localities,geography_status,geography_kind")
    .eq("status", "published").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) throw error;
  const localTopics = (data ?? []).map((topic) => ({
    ...(topic as unknown as TopicIdea),
    manageable: topic.workspace_id === workspaceId && topic.created_by === userId,
    scope: "workspace" as const,
  }));
  const legacyCovers = localTopics.filter((topic) => topic.manageable && topic.image_url?.includes("cdninstagram.com"));
  await Promise.all(legacyCovers.map(async (topic) => {
    try {
      const imageUrl = await persistRemoteTopicCover(admin, workspaceId, topic.image_url ?? "", { title: topic.title, platform: topic.platform });
      const mediaUrls = [imageUrl, ...(topic.media_urls ?? []).filter((url) => url !== topic.image_url && url !== imageUrl)];
      const { error: updateError } = await admin.from("egg_topic_ideas").update({ image_url: imageUrl, media_urls: mediaUrls, updated_at: new Date().toISOString() }).eq("id", topic.id).eq("workspace_id", workspaceId);
      if (updateError) throw updateError;
      topic.image_url = imageUrl;
      topic.media_urls = mediaUrls;
    } catch (migrationError) {
      console.error("Legacy Instagram topic cover migration failed", topic.id, migrationError);
    }
  }));
  const appendedFallbacks = localTopics.filter((topic) => topic.manageable && topic.source_name !== "電話相簿" && topic.image_url && (topic.media_urls?.length ?? 0) > 1);
  await Promise.all(appendedFallbacks.map(async (topic) => {
    const mediaUrls = [topic.image_url as string];
    const { error: cleanupError } = await admin.from("egg_topic_ideas").update({ media_urls: mediaUrls, updated_at: new Date().toISOString() }).eq("id", topic.id).eq("workspace_id", workspaceId);
    if (cleanupError) console.error("Appended topic fallback cleanup failed", topic.id, cleanupError);
    else topic.media_urls = mediaUrls;
  }));
  return localTopics;
}

type TopicPersonalisation = {
  locality?: string;
  region?: string;
  country?: string;
  recentlySeen?: string[];
  surface?: "home" | "library";
  includeHidden?: boolean;
};

function locationScore(topic: TopicIdea, personalisation: TopicPersonalisation) {
  if (topic.geography_kind === "context" || topic.geography_kind === "none") return 0;
  const locality = normalise(personalisation.locality ?? "");
  const region = normalise(personalisation.region ?? "");
  const country = normaliseCountry(personalisation.country ?? "");
  if (locality && (topic.localities ?? []).some((value) => normalise(value).includes(locality) || locality.includes(normalise(value)))) return 5;
  if (region && [...(topic.localities ?? []), ...(topic.regions ?? [])].some((value) => normalise(value).includes(region) || region.includes(normalise(value)))) return 3;
  if (country && (topic.countries ?? []).some((value) => normaliseCountry(value) === country)) return 1;
  return 0;
}

function freshnessScore(createdAt: string) {
  const ageDays = Math.max(0, (Date.now() - Date.parse(createdAt)) / 86_400_000);
  return Math.max(0, 3 - ageDays / 7);
}

async function reportTopicDelivery(consumer: "egg-web" | "egg-app", body: { token: string } | { failed: true }) {
  const key = process.env.SOON_CORE_BUNDLE_KEY || process.env.SOON_CORE_KNOWLEDGE_KEY;
  if (!key) return;
  try {
    const response = await fetch("https://soon-core.vercel.app/api/topics/delivery-receipt", {
      method: "POST", headers: { "Content-Type": "application/json", "x-soon-knowledge-key": key, "x-soon-topic-consumer": consumer },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.warn("Topic delivery receipt was not recorded", consumer, response.status);
  } catch { console.warn("Topic delivery receipt unavailable", consumer); }
}

export async function listTopicIdeas(workspaceId: string, userId: string, preferredCategories?: string[], personalisation: TopicPersonalisation = {}, consumer: "egg-web" | "egg-app" = "egg-web") {
  const admin = createEggAdmin();
  let centralIdeas: TopicIdea[] = [];
  let deliveryToken: string | undefined;
  try {
    const central = await fetchCentralTopics(consumer);
    centralIdeas = central.ideas;
    deliveryToken = central.receipt;
    await syncCentralTopicShadows(centralIdeas);
  } catch (error) {
    console.error("Central topic feed unavailable; using Egg fallback", error);
    await reportTopicDelivery(consumer, { failed: true });
  }
  const localIdeas = await listLocalTopics(workspaceId, userId);
  const centralById = new Map(centralIdeas.map(idea => [idea.id, idea]));
  const localWithSharedMetadata = localIdeas.map(local => {
    const central = centralById.get(local.id);
    const geography = local.geography_kind === "context" || local.geography_kind === "none" || local.countries?.length ? local : central || local;
    return { ...central, ...local,
      geography_kind: geography.geography_kind,
      countries: geography.countries,
      regions: geography.regions,
      localities: geography.localities,
      central_available: Boolean(central) && local.import_state === "ready" };
  });
  const ideas = [...localWithSharedMetadata, ...centralIdeas.filter((central) => !localIdeas.some((local) => local.id === central.id))]
    .filter(topic => topic.scope === "workspace" || hasUsableCover(topic))
    .map(topic => ({ ...topic, countries: topicCountries(topic) }));

  const [profileResult, dnaResult, actionsResult] = await Promise.all([
    preferredCategories ? Promise.resolve({ data: null }) : admin.from("egg_creator_profiles").select("content_categories").eq("id", workspaceId).maybeSingle(),
    admin.from("creator_dna_profiles").select("primary_industry_code,secondary_industry_codes,content_styles,preferred_formats,audience_summary").eq("workspace_id", workspaceId).maybeSingle(),
    admin.from("egg_topic_actions").select("idea_id,saved,want_to_create,dismissed,updated_at").eq("workspace_id", workspaceId),
  ]);
  const profilePreferences = dnaCategories(dnaResult.data, preferredCategories ?? cleanArray(profileResult.data?.content_categories));
  const dna = dnaResult.data;

  const { data: actions, error: actionsError } = actionsResult;
  if (actionsError) throw actionsError;
  const actionMap = new Map((actions ?? []).map((action) => [action.idea_id, action]));
  // A hidden central topic may have aged out of the current delivery window.
  // Retrieve only this workspace's hidden records so they remain restorable.
  if (personalisation.includeHidden) {
    const ids = new Set(ideas.map(idea => idea.id));
    const hiddenIds = (actions ?? []).filter(action => action.dismissed && !ids.has(action.idea_id)).map(action => action.idea_id);
    if (hiddenIds.length) {
      const { data: hidden, error } = await admin.from("egg_topic_ideas")
        .select("id,title,summary,source_name,source_url,image_url,media_urls,platform,category,tags,content_format,workspace_id,created_by,created_at,import_state,import_error,countries,regions,localities,geography_status,geography_kind")
        .in("id", hiddenIds).eq("status", "published");
      if (error) throw error;
      for (const topic of hidden ?? []) {
        if (topic.workspace_id && topic.workspace_id !== workspaceId) continue;
        ideas.push({ ...topic, countries: topicCountries(topic), saved: false, want_to_create: false,
          manageable: topic.workspace_id === workspaceId && topic.created_by === userId,
          scope: topic.workspace_id ? "workspace" : "central" } as TopicIdea & { countries: string[] });
      }
    }
  }
  const positives = ideas.filter(idea => { const action = actionMap.get(idea.id); return !action?.dismissed && (action?.saved || action?.want_to_create); });
  const seen = new Set(personalisation.recentlySeen ?? []);
  const hasLocationFilter = Boolean(personalisation.locality || personalisation.region || personalisation.country);
  const ranked = ideas.flatMap((idea) => {
    const action = actionMap.get(idea.id);
    if (action?.dismissed && !personalisation.includeHidden) return [];
    const match = recommendationMatch(idea, dna, profilePreferences, positives);
    const nearbyScore = locationScore(idea, personalisation);
    // A location-enabled feed must not present unrelated global topics as
    // "nearby" merely because they match the creator's content preferences.
    if (personalisation.surface === "home" && hasLocationFilter && nearbyScore === 0 && !action?.dismissed) return [];
    const interactionScore = action?.want_to_create ? -8 : action?.saved ? -1 : 0;
    const exposurePenalty = seen.has(idea.id) ? 8 : 0;
    const score = match.score + nearbyScore * 2 + interactionScore + freshnessScore(idea.created_at) - exposurePenalty;
    const reason = nearbyScore >= 5 ? `你目前在${personalisation.locality || "附近"}`
      : nearbyScore >= 3 ? `適合${personalisation.region || "目前地區"}`
        : nearbyScore > 0 ? `${countryDisplayName(personalisation.country)}題材`
        : match.reason || (freshnessScore(idea.created_at) > 1 ? "最近加入" : undefined);
    return [{ ...idea, dismissed: action?.dismissed ?? false, saved: action?.saved ?? false, saved_at: action?.saved ? action.updated_at : null, want_to_create: action?.want_to_create ?? false, recommended: idea.import_state !== "pending" && idea.import_state !== "failed" && (match.relevant || nearbyScore > 0 || Boolean(action?.saved)), recommendation_reason: match.reason || reason, recommendation_score: score, _score: score }];
  }).sort((a, b) => b._score - a._score || Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((rankedIdea) => {
      const { _score, ...idea } = rankedIdea;
      void _score;
      return idea;
    });
  if (deliveryToken) await reportTopicDelivery(consumer, { token: deliveryToken });
  return ranked;
}
