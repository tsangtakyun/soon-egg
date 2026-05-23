import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_REDIRECT_URI = "https://egg.sooncreator.network/api/auth/instagram/callback";
const ONBOARDING_URL = "https://egg.sooncreator.network/onboarding";

type InstagramProfile = {
  id?: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${ONBOARDING_URL}?instagram_error=true`);
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${ONBOARDING_URL}?instagram_error=missing_credentials`);
  }

  try {
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Instagram short token error:", tokenData);
      throw new Error("No Instagram access token received");
    }

    const shortToken = tokenData.access_token as string;
    const igUserId = String(tokenData.user_id || "");

    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(shortToken)}`,
    );
    const longTokenData = await longTokenRes.json();
    const longToken = (longTokenData.access_token as string | undefined) || shortToken;

    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/${encodeURIComponent(igUserId)}?fields=id,username,name,biography,followers_count,media_count,profile_picture_url,website&access_token=${encodeURIComponent(longToken)}`,
    );
    const profile = await profileRes.json() as InstagramProfile;

    if (!profileRes.ok || !profile.username) {
      console.error("Instagram profile error:", profile);
      throw new Error("Instagram profile fetch failed");
    }

    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (supabase && user) {
      const payloadWithToken = {
        instagram_handle: profile.username,
        instagram_followers: profile.followers_count || 0,
        avatar_url: profile.profile_picture_url || null,
        instagram_access_token: longToken,
        instagram_user_id: igUserId,
      };

      const { error: updateError } = await supabase
        .from("egg_creator_profiles")
        .update(payloadWithToken)
        .eq("user_id", user.id);

      if (updateError && /column|schema|instagram_access_token|instagram_user_id/i.test(updateError.message)) {
        const { error: fallbackError } = await supabase
          .from("egg_creator_profiles")
          .update({
            instagram_handle: profile.username,
            instagram_followers: profile.followers_count || 0,
            avatar_url: profile.profile_picture_url || null,
          })
          .eq("user_id", user.id);

        if (fallbackError) console.error("Instagram profile fallback save error:", fallbackError);
      } else if (updateError) {
        console.error("Instagram profile save error:", updateError);
      }
    }

    const params = new URLSearchParams({
      instagram_connected: "true",
      ig_username: profile.username || "",
      ig_followers: String(profile.followers_count || 0),
      ig_name: profile.name || "",
      ig_avatar: profile.profile_picture_url || "",
    });

    return NextResponse.redirect(`${ONBOARDING_URL}?${params.toString()}`);
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(`${ONBOARDING_URL}?instagram_error=true`);
  }
}
