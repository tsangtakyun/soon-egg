import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  if (!supabase) return Response.json({ products: [] });

  const { data: profile } = await supabase.from("egg_creator_profiles").select("id").eq("username", username).single();

  if (!profile) return Response.json({ products: [] });

  const { data: products } = await supabase
    .from("egg_digital_products")
    .select("id, title, description, price, currency, product_type, thumbnail_url, external_url")
    .eq("creator_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return Response.json({ products: products ?? [] });
}
