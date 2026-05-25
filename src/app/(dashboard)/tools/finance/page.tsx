import { masterSupabase } from "@/lib/supabase/master";
import { enterTool } from "@/lib/tools";
import { FinanceClient, type Expense } from "./FinanceClient";

export default async function FinancePage() {
  const { user, balance } = await enterTool("finance", "進入財務中心");

  const { data: expenses } = await (masterSupabase as any)
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  return <FinanceClient expenses={(expenses ?? []) as Expense[]} balance={balance} />;
}
