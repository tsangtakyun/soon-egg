import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let stripeConnected = false;
  let stripeAccountMasked: string | null = null;

  if (profile?.stripe_account_id) {
    stripeConnected = profile.stripe_onboarding_complete ?? false;
    stripeAccountMasked = String(profile.stripe_account_id).slice(-6);
  }

  return (
    <SettingsClient
      profile={profile}
      userEmail={user.email!}
      stripeConnected={stripeConnected}
      stripeAccountMasked={stripeAccountMasked}
    />
  );
}
