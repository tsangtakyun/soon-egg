import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const ACTIVE_CREATOR_COOKIE = "egg-active-creator-id";

export type CreatorWorkspace = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
};

export function createEggAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Egg Supabase service credentials are missing");
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function getCreatorWorkspaceContext() {
  const auth = await createServerClient();
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!user) return { user: null, workspaces: [] as CreatorWorkspace[], activeWorkspace: null };

  const admin = createEggAdmin();
  const { data, error } = await admin
    .from("egg_creator_profiles")
    .select("id,username,display_name,avatar_url,onboarding_completed")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const workspaces = (data ?? []) as CreatorWorkspace[];
  const requestedId = (await cookies()).get(ACTIVE_CREATOR_COOKIE)?.value;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === requestedId) ?? workspaces[0] ?? null;
  return { user, workspaces, activeWorkspace, admin };
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
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error) throw error;
  // Supabase parses literal select strings at type level; this helper intentionally
  // accepts dynamic field lists shared by many routes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...context, profile: data as Record<string, any> | null };
}

export function canCreateCreatorWorkspace(email?: string | null) {
  const allowed = (process.env.EGG_WORKSPACE_CREATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}
