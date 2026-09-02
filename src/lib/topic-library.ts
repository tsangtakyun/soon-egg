import "server-only";

import { createEggAdmin, type WorkspaceRole } from "@/lib/creator-workspace";
import { persistRemoteTopicCover } from "@/lib/topic-media";

const DEFAULT_TOPIC_API = "https://soon-core.vercel.app/api/topics";

export type TopicIdea = {
  id: string; title: string; summary: string | null; source_name: string | null; source_url: string | null;
  image_url: string | null; platform: string; category: string; tags: string[]; content_format: string;
  media_urls?: string[];
  workspace_id: string | null; created_at: string; saved: boolean; want_to_create: boolean; manageable?: boolean;
  why_now?: string; hook?: string; suggested_angles?: string[]; countries?: string[]; regions?: string[];
  localities?: string[]; directions?: string[]; direction_aliases?: string[]; recommended?: boolean;
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

const PREFERENCE_DIRECTIONS: Record<string, string[]> = {
  生活美學: ["生活", "生活日常", "文化體驗", "在地體驗"],
  美容護膚: ["美容護膚", "美容", "護膚", "美妝"],
  時尚穿搭: ["時尚穿搭", "時尚", "穿搭", "造型"],
  美食: ["美食", "飲食", "餐飲", "餐廳探店", "探店", "餐廳推薦"],
  旅遊: ["旅遊", "城市攻略", "城市旅遊", "自由行", "文化體驗", "在地體驗"],
  健康運動: ["健康運動", "健康生活", "健康", "養生", "運動"],
  親子: ["親子", "家庭", "育兒"],
  科技: ["科技", "數碼", "創新"],
  財經: ["財經", "理財", "投資", "商業"],
  教育: ["教育", "學習", "知識"],
  娛樂: ["娛樂", "城市與文化熱話", "城市熱話", "文化現象", "社交媒體", "社群媒體", "人物故事", "文化體驗"],
};

function relevanceScore(topic: TopicIdea, preferences: string[]) {
  if (!preferences.length) return 0;
  const fields = [
    ...(topic.directions ?? []),
    ...(topic.direction_aliases ?? []),
    ...topic.tags,
    topic.category,
    topic.title,
  ].map(normalise);
  return preferences.reduce((score, preference) => {
    const targets = [preference, ...(PREFERENCE_DIRECTIONS[preference] ?? [])].map(normalise);
    return score + (targets.some((target) => fields.some((field) => field.includes(target) || target.includes(field))) ? 1 : 0);
  }, 0);
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
    image_url: topic.cover_url?.trim() || null,
    platform: "SOON",
    category: primaryDirection?.trim() || directions[0] || "最新精選",
    tags: cleanArray(topic.keywords).slice(0, 6),
    content_format: cleanArray(topic.content_formats)[0] || "short_video",
    workspace_id: null,
    created_at: topic.published_at || topic.updated_at || new Date(0).toISOString(),
    saved: false,
    want_to_create: false,
    why_now: topic.why_now?.trim() || undefined,
    hook: topic.hook?.trim() || undefined,
    suggested_angles: cleanArray(topic.suggested_angles),
    countries: cleanArray(topic.countries),
    regions: cleanArray(topic.regions),
    localities: cleanArray(topic.localities),
    directions,
    direction_aliases: directionAliases,
  };
}

async function fetchCentralTopics() {
  const endpoint = process.env.SOON_TOPIC_API_URL?.trim() || DEFAULT_TOPIC_API;
  const response = await fetch(`${endpoint}?language=zh-HK&limit=60`, {
    headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`SOON Topic API ${response.status}`);
  const payload = await response.json() as { topics?: CentralTopic[] };
  if (!Array.isArray(payload.topics)) throw new Error("SOON Topic API response is invalid");
  return payload.topics.map(mapCentralTopic);
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
  const { error } = await admin.from("egg_topic_ideas").upsert(topics.map((topic) => ({
    id: topic.id, workspace_id: null, title: topic.title, summary: topic.summary, source_name: topic.source_name,
    source_url: topic.source_url, image_url: topic.image_url, platform: topic.platform, category: topic.category,
    tags: topic.tags, content_format: topic.content_format, status: "published", updated_at: new Date().toISOString(),
  })), { onConflict: "id" });
  if (error) throw error;
}

async function listLocalTopics(workspaceId: string) {
  const admin = createEggAdmin();
  const { data, error } = await admin.from("egg_topic_ideas")
    .select("id,title,summary,source_name,source_url,image_url,media_urls,platform,category,tags,content_format,workspace_id,created_at")
    .eq("status", "published").not("workspace_id", "is", null).order("created_at", { ascending: false });
  if (error) throw error;
  const localTopics = (data ?? []).map((topic) => ({
    ...(topic as TopicIdea),
    manageable: topic.workspace_id === workspaceId,
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

export async function listTopicIdeas(workspaceId: string, preferredCategories?: string[]) {
  const admin = createEggAdmin();
  let centralIdeas: TopicIdea[] = [];
  try {
    centralIdeas = await fetchCentralTopics();
    await syncCentralTopicShadows(centralIdeas);
  } catch (error) {
    console.error("Central topic feed unavailable; using Egg fallback", error);
  }
  const localIdeas = await listLocalTopics(workspaceId);
  const ideas = [...localIdeas, ...centralIdeas.filter((central) => !localIdeas.some((local) => local.id === central.id))]
    .filter(hasUsableCover);

  let preferences = preferredCategories;
  if (!preferences) {
    const { data } = await admin.from("egg_creator_profiles").select("content_categories").eq("id", workspaceId).maybeSingle();
    preferences = cleanArray(data?.content_categories);
  }
  const { data: actions, error: actionsError } = await admin.from("egg_topic_actions")
    .select("idea_id,saved,want_to_create,dismissed").eq("workspace_id", workspaceId);
  if (actionsError) throw actionsError;
  const actionMap = new Map((actions ?? []).map((action) => [action.idea_id, action]));
  return ideas.flatMap((idea) => {
    const action = actionMap.get(idea.id);
    if (action?.dismissed) return [];
    const score = relevanceScore(idea, preferences ?? []);
    return [{ ...idea, saved: action?.saved ?? false, want_to_create: action?.want_to_create ?? false, recommended: score > 0, _score: score }];
  }).sort((a, b) => b._score - a._score || Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((rankedIdea) => {
      const { _score, ...idea } = rankedIdea;
      void _score;
      return idea;
    });
}
