import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACTIVE_CREATOR_COOKIE,
  canCreateCreatorWorkspace,
  createEggAdmin,
  getCreatorWorkspaceContext,
} from "@/lib/creator-workspace";

export async function GET() {
  const { user, workspaces, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ workspaces, activeWorkspaceId: activeWorkspace?.id ?? null, canCreate: canCreateCreatorWorkspace(user.email) });
}

export async function PATCH(request: Request) {
  const { user, workspaces } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
    return NextResponse.json({ error: "你無權使用呢個工作空間" }, { status: 403 });
  }
  (await cookies()).set(ACTIVE_CREATOR_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const { user } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateCreatorWorkspace(user.email)) return NextResponse.json({ error: "只有內部管理員可以建立工作空間" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) return NextResponse.json({ error: "請輸入有效名稱" }, { status: 400 });

  const admin = createEggAdmin();
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "creator";
  let username = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing } = await admin.from("egg_creator_profiles").select("id").eq("username", username).maybeSingle();
    if (!existing) break;
    username = `${base}_${Math.random().toString(36).slice(2, 7)}`;
  }
  const { data: profile, error } = await admin.from("egg_creator_profiles").insert({
    user_id: user.id,
    username,
    display_name: name,
    is_public: false,
    onboarding_completed: false,
  }).select("id,username,display_name,avatar_url,onboarding_completed").single();
  if (error || !profile) return NextResponse.json({ error: error?.message ?? "建立失敗" }, { status: 500 });
  const { error: membershipError } = await admin.from("egg_creator_workspace_members").insert({ workspace_id: profile.id, user_id: user.id, email: user.email?.toLowerCase() ?? `${user.id}@workspace.local`, role: "owner" });
  if (membershipError) {
    console.error("Creator workspace owner membership failed", profile.id, membershipError.message);
    await admin.from("egg_creator_profiles").delete().eq("id", profile.id);
    return NextResponse.json({ error: "建立工作空間失敗，請稍後再試" }, { status: 500 });
  }
  (await cookies()).set(ACTIVE_CREATOR_COOKIE, profile.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return NextResponse.json({ success: true, workspace: profile });
}

export async function DELETE(request: Request) {
  const { user, workspaces, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const target = workspaces.find((workspace) => workspace.id === workspaceId);
  if (!target) return NextResponse.json({ error: "找不到工作空間" }, { status: 404 });
  if (target.role !== "owner") return NextResponse.json({ error: "只有擁有者可以刪除工作空間" }, { status: 403 });
  if (workspaces.length <= 1) return NextResponse.json({ error: "唔可以刪除唯一工作空間" }, { status: 409 });

  const admin = createEggAdmin();
  const { error } = await admin
    .from("egg_creator_profiles")
    .delete()
    .eq("id", target.id);
  if (error) {
    console.error("Creator workspace deletion failed", target.id, error.message);
    return NextResponse.json({ error: "刪除失敗，請稍後再試" }, { status: 500 });
  }

  if (activeWorkspace?.id === target.id) {
    const fallback = workspaces.find((workspace) => workspace.id !== target.id);
    if (fallback) {
      (await cookies()).set(ACTIVE_CREATOR_COOKIE, fallback.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }
  return NextResponse.json({ success: true, deletedWorkspaceId: target.id });
}
