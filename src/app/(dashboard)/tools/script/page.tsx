import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";
import { ScriptClient, type SavedScript } from "./ScriptClient";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export default async function ScriptPage() {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: profileData } = await serverSupabase
    .from("egg_creator_profiles")
    .select("id, username, display_name")
    .eq("user_id", user.id)
    .single();
  const profile = profileData as Profile | null;

  const balance = await getCreditBalance(user.email);
  if (balance < CREDIT_COSTS.TOOL_ENTRY) {
    redirect("/credits?insufficient=tools");
  }

  const deduction = await deductCredits({
    email: user.email,
    amount: CREDIT_COSTS.TOOL_ENTRY,
    type: "tool_entry",
    tool: "script",
    description: "進入劇本工作台",
  });

  if (!deduction.success) {
    redirect("/credits?insufficient=tools");
  }

  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, profile?.display_name ?? "");

  const { data: scripts } = await (masterSupabase as any)
    .from("scripts")
    .select("id, title, topic, background, tone, framework, hook_variant, ai_draft, parts, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return <ScriptClient scripts={(scripts ?? []) as SavedScript[]} workspaceId={workspaceId} userEmail={user.email} balance={deduction.balance} />;
}
