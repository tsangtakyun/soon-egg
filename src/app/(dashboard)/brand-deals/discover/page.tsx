import { BrandCard } from "@/components/brand-deals/BrandCard";
import { ASIAN_BRANDS } from "@/lib/seed-brands";

export default function DiscoverBrandsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">探索品牌</h1>
        <p className="mt-2 text-zinc-500">香港、台灣、新加坡與泛亞洲品牌資料庫。</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {ASIAN_BRANDS.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
    </div>
  );
}
