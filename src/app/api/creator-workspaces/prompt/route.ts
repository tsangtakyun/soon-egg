import { NextResponse } from "next/server";
import { canManageWorkspacePrompt, getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export async function GET() {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkspacePrompt(activeRole)) return NextResponse.json({ error: "只有擁有者可以查看專屬商務規則" }, { status: 403 });
  const [{ data: prompt }, { data: versions }] = await Promise.all([
    admin.from("egg_reply_prompt_profiles").select("system_prompt,updated_at").eq("workspace_id", activeWorkspace.id).maybeSingle(),
    admin.from("egg_reply_prompt_versions").select("id,created_at").eq("workspace_id", activeWorkspace.id).order("created_at", { ascending: false }).limit(10),
  ]);
  return NextResponse.json({ systemPrompt: prompt?.system_prompt ?? "", updatedAt: prompt?.updated_at ?? null, versions: versions ?? [] });
}

export async function PATCH(request: Request) {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkspacePrompt(activeRole)) return NextResponse.json({ error: "只有擁有者可以修改專屬商務規則" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  if (systemPrompt.length < 100 || systemPrompt.length > 50000) return NextResponse.json({ error: "商務規則需要 100 至 50,000 字" }, { status: 400 });
  const { error: versionError } = await admin.from("egg_reply_prompt_versions").insert({ workspace_id: activeWorkspace.id, system_prompt: systemPrompt, created_by: user.id });
  if (versionError) return NextResponse.json({ error: "未能建立版本紀錄" }, { status: 500 });
  const { error } = await admin.from("egg_reply_prompt_profiles").upsert({ profile_key: `workspace_${activeWorkspace.id}`, workspace_id: activeWorkspace.id, system_prompt: systemPrompt, updated_at: new Date().toISOString() }, { onConflict: "profile_key" });
  if (error) return NextResponse.json({ error: "儲存商務規則失敗" }, { status: 500 });
  return NextResponse.json({ success: true });
}
