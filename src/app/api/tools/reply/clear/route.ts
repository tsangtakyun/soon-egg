import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createEggAdmin, getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function POST(request: Request) {
  const serverSupabase = await createServerClient();
  const { data: { user } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { projectId?: string };
  if (!body.projectId) return NextResponse.json({ error: "Project not found" }, { status: 400 });
  const admin = createEggAdmin();
  const { data: project } = await admin.from("egg_reply_projects").select("id").eq("id", body.projectId).eq("creator_id", profile.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const { error } = await admin.from("egg_reply_messages").delete().eq("creator_id", profile.id).eq("project_id", project.id);
  if (error) return NextResponse.json({ error: "清空失敗，請稍後再試。" }, { status: 500 });
  return NextResponse.json({ success: true });
}
