import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: schedule, error } = await (masterSupabase as any).from("schedules").insert({
    user_id: user.id,
    title: body.title,
    description: body.description ?? null,
    start_time: body.start_time,
    end_time: body.end_time ?? null,
    type: body.type ?? "其他",
    location: body.location ?? null,
  }).select("id, user_id, title, description, start_time, end_time, type, location, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, schedule });
}
