import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const finalize = <T extends NextResponse>(nextResponse: T) => {
    nextResponse.headers.set("x-request-id", requestId);
    return nextResponse;
  };
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host");
  // Keep every signed-in product surface behind one central guard. Individual
  // pages still perform workspace/role checks, but adding a new child route can
  // no longer accidentally expose the dashboard shell to logged-out visitors.
  const protectedRoutes = [
    "/onboarding",
    "/dashboard",
    "/profile",
    "/media-kit",
    "/brand-deals",
    "/active-deals",
    "/products",
    "/analytics",
    "/credits",
    "/settings",
    "/team",
    "/topic-library",
    "/tools",
    "/meta-ads",
  ];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (host === "soon-egg.vercel.app") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "egg.sooncreator.network";
    return finalize(NextResponse.redirect(canonicalUrl, 308));
  }

  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", "auto");
    }
    return finalize(NextResponse.redirect(callbackUrl));
  }

  if (!url || !key) {
    if (protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return finalize(NextResponse.redirect(redirectUrl));
    }
    return finalize(response);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return finalize(NextResponse.redirect(redirectUrl));
  }

  return finalize(response);
}
