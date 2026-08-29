import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  canEditWorkspace,
  createEggAdmin,
  type WorkspaceRole,
} from "@/lib/creator-workspace";
import {
  isValidProfileUsername,
  normalizeProfileUsername,
} from "@/lib/profile-username";

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
  const requestedId = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (requestedId) query = query.eq("workspace_id", requestedId);
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

const fields =
  "id,username,display_name,bio,avatar_url,content_categories,instagram_handle,instagram_followers,facebook_handle,threads_handle,youtube_handle,tiktok_handle,xiaohongshu_handle,stripe_account_id,stripe_onboarding_complete";

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  const candidate = new URL(request.url).searchParams.get("username");
  if (candidate !== null) {
    const username = normalizeProfileUsername(candidate);
    if (!isValidProfileUsername(username))
      return NextResponse.json({ available: false, reason: "invalid" });
    const { data } = await ctx.admin
      .from("egg_creator_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    return NextResponse.json({
      available: !data || data.id === ctx.workspaceId,
    });
  }
  const { data: profile, error } = await ctx.admin
    .from("egg_creator_profiles")
    .select(fields)
    .eq("id", ctx.workspaceId)
    .maybeSingle();
  if (error || !profile)
    return NextResponse.json({ error: "未能讀取設定" }, { status: 500 });
  return NextResponse.json({
    profile,
    email: ctx.user.email ?? null,
    role: ctx.role,
    canEdit: canEditWorkspace(ctx.role),
  });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (!canEditWorkspace(ctx.role))
    return NextResponse.json(
      { error: "你無權修改工作空間資料" },
      { status: 403 },
    );
  const body = await request.json().catch(() => ({}));
  const username = normalizeProfileUsername(
    typeof body.username === "string" ? body.username : "",
  );
  if (!isValidProfileUsername(username))
    return NextResponse.json({ error: "用戶名格式不正確" }, { status: 400 });
  const { data: duplicate } = await ctx.admin
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", username)
    .neq("id", ctx.workspaceId)
    .maybeSingle();
  if (duplicate)
    return NextResponse.json(
      { error: "呢個用戶名已經有人使用" },
      { status: 409 },
    );
  const cleanHandle = (value: unknown) =>
    typeof value === "string" && value.trim()
      ? value.trim().replace(/^@/, "")
      : null;
  const payload = {
    username,
    display_name:
      typeof body.display_name === "string"
        ? body.display_name.trim().slice(0, 100)
        : "",
    bio:
      typeof body.bio === "string" && body.bio.trim()
        ? body.bio.trim().slice(0, 150)
        : null,
    content_categories: Array.isArray(body.content_categories)
      ? body.content_categories
          .filter((item: unknown): item is string => typeof item === "string")
          .slice(0, 12)
      : [],
    facebook_handle: cleanHandle(body.facebook_handle),
    threads_handle: cleanHandle(body.threads_handle),
  };
  if (!payload.display_name)
    return NextResponse.json({ error: "請輸入創作者名稱" }, { status: 400 });
  const { error } = await ctx.admin
    .from("egg_creator_profiles")
    .update(payload)
    .eq("id", ctx.workspaceId);
  if (error?.code === "23505")
    return NextResponse.json(
      { error: "呢個用戶名已經有人使用" },
      { status: 409 },
    );
  if (error)
    return NextResponse.json({ error: "未能儲存設定" }, { status: 500 });
  return NextResponse.json({ success: true });
}
