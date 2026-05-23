import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type CheckoutItem = {
  productId: string;
  qty: number;
  price: number;
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

  const orders = items.map((item) => ({
    product_id: item.productId,
    buyer_name,
    buyer_email,
    amount: item.price * item.qty,
    quantity: item.qty,
    currency: "HKD",
    status: "pending",
  }));

  const { error } = await supabase.from("egg_product_orders").insert(orders);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
