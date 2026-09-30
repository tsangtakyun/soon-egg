import { NextResponse } from "next/server";

import { getEggRequestContext } from "@/lib/egg-api-context";
import { isKnowledgePilot } from "@/lib/core-knowledge";
import { rankPublicationCandidates, type MatchPack } from "@/lib/publication-matching";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!isKnowledgePilot(context.workspaceId)) return NextResponse.json({ error: "配對功能現正於 SOON 帳號試行" }, { status: 403 });

  const [mediaResult, packsResult, recipesResult, publicationsResult] = await Promise.all([
    context.admin.from("egg_instagram_media")
      .select("instagram_media_id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,published_at")
      .eq("creator_id", context.workspaceId)
      .order("published_at", { ascending: false })
      .limit(50),
    context.admin.from("egg_content_packs")
      .select("id,recipe_id,content,created_at,updated_at,approval_status")
      .eq("workspace_id", context.workspaceId)
      .eq("approval_status", "approved")
      .order("updated_at", { ascending: false })
      .limit(100),
    context.admin.from("egg_content_recipes")
      .select("id,format")
      .eq("workspace_id", context.workspaceId),
    context.admin.from("egg_content_publications")
      .select("id,pack_id,external_media_id,media_product_type,published_at,link_method,link_confidence,lineage_status,linked_at")
      .eq("workspace_id", context.workspaceId),
  ]);

  const error = mediaResult.error || packsResult.error || recipesResult.error || publicationsResult.error;
  if (error) {
    console.error("[publication matching] load failed", error);
    return NextResponse.json({ error: "暫時未能載入發布配對" }, { status: 500 });
  }

  const recipeFormats = new Map((recipesResult.data ?? []).map((recipe) => [recipe.id, recipe.format]));
  const packs: MatchPack[] = (packsResult.data ?? []).map((pack) => ({
    id: pack.id,
    content: pack.content as Record<string, unknown>,
    created_at: pack.created_at,
    updated_at: pack.updated_at,
    recipe_format: recipeFormats.get(pack.recipe_id) ?? null,
  }));
  const publications = new Map((publicationsResult.data ?? []).map((item) => [item.external_media_id, item]));
  const media = (mediaResult.data ?? []).map((item) => ({
    ...item,
    publication: publications.get(item.instagram_media_id) ?? null,
    candidates: publications.has(item.instagram_media_id) ? [] : rankPublicationCandidates(item, packs),
  }));
  return NextResponse.json({ media, packCount: packs.length }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!isKnowledgePilot(context.workspaceId)) return NextResponse.json({ error: "配對功能現正於 SOON 帳號試行" }, { status: 403 });

  const body = await request.json().catch(() => null) as { action?: string; externalMediaId?: string; packId?: string } | null;
  if (!body?.externalMediaId || !["confirm", "external"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "配對資料不完整" }, { status: 400 });
  }
  const { data: media } = await context.admin.from("egg_instagram_media")
    .select("instagram_media_id,caption,media_type,media_product_type,published_at")
    .eq("creator_id", context.workspaceId)
    .eq("instagram_media_id", body.externalMediaId)
    .maybeSingle();
  if (!media) return NextResponse.json({ error: "找不到 Instagram 內容" }, { status: 404 });

  let packId: string | null = null;
  let confidence: number | null = null;
  if (body.action === "confirm") {
    if (!body.packId) return NextResponse.json({ error: "請選擇內容 Pack" }, { status: 400 });
    const [{ data: selectedPack }, { data: recipes }] = await Promise.all([
      context.admin.from("egg_content_packs")
        .select("id,recipe_id,content,created_at,updated_at,approval_status")
        .eq("workspace_id", context.workspaceId)
        .eq("id", body.packId)
        .maybeSingle(),
      context.admin.from("egg_content_recipes").select("id,format").eq("workspace_id", context.workspaceId),
    ]);
    if (!selectedPack) return NextResponse.json({ error: "內容 Pack 不屬於目前工作區" }, { status: 404 });
    if (selectedPack.approval_status !== "approved") return NextResponse.json({ error: "內容 Pack 尚未確認定稿，不能建立發布歸因" }, { status: 409 });
    const recipeFormats = new Map((recipes ?? []).map((recipe) => [recipe.id, recipe.format]));
    const candidates = rankPublicationCandidates(media, [{
      id: selectedPack.id,
      content: selectedPack.content as Record<string, unknown>,
      created_at: selectedPack.created_at,
      updated_at: selectedPack.updated_at,
      recipe_format: recipeFormats.get(selectedPack.recipe_id) ?? null,
    }]);
    const candidate = candidates[0];
    if (!candidate) return NextResponse.json({ error: "呢個 Pack 未達安全配對門檻，請勿建立錯誤歸因" }, { status: 422 });
    packId = selectedPack.id;
    confidence = candidate.score;
  }

  const payload = {
    workspace_id: context.workspaceId,
    pack_id: packId,
    platform: "instagram",
    external_media_id: media.instagram_media_id,
    media_product_type: media.media_product_type ?? media.media_type,
    published_at: media.published_at,
    link_method: body.action === "confirm" ? "suggested_confirmed" : "manual",
    link_confidence: confidence,
    lineage_status: body.action === "confirm" ? "attributed" : "external_content",
    linked_by: context.user.id,
    linked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await context.admin.from("egg_content_publications")
    .upsert(payload, { onConflict: "workspace_id,platform,external_media_id" })
    .select("id,lineage_status,pack_id")
    .single();
  if (error) {
    console.error("[publication matching] save failed", error);
    return NextResponse.json({ error: "未能儲存配對" }, { status: 500 });
  }
  return NextResponse.json({ publication: data });
}
