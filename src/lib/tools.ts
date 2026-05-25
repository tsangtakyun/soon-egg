import { redirect } from "next/navigation";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getOrCreateKolWorkspace } from "@/lib/workspace";

type ToolEntry = {
  user: {
    id: string;
    email: string;
  };
  workspaceId: string;
  balance: number;
};

export async function enterTool(tool: string, description: string): Promise<ToolEntry> {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: profile } = await serverSupabase.from("egg_creator_profiles").select("display_name").eq("user_id", user.id).single();
  const balance = await getCreditBalance(user.email);
  if (balance < CREDIT_COSTS.TOOL_ENTRY) redirect("/credits?insufficient=tools");

  const deduction = await deductCredits({
    email: user.email,
    amount: CREDIT_COSTS.TOOL_ENTRY,
    type: "tool_entry",
    tool,
    description,
  });

  if (!deduction.success) redirect("/credits?insufficient=tools");

  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, profile?.display_name ?? "");
  return {
    user: { id: user.id, email: user.email },
    workspaceId,
    balance: deduction.balance,
  };
}
