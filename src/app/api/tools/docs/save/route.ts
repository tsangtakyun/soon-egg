import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const payload = { user_id: user.id, workspace_id: body.workspace_id, title: body.title, content: body.content ?? "", type: body.type ?? "其他", updated_at: new Date().toISOString() };
  const query = body.id ? (masterSupabase as any).from("docs").update(payload).eq("id", body.id).eq("user_id", user.id).select("id, user_id, workspace_id, title, content, type, created_at, updated_at").single() : (masterSupabase as any).from("docs").insert(payload).select("id, user_id, workspace_id, title, content, type, created_at, updated_at").single();
  const { data: doc, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, doc });
}
