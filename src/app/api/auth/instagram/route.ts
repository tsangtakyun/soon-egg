import { NextRequest, NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const OAUTH_STATE_COOKIE = "egg-instagram-oauth-state";
const OAUTH_WORKSPACE_COOKIE = "egg-instagram-oauth-workspace";
const OAUTH_NEXT_COOKIE = "egg-instagram-oauth-next";
const OAUTH_PROVIDER_COOKIE = "egg-instagram-oauth-provider";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const { user, activeWorkspace, activeRole } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.redirect(`${baseUrl}/login`);
  if (!activeWorkspace) return NextResponse.redirect(`${baseUrl}/onboarding?instagram_error=missing_workspace`);
  const state = crypto.randomUUID();
  const wantsAds = req.nextUrl.searchParams.get("ads") === "true";
  const nextPath = req.nextUrl.searchParams.get("next") === "/meta-ads" ? "/meta-ads" : "/onboarding";
  if (wantsAds && activeRole !== "owner" && activeRole !== "admin") {
    return NextResponse.redirect(`${baseUrl}/meta-ads?meta_error=forbidden`);
  }

  const provider = wantsAds ? "facebook" : "instagram";
  const appId = wantsAds
    ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    : process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  if (!appId) return NextResponse.redirect(`${baseUrl}${nextPath}?instagram_error=missing_app_id`);

  const authUrl = new URL(wantsAds
    ? "https://www.facebook.com/v21.0/dialog/oauth"
    : "https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", wantsAds
    ? ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_insights", "business_management", "ads_management", "ads_read", "pages_manage_ads"].join(",")
    : "instagram_business_basic");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  if (!wantsAds) {
    authUrl.searchParams.set("enable_fb_login", "0");
    authUrl.searchParams.set("force_authentication", "1");
  }

  const response = NextResponse.redirect(authUrl.toString());
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/", maxAge: 600 };
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_WORKSPACE_COOKIE, activeWorkspace.id, cookieOptions);
  response.cookies.set(OAUTH_NEXT_COOKIE, nextPath, cookieOptions);
  response.cookies.set(OAUTH_PROVIDER_COOKIE, provider, cookieOptions);
  return response;
}
