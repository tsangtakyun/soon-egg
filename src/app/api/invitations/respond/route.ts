import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logDealActivity } from "@/lib/deals-activity";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

type InvitationResponseBody = {
  invitation_id?: string;
  status?: "accepted" | "declined";
};

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) {
    return NextResponse.json(
      { error: "系統設定未完成，請稍後再試。" },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "請重新登入後再試。" }, { status: 401 });

  const body = (await req
    .json()
    .catch(() => null)) as InvitationResponseBody | null;
  if (
    !body?.invitation_id ||
    !body.status ||
    !["accepted", "declined"].includes(body.status)
  ) {
    return NextResponse.json({ error: "邀請資料不完整。" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cwBaseUrl = process.env.CW_BASE_URL;
  const internalKey = process.env.SOON_INTERNAL_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !cwBaseUrl || !internalKey) {
    console.error(
      "Invitation response error: server integration env is missing",
    );
    return NextResponse.json(
      { error: "合作同步服務暫時未完成設定。" },
      { status: 503 },
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { profile } = await getActiveCreatorProfile(
    "id,username,display_name,avatar_url,instagram_handle,instagram_followers",
  );
  if (!profile) {
    return NextResponse.json(
      { error: "找不到你的創作者檔案。" },
      { status: 404 },
    );
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("egg_brand_invitations")
    .select("*")
    .eq("id", body.invitation_id)
    .eq("creator_id", profile.id)
    .single();
  if (invitationError || !invitation) {
    return NextResponse.json(
      { error: "找不到呢個品牌邀請，請重新載入。" },
      { status: 404 },
    );
  }

  if (invitation.status === body.status) {
    return NextResponse.json({
      success: true,
      status: body.status,
      unchanged: true,
    });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "呢個邀請已經回覆，請重新載入。" },
      { status: 409 },
    );
  }

  const cwResponse = await fetch(`${cwBaseUrl}/api/public/kol-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-soon-api-key": internalKey,
    },
    body: JSON.stringify({
      status: body.status,
      cw_workspace_id: invitation.cw_workspace_id,
      cw_campaign_id: invitation.cw_campaign_id,
      campaign_name: invitation.campaign_name,
      egg_creator_id: profile.id,
      creator_username: profile.username,
      creator_display_name: profile.display_name,
      creator_mediakit_url: profile.username
        ? `https://egg.sooncreator.network/${profile.username}/mediakit`
        : null,
    }),
  }).catch((error) => {
    console.error("Invitation response CW request failed:", error);
    return null;
  });

  if (!cwResponse) {
    return NextResponse.json(
      { error: "暫時未能連接品牌平台，本地狀態未有更改。請重試。" },
      { status: 502 },
    );
  }

  const cwData = await cwResponse.json().catch(() => null);
  if (!cwResponse.ok || cwData?.success === false) {
    console.error(
      "Invitation response CW sync rejected:",
      cwResponse.status,
      cwData?.error,
    );
    return NextResponse.json(
      { error: "品牌平台未能確認回覆，本地狀態未有更改。請重試。" },
      { status: 502 },
    );
  }

  const respondedAt = new Date().toISOString();
  const { data: updatedInvitation, error: updateError } = await supabase
    .from("egg_brand_invitations")
    .update({ status: body.status, responded_at: respondedAt })
    .eq("id", invitation.id)
    .eq("creator_id", profile.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Invitation response local update failed:", updateError);
    return NextResponse.json(
      { error: "品牌平台已收到回覆，但本地狀態更新失敗。請重新載入。" },
      { status: 500 },
    );
  }
  if (!updatedInvitation) {
    return NextResponse.json({
      success: true,
      status: body.status,
      unchanged: true,
    });
  }

  if (body.status === "accepted") {
    const { error: applicationError } = await supabase
      .from("egg_campaign_applications")
      .upsert(
        {
          creator_id: profile.id,
          cw_campaign_id: invitation.cw_campaign_id,
          cw_workspace_id: invitation.cw_workspace_id,
          campaign_name: invitation.campaign_name,
          brand_name: invitation.brand_name,
          cover_image_url: invitation.cover_image_url,
          theme: invitation.theme,
          call_to_action: invitation.call_to_action,
          starts_on: invitation.starts_on,
          status: "accepted",
        },
        { onConflict: "creator_id,cw_campaign_id" },
      );
    if (applicationError)
      console.error(
        "Invitation accepted application mirror failed:",
        applicationError.message,
      );

    await logDealActivity({
      type: "kol_accepted",
      title: `🤝 ${profile.display_name || profile.username} 接受咗品牌邀請`,
      body: `Campaign：${invitation.campaign_name ?? ""} · 品牌：${invitation.brand_name}`,
      meta: {
        creator_username: profile.username,
        creator_display_name: profile.display_name,
        creator_avatar_url: profile.avatar_url,
        creator_ig_handle: profile.instagram_handle,
        creator_ig_followers: profile.instagram_followers ?? 0,
        creator_mediakit_url: profile.username
          ? `https://egg.sooncreator.network/${profile.username}/mediakit`
          : null,
        campaign_name: invitation.campaign_name,
        brand_name: invitation.brand_name,
        cw_workspace_id: invitation.cw_workspace_id,
        cw_campaign_id: invitation.cw_campaign_id,
        budget_range: invitation.budget_range,
        collab_formats: invitation.collab_formats,
        brand_website: invitation.brand_website,
        starts_on: invitation.starts_on,
      },
    });
  }

  return NextResponse.json({
    success: true,
    status: body.status,
    responded_at: respondedAt,
  });
}
