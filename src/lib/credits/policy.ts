export const CREDIT_POLICY_VERSION = "egg-credits-2026-10-07-v1";

export const CREDIT_ENTITLEMENTS = {
  free: {
    priceHkdMonthly: 0,
    monthlyCredits: 30,
    reset: "calendar_month",
    timezone: "Asia/Hong_Kong",
    timezoneConfirmed: false,
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
  [K in CreditAction]: (typeof CREDIT_ACTIONS)[K]["chargeable"] extends true ? K : never;
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

export function creditCost(action: CreditAction): number | null {
  return CREDIT_ACTIONS[action].credits;
}
