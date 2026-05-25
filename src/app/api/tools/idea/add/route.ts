import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { getOrCreateKolWorkspace } = await import("@/lib/workspace");
  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, "");

  const { data: idea, error } = await (masterSupabase as any)
    .from("ideas")
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      title: body.title,
      platform: body.platform,
      summary: body.summary,
      notes: body.notes,
      type: "custom",
      viral_score: 0,
    })
    .select("id, title, topic, summary, viral_score, thumb, platform, notes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, idea });
}
