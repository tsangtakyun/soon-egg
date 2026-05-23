import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type InstagramProfile = {
  id?: string;
  username?: string;
  followers_count?: number;
  media_count?: number;
  error?: {
    message?: string;
  };
};

async function fetchInstagramProfile(instagramUserId: string | null, accessToken: string): Promise<InstagramProfile> {
  const fields = "id,username,followers_count,media_count";

  if (instagramUserId) {
    const facebookUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(instagramUserId)}`);
    facebookUrl.searchParams.set("fields", fields);
    facebookUrl.searchParams.set("access_token", accessToken);

    const facebookRes = await fetch(facebookUrl.toString(), { next: { revalidate: 0 } });
    const facebookData = await facebookRes.json();

    if (facebookRes.ok && !facebookData.error) {
      return facebookData as InstagramProfile;
    }
  }

  const basicUrl = new URL("https://graph.instagram.com/me");
  basicUrl.searchParams.set("fields", fields);
  basicUrl.searchParams.set("access_token", accessToken);

  const basicRes = await fetch(basicUrl.toString(), { next: { revalidate: 0 } });
  return (await basicRes.json()) as InstagramProfile;
}

export async function POST() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("instagram_access_token, instagram_user_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.instagram_access_token) {
    return NextResponse.json({ error: "No IG token" }, { status: 400 });
  }

  const data = await fetchInstagramProfile(profile.instagram_user_id ?? null, profile.instagram_access_token);

  if (data.error) {
    return NextResponse.json({ error: data.error.message || "Instagram sync failed" }, { status: 400 });
  }

  const { error } = await supabase
    .from("egg_creator_profiles")
    .update({
      instagram_handle: data.username,
      instagram_followers: data.followers_count ?? 0,
      instagram_user_id: data.id,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    followers: data.followers_count ?? 0,
    username: data.username,
  });
}
