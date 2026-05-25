import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";
import { StoryboardClient, type RecentScript, type SavedStoryboard } from "./StoryboardClient";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export default async function StoryboardPage({ searchParams }: { searchParams: Promise<{ script?: string }> }) {
  const params = await searchParams;
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
    tool: "storyboard",
    description: "進入分鏡工作台",
  });

  if (!deduction.success) {
    redirect("/credits?insufficient=tools");
  }

  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, profile?.display_name ?? "");

  const [{ data: scripts }, { data: storyboards }] = await Promise.all([
    (masterSupabase as any)
      .from("scripts")
      .select("id, title, ai_draft, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    (masterSupabase as any)
      .from("storyboards")
      .select("id, title, scripts, selections, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <StoryboardClient
      scripts={(scripts ?? []) as RecentScript[]}
      storyboards={(storyboards ?? []) as SavedStoryboard[]}
      workspaceId={workspaceId}
      userEmail={user.email}
      balance={deduction.balance}
      initialScript={params.script ?? ""}
    />
  );
}
