import "server-only";

import { createClient as createAdminClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const ACTIVE_CREATOR_COOKIE = "egg-active-creator-id";

export type CreatorWorkspace = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  role: WorkspaceRole;
};

export type WorkspaceRole = "owner" | "admin" | "member";

export function createEggAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Egg Supabase service credentials are missing");
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function getCreatorWorkspaceContext() {
  const auth = await createServerClient();
  const {
    data: { user },
  } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!user)
    return {
      user: null,
      workspaces: [] as CreatorWorkspace[],
      activeWorkspace: null,
    };

  const admin = createEggAdmin();
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const membershipQuery = await admin
    .from("egg_creator_workspace_members")
    .select(
      "role,workspace:egg_creator_profiles!inner(id,username,display_name,avatar_url,onboarding_completed,created_at)",
    )
    .eq("user_id", user.id);
  if (membershipQuery.error) throw membershipQuery.error;
  let memberships = membershipQuery.data;
  if (!memberships?.length) {
    await ensureCreatorWorkspace(admin, user);
    const retry = await admin
      .from("egg_creator_workspace_members")
      .select(
        "role,workspace:egg_creator_profiles!inner(id,username,display_name,avatar_url,onboarding_completed,created_at)",
      )
      .eq("user_id", user.id);
    if (retry.error) throw retry.error;
    memberships = retry.data;
  }
  const workspaces = (memberships ?? [])
    .map((membership) => {
      const workspace = Array.isArray(membership.workspace)
        ? membership.workspace[0]
        : membership.workspace;
      return {
        ...workspace,
        role: membership.role as WorkspaceRole,
      } as CreatorWorkspace;
    })
    .filter((workspace) => workspace.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const savedId =
    typeof user.user_metadata?.egg_active_workspace_id === "string"
      ? user.user_metadata.egg_active_workspace_id
      : null;
  const requestedId =
    savedId ?? (await cookies()).get(ACTIVE_CREATOR_COOKIE)?.value;
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === requestedId) ??
    workspaces[0] ??
    null;
  return {
    user,
    workspaces,
    activeWorkspace,
    activeRole: activeWorkspace?.role ?? null,
    admin,
  };
}

async function ensureCreatorWorkspace(
  admin: ReturnType<typeof createEggAdmin>,
  user: User,
) {
  const { data: existingProfile, error: existingError } = await admin
    .from("egg_creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  let workspaceId = existingProfile?.id ?? null;
  if (!workspaceId) {
    const preferredName =
      (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      user.email?.split("@")[0] ||
      "creator";
    const base = preferredName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "creator";
    let username = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: collision } = await admin.from("egg_creator_profiles").select("id").eq("username", username).maybeSingle();
      if (!collision) break;
      username = `${base}_${Math.random().toString(36).slice(2, 7)}`;
    }
    const { data: created, error: createError } = await admin
      .from("egg_creator_profiles")
      .insert({
        user_id: user.id,
        username,
        display_name: preferredName,
        is_public: false,
        onboarding_completed: false,
      })
      .select("id")
      .single();
    if (createError || !created) throw createError ?? new Error("Creator workspace creation failed");
    workspaceId = created.id;
  }

  const { error: membershipError } = await admin.from("egg_creator_workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: user.id,
    email: user.email?.trim().toLowerCase() || `${user.id}@workspace.local`,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });
  if (membershipError) throw membershipError;
}

export async function getActiveCreatorProfile(select: string) {
  const context = await getCreatorWorkspaceContext();
  if (!context.user || !context.activeWorkspace || !context.admin) {
    return { ...context, profile: null };
  }
  const { data, error } = await context.admin
    .from("egg_creator_profiles")
    .select(select)
    .eq("id", context.activeWorkspace.id)
    .maybeSingle();
  if (error) throw error;
  // Supabase parses literal select strings at type level; this helper intentionally
  // accepts dynamic field lists shared by many routes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...context, profile: data as Record<string, any> | null };
}

export async function acceptPendingWorkspaceInvitations(
  admin: ReturnType<typeof createEggAdmin>,
  userId: string,
  email?: string,
) {
  if (!email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const { data: invitations } = await admin
    .from("egg_creator_workspace_invitations")
    .select("id,workspace_id,role")
    .ilike("email", normalizedEmail)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  if (!invitations?.length) return;
  await admin.from("egg_creator_workspace_members").upsert(
    invitations.map((invite) => ({
      workspace_id: invite.workspace_id,
      user_id: userId,
      email: normalizedEmail,
      role: invite.role,
    })),
    { onConflict: "workspace_id,user_id" },
  );
  await admin
    .from("egg_creator_workspace_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .in(
      "id",
      invitations.map((invite) => invite.id),
    );
}

export function canManageWorkspaceMembers(role?: WorkspaceRole | null) {
  return role === "owner" || role === "admin";
}
export function canManageWorkspacePrompt(role?: WorkspaceRole | null) {
  return role === "owner";
}
export function canEditWorkspace(role?: WorkspaceRole | null) {
  return role === "owner" || role === "admin";
}

export function canCreateCreatorWorkspace(email?: string | null) {
  const allowed = (process.env.EGG_WORKSPACE_CREATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}
