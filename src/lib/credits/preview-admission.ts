// This is a configuration gate, not a quota implementation. It only applies
// to an explicitly marked Preview/local test, never existing production users.
export function isTrialPreviewBlocked(env: Record<string, string | undefined> = process.env) {
  return env.EGG_TRIAL_PREVIEW === "true" && (env.VERCEL_ENV === "preview" || env.NODE_ENV === "test" || env.NODE_ENV === "development");
}
export function trialPreviewAdmissionResponse() {
  if (!isTrialPreviewBlocked()) return null;
  return Response.json({ error: "workspace_wallet_not_configured", message: "試用工作空間錢包尚未配置，暫時不能生成。現有內容仍可查看、編輯及下載。" }, { status: 503 });
}
