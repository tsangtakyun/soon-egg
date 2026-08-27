import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type CheckoutItem = {
  productId: string;
  qty: number;
};

export async function POST(req: Request) {
  const { items, buyer_name, buyer_email } = (await req.json()) as {
    items?: CheckoutItem[];
    buyer_name?: string;
    buyer_email?: string;
  };

  if (!buyer_name || !buyer_email || !items?.length) {
    return NextResponse.json({ error: "Missing order details" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const supabase = createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const quantities = new Map<string, number>();
  for (const item of items) {
    const qty = Number(item.qty);
    if (!item.productId || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + qty);
  }

  const productIds = [...quantities.keys()];
  const { data: products, error: productsError } = await supabase
    .from("egg_digital_products")
    .select("id, creator_id, title, price, currency, stock, is_unlimited_stock")
    .in("id", productIds)
    .eq("is_active", true)
    .eq("is_archived", false);

  if (productsError || products?.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 409 });
  }

  const unavailableProduct = products.find((product) => {
    const qty = quantities.get(product.id) ?? 0;
    return !product.is_unlimited_stock && Number(product.stock ?? 0) < qty;
  });
  if (unavailableProduct) {
    return NextResponse.json({ error: "One or more products are out of stock" }, { status: 409 });
  }

  const orders = products.map((product) => {
    const qty = quantities.get(product.id) ?? 0;
    return {
      creator_id: product.creator_id,
      product_id: product.id,
      product_title: product.title,
      buyer_name,
      buyer_email,
      amount: Number(product.price ?? 0) * qty,
      quantity: qty,
      currency: product.currency ?? "HKD",
      status: "pending",
    };
  });

  const { error } = await supabase.from("egg_product_orders").insert(orders);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
