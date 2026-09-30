"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, Loader2, ScanSearch } from "lucide-react";

type Candidate = { packId: string; title: string; score: number; captionSimilarity: number; reasons: string[] };
type Publication = { pack_id: string | null; lineage_status: string; link_confidence: number | null };
type Media = {
  instagram_media_id: string;
  caption: string | null;
  media_product_type: string | null;
  media_type: string | null;
  published_at: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  publication: Publication | null;
  candidates: Candidate[];
};

export function PublicationMatcher() {
  const [media, setMedia] = useState<Media[]>([]);
  const [packCount, setPackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/egg/publications", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "載入失敗");
    else {
      setMedia(payload.media ?? []);
      setPackCount(payload.packCount ?? 0);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch synchronises this client view with the server-owned matching state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(externalMediaId: string, action: "confirm" | "external", packId?: string) {
    setSaving(`${externalMediaId}:${packId ?? action}`);
    const response = await fetch("/api/egg/publications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalMediaId, action, packId }),
    });
    const payload = await response.json();
    setSaving("");
    if (!response.ok) return setError(payload.error ?? "儲存失敗");
    await load();
  }

  const attributed = media.filter((item) => item.publication?.lineage_status === "attributed").length;
  const baseline = media.filter((item) => item.publication?.lineage_status === "external_content").length;
  const pending = media.length - attributed - baseline;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7b4a4f]">Publication Lineage</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-950">發布內容配對</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">系統只會提出候選。你確認後，該篇 Instagram 成效先會歸因到對應 Pack、Hook 同內容方法。</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Instagram 內容" value={media.length} />
        <Stat label="可配對 Packs" value={packCount} />
        <Stat label="待判斷" value={pending} />
        <Stat label="已歸因 / Baseline" value={`${attributed} / ${baseline}`} />
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="flex items-center gap-2 py-16 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />分析發布內容中…</div> : null}

      <div className="space-y-4">
        {media.map((item) => {
          const image = item.thumbnail_url || item.media_url;
          return (
            <article key={item.instagram_media_id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="grid md:grid-cols-[180px_1fr]">
                <div className="min-h-40 bg-zinc-100">{image ? <img src={image} alt="Instagram 內容預覽" className="h-full w-full object-cover" /> : null}</div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <span>{item.media_product_type || item.media_type || "POST"}</span>
                      <span>·</span>
                      <span>{item.published_at ? new Intl.DateTimeFormat("zh-HK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.published_at)) : "日期不詳"}</span>
                    </div>
                    {item.permalink ? <a href={item.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#7b4a4f]">Instagram <ExternalLink className="h-3 w-3" /></a> : null}
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700">{item.caption || "（沒有 Caption）"}</p>

                  {item.publication ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      {item.publication.lineage_status === "attributed" ? "已確認由 EGG Pack 製作，可作成效歸因" : "已標記為外部內容，只作 baseline"}
                    </div>
                  ) : (
                    <div className="mt-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-zinc-900"><ScanSearch className="h-4 w-4 text-[#7b4a4f]" />候選 Pack</div>
                      {item.candidates.length ? <div className="space-y-2">{item.candidates.map((candidate) => {
                        const key = `${item.instagram_media_id}:${candidate.packId}`;
                        return <div key={candidate.packId} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div><p className="text-sm font-bold text-zinc-900">{candidate.title}</p><p className="mt-1 text-xs text-zinc-500">配對分數 {Math.round(candidate.score * 100)}% · {candidate.reasons.join(" · ")}</p></div>
                          <button onClick={() => void save(item.instagram_media_id, "confirm", candidate.packId)} disabled={Boolean(saving)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#7b4a4f] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}確認配對</button>
                        </div>;
                      })}</div> : <p className="rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500">未有達到安全門檻嘅候選。可能係發布早過 EGG Pack，或者 Caption／格式唔相符。</p>}
                      <button onClick={() => void save(item.instagram_media_id, "external")} disabled={Boolean(saving)} className="mt-3 text-xs font-bold text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 disabled:opacity-50">呢篇唔係用 EGG 製作，標記為 baseline</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3"><p className="text-xs font-bold text-zinc-500">{label}</p><p className="mt-1 text-xl font-black text-zinc-950">{value}</p></div>;
}
