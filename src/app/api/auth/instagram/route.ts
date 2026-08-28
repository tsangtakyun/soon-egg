import { NextRequest, NextResponse } from "next/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

const OAUTH_STATE_COOKIE = "egg-instagram-oauth-state";
const OAUTH_WORKSPACE_COOKIE = "egg-instagram-oauth-workspace";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  // This flow uses Facebook Login to access Instagram Business data via linked Pages.
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?instagram_error=missing_app_id`);
  }
  const { user, activeWorkspace } = await getCreatorWorkspaceContext();
  if (!user) return NextResponse.redirect(`${baseUrl}/login`);
  if (!activeWorkspace) return NextResponse.redirect(`${baseUrl}/onboarding?instagram_error=missing_workspace`);
  const state = crypto.randomUUID();

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
  ].join(","));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: true, path: "/", maxAge: 600 };
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_WORKSPACE_COOKIE, activeWorkspace.id, cookieOptions);
  return response;
}
