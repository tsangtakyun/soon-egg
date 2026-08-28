import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

const MAX_TITLE_LENGTH = 80;
const MAX_URL_LENGTH = 2048;

function cleanTitle(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_URL_LENGTH) return null;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? candidate : null;
  } catch {
    return null;
  }
}

async function getContext() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { profile } = await getActiveCreatorProfile("id");
  return profile ? { supabase, creatorId: profile.id } : null;
}

export async function POST(request: NextRequest) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const title = cleanTitle(body.title);
  const url = cleanUrl(body.url);
  if (!title || title.length > MAX_TITLE_LENGTH || !url) {
    return NextResponse.json({ error: "請輸入有效標題及網址。" }, { status: 400 });
  }

  const { data: lastBlock } = await context.supabase
    .from("egg_profile_blocks")
    .select("sort_order")
    .eq("creator_id", context.creatorId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await context.supabase.from("egg_profile_blocks").insert({
    creator_id: context.creatorId,
    title,
    url,
    block_type: "link",
    is_visible: true,
    sort_order: (lastBlock?.sort_order ?? 0) + 1,
    click_count: 0,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ block: data });
}

export async function PATCH(request: NextRequest) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  if (Array.isArray(body.order)) {
    const order: string[] = body.order.filter((id: unknown): id is string => typeof id === "string");
    if (order.length === 0 || order.length > 100 || order.length !== body.order.length) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    const { data: ownedBlocks, error: ownedError } = await context.supabase
      .from("egg_profile_blocks")
      .select("id")
      .eq("creator_id", context.creatorId)
      .in("id", order);
    if (ownedError || ownedBlocks?.length !== order.length) {
      return NextResponse.json({ error: "Invalid blocks" }, { status: 403 });
    }
    const results = await Promise.all(order.map((id, index) => (
      context.supabase.from("egg_profile_blocks").update({ sort_order: index + 1 }).eq("id", id)
    )));
    const failed = results.find((result) => result.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (typeof body.id !== "string") return NextResponse.json({ error: "Missing block id" }, { status: 400 });
  const updates: { title?: string; url?: string; is_visible?: boolean } = {};
  if ("title" in body || "url" in body) {
    const title = cleanTitle(body.title);
    const url = cleanUrl(body.url);
    if (!title || title.length > MAX_TITLE_LENGTH || !url) {
      return NextResponse.json({ error: "請輸入有效標題及網址。" }, { status: 400 });
    }
    updates.title = title;
    updates.url = url;
  }
  if (typeof body.is_visible === "boolean") updates.is_visible = body.is_visible;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

  const { error } = await context.supabase
    .from("egg_profile_blocks")
    .update(updates)
    .eq("id", body.id)
    .eq("creator_id", context.creatorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "Missing block id" }, { status: 400 });
  const { error } = await context.supabase
    .from("egg_profile_blocks")
    .delete()
    .eq("id", body.id)
    .eq("creator_id", context.creatorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
