import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
  type WorkspaceRole,
} from "@/lib/creator-workspace";

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const admin = createEggAdmin();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );

  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const { data: memberships, error: membershipError } = await admin
    .from("egg_creator_workspace_members")
    .select(
      "role,workspace:egg_creator_profiles!inner(id,username,display_name,avatar_url,onboarding_completed)",
    )
    .eq("user_id", user.id);
  if (membershipError) {
    console.error("Mobile workspace bootstrap failed", membershipError.message);
    return NextResponse.json({ error: "未能讀取工作空間" }, { status: 500 });
  }

  const workspaces = (memberships ?? []).flatMap((membership) => {
    const workspace = Array.isArray(membership.workspace)
      ? membership.workspace[0]
      : membership.workspace;
    return workspace
      ? [{ ...workspace, role: membership.role as WorkspaceRole }]
      : [];
  });
  const requestedWorkspaceId = request.headers.get("x-egg-workspace-id");
  const savedWorkspaceId =
    typeof user.user_metadata?.egg_active_workspace_id === "string"
      ? user.user_metadata.egg_active_workspace_id
      : null;
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ??
    workspaces.find((workspace) => workspace.id === savedWorkspaceId) ??
    workspaces[0] ??
    null;

  if (
    requestedWorkspaceId &&
    activeWorkspace?.id === requestedWorkspaceId &&
    requestedWorkspaceId !== savedWorkspaceId
  ) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        egg_active_workspace_id: requestedWorkspaceId,
      },
    });
    if (error)
      console.error(
        "Mobile workspace preference update failed",
        user.id,
        error.message,
      );
  }

  if (!activeWorkspace) {
    return NextResponse.json({
      user: { id: user.id, email: user.email ?? null },
      workspaces: [],
      activeWorkspace: null,
      creator: null,
      metrics: null,
    });
  }

  const [
    { data: creator, error: creatorError },
    { count: pendingDeals },
    { data: snapshots },
  ] = await Promise.all([
    admin
      .from("egg_creator_profiles")
      .select(
        "id,username,display_name,bio,avatar_url,instagram_handle,instagram_followers,instagram_engagement_rate,onboarding_completed,ai_profile_summary",
      )
      .eq("id", activeWorkspace.id)
      .maybeSingle(),
    admin
      .from("egg_brand_invitations")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", activeWorkspace.id)
      .eq("status", "pending"),
    admin
      .from("egg_instagram_metric_snapshots")
      .select(
        "followers,engagement_rate,reach_7d,accounts_engaged_7d,captured_at",
      )
      .eq("creator_id", activeWorkspace.id)
      .order("captured_at", { ascending: false })
      .limit(2),
  ]);
  if (creatorError) {
    console.error("Mobile creator bootstrap failed", creatorError.message);
    return NextResponse.json({ error: "未能讀取創作者資料" }, { status: 500 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? null },
    workspaces,
    activeWorkspace,
    creator,
    metrics: {
      pendingDeals: pendingDeals ?? 0,
      latest: snapshots?.[0] ?? null,
      previous: snapshots?.[1] ?? null,
    },
  });
}
