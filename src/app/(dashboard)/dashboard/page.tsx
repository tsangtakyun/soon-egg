import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Check, Circle, Lightbulb, Link2, Minus, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { InstagramSyncButton } from "@/components/dashboard/InstagramSyncButton";
import { DashboardShareHeader } from "@/components/ui/DashboardShareHeader";
import { CreatorAvatar } from "@/components/ui/CreatorAvatar";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

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
  audience_demographics: Record<string, unknown> | null;
};

type InstagramSnapshot = {
  followers: number;
  engagement_rate: number | null;
  reach_7d: number | null;
  captured_at: string;
};

type MetricTrend = {
  direction: "up" | "down" | "flat";
  label: string;
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
  audience_demographics: null,
};

export default async function DashboardHome() {
  let creator = fallbackProfile;
  let dealsCount = 0;
  let pendingInvitations = 0;
  let instagramSnapshots: InstagramSnapshot[] = [];

  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (user && activeWorkspace && admin) {
      const { data: profile } = await admin
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
          onboarding_completed,
          audience_demographics
        `)
        .eq("id", activeWorkspace.id)
        .maybeSingle();

      if (profile) {
        creator = profile as CreatorProfile;

        const [{ count: dealTotal }, { count: invitationTotal }, { data: snapshotRows }] = await Promise.all([
          admin.from("egg_brand_deals").select("id", { count: "exact", head: true }).eq("creator_id", profile.id),
          admin
            .from("egg_brand_invitations")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", profile.id)
            .eq("status", "pending"),
          admin
            .from("egg_instagram_metric_snapshots")
            .select("followers,engagement_rate,reach_7d,captured_at")
            .eq("creator_id", profile.id)
            .order("captured_at", { ascending: false })
            .limit(8),
        ]);

        dealsCount = dealTotal ?? 0;
        pendingInvitations = invitationTotal ?? 0;
        instagramSnapshots = (snapshotRows ?? []) as InstagramSnapshot[];
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
  const engagement = creator.instagram_engagement_rate !== null ? `${creator.instagram_engagement_rate.toFixed(2)}%` : "未有數據";
  const connectedPlatforms = [
    Boolean(creator.instagram_handle || creator.instagram_followers),
    Boolean(creator.youtube_handle || creator.youtube_subscribers),
    Boolean(creator.xiaohongshu_followers),
    Boolean(creator.tiktok_followers),
  ].filter(Boolean).length;
  const summary = creator.ai_profile_summary || creator.bio || "完成 onboarding 後，這裡會顯示您的創作者定位。";
  const hasSocialProfile = connectedPlatforms > 0;
  const instagramSync = getInstagramSync(creator.audience_demographics);
  const previousSnapshot = instagramSnapshots.length > 1 ? instagramSnapshots[instagramSnapshots.length - 1] : null;
  const followerTrend = previousSnapshot ? countTrend(creator.instagram_followers ?? 0, previousSnapshot.followers) : null;
  const engagementTrend = previousSnapshot && creator.instagram_engagement_rate !== null && previousSnapshot.engagement_rate !== null
    ? percentagePointTrend(creator.instagram_engagement_rate, previousSnapshot.engagement_rate)
    : null;
  const reachTrend = previousSnapshot && instagramSync.reach7d !== null && previousSnapshot.reach_7d !== null
    ? countTrend(instagramSync.reach7d, previousSnapshot.reach_7d)
    : null;
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
          <Link href="/topic-library" className="group rounded-xl border border-amber-200 bg-amber-50 p-5 md:col-span-2">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-amber-700">每日更新</p><h2 className="mt-2 text-xl font-black text-zinc-950">題材靈感</h2><p className="mt-2 text-sm text-zinc-600">瀏覽 SOON 為你整理嘅新題材，收藏或者直接開始寫劇本。</p></div><Lightbulb className="h-6 w-6 text-amber-600 transition-transform group-hover:rotate-6" /></div>
          </Link>
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
              <InstagramSyncButton lastSyncedAt={instagramSync.syncedAt} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric icon={UserRound} label="總粉絲數" value={formatCompact(reach)} trend={followerTrend} />
              <Metric
                icon={ChartNoAxesCombined}
                label={instagramSync.sampleSize ? `IG 近 ${instagramSync.sampleSize} 篇互動率` : "Instagram 互動率"}
                value={engagement}
                trend={engagementTrend}
              />
              <Metric icon={UserRound} label="Meta 7 日觸及" value={instagramSync.reach7d === null ? "待授權" : formatCompact(instagramSync.reach7d)} trend={reachTrend} />
              <Metric icon={ChartNoAxesCombined} label="Meta 7 日互動帳戶" value={instagramSync.accountsEngaged7d === null ? "待授權" : formatCompact(instagramSync.accountsEngaged7d)} />
              <Metric icon={BriefcaseBusiness} label="合作項目" value={String(dealsCount)} />
              <Metric icon={Link2} label="已連接平台" value={String(connectedPlatforms)} />
            </div>
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

function getInstagramSync(value: Record<string, unknown> | null) {
  const sync = value?.instagram_sync;
  if (!sync || typeof sync !== "object" || Array.isArray(sync)) {
    return { syncedAt: null, sampleSize: 0, reach7d: null, accountsEngaged7d: null };
  }

  const record = sync as Record<string, unknown>;
  return {
    syncedAt: typeof record.synced_at === "string" ? record.synced_at : null,
    sampleSize: typeof record.engagement_sample_size === "number" ? record.engagement_sample_size : 0,
    reach7d: typeof record.reach_7d === "number" ? record.reach_7d : null,
    accountsEngaged7d: typeof record.accounts_engaged_7d === "number" ? record.accounts_engaged_7d : null,
  };
}

function countTrend(current: number, previous: number): MetricTrend {
  const difference = current - previous;
  const percentage = previous > 0 ? Math.abs((difference / previous) * 100).toFixed(1) : "0.0";
  return {
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "flat",
    label: `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${formatCompact(Math.abs(difference))} (${percentage}%)`,
  };
}

function percentagePointTrend(current: number, previous: number): MetricTrend {
  const difference = Number((current - previous).toFixed(2));
  return {
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "flat",
    label: `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${Math.abs(difference).toFixed(2)}pp`,
  };
}

function Metric({ icon: Icon, label, value, trend }: { icon: React.ElementType; label: string; value: string; trend?: MetricTrend | null }) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendClass = trend?.direction === "up"
    ? "text-emerald-600"
    : trend?.direction === "down"
      ? "text-rose-600"
      : "text-zinc-400";

  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
      <div className="mt-3 text-xs text-zinc-500">{label}</div>
      <div className="font-mono text-xl font-semibold text-zinc-950">{value}</div>
      {trend ? (
        <div className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${trendClass}`}>
          <TrendIcon className="h-3 w-3" aria-hidden />
          {trend.label}
        </div>
      ) : null}
    </div>
  );
}
