import { NextResponse } from "next/server";
import { canManageWorkspaceMembers, getCreatorWorkspaceContext, type WorkspaceRole } from "@/lib/creator-workspace";

const roles = new Set<WorkspaceRole>(["owner", "admin", "member"]);

export async function GET() {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkspaceMembers(activeRole)) return NextResponse.json({ error: "你無權管理成員" }, { status: 403 });
  const [{ data: members, error }, { data: invitations }] = await Promise.all([
    admin.from("egg_creator_workspace_members").select("user_id,email,role,created_at").eq("workspace_id", activeWorkspace.id).order("created_at"),
    admin.from("egg_creator_workspace_invitations").select("id,email,role,expires_at,created_at").eq("workspace_id", activeWorkspace.id).eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at"),
  ]);
  if (error) return NextResponse.json({ error: "讀取成員失敗" }, { status: 500 });
  return NextResponse.json({ members, invitations: invitations ?? [], currentRole: activeRole });
}

export async function POST(request: Request) {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkspaceMembers(activeRole)) return NextResponse.json({ error: "你無權邀請成員" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" ? "admin" : "member";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "請輸入有效電郵" }, { status: 400 });
  if (role === "admin" && activeRole !== "owner") return NextResponse.json({ error: "只有擁有者可以邀請 Admin" }, { status: 403 });
  const { data: existing } = await admin.from("egg_creator_workspace_members").select("user_id").eq("workspace_id", activeWorkspace.id).ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "呢位用戶已經係工作空間成員" }, { status: 409 });
  await admin.from("egg_creator_workspace_invitations").update({ status: "revoked" }).eq("workspace_id", activeWorkspace.id).ilike("email", email).eq("status", "pending");
  const { data: invitation, error } = await admin.from("egg_creator_workspace_invitations").insert({ workspace_id: activeWorkspace.id, email, role, invited_by: user.id, status: "pending", expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }).select("id,email,role,expires_at,created_at").single();
  if (error) {
    console.error("Workspace invitation creation failed", error.message);
    return NextResponse.json({ error: "邀請建立失敗，請稍後再試" }, { status: 500 });
  }
  let emailSent = false;
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const knownUser = users?.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!knownUser) {
    const origin = new URL(request.url).origin;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=auto` });
    emailSent = !inviteError;
    if (inviteError) console.warn("Workspace auth invitation email failed", inviteError.message);
  }
  return NextResponse.json({ invitation, emailSent, existingAccount: Boolean(knownUser) });
}

export async function PATCH(request: Request) {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = roles.has(body.role) ? body.role as WorkspaceRole : null;
  if (activeRole !== "owner" || !userId || !role) return NextResponse.json({ error: "只有擁有者可以更改角色" }, { status: 403 });
  if (role === "owner") return NextResponse.json({ error: "轉移擁有權需要獨立確認，暫時未開放" }, { status: 409 });
  if (userId === user.id) return NextResponse.json({ error: "擁有者唔可以降低自己權限" }, { status: 409 });
  const { error } = await admin.from("egg_creator_workspace_members").update({ role, updated_at: new Date().toISOString() }).eq("workspace_id", activeWorkspace.id).eq("user_id", userId).neq("role", "owner");
  if (error) return NextResponse.json({ error: "更新角色失敗" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkspaceMembers(activeRole)) return NextResponse.json({ error: "你無權移除成員" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.invitationId === "string") {
    const { error } = await admin.from("egg_creator_workspace_invitations").update({ status: "revoked" }).eq("id", body.invitationId).eq("workspace_id", activeWorkspace.id);
    return error ? NextResponse.json({ error: "取消邀請失敗" }, { status: 500 }) : NextResponse.json({ success: true });
  }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const { data: target } = await admin.from("egg_creator_workspace_members").select("role").eq("workspace_id", activeWorkspace.id).eq("user_id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "找不到成員" }, { status: 404 });
  if (target.role === "owner" || (target.role === "admin" && activeRole !== "owner")) return NextResponse.json({ error: "你無權移除呢位成員" }, { status: 403 });
  const { error } = await admin.from("egg_creator_workspace_members").delete().eq("workspace_id", activeWorkspace.id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "移除成員失敗" }, { status: 500 }) : NextResponse.json({ success: true });
}
