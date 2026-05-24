import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role env is missing" }, { status: 500 });
  }

  const body = await req.json();
  const { creator_username, cw_brief_id, ...rest } = body;

  if (!creator_username || !cw_brief_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", creator_username)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { error } = await supabase.from("egg_project_briefs").upsert(
    {
      creator_id: profile.id,
      cw_brief_id,
      creator_username,
      ...rest,
      status: "received",
      received_at: new Date().toISOString(),
    },
    { onConflict: "cw_brief_id" }
  );

  if (error) {
    console.error("Brief receive error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
