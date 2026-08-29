import { NextResponse } from "next/server";
import { createEggAdmin } from "@/lib/creator-workspace";
import { getTopicMembership, listTopicIdeas } from "@/lib/topic-library";

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function context(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const admin = createEggAdmin();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const membership = await getTopicMembership(user.id, request.headers.get("x-egg-workspace-id"));
  return { ...membership, user };
}

export async function GET(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    return NextResponse.json({ ideas: await listTopicIdeas(auth.workspaceId), role: auth.role });
  } catch (error) {
    console.error("Mobile topic library load failed", error);
    return NextResponse.json({ error: "未能載入題材靈感" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await context(request);
  if (!auth?.workspaceId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  if (!ideaId || !["save", "create", "dismiss"].includes(action)) return NextResponse.json({ error: "操作無效" }, { status: 400 });
  const { error } = await auth.admin.from("egg_topic_actions").upsert({
    workspace_id: auth.workspaceId,
    idea_id: ideaId,
    saved: action === "save" || action === "create",
    want_to_create: action === "create",
    dismissed: action === "dismiss",
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,idea_id" });
  if (error) return NextResponse.json({ error: "未能儲存操作" }, { status: 500 });
  return NextResponse.json({ success: true });
}
