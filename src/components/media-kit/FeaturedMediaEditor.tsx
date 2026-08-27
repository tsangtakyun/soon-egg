"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type InstagramMedia = {
  id: string;
  media_type: string | null;
  media_product_type: string | null;
  caption: string | null;
  permalink: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  views: number | null;
  reach: number | null;
  plays: number | null;
  like_count: number;
  comments_count: number;
  is_featured: boolean;
  sort_order: number;
};

function metric(media: InstagramMedia) {
  const value = media.views ?? media.plays ?? media.reach ?? (media.like_count + media.comments_count);
  const label = media.views != null ? "觀看" : media.plays != null ? "播放" : media.reach != null ? "觸及" : "互動";
  return `${value.toLocaleString()} ${label}`;
}

export function FeaturedMediaEditor({ profileId, onPreviewChange }: { profileId: string; onPreviewChange: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("egg_instagram_media")
      .select("*")
      .eq("creator_id", profileId)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });
    setLoading(false);
    if (loadError) setError(loadError.message);
    else setItems((data ?? []) as InstagramMedia[]);
  }, [profileId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function sync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/instagram/sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "同步失敗");
      await load();
      setMessage("Instagram 內容已更新。你可以揀最多 3 個公開展示。 ");
      onPreviewChange();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "同步失敗，請稍後重試。");
    } finally {
      setSyncing(false);
    }
  }

  async function toggleFeatured(item: InstagramMedia) {
    const featured = items.filter((candidate) => candidate.is_featured);
    if (!item.is_featured && featured.length >= 3) {
      setError("最多只可以展示 3 個 Instagram 作品；請先取消其中一個。");
      return;
    }
    setSavingId(item.id);
    setError(null);
    const previous = items;
    const nextOrder = item.is_featured ? item.sort_order : featured.length;
    setItems((current) => current.map((candidate) => candidate.id === item.id
      ? { ...candidate, is_featured: !item.is_featured, sort_order: nextOrder }
      : candidate));
    const { error: updateError } = await supabase
      .from("egg_instagram_media")
      .update({ is_featured: !item.is_featured, sort_order: nextOrder })
      .eq("id", item.id)
      .eq("creator_id", profileId);
    if (updateError) {
      setItems(previous);
      setError(`未能儲存：${updateError.message}`);
    } else {
      setMessage("已儲存精選內容。");
      onPreviewChange();
    }
    setSavingId(null);
  }

  async function move(item: InstagramMedia, direction: -1 | 1) {
    const featured = items.filter((candidate) => candidate.is_featured).toSorted((a, b) => a.sort_order - b.sort_order);
    const index = featured.findIndex((candidate) => candidate.id === item.id);
    const swapWith = featured[index + direction];
    if (!swapWith) return;
    setSavingId(item.id);
    setError(null);
    const results = await Promise.all([
      supabase.from("egg_instagram_media").update({ sort_order: swapWith.sort_order }).eq("id", item.id).eq("creator_id", profileId),
      supabase.from("egg_instagram_media").update({ sort_order: item.sort_order }).eq("id", swapWith.id).eq("creator_id", profileId),
    ]);
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) setError(`未能調整排序：${updateError.message}`);
    else {
      await load();
      setMessage("排序已儲存。");
      onPreviewChange();
    }
    setSavingId(null);
  }

  const featured = items.filter((item) => item.is_featured).toSorted((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-950">精選 Instagram 內容（{featured.length}/3）</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-700">系統會按觀看、播放、觸及或互動推薦；你可以自行揀選及排序。</p>
          </div>
          <button type="button" onClick={sync} disabled={syncing} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "同步中" : "更新內容"}
          </button>
        </div>
      </div>

      {message && <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {loading ? <p className="py-6 text-center text-sm text-zinc-400">載入 Instagram 內容中…</p> : items.length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-zinc-400">未有同步內容。按「更新內容」從 Instagram 匯入最近作品。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const imageUrl = item.thumbnail_url || item.media_url;
            const featuredIndex = featured.findIndex((candidate) => candidate.id === item.id);
            return (
              <div key={item.id} className={`overflow-hidden rounded-xl border bg-white ${item.is_featured ? "border-blue-500 ring-2 ring-blue-100" : "border-zinc-200"}`}>
                <div className="relative aspect-square bg-zinc-100">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={item.caption || "Instagram content"} className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center text-xs text-zinc-400">冇預覽圖</div>}
                  {item.is_featured && <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">精選 {featuredIndex + 1}</span>}
                </div>
                <div className="space-y-2 p-2">
                  <p className="line-clamp-2 text-xs text-zinc-600">{item.caption || item.media_product_type || item.media_type || "Instagram 內容"}</p>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                    <span>{metric(item)}</span>
                    {item.permalink && <a href={item.permalink} target="_blank" rel="noreferrer" aria-label="在 Instagram 查看"><ExternalLink size={13} /></a>}
                  </div>
                  <button type="button" disabled={savingId === item.id} onClick={() => toggleFeatured(item)} className={`w-full rounded-lg px-2 py-2 text-xs font-semibold ${item.is_featured ? "bg-zinc-100 text-zinc-700" : "bg-blue-600 text-white"} disabled:opacity-50`}>
                    {savingId === item.id ? "儲存中…" : item.is_featured ? "取消精選" : "加入精選"}
                  </button>
                  {item.is_featured && (
                    <div className="grid grid-cols-2 gap-1">
                      <button type="button" aria-label="向前移" disabled={featuredIndex === 0 || savingId !== null} onClick={() => move(item, -1)} className="flex justify-center rounded-lg border border-zinc-200 py-1.5 disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button type="button" aria-label="向後移" disabled={featuredIndex === featured.length - 1 || savingId !== null} onClick={() => move(item, 1)} className="flex justify-center rounded-lg border border-zinc-200 py-1.5 disabled:opacity-30"><ArrowDown size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
