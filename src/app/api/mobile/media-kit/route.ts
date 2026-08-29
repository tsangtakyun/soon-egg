import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
} from "@/lib/creator-workspace";

const editableProfileFields = new Set([
  "contact_email",
  "mediakit_is_public",
  "mediakit_allow_matching",
  "mediakit_about_title",
  "mediakit_bio",
  "mediakit_collab_title",
  "mediakit_collab_message",
  "mediakit_layout",
  "mediakit_font",
  "mediakit_color_preset",
  "mediakit_bg_color",
  "mediakit_text_color",
  "mediakit_accent_color",
  "mediakit_accent_text_color",
  "mediakit_lock_contact",
  "mediakit_lock_about",
  "mediakit_lock_case_studies",
  "mediakit_lock_brand_partners",
  "mediakit_lock_rates",
  "mediakit_lock_analytics",
]);

async function getContext(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return null;
  const admin = createEggAdmin();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const requestedId = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (requestedId) query = query.eq("workspace_id", requestedId);
  const { data } = await query.limit(1).maybeSingle();
  return data?.workspace_id
    ? {
        admin,
        workspaceId: data.workspace_id as string,
        role: data.role as "owner" | "admin" | "member",
      }
    : null;
}

export async function GET(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );

  const [profile, rates, cases, partners, media] = await Promise.all([
    context.admin
      .from("egg_creator_profiles")
      .select(
        "id,username,display_name,avatar_url,contact_email,instagram_handle,mediakit_is_public,mediakit_allow_matching,mediakit_about_title,mediakit_bio,mediakit_collab_title,mediakit_collab_message,mediakit_layout,mediakit_font,mediakit_color_preset,mediakit_bg_color,mediakit_text_color,mediakit_accent_color,mediakit_accent_text_color,mediakit_lock_contact,mediakit_lock_about,mediakit_lock_case_studies,mediakit_lock_brand_partners,mediakit_lock_rates,mediakit_lock_analytics",
      )
      .eq("id", context.workspaceId)
      .maybeSingle(),
    context.admin
      .from("egg_rate_cards")
      .select(
        "id,service_name,service_name_zh,platform,price,currency,description,is_starting_price,sort_order",
      )
      .eq("creator_id", context.workspaceId)
      .eq("is_active", true)
      .order("sort_order"),
    context.admin
      .from("egg_case_studies")
      .select(
        "id,title,brand_name,description,result,image_url,link_url,sort_order",
      )
      .eq("creator_id", context.workspaceId)
      .order("sort_order"),
    context.admin
      .from("egg_brand_partners")
      .select("id,brand_name,brand_logo_url,sort_order")
      .eq("creator_id", context.workspaceId)
      .order("sort_order"),
    context.admin
      .from("egg_instagram_media")
      .select(
        "id,media_type,caption,permalink,media_url,thumbnail_url,published_at,views,reach,plays,total_interactions,like_count,comments_count,is_featured,sort_order",
      )
      .eq("creator_id", context.workspaceId)
      .order("is_featured", { ascending: false })
      .order("sort_order")
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  const error =
    profile.error ||
    rates.error ||
    cases.error ||
    partners.error ||
    media.error;
  if (error || !profile.data) {
    console.error("[mobile media kit] load failed", error?.message);
    return NextResponse.json({ error: "未能讀取 Media Kit" }, { status: 500 });
  }
  return NextResponse.json({
    profile: profile.data,
    rates: rates.data ?? [],
    caseStudies: cases.data ?? [],
    brandPartners: partners.data ?? [],
    media: media.data ?? [],
    canEdit: context.role === "owner" || context.role === "admin",
  });
}

export async function PATCH(request: Request) {
  const context = await getContext(request);
  if (!context)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (context.role !== "owner" && context.role !== "admin")
    return NextResponse.json(
      { error: "只有擁有者或管理員可以編輯 Media Kit" },
      { status: 403 },
    );

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body)
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  const action = String(body.action ?? "");

  if (action === "update_profile") {
    const input =
      body.values && typeof body.values === "object"
        ? (body.values as Record<string, unknown>)
        : {};
    const values: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!editableProfileFields.has(key)) continue;
      if (typeof value === "boolean") values[key] = value;
      else if (value == null) values[key] = null;
      else
        values[key] = String(value)
          .trim()
          .slice(
            0,
            key.includes("message") || key.includes("bio") ? 1500 : 160,
          );
    }
    if (!Object.keys(values).length)
      return NextResponse.json({ error: "沒有可儲存的資料" }, { status: 400 });
    const { error } = await context.admin
      .from("egg_creator_profiles")
      .update(values)
      .eq("id", context.workspaceId);
    if (error) return databaseError("更新 Media Kit", error);
    return NextResponse.json({ success: true });
  }

  if (action === "save_rate") {
    const serviceName = clean(body.serviceName, 100);
    const price = Number(body.price);
    if (!serviceName || !Number.isFinite(price) || price < 0)
      return NextResponse.json(
        { error: "請填寫服務名稱及有效價錢" },
        { status: 400 },
      );
    const values = {
      creator_id: context.workspaceId,
      service_name: serviceName,
      service_name_zh: clean(body.serviceNameZh, 100) || null,
      platform: clean(body.platform, 40) || "Instagram",
      price,
      currency: clean(body.currency, 8) || "HKD",
      description: clean(body.description, 500) || null,
      is_starting_price: body.isStartingPrice !== false,
      is_active: true,
    };
    const id = clean(body.id, 80);
    const result = id
      ? await context.admin
          .from("egg_rate_cards")
          .update(values)
          .eq("id", id)
          .eq("creator_id", context.workspaceId)
          .select("id")
          .maybeSingle()
      : await context.admin
          .from("egg_rate_cards")
          .insert({ ...values, sort_order: Date.now() })
          .select("id")
          .single();
    if (result.error || !result.data)
      return databaseError("儲存報價", result.error);
    return NextResponse.json({ success: true, id: result.data.id });
  }

  if (action === "delete_rate") {
    const id = clean(body.id, 80);
    const { error } = await context.admin
      .from("egg_rate_cards")
      .update({ is_active: false })
      .eq("id", id)
      .eq("creator_id", context.workspaceId);
    if (error) return databaseError("刪除報價", error);
    return NextResponse.json({ success: true });
  }

  if (action === "toggle_featured") {
    const id = clean(body.id, 80);
    const featured = body.featured === true;
    if (featured) {
      const { count } = await context.admin
        .from("egg_instagram_media")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", context.workspaceId)
        .eq("is_featured", true);
      if ((count ?? 0) >= 5)
        return NextResponse.json(
          { error: "最多只可以精選 5 個 Instagram 內容" },
          { status: 400 },
        );
    }
    const { data, error } = await context.admin
      .from("egg_instagram_media")
      .update({ is_featured: featured, sort_order: featured ? Date.now() : 0 })
      .eq("id", id)
      .eq("creator_id", context.workspaceId)
      .select("id")
      .maybeSingle();
    if (error || !data) return databaseError("更新精選內容", error);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function databaseError(action: string, error: { message?: string } | null) {
  console.error(`[mobile media kit] ${action} failed`, error?.message);
  return NextResponse.json(
    { error: `${action}失敗，請稍後再試` },
    { status: 500 },
  );
}
