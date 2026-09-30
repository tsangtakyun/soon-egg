import { preservePackStyle } from '@/lib/production-style';
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { content?: unknown };
  if (!body.content || typeof body.content !== "object" || Array.isArray(body.content)) return NextResponse.json({ error: "內容格式不正確" }, { status: 400 });
  const serialized = JSON.stringify(body.content);
  if (serialized.length > 250_000) return NextResponse.json({ error: "內容太長，未能儲存" }, { status: 400 });

  try {
    const { data: existing } = await context.admin.from("egg_content_packs")
      .select("id,recipe_id,content,original_content,edit_count,approval_status")
      .eq("id", id).eq("workspace_id", context.workspaceId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "找不到這個內容包" }, { status: 404 });
    const nextContent = preservePackStyle(existing.content as Record<string,unknown>,body.content as Record<string,unknown>);
    const allChanges = diffLeaves(existing.content as Record<string, unknown>, nextContent).slice(0, 150);
    const changes = allChanges.filter((change) => !change.path.startsWith("_")).slice(0, 100);
    if (!allChanges.length) return NextResponse.json({ pack: existing, saved: false });

    const editedAt = new Date().toISOString();
    if (!changes.length) {
      const { data: workflowPack, error: workflowError } = await context.admin.from("egg_content_packs").update({
        content: nextContent,
        updated_at: editedAt,
      }).eq("id", id).eq("workspace_id", context.workspaceId)
        .select("id,content,status,edited_at,edit_count,approval_status,created_at,updated_at").single();
      if (workflowError || !workflowPack) throw workflowError ?? new Error("Workflow save failed");
      return NextResponse.json({ pack: workflowPack, saved: true, changes: 0 });
    }

    const { data: pack, error } = await context.admin.from("egg_content_packs").update({
      content: nextContent,
      original_content: existing.original_content ?? existing.content,
      edited_at: editedAt,
      edit_count: (existing.edit_count ?? 0) + 1,
      status: "draft",
      approval_status: "draft",
      approved_by: null,
      approved_by_role: null,
      approved_at: null,
      approval_method: null,
      approved_content: null,
      approved_content_hash: null,
      updated_at: editedAt,
    }).eq("id", id).eq("workspace_id", context.workspaceId)
      .select("id,content,status,edited_at,edit_count,created_at,updated_at").single();
    if (error || !pack) throw error ?? new Error("Save failed");
    const { error: signalError } = changes.length ? await context.admin.from("egg_preference_signals").insert(changes.map((change) => ({
      workspace_id: context.workspaceId,
      user_id: context.user.id,
      pack_id: id,
      recipe_id: existing.recipe_id,
      field_path: change.path,
      before_value: change.before ?? null,
      after_value: change.after ?? null,
    }))) : { error: null };
    if (signalError) throw signalError;
    const { error: eventError } = await context.admin.from("egg_pack_workflow_events").insert({
      workspace_id: context.workspaceId,
      pack_id: id,
      actor_id: context.user.id,
      actor_role: context.role ?? "owner",
      event_type: "content_modified",
      content_hash: createHash("sha256").update(JSON.stringify(nextContent)).digest("hex"),
      metadata: { changes: changes.length, invalidated_approval: existing.approval_status === "approved" },
    });
    if (eventError) console.error("[egg pack] workflow event failed", eventError);
    return NextResponse.json({ pack, saved: true, changes: changes.length });
  } catch (error) {
    console.error("[egg pack] save edit failed", error);
    return NextResponse.json({ error: "暫時未能儲存修改，請稍後再試" }, { status: 500 });
  }
}

function diffLeaves(before: unknown, after: unknown, path = ""): Array<{ path: string; before: unknown; after: unknown }> {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    return Array.from({ length }, (_, index) => diffLeaves(before[index], after[index], `${path}[${index}]`)).flat();
  }
  if (isRecord(before) && isRecord(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => diffLeaves(before[key], after[key], path ? `${path}.${key}` : key));
  }
  return [{ path: path || "content", before, after }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
