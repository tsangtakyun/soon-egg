import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logDealActivity } from "@/lib/deals-activity";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

type ApplyBody = {
  campaign_id: string;
  workspace_id: string;
  campaign_name?: string;
  brand_name?: string;
  cover_image_url?: string | null;
  theme?: string | null;
  call_to_action?: string | null;
  starts_on?: string | null;
  budget_range?: string | null;
  collab_formats?: string[] | null;
  brand_website?: string | null;
  pitch_message?: string | null;
};

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Campaign application error: Supabase service env is missing");
    return NextResponse.json({ error: "合作申請服務暫時未完成設定。" }, { status: 503 });
  }

  // Authentication is verified with the user's session above. Persistence uses
  // the server-only service role so browser-facing RLS policies stay locked down.
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { profile } = await getActiveCreatorProfile("*");

  if (!profile) {
    return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as ApplyBody | null;
  if (!body?.campaign_id || !body.workspace_id) {
    return NextResponse.json({ error: "合作活動資料不完整。" }, { status: 400 });
  }

  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error("Campaign application error: CW integration env is missing");
    return NextResponse.json({ error: "合作申請服務暫時未完成設定。" }, { status: 503 });
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
        mediakit_url: profile.username ? `https://egg.sooncreator.network/${profile.username}/mediakit` : null,
        pitch_message: body.pitch_message,
      },
    }),
  }).catch((error) => {
    console.error("Campaign application CW request failed:", error);
    return null;
  });

  if (!cwRes) {
    return NextResponse.json({ error: "暫時未能連接品牌平台，申請尚未提交。請重試。" }, { status: 502 });
  }

  const cwData = await cwRes.json().catch(() => null);
  if (!cwRes.ok || !cwData?.success) {
    console.error("Campaign application CW sync rejected:", cwRes.status, cwData?.error);
    return NextResponse.json({ error: "品牌平台未能接收申請，請稍後重試。" }, { status: 502 });
  }

  const { error: localError } = await supabase.from("egg_campaign_applications").upsert(
    {
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
    },
    { onConflict: "creator_id,cw_campaign_id" }
  );

  if (localError) {
    console.error("Campaign application local save failed:", localError);
    return NextResponse.json({ error: "品牌平台已收到申請，但本地記錄未能更新。請重新載入。" }, { status: 500 });
  }

  await logDealActivity({
    type: "kol_applied",
    title: `🙋 ${profile.display_name || profile.username} 申請咗品牌合作`,
    body: `Campaign：${body.campaign_name ?? body.campaign_id} · 品牌：${body.brand_name ?? "未命名"}`,
    meta: {
      creator_username: profile.username,
      creator_display_name: profile.display_name,
      creator_avatar_url: profile.avatar_url,
      creator_ig_handle: profile.instagram_handle,
      creator_ig_followers: profile.instagram_followers ?? 0,
      creator_mediakit_url: profile.username ? `https://egg.sooncreator.network/${profile.username}/mediakit` : null,
      campaign_name: body.campaign_name,
      brand_name: body.brand_name,
      cw_workspace_id: body.workspace_id,
      cw_campaign_id: body.campaign_id,
      budget_range: body.budget_range ?? null,
      collab_formats: body.collab_formats ?? null,
      brand_website: body.brand_website ?? null,
      starts_on: body.starts_on ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
