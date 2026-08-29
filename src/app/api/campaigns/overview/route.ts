import { NextResponse } from "next/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function GET() {
  const { admin, profile } = await getActiveCreatorProfile(
    "id,username,display_name,avatar_url,instagram_handle,instagram_followers",
  );
  if (!profile)
    return NextResponse.json({ error: "請重新登入後再試" }, { status: 401 });
  const [invitations, applications] = await Promise.all([
    admin
      .from("egg_brand_invitations")
      .select("*")
      .eq("creator_id", profile.id)
      .order("sent_at", { ascending: false }),
    admin
      .from("egg_campaign_applications")
      .select("*")
      .eq("creator_id", profile.id)
      .order("applied_at", { ascending: false }),
  ]);
  if (invitations.error || applications.error) {
    console.error(
      "[campaign overview] load failed",
      invitations.error?.message,
      applications.error?.message,
    );
    return NextResponse.json({ error: "未能載入合作記錄" }, { status: 500 });
  }
  return NextResponse.json({
    profile,
    invitations: invitations.data ?? [],
    applications: applications.data ?? [],
  });
}
