import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { WorkspaceAccessSettings } from "./WorkspaceAccessSettings";

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

  const { activeWorkspace, activeRole } = await getCreatorWorkspaceContext();
  const { data: rawProfile } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id,username,display_name,bio,avatar_url,content_categories,instagram_handle,instagram_followers,facebook_handle,threads_handle,youtube_handle,tiktok_handle,xiaohongshu_handle,stripe_account_id,stripe_onboarding_complete,instagram_access_token")
    .eq("id", activeWorkspace?.id ?? "")
    .single();
  const { instagram_access_token, ...safeProfile } = rawProfile ?? {};
  const profile = rawProfile ? { ...safeProfile, instagram_connected: Boolean(instagram_access_token) } : null;

  let stripeConnected = false;
  const { data: profileLinks } = activeWorkspace ? await supabaseAdmin.from("egg_profile_blocks").select("id,title,url").eq("creator_id", activeWorkspace.id).eq("block_type", "link").order("sort_order") : { data: [] };
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
      canEditWorkspace={activeRole === "owner" || activeRole === "admin"}
      canManagePayments={activeRole === "owner"}
      profileLinks={profileLinks ?? []}
      workspaceAccess={activeRole ? <WorkspaceAccessSettings role={activeRole} /> : null}
    />
  );
}
