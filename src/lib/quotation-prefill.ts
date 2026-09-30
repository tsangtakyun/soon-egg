type QuotationBrief = {
  collaborationType?: string;
  deliverables?: string[];
  budget?: string;
};

const currencyAliases: Array<[string, RegExp]> = [
  ["HKD", /(?:HKD|HK\$|港幣|港元|香港元)/i],
  ["KRW", /(?:KRW|韓圜|韓元|韩元|원)/i],
  ["USD", /(?:USD|US\$|美元|美金)/i],
  ["CNY", /(?:CNY|RMB|人民幣|人民币|元人民幣)/i],
  ["JPY", /(?:JPY|日圓|日元|円)/i],
  ["EUR", /(?:EUR|歐元|欧元|€)/i],
  ["GBP", /(?:GBP|英鎊|英镑|£)/i],
];

function detectCurrency(text: string, fallback: string) {
  const explicit = currencyAliases.find(([, pattern]) => pattern.test(text));
  if (explicit) return explicit[0];
  return /\$/.test(text) ? fallback : fallback;
}

function exactBudgetAmount(text: string) {
  const normalized = text.replace(/,/g, "").trim();
  if (/\d(?:\.\d+)?\s*(?:萬|万|千|k|K)?\s*(?:-|–|—|~|～|至|到)\s*\d/.test(normalized)) return "";
  const values = [...normalized.matchAll(/\d+(?:\.\d+)?\s*(?:萬|万|千|k|K)?/g)];
  if (values.length !== 1) return "";
  const raw = values[0][0];
  const numeric = Number(raw.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  const multiplier = /(?:萬|万)/.test(raw) ? 10_000 : /(?:千|k)/i.test(raw) ? 1_000 : 1;
  const amount = numeric * multiplier;
  return Number.isFinite(amount) && amount > 0 ? String(amount) : "";
}

export function quotationPrefill(brief: QuotationBrief, quoteCurrency = "HKD") {
  const deliverables = (brief.deliverables ?? []).map((item) => item.trim()).filter(Boolean);
  const deliverable = deliverables.length ? deliverables.join("\n") : (brief.collaborationType?.trim() ?? "");
  const budgetText = brief.budget?.trim() && brief.budget.trim() !== "未提供" ? brief.budget.trim() : "";
  const detectedCurrency = budgetText ? detectCurrency(budgetText, quoteCurrency) : quoteCurrency;
  const exactAmount = budgetText ? exactBudgetAmount(budgetText) : "";
  const amount = detectedCurrency === quoteCurrency ? exactAmount : "";
  const amountNote = !budgetText
    ? "摘要未有已談銀碼"
    : amount
      ? "已從合作摘要帶入"
      : detectedCurrency !== quoteCurrency
        ? `對話使用 ${detectedCurrency}，未有自動當作 ${quoteCurrency}`
        : "對話提供嘅係範圍或多個銀碼，請確認最終報價";
  return { amount, currency: quoteCurrency, deliverable, budgetText, amountNote };
}
