export type CommandMode = "chat" | "daily" | "recommended";
export type CommandIntent = { count?: number; country?: string; city?: string; city_aliases?: string[]; location: string; format: string; on_camera: string; goal: string; kind: "inspiration" | "nearby" };
export type CommandTopic = { id: string; title: string; summary: string | null; category: string | null; tags: string[] | null; source_name: string | null; source_url: string | null; created_at?: string; countries?: string[]; localities?: string[]; geography_kind?: string };

export function commandMode(mode: unknown, prompt: string): CommandMode {
  // Also protect older installed clients which still send a session on shortcuts.
  if (mode === "daily" || prompt === "請建議我今天可以發布甚麼內容") return "daily";
  if (mode === "recommended" || prompt === "題材庫有哪些內容適合我？") return "recommended";
  return "chat";
}

const countryGroups = [
  ["意大利", "義大利", "意大利共和國", "Italy", "Italia", "IT"],
  ["英國", "英国", "英格蘭", "蘇格蘭", "威爾斯", "北愛爾蘭", "United Kingdom", "England", "Scotland", "Wales", "GB", "UK"],
  ["香港", "Hong Kong", "HK"], ["台灣", "臺灣", "台湾", "Taiwan", "TW"],
  ["日本", "Japan", "JP"], ["法國", "法国", "France", "FR"],
  ["西班牙", "Spain", "ES"], ["德國", "德国", "Germany", "DE"],
];
const normalise = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");
export function destinationTerms(location: string) {
  const exact = normalise(location);
  return countryGroups.find(group => group.some(term => normalise(term) === exact)) ?? (location.trim() ? [location.trim()] : []);
}

export function selectCommandTopics(topics: CommandTopic[], intent: CommandIntent, preferences: string[] = [], mode: CommandMode = "chat") {
  const terms = destinationTerms(intent.city || intent.location);
  const cityTerms = [...terms, ...(intent.city_aliases ?? [])];
  const food = /美食|餐廳|餐厅|咖啡|甜品|甜點|food|restaurant/i.test(intent.goal);
  return topics.filter(topic => {
    const tags = [...(topic.tags ?? []), ...(topic.localities ?? [])];
    if (intent.country && topic.countries?.length && !topic.countries.includes(intent.country)) return false;
    if (intent.city && ["context", "none"].includes(topic.geography_kind ?? "")) return false;
    const targetCountry = countryGroups.find(group => group === terms);
    const taggedCountries = countryGroups.filter(group => tags.some(tag => group.some(term => normalise(term) === normalise(tag))));
    if (targetCountry && taggedCountries.length && !taggedCountries.includes(targetCountry)) return false;
    const text = `${topic.title} ${topic.summary ?? ""}`.toLowerCase();
    const locationMatches = !terms.length || (!intent.city && !!intent.country && !!topic.countries?.includes(intent.country)) || cityTerms.some(term =>
      tags.some(tag => normalise(tag) === normalise(term)) ||
      (term.length >= 2 && /[^a-z]/i.test(term) && text.includes(term.toLowerCase())) ||
      (term.length > 2 && (` ${text.split(/[^a-z]+/i).join(" ")} `).includes(` ${term.toLowerCase()} `)));
    if (!locationMatches) return false;
    // Do not turn a food request into museums or general sightseeing.
    return !food || /美食|餐廳|餐厅|咖啡|甜品|甜點|food|restaurant/i.test(`${topic.category} ${tags.join(" ")} ${topic.title}`);
  }).map(topic => {
    const preference = preferences.reduce((score, pref) => score + (pref && `${topic.category} ${(topic.tags ?? []).join(" ")} ${topic.title}`.includes(pref) ? 1 : 0), 0);
    const age = topic.created_at ? Math.max(0, (Date.now() - Date.parse(topic.created_at)) / 86400000) : Infinity;
    const freshness = Number.isFinite(age) ? Math.max(0, 5 - age / 7) : 0;
    return { topic, score: preference * (mode === "daily" ? 2 : 10) + (mode === "daily" ? freshness : 0) };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40).map(({ topic }) => topic);
}

export function shortcutLocation(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const country = (value as { country?: unknown }).country;
  // Country-wide inspiration is intentional; never label it nearby.
  return typeof country === "string" ? destinationTerms(country.slice(0, 80))[0] ?? "" : "";
}

/** Explicit quantities override extraction; bound cost without silently promising more. */
export function requestedCount(prompt: string, extracted?: number): number {
  const match = prompt.match(/([0-9]+|[一二兩三四五六七八九十]+)\s*(?:條|個|則|篇|項|ideas?\b|topics?\b)/i);
  const digits: Record<string, number> = { 一:1, 二:2, 兩:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
  let count = extracted;
  if (match) {
    const value = match[1];
    count = /^\d+$/.test(value) ? Number(value) : value.includes("十")
      ? (digits[value.split("十")[0]] || 1) * 10 + (digits[value.split("十")[1]] || 0)
      : digits[value];
  }
  return Number.isFinite(count) ? Math.max(1, Math.min(12, Math.floor(count!))) : 3;
}

export function uniqueCommandTopics(topics: CommandTopic[]) {
  const seen = new Set<string>();
  return topics.filter(topic => {
    const key = topic.source_url?.replace(/[?&](?:utm_[^=]+|igsh|igshid|stkn)=[^&]*/g, "").replace(/\/$/, "") || normalise(topic.title);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
