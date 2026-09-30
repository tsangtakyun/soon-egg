import { NextRequest, NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const OAUTH_STATE_COOKIE = "egg-instagram-oauth-state";
const OAUTH_WORKSPACE_COOKIE = "egg-instagram-oauth-workspace";
const OAUTH_NEXT_COOKIE = "egg-instagram-oauth-next";
const OAUTH_PROVIDER_COOKIE = "egg-instagram-oauth-provider";
const OAUTH_REDIRECT_COOKIE = "egg-instagram-oauth-redirect";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const { user, activeWorkspace, activeRole } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.redirect(`${baseUrl}/login`);
  if (!activeWorkspace) return NextResponse.redirect(`${baseUrl}/onboarding?instagram_error=missing_workspace`);
  const state = crypto.randomUUID();
  const wantsAds = req.nextUrl.searchParams.get("ads") === "true";
  const wantsCollector = req.nextUrl.searchParams.get("collector") === "true";
  const requestedNext = req.nextUrl.searchParams.get("next");
  const nextPath = requestedNext === "/meta-ads"
    ? "/meta-ads"
    : requestedNext === "/core"
      ? "/core"
      : requestedNext === "/dashboard"
        ? "/dashboard"
        : "/onboarding";
  if (wantsAds && activeRole !== "owner" && activeRole !== "admin") {
    return NextResponse.redirect(`${baseUrl}/meta-ads?meta_error=forbidden`);
  }

  const provider = wantsAds || wantsCollector ? "facebook" : "instagram";
  const appId = provider === "facebook"
    ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    : process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  if (!appId) {
    const errorDestination = nextPath === "/core" ? "https://soon-core.vercel.app/intelligence-inbox" : `${baseUrl}${nextPath}`;
    return NextResponse.redirect(`${errorDestination}?instagram_error=missing_app_id`);
  }

  const authUrl = new URL(provider === "facebook"
    ? "https://www.facebook.com/v21.0/dialog/oauth"
    : "https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", provider === "facebook"
    ? wantsCollector
      ? ["pages_show_list", "pages_read_engagement", "instagram_basic"].join(",")
      : ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_insights", "business_management", "ads_management", "ads_read"].join(",")
    : "instagram_business_basic,instagram_business_manage_insights");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  if (provider === "instagram") {
    authUrl.searchParams.set("enable_fb_login", "0");
    authUrl.searchParams.set("force_reauth", "true");
  }
  console.info("[instagram-oauth] authorize", {
    provider,
    redirectUri,
    appIdSuffix: appId.slice(-4),
  });

  const response = NextResponse.redirect(authUrl.toString());
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/", maxAge: 600 };
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_WORKSPACE_COOKIE, activeWorkspace.id, cookieOptions);
  response.cookies.set(OAUTH_NEXT_COOKIE, nextPath, cookieOptions);
  response.cookies.set(OAUTH_PROVIDER_COOKIE, provider, cookieOptions);
  response.cookies.set(OAUTH_REDIRECT_COOKIE, redirectUri, cookieOptions);
  return response;
}
