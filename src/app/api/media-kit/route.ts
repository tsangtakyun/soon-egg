import { NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export async function GET() {
  try {
    const { user, activeWorkspace, admin } =
      await getCreatorWorkspaceContext();
    if (!user || !activeWorkspace || !admin) {
      return NextResponse.json({ error: "登入已失效，請重新登入" }, { status: 401 });
    }

    const [profileResult, ratesResult] = await Promise.all([
      admin
        .from("egg_creator_profiles")
        .select("*")
        .eq("id", activeWorkspace.id)
        .maybeSingle(),
      admin
        .from("egg_rate_cards")
        .select("*")
        .eq("creator_id", activeWorkspace.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    const error = profileResult.error || ratesResult.error;
    if (error || !profileResult.data) {
      console.error("[media-kit] load failed", {
        workspaceId: activeWorkspace.id,
        message: error?.message ?? "Profile not found",
      });
      return NextResponse.json({ error: "未能讀取 Media Kit 資料" }, { status: 500 });
    }

    return NextResponse.json({
      profile: profileResult.data,
      rateCards: ratesResult.data ?? [],
      role: activeWorkspace.role,
    });
  } catch (error) {
    console.error("[media-kit] unexpected load failure", error);
    return NextResponse.json({ error: "未能讀取 Media Kit 資料" }, { status: 500 });
  }
}
