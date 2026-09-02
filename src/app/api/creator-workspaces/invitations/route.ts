import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEggAdmin, listIncomingWorkspaceInvitations, respondToWorkspaceInvitation } from "@/lib/creator-workspace";

async function authContext() {
  const auth = await createClient();
  const { data: { user } } = auth ? await auth.auth.getUser() : { data: { user: null } };
  return user ? { user, admin: createEggAdmin() } : null;
}

export async function GET() {
  const context = await authContext();
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  return NextResponse.json({ invitations: await listIncomingWorkspaceInvitations(context.admin, context.user.email) });
}

export async function POST(request: Request) {
  const context = await authContext();
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const invitationId = typeof body.invitationId === "string" ? body.invitationId : "";
  const action = body.action === "accept" ? "accept" : body.action === "decline" ? "decline" : null;
  if (!invitationId || !action) return NextResponse.json({ error: "操作無效" }, { status: 400 });
  try {
    const workspaceId = await respondToWorkspaceInvitation(context.admin, context.user, invitationId, action);
    return NextResponse.json({ success: true, action, workspaceId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "未能處理邀請" }, { status: 409 });
  }
}
