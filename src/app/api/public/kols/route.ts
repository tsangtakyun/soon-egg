import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: kols, error } = await supabase
    .from("egg_creator_profiles")
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_url,
      instagram_handle,
      instagram_followers,
      youtube_handle,
      youtube_subscribers,
      tiktok_handle,
      tiktok_followers,
      xiaohongshu_handle,
      xiaohongshu_followers,
      facebook_handle,
      facebook_followers,
      threads_handle,
      threads_followers,
      content_categories,
      ai_profile_summary,
      mediakit_is_public,
      is_public
    `)
    .eq("is_public", true)
    .order("instagram_followers", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kols: kols ?? [] });
}
