import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";
import { presentReplyMessage } from "@/lib/reply-attachments";
import { isReplyProjectStatus } from "@/lib/reply-project-status";

async function getContext() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user) return null;
  const { profile } = await getActiveCreatorProfile("id");
  return profile ? { profile, admin: createEggAdmin() } : null;
}

export async function GET(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "缺少項目。" }, { status: 400 });

  const { data: project } = await context.admin.from("egg_reply_projects").select("id,name,brief,updated_at,lifecycle_status,status_updated_at").eq("id", projectId).eq("creator_id", context.profile.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "找不到此項目。" }, { status: 404 });
  const { data, error } = await context.admin.from("egg_reply_messages").select("id,role,content,created_at").eq("creator_id", context.profile.id).eq("project_id", projectId).order("created_at", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: "讀取對話失敗。" }, { status: 500 });
  return NextResponse.json({ messages: (data ?? []).map(presentReplyMessage), project }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "請輸入項目 或聯絡人名稱。" }, { status: 400 });
  const { data, error } = await context.admin.from("egg_reply_projects").insert({ creator_id: context.profile.id, name }).select("id,name,brief,updated_at").single();
  if (error) return NextResponse.json({ error: "建立項目 失敗。" }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { projectId?: string; notes?: string; tone?: string; language?: string; lifecycle_status?: unknown };
  if (!body.projectId) return NextResponse.json({ error: "缺少項目。" }, { status: 400 });
  if ('lifecycle_status' in body) {
    if (!isReplyProjectStatus(body.lifecycle_status)) return NextResponse.json({ error: '無效的項目狀態' }, { status: 400 });
    const { data, error } = await context.admin.from('egg_reply_projects')
      .update({ lifecycle_status: body.lifecycle_status, status_updated_at: new Date().toISOString() })
      .eq('id', body.projectId).eq('creator_id', context.profile.id)
      .select('id,name,brief,updated_at,lifecycle_status,status_updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: '未能更新項目狀態，請重試' }, { status: 500 });
    if (!data) return NextResponse.json({ error: '找不到項目' }, { status: 404 });
    return NextResponse.json({ project: data });
  }
  const tones = new Set(["friendly", "professional", "concise", "firm"]);
  const languages = new Set(["zh-HK", "zh-TW", "en"]);
  const update = {
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "",
    tone: tones.has(body.tone ?? "") ? body.tone : "friendly",
    language: languages.has(body.language ?? "") ? body.language : "zh-HK",
  };
  const { data, error } = await context.admin.from("egg_reply_projects").update(update).eq("id", body.projectId).eq("creator_id", context.profile.id).select("id,name,brief,updated_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "儲存 項目設定失敗。" }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  if (!projectId) return NextResponse.json({ error: "缺少項目。" }, { status: 400 });
  const { data: project } = await context.admin.from("egg_reply_projects").select("id")
    .eq("id", projectId).eq("creator_id", context.profile.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "找不到此項目。" }, { status: 404 });
  const { error } = await context.admin.from("egg_reply_projects").delete().eq("id", project.id).eq("creator_id", context.profile.id);
  if (error) return NextResponse.json({ error: "刪除項目 失敗。" }, { status: 500 });
  return NextResponse.json({ success: true });
}
