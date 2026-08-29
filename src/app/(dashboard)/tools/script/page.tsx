import { redirect } from "next/navigation";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { ScriptClient, type SavedScript } from "./ScriptClient";

export default async function ScriptPage() {
  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (!user?.email) redirect("/login");
  if (!activeWorkspace || !admin) redirect("/onboarding");

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

  const { data: scripts } = await admin
    .from("egg_creator_scripts")
    .select("id, title, topic, background, tone, framework, hook_variant, ai_draft, parts, created_at")
    .eq("workspace_id", activeWorkspace.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return <ScriptClient scripts={(scripts ?? []) as SavedScript[]} balance={deduction.balance} />;
}
