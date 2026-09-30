import { createEggAdmin, getActiveCreatorProfile, type WorkspaceRole } from '@/lib/creator-workspace';
import { getTopicMembership } from '@/lib/topic-library';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function quotationContext(request: Request): Promise<{ admin: ReturnType<typeof createEggAdmin>; workspaceId: string; userId: string; role: WorkspaceRole | null } | null> {
  const authorization = request.headers.get('authorization') ?? '';
  if (authorization.startsWith('Bearer ')) {
    const admin = createEggAdmin();
    const { data: { user } } = await admin.auth.getUser(authorization.slice(7).trim());
    if (!user) return null;
    const membership = await getTopicMembership(user.id, request.headers.get('x-egg-workspace-id'));
    return membership.workspaceId ? { admin, workspaceId: membership.workspaceId, userId: user.id, role: membership.role } : null;
  }
  const server = await createServerClient();
  const { data: { user } } = server ? await server.auth.getUser() : { data: { user: null } };
  if (!user) return null;
  const { profile, activeRole } = await getActiveCreatorProfile('id');
  return profile ? { admin: createEggAdmin(), workspaceId: profile.id, userId: user.id, role: activeRole ?? null } : null;
}
