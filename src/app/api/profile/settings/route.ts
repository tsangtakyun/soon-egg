import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

export async function PATCH(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { buy_me_a_coffee_url, cover_url, display_name, bio, content_categories, is_public } = body;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const serviceSupabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

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

  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const { error } = await serviceSupabase.from("egg_creator_profiles").update(updates).eq("id", profile.id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
