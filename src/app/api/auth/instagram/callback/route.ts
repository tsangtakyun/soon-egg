import { logDealActivity } from "@/lib/deals-activity";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createEggAdmin, getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const OAUTH_STATE_COOKIE = "egg-instagram-oauth-state";
const OAUTH_WORKSPACE_COOKIE = "egg-instagram-oauth-workspace";
const OAUTH_NEXT_COOKIE = "egg-instagram-oauth-next";
const OAUTH_PROVIDER_COOKIE = "egg-instagram-oauth-provider";
const OAUTH_REDIRECT_COOKIE = "egg-instagram-oauth-redirect";

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
  // Reuse the exact byte-for-byte redirect URI sent to Meta. Reconstructing it
  // from the callback request can differ behind Vercel's proxy/custom domain.
  const storedRedirectUri = req.cookies.get(OAUTH_REDIRECT_COOKIE)?.value;
  const redirectUri = storedRedirectUri
    ? decodeURIComponent(storedRedirectUri)
    : `${requestUrl.origin}/api/auth/instagram/callback`;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const requestedWorkspaceId = req.cookies.get(OAUTH_WORKSPACE_COOKIE)?.value;
  const requestedNext = req.cookies.get(OAUTH_NEXT_COOKIE)?.value === "/meta-ads" ? "/meta-ads" : "/onboarding";
  const provider = req.cookies.get(OAUTH_PROVIDER_COOKIE)?.value === "facebook" ? "facebook" : "instagram";
  const destinationUrl = `${requestUrl.origin}${requestedNext}`;

  if (error || !code || !state || !expectedState || state !== expectedState || !requestedWorkspaceId) {
    return NextResponse.redirect(`${destinationUrl}?instagram_error=true`);
  }

  const appId = provider === "facebook"
    ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    : process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appSecret = provider === "facebook" ? process.env.FACEBOOK_APP_SECRET : process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${destinationUrl}?instagram_error=missing_credentials`);
  }

  try {
    if (provider === "instagram") {
      console.info("[instagram-oauth] token-exchange", {
        redirectUri,
        storedRedirectUri,
        requestOrigin: requestUrl.origin,
        appIdSuffix: appId.slice(-4),
      });
      const form = new FormData();
      form.set("client_id", appId);
      form.set("client_secret", appSecret);
      form.set("grant_type", "authorization_code");
      form.set("redirect_uri", redirectUri);
      form.set("code", code);
      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form, cache: "no-store" });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error(`Instagram token error: ${JSON.stringify(tokenData)}`);

      let accessToken = tokenData.access_token as string;
      let expiresIn: number | null = null;
      const longLivedUrl = new URL("https://graph.instagram.com/access_token");
      longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
      longLivedUrl.searchParams.set("client_secret", appSecret);
      longLivedUrl.searchParams.set("access_token", accessToken);
      const longLivedRes = await fetch(longLivedUrl, { cache: "no-store" });
      const longLivedData = await longLivedRes.json().catch(() => ({}));
      if (longLivedRes.ok && longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        expiresIn = typeof longLivedData.expires_in === "number" ? longLivedData.expires_in : null;
      }

      const profileUrl = new URL("https://graph.instagram.com/me");
      profileUrl.searchParams.set("fields", "id,user_id,username,name,profile_picture_url,followers_count,media_count");
      profileUrl.searchParams.set("access_token", accessToken);
      const profileRes = await fetch(profileUrl, { cache: "no-store" });
      const profile = await profileRes.json() as InstagramProfile & { user_id?: string };
      if (!profileRes.ok || !profile.username || !(profile.id || profile.user_id)) {
        throw new Error(`Instagram profile error: ${JSON.stringify(profile)}`);
      }

      const supabase = await createClient();
      const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      if (!supabase || !user) return NextResponse.redirect(`${requestUrl.origin}/login`);
      const { workspaces } = await getCreatorWorkspaceContext();
      const requestedWorkspace = workspaces.find((workspace) => workspace.id === requestedWorkspaceId);
      if (!requestedWorkspace) return NextResponse.redirect(`${destinationUrl}?instagram_error=invalid_workspace`);
      const admin = createEggAdmin();
      const { data: existingProfile } = await admin
        .from("egg_creator_profiles")
        .select("avatar_url")
        .eq("id", requestedWorkspaceId)
        .maybeSingle();
      const { error: updateError } = await admin.from("egg_creator_profiles").update({
        instagram_handle: profile.username,
        instagram_followers: profile.followers_count || 0,
        // A creator's manually uploaded avatar is their explicit choice. Only
        // seed from Instagram when the workspace does not have an avatar yet.
        avatar_url: existingProfile?.avatar_url || profile.profile_picture_url || null,
        instagram_access_token: accessToken,
        instagram_user_id: profile.user_id || profile.id,
      }).eq("id", requestedWorkspaceId);
      if (updateError) throw updateError;

      const params = new URLSearchParams({
        instagram_connected: "true",
        ig_username: profile.username,
        ig_followers: String(profile.followers_count || 0),
        ig_name: profile.name || "",
        ig_avatar: profile.profile_picture_url || "",
        threads_username: profile.username,
      });
      if (expiresIn) params.set("token_expires_in", String(expiresIn));
      const response = NextResponse.redirect(`${destinationUrl}?${params.toString()}`);
      response.cookies.delete(OAUTH_STATE_COOKIE);
      response.cookies.delete(OAUTH_WORKSPACE_COOKIE);
      response.cookies.delete(OAUTH_NEXT_COOKIE);
      response.cookies.delete(OAUTH_PROVIDER_COOKIE);
      response.cookies.delete(OAUTH_REDIRECT_COOKIE);
      return response;
    }

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

    let userAccessToken = tokenData.access_token as string;
    let tokenExpiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : null;
    try {
      const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
      longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
      longLivedUrl.searchParams.set("client_id", appId);
      longLivedUrl.searchParams.set("client_secret", appSecret);
      longLivedUrl.searchParams.set("fb_exchange_token", userAccessToken);
      const longLivedResponse = await fetch(longLivedUrl.toString(), { cache: "no-store" });
      const longLivedData = await longLivedResponse.json().catch(() => ({}));
      if (longLivedResponse.ok && longLivedData.access_token) {
        userAccessToken = longLivedData.access_token;
        tokenExpiresIn = typeof longLivedData.expires_in === "number" ? longLivedData.expires_in : tokenExpiresIn;
      }
    } catch (exchangeError) {
      console.warn("Long-lived Meta token exchange failed; using initial token", exchangeError);
    }
    const match = await findInstagramProfile(userAccessToken);

    if (!match) {
      return NextResponse.redirect(`${destinationUrl}?instagram_error=no_connected_ig`);
    }

    const { profile, page, pageAccessToken } = match;
    const supabase = await createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    let onboardedNewKol = false;

    if (supabase && user) {
      const { workspaces } = await getCreatorWorkspaceContext();
      const requestedWorkspace = workspaces.find((workspace) => workspace.id === requestedWorkspaceId);
      if (!requestedWorkspace) {
        return NextResponse.redirect(`${destinationUrl}?instagram_error=invalid_workspace`);
      }
      if (requestedNext === "/meta-ads" && requestedWorkspace.role !== "owner" && requestedWorkspace.role !== "admin") {
        return NextResponse.redirect(`${destinationUrl}?instagram_error=forbidden`);
      }
      const admin = createEggAdmin();
      const { data: existingProfile } = await admin
        .from("egg_creator_profiles")
        .select("audience_demographics,avatar_url")
        .eq("id", requestedWorkspaceId)
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
        avatar_url: existingProfile?.avatar_url || profile.profile_picture_url || null,
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

      const { data: updatedRows, error: updateError } = await admin
        .from("egg_creator_profiles")
        .update(payloadWithToken)
        .eq("id", requestedWorkspaceId)
        .select("id");

      if (updateError && /column|schema|instagram_access_token|instagram_user_id/i.test(updateError.message)) {
        const { error: fallbackError } = await admin
          .from("egg_creator_profiles")
          .update({
            instagram_handle: profile.username,
            instagram_followers: profile.followers_count || 0,
            facebook_handle: page.name || null,
            avatar_url: existingProfile?.avatar_url || profile.profile_picture_url || null,
          })
          .eq("id", requestedWorkspaceId);

        if (fallbackError) console.error("Instagram profile fallback save error:", fallbackError);
      } else if (updateError) {
        console.error("Instagram profile save error:", updateError);
      } else if (!updatedRows || updatedRows.length === 0) {
        throw new Error("Selected creator workspace no longer exists");
      } else if (!existingProfile) onboardedNewKol = true;

      if (requestedWorkspace.role === "owner" || requestedWorkspace.role === "admin") {
        const { error: metaConnectionError } = await admin.from("egg_meta_connections").upsert({
          workspace_id: requestedWorkspaceId,
          user_access_token: userAccessToken,
          token_expires_at: tokenExpiresIn ? new Date(Date.now() + tokenExpiresIn * 1000).toISOString() : null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" });
        if (metaConnectionError) throw metaConnectionError;
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

    const response = NextResponse.redirect(`${destinationUrl}?${params.toString()}`);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_WORKSPACE_COOKIE);
    response.cookies.delete(OAUTH_NEXT_COOKIE);
    response.cookies.delete(OAUTH_PROVIDER_COOKIE);
    response.cookies.delete(OAUTH_REDIRECT_COOKIE);
    return response;
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(`${destinationUrl}?instagram_error=true`);
  }
}
