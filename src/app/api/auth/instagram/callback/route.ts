import { logDealActivity } from "@/lib/deals-activity";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type FacebookPage = {
  id: string;
  access_token?: string;
  name?: string;
};

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

async function fetchGraph(path: string, accessToken: string) {
  const url = new URL(`https://graph.facebook.com/v21.0/${path}`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

async function findInstagramProfile(userAccessToken: string): Promise<{
  profile: InstagramProfile;
  page: FacebookPage;
  pageAccessToken: string;
} | null> {
  const pagesResponse = await fetchGraph("me/accounts?fields=id,name,access_token", userAccessToken);
  const pages = (pagesResponse?.data || []) as FacebookPage[];

  for (const page of pages) {
    if (!page.access_token) continue;

    try {
      const pageResponse = await fetchGraph(
        `${page.id}?fields=instagram_business_account{id,username,name,biography,followers_count,media_count,profile_picture_url,website}`,
        page.access_token,
      );
      const profile = pageResponse?.instagram_business_account as InstagramProfile | undefined;

      if (profile?.id && profile.username) {
        return { profile, page, pageAccessToken: page.access_token };
      }
    } catch (error) {
      console.error("Instagram page lookup error:", error);
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const { searchParams } = requestUrl;
  const onboardingUrl = `${requestUrl.origin}/onboarding`;
  const redirectUri = `${requestUrl.origin}/api/auth/instagram/callback`;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${onboardingUrl}?instagram_error=true`);
  }

  // This flow uses Facebook Login to access Instagram Business data via linked Pages.
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${onboardingUrl}?instagram_error=missing_credentials`);
  }

  try {
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Facebook token error:", tokenData);
      throw new Error("No Facebook access token received");
    }

    const userAccessToken = tokenData.access_token as string;
    const match = await findInstagramProfile(userAccessToken);

    if (!match) {
      return NextResponse.redirect(`${onboardingUrl}?instagram_error=no_connected_ig`);
    }

    const { profile, page, pageAccessToken } = match;
    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    let onboardedNewKol = false;

    if (supabase && user) {
      const { data: existingProfile } = await supabase
        .from("egg_creator_profiles")
        .select("audience_demographics")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentAudience = (
        typeof existingProfile?.audience_demographics === "object" &&
        existingProfile.audience_demographics !== null &&
        !Array.isArray(existingProfile.audience_demographics)
      ) ? existingProfile.audience_demographics : {};
      const payloadWithToken = {
        instagram_handle: profile.username,
        instagram_followers: profile.followers_count || 0,
        facebook_handle: page.name || null,
        avatar_url: profile.profile_picture_url || null,
        instagram_access_token: pageAccessToken,
        instagram_user_id: profile.id || null,
        audience_demographics: {
          ...currentAudience,
          connected_facebook_page: {
            id: page.id,
            name: page.name || "",
          },
        },
      };

      const { data: updatedRows, error: updateError } = await supabase
        .from("egg_creator_profiles")
        .update(payloadWithToken)
        .eq("user_id", user.id)
        .select("id");

      if (updateError && /column|schema|instagram_access_token|instagram_user_id/i.test(updateError.message)) {
        const { error: fallbackError } = await supabase
          .from("egg_creator_profiles")
          .update({
            instagram_handle: profile.username,
            instagram_followers: profile.followers_count || 0,
            facebook_handle: page.name || null,
            avatar_url: profile.profile_picture_url || null,
          })
          .eq("user_id", user.id);

        if (fallbackError) console.error("Instagram profile fallback save error:", fallbackError);
      } else if (updateError) {
        console.error("Instagram profile save error:", updateError);
      } else if (!updatedRows || updatedRows.length === 0) {
        const username = (profile.username || `user_${user.id.slice(0, 8)}`).replace("@", "").toLowerCase();
        const { error: upsertError } = await supabase
          .from("egg_creator_profiles")
          .upsert({
            user_id: user.id,
            username,
            display_name: profile.name || profile.username || username,
            bio: profile.biography || null,
            ...payloadWithToken,
          }, { onConflict: "user_id" });

        if (upsertError) console.error("Instagram profile upsert save error:", upsertError);
        else onboardedNewKol = true;
      }
    }

    if (onboardedNewKol) {
      await logDealActivity({
        type: "kol_onboarded",
        title: "🥚 新 KOL 加入 SOON-EGG",
        body: `@${profile.username} 完成連結 Instagram · ${profile.followers_count ?? 0} followers`,
        meta: {
          username: profile.username,
          instagram_handle: profile.username,
          instagram_followers: profile.followers_count ?? 0,
        },
      });
    }

    const params = new URLSearchParams({
      instagram_connected: "true",
      ig_username: profile.username || "",
      ig_followers: String(profile.followers_count || 0),
      ig_name: profile.name || "",
      ig_avatar: profile.profile_picture_url || "",
      fb_page_id: page.id || "",
      fb_page_name: page.name || "",
      threads_username: profile.username || "",
    });

    return NextResponse.redirect(`${onboardingUrl}?${params.toString()}`);
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(`${onboardingUrl}?instagram_error=true`);
  }
}
