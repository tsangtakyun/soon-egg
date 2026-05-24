import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type InvitationBody = {
  egg_creator_id?: string;
  creator_username?: string;
  cw_campaign_id?: string;
  cw_workspace_id?: string;
  campaign_name?: string;
  brand_name?: string;
  cover_image_url?: string | null;
  theme?: string | null;
  call_to_action?: string | null;
  starts_on?: string | null;
  message?: string | null;
};

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as InvitationBody;
  if (!body.egg_creator_id || !body.cw_campaign_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("egg_campaign_applications").upsert(
    {
      creator_id: body.egg_creator_id,
      cw_campaign_id: body.cw_campaign_id,
      cw_workspace_id: body.cw_workspace_id,
      campaign_name: body.campaign_name,
      brand_name: body.brand_name,
      cover_image_url: body.cover_image_url,
      theme: body.theme,
      call_to_action: body.call_to_action,
      starts_on: body.starts_on,
      pitch_message: body.message,
      status: "invited",
    },
    { onConflict: "creator_id,cw_campaign_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
