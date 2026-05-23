import { NextResponse } from "next/server";

const INSTAGRAM_REDIRECT_URI = "https://egg.sooncreator.network/api/auth/instagram/callback";

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;

  if (!appId) {
    return NextResponse.redirect("https://egg.sooncreator.network/onboarding?instagram_error=missing_app_id");
  }

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
  authUrl.searchParams.set("scope", [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
  ].join(","));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", "soon-egg-instagram");

  return NextResponse.redirect(authUrl.toString());
}
