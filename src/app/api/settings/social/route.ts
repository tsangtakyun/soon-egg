import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getSupabaseAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/^@/, "") : null;
}

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error } = await getSupabaseAdmin()
    .from("egg_creator_profiles")
    .update({
      instagram_handle: clean(body.instagram_handle),
      youtube_handle: clean(body.youtube_handle),
      tiktok_handle: clean(body.tiktok_handle),
      xiaohongshu_handle: clean(body.xiaohongshu_handle),
      facebook_handle: clean(body.facebook_handle),
      threads_handle: clean(body.threads_handle),
    })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
