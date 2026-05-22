import { BrandCard } from "@/components/brand-deals/BrandCard";
import { PitchDrafter } from "@/components/brand-deals/PitchDrafter";
import { demoBrandMatches } from "@/lib/mock-data";

export default function BrandDealsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">品牌合作</h1>
        <p className="mt-2 text-zinc-500">AI 根據內容類別、地區、粉絲量和品牌市場，選出最適合的亞洲品牌。</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {demoBrandMatches.slice(0, 6).map((match) => (
          <BrandCard key={match.brand.id} brand={match.brand} score={match.match_score} reason={match.reason_zh} />
        ))}
      </div>
      <PitchDrafter />
    </div>
  );
}
