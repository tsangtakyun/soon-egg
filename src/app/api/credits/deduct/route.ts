import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMasterSupabaseAdmin } from "@/lib/supabase-master";
import { creditCost, resolveCreditAction } from "@/lib/credits/policy";

export async function POST(request: NextRequest) {
  const masterSupabaseAdmin = getMasterSupabaseAdmin();
  if (!masterSupabaseAdmin) {
    return NextResponse.json({ error: "master_supabase_not_configured" }, { status: 500 });
  }
  const supabase = await createClient();
  const { data: { user } = { user: null } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = resolveCreditAction(body?.action, body?.feature);

  if (!action) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  return NextResponse.json({
    error: "credit_mutation_must_be_bound_to_generation",
    action,
    required: creditCost(action),
  }, { status: 409 });
}
