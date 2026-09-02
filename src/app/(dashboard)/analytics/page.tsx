import { Activity, Eye, Heart, MessageCircle, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import {
  InstagramTrendChart,
  type InstagramTrendPoint,
} from "@/components/analytics/InstagramTrendChart";
import { InstagramSyncButton } from "@/components/dashboard/InstagramSyncButton";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";

type InstagramSyncData = {
  synced_at?: string;
  engagement_sample_size?: number;
  reach_7d?: number | null;
  accounts_engaged_7d?: number | null;
  total_interactions_7d?: number | null;
};
type Profile = {
  id: string;
  instagram_handle: string | null;
  instagram_followers: number | null;
  instagram_engagement_rate: number | null;
  audience_demographics: Record<string, unknown> | null;
};
type Snapshot = {
  snapshot_date: string;
  followers: number;
  engagement_rate: number | null;
  reach_7d: number | null;
};
type InstagramMedia = {
  id: string;
  media_type: string | null;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  views: number | null;
  reach: number | null;
  plays: number | null;
  total_interactions: number | null;
  like_count: number | null;
  comments_count: number | null;
  published_at: string | null;
};

export default async function AnalyticsPage() {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { activeWorkspace } = await getCreatorWorkspaceContext();
  const { data: profileData } = await admin
    .from("egg_creator_profiles")
    .select(
      "id,instagram_handle,instagram_followers,instagram_engagement_rate,audience_demographics",
    )
    .eq("id", activeWorkspace?.id ?? "")
    .single();
  const profile = profileData as Profile | null;
  if (!profile) redirect("/login");

  const [{ data: snapshotData }, { data: mediaData }] = await Promise.all([
    admin
      .from("egg_instagram_metric_snapshots")
      .select("snapshot_date,followers,engagement_rate,reach_7d")
      .eq("creator_id", profile.id)
      .order("snapshot_date", { ascending: true })
      .limit(30),
    admin
      .from("egg_instagram_media")
      .select(
        "id,media_type,caption,permalink,media_url,thumbnail_url,views,reach,plays,total_interactions,like_count,comments_count,published_at",
      )
      .eq("creator_id", profile.id)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  const sync = readInstagramSync(profile.audience_demographics);
  const topMedia = ((mediaData ?? []) as InstagramMedia[])
    .toSorted((a, b) => performanceValue(b) - performanceValue(a))
    .slice(0, 5);
  const trendData: InstagramTrendPoint[] = (
    (snapshotData ?? []) as Snapshot[]
  ).map((item) => ({
    date: new Intl.DateTimeFormat("zh-HK", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Hong_Kong",
    }).format(new Date(`${item.snapshot_date}T00:00:00Z`)),
    followers: Number(item.followers ?? 0),
    reach: item.reach_7d,
    engagementRate: item.engagement_rate,
  }));

  return (
    <div className="space-y-6 bg-[#f7f7f8] pt-[10vh]">
      <header className="lg:ml-[10%]">
        <h1 className="text-3xl font-black text-zinc-950">社交平台數據分析</h1>
        <p className="mt-2 text-zinc-500">
          集中查看已連接社交平台嘅受眾、觸及、互動及內容表現。
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Instagram · @{profile.instagram_handle ?? "尚未連接"}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Instagram 粉絲"
          value={formatNumber(profile.instagram_followers)}
          sub="目前追蹤人數"
          icon={Users}
          color="bg-pink-500"
        />
        <KpiCard
          label="平均互動率"
          value={
            profile.instagram_engagement_rate == null
              ? "—"
              : `${Number(profile.instagram_engagement_rate).toFixed(2)}%`
          }
          sub={`最近 ${sync.engagement_sample_size ?? 0} 篇內容`}
          icon={Heart}
          color="bg-rose-500"
        />
        <KpiCard
          label="7 日觸及"
          value={formatNumber(sync.reach_7d)}
          sub="Meta 官方 Reach"
          icon={Eye}
          color="bg-violet-500"
        />
        <KpiCard
          label="7 日互動帳戶"
          value={formatNumber(sync.accounts_engaged_7d)}
          sub="Accounts engaged"
          icon={Activity}
          color="bg-blue-500"
        />
        <KpiCard
          label="7 日總互動"
          value={formatNumber(sync.total_interactions_7d)}
          sub="Meta 官方互動"
          icon={MessageCircle}
          color="bg-emerald-500"
        />
      </section>

      <InstagramTrendChart data={trendData} />

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              表現最佳內容
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              按觀看／播放／觸及排序，最多顯示 5 篇。
            </p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            真實 Meta 數據
          </span>
        </div>
        <div className="mt-4 divide-y">
          {topMedia.length ? (
            topMedia.map((media, index) => (
              <MediaRow key={media.id} media={media} rank={index + 1} />
            ))
          ) : (
            <p className="py-12 text-center text-sm text-zinc-400">
              尚未有 Instagram 內容數據
            </p>
          )}
        </div>
      </section>

      <InstagramSyncButton lastSyncedAt={sync.synced_at ?? null} />
      <p className="text-xs leading-5 text-zinc-400">
        目前數據來源：已授權嘅 Instagram Professional 帳戶及 Meta Graph
        API。每日自動同步一次；手動更新會即時刷新。Threads 會喺完成獨立授權及
        Insights 接駁後加入同一頁，未接通前唔會顯示模擬數據。
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
          <p className="mt-1 text-xs text-zinc-400">{sub}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={18} className="text-white" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function MediaRow({ media, rank }: { media: InstagramMedia; rank: number }) {
  const interactions =
    media.total_interactions ??
    Number(media.like_count ?? 0) + Number(media.comments_count ?? 0);
  const primary = media.views ?? media.plays ?? media.reach;
  const primaryLabel =
    media.views != null
      ? "觀看"
      : media.plays != null
        ? "播放"
        : media.reach != null
          ? "觸及"
          : "互動";
  const image = media.thumbnail_url || media.media_url;
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="w-5 shrink-0 text-center text-xs font-bold text-zinc-300">
        {rank}
      </span>
      {image ? (
        <>
          {/* Instagram CDN URLs are dynamic and cannot be allow-listed safely. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl bg-zinc-100 object-cover"
          />
        </>
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-xl bg-zinc-100" />
      )}
      <div className="min-w-0 flex-1">
        {media.permalink ? (
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-sm font-medium text-zinc-800 hover:underline"
          >
            {media.caption || "查看 Instagram 內容"}
          </a>
        ) : (
          <p className="line-clamp-2 text-sm font-medium text-zinc-800">
            {media.caption || "Instagram 內容"}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-400">
          {mediaTypeLabel(media.media_type)} · {formatDate(media.published_at)}
        </p>
      </div>
      <div className="hidden shrink-0 grid-cols-3 gap-5 text-right sm:grid">
        <Metric label={primaryLabel} value={primary} />
        <Metric label="觸及" value={media.reach} />
        <Metric label="互動" value={interactions} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-800">
        {formatNumber(value)}
      </p>
    </div>
  );
}
function readInstagramSync(
  value: Record<string, unknown> | null,
): InstagramSyncData {
  if (!value || Array.isArray(value)) return {};
  const sync = value.instagram_sync;
  return sync && typeof sync === "object" && !Array.isArray(sync)
    ? (sync as InstagramSyncData)
    : {};
}
function performanceValue(media: InstagramMedia) {
  return Number(
    media.views ??
      media.plays ??
      media.reach ??
      media.total_interactions ??
      (media.like_count ?? 0) + (media.comments_count ?? 0),
  );
}
function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toLocaleString("zh-HK");
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("zh-HK", {
        dateStyle: "medium",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(value))
    : "日期不詳";
}
function mediaTypeLabel(type: string | null) {
  if (type === "VIDEO") return "Reel／影片";
  if (type === "CAROUSEL_ALBUM") return "輪播貼文";
  if (type === "IMAGE") return "圖片貼文";
  return "Instagram 內容";
}
