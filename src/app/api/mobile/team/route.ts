import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  canManageWorkspaceMembers,
  createEggAdmin,
  type WorkspaceRole,
} from "@/lib/creator-workspace";

async function context(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return null;
  const admin = createEggAdmin();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const workspaceId = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data: membership } = await query.limit(1).maybeSingle();
  return membership
    ? {
        admin,
        user,
        workspaceId: membership.workspace_id,
        role: membership.role as WorkspaceRole,
      }
    : null;
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (!canManageWorkspaceMembers(ctx.role))
    return NextResponse.json(
      { error: "只有擁有者或 Admin 可以管理成員" },
      { status: 403 },
    );
  const [{ data: members, error }, { data: invitations }] = await Promise.all([
    ctx.admin
      .from("egg_creator_workspace_members")
      .select("user_id,email,role,created_at")
      .eq("workspace_id", ctx.workspaceId)
      .order("created_at"),
    ctx.admin
      .from("egg_creator_workspace_invitations")
      .select("id,email,role,expires_at,created_at")
      .eq("workspace_id", ctx.workspaceId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ]);
  if (error)
    return NextResponse.json({ error: "未能讀取團隊成員" }, { status: 500 });
  return NextResponse.json({
    members: members ?? [],
    invitations: invitations ?? [],
    currentRole: ctx.role,
  });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (!canManageWorkspaceMembers(ctx.role))
    return NextResponse.json({ error: "你無權邀請成員" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "invite";
  if (action === "invite") {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";
    if (!/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({ error: "請輸入有效電郵" }, { status: 400 });
    if (role === "admin" && ctx.role !== "owner")
      return NextResponse.json(
        { error: "只有擁有者可以邀請 Admin" },
        { status: 403 },
      );
    const { data: existing } = await ctx.admin
      .from("egg_creator_workspace_members")
      .select("user_id")
      .eq("workspace_id", ctx.workspaceId)
      .ilike("email", email)
      .maybeSingle();
    if (existing)
      return NextResponse.json(
        { error: "呢位用戶已經係工作空間成員" },
        { status: 409 },
      );
    await ctx.admin
      .from("egg_creator_workspace_invitations")
      .update({ status: "revoked" })
      .eq("workspace_id", ctx.workspaceId)
      .ilike("email", email)
      .eq("status", "pending");
    const { data: invitation, error } = await ctx.admin
      .from("egg_creator_workspace_invitations")
      .insert({
        workspace_id: ctx.workspaceId,
        email,
        role,
        invited_by: ctx.user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .select("id,email,role,expires_at,created_at")
      .single();
    if (error)
      return NextResponse.json(
        { error: "邀請建立失敗，請稍後再試" },
        { status: 500 },
      );
    const { data: users } = await ctx.admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const knownUser = users?.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    let emailSent = false;
    if (!knownUser) {
      const origin = new URL(request.url).origin;
      const { error: inviteError } =
        await ctx.admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${origin}/auth/callback?next=auto`,
        });
      emailSent = !inviteError;
      if (inviteError)
        console.warn(
          "Mobile team invitation email failed",
          inviteError.message,
        );
    }
    return NextResponse.json({
      invitation,
      emailSent,
      existingAccount: Boolean(knownUser),
    });
  }
  if (action === "role") {
    if (ctx.role !== "owner")
      return NextResponse.json(
        { error: "只有擁有者可以更改角色" },
        { status: 403 },
      );
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role =
      body.role === "admin" ? "admin" : body.role === "member" ? "member" : "";
    if (!userId || !role || userId === ctx.user.id)
      return NextResponse.json(
        { error: "無法更改呢位成員角色" },
        { status: 409 },
      );
    const { error } = await ctx.admin
      .from("egg_creator_workspace_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("workspace_id", ctx.workspaceId)
      .eq("user_id", userId)
      .neq("role", "owner");
    return error
      ? NextResponse.json({ error: "更新角色失敗" }, { status: 500 })
      : NextResponse.json({ success: true });
  }
  if (action === "remove") {
    if (typeof body.invitationId === "string") {
      const { error } = await ctx.admin
        .from("egg_creator_workspace_invitations")
        .update({ status: "revoked" })
        .eq("id", body.invitationId)
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "pending");
      return error
        ? NextResponse.json({ error: "取消邀請失敗" }, { status: 500 })
        : NextResponse.json({ success: true });
    }
    const userId = typeof body.userId === "string" ? body.userId : "";
    const { data: target } = await ctx.admin
      .from("egg_creator_workspace_members")
      .select("role")
      .eq("workspace_id", ctx.workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!target)
      return NextResponse.json({ error: "找不到成員" }, { status: 404 });
    if (
      target.role === "owner" ||
      (target.role === "admin" && ctx.role !== "owner")
    )
      return NextResponse.json(
        { error: "你無權移除呢位成員" },
        { status: 403 },
      );
    const { error } = await ctx.admin
      .from("egg_creator_workspace_members")
      .delete()
      .eq("workspace_id", ctx.workspaceId)
      .eq("user_id", userId);
    return error
      ? NextResponse.json({ error: "移除成員失敗" }, { status: 500 })
      : NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
}
