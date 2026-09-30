import "server-only";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export async function getEggRequestContext(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) {
    const context = await getCreatorWorkspaceContext();
    if (!context.user || !context.activeWorkspace || !context.admin) return null;
    return {
      user: context.user,
      workspaceId: context.activeWorkspace.id,
      role: context.activeRole,
      admin: context.admin,
    };
  }

  const admin = createEggAdmin();
  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return null;
  const requestedWorkspaceId = request.headers.get("x-egg-workspace-id");
  let query = admin.from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (requestedWorkspaceId) query = query.eq("workspace_id", requestedWorkspaceId);
  const { data } = await query.limit(1);
  const membership = data?.[0];
  if (!membership) return null;
  return { user, workspaceId: membership.workspace_id as string, role: membership.role, admin };
}

export async function getEggWebUser() {
  const supabase = await createServerClient();
  return supabase ? (await supabase.auth.getUser()).data.user : null;
}
