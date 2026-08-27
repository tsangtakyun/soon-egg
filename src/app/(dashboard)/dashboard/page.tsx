import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Check, Circle, Link2, UserRound } from "lucide-react";
import { BrandCard } from "@/components/brand-deals/BrandCard";
import { DashboardShareHeader } from "@/components/ui/DashboardShareHeader";
import { CreatorAvatar } from "@/components/ui/CreatorAvatar";
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
  onboarding_completed: boolean | null;
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
  onboarding_completed: false,
};

export default async function DashboardHome() {
  const supabase = await createClient();
  let creator = fallbackProfile;
  let dealsCount = 0;
  let pendingInvitations = 0;

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
          ai_profile_summary,
          onboarding_completed
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        creator = profile as CreatorProfile;

        const [{ count: dealTotal }, { count: invitationTotal }] = await Promise.all([
          supabase.from("egg_brand_deals").select("id", { count: "exact", head: true }).eq("creator_id", profile.id),
          supabase
            .from("egg_brand_invitations")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", profile.id)
            .eq("status", "pending"),
        ]);

        dealsCount = dealTotal ?? 0;
        pendingInvitations = invitationTotal ?? 0;
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
  const connectedPlatforms = [
    Boolean(creator.instagram_handle || creator.instagram_followers),
    Boolean(creator.youtube_handle || creator.youtube_subscribers),
    Boolean(creator.xiaohongshu_followers),
    Boolean(creator.tiktok_followers),
  ].filter(Boolean).length;
  const summary = creator.ai_profile_summary || creator.bio || "完成 onboarding 後，這裡會顯示您的創作者定位。";
  const hasSocialProfile = connectedPlatforms > 0;
  const setupSteps = [
    { done: Boolean(creator.onboarding_completed), label: "完成基本創作者設定", href: "/onboarding" },
    { done: hasSocialProfile, label: "連接或填寫社交平台", href: "/onboarding" },
    { done: Boolean(creator.bio && creator.avatar_url), label: "完善公開創作者檔案", href: "/profile" },
  ];
  return (
    <>
      <DashboardShareHeader username={creator.username} />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-zinc-950">設定進度</h2>
                <p className="mt-1 text-xs text-zinc-500">完成後，品牌可以更快了解你是否適合合作。</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {setupSteps.filter((step) => step.done).length}/{setupSteps.length}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {setupSteps.map((step) => (
                <Link key={step.label} href={step.href} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-3 text-xs text-zinc-700 hover:bg-zinc-100">
                  {step.done ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-zinc-300" />}
                  {step.label}
                </Link>
              ))}
            </div>
          </div>

          <Link href="/brand-deals" className="group rounded-xl border border-zinc-200 bg-zinc-950 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-white/60">待處理合作</p>
                <p className="mt-2 text-3xl font-black">{pendingInvitations}</p>
                <p className="mt-2 text-sm text-white/75">查看品牌邀請、申請狀態及合作機會。</p>
              </div>
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </Link>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">你的創作者空間</p>
              <div className="flex items-center gap-4">
                <CreatorAvatar avatarUrl={avatarUrl} creatorName={displayName} className="h-16 w-16" />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-zinc-950">{displayName}</h2>
                  <p className="text-sm text-zinc-500">@{creator.username}</p>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">{summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/profile" className="rounded-lg border border-zinc-200 px-4 py-2 text-center text-xs font-semibold text-zinc-700 hover:bg-zinc-50">編輯檔案</Link>
                <Link href={`/${creator.username}`} className="rounded-lg bg-zinc-950 px-4 py-2 text-center text-xs font-semibold text-white">預覽公開頁</Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric icon={UserRound} label="總粉絲數" value={formatCompact(reach)} />
              <Metric icon={ChartNoAxesCombined} label="Instagram 互動率" value={engagement} />
              <Metric icon={BriefcaseBusiness} label="合作項目" value={String(dealsCount)} />
              <Metric icon={Link2} label="已連接平台" value={String(connectedPlatforms)} />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-950">品牌配對示範</h2>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">非真實邀請</span>
            </div>
            <Link href="/brand-deals" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">查看全部</Link>
          </div>
          <p className="mb-4 text-xs leading-5 text-zinc-500">以下品牌及配對分數只用作展示介面，並非 AI 分析結果或真實合作邀請。真實邀請會顯示於「品牌合作」。</p>
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
