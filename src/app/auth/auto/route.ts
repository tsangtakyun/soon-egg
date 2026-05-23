import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user || !supabase) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(new URL(profile?.onboarding_completed ? "/dashboard" : "/onboarding", request.url));
}
