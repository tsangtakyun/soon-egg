import { eggStyleContext } from '@/lib/egg-style-context';
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { styleSnapshot, validateSelection, type ProductionStyle, type StyleResult } from '@/lib/production-style';
export const maxDuration = 120;
import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { generateContentPack, type EggAngle, type EggRecipe } from "@/lib/egg-content";
import { isKnowledgePilot, loadCoreKnowledgeForPilot } from "@/lib/core-knowledge";
import { commitCredits, creditErrorResponse, refundCredits, reserveCredits, type CreditReservation } from "@/lib/credits/ledger";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context?.user.email) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { styleFlowVersion?: number; angleId?: string; recipeId?: string; styleChoice?: { recommendationId: string; code: string; materials: string[] }; shootStatus?: "not_visited" | "visited" | "existing_assets" };
  if (!body.angleId || !body.recipeId) return NextResponse.json({ error: "請選擇內容方向及做法" }, { status: 400 });

  let pendingPackId = "";
  let reservation: CreditReservation | null = null;
  try {
    const [{ data: project }, { data: angle }, { data: recipe }, { data: creator }, { data: creatorDna }, { data: preferenceSignals }, { data: dnaRules }] = await Promise.all([
      context.admin.from("egg_content_projects").select("id,topic_summary,source_type,source_data").eq("id", id).eq("workspace_id", context.workspaceId).maybeSingle(),
      context.admin.from("egg_content_angles").select("id,label,premise,audience_promise,editorial_lens,rationale,risk_flags,rank,hook_pattern_code,hook_modifiers,knowledge_refs,knowledge_bundle_version,knowledge_bundle_hash").eq("id", body.angleId).eq("project_id", id).maybeSingle(),
      context.admin.from("egg_content_recipes").select("id,name,platform,format,production_mode,config").eq("id", body.recipeId).eq("workspace_id", context.workspaceId).eq("is_active", true).maybeSingle(),
      context.admin.from("egg_creator_profiles").select("display_name,bio,content_categories,content_language,ai_profile_summary").eq("id", context.workspaceId).maybeSingle(),
      context.admin.from("creator_dna_profiles").select("primary_industry_code,secondary_industry_codes,content_styles,preferred_formats,audience_summary,profile_status,profile_version").eq("workspace_id", context.workspaceId).maybeSingle(),
      context.admin.from("egg_preference_signals")
        .select("recipe_id,field_path,before_value,after_value,confirmed_at,created_at")
        .eq("workspace_id", context.workspaceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50),
      context.admin.from("egg_creator_dna_rules").select("category,scope,rule_text,evidence_count").eq("workspace_id", context.workspaceId).eq("status", "confirmed").eq("is_active", true),
    ]);
    if (!project || !angle || !recipe) return NextResponse.json({ error: "內容方向或做法已失效" }, { status: 404 });
    const sourceData = (project.source_data ?? {}) as Record<string, unknown>;
    const imagePaths = Array.isArray(sourceData.image_paths)
      ? sourceData.image_paths.filter((path): path is string => typeof path === "string").slice(0, 6)
      : typeof sourceData.image_path === "string" ? [sourceData.image_path] : [];
    const images = (await Promise.all(imagePaths.map(async (imagePath) => {
      const { data: blob, error: imageError } = await context.admin.storage.from("egg-content-inputs").download(imagePath);
      if (!imageError && blob) {
        const extension = imagePath.split(".").pop()?.toLowerCase();
        const mediaType = extension === "png" ? "image/png" : extension === "gif" ? "image/gif" : extension === "webp" ? "image/webp" : "image/jpeg";
        return { mediaType, data: Buffer.from(await blob.arrayBuffer()).toString("base64") };
      }
      return null;
    }))).filter((image): image is { mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } => image !== null);
    const shootStatus = ["not_visited", "visited", "existing_assets"].includes(body.shootStatus ?? "") ? body.shootStatus! : "not_visited";
    if (!body.styleChoice && body.styleFlowVersion === 1) return NextResponse.json({ error:"請先分析並確認製作風格，再生成內容。", code:"STYLE_SELECTION_REQUIRED" },{ status:409 });
    let selectedStyle:ProductionStyle | undefined;
    let selection:Record<string,unknown>={schemaVersion:1,styleCode:'legacy_recipe',styleName:'原有基本做法',selectedAt:new Date().toISOString()};
    if(body.styleChoice) {
    const productionInput=eggStyleContext(project, {id:angle.id,label:angle.label,premise:angle.premise,audience_promise:angle.audience_promise,editorial_lens:angle.editorial_lens},recipe,shootStatus,body.styleChoice.materials,creator);
    const {data:styleRun}=await context.admin.from('egg_project_style_runs').select('result').eq('project_id',id).eq('workspace_id',context.workspaceId).eq('input_hash',productionInput.inputHash).eq('result->>id',body.styleChoice.recommendationId).maybeSingle();
    const styleResult=styleRun?.result as StyleResult | undefined;
    if(!styleResult) return NextResponse.json({error:'內容或素材狀態已改變，請重新分析風格。'},{status:409});
    selectedStyle=styleResult.styles.find(style=>style.code===body.styleChoice?.code);
    const basic=body.styleChoice.code==='basic' && styleResult.styles.length===0;
    if(!selectedStyle && !basic) return NextResponse.json({error:'請選擇合適風格。'},{status:409});
    if(selectedStyle) { try { await validateSelection(selectedStyle); } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"請重新選擇風格。"},{status:409}); } }
    selection=selectedStyle ? styleSnapshot(selectedStyle,styleResult,productionInput.inputHash,productionInput.topicVersion) : {schemaVersion:1,styleCode:'basic',styleName:'已選基本做法',recommendationId:styleResult.id,inputHash:productionInput.inputHash,topicVersion:productionInput.topicVersion,selectedAt:new Date().toISOString()};
    }
    const {data:pending,error:pendingError}=await context.admin.from('egg_content_packs').insert({workspace_id:context.workspaceId,project_id:id,angle_id:angle.id,recipe_id:recipe.id,content:{_production_style:selection,_generation:{status:'pending'}},status:'draft',created_by:context.user.id}).select('id').single();
    if(pendingError || !pending) throw pendingError || new Error('未能保存生成記錄');
    pendingPackId=pending.id;
    reservation = await reserveCredits({
      request,
      userId: context.user.id,
      email: context.user.email,
      workspaceId: context.workspaceId,
      action: "egg_this_generate",
    });
    const relevantSignals = (preferenceSignals ?? [])
      .sort((a, b) => Number(Boolean(b.confirmed_at)) - Number(Boolean(a.confirmed_at)) || Number(b.recipe_id === recipe.id) - Number(a.recipe_id === recipe.id))
      .slice(0, 30);
    const relevantRules = (dnaRules ?? []).filter((rule) => rule.scope === "all" || rule.scope === recipe.production_mode);
    const knowledge = await loadCoreKnowledgeForPilot(context.workspaceId, `${project.topic_summary} ${angle.premise} ${JSON.stringify(creatorDna || {})}`);
    const generatedContent = await generateContentPack({
      topic: project.topic_summary,
      productionStyle: selectedStyle ? selection : undefined,
      recordGeneration: async (generation) => {
        const {error}=await context.admin.from('egg_content_packs').update({content:{_production_style:selection,_generation:generation}}).eq('id',pendingPackId).eq('workspace_id',context.workspaceId);
        if(error) throw error;
      },
      sourceData,
      images,
      shootStatus,
      angle: angle as EggAngle,
      recipe: recipe as EggRecipe,
      creator: { ...(creator || {}), creator_dna: creatorDna || null },
      preferenceSignals: relevantSignals,
      dnaRules: relevantRules,
      knowledge,
      tracking: { workspaceId: context.workspaceId, userId: context.user.id },
    });
    const content = {
      ...generatedContent,
      _production_style: selection,
      _creator_dna: {
        signal_count: relevantSignals.length,
        rules: relevantRules.map((rule) => ({
          category: rule.category,
          scope: rule.scope,
          rule_text: rule.rule_text,
          evidence_count: rule.evidence_count,
        })),
      },
    };
    const model = process.env.ANTHROPIC_SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
    const appliedRefs = Array.isArray(angle.knowledge_refs) ? angle.knowledge_refs : [];
    const { data: pack, error } = await context.admin.from("egg_content_packs").update({
      workspace_id: context.workspaceId, project_id: id, angle_id: angle.id, recipe_id: recipe.id,
      content, model, status: "ready", created_by: context.user.id,
      hook_pattern_code: angle.hook_pattern_code,
      hook_modifiers: angle.hook_modifiers,
      knowledge_refs: appliedRefs,
      knowledge_bundle_version: angle.knowledge_bundle_version ?? knowledge?.bundleVersion ?? null,
      knowledge_bundle_hash: angle.knowledge_bundle_hash ?? null,
    }).eq("id",pendingPackId).eq("workspace_id",context.workspaceId).select("id,angle_id,recipe_id,content,status,created_at,updated_at").single();
    if (error || !pack) throw error ?? new Error("Pack save failed");
    await Promise.all([
      context.admin.from("egg_content_angles").update({ selected_at: new Date().toISOString() }).eq("id", angle.id),
      context.admin.from("egg_content_projects").update({ status: "pack_ready", updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", context.workspaceId),
    ]);
    if (isKnowledgePilot(context.workspaceId)) {
      const { error: lineageError } = await context.admin.from("egg_knowledge_generation_runs").insert({
        workspace_id: context.workspaceId,
        project_id: id,
        pack_id: pack.id,
        stage: "pack",
        bundle_version: angle.knowledge_bundle_version ?? knowledge?.bundleVersion ?? null,
        bundle_hash: angle.knowledge_bundle_hash ?? null,
        shown_refs: knowledge?.assets.map((asset) => ({ asset_type: asset.assetType, asset_id: asset.assetId, version: asset.version, ref: asset.ref })) ?? [],
        applied_refs: appliedRefs,
        hook_pattern_code: angle.hook_pattern_code,
        hook_modifiers: angle.hook_modifiers,
        model,
        status: knowledge ? "completed" : "bundle_unavailable",
        created_by: context.user.id,
      });
      if (lineageError) console.error("[core knowledge] pack lineage save failed", lineageError);
    }
    const balance = await commitCredits(reservation);
    return NextResponse.json({ pack, recipe, angle, preferenceSignalCount: relevantSignals.length, creatorDnaRules: relevantRules, credits: { deducted: reservation.enabled ? reservation.amount : 0, balance } });
  } catch (error) {
    if (reservation) {
      try { await refundCredits(reservation); }
      catch (refundError) { console.error("[egg pack] credit refund pending", refundError instanceof Error ? refundError.name : "unknown_error"); }
    }
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    console.error("[egg pack] generation failed", error);
    if(pendingPackId) {
      const {data:saved}=await context.admin.from('egg_content_packs').select('content').eq('id',pendingPackId).eq('workspace_id',context.workspaceId).maybeSingle();
      await context.admin.from('egg_content_packs').update({status:'draft',content:{...saved?.content,_generation:{...saved?.content?._generation,status:'failed',error:'生成未完成，請重新生成。'}}}).eq('id',pendingPackId).eq('workspace_id',context.workspaceId);
    }
    return NextResponse.json({ error: "Egg 暫時未能生成內容包，請稍後再試" }, { status: 500 });
  }
}
