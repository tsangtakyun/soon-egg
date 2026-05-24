import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logDealActivity } from "@/lib/deals-activity";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  brand_overview?: string | null;
  brand_website?: string | null;
  collab_formats?: string[] | null;
  duration_weeks?: number | null;
  budget_range?: string | null;
  message?: string | null;
};

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-soon-api-key");
  if (apiKey !== process.env.SOON_INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as InvitationBody;
  if (!body.creator_username || !body.cw_campaign_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Invitation receive error: Supabase service role env is missing");
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile, error: profileError } = await supabase
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", body.creator_username)
    .single();

  if (profileError || !profile) {
    console.error("Creator not found:", body.creator_username, profileError);
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const { error } = await supabase.from("egg_brand_invitations").upsert(
    {
      creator_id: profile.id,
      cw_campaign_id: body.cw_campaign_id,
      cw_workspace_id: body.cw_workspace_id,
      campaign_name: body.campaign_name,
      brand_name: body.brand_name,
      cover_image_url: body.cover_image_url,
      theme: body.theme,
      call_to_action: body.call_to_action,
      starts_on: body.starts_on,
      brand_overview: body.brand_overview ?? null,
      brand_website: body.brand_website ?? null,
      collab_formats: body.collab_formats ?? null,
      duration_weeks: body.duration_weeks ?? null,
      budget_range: body.budget_range ?? null,
      message: body.message,
      status: "pending",
      sent_at: new Date().toISOString(),
    },
    { onConflict: "creator_id,cw_campaign_id", ignoreDuplicates: false }
  );

  if (error) {
    console.error("Invitation receive DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logDealActivity({
    type: "brief_received",
    title: `📋 ${body.creator_username || body.egg_creator_id} 收到 Project Brief`,
    body: `${body.campaign_name || "未命名 Campaign"} · 品牌：${body.brand_name || "未填"}`,
    meta: {
      creator_username: body.creator_username,
      brief_title: body.campaign_name,
      brand_name: body.brand_name,
      cw_workspace_id: body.cw_workspace_id,
    },
  });

  return NextResponse.json({ success: true });
}
