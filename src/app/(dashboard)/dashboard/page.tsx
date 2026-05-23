import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, DollarSign, Sparkles, UserRound } from "lucide-react";
import { BrandCard } from "@/components/brand-deals/BrandCard";
import { DashboardShareHeader } from "@/components/ui/DashboardShareHeader";
import { createClient } from "@/lib/supabase/server";
import { demoBrandMatches } from "@/lib/mock-data";

type CreatorProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  instagram_followers: number | null;
  instagram_engagement_rate: number | null;
  youtube_handle: string | null;
  youtube_subscribers: number | null;
  xiaohongshu_followers: number | null;
  tiktok_followers: number | null;
  ai_profile_summary: string | null;
};

const fallbackProfile: CreatorProfile = {
  id: "fallback",
  username: "soon_egg",
  display_name: "SOON-EGG",
  bio: "完成 onboarding 後，這裡會顯示您的創作者資料。",
  avatar_url: "/soon-egg.png",
  instagram_handle: null,
  instagram_followers: 0,
  instagram_engagement_rate: null,
  youtube_handle: null,
  youtube_subscribers: 0,
  xiaohongshu_followers: 0,
  tiktok_followers: 0,
  ai_profile_summary: "連接 Instagram、Facebook 或 YouTube 後，SOON AI 會在這裡整理您的公開資料與受眾數據。",
};

export default async function DashboardHome() {
  const supabase = await createClient();
  let creator = fallbackProfile;
  let dealsCount = 0;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("egg_creator_profiles")
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          instagram_handle,
          instagram_followers,
          instagram_engagement_rate,
          youtube_handle,
          youtube_subscribers,
          xiaohongshu_followers,
          tiktok_followers,
          ai_profile_summary
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        creator = profile as CreatorProfile;

        const { count } = await supabase
          .from("egg_brand_deals")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", profile.id);

        dealsCount = count ?? 0;
      }
    }
  }

  const displayName = creator.display_name || creator.username;
  const avatarUrl = creator.avatar_url || "/soon-egg.png";
  const reachSources: Array<number | null> = [
    creator.instagram_followers,
    creator.youtube_subscribers,
    creator.xiaohongshu_followers,
    creator.tiktok_followers,
  ];
  const reach = reachSources.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const engagement = creator.instagram_engagement_rate ? `${creator.instagram_engagement_rate.toFixed(1)}%` : "未有數據";
  const summary = creator.ai_profile_summary || creator.bio || "完成 onboarding 後，這裡會顯示您的創作者定位。";

  return (
    <>
      <DashboardShareHeader username={creator.username} />
      <div className="space-y-6 px-6 py-6">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div
            className="relative overflow-hidden rounded-2xl text-white"
            style={{
              backgroundImage: "url(/hero-bg.jpg)",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative z-10 p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                <Sparkles className="h-4 w-4" aria-hidden />
                SOON-EGG Creator Network
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">亞洲創作者的品牌合作與變現中樞</h1>
              <p className="mt-4 max-w-2xl text-white">SOON AI 幫你整理社交數據、生成 Media Kit、配對 HK/TW/SG 品牌，並起草繁體中文 pitch。</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950">
                  開始 onboarding
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href={`/${creator.username}`} className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white">
                  查看公開主頁
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt={displayName} className="h-16 w-16 rounded-full bg-zinc-100 object-cover" />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-zinc-950">{displayName}</h2>
                <p className="text-sm text-zinc-500">@{creator.username}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">{summary}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric icon={UserRound} label="Reach" value={formatCompact(reach)} />
              <Metric icon={ChartNoAxesCombined} label="Engagement" value={engagement} />
              <Metric icon={BriefcaseBusiness} label="Deals" value={String(dealsCount)} />
              <Metric icon={DollarSign} label="Total Earnings" value="US$0" />
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
    </>
  );
}

function formatCompact(value: number) {
  if (!value) return "0";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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
