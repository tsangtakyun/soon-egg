import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type CreatorProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  product_type: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
};

const typeLabel: Record<string, string> = {
  physical: "實體貨品",
  digital: "數碼產品",
  service: "服務",
  workshop: "工作坊",
  other: "其他",
};

const typeIcon: Record<string, string> = {
  physical: "📦",
  digital: "💾",
  service: "🛎️",
  workshop: "🎓",
  other: "🛍️",
};

export default async function PublicShopPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: profileData } = await supabase
    .from("egg_creator_profiles")
    .select("id, username, display_name, bio, avatar_url, cover_url")
    .eq("username", username)
    .eq("is_public", true)
    .single();

  const profile = profileData as CreatorProfile | null;
  if (!profile) notFound();

  const { data } = await supabase
    .from("egg_digital_products")
    .select("id, title, description, price, currency, product_type, thumbnail_url, external_url")
    .eq("creator_id", profile.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Product[];
  const displayName = profile.display_name ?? profile.username;

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-950">
      <header
        className="relative flex min-h-72 items-end overflow-hidden px-6 py-10 md:px-12"
        style={{
          background: profile.cover_url ? `url(${profile.cover_url}) center/cover` : "linear-gradient(135deg, #111827, #334155)",
        }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative flex items-end gap-5">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-white/20 text-3xl font-semibold text-white">
              {displayName[0]}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Shop</p>
            <h1 className="mt-1 text-3xl font-bold text-white">{displayName}</h1>
            {profile.bio && <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{profile.bio}</p>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-12">
        {products.length === 0 ? (
          <div className="rounded-2xl border bg-white py-20 text-center">
            <p className="text-sm text-zinc-400">暫未有貨品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <PublicProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PublicProductCard({ product }: { product: Product }) {
  const kind = product.product_type ?? "other";
  const icon = typeIcon[kind] ?? typeIcon.other;

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      {product.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.thumbnail_url} className="h-48 w-full object-cover" alt={product.title} />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-gray-50 text-5xl">{icon}</div>
      )}
      <div className="p-4">
        <span className="text-xs uppercase tracking-wide text-gray-400">{typeLabel[kind] ?? typeLabel.other}</span>
        <h3 className="mt-1 text-base font-semibold">{product.title}</h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-base font-bold">{Number(product.price ?? 0) > 0 ? `${product.currency ?? "HKD"} ${product.price}` : "免費"}</span>
          {product.external_url && (
            <a
              href={product.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              立即購買
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
