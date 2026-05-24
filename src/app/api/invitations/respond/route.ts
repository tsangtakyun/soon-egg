import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logDealActivity } from "@/lib/deals-activity";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  const body = await req.json();
  const serverSupabase = await createServerClient();

  if (!serverSupabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role env is missing" }, { status: 500 });
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const cwBaseUrl = process.env.CW_BASE_URL;
  const internalKey = process.env.SOON_INTERNAL_API_KEY;

  if (!cwBaseUrl || !internalKey) {
    return NextResponse.json({ error: "CW integration is not configured" }, { status: 500 });
  }

  const res = await fetch(`${cwBaseUrl}/api/public/kol-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-soon-api-key": internalKey,
    },
    body: JSON.stringify({
      ...body,
      creator_username: profile?.username,
      creator_display_name: profile?.display_name,
      creator_mediakit_url: profile?.username
        ? `https://egg.sooncreator.network/${profile.username}/mediakit`
        : null,
    }),
  });

  const data = await res.json().catch(() => null);

  if (res.ok && body.status === "accepted" && profile?.id) {
    const { data: invitation } = await supabase
      .from("egg_brand_invitations")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("cw_campaign_id", body.cw_campaign_id)
      .maybeSingle();

    await logDealActivity({
      type: "kol_accepted",
      title: `🤝 ${profile.display_name || profile.username} 接受咗品牌邀請`,
      body: `Campaign：${body.campaign_name ?? invitation?.campaign_name ?? ""} · 品牌：${invitation?.brand_name ?? ""}`,
      meta: {
        creator_username: profile.username,
        creator_display_name: profile.display_name,
        creator_avatar_url: profile.avatar_url,
        creator_ig_handle: profile.instagram_handle,
        creator_ig_followers: profile.instagram_followers ?? 0,
        creator_mediakit_url: profile.username ? `https://egg.sooncreator.network/${profile.username}/mediakit` : null,
        campaign_name: body.campaign_name ?? invitation?.campaign_name ?? null,
        brand_name: invitation?.brand_name ?? null,
        cw_workspace_id: body.cw_workspace_id ?? invitation?.cw_workspace_id ?? null,
        cw_campaign_id: body.cw_campaign_id ?? invitation?.cw_campaign_id ?? null,
        budget_range: invitation?.budget_range ?? null,
        collab_formats: invitation?.collab_formats ?? null,
        brand_website: invitation?.brand_website ?? null,
        starts_on: invitation?.starts_on ?? null,
      },
    });
  }

  return NextResponse.json(data ?? { success: res.ok }, { status: res.ok ? 200 : 502 });
}
