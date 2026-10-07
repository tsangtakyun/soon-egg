export const CREDIT_POLICY_VERSION = "egg-credits-2026-10-07-workspace-v2";

// A published specification is not an activated database wallet.
export const CREDIT_WALLET_READY = false;

export function trialPreviewPolicy(rawCredits?: string) {
  const value = Number(rawCredits ?? 30);
  const credits = Number.isSafeInteger(value) && value >= 1 && value <= 150 ? value : 30;
  return {
    days: 7,
    credits,
    requiresCard: false,
    provisional: true,
    activated: false,
    expiry: "generation_disabled_read_edit_download_retained",
    existingFreeUsersChanged: false,
    permanentFreeRelationshipConfirmed: false,
  } as const;
}

export const CREDIT_ENTITLEMENTS = {
  free: {
    priceHkdMonthly: 0,
    monthlyCredits: 30,
    reset: "calendar_month",
    timezone: "Asia/Hong_Kong",
    timezoneConfirmed: true,
    rollover: false,
  },
  creator: {
    priceHkdMonthly: 98,
    monthlyCredits: 150,
    reset: "subscription_billing_cycle",
    timezone: null,
    rollover: false,
  },
} as const;

export const CREDIT_ACTIONS = {
  soon_ai_chat: {
    credits: 1,
    chargeable: true,
    label: "SOON AI 對話",
    costComponents: ["anthropic_text"],
  },
  script_generate: {
    credits: 3,
    chargeable: true,
    label: "劇本生成",
    costComponents: ["anthropic_text"],
  },
  egg_this_generate: {
    credits: 5,
    chargeable: true,
    label: "EggThis 內容生成",
    costComponents: ["anthropic_text", "anthropic_vision_optional"],
  },
  reply_short: {
    credits: 1, chargeable: true, label: "簡短回覆", costComponents: ["anthropic_text"],
  },
  reply_full: {
    credits: 3, chargeable: true, label: "完整回覆", costComponents: ["anthropic_text"],
  },
  reply_image: {
    credits: 5, chargeable: true, label: "圖片／截圖回覆", costComponents: ["anthropic_vision"],
  },
  subtitle_generate: {
    credits: null, chargeable: true, label: "字幕製作（包含轉錄）",
    creditsPerMinute: 3, durationSource: "verified_media", rounding: "ceil_minimum_one",
    costComponents: ["fal_media", "anthropic_text", "audio_duration"],
  },
  reply_generate: {
    credits: null,
    chargeable: false,
    label: "回覆生成",
    costComponents: ["anthropic_text", "anthropic_vision_optional"],
  },
  subtitle_transcribe: {
    credits: null,
    chargeable: false,
    label: "字幕轉錄",
    costComponents: ["fal_media", "audio_duration"],
  },
  subtitle_refine: {
    credits: null,
    chargeable: false,
    label: "字幕整理",
    costComponents: ["anthropic_text"],
  },
} as const;

export type CreditAction = keyof typeof CREDIT_ACTIONS;
export type ChargeableCreditAction = {
  [K in CreditAction]: (typeof CREDIT_ACTIONS)[K]["credits"] extends number ? K : never;
}[CreditAction];

const LEGACY_AI_FEATURES: Record<string, CreditAction> = {
  soon_ai: "soon_ai_chat",
  script: "script_generate",
  egg_this: "egg_this_generate",
  reply: "reply_generate",
  subtitle_transcribe: "subtitle_transcribe",
  subtitle_refine: "subtitle_refine",
};

export function resolveCreditAction(action: unknown, feature?: unknown): CreditAction | null {
  if (typeof action !== "string") return null;
  if (action in CREDIT_ACTIONS) return action as CreditAction;
  if (action === "ai_generate" && typeof feature === "string") {
    return LEGACY_AI_FEATURES[feature] ?? null;
  }
  return null;
}

export function creditCost(action: CreditAction, verifiedDurationSeconds?: number): number | null {
  if (action === "subtitle_generate") {
    if (typeof verifiedDurationSeconds !== "number" || !Number.isFinite(verifiedDurationSeconds) || verifiedDurationSeconds <= 0) return null;
    const cost = Math.max(1, Math.ceil(verifiedDurationSeconds / 60)) * 3;
    return Number.isSafeInteger(cost) ? cost : null;
  }
  return CREDIT_ACTIONS[action].credits;
}
