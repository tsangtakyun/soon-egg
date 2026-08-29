import { NextResponse } from "next/server";
import { acceptPendingWorkspaceInvitations, createEggAdmin } from "@/lib/creator-workspace";
import { masterSupabase } from "@/lib/supabase/master";

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function authenticatedUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const admin = createEggAdmin();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const workspaceId = request.headers.get("x-egg-workspace-id");
  if (workspaceId) {
    const { data: membership } = await admin.from("egg_creator_workspace_members")
      .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (!membership) return null;
  }
  return user;
}

const scriptFields = "id,title,topic,background,tone,framework,hook_variant,ai_draft,parts,created_at";

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "請重新登入" }, { status: 401 });
  const { data, error } = await (masterSupabase as any).from("scripts")
    .select(scriptFields).eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) {
    console.error("[mobile scripts] load error", error.message);
    return NextResponse.json({ error: "未能載入劇本" }, { status: 500 });
  }
  return NextResponse.json({ scripts: data ?? [] });
}

export async function DELETE(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "請重新登入" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "欠缺劇本 ID" }, { status: 400 });
  const { error } = await (masterSupabase as any).from("scripts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[mobile scripts] delete error", error.message);
    return NextResponse.json({ error: "未能刪除劇本" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
