import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  // This flow uses Facebook Login to access Instagram Business data via linked Pages.
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?instagram_error=missing_app_id`);
  }

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "business_management",
  ].join(","));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", "soon-egg-instagram");

  return NextResponse.redirect(authUrl.toString());
}
