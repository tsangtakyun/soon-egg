import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { acceptPendingWorkspaceInvitations, createEggAdmin } from "@/lib/creator-workspace";

type HistoryMessage = { role: "user" | "assistant"; content: string };
type EnquiryBrief = {
  summary: string; brand: string; contact: string; collaborationType: string;
  deliverables: string[]; timeline: string; usageRights: string; exclusivity: string;
  budget: string; missing: string[]; risks: string[]; nextSteps: string[];
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const allowedMedia = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  return profile ? { admin, profile } : null;
}

export async function GET(request: Request) {
  const context = await getContext(request);
  if (!context) return NextResponse.json({ error: "登入已失效，請重新登入" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  const { data: projects, error: projectsError } = await context.admin.from("egg_reply_projects")
    .select("id,name,brief,updated_at").eq("creator_id", context.profile.id)
    .order("updated_at", { ascending: false });
  if (projectsError) return NextResponse.json({ error: "未能讀取 Projects" }, { status: 500 });
  const activeId = projectId ?? projects?.[0]?.id;
  if (activeId && !projects?.some((project) => project.id === activeId)) {
    return NextResponse.json({ error: "找不到呢個 Project" }, { status: 404 });
  }
  const { data: messages, error: messagesError } = activeId
    ? await context.admin.from("egg_reply_messages").select("id,role,content,created_at")
      .eq("creator_id", context.profile.id).eq("project_id", activeId)
      .order("created_at", { ascending: true }).limit(100)
    : { data: [], error: null };
  if (messagesError) return NextResponse.json({ error: "未能讀取對話" }, { status: 500 });
  return NextResponse.json({ projects: projects ?? [], activeProjectId: activeId ?? null, messages: messages ?? [] });
}

export async function POST(request: Request) {
  const context = await getContext(request);
  if (!context) return NextResponse.json({ error: "登入已失效，請重新登入" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string; name?: string; projectId?: string; message?: string;
    history?: HistoryMessage[]; image?: { data?: string; mediaType?: string };
  };
  if (body.action === "create_project") {
    const name = body.name?.trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "請輸入 Project 或聯絡人名稱" }, { status: 400 });
    const { data, error } = await context.admin.from("egg_reply_projects")
      .insert({ creator_id: context.profile.id, name }).select("id,name,brief,updated_at").single();
    if (error) return NextResponse.json({ error: "建立 Project 失敗" }, { status: 500 });
    return NextResponse.json({ project: data });
  }
  if (body.action !== "chat") return NextResponse.json({ error: "不支援嘅操作" }, { status: 400 });
  return generateReply(context, body);
}

async function generateReply(
  context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
  body: { projectId?: string; message?: string; history?: HistoryMessage[]; image?: { data?: string; mediaType?: string } },
) {
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
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `${promptProfile.system_prompt}\n\n你而家要一次過完成內部 Enquiry Brief 及對客戶第一輪回覆草稿。不可虛構資料。只輸出有效 JSON，不要 Markdown code fence：\n{"brief":{"summary":"","brand":"","contact":"","collaborationType":"","deliverables":[],"timeline":"","usageRights":"","exclusivity":"","budget":"","missing":[],"risks":[],"nextSteps":[]},"reply":"可直接發給客戶的回覆草稿"}`,
      messages: [...history, { role: "user" as const, content: image ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp", data: image.data! } },
        { type: "text" as const, text: buildContext(project.name, project.brief, context.profile, categories, cleanMessage) },
      ] : buildContext(project.name, project.brief, context.profile, categories, cleanMessage) }],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseResult(raw);
    if (!parsed) throw new Error("Invalid structured response");
    const [{ error: historyError }, { error: briefError }] = await Promise.all([
      context.admin.from("egg_reply_messages").insert([
        { creator_id: context.profile.id, project_id: project.id, role: "user", content: image ? `${cleanMessage}\n\n[已附上截圖]` : cleanMessage },
        { creator_id: context.profile.id, project_id: project.id, role: "assistant", content: parsed.reply },
      ]),
      context.admin.from("egg_reply_projects").update({ brief: parsed.brief, updated_at: new Date().toISOString() })
        .eq("id", project.id).eq("creator_id", context.profile.id),
    ]);
    if (historyError) console.error("[mobile reply] history save failed", historyError.message);
    if (briefError) console.error("[mobile reply] brief save failed", briefError.message);
    return NextResponse.json({ reply: parsed.reply, brief: parsed.brief, warning: historyError || briefError ? "草稿已生成，但部分紀錄暫時未能儲存" : undefined });
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
      summary: String(value.brief.summary ?? "未提供"), brand: String(value.brief.brand ?? "未提供"), contact: String(value.brief.contact ?? "未提供"), collaborationType: String(value.brief.collaborationType ?? "未提供"), deliverables: list(value.brief.deliverables), timeline: String(value.brief.timeline ?? "未提供"), usageRights: String(value.brief.usageRights ?? "未提供"), exclusivity: String(value.brief.exclusivity ?? "未提供"), budget: String(value.brief.budget ?? "未提供"), missing: list(value.brief.missing), risks: list(value.brief.risks), nextSteps: list(value.brief.nextSteps),
    }, reply: value.reply.trim() };
  } catch { return null; }
}
