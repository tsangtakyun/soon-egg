import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { ensureDefaultRecipes, generateAngles, understandContentInput } from "@/lib/egg-content";
import { extractUrlContent } from "@/lib/url-content";
import { isKnowledgePilot, loadCoreKnowledgeForPilot } from "@/lib/core-knowledge";

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  const contentType = request.headers.get("content-type") ?? "";
  const form = contentType.includes("multipart/form-data") ? await request.formData().catch(() => null) : null;
  const body = form ? {
    input: String(form.get("input") ?? ""),
    sourceTopicId: String(form.get("sourceTopicId") ?? ""),
    origin: String(form.get("origin") ?? "egg_this"),
  } : await request.json().catch(() => ({})) as {
    input?: string;
    sourceTopicId?: string;
    origin?: "egg_this" | "daily_recommendation" | "topic_library";
  };
  const uploadedImages = form ? [...form.getAll("images"), form.get("image")].filter((image): image is File => image instanceof File && image.size > 0).slice(0, 6) : [];
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  if (uploadedImages.some((image) => !allowedImageTypes.includes(image.type as typeof allowedImageTypes[number]) || image.size > 8 * 1024 * 1024) || uploadedImages.reduce((total, image) => total + image.size, 0) > 30 * 1024 * 1024) {
    return NextResponse.json({ error: "最多上載 6 張 JPG、PNG、GIF 或 WebP；每張不可超過 8MB" }, { status: 400 });
  }
  const input = typeof body.input === "string" ? body.input.trim().slice(0, 12_000) : "";
  const sourceTopicId = typeof body.sourceTopicId === "string" ? body.sourceTopicId : "";
  if (!input && !sourceTopicId && !uploadedImages.length) return NextResponse.json({ error: "請輸入文字或上載圖片" }, { status: 400 });

  try {
    const [{ data: creator }, { data: creatorDna }, recipes, topicResult] = await Promise.all([
      context.admin.from("egg_creator_profiles")
        .select("display_name,bio,content_categories,content_language,ai_profile_summary")
        .eq("id", context.workspaceId).maybeSingle(),
      context.admin.from("creator_dna_profiles").select("primary_industry_code,secondary_industry_codes,content_styles,preferred_formats,audience_summary,profile_status,profile_version").eq("workspace_id", context.workspaceId).maybeSingle(),
      ensureDefaultRecipes(context.admin, context.workspaceId, context.user.id),
      sourceTopicId
        ? context.admin.from("egg_topic_ideas").select("id,workspace_id,title,summary,source_name,source_url,category,tags,content_format").eq("id", sourceTopicId).or(`workspace_id.is.null,workspace_id.eq.${context.workspaceId}`).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const topic = topicResult.data;
    const isUrl = !topic && /^https:\/\//i.test(input);
    let extractedUrl = null;
    if (isUrl) {
      try {
        extractedUrl = await extractUrlContent(input);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : "網站拒絕存取";
        return NextResponse.json({ error: `Egg 未能讀取這個網址（${detail}）。請貼上文章重點，或上載頁面截圖。` }, { status: 422 });
      }
    }
    const topicSummary = extractedUrl?.title || input || topic?.title || "圖片參考";
    const sourceType = topic ? (topic.workspace_id === null ? "soon_topic" : "workspace_topic") : (uploadedImages.length ? "image" : (/^https:\/\//i.test(input) ? "url" : "text"));
    const imageInputs = await Promise.all(uploadedImages.map(async (file) => {
      const bytes = Buffer.from(await file.arrayBuffer());
      return { file, bytes, mediaType: file.type as typeof allowedImageTypes[number], data: bytes.toString("base64") };
    }));
    const imageData = imageInputs.map(({ mediaType, data }) => ({ mediaType, data }));
    const imagePaths: string[] = [];
    const understanding = topic || extractedUrl
      ? { understood_summary: topicSummary, needs_clarification: false, clarification_question: "", clarification_options: [], grounded_facts: [], sources: [] }
      : await understandContentInput({
        text: input,
        images: imageData,
        tracking: { workspaceId: context.workspaceId, userId: context.user.id },
      });
    if (understanding.needs_clarification && understanding.clarification_question) {
      return NextResponse.json({
        needsClarification: true,
        understanding: {
          summary: understanding.understood_summary,
          question: understanding.clarification_question,
          options: understanding.clarification_options,
          sources: understanding.sources,
        },
      });
    }
    for (const image of imageInputs) {
      const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" } as const)[image.mediaType];
      const imagePath = `${context.workspaceId}/${context.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await context.admin.storage.from("egg-content-inputs").upload(imagePath, image.bytes, { contentType: image.mediaType, upsert: false });
      if (uploadError) throw uploadError;
      imagePaths.push(imagePath);
    }
    const sourceData = topic ? { ...topic } : { text: input, understood_summary: understanding.understood_summary, subject_type: "subject_type" in understanding ? understanding.subject_type : "general", identified_name: "identified_name" in understanding ? understanding.identified_name : "", venue_identity_status: "venue_identity_status" in understanding ? understanding.venue_identity_status : "confirmed", grounded_facts: understanding.grounded_facts, research_topics: "research_topics" in understanding ? understanding.research_topics : [], sources: understanding.sources, url: extractedUrl?.url ?? (!uploadedImages.length && sourceType === "url" ? input : null), extracted: extractedUrl, image_paths: imagePaths, image_names: uploadedImages.map((image) => image.name) };

    const { data: project, error: projectError } = await context.admin.from("egg_content_projects").insert({
      workspace_id: context.workspaceId,
      created_by: context.user.id,
      origin: body.origin ?? (topic ? "topic_library" : "egg_this"),
      source_type: sourceType,
      source_topic_id: topic?.id ?? null,
      source_data: sourceData,
      topic_summary: topicSummary,
      status: "draft",
    }).select("id,origin,source_type,source_data,topic_summary,status,created_at").single();
    if (projectError || !project) throw projectError ?? new Error("Project creation failed");

    const knowledge = await loadCoreKnowledgeForPilot(context.workspaceId, `${understanding.understood_summary || topicSummary} ${JSON.stringify(sourceData)} ${JSON.stringify(creatorDna || {})}`);
    const generated = await generateAngles({
      topic: understanding.understood_summary || topicSummary,
      sourceData,
      creator: { ...(creator || {}), creator_dna: creatorDna || null },
      recipes,
      tracking: { workspaceId: context.workspaceId, userId: context.user.id },
      images: imageData,
      knowledge,
    });
    const { data: angles, error: angleError } = await context.admin.from("egg_content_angles")
      .insert(generated.map((angle, rank) => ({ ...angle, project_id: project.id, rank })))
      .select("id,label,premise,audience_promise,editorial_lens,rationale,risk_flags,rank,hook_pattern_code,hook_modifiers,knowledge_refs,knowledge_bundle_version,knowledge_bundle_hash").order("rank");
    if (angleError) throw angleError;
    if (isKnowledgePilot(context.workspaceId)) {
      const appliedRefs = [...new Map(generated.flatMap((angle) => angle.knowledge_refs ?? []).map((ref) => [ref.ref, ref])).values()];
      const { error: lineageError } = await context.admin.from("egg_knowledge_generation_runs").insert({
        workspace_id: context.workspaceId,
        project_id: project.id,
        stage: "angles",
        bundle_version: knowledge?.bundleVersion ?? null,
        bundle_hash: knowledge?.contentHash ?? null,
        shown_refs: knowledge?.assets.map((asset) => ({ asset_type: asset.assetType, asset_id: asset.assetId, version: asset.version, ref: asset.ref })) ?? [],
        applied_refs: appliedRefs,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        status: knowledge ? "completed" : "bundle_unavailable",
        created_by: context.user.id,
      });
      if (lineageError) console.error("[core knowledge] angle lineage save failed", lineageError);
    }
    await context.admin.from("egg_content_projects").update({ status: "angles_ready", updated_at: new Date().toISOString() }).eq("id", project.id);
    return NextResponse.json({ project: { ...project, status: "angles_ready" }, angles: angles ?? [], recipes, sourcePreview: extractedUrl, research: { sourceCount: understanding.sources.length, topics: "research_topics" in understanding ? understanding.research_topics : [] } }, { status: 201 });
  } catch (error) {
    console.error("[egg projects] create failed", error);
    return NextResponse.json({ error: "Egg 暫時未能整理內容方向，請稍後再試" }, { status: 500 });
  }
}
