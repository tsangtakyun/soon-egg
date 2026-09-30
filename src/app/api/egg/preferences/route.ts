import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const [{ data, error }, { data: rules, error: rulesError }] = await Promise.all([context.admin.from("egg_preference_signals")
    .select("id,pack_id,recipe_id,field_path,before_value,after_value,signal_type,is_active,confirmed_at,created_at")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100), context.admin.from("egg_creator_dna_rules").select("id,category,scope,rule_text,evidence_count,status,is_active,confirmed_at,created_at,updated_at").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false })]);
  if (error || rulesError) return NextResponse.json({ error: "暫時未能載入 Creator DNA" }, { status: 500 });
  return NextResponse.json({ signals: data ?? [], rules: rules ?? [] });
}
