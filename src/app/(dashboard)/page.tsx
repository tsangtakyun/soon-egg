import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Sparkles, UserRound } from "lucide-react";
import { BrandCard } from "@/components/brand-deals/BrandCard";
import { demoBrandMatches, demoCreator } from "@/lib/mock-data";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg bg-zinc-950 p-6 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
            <Sparkles className="h-4 w-4" aria-hidden />
            SOON-EGG Creator Network
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">亞洲創作者的品牌合作與變現中樞</h1>
          <p className="mt-4 max-w-2xl text-white/70">MOON AI 幫你整理社交數據、生成 Media Kit、配對 HK/TW/SG 品牌，並起草繁體中文 pitch。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950">
              開始 onboarding
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/soon_egg" className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white">
              查看公開主頁
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Image src={demoCreator.avatar_url ?? ""} alt={demoCreator.display_name} width={64} height={64} unoptimized className="h-16 w-16 rounded-full bg-zinc-100" />
            <div>
              <h2 className="text-xl font-bold text-zinc-950">{demoCreator.display_name}</h2>
              <p className="text-sm text-zinc-500">@{demoCreator.username}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-600">{demoCreator.ai_profile_summary}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric icon={UserRound} label="Reach" value="103.5K" />
            <Metric icon={ChartNoAxesCombined} label="Engagement" value="5.8%" />
            <Metric icon={BriefcaseBusiness} label="Deals" value="8" />
            <Metric icon={Sparkles} label="AI Credits" value="300" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-950">推薦品牌配對</h2>
          <Link href="/brand-deals" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">查看全部</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {demoBrandMatches.slice(0, 3).map((match) => (
            <BrandCard key={match.brand.id} brand={match.brand} score={match.match_score} reason={match.reason_zh} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs text-zinc-500">{label}</div>
      <div className="font-mono text-xl font-semibold text-zinc-950">{value}</div>
    </div>
  );
}
