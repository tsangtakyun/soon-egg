import { canonicalCountry, countryLabel, isKnownCountry } from "./topicGeography";
type Geography = { geography_kind?: string; geography_status?: string; countries?: string[] | null; tags?: string[] | null; localities?: string[] | null; regions?: string[] | null; title?: string | null };
const cities: Record<string, string> = {
  "尖沙咀": "HK", "tsim sha tsui": "HK", "旺角": "HK", "mong kok": "HK",
  "銅鑼灣": "HK", "causeway bay": "HK", "深水埗": "HK", "油麻地": "HK",
  "佐敦": "HK", "太子": "HK", "灣仔": "HK", "中環": "HK", "上環": "HK",
  "西環": "HK", "西營盤": "HK", "堅尼地城": "HK", "北角": "HK", "鰂魚涌": "HK",
  "筲箕灣": "HK", "柴灣": "HK", "香港仔": "HK", "赤柱": "HK",
  "九龍城": "HK", "土瓜灣": "HK", "紅磡": "HK", "黃大仙": "HK",
  "鑽石山": "HK", "觀塘": "HK", "牛頭角": "HK", "九龍灣": "HK",
  "荃灣": "HK", "葵涌": "HK", "青衣": "HK", "沙田": "HK", "大圍": "HK",
  "馬鞍山": "HK", "大埔": "HK", "粉嶺": "HK", "上水": "HK", "元朗": "HK",
  "天水圍": "HK", "屯門": "HK", "西貢": "HK", "將軍澳": "HK", "東涌": "HK",
  "長洲": "HK", "南丫島": "HK", "大嶼山": "HK",
  "由布院": "JP", "福岡": "JP", "沖繩": "JP", "五反田": "JP",
  "南法": "FR", "聖雷米": "FR", "柏林": "DE", "berlin": "DE",
  "加州": "US", "california": "US", "布達佩斯": "HU", "budapest": "HU", "普埃布拉": "MX",
  "巴黎": "FR", "paris": "FR", "里昂": "FR", "lyon": "FR", "馬賽": "FR",
  "倫敦": "GB", "london": "GB", "愛丁堡": "GB", "edinburgh": "GB",
  "羅馬": "IT", "rome": "IT", "米蘭": "IT", "milan": "IT", "威尼斯": "IT", "venice": "IT",
  "東京": "JP", "tokyo": "JP", "大阪": "JP", "osaka": "JP", "京都": "JP", "廣島": "JP",
  "首爾": "KR", "seoul": "KR", "釜山": "KR", "busan": "KR",
  "台南安平": "TW", "台中大雅": "TW", "台北信義區": "TW",
  "台北": "TW", "台南": "TW", "高雄": "TW", "台中": "TW",
  "曼谷": "TH", "bangkok": "TH", "清邁": "TH", "悉尼": "AU", "sydney": "AU",
};
const clean = (value: string) => value.trim().toLowerCase().replace(/^#/, "").replace(/(旅遊|旅游|旅行|景點|景点)$/, "");
// Require a complete location label at the beginning, not cuisine/style mentions.
// Longer labels first also handle multi-word English names without truncation.
const placeKey = (value: string) => clean(value).replace(/(美食|探店|餐廳|餐厅|景點|景点)$/, "");
const orderedPlaces = Object.keys(cities).sort((a, b) => b.length - a.length);
function titlePlace(topic: Geography): string | undefined {
  const title = (topic.title ?? "").trim().replace(/^[【\[（(]/, "").toLowerCase();
  return orderedPlaces.find(place =>
    title.startsWith(place) && /^[\s：:·・/／|｜\]】）)]/.test(title.slice(place.length, place.length + 1)));
}
export function topicCountries(topic: Geography): string[] {
  if (topic.geography_kind === "none" || topic.geography_status === "not_applicable") return [];
  const explicit = (topic.countries ?? []).filter(value => value.trim());
  if (explicit.length) return [...new Set(explicit.map(canonicalCountry))];
  const countries = new Set<string>();
  for (const value of [...(topic.tags ?? []), ...(topic.localities ?? []), ...(topic.regions ?? [])]) {
    const name = clean(value);
    if (isKnownCountry(name)) countries.add(canonicalCountry(name));
  }
  if (countries.size) return [...countries];
  // Exact city labels only. Cuisine/style words and free-form summaries are not evidence.
  for (const value of [...(topic.localities ?? []), ...(topic.regions ?? []), ...(topic.tags ?? [])]) {
    const code = cities[placeKey(value)];
    if (code) countries.add(code);
  }
  // A geographic title prefix such as "巴黎 Arnaud Nicolas" is explicit;
  // "巴黎風", "法式" and mentions elsewhere in a title are deliberately ignored.
  const prefix = titlePlace(topic);
  if (!countries.size && prefix && cities[prefix]) countries.add(cities[prefix]);
  return [...countries];
}

/** Place choices and card labels use the same non-destructive read-time fallback. */
export function topicLocations(topic: Geography): string[] {
  if (topic.geography_kind === "context" || topic.geography_kind === "none") return [];
  const countries = topicCountries(topic);
  const allowed = (value: string) => {
    const name = clean(value);
    return name && !isKnownCountry(name) && (!cities[placeKey(value)] || !countries.length || countries.includes(cities[placeKey(value)]));
  };
  const places = [...(topic.localities ?? []), ...(topic.regions ?? [])].map(value => value.trim()).filter(allowed);
  if (!places.length) {
    for (const tag of topic.tags ?? []) if (cities[placeKey(tag)] && allowed(tag)) places.push(placeKey(tag));
    const prefix = titlePlace(topic);
    if (!places.length && prefix && allowed(prefix)) places.push(prefix);
  }
  return [...new Map(places.map(value => [clean(value), value])).values()];
}

export function topicLocationLabel(topic: Geography): string {
  const countries = topicCountries(topic);
  return [countries[0] ? countryLabel(countries[0]) : "", topicLocations(topic)[0]].filter(Boolean).join(" · ");
}
