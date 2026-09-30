// Country aliases are presentation/filter keys, never inferred from prose.
const entries: Array<[string, string, string[]]> = [
  ["AL", "阿爾巴尼亞", ["Albania"]], ["GE", "格魯吉亞", ["Georgia"]],
  ["IS", "冰島", ["Iceland"]], ["CZ", "捷克", ["Czechia", "Czech Republic"]],
  ["GB", "英國", ["UK", "United Kingdom", "England", "Scotland", "Wales", "Northern Ireland", "英国", "英格蘭", "英格兰", "蘇格蘭", "威爾斯", "北愛爾蘭"]],
  ["HK", "香港", ["Hong Kong"]], ["TW", "台灣", ["Taiwan", "臺灣", "台湾"]],
  ["JP", "日本", ["Japan"]], ["IT", "意大利", ["Italy", "義大利", "意大利"]],
  ["FR", "法國", ["France", "法国"]], ["US", "美國", ["USA", "United States", "United States of America", "美国"]],
  ["CN", "中國", ["China", "中国"]], ["KR", "韓國", ["Korea", "South Korea", "韩国"]],
  ["TH", "泰國", ["Thailand", "泰国"]], ["SG", "新加坡", ["Singapore"]],
  ["AU", "澳洲", ["Australia", "澳大利亞"]], ["CA", "加拿大", ["Canada"]],
  ["DE", "德國", ["Germany", "德国"]], ["ES", "西班牙", ["Spain"]],
  ["PT", "葡萄牙", ["Portugal"]], ["NL", "荷蘭", ["Netherlands", "荷兰"]],
  ["CH", "瑞士", ["Switzerland"]], ["AT", "奧地利", ["Austria"]],
  ["MY", "馬來西亞", ["Malaysia"]], ["VN", "越南", ["Vietnam"]],
  ["FI", "芬蘭", ["Finland", "芬兰"]], ["PL", "波蘭", ["Poland", "波兰"]],
  ["BR", "巴西", ["Brazil"]], ["HU", "匈牙利", ["Hungary"]], ["MX", "墨西哥", ["Mexico"]],
  ["MO", "澳門", ["Macau", "Macao", "澳门"]], ["NZ", "紐西蘭", ["New Zealand"]],
];
const key = (value: string) => value.trim().toLowerCase().replace(/[\s_\-]+/g, "");
const aliases = new Map(entries.flatMap(([code, name, names]) => [code, name, ...names].map(value => [key(value), code] as const)));
export function canonicalCountry(value: string): string {
  return aliases.get(key(value)) || (/^[a-z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : value.trim());
}
export function countryLabel(value: string): string {
  const code = canonicalCountry(value);
  let name = entries.find(entry => entry[0] === code)?.[1];
  if (!name && /^[A-Z]{2}$/.test(code)) {
    try { name = new Intl.DisplayNames(["zh-Hant"], { type: "region" }).of(code); } catch { /* Older native engines retain the ISO label. */ }
  }
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const flag = String.fromCodePoint(...[...code].map(char => 127397 + char.charCodeAt(0)));
  return `${flag} ${name || code}`;
}
export function topicCountryKeys(idea: { countries?: string[] | null }): string[] {
  return [...new Set((idea.countries || []).map(canonicalCountry).filter(Boolean))];
}
export function matchesCountry(idea: { countries?: string[] | null }, country: string): boolean {
  return country === "全部國家" || topicCountryKeys(idea).includes(canonicalCountry(country));
}

export function isKnownCountry(value: string): boolean {
  return entries.some(([code]) => code === canonicalCountry(value));
}
