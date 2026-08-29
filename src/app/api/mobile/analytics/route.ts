import { NextResponse } from "next/server";
import {
  syncInstagramProfile,
  type InstagramSyncProfile,
} from "@/lib/instagram-sync";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
} from "@/lib/creator-workspace";

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
  const requestedWorkspaceId = request.headers.get("x-egg-workspace-id");
  let membershipQuery = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);
  if (requestedWorkspaceId)
    membershipQuery = membershipQuery.eq("workspace_id", requestedWorkspaceId);
  const { data: membership } = await membershipQuery.limit(1).maybeSingle();
  return membership?.workspace_id
    ? { admin, workspaceId: membership.workspace_id }
    : null;
}

const profileFields =
  "id,user_id,instagram_handle,instagram_followers,instagram_engagement_rate,instagram_access_token,instagram_user_id,audience_demographics";
const mediaFields =
  "id,media_type,caption,permalink,media_url,thumbnail_url,views,reach,plays,total_interactions,like_count,comments_count,published_at";

export async function GET(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  const [
    { data: profile, error: profileError },
    { data: snapshots, error: snapshotsError },
    { data: media, error: mediaError },
  ] = await Promise.all([
    context.admin
      .from("egg_creator_profiles")
      .select(profileFields)
      .eq("id", context.workspaceId)
      .maybeSingle(),
    context.admin
      .from("egg_instagram_metric_snapshots")
      .select(
        "snapshot_date,followers,engagement_rate,reach_7d,accounts_engaged_7d,total_interactions_7d,captured_at",
      )
      .eq("creator_id", context.workspaceId)
      .order("snapshot_date", { ascending: true })
      .limit(30),
    context.admin
      .from("egg_instagram_media")
      .select(mediaFields)
      .eq("creator_id", context.workspaceId)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  if (profileError || snapshotsError || mediaError || !profile) {
    console.error(
      "[mobile analytics] load failed",
      profileError?.message,
      snapshotsError?.message,
      mediaError?.message,
    );
    return NextResponse.json(
      { error: "未能讀取社交平台數據" },
      { status: 500 },
    );
  }
  const sync = readInstagramSync(profile.audience_demographics);
  const topMedia = (media ?? [])
    .toSorted((a, b) => performanceValue(b) - performanceValue(a))
    .slice(0, 5);
  return NextResponse.json({
    instagram: {
      connected: Boolean(
        profile.instagram_access_token && profile.instagram_user_id,
      ),
      handle: profile.instagram_handle,
      followers: profile.instagram_followers,
      engagementRate: profile.instagram_engagement_rate,
      sync,
      snapshots: snapshots ?? [],
      topMedia,
    },
    threads: { connected: false, message: "Threads 數據分析暫未開放" },
  });
}

export async function POST(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  const { data: profile, error } = await context.admin
    .from("egg_creator_profiles")
    .select(profileFields)
    .eq("id", context.workspaceId)
    .maybeSingle();
  if (error || !profile)
    return NextResponse.json({ error: "找不到目前工作空間" }, { status: 404 });
  if (!profile.instagram_access_token || !profile.instagram_user_id)
    return NextResponse.json(
      { error: "Instagram 尚未完成授權", needsReconnect: true },
      { status: 400 },
    );
  try {
    const result = await syncInstagramProfile(
      context.admin,
      profile as InstagramSyncProfile,
    );
    return NextResponse.json({
      success: true,
      followers: result.followers,
      engagementRate: result.engagementRate,
      engagementSampleSize: result.engagementSampleSize,
      engagementUnavailableReason: result.engagementUnavailableReason,
      officialInsights: result.officialInsights,
      insightsUnavailableReason: result.insightsUnavailableReason,
      syncedAt: result.syncedAt,
    });
  } catch (cause) {
    console.error("[mobile analytics] sync failed", cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Instagram 更新失敗" },
      { status: 400 },
    );
  }
}

function readInstagramSync(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sync = (value as Record<string, unknown>).instagram_sync;
  return sync && typeof sync === "object" && !Array.isArray(sync) ? sync : {};
}

function performanceValue(media: Record<string, unknown>) {
  return Number(
    media.views ??
      media.plays ??
      media.reach ??
      media.total_interactions ??
      Number(media.like_count ?? 0) + Number(media.comments_count ?? 0),
  );
}
