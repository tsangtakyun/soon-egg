import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/onboarding";
  const supabase = await createClient();

  if (code) {
    await supabase?.auth.exchangeCodeForSession(code);
  }

  if (next === "auto" && supabase) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("egg_creator_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (user.email) {
        try {
          const { initKolCredits } = await import("@/lib/credits");
          await initKolCredits(user.email, user.id);
        } catch (err) {
          console.error("[callback] credits init error:", err);
        }
      }

      return NextResponse.redirect(new URL(profile?.onboarding_completed ? "/dashboard" : "/onboarding", request.url));
    }

    return NextResponse.redirect(new URL("/login?auth_error=session", request.url));
  }

  if (next === "auto") {
    return NextResponse.redirect(new URL("/login?auth_error=session", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
