import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type ApplyBody = {
  campaign_id: string;
  workspace_id: string;
  campaign_name?: string;
  brand_name?: string;
  cover_image_url?: string | null;
  theme?: string | null;
  call_to_action?: string | null;
  starts_on?: string | null;
  pitch_message?: string | null;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("egg_creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
  }

  const body = (await req.json()) as ApplyBody;

  const { error: localError } = await supabase.from("egg_campaign_applications").upsert({
    creator_id: profile.id,
    cw_campaign_id: body.campaign_id,
    cw_workspace_id: body.workspace_id,
    campaign_name: body.campaign_name,
    brand_name: body.brand_name,
    cover_image_url: body.cover_image_url,
    theme: body.theme,
    call_to_action: body.call_to_action,
    starts_on: body.starts_on,
    pitch_message: body.pitch_message,
    status: "applied",
  }, { onConflict: "creator_id,cw_campaign_id" });

  if (localError) {
    return NextResponse.json({ error: localError.message }, { status: 500 });
  }

  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "Campaign application sync is not configured" }, { status: 500 });
  }

  const cwRes = await fetch(`${baseUrl}/api/public/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-soon-api-key": apiKey,
    },
    body: JSON.stringify({
      campaign_id: body.campaign_id,
      workspace_id: body.workspace_id,
      creator: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        instagram_handle: profile.instagram_handle,
        instagram_followers: profile.instagram_followers,
        pitch_message: body.pitch_message,
      },
    }),
  });

  const cwData = await cwRes.json();
  if (!cwRes.ok || !cwData.success) {
    return NextResponse.json({ error: "CW sync failed", detail: cwData.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
