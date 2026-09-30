export const TOPIC_EDITORIAL_PROMPT = `題材必須描述帖文實際介紹的店名、事物或活動，不是發帖者。網頁標題可能只是帳號名稱，請優先使用正文。禁止使用「Threads創作者內容靈感」「社交平台分享題材」等泛稱。摘要以實際內容起首，不要帳號、平台名稱或介面文字。按正文選擇分類，明確介紹食物或餐廳時使用「美食」。沒有足夠內容時不要補作事實。`;
export function cleanTopicSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  while (lines.length > 1 && (/^@?[\w.]*_[\w.]+$/.test(lines[0]) || /^[\W\d_]*(?:threads|instagram)[\W\d_]*$/i.test(lines[0]) || /^@[^\s]+$/.test(lines[0]))) lines.shift();
  return lines.join(" ").replace(/\s+/g, " ").trim();
}
export function hasUsefulTopicEditorial(value: { title?: unknown; summary?: unknown }): boolean {
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const summary = cleanTopicSummary(value.summary);
  const generic = /創作者內容靈感|(?:分享|待整理)題材|正在整理|(?:未能|無法)(?:生成|整理)|資料不足|\bon (?:Threads|Instagram)\b/i;
  return title.length >= 6 && /[\u3400-\u9fff]/.test(title) && !generic.test(title)
    && summary.length >= 12 && /[\u3400-\u9fff]/.test(summary) && !/^(?:已由分享功能儲存|正在背景讀取)/.test(summary);
}
