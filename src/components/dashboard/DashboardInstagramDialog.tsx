"use client";

import { BarChart3, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { InstagramSyncButton } from "./InstagramSyncButton";

type Trend = { direction: "up" | "down" | "flat"; label: string } | null;
type Metric = { label: string; value: string; trend?: Trend };

export function DashboardInstagramDialog({
  engagement,
  followers,
  metrics,
  lastSyncedAt,
  platforms,
}: {
  engagement: string;
  followers: string;
  metrics: Metric[];
  lastSyncedAt?: string | null;
  platforms: Array<{
    label: string;
    handle: string | null;
    followers: number | null;
  }>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400"
        aria-haspopup="dialog"
      >
        <BarChart3 className="h-4 w-4 text-zinc-500" />
        Instagram <span className="text-zinc-400">·</span> {followers} 粉絲
        <span className="text-zinc-400">·</span> {engagement} 互動率
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="關閉 Instagram 數據"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="instagram-data-title"
            className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400">數據概覽</p>
                <h2
                  id="instagram-data-title"
                  className="mt-1 text-xl font-bold"
                >
                  社交數據
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200">
              {metrics.map((metric) => (
                <div key={metric.label} className="bg-white p-4">
                  <p className="text-xs text-zinc-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {metric.value}
                  </p>
                  {metric.trend ? (
                    <p
                      className={`mt-1 flex items-center gap-1 text-xs font-semibold ${metric.trend.direction === "up" ? "text-emerald-600" : metric.trend.direction === "down" ? "text-red-500" : "text-zinc-400"}`}
                    >
                      {metric.trend.direction === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : metric.trend.direction === "down" ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : null}
                      {metric.trend.label}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {platforms
                .filter((platform) => platform.handle)
                .map((platform) => (
                  <div
                    key={platform.label}
                    className="rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-600"
                  >
                    <span className="font-semibold text-zinc-900">
                      {platform.label}
                    </span>{" "}
                    {Number(platform.followers ?? 0) > 0
                      ? Number(platform.followers).toLocaleString()
                      : "已連接 · 暫無數據"}
                  </div>
                ))}
            </div>
            <InstagramSyncButton lastSyncedAt={lastSyncedAt} />
          </section>
        </div>
      ) : null}
    </>
  );
}
