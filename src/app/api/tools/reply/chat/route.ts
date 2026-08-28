import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";

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
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const allowedMedia = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { message?: string; history?: HistoryMessage[]; projectId?: string; image?: { data?: string; mediaType?: string } };
  const cleanMessage = body.message?.trim();
  if (!cleanMessage) return NextResponse.json({ error: "請貼上品牌查詢或上載截圖。" }, { status: 400 });
  if (cleanMessage.length > 8000) return NextResponse.json({ error: "訊息太長，請縮短至 8,000 字內。" }, { status: 400 });

  const { profile } = await getActiveCreatorProfile("id,display_name,username,bio,content_categories,instagram_handle");
  if (!profile) return NextResponse.json({ error: "找不到目前工作空間。" }, { status: 404 });
  const admin = createEggAdmin();
  const [{ data: project }, { data: promptProfile }] = await Promise.all([
    body.projectId ? admin.from("egg_reply_projects").select("id,name,brief").eq("id", body.projectId).eq("creator_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("egg_reply_prompt_profiles").select("system_prompt").eq("profile_key", "renee_talent_manager").maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: "找不到目前 Project。" }, { status: 404 });
  if (!promptProfile?.system_prompt) return NextResponse.json({ error: "Renee 回覆規則尚未設定。" }, { status: 503 });

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
      max_tokens: 2500,
      system: `${promptProfile.system_prompt}\n\n你而家要一次過完成內部 Enquiry Brief 及對客戶第一輪回覆草稿。不可虛構資料。只輸出有效 JSON，不要 Markdown code fence：\n{"brief":{"summary":"","brand":"","contact":"","collaborationType":"","deliverables":[],"timeline":"","usageRights":"","exclusivity":"","budget":"","missing":[],"risks":[],"nextSteps":[]},"reply":"可直接發給客戶的回覆草稿"}`,
      messages: [...history, { role: "user" as const, content: imageData ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: imageData.mediaType as "image/jpeg" | "image/png" | "image/webp", data: imageData.data! } },
        { type: "text" as const, text: buildUserContext(project.name, project.brief, profile, categories, cleanMessage) },
      ] : buildUserContext(project.name, project.brief, profile, categories, cleanMessage) }],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const parsed = parseResult(raw);
    if (!parsed) throw new Error("Invalid structured response");

    const [{ error: historyError }, { error: briefError }] = await Promise.all([
      admin.from("egg_reply_messages").insert([
        { creator_id: profile.id, project_id: project.id, role: "user", content: imageData ? `${cleanMessage}\n\n[已附上截圖]` : cleanMessage },
        { creator_id: profile.id, project_id: project.id, role: "assistant", content: parsed.reply },
      ]),
      admin.from("egg_reply_projects").update({ brief: parsed.brief, updated_at: new Date().toISOString() }).eq("id", project.id).eq("creator_id", profile.id),
    ]);
    const warning = historyError || briefError ? "草稿已生成，但部分 Project 紀錄暫時未能儲存。" : undefined;
    if (historyError) console.error("[reply workspace] history save failed", historyError.message);
    if (briefError) console.error("[reply workspace] brief save failed", briefError.message);
    return NextResponse.json({ reply: parsed.reply, brief: parsed.brief, warning });
  } catch (error) {
    console.error("[reply workspace] generation failed", error);
    return NextResponse.json({ error: "AI 暫時未能整理查詢，請稍後再試。" }, { status: 502 });
  }
}

function buildUserContext(projectName: string, previousBrief: unknown, profile: Record<string, unknown>, categories: string, message: string) {
  return `Project／聯絡人：${projectName}\n目前 Active Enquiry：${JSON.stringify(previousBrief ?? {})}\n創作者：${String(profile.display_name || profile.username || "Renee")}\nInstagram：${String(profile.instagram_handle || "未設定")}\n內容類型：${categories}\n\n以下係今次品牌查詢：\n${message}`;
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
