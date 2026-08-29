import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
} from "@/lib/creator-workspace";

async function context(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const token = value.startsWith("Bearer ") ? value.slice(7).trim() : "";
  if (!token) return null;
  const admin = createEggAdmin();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const selected = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (selected) query = query.eq("workspace_id", selected);
  const { data: membership } = await query.limit(1).maybeSingle();
  return membership
    ? {
        admin,
        user,
        workspaceId: membership.workspace_id,
        role: membership.role as string,
      }
    : null;
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (ctx.role !== "owner")
    return NextResponse.json(
      { error: "只有擁有者可以查看專屬商務規則" },
      { status: 403 },
    );
  const { data } = await ctx.admin
    .from("egg_reply_prompt_profiles")
    .select("system_prompt,updated_at")
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();
  return NextResponse.json({
    systemPrompt: data?.system_prompt ?? "",
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (ctx.role !== "owner")
    return NextResponse.json(
      { error: "只有擁有者可以修改專屬商務規則" },
      { status: 403 },
    );
  const body = await request.json().catch(() => ({}));
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  if (systemPrompt.length < 100 || systemPrompt.length > 50000)
    return NextResponse.json(
      { error: "商務規則需要 100 至 50,000 字" },
      { status: 400 },
    );
  const { error: versionError } = await ctx.admin
    .from("egg_reply_prompt_versions")
    .insert({
      workspace_id: ctx.workspaceId,
      system_prompt: systemPrompt,
      created_by: ctx.user.id,
    });
  if (versionError)
    return NextResponse.json({ error: "未能建立版本紀錄" }, { status: 500 });
  const { error } = await ctx.admin
    .from("egg_reply_prompt_profiles")
    .upsert(
      {
        profile_key: `workspace_${ctx.workspaceId}`,
        workspace_id: ctx.workspaceId,
        system_prompt: systemPrompt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_key" },
    );
  return error
    ? NextResponse.json({ error: "儲存商務規則失敗" }, { status: 500 })
    : NextResponse.json({ success: true });
}
