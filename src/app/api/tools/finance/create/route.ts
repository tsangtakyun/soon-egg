import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { getOrCreateKolWorkspace } = await import("@/lib/workspace");
  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, "");
  const numericAmount = Number(body.amount ?? 0);
  const signedAmount = body.type === "expense" ? -Math.abs(numericAmount) : Math.abs(numericAmount);

  const { data: expense, error } = await (masterSupabase as any)
    .from("expenses")
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      created_by: user.id,
      date: body.date,
      merchant: body.merchant,
      description: body.description,
      amount: signedAmount,
      original_amount: numericAmount,
      original_currency: body.currency ?? "HKD",
      converted_amount: numericAmount,
      converted_currency: body.currency ?? "HKD",
      category: body.category,
      notes: body.notes ?? null,
      ai_extracted: false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, expense });
}
