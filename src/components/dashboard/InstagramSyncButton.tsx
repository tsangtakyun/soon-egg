"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResponse = {
  success?: boolean;
  followers?: number;
  engagement_rate?: number | null;
  engagement_sample_size?: number;
  engagement_unavailable_reason?: string | null;
  official_insights?: Record<string, number> | null;
  insights_unavailable_reason?: string | null;
  synced_at?: string;
  error?: string;
  needs_reconnect?: boolean;
};

export function InstagramSyncButton({ lastSyncedAt }: { lastSyncedAt?: string | null }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const syncInstagram = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/instagram/sync", { method: "POST" });
      const data = (await response.json()) as SyncResponse;

      if (!response.ok || !data.success) {
        setMessage(data.needs_reconnect ? "Instagram 授權已失效，請到設定重新連接。" : data.error || "暫時未能更新 Instagram 數據。");
        return;
      }

      const engagementMessage = data.engagement_rate !== null && data.engagement_rate !== undefined
        ? `，已按最近 ${data.engagement_sample_size ?? 0} 篇貼文更新互動率`
        : `；${data.engagement_unavailable_reason || "暫時未能計算互動率"}`;
      const insightsMessage = data.official_insights
        ? "，官方 Reach insights 已更新"
        : "；官方 Reach 需要重新授權 Insights 權限";
      setMessage(`已更新至 ${Number(data.followers ?? 0).toLocaleString()} 位粉絲${engagementMessage}${insightsMessage}。`);
      router.refresh();
    } catch {
      setMessage("網絡連線失敗，請稍後再試。");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-700">Instagram 數據</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {lastSyncedAt ? `上次更新：${formatSyncTime(lastSyncedAt)}` : "尚未記錄同步時間"}
          </p>
        </div>
        <button
          type="button"
          onClick={syncInstagram}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          {syncing ? "更新中…" : "更新 Instagram 數據"}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-zinc-400">
        互動率按最近最多 12 篇貼文嘅平均讚好及留言，相對粉絲數計算。每日保留快照，累積至少兩日後顯示升跌趨勢。
      </p>
      {message ? <p className="mt-2 text-xs leading-5 text-zinc-600" role="status">{message}</p> : null}
      {message?.includes("重新授權 Insights") ? (
        <Link href="/api/auth/instagram" className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700">
          重新連接 Instagram 並授權 Insights →
        </Link>
      ) : null}
    </div>
  );
}

function formatSyncTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時間不詳";

  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong",
  }).format(date);
}
