import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidProfileUsername, normalizeProfileUsername } from "@/lib/profile-username";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

function getSupabaseAdmin() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { display_name, bio, content_categories, avatar_url, username } = body;
  const normalizedUsername = typeof username === "string" ? normalizeProfileUsername(username) : "";
  if (!isValidProfileUsername(normalizedUsername)) {
    return NextResponse.json({ error: "用戶名須為 3–30 個英文字母、數字、句點、底線或連字號，首尾必須為字母或數字。" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { profile: existingProfile } = await getActiveCreatorProfile("id,username");
  if (!existingProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: duplicate } = await admin
    .from("egg_creator_profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .neq("id", existingProfile.id)
    .maybeSingle();
  if (duplicate) return NextResponse.json({ error: "呢個用戶名已經有人使用。" }, { status: 409 });

  const { error } = await admin
    .from("egg_creator_profiles")
    .update({
      username: normalizedUsername,
      display_name: typeof display_name === "string" ? display_name.trim() : "",
      bio: typeof bio === "string" && bio.trim() ? bio.trim() : null,
      content_categories: Array.isArray(content_categories)
        ? content_categories.filter((category): category is string => typeof category === "string")
        : [],
      avatar_url: typeof avatar_url === "string" && avatar_url ? avatar_url : null,
    })
    .eq("id", existingProfile.id)
    .eq("user_id", user.id);

  if (error?.code === "23505") return NextResponse.json({ error: "呢個用戶名已經有人使用。" }, { status: 409 });
  if (error) return NextResponse.json({ error: "未能儲存個人資料。" }, { status: 500 });

  if (existingProfile.username !== normalizedUsername) {
    const mediaKitUrl = `https://egg.sooncreator.network/${normalizedUsername}/mediakit`;
    const shopUrl = `https://egg.sooncreator.network/${normalizedUsername}/shop`;
    await Promise.all([
      admin.from("egg_profile_blocks").update({ url: mediaKitUrl }).eq("creator_id", existingProfile.id).ilike("title", "%media kit%"),
      admin.from("egg_profile_blocks").update({ url: shopUrl }).eq("creator_id", existingProfile.id).or("title.ilike.%貨品%,title.ilike.%shop%"),
    ]);
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const candidate = normalizeProfileUsername(new URL(req.url).searchParams.get("username") || "");
  if (!isValidProfileUsername(candidate)) return NextResponse.json({ available: false, reason: "invalid" });

  const admin = getSupabaseAdmin();
  const { profile: current } = await getActiveCreatorProfile("id,username");
  const { data: existing } = await admin.from("egg_creator_profiles").select("id").eq("username", candidate).maybeSingle();
  return NextResponse.json({ available: !existing || existing.id === current?.id });
}
