import "server-only";

import { createEggAdmin, type WorkspaceRole } from "@/lib/creator-workspace";

export type TopicIdea = {
  id: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  platform: string;
  category: string;
  tags: string[];
  content_format: string;
  workspace_id: string | null;
  created_at: string;
  saved: boolean;
  want_to_create: boolean;
};

export async function getTopicMembership(userId: string, requestedWorkspaceId: string | null) {
  const admin = createEggAdmin();
  const { data: memberships, error } = await admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", userId);
  if (error) throw error;
  const membership = memberships?.find((item) => item.workspace_id === requestedWorkspaceId) ?? memberships?.[0];
  return { admin, workspaceId: membership?.workspace_id ?? null, role: (membership?.role ?? null) as WorkspaceRole | null };
}

export async function listTopicIdeas(workspaceId: string) {
  const admin = createEggAdmin();
  const [{ data: ideas, error }, { data: actions, error: actionsError }] = await Promise.all([
    admin
      .from("egg_topic_ideas")
      .select("id,title,summary,source_name,source_url,image_url,platform,category,tags,content_format,workspace_id,created_at")
      .eq("status", "published")
      .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
      .order("created_at", { ascending: false }),
    admin
      .from("egg_topic_actions")
      .select("idea_id,saved,want_to_create,dismissed")
      .eq("workspace_id", workspaceId),
  ]);
  if (error) throw error;
  if (actionsError) throw actionsError;
  const actionMap = new Map((actions ?? []).map((action) => [action.idea_id, action]));
  return (ideas ?? []).flatMap((idea) => {
    const action = actionMap.get(idea.id);
    if (action?.dismissed) return [];
    return [{ ...idea, saved: action?.saved ?? false, want_to_create: action?.want_to_create ?? false } as TopicIdea];
  });
}
