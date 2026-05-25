import { masterSupabase } from "@/lib/supabase/master";

export const CREDIT_COSTS = {
  TOOL_ENTRY: 10,
  AI_GENERATION: 3,
  FREE: 0,
} as const;

type CreditRow = {
  user_id: string;
  balance: number;
  total_used?: number | null;
  total_purchased?: number | null;
};

export async function getCreditBalance(email: string): Promise<number> {
  try {
    const { data } = await (masterSupabase as any).from("user_credits").select("balance").eq("email", email).maybeSingle();
    return data?.balance ?? 0;
  } catch (error) {
    console.error("[credits] get balance failed:", error);
    return 0;
  }
}

export async function deductCredits({
  email,
  amount,
  type,
  description,
  tool,
  platform = "soon_egg",
}: {
  email: string;
  amount: number;
  type: string;
  description?: string;
  tool?: string;
  platform?: string;
}): Promise<{ success: boolean; balance: number; error?: string }> {
  if (amount <= 0) {
    const balance = await getCreditBalance(email);
    return { success: true, balance };
  }

  const { data: credit } = await (masterSupabase as any)
    .from("user_credits")
    .select("user_id, balance, total_used")
    .eq("email", email)
    .maybeSingle();

  const row = credit as CreditRow | null;
  if (!row) return { success: false, balance: 0, error: "User not found" };
  if (row.balance < amount) return { success: false, balance: row.balance, error: "Insufficient credits" };

  const newBalance = row.balance - amount;

  await (masterSupabase as any)
    .from("user_credits")
    .update({
      balance: newBalance,
      total_used: Number(row.total_used ?? 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  await (masterSupabase as any).from("credit_transactions").insert({
    user_id: row.user_id,
    email,
    amount: -amount,
    balance_after: newBalance,
    type,
    description,
    tool,
    platform,
  });

  return { success: true, balance: newBalance };
}

export async function addCredits({
  email,
  amount,
  type,
  description,
  stripe_session_id,
}: {
  email: string;
  amount: number;
  type: string;
  description?: string;
  stripe_session_id?: string;
}): Promise<{ success: boolean; balance: number }> {
  const { data: credit } = await (masterSupabase as any)
    .from("user_credits")
    .select("user_id, balance, total_purchased")
    .eq("email", email)
    .maybeSingle();

  const row = credit as CreditRow | null;
  if (!row) return { success: false, balance: 0 };

  const newBalance = row.balance + amount;

  await (masterSupabase as any)
    .from("user_credits")
    .update({
      balance: newBalance,
      total_purchased: Number(row.total_purchased ?? 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  await (masterSupabase as any).from("credit_transactions").insert({
    user_id: row.user_id,
    email,
    amount,
    balance_after: newBalance,
    type,
    description,
    stripe_session_id,
    platform: "soon_egg",
  });

  return { success: true, balance: newBalance };
}

export async function initKolCredits(email: string, userId: string): Promise<void> {
  const { data } = await (masterSupabase as any).from("user_credits").select("user_id").eq("email", email).maybeSingle();
  if (data) return;

  await (masterSupabase as any).from("user_credits").insert({
    user_id: userId,
    email,
    balance: 300,
    total_purchased: 0,
    total_used: 0,
    source: "soon_egg",
  });

  await (masterSupabase as any).from("credit_transactions").insert({
    user_id: userId,
    email,
    amount: 300,
    balance_after: 300,
    type: "signup_bonus",
    description: "新 KOL 歡迎禮遇",
    platform: "soon_egg",
  });
}
