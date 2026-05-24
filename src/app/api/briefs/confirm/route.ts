import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { logDealActivity } from "@/lib/deals-activity";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

type ConfirmBriefBody = {
  brief_id?: string;
  first_submission_date?: string;
  final_submission_date?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
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

  const { brief_id, first_submission_date, final_submission_date, notes } = (await req.json()) as ConfirmBriefBody;

  if (!brief_id || !first_submission_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id, username, display_name, instagram_handle, instagram_followers, avatar_url")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: brief, error: briefError } = await supabaseAdmin
    .from("egg_project_briefs")
    .select("*")
    .eq("id", brief_id)
    .eq("creator_id", profile.id)
    .single();

  if (briefError || !brief) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const confirmation = {
    deal_status: "confirmed",
    kol_confirmed_at: new Date().toISOString(),
    kol_first_submission_date: first_submission_date,
    kol_final_submission_date: final_submission_date ?? null,
    kol_confirmation_notes: notes ?? null,
  };

  const { error: updateError } = await supabaseAdmin.from("egg_project_briefs").update(confirmation).eq("id", brief_id);

  if (updateError) {
    console.error("Brief confirm update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const cwRes = await fetch(`${process.env.CW_BASE_URL}/api/public/deal-confirmed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-soon-api-key": process.env.SOON_INTERNAL_API_KEY!,
    },
    body: JSON.stringify({
      cw_brief_id: brief.cw_brief_id,
      cw_workspace_id: brief.cw_workspace_id,
      creator_username: profile.username,
      creator_display_name: profile.display_name,
      creator_mediakit_url: `https://egg.sooncreator.network/${profile.username}/mediakit`,
      creator_ig_followers: profile.instagram_followers,
      brief_title: brief.title,
      brand_name: brief.brand_name,
      first_submission_date,
      final_submission_date: final_submission_date ?? null,
      notes: notes ?? null,
    }),
  });

  let cwData: unknown = null;
  try {
    cwData = await cwRes.json();
  } catch {
    cwData = null;
  }

  if (!cwRes.ok) {
    console.error("CW deal-confirmed failed:", cwRes.status, cwData);
    return NextResponse.json({ error: "CW notification failed", detail: cwData }, { status: 502 });
  }

  await logDealActivity({
    type: "deal_confirmed",
    title: `${profile.display_name || profile.username} 確認咗合作條款`,
    body: `${brief.title} · 品牌：${brief.brand_name} · 首次交稿：${first_submission_date}`,
    meta: {
      creator_username: profile.username,
      creator_display_name: profile.display_name,
      creator_avatar_url: profile.avatar_url,
      creator_ig_handle: profile.instagram_handle,
      creator_ig_followers: profile.instagram_followers,
      creator_mediakit_url: `https://egg.sooncreator.network/${profile.username}/mediakit`,
      brief_title: brief.title,
      brand_name: brief.brand_name,
      first_submission_date,
      final_submission_date: final_submission_date ?? null,
      notes: notes ?? null,
      cw_workspace_id: brief.cw_workspace_id,
    },
  });

  return NextResponse.json({ success: true, confirmation });
}
