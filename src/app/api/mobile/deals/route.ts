import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
} from "@/lib/creator-workspace";

type Context = Awaited<ReturnType<typeof getContext>>;

async function getContext(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return null;
  const admin = createEggAdmin();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const requestedId = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (requestedId) query = query.eq("workspace_id", requestedId);
  const { data: membership } = await query.limit(1).maybeSingle();
  if (!membership?.workspace_id) return null;
  const { data: profile } = await admin
    .from("egg_creator_profiles")
    .select(
      "id,username,display_name,avatar_url,instagram_handle,instagram_followers",
    )
    .eq("id", membership.workspace_id)
    .maybeSingle();
  return profile ? { admin, profile, role: membership.role as string } : null;
}

async function loadCampaigns() {
  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("合作平台尚未完成設定");
  const response = await fetch(`${baseUrl}/api/public/campaigns`, {
    headers: { "x-soon-api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    throw new Error("合作平台回應格式不正確");
  const payload = (await response.json().catch(() => null)) as {
    campaigns?: Array<Record<string, unknown>>;
    error?: string;
  } | null;
  if (!response.ok || !payload)
    throw new Error(payload?.error || "未能載入合作機會");
  return payload.campaigns ?? [];
}

export async function GET(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  try {
    const [campaigns, applications, invitations] = await Promise.all([
      loadCampaigns(),
      context.admin
        .from("egg_campaign_applications")
        .select("*")
        .eq("creator_id", context.profile.id)
        .order("applied_at", { ascending: false }),
      context.admin
        .from("egg_brand_invitations")
        .select("*")
        .eq("creator_id", context.profile.id)
        .order("sent_at", { ascending: false }),
    ]);
    if (applications.error || invitations.error) {
      console.error(
        "[mobile deals] local load failed",
        applications.error?.message,
        invitations.error?.message,
      );
      return NextResponse.json({ error: "未能讀取合作記錄" }, { status: 500 });
    }
    return NextResponse.json({
      campaigns,
      applications: applications.data ?? [],
      invitations: invitations.data ?? [],
    });
  } catch (cause) {
    console.error("[mobile deals] feed failed", cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "未能載入合作機會" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body)
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  if (body.action === "apply") return applyToCampaign(context, body);
  if (body.action === "respond") return respondToInvitation(context, body);
  return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
}

async function applyToCampaign(
  context: NonNullable<Context>,
  body: Record<string, unknown>,
) {
  const campaignId = String(body.campaignId ?? "");
  const campaigns = await loadCampaigns().catch(() => null);
  const campaign = campaigns?.find((item) => item.id === campaignId);
  if (!campaign)
    return NextResponse.json(
      { error: "合作活動已關閉或不存在" },
      { status: 404 },
    );
  const existing = await context.admin
    .from("egg_campaign_applications")
    .select("id,status")
    .eq("creator_id", context.profile.id)
    .eq("cw_campaign_id", campaignId)
    .maybeSingle();
  if (existing.data)
    return NextResponse.json(
      { error: "你已經申請過呢個合作" },
      { status: 409 },
    );

  const baseUrl = process.env.CW_BASE_URL!;
  const apiKey = process.env.SOON_INTERNAL_API_KEY!;
  const response = await fetch(`${baseUrl}/api/public/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-soon-api-key": apiKey },
    body: JSON.stringify({
      campaign_id: campaign.id,
      workspace_id: campaign.workspace_id,
      creator: {
        id: context.profile.id,
        username: context.profile.username,
        display_name: context.profile.display_name,
        avatar_url: context.profile.avatar_url,
        instagram_handle: context.profile.instagram_handle,
        instagram_followers: context.profile.instagram_followers,
        mediakit_url: context.profile.username
          ? `https://egg.sooncreator.network/${context.profile.username}/mediakit`
          : null,
        pitch_message: clean(body.pitch, 1500) || null,
      },
    }),
  }).catch(() => null);
  const result = response ? await response.json().catch(() => null) : null;
  if (!response?.ok || !result?.success)
    return NextResponse.json(
      { error: "品牌平台未能接收申請，請稍後再試" },
      { status: 502 },
    );

  const { error } = await context.admin
    .from("egg_campaign_applications")
    .insert({
      creator_id: context.profile.id,
      cw_campaign_id: campaign.id,
      cw_workspace_id: campaign.workspace_id,
      campaign_name: campaign.name,
      brand_name: readBrandName(campaign),
      cover_image_url: campaign.cover_image_url ?? null,
      theme: campaign.theme ?? null,
      call_to_action: campaign.call_to_action ?? null,
      starts_on: campaign.starts_on ?? null,
      pitch_message: clean(body.pitch, 1500) || null,
      status: "applied",
    });
  if (error) {
    console.error(
      "[mobile deals] local application save failed",
      error.message,
    );
    return NextResponse.json(
      { error: "品牌已收到申請，但本地記錄更新失敗，請重新整理" },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

async function respondToInvitation(
  context: NonNullable<Context>,
  body: Record<string, unknown>,
) {
  const invitationId = String(body.invitationId ?? "");
  const status =
    body.status === "accepted"
      ? "accepted"
      : body.status === "declined"
        ? "declined"
        : "";
  if (!invitationId || !status)
    return NextResponse.json({ error: "邀請回覆資料不完整" }, { status: 400 });
  const { data: invitation } = await context.admin
    .from("egg_brand_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("creator_id", context.profile.id)
    .maybeSingle();
  if (!invitation)
    return NextResponse.json({ error: "找不到品牌邀請" }, { status: 404 });
  if (invitation.status !== "pending")
    return NextResponse.json({ error: "呢個邀請已經回覆" }, { status: 409 });
  const baseUrl = process.env.CW_BASE_URL;
  const apiKey = process.env.SOON_INTERNAL_API_KEY;
  if (!baseUrl || !apiKey)
    return NextResponse.json(
      { error: "合作同步服務未完成設定" },
      { status: 503 },
    );
  const response = await fetch(`${baseUrl}/api/public/kol-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-soon-api-key": apiKey },
    body: JSON.stringify({
      status,
      cw_workspace_id: invitation.cw_workspace_id,
      cw_campaign_id: invitation.cw_campaign_id,
      campaign_name: invitation.campaign_name,
      egg_creator_id: context.profile.id,
      creator_username: context.profile.username,
      creator_display_name: context.profile.display_name,
      creator_mediakit_url: context.profile.username
        ? `https://egg.sooncreator.network/${context.profile.username}/mediakit`
        : null,
    }),
  }).catch(() => null);
  const result = response ? await response.json().catch(() => null) : null;
  if (!response?.ok || result?.success === false)
    return NextResponse.json(
      { error: "品牌平台未能確認回覆，請稍後再試" },
      { status: 502 },
    );
  const { data, error } = await context.admin
    .from("egg_brand_invitations")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .eq("creator_id", context.profile.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "邀請狀態更新失敗，請重新整理" },
      { status: 500 },
    );
  if (status === "accepted") {
    const { error: applicationError } = await context.admin
      .from("egg_campaign_applications")
      .upsert(
        {
          creator_id: context.profile.id,
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
        "[mobile deals] accepted application mirror failed",
        applicationError.message,
      );
  }
  return NextResponse.json({ success: true });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readBrandName(campaign: Record<string, unknown>) {
  const workspace = campaign.workspaces;
  return workspace && typeof workspace === "object" && "name" in workspace
    ? String((workspace as { name?: unknown }).name ?? "SOON Creator Network")
    : "SOON Creator Network";
}
