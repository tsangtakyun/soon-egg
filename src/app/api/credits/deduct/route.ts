import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { masterSupabaseAdmin } from "@/lib/supabase-master";

const COSTS = {
  tool_enter: 0,
  ai_generate: 10,
} as const;

type CreditAction = keyof typeof COSTS;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } = { user: null } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as CreditAction;
  const cost = COSTS[action];

  if (!action || !(action in COSTS)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const email = user.email.trim().toLowerCase();
  const { data: creditRow, error } = await masterSupabaseAdmin
    .from("user_credits")
    .select("balance, total_used")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "credit_lookup_failed" }, { status: 500 });
  }

  const balance = creditRow?.balance ?? 0;
  const totalUsed = creditRow?.total_used ?? 0;

  if (cost === 0) {
    return NextResponse.json({
      success: true,
      balance,
      deducted: 0,
    });
  }

  if (balance < cost) {
    return NextResponse.json({ error: "insufficient_credits", balance, required: cost }, { status: 402 });
  }

  const newBalance = balance - cost;
  const { error: updateError } = await masterSupabaseAdmin
    .from("user_credits")
    .update({
      balance: newBalance,
      total_used: totalUsed + cost,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (updateError) {
    return NextResponse.json({ error: "credit_deduct_failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    balance: newBalance,
    deducted: cost,
  });
}
