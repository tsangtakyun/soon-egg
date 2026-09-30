import {
  syncInstagramProfile,
  type InstagramSyncProfile,
} from "@/lib/instagram-sync";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function POST() {
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 },
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, admin } = await getActiveCreatorProfile(
    "id,user_id,instagram_access_token,instagram_user_id,audience_demographics",
  );

  if (!profile?.instagram_access_token) {
    return NextResponse.json(
      {
        error: "Instagram 尚未完成授權，請重新連接 Instagram。",
        needs_reconnect: true,
      },
      { status: 400 },
    );
  }

  try {
    // getActiveCreatorProfile has already verified that the signed-in user is
    // a member of this workspace. Use the server client for all sync writes so
    // shared workspaces are not rejected by legacy owner-only snapshot RLS.
    const result = await syncInstagramProfile(
      admin,
      profile as InstagramSyncProfile,
    );
    return NextResponse.json({
      success: true,
      followers: result.followers,
      username: result.username,
      engagement_rate: result.engagementRate,
      engagement_sample_size: result.engagementSampleSize,
      engagement_unavailable_reason: result.engagementUnavailableReason,
      official_insights: result.officialInsights,
      insights_unavailable_reason: result.insightsUnavailableReason,
      synced_at: result.syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Instagram sync failed",
      },
      { status: 400 },
    );
  }
}
