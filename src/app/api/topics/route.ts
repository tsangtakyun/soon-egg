import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { listTopicIdeas } from "@/lib/topic-library";

export async function GET() {
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    return NextResponse.json({ ideas: await listTopicIdeas(activeWorkspace.id), role: activeWorkspace.role });
  } catch (error) {
    console.error("Topic library load failed", error);
    return NextResponse.json({ error: "未能載入題材靈感" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await createClient();
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } };
  const { activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!ideaId || !["save", "create", "dismiss"].includes(action)) return NextResponse.json({ error: "操作無效" }, { status: 400 });
  const patch = {
    workspace_id: activeWorkspace.id,
    idea_id: ideaId,
    saved: action === "save" || action === "create",
    want_to_create: action === "create",
    dismissed: action === "dismiss",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("egg_topic_actions").upsert(patch, { onConflict: "workspace_id,idea_id" });
  if (error) {
    console.error("Topic action failed", error.message);
    return NextResponse.json({ error: "未能儲存操作" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
