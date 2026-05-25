import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";
import { IdeaClient, type Idea } from "./IdeaClient";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export default async function IdeaToolPage() {
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
    tool: "idea",
    description: "進入靈感工作台",
  });

  if (!deduction.success) {
    redirect("/credits?insufficient=tools");
  }

  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, profile?.display_name ?? "");

  const [{ data: trendingIdeas }, { data: myIdeas }] = await Promise.all([
    (masterSupabase as any)
      .from("ideas")
      .select("id, title, topic, summary, viral_score, thumb, platform, region, tags, views, script_hook")
      .order("viral_score", { ascending: false })
      .limit(20),
    (masterSupabase as any)
      .from("ideas")
      .select("id, title, topic, summary, viral_score, thumb, platform, notes, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <IdeaClient
      trendingIdeas={(trendingIdeas ?? []) as Idea[]}
      myIdeas={(myIdeas ?? []) as Idea[]}
      workspaceId={workspaceId}
      userEmail={user.email}
      balance={deduction.balance}
    />
  );
}
