import { after, NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";
import { saveApprovedReplyRule, suggestReplyProjectName } from "@/lib/reply-workspace-rules";
import { saveReplyAttachment, withReplyAttachment } from "@/lib/reply-attachments";
import { buildReplyLanguageInstruction } from "@/lib/reply-language";

export const maxDuration = 300;

export async function GET(request: Request) {
  const server = await createServerClient();
  const { data: { user } } = server ? await server.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "找不到工作空間" }, { status: 404 });
  const params = new URL(request.url).searchParams;
  const projectId = params.get("projectId");
  if (!projectId) return NextResponse.json({ error: "請選擇項目" }, { status: 400 });
  const admin = createEggAdmin();
  let query = admin.from("egg_reply_generation_jobs").select("id,project_id,status,result,error,created_at,updated_at")
    .eq("creator_id", profile.id).eq("project_id", projectId);
  if (params.get("jobId")) query = query.eq("id", params.get("jobId")!);
  const { data: job, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "未能讀取處理進度" }, { status: 503 });
  // A terminated worker must not leave the interface spinning indefinitely.
  if (job?.status === "processing" && Date.now() - Date.parse(job.created_at) > 360_000) {
    return NextResponse.json({ job: { ...job, status: "failed", error: "處理已逾時，請先檢查對話紀錄，再決定是否重試。" } }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
}

type HistoryMessage = { role: "user" | "assistant"; content: string };
type EnquiryBrief = {
  summary: string;
  brand: string;
  contact: string;
  collaborationType: string;
  deliverables: string[];
  timeline: string;
  usageRights: string;
  exclusivity: string;
  budget: string;
  missing: string[];
  risks: string[];
  nextSteps: string[];
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

export async function POST(request: Request) {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { background?: boolean; requestId?: string; message?: string; history?: HistoryMessage[]; projectId?: string; feedbackMode?: "project" | "workspace_rule"; image?: { data?: string; mediaType?: string } };
  const cleanMessage = body.message?.trim();
  if (!cleanMessage) return NextResponse.json({ error: "請貼上品牌查詢或上載截圖。" }, { status: 400 });
  if (cleanMessage.length > 8000) return NextResponse.json({ error: "訊息太長，請縮短至 8,000 字內。" }, { status: 400 });

  const { profile, activeRole } = await getActiveCreatorProfile("id,display_name,username,bio,content_categories,instagram_handle");
  if (!profile) return NextResponse.json({ error: "找不到目前工作空間。" }, { status: 404 });
  const admin = createEggAdmin();
  const [{ data: project }, { data: promptProfile }] = await Promise.all([
    body.projectId ? admin.from("egg_reply_projects").select("id,name,brief").eq("id", body.projectId).eq("creator_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("egg_reply_prompt_profiles").select("system_prompt").eq("workspace_id", profile.id).maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: "找不到目前項目。" }, { status: 404 });
  if (!promptProfile?.system_prompt) return NextResponse.json({ error: "專屬商務規則尚未設定，請由工作空間擁有者先完成設定。" }, { status: 503 });

  if (body.background) {
    if (!body.requestId || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.requestId)) return NextResponse.json({ error: "缺少有效的處理編號" }, { status: 400 });
    const { data: existing } = await admin.from("egg_reply_generation_jobs").select("id,status")
      .eq("id", body.requestId).eq("creator_id", profile.id).eq("project_id", project.id).maybeSingle();
    if (existing) return NextResponse.json({ job: existing }, { status: 202 });
    const { data: pending } = await admin.from("egg_reply_generation_jobs").select("id,status")
      .eq("creator_id", profile.id).eq("project_id", project.id).eq("status", "processing")
      .gte("created_at", new Date(Date.now() - 360_000).toISOString()).limit(1).maybeSingle();
    if (pending) return NextResponse.json({ error: "此項目仍在處理上一則訊息，請稍候。", job: pending }, { status: 409 });
    const { data: job, error } = await admin.from("egg_reply_generation_jobs")
      .insert({ id: body.requestId, creator_id: profile.id, project_id: project.id, status: "processing", result: { input: cleanMessage } })
      .select("id,status").single();
    if (error || !job) return NextResponse.json({ error: "未能建立處理任務，請稍後再試" }, { status: 503 });
    after(async () => {
      let result: Record<string, unknown>;
      let status = "failed";
      try {
        const response = await generate();
        result = await response.json();
        status = response.ok ? "completed" : "failed";
      } catch {
        result = { error: "暫時未能生成回覆，請稍後再試。" };
      }
      const { error: saveError } = await admin.from("egg_reply_generation_jobs")
        .update({ status, result: { ...result, input: cleanMessage }, error: status === "failed" ? String(result.error) : null, updated_at: new Date().toISOString() })
        .eq("id", job.id).eq("creator_id", profile.id);
      if (saveError) console.error("[reply job] result persistence failed", { jobId: job.id });
    });
    return NextResponse.json({ job }, { status: 202 });
  }
  return generate();

  async function generate() {
  if (!profile || !project || !promptProfile || !user || !cleanMessage) return NextResponse.json({ error: "處理資料已失效" }, { status: 400 });

  const now = Date.now();
  const [minuteUsage, dayUsage] = await Promise.all([
    admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", profile.id).gte("created_at", new Date(now - 60_000).toISOString()),
    admin.from("egg_reply_usage").select("id", { count: "exact", head: true }).eq("creator_id", profile.id).gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);
  if (minuteUsage.error || dayUsage.error) return NextResponse.json({ error: "AI 服務暫時未能確認使用限額。" }, { status: 503 });
  if ((minuteUsage.count ?? 0) >= 10 || (dayUsage.count ?? 0) >= 100) return NextResponse.json({ error: "使用次數太頻密，請稍後再試。" }, { status: 429, headers: { "Retry-After": "60" } });
  const { error: usageError } = await admin.from("egg_reply_usage").insert({ creator_id: profile.id });
  if (usageError) return NextResponse.json({ error: "AI 服務暫時未能記錄使用次數。" }, { status: 503 });

  const history = Array.isArray(body.history) ? body.history.slice(-6).filter((item) => item?.role === "user" || item?.role === "assistant").map((item) => ({ role: item.role, content: String(item.content).slice(0, 5000) })) : [];
  const imageData = body.image?.data && body.image.data.length <= 4_000_000 && allowedMedia.has(body.image.mediaType ?? "") ? body.image : null;
  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "AI 服務暫時未設定。" }, { status: 503 });

  try {
    const categories = Array.isArray(profile.content_categories) ? profile.content_categories.join("、") : "未設定";
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      output_config: { format: { type: "json_schema", schema: replyOutputSchema } },
      system: `${promptProfile.system_prompt}\n\n${buildReplyLanguageInstruction(cleanMessage)}\n\n請一次完成內部合作摘要及對客戶第一輪回覆草稿。沿用 previous brief 已有而今次沒有推翻的資料；missing 只列真正缺漏，reply 只追問 missing，絕不可重問已在文字、截圖、錄音轉寫或之前對話提供的資料。若來源互相矛盾，保留兩者並放入 conflicts，不可自行選擇。fieldEvidence 要記錄欄位、值、來源、ISO 時間及確認狀態。不可虛構價錢、檔期、合約承諾或替創作者接受合作。只輸出有效 JSON，不要 Markdown code fence。`,
      messages: [...history, { role: "user" as const, content: imageData ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: imageData.mediaType as "image/jpeg" | "image/png" | "image/webp", data: imageData.data! } },
        { type: "text" as const, text: buildUserContext(project.name, project.brief, profile, categories, cleanMessage) },
      ] : buildUserContext(project.name, project.brief, profile, categories, cleanMessage) }],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseResult(raw);
    if (!parsed) {
      console.error("[reply workspace] invalid structured response", { stopReason: response.stop_reason, outputLength: raw.length });
      throw new Error("Invalid structured response");
    }

    const suggestedName = ["一般回覆", "General Replies"].includes(project.name) ? suggestReplyProjectName(parsed.brief.brand, parsed.brief.contact) : null;
    const attachmentUrl = imageData ? await saveReplyAttachment(admin, profile.id, imageData) : null;
    const [{ error: historyError }, { error: briefError }] = await Promise.all([
      admin.from("egg_reply_messages").insert([
        { creator_id: profile.id, project_id: project.id, role: "user", content: withReplyAttachment(cleanMessage, attachmentUrl) },
        { creator_id: profile.id, project_id: project.id, role: "assistant", content: parsed.reply },
      ]),
      admin.from("egg_reply_projects").update({ brief: parsed.brief, ...(suggestedName ? { name: suggestedName } : {}), updated_at: new Date().toISOString() }).eq("id", project.id).eq("creator_id", profile.id),
    ]);
    const ruleResult = body.feedbackMode === "workspace_rule"
      ? await saveApprovedReplyRule({ admin, workspaceId: profile.id, userId: user.id, role: activeRole ?? null, instruction: cleanMessage })
      : null;
    const warning = ruleResult?.warning ?? (historyError || briefError ? "草稿已生成，但部分項目紀錄暫時未能儲存。" : undefined);
    if (historyError) console.error("[reply workspace] history save failed", historyError.message);
    if (briefError) console.error("[reply workspace] brief save failed", briefError.message);
    return NextResponse.json({ reply: parsed.reply, brief: parsed.brief, projectName: suggestedName ?? project.name, attachmentUrl, ruleSaved: ruleResult?.saved ?? false, warning, model: MODEL, usage: response.usage });
  } catch (error) {
    console.error("[reply workspace] generation failed", error);
    return NextResponse.json({ error: "AI 暫時未能整理查詢，請稍後再試。" }, { status: 502 });
  }
  }
}

function buildUserContext(projectName: string, previousBrief: unknown, profile: Record<string, unknown>, categories: string, message: string) {
  return `Project／聯絡人：${projectName}\n目前 Active Enquiry：${JSON.stringify(previousBrief ?? {})}\n創作者：${String(profile.display_name || profile.username || "Renee")}\nInstagram：${String(profile.instagram_handle || "未設定")}\n內容類型：${categories}\n\n以下是本次品牌查詢：\n${message}`;
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
