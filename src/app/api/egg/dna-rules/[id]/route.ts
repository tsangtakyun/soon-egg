import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { ruleText?: string; isActive?: boolean; confirmed?: boolean; scope?: string };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.ruleText === "string" && body.ruleText.trim()) updates.rule_text = body.ruleText.trim().slice(0, 500);
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
  if (["all","presenter","ai_visual","carousel","single_image","snapshot_reference"].includes(body.scope ?? "")) updates.scope = body.scope;
  if (typeof body.confirmed === "boolean") { updates.status = body.confirmed ? "confirmed" : "suggested"; updates.confirmed_at = body.confirmed ? new Date().toISOString() : null; updates.confirmed_by = body.confirmed ? context.user.id : null; }
  const { data, error } = await context.admin.from("egg_creator_dna_rules").update(updates).eq("id", id).eq("workspace_id", context.workspaceId).select("id,category,scope,rule_text,evidence_count,status,is_active,confirmed_at,created_at,updated_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "找不到這條 DNA 規則" }, { status: 404 });
  return NextResponse.json({ rule: data });
}
