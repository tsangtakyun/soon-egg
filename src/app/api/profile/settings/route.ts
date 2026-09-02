import { NextRequest, NextResponse } from "next/server";
import { canEditWorkspace, getCreatorWorkspaceContext } from "@/lib/creator-workspace";

export async function PATCH(req: NextRequest) {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!activeWorkspace || !admin) {
    console.error("Profile settings update missing active workspace");
    return NextResponse.json({ error: "找不到創作者工作空間，請重新登入後再試" }, { status: 404 });
  }

  const body = await req.json();
  const { buy_me_a_coffee_url, cover_url, display_name, bio, content_categories, is_public } = body;
  const updates: {
    buy_me_a_coffee_url?: string | null;
    cover_url?: string | null;
    display_name?: string;
    bio?: string | null;
    content_categories?: string[];
    is_public?: boolean;
  } = {};

  if ("buy_me_a_coffee_url" in body) {
    if (buy_me_a_coffee_url) {
      try {
        const parsed = new URL(String(buy_me_a_coffee_url));
        if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
      } catch {
        return NextResponse.json({ error: "Invalid Buy Me A Coffee URL" }, { status: 400 });
      }
    }
    updates.buy_me_a_coffee_url = typeof buy_me_a_coffee_url === "string" ? buy_me_a_coffee_url.trim() || null : null;
  }

  if (typeof cover_url === "string") {
    const allowedCovers = new Set(["/hero-bg.jpg", "/star-bg.jpg", "/secondbg.jpg", "/tech.jpg", "/classic.jpg", "/creative.jpg"]);
    if (!allowedCovers.has(cover_url)) return NextResponse.json({ error: "Invalid cover" }, { status: 400 });
    updates.cover_url = cover_url;
  }

  if (typeof display_name === "string") {
    const value = display_name.trim();
    if (!value || value.length > 50) return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
    updates.display_name = value;
  }

  if ("bio" in body) {
    const value = typeof bio === "string" ? bio.trim() : "";
    if (value.length > 150) return NextResponse.json({ error: "Bio is too long" }, { status: 400 });
    updates.bio = value || null;
  }

  if (Array.isArray(content_categories)) {
    updates.content_categories = content_categories
      .filter((category): category is string => typeof category === "string")
      .map((category) => category.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  if (typeof is_public === "boolean") updates.is_public = is_public;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No valid changes" }, { status: 400 });

  if (!canEditWorkspace(activeWorkspace.role)) return NextResponse.json({ error: "你無權修改工作空間資料" }, { status: 403 });
  const { error } = await admin.from("egg_creator_profiles").update(updates).eq("id", activeWorkspace.id);

  if (error) {
    console.error("Profile settings update failed", { userId: user.id, workspaceId: activeWorkspace.id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
