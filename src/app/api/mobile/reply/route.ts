import { after, NextResponse } from "next/server";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { getAnthropic } from "@/lib/ai/anthropic";
import { anthropicImageMetadata, trackedAnthropicCall } from "@/lib/ai/usage-ledger";
import { acceptPendingWorkspaceInvitations, createEggAdmin } from "@/lib/creator-workspace";
import { saveApprovedReplyRule, suggestReplyProjectName } from "@/lib/reply-workspace-rules";
import { presentReplyMessage, saveReplyAttachment, withReplyAttachment } from "@/lib/reply-attachments";
import { buildReplyLanguageInstruction } from "@/lib/reply-language";
import { isReplyProjectStatus } from "@/lib/reply-project-status";

type HistoryMessage = { role: "user" | "assistant"; content: string };
type EnquiryBrief = {
  summary: string; brand: string; contact: string; collaborationType: string;
  deliverables: string[]; timeline: string; usageRights: string; exclusivity: string;
  budget: string; missing: string[]; risks: string[]; nextSteps: string[];
  fieldEvidence: Array<{ field: string; value: string; source: "text" | "screenshot" | "audio" | "previous"; observedAt: string; confirmation: "client_stated" | "creator_confirmed" | "unconfirmed" }>;
  conflicts: string[];
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const allowedMedia = new Set(["image/jpeg", "image/png", "image/webp"]);
const replyOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["brief", "reply"],
  properties: {
    brief: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "brand", "contact", "collaborationType", "deliverables", "timeline", "usageRights", "exclusivity", "budget", "missing", "risks", "nextSteps", "fieldEvidence", "conflicts"],
      properties: {
        summary: { type: "string" }, brand: { type: "string" }, contact: { type: "string" },
        collaborationType: { type: "string" }, deliverables: { type: "array", items: { type: "string" } },
        timeline: { type: "string" }, usageRights: { type: "string" }, exclusivity: { type: "string" },
        budget: { type: "string" }, missing: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } }, nextSteps: { type: "array", items: { type: "string" } },
        conflicts: { type: "array", items: { type: "string" } },
        fieldEvidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "value", "source", "observedAt", "confirmation"], properties: { field: { type: "string" }, value: { type: "string" }, source: { type: "string", enum: ["text", "screenshot", "audio", "previous"] }, observedAt: { type: "string" }, confirmation: { type: "string", enum: ["client_stated", "creator_confirmed", "unconfirmed"] } } } },
      },
    },
    reply: { type: "string" },
  },
} as const;

async function getContext(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;
  const admin = createEggAdmin();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const requestedWorkspaceId = request.headers.get("x-egg-workspace-id");
  let membershipQuery = admin.from("egg_creator_workspace_members")
    .select("workspace_id,role").eq("user_id", user.id);
  if (requestedWorkspaceId) membershipQuery = membershipQuery.eq("workspace_id", requestedWorkspaceId);
  const { data: membership } = await membershipQuery.limit(1).maybeSingle();
  if (!membership?.workspace_id) return null;
  const { data: profile } = await admin.from("egg_creator_profiles")
    .select("id,display_name,username,bio,content_categories,instagram_handle")
    .eq("id", membership.workspace_id).maybeSingle();
  return profile ? { admin, profile, userId: user.id, role: membership.role } : null;
}

export async function GET(request: Request) {
  const context = await getContext(request);
  if (!context) return NextResponse.json({ error: "登入已失效，請重新登入" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  const { data: projects, error: projectsError } = await context.admin.from("egg_reply_projects")
    .select("id,name,brief,updated_at,lifecycle_status,status_updated_at").eq("creator_id", context.profile.id)
    .order("updated_at", { ascending: false });
  if (projectsError) return NextResponse.json({ error: "未能讀取 Projects" }, { status: 500 });
  // A project selection belongs to one workspace. When the user switches
  // workspace, the app may still send the previous workspace's project id.
  // Fall back to the first valid project instead of trapping the UI in 404.
  const activeId = projectId && projects?.some((project) => project.id === projectId)
    ? projectId
    : projects?.[0]?.id;
  const { data: messages, error: messagesError } = activeId
    ? await context.admin.from("egg_reply_messages").select("id,role,content,created_at")
      .eq("creator_id", context.profile.id).eq("project_id", activeId)
      .order("created_at", { ascending: true }).limit(100)
    : { data: [], error: null };
  if (messagesError) return NextResponse.json({ error: "未能讀取對話" }, { status: 500 });
  const { data: pendingJob } = activeId
    ? await context.admin.from("egg_reply_generation_jobs").select("id,status,created_at")
      .eq("creator_id", context.profile.id).eq("project_id", activeId).eq("status", "processing")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  return NextResponse.json({ projects: projects ?? [], activeProjectId: activeId ?? null, messages: (messages ?? []).map(presentReplyMessage), pendingJob });
}

export async function POST(request: Request) {
  const context = await getContext(request);
  if (!context) return NextResponse.json({ error: "登入已失效，請重新登入" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string; name?: string; projectId?: string; message?: string; lifecycle_status?: unknown;
    history?: HistoryMessage[]; feedbackMode?: "project" | "workspace_rule"; image?: { data?: string; mediaType?: string };
  };
  if (body.action === 'set_project_status') {
    if (!body.projectId || !isReplyProjectStatus(body.lifecycle_status)) return NextResponse.json({ error: '請選擇有效的項目及狀態' }, { status: 400 });
    const { data, error } = await context.admin.from('egg_reply_projects')
      .update({ lifecycle_status: body.lifecycle_status, status_updated_at: new Date().toISOString() })
      .eq('id', body.projectId).eq('creator_id', context.profile.id)
      .select('id,name,brief,updated_at,lifecycle_status,status_updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: '未能更新項目狀態，請重試' }, { status: 500 });
    if (!data) return NextResponse.json({ error: '找不到項目' }, { status: 404 });
    return NextResponse.json({ project: data });
  }
  if (body.action === "create_project") {
    const name = body.name?.trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "請輸入 Project 或聯絡人名稱" }, { status: 400 });
    const { data: existing } = await context.admin.from("egg_reply_projects")
      .select("id,name,brief,updated_at,lifecycle_status,status_updated_at").eq("creator_id", context.profile.id)
      .eq("name", name).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ project: existing, existing: true });
    const { data, error } = await context.admin.from("egg_reply_projects")
      .insert({ creator_id: context.profile.id, name }).select("id,name,brief,updated_at").single();
    if (error) return NextResponse.json({ error: "建立 Project 失敗" }, { status: 500 });
    return NextResponse.json({ project: data });
  }
  if (body.action === "delete_project") {
    if (!body.projectId) return NextResponse.json({ error: "請選擇要刪除嘅 Project" }, { status: 400 });
    const { data: project } = await context.admin.from("egg_reply_projects").select("id")
      .eq("id", body.projectId).eq("creator_id", context.profile.id).maybeSingle();
    if (!project) return NextResponse.json({ error: "找不到呢個 Project" }, { status: 404 });
    const { error: messagesError } = await context.admin.from("egg_reply_messages").delete()
      .eq("creator_id", context.profile.id).eq("project_id", project.id);
    if (messagesError) return NextResponse.json({ error: "未能刪除 Project 對話" }, { status: 500 });
    const { error } = await context.admin.from("egg_reply_projects").delete()
      .eq("id", project.id).eq("creator_id", context.profile.id);
    if (error) return NextResponse.json({ error: "未能刪除 Project" }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  if (body.action === "rename_project") {
    const name = body.name?.trim().slice(0, 80);
    if (!body.projectId || !name) return NextResponse.json({ error: "請輸入新 Project 名稱" }, { status: 400 });
    const { data: duplicate } = await context.admin.from("egg_reply_projects").select("id")
      .eq("creator_id", context.profile.id).eq("name", name).neq("id", body.projectId).limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ error: "已經有另一個同名 Project" }, { status: 409 });
    const { data, error } = await context.admin.from("egg_reply_projects")
      .update({ name }).eq("id", body.projectId)
      .eq("creator_id", context.profile.id).select("id,name,brief,updated_at").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "未能更新 Project 名稱" }, { status: 500 });
    return NextResponse.json({ project: data });
  }
  if (body.action === "job_status") {
    const jobId = typeof (body as { jobId?: unknown }).jobId === "string" ? String((body as { jobId?: string }).jobId) : "";
    if (!jobId) return NextResponse.json({ error: "缺少處理編號" }, { status: 400 });
    const { data: job } = await context.admin.from("egg_reply_generation_jobs")
      .select("id,status,result,error,updated_at").eq("id", jobId).eq("creator_id", context.profile.id).maybeSingle();
    if (!job) return NextResponse.json({ error: "找不到處理紀錄" }, { status: 404 });
    return NextResponse.json({ job });
  }
  if (body.action === "start_chat") {
    const previewBlock = trialPreviewAdmissionResponse();
    if (previewBlock) return previewBlock;
    const cleanMessage = body.message?.trim();
    if (!cleanMessage) return NextResponse.json({ error: "請貼上品牌查詢或上載截圖" }, { status: 400 });
    const { data: project } = body.projectId
      ? await context.admin.from("egg_reply_projects").select("id").eq("id", body.projectId).eq("creator_id", context.profile.id).maybeSingle()
      : { data: null };
    if (!project) return NextResponse.json({ error: "找不到目前 Project" }, { status: 404 });
    const { data: job, error: jobError } = await context.admin.from("egg_reply_generation_jobs")
      .insert({ creator_id: context.profile.id, project_id: project.id, status: "processing" })
      .select("id,status,created_at").single();
    if (jobError || !job) return NextResponse.json({ error: "暫時未能開始整理，請稍後再試" }, { status: 503 });
    after(async () => {
      try {
        const response = await generateReply(context, body);
        const result = await response.json().catch(() => ({})) as Record<string, unknown>;
        await context.admin.from("egg_reply_generation_jobs").update(response.ok
          ? { status: "completed", result, updated_at: new Date().toISOString() }
          : { status: "failed", error: String(result.error || "AI 暫時未能整理查詢"), updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("creator_id", context.profile.id);
      } catch (error) {
        console.error("[mobile reply] background job failed", { jobId: job.id, error });
        await context.admin.from("egg_reply_generation_jobs").update({ status: "failed", error: "AI 暫時未能整理查詢，請稍後再試", updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("creator_id", context.profile.id);
      }
    });
    return NextResponse.json({ job }, { status: 202 });
  }
  if (body.action !== "chat") return NextResponse.json({ error: "不支援嘅操作" }, { status: 400 });
  return generateReply(context, body);
}

async function generateReply(
  context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
  body: { projectId?: string; message?: string; history?: HistoryMessage[]; feedbackMode?: "project" | "workspace_rule"; image?: { data?: string; mediaType?: string } },
) {
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  const cleanMessage = body.message?.trim();
  if (!cleanMessage) return NextResponse.json({ error: "請貼上品牌查詢或上載截圖" }, { status: 400 });
  if (cleanMessage.length > 8000) return NextResponse.json({ error: "訊息太長，請縮短至 8,000 字內" }, { status: 400 });
  const [{ data: project }, { data: promptProfile }] = await Promise.all([
    body.projectId ? context.admin.from("egg_reply_projects").select("id,name,brief")
      .eq("id", body.projectId).eq("creator_id", context.profile.id).maybeSingle() : Promise.resolve({ data: null }),
    context.admin.from("egg_reply_prompt_profiles").select("system_prompt").eq("workspace_id", context.profile.id).maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: "找不到目前 Project" }, { status: 404 });
  if (!promptProfile?.system_prompt) return NextResponse.json({ error: "專屬商務規則尚未設定，請由工作空間擁有者先完成設定" }, { status: 503 });

  const now = Date.now();
  const [minuteUsage, dayUsage] = await Promise.all([
    context.admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", context.profile.id).gte("created_at", new Date(now - 60_000).toISOString()),
    context.admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", context.profile.id).gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);
  if (minuteUsage.error || dayUsage.error) return NextResponse.json({ error: "AI 服務暫時未能確認使用限額" }, { status: 503 });
  if ((minuteUsage.count ?? 0) >= 10 || (dayUsage.count ?? 0) >= 100) return NextResponse.json({ error: "使用次數太頻密，請稍後再試" }, { status: 429 });
  const { error: usageError } = await context.admin.from("egg_reply_usage").insert({ creator_id: context.profile.id });
  if (usageError) return NextResponse.json({ error: "AI 服務暫時未能記錄使用次數" }, { status: 503 });

  const history = Array.isArray(body.history) ? body.history.slice(-6)
    .filter((item) => item?.role === "user" || item?.role === "assistant")
    .map((item) => ({ role: item.role, content: String(item.content).slice(0, 5000) })) : [];
  const image = body.image?.data && body.image.data.length <= 4_000_000 && allowedMedia.has(body.image.mediaType ?? "") ? body.image : null;
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "AI 服務暫時未設定" }, { status: 503 });
  try {
    const categories = Array.isArray(context.profile.content_categories) ? context.profile.content_categories.join("、") : "未設定";
    const response = await trackedAnthropicCall({
      workspaceId: context.profile.id,
      userId: context.userId,
      feature: "reply",
      operation: "generate_reply",
      requestedModel: MODEL,
      media: anthropicImageMetadata(image ? [{ mediaType: image.mediaType ?? "image/jpeg", data: image.data! }] : []),
      maxAttemptsConfigured: 2,
    }, () => anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      output_config: { format: { type: "json_schema", schema: replyOutputSchema } },
      system: `${promptProfile.system_prompt}\n\n${buildReplyLanguageInstruction(cleanMessage)}\n\n你要一次過完成內部 Enquiry Brief 及對客戶第一輪回覆草稿。沿用 previous brief 已有而今次沒有推翻的資料；missing 只列真正缺漏，reply 只追問 missing，絕不可重問已在文字、截圖、錄音轉寫或之前對話提供的資料。若來源互相矛盾，保留兩者並放入 conflicts，不可自行選擇。fieldEvidence 要記錄欄位、值、來源、ISO 時間及確認狀態。不可虛構價錢、檔期、合約承諾或替創作者接受合作。只輸出有效 JSON，不要 Markdown code fence。`,
      messages: [...history, { role: "user" as const, content: image ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp", data: image.data! } },
        { type: "text" as const, text: buildContext(project.name, project.brief, context.profile, categories, cleanMessage) },
      ] : buildContext(project.name, project.brief, context.profile, categories, cleanMessage) }],
    }, { maxRetries: 0 }));
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseResult(raw);
    if (!parsed) {
      console.error("[mobile reply] invalid structured response", { stopReason: response.stop_reason, outputLength: raw.length });
      throw new Error("Invalid structured response");
    }
    const suggestedName = ["一般回覆", "General Replies"].includes(project.name) ? suggestReplyProjectName(parsed.brief.brand, parsed.brief.contact) : null;
    const attachmentUrl = image ? await saveReplyAttachment(context.admin, context.profile.id, image) : null;
    const [{ error: historyError }, { error: briefError }] = await Promise.all([
      context.admin.from("egg_reply_messages").insert([
        { creator_id: context.profile.id, project_id: project.id, role: "user", content: withReplyAttachment(cleanMessage, attachmentUrl) },
        { creator_id: context.profile.id, project_id: project.id, role: "assistant", content: parsed.reply },
      ]),
      context.admin.from("egg_reply_projects").update({ brief: parsed.brief, ...(suggestedName ? { name: suggestedName } : {}), updated_at: new Date().toISOString() })
        .eq("id", project.id).eq("creator_id", context.profile.id),
    ]);
    const ruleResult = body.feedbackMode === "workspace_rule"
      ? await saveApprovedReplyRule({ admin: context.admin, workspaceId: context.profile.id, userId: context.userId, role: context.role, instruction: cleanMessage })
      : null;
    if (historyError) console.error("[mobile reply] history save failed", historyError.message);
    if (briefError) console.error("[mobile reply] brief save failed", briefError.message);
    return NextResponse.json({ reply: parsed.reply, brief: parsed.brief, projectName: suggestedName ?? project.name, attachmentUrl, ruleSaved: ruleResult?.saved ?? false, warning: ruleResult?.warning ?? (historyError || briefError ? "草稿已生成，但部分紀錄暫時未能儲存" : undefined) });
  } catch (error) {
    console.error("[mobile reply] generation failed", error);
    return NextResponse.json({ error: "AI 暫時未能整理查詢，請稍後再試" }, { status: 502 });
  }
}

function buildContext(projectName: string, previousBrief: unknown, profile: Record<string, unknown>, categories: string, message: string) {
  return `Project／聯絡人：${projectName}\n目前 Active Enquiry：${JSON.stringify(previousBrief ?? {})}\n創作者：${String(profile.display_name || profile.username || "創作者")}\nInstagram：${String(profile.instagram_handle || "未設定")}\n內容類型：${categories}\n\n以下係今次品牌查詢：\n${message}`;
}

function parseResult(raw: string): { brief: EnquiryBrief; reply: string } | null {
  try {
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(raw.slice(start, end + 1)) as { brief?: Partial<EnquiryBrief>; reply?: unknown };
    if (!value.brief || typeof value.reply !== "string" || !value.reply.trim()) return null;
    const list = (item: unknown) => Array.isArray(item) ? item.map(String).filter(Boolean).slice(0, 20) : [];
    return { brief: {
      summary: String(value.brief.summary ?? "未提供"), brand: String(value.brief.brand ?? "未提供"), contact: String(value.brief.contact ?? "未提供"), collaborationType: String(value.brief.collaborationType ?? "未提供"), deliverables: list(value.brief.deliverables), timeline: String(value.brief.timeline ?? "未提供"), usageRights: String(value.brief.usageRights ?? "未提供"), exclusivity: String(value.brief.exclusivity ?? "未提供"), budget: String(value.brief.budget ?? "未提供"), missing: list(value.brief.missing), risks: list(value.brief.risks), nextSteps: list(value.brief.nextSteps), conflicts: list(value.brief.conflicts), fieldEvidence: Array.isArray(value.brief.fieldEvidence) ? value.brief.fieldEvidence : [],
    }, reply: value.reply.trim() };
  } catch { return null; }
}
