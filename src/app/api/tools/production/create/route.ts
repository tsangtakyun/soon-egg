import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: item, error } = await (masterSupabase as any).from("work_items").insert({
    user_id: user.id,
    workspace_id: body.workspace_id,
    title: body.title,
    description: body.description ?? null,
    priority: body.priority ?? "中",
    due_date: body.due_date ?? null,
    tags: body.tags ?? [],
    status: "待拍攝",
  }).select("id, title, description, status, priority, due_date, tags, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, item });
}
