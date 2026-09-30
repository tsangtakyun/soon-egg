export type QuoteBrief = {
  brand?: string; contact?: string; collaborationType?: string; deliverables?: string[];
  timeline?: string; usageRights?: string; exclusivity?: string; budget?: string;
};

export type QuoteInput = {
  projectId: string; amount?: number; currency?: string; deliverable?: string;
  shootSessions?: number; revisions?: number; bonus?: string; adPlacementDays?: number;
  usageMonths?: number; paymentTerms?: string; signerName?: string;
  brandName?: string; paymentRecipient?: string;
};

export type QuoteSnapshot = {
  projectId: string; brandName: string; contact: string; deliverable: string; amount: number;
  currency: string; shootSessions: number; revisions: number; bonus: string;
  adPlacementDays: number | null; usageMonths: number | null; placementFee: number;
  usageFee: number; total: number; paymentTerms: string; signerName: string;
  paymentRecipient: string; timeline: string; known: string[]; missing: string[];
  conflicts: string[]; source: Record<string, 'client' | 'creator_rule' | 'human_input'>;
  confirmedAt: string;
};

const missingValue = (value: unknown) => !value || value === '未提供';

export function calculateQuote(brief: QuoteBrief, input: QuoteInput, rules: Record<string, unknown> = {}) {
  const amount = Number(input.amount || 0);
  const placementRate = Number(rules.placement_fee_rate ?? 0.10);
  const usageSixMonthsRate = Number(rules.usage_six_months_rate ?? 0.20);
  const usageTwelveMonthsRate = Number(rules.usage_twelve_months_rate ?? 0.30);
  const adPlacementDays = Number(input.adPlacementDays || 0) || null;
  const usageMonths = Number(input.usageMonths || 0) || null;
  const placementFee = adPlacementDays ? Math.round(amount * placementRate) : 0;
  const usageRate = usageMonths && usageMonths >= 12 ? usageTwelveMonthsRate : usageMonths ? usageSixMonthsRate : 0;
  const usageFee = Math.round(amount * usageRate);
  const deliverable = input.deliverable?.trim() || brief.deliverables?.join('、') || brief.collaborationType || '';
  const brandName = input.brandName?.trim() || (missingValue(brief.brand) ? '' : brief.brand!.trim());
  const missing = [
    !brandName && '品牌／客戶名稱', !deliverable && '交付內容', amount <= 0 && '由創作者確認的基礎報價',
    !input.signerName?.trim() && '簽署人', !input.paymentRecipient?.trim() && '收款人／公司',
  ].filter((value): value is string => Boolean(value));
  const conflicts: string[] = [];
  const normalizedBudget = String(brief.budget ?? '').replace(/[,\s]/g, '');
  const normalizedAmount = String(amount).replace(/[,\s]/g, '');
  if (!missingValue(brief.budget) && amount > 0 && !normalizedBudget.includes(normalizedAmount)) conflicts.push(`客戶預算「${brief.budget}」與輸入報價不同，需人工確認。`);
  const snapshot: QuoteSnapshot = {
    projectId: input.projectId, brandName, contact: missingValue(brief.contact) ? '' : brief.contact!.trim(), deliverable,
    amount, currency: input.currency || 'HKD', shootSessions: Math.max(0, Number(input.shootSessions ?? 1)),
    revisions: Math.max(0, Number(input.revisions ?? 2)), bonus: input.bonus?.trim() || '', adPlacementDays,
    usageMonths, placementFee, usageFee, total: amount + placementFee + usageFee,
    paymentTerms: input.paymentTerms?.trim() || String(rules.payment_terms || ''), signerName: input.signerName?.trim() || '',
    paymentRecipient: input.paymentRecipient?.trim() || '', timeline: missingValue(brief.timeline) ? '' : brief.timeline!.trim(),
    known: [brandName, deliverable, amount > 0 ? `${input.currency || 'HKD'} ${amount.toLocaleString('en-US')}` : '', brief.timeline || ''].filter(Boolean),
    missing, conflicts,
    source: { brandName: input.brandName ? 'human_input' : 'client', deliverable: input.deliverable ? 'human_input' : 'client', amount: 'human_input', paymentTerms: input.paymentTerms ? 'human_input' : 'creator_rule' },
    confirmedAt: new Date().toISOString(),
  };
  return { snapshot, canIssue: missing.length === 0 && conflicts.length === 0 };
}

export function quoteNumber(workspaceId: string, sequence: number, now = new Date()) {
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `Q-${workspaceId.slice(0, 4).toUpperCase()}-${year}${month}-${String(sequence).padStart(3, '0')}`;
}
