import { NextResponse, type NextRequest } from "next/server";
// Keep the routing guard free of Node crypto / server SDK imports.
export default function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.EGG_CREDIT_STAGING_ENABLED !== "true"
    || process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://netzschelivdhfkznfrq.supabase.co"
    || process.env.VERCEL_GIT_COMMIT_REF !== "codex/credits-wallet-staging") {
    return NextResponse.json({ error: "staging_disabled" }, { status: 503 });
  }
  const path = request.nextUrl.pathname;
  if (path === "/") return NextResponse.redirect(new URL("/credits-lab", request.url));
  if (path === "/credits-lab" || path === "/api/staging-credits") return NextResponse.next();
  return NextResponse.json({ error: "staging_route_not_allowed" }, { status: 404 });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/api/:path*"] };
