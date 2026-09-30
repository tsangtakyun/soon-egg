import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getEggRequestContext } from "@/lib/egg-api-context";

export const runtime = "nodejs";

function hashContent(content: unknown) {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { action?: "approve" | "dismiss" | "reopen"; content?: unknown; method?: string } | null;
  if (!body?.action || !["approve", "dismiss", "reopen"].includes(body.action)) {
    return NextResponse.json({ error: "定稿動作不正確" }, { status: 400 });
  }

  const { data: existing } = await context.admin.from("egg_content_packs")
    .select("id,content,approval_status")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "找不到這個內容包" }, { status: 404 });

  const content = body.content && typeof body.content === "object" && !Array.isArray(body.content)
    ? body.content
    : existing.content;
  const contentHash = hashContent(content);
  const now = new Date().toISOString();
  const approvalStatus = body.action === "approve" ? "approved" : body.action === "dismiss" ? "dismissed" : "draft";
  const updates = body.action === "approve" ? {
    content,
    status: "ready",
    approval_status: approvalStatus,
    approved_by: context.user.id,
    approved_by_role: context.role ?? "owner",
    approved_at: now,
    approval_method: body.method === "team_review" ? "team_review" : "creator_confirmed",
    approved_content: content,
    approved_content_hash: contentHash,
    updated_at: now,
  } : {
    approval_status: approvalStatus,
    approved_by: null,
    approved_by_role: null,
    approved_at: null,
    approval_method: null,
    approved_content: null,
    approved_content_hash: null,
    updated_at: now,
  };

  const { data: pack, error } = await context.admin.from("egg_content_packs")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .select("id,content,status,approval_status,approved_by_role,approved_at,approval_method,approved_content_hash,updated_at")
    .single();
  if (error || !pack) {
    console.error("[egg pack approval] update failed", error);
    return NextResponse.json({ error: "未能更新定稿狀態" }, { status: 500 });
  }
  const eventType = body.action === "approve" ? "approved" : body.action === "dismiss" ? "dismissed" : "reopened";
  const { error: eventError } = await context.admin.from("egg_pack_workflow_events").insert({
    workspace_id: context.workspaceId,
    pack_id: id,
    actor_id: context.user.id,
    actor_role: context.role ?? "owner",
    event_type: eventType,
    content_hash: contentHash,
    metadata: { previous_status: existing.approval_status, approval_method: updates.approval_method ?? null },
  });
  if (eventError) console.error("[egg pack approval] event failed", eventError);
  return NextResponse.json({ pack });
}
