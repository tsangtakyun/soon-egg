import { NextResponse } from "next/server";

import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { MetaApiError, metaGet, metaPost, normalizeAdAccountId, uploadMetaImage } from "@/lib/meta-ads-api";

type Payload = {
  launchAttemptId?: string; adAccountId?: string; pageId?: string; instagramAccountId?: string;
  campaignName?: string; objective?: "awareness" | "traffic" | "engagement" | "leads";
  targetLink?: string; headline?: string; caption?: string; callToAction?: string;
  dailyBudget?: number; ageMin?: number; ageMax?: number; countries?: string[]; postIds?: string[];
};
type SavedAd = { postId: string; creativeId: string; adId?: string };
const OBJECTIVES = {
  awareness: { campaign: "OUTCOME_AWARENESS", optimization: "REACH" },
  traffic: { campaign: "OUTCOME_TRAFFIC", optimization: "LINK_CLICKS" },
  engagement: { campaign: "OUTCOME_ENGAGEMENT", optimization: "POST_ENGAGEMENT" },
  leads: { campaign: "OUTCOME_LEADS", optimization: "LEAD_GENERATION" },
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const graphId = (value: unknown, label: string) => { const id = typeof value === "string" ? value.trim() : ""; if (!/^\d+$/.test(id)) throw new Error(`${label} 無效`); return id; };
const safeText = (value: unknown, fallback: string, max: number) => (typeof value === "string" && value.trim() ? value.trim() : fallback).slice(0, max);

function publicError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const meta = error instanceof MetaApiError ? error : null;
  if (/開發模式|development mode/i.test(raw)) return { code: "META_APP_DEVELOPMENT_MODE", message: "Meta App 尚未公開，暫時無法建立廣告創意。" };
  if (meta?.code === 190) return { code: "META_TOKEN_EXPIRED", message: "Meta 授權已失效，請重新連接後再試。" };
  if ((meta?.code && [10, 200].includes(meta.code)) || /permission|權限|not authorized/i.test(raw)) return { code: "META_PERMISSION_REQUIRED", message: "Meta 廣告權限尚未批核，請完成 App Review 後重新授權。" };
  return { code: "META_LAUNCH_FAILED", message: "Meta 暫時未能完成建立。已建立項目保持 PAUSED，重試會沿用現有進度。" };
}

export async function POST(request: Request) {
  let launchId = "";
  let workspaceId = "";
  let campaignId = "";
  let adSetId = "";
  let ads: SavedAd[] = [];
  let admin: Awaited<ReturnType<typeof getCreatorWorkspaceContext>>["admin"];
  try {
    const input = await request.json() as Payload;
    const context = await getCreatorWorkspaceContext();
    if (!context.user || !context.activeWorkspace || !context.admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
    if (context.activeRole !== "owner" && context.activeRole !== "admin") return NextResponse.json({ error: "只有 Owner 或 Admin 可以建立 Meta Ads" }, { status: 403 });
    workspaceId = context.activeWorkspace.id;
    if (process.env.META_APP_LIVE !== "true") return NextResponse.json({ code: "META_APP_DEVELOPMENT_MODE", error: "Meta App 尚未公開，暫時無法建立廣告創意。" }, { status: 409 });
    admin = context.admin;
    launchId = input.launchAttemptId || "";
    if (!uuid.test(launchId)) return NextResponse.json({ error: "建立請求識別碼無效，請重新開啟 wizard。" }, { status: 400 });

    const campaignName = safeText(input.campaignName, `Egg Meta Campaign ${new Date().toISOString().slice(0, 10)}`, 200);
    const { data: existing } = await admin.from("egg_meta_ad_launches").select("*").eq("workspace_id", context.activeWorkspace.id).eq("launch_attempt_id", launchId).maybeSingle();
    if (existing?.status === "paused") return NextResponse.json({ ok: true, status: "PAUSED", campaignId: existing.meta_campaign_id, adSetId: existing.meta_adset_id, ads: existing.ads, creativeIds: (existing.ads || []).map((item: SavedAd) => item.creativeId), adIds: (existing.ads || []).flatMap((item: SavedAd) => item.adId ? [item.adId] : []), message: "Campaign 已建立到 Meta，現時保持暫停。" });
    if (existing?.status === "processing" && Date.now() - new Date(existing.updated_at).getTime() < 15 * 60_000) return NextResponse.json({ error: "同一個建立請求正在處理，請勿重複提交。" }, { status: 409 });
    campaignId = existing?.meta_campaign_id || "";
    adSetId = existing?.meta_adset_id || "";
    ads = Array.isArray(existing?.ads) ? existing.ads : [];
    if (existing) {
      const { error } = await admin.from("egg_meta_ad_launches").update({ status: "processing", error_code: null, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("egg_meta_ad_launches").insert({ workspace_id: context.activeWorkspace.id, launch_attempt_id: launchId, created_by: context.user.id, campaign_name: campaignName, status: "processing" });
      if (error?.code === "23505") return NextResponse.json({ error: "同一個建立請求正在處理，請勿重複提交。" }, { status: 409 });
      if (error) throw error;
    }

    const accountId = normalizeAdAccountId(input.adAccountId || "");
    const pageId = graphId(input.pageId, "Facebook Page");
    const instagramId = input.instagramAccountId ? graphId(input.instagramAccountId, "Instagram Account") : "";
    const objectiveKey = input.objective && input.objective in OBJECTIVES ? input.objective : "awareness";
    const objective = OBJECTIVES[objectiveKey];
    const budget = Math.round(Number(input.dailyBudget) * 100);
    if (!Number.isFinite(budget) || budget < 100) throw new Error("每日預算必須最少為帳戶貨幣 1 元");
    const targetLink = new URL(input.targetLink || "");
    if (!["http:", "https:"].includes(targetLink.protocol)) throw new Error("推廣網址必須使用 http 或 https");

    const { data: connection } = await admin.from("egg_meta_connections").select("user_access_token").eq("workspace_id", context.activeWorkspace.id).maybeSingle();
    const token = connection?.user_access_token as string | null;
    if (!token) throw new Error("請先連接 Meta Ads 帳戶");
    const [accountResult, pageResult] = await Promise.all([
      metaGet("me/adaccounts", token, { fields: "id,account_status", limit: "100" }),
      metaGet("me/accounts", token, { fields: "id,instagram_business_account{id}", limit: "100" }),
    ]);
    const accounts = Array.isArray(accountResult.data) ? accountResult.data as Array<{ id?: string; account_status?: number }> : [];
    const pages = Array.isArray(pageResult.data) ? pageResult.data as Array<{ id?: string; instagram_business_account?: { id?: string } }> : [];
    if (!accounts.some((item) => item.id === accountId && item.account_status === 1)) throw new Error("所選 Ad Account 不可用");
    const selectedPage = pages.find((item) => item.id === pageId);
    if (!selectedPage || (instagramId && selectedPage.instagram_business_account?.id !== instagramId)) throw new Error("所選 Page／Instagram Account 不屬於目前連接");

    const postIds = [...new Set(input.postIds || [])].filter((id) => uuid.test(id)).slice(0, 5);
    const { data: posts, error: postsError } = await admin.from("egg_instagram_media").select("id,caption,media_url,thumbnail_url").eq("creator_id", context.activeWorkspace.id).in("id", postIds);
    if (postsError) throw postsError;
    if (!posts?.length || posts.length !== postIds.length) throw new Error("請至少選擇一個有效素材");

    async function saveProgress(status = "processing", errorCode: string | null = null) {
      const { error } = await admin!.from("egg_meta_ad_launches").update({ status, meta_campaign_id: campaignId || null, meta_adset_id: adSetId || null, ads, error_code: errorCode, request_details: { objective: objectiveKey, daily_budget_minor: budget, page_id: pageId, instagram_account_id: instagramId || null, target_link: targetLink.toString() }, updated_at: new Date().toISOString() }).eq("workspace_id", context.activeWorkspace!.id).eq("launch_attempt_id", launchId);
      if (error) throw error;
    }
    if (!campaignId) {
      const result = await metaPost(`${accountId}/campaigns`, token, { name: campaignName, objective: objective.campaign, special_ad_categories: "[]", is_adset_budget_sharing_enabled: "false", status: "PAUSED" });
      campaignId = String(result.id || ""); if (!campaignId) throw new Error("Meta 未有回傳 Campaign ID"); await saveProgress();
    }
    if (!adSetId) {
      const result = await metaPost(`${accountId}/adsets`, token, { name: `${campaignName} — Audience`, campaign_id: campaignId, daily_budget: String(budget), billing_event: "IMPRESSIONS", optimization_goal: objective.optimization, bid_strategy: "LOWEST_COST_WITHOUT_CAP", targeting: JSON.stringify({ age_min: Math.max(18, Math.min(65, Number(input.ageMin) || 18)), age_max: Math.max(18, Math.min(65, Number(input.ageMax) || 65)), geo_locations: { countries: (input.countries || ["HK"]).slice(0, 10) } }), status: "PAUSED" });
      adSetId = String(result.id || ""); if (!adSetId) throw new Error("Meta 未有回傳 Ad Set ID"); await saveProgress();
    }
    for (const post of posts) {
      let saved = ads.find((item) => item.postId === post.id);
      if (saved?.adId) continue;
      if (!saved) {
        const imageHash = await uploadMetaImage(accountId, token, String(post.media_url || post.thumbnail_url));
        const creative = await metaPost(`${accountId}/adcreatives`, token, { name: `${campaignName} — Creative`, object_story_spec: JSON.stringify({ page_id: pageId, ...(instagramId ? { instagram_user_id: instagramId } : {}), link_data: { link: targetLink.toString(), image_hash: imageHash, name: safeText(input.headline, "了解更多", 40), message: safeText(input.caption, post.caption || "", 2200), call_to_action: { type: safeText(input.callToAction, "LEARN_MORE", 40), value: { link: targetLink.toString() } } } }) });
        saved = { postId: post.id, creativeId: String(creative.id || "") }; if (!saved.creativeId) throw new Error("Meta 未有回傳 Creative ID"); ads.push(saved); await saveProgress();
      }
      const ad = await metaPost(`${accountId}/ads`, token, { name: `${campaignName} — Ad`, adset_id: adSetId, creative: JSON.stringify({ creative_id: saved.creativeId }), status: "PAUSED" });
      saved.adId = String(ad.id || ""); if (!saved.adId) throw new Error("Meta 未有回傳 Ad ID"); await saveProgress();
    }
    await saveProgress("paused");
    return NextResponse.json({ ok: true, status: "PAUSED", campaignId, adSetId, ads, creativeIds: ads.map((item) => item.creativeId), adIds: ads.flatMap((item) => item.adId ? [item.adId] : []), message: "Campaign 已真實建立到 Meta，現時保持 PAUSED，未開始扣款。" });
  } catch (error) {
    const safe = publicError(error);
    console.error("[egg/meta-ads/launch]", { launchId, campaignId, adSetId, ads, error });
    if (admin && launchId && workspaceId) await admin.from("egg_meta_ad_launches").update({ status: "failed", meta_campaign_id: campaignId || null, meta_adset_id: adSetId || null, ads, error_code: safe.code, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("launch_attempt_id", launchId);
    return NextResponse.json({ error: safe.message, code: safe.code, partial: Boolean(campaignId || adSetId || ads.length), createdCampaignId: campaignId || null, createdAdSetId: adSetId || null, creativeIds: ads.map((item) => item.creativeId), adIds: ads.flatMap((item) => item.adId ? [item.adId] : []) }, { status: 500 });
  }
}
