import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

const INDUSTRIES = ["food_beverage", "travel_experience", "sports_wellness", "home_living", "medical_aesthetics_wellness", "beauty_cosmetics", "trend_culture"] as const;
const cleanList = (value: unknown, max = 8) => Array.isArray(value) ? [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, max) : [];

async function syncCore(workspaceId: string, profile: Record<string, unknown>) {
  const key = process.env.SOON_CORE_BUNDLE_KEY || process.env.SOON_CORE_KNOWLEDGE_KEY;
  if (!key || profile.profile_status !== "confirmed") return { synced: false, reason: "not_confirmed_or_key_missing" };
  const base = (process.env.SOON_CORE_URL || "https://soon-core.vercel.app").replace(/\/$/, "");
  const response = await fetch(`${base}/api/intelligence/dna/sync`, {
    method: "POST", headers: { "content-type": "application/json", "x-soon-knowledge-key": key }, cache: "no-store", signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ sourceSystem: "soon-egg", entityType: "creator", externalWorkspaceId: workspaceId, primaryIndustryCode: profile.primary_industry_code, secondaryIndustryCodes: profile.secondary_industry_codes, preferredFormats: profile.preferred_formats, profileStatus: profile.profile_status, profileVersion: profile.profile_version }),
  });
  if (!response.ok) throw new Error(`Core DNA sync returned ${response.status}`);
  return { synced: true };
}

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { data, error } = await context.admin.from("creator_dna_profiles").select("*").eq("workspace_id", context.workspaceId).maybeSingle();
  if (error) return NextResponse.json({ error: "暫時未能載入 Creator DNA 分類" }, { status: 500 });
  return NextResponse.json({ profile: data, industryCodes: INDUSTRIES, canEdit: ['owner', 'admin'].includes(context.role || '') });
}

export async function PATCH(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!['owner','admin'].includes(context.role || '')) return NextResponse.json({ error: "沒有管理權限" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const primary = String(body.primaryIndustryCode || "");
  const secondary = cleanList(body.secondaryIndustryCodes, 2).filter((code) => code !== primary);
  if (!INDUSTRIES.includes(primary as typeof INDUSTRIES[number]) || secondary.some((code) => !INDUSTRIES.includes(code as typeof INDUSTRIES[number]))) return NextResponse.json({ error: "行業分類不正確" }, { status: 422 });
  if (typeof body.audienceSummary === 'string' && body.audienceSummary.length > 1000) return NextResponse.json({ error: "受眾描述最多 1000 字" }, { status: 422 });
  const { data: existing, error: readError } = await context.admin.from("creator_dna_profiles").select("*").eq("workspace_id", context.workspaceId).maybeSingle();
  if (readError) return NextResponse.json({ error: "未能讀取原有偏好，請重試" }, { status: 500 });
  const confirmed = body.confirm === true;
  const row = { workspace_id: context.workspaceId, primary_industry_code: primary, secondary_industry_codes: secondary, content_styles: 'contentStyles' in body ? cleanList(body.contentStyles) : existing?.content_styles ?? [], preferred_formats: 'preferredFormats' in body ? cleanList(body.preferredFormats) : existing?.preferred_formats ?? [], audience_summary: 'audienceSummary' in body ? String(body.audienceSummary || "").trim() || null : existing?.audience_summary ?? null, collaboration_preferences: 'collaborationPreferences' in body ? cleanList(body.collaborationPreferences) : existing?.collaboration_preferences ?? [], excluded_industries: 'excludedIndustries' in body ? cleanList(body.excludedIndustries) : existing?.excluded_industries ?? [], profile_status: confirmed ? "confirmed" : "draft", profile_version: Number(existing?.profile_version || 0) + 1, confirmed_by: confirmed ? context.user.id : null, confirmed_at: confirmed ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  const { data, error } = await context.admin.from("creator_dna_profiles").upsert(row).select("*").single();
  if (error) return NextResponse.json({ error: "未能儲存 Creator DNA 分類" }, { status: 500 });
  try { return NextResponse.json({ profile: data, core: await syncCore(context.workspaceId, data) }); }
  catch (error) { return NextResponse.json({ profile: data, core: { synced: false, reason: String(error) }, warning: "分類已儲存，但 Core 暫時未同步" }); }
}
