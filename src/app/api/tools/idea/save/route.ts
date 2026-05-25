import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CREDIT_COSTS, deductCredits, getCreditBalance } from "@/lib/credits";
import { masterSupabase } from "@/lib/supabase/master";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { getOrCreateKolWorkspace } = await import("@/lib/workspace");
  const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, "");
  const shouldDeduct = Boolean(body.script_hook);

  if (shouldDeduct) {
    const balance = await getCreditBalance(user.email);
    if (balance < CREDIT_COSTS.AI_GENERATION) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const deduction = await deductCredits({
      email: user.email,
      amount: CREDIT_COSTS.AI_GENERATION,
      type: "ai_generation",
      tool: "idea",
      description: "儲存 AI 強化靈感",
    });

    if (!deduction.success) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
  }

  const { data: idea, error } = await (masterSupabase as any)
    .from("ideas")
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      title: body.title,
      topic: body.topic,
      summary: body.summary,
      viral_score: body.viral_score ?? 0,
      thumb: body.thumb,
      platform: body.platform,
      tags: body.tags ?? [],
      script_hook: body.script_hook,
      notes: body.notes,
      type: "saved",
    })
    .select("id, title, topic, summary, viral_score, thumb, platform, notes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, idea });
}
