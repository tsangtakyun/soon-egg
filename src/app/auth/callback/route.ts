import { createClient } from "@/lib/supabase/server";
import { initKolCredits } from "@/lib/credits";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/onboarding";
  const supabase = await createClient();

  if (code) {
    await supabase?.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (user?.email) {
      try {
        await initKolCredits(user.email, user.id);
      } catch (error) {
        console.error("[auth/callback] init credits failed:", error);
      }
    }
  }

  if (next === "auto" && supabase) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("egg_creator_profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      return NextResponse.redirect(new URL(profile?.onboarding_completed ? "/dashboard" : "/onboarding", request.url));
    }

    return NextResponse.redirect(new URL("/login?auth_error=session", request.url));
  }

  if (next === "auto") {
    return NextResponse.redirect(new URL("/login?auth_error=session", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
