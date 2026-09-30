import Link from "next/link";
import { EggCommandCenter } from "@/components/dashboard/EggCommandCenter";
import { DashboardInstagramDialog } from "@/components/dashboard/DashboardInstagramDialog";
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
  facebook_handle: string | null;
  facebook_followers: number | null;
  threads_handle: string | null;
  threads_followers: number | null;
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
  facebook_handle: null,
  facebook_followers: 0,
  threads_handle: null,
  threads_followers: 0,
  youtube_handle: null,
  youtube_subscribers: 0,
  xiaohongshu_followers: 0,
  tiktok_followers: 0,
  ai_profile_summary:
    "連接 Instagram、Facebook 或 YouTube 後，SOON AI 會在這裡整理您的公開資料與受眾數據。",
  onboarding_completed: false,
  audience_demographics: null,
};

export default async function DashboardHome() {
  let creator = fallbackProfile;
  let instagramSnapshots: InstagramSnapshot[] = [];

  const { user, activeWorkspace, admin } = await getCreatorWorkspaceContext();
  if (user && activeWorkspace && admin) {
    const { data: profile } = await admin
      .from("egg_creator_profiles")
      .select(
        `
          id,
          username,
          display_name,
          bio,
          avatar_url,
          instagram_handle,
          instagram_followers,
          instagram_engagement_rate,
          facebook_handle,
          facebook_followers,
          threads_handle,
          threads_followers,
          youtube_handle,
          youtube_subscribers,
          xiaohongshu_followers,
          tiktok_followers,
          ai_profile_summary,
          onboarding_completed,
          audience_demographics
        `,
      )
      .eq("id", activeWorkspace.id)
      .maybeSingle();

    if (profile) {
      creator = profile as CreatorProfile;

      const { data: snapshotRows } = await admin
        .from("egg_instagram_metric_snapshots")
        .select("followers,engagement_rate,reach_7d,captured_at")
        .eq("creator_id", profile.id)
        .order("captured_at", { ascending: false })
        .limit(8);
      instagramSnapshots = (snapshotRows ?? []) as InstagramSnapshot[];
    }
  }

  const displayName = creator.display_name || creator.username;
  const avatarUrl = creator.avatar_url || "/soon-egg.png";
  const engagement =
    creator.instagram_engagement_rate !== null
      ? `${creator.instagram_engagement_rate.toFixed(2)}%`
      : "未有數據";
  const instagramSync = getInstagramSync(creator.audience_demographics);
  const previousSnapshot =
    instagramSnapshots.length > 1 ? instagramSnapshots[1] : null;
  const followerTrend = previousSnapshot
    ? countTrend(creator.instagram_followers ?? 0, previousSnapshot.followers)
    : null;
  const engagementTrend =
    previousSnapshot &&
    creator.instagram_engagement_rate !== null &&
    previousSnapshot.engagement_rate !== null
      ? percentagePointTrend(
          creator.instagram_engagement_rate,
          previousSnapshot.engagement_rate,
        )
      : null;
  const reachTrend =
    previousSnapshot &&
    instagramSync.reach7d !== null &&
    previousSnapshot.reach_7d !== null
      ? countTrend(instagramSync.reach7d, previousSnapshot.reach_7d)
      : null;
  return (
    <>
      <DashboardShareHeader username={creator.username} />
      <div className="px-4 py-6 sm:px-6">
        <EggCommandCenter />

        <section className="flex flex-col gap-4 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <CreatorAvatar
              avatarUrl={avatarUrl}
              creatorName={displayName}
              className="h-11 w-11"
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-zinc-950">
                {displayName}
              </h2>
              <p className="text-xs text-zinc-500">@{creator.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardInstagramDialog
              engagement={engagement}
              followers={formatCompact(creator.instagram_followers ?? 0)}
              lastSyncedAt={instagramSync.syncedAt}
              platforms={[
                {
                  label: "Instagram",
                  handle: creator.instagram_handle,
                  followers: creator.instagram_followers,
                },
                {
                  label: "Facebook",
                  handle: creator.facebook_handle,
                  followers: creator.facebook_followers,
                },
                {
                  label: "Threads",
                  handle: creator.threads_handle,
                  followers: creator.threads_followers,
                },
              ]}
              metrics={[
                {
                  label: "Instagram 粉絲",
                  value: formatExactNumber(creator.instagram_followers ?? 0),
                  trend: followerTrend,
                },
                {
                  label: instagramSync.sampleSize
                    ? `近 ${instagramSync.sampleSize} 篇互動率`
                    : "互動率",
                  value: engagement,
                  trend: engagementTrend,
                },
                {
                  label: "7 日觸及",
                  value:
                    instagramSync.reach7d === null
                      ? "待授權"
                      : formatCompact(instagramSync.reach7d),
                  trend: reachTrend,
                },
                {
                  label: "7 日互動帳戶",
                  value:
                    instagramSync.accountsEngaged7d === null
                      ? "待授權"
                      : formatCompact(instagramSync.accountsEngaged7d),
                },
              ]}
            />
            <Link
              href="/profile"
              className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
            >
              創作者檔案
            </Link>
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

function formatExactNumber(value: number) {
  return new Intl.NumberFormat("zh-HK", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getInstagramSync(value: Record<string, unknown> | null) {
  const sync = value?.instagram_sync;
  if (!sync || typeof sync !== "object" || Array.isArray(sync)) {
    return {
      syncedAt: null,
      sampleSize: 0,
      reach7d: null,
      accountsEngaged7d: null,
    };
  }

  const record = sync as Record<string, unknown>;
  return {
    syncedAt: typeof record.synced_at === "string" ? record.synced_at : null,
    sampleSize:
      typeof record.engagement_sample_size === "number"
        ? record.engagement_sample_size
        : 0,
    reach7d: typeof record.reach_7d === "number" ? record.reach_7d : null,
    accountsEngaged7d:
      typeof record.accounts_engaged_7d === "number"
        ? record.accounts_engaged_7d
        : null,
  };
}

function countTrend(current: number, previous: number): MetricTrend {
  const difference = current - previous;
  const percentage =
    previous > 0 ? Math.abs((difference / previous) * 100).toFixed(1) : "0.0";
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
