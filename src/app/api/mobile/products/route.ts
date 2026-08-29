import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  canEditWorkspace,
  createEggAdmin,
  type WorkspaceRole,
} from "@/lib/creator-workspace";

const productFields =
  "id,creator_id,title,description,price,currency,product_type,thumbnail_url,external_url,stock,is_unlimited_stock,is_archived,is_active,created_at";
const productTypes = new Set([
  "physical",
  "digital",
  "service",
  "workshop",
  "other",
]);

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
  const requested = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (requested) query = query.eq("workspace_id", requested);
  const { data } = await query.limit(1).maybeSingle();
  return data
    ? {
        admin,
        workspaceId: data.workspace_id as string,
        role: data.role as WorkspaceRole,
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
  const { data, error } = await ctx.admin
    .from("egg_digital_products")
    .select(productFields)
    .eq("creator_id", ctx.workspaceId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: "未能載入產品" }, { status: 500 });
  return NextResponse.json({
    products: data ?? [],
    canEdit: canEditWorkspace(ctx.role),
  });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  if (!canEditWorkspace(ctx.role))
    return NextResponse.json(
      { error: "只有擁有者或管理員可以管理產品" },
      { status: 403 },
    );
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "save";
  if (action === "archive") {
    const id = typeof body.id === "string" ? body.id : "";
    const { error } = await ctx.admin
      .from("egg_digital_products")
      .update({ is_archived: true, is_active: false })
      .eq("id", id)
      .eq("creator_id", ctx.workspaceId);
    return error
      ? NextResponse.json({ error: "未能刪除產品" }, { status: 500 })
      : NextResponse.json({ success: true });
  }
  if (action === "toggle") {
    const id = typeof body.id === "string" ? body.id : "";
    const { error } = await ctx.admin
      .from("egg_digital_products")
      .update({ is_active: body.is_active === true })
      .eq("id", id)
      .eq("creator_id", ctx.workspaceId);
    return error
      ? NextResponse.json({ error: "未能更新產品" }, { status: 500 })
      : NextResponse.json({ success: true });
  }
  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 2000)
      : "";
  const productType = productTypes.has(body.product_type)
    ? body.product_type
    : "digital";
  const price = Number(body.price);
  if (!title || !Number.isFinite(price) || price < 0)
    return NextResponse.json(
      { error: "請輸入有效產品名稱及售價" },
      { status: 400 },
    );
  const payload = {
    creator_id: ctx.workspaceId,
    title,
    description: description || null,
    price,
    currency:
      typeof body.currency === "string"
        ? body.currency.slice(0, 3).toUpperCase()
        : "HKD",
    product_type: productType,
    external_url: cleanUrl(body.external_url),
    thumbnail_url: cleanUrl(body.thumbnail_url),
    is_unlimited_stock: body.is_unlimited_stock !== false,
    stock:
      body.is_unlimited_stock === false && Number.isFinite(Number(body.stock))
        ? Math.max(0, Number(body.stock))
        : null,
    is_active: body.is_active !== false,
    is_archived: false,
  };
  const id = typeof body.id === "string" ? body.id : null;
  const query = id
    ? ctx.admin
        .from("egg_digital_products")
        .update(payload)
        .eq("id", id)
        .eq("creator_id", ctx.workspaceId)
    : ctx.admin.from("egg_digital_products").insert(payload);
  const { data, error } = await query.select(productFields).single();
  if (error)
    return NextResponse.json({ error: "未能儲存產品" }, { status: 500 });
  return NextResponse.json({ success: true, product: data });
}

function cleanUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
