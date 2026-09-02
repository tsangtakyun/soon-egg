"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Search, ThumbsDown, Trash2, Video } from "lucide-react";
import type { TopicIdea } from "@/lib/topic-library";

function topicMedia(idea: TopicIdea) {
  return Array.from(new Set([...(idea.media_urls ?? []), idea.image_url].filter((url): url is string => Boolean(url))));
}

function TopicMedia({ idea, onBrokenCover }: { idea: TopicIdea; onBrokenCover: (idea: TopicIdea) => void }) {
  const media = topicMedia(idea);
  const [index, setIndex] = useState(0);
  const hasMultiple = media.length > 1;

  if (!media.length) return null;

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + media.length) % media.length);
  }

  return (
    <div className="group relative block overflow-hidden bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media[index]} alt={`${idea.title}－第 ${index + 1} 張圖片`} onError={() => onBrokenCover(idea)} className="block h-auto w-full" />
      <span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">{idea.category}</span>
      {idea.recommended ? <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-bold text-zinc-950">為你推薦</span> : null}
      {hasMultiple ? <>
        <button type="button" onClick={() => move(-1)} aria-label={`查看「${idea.title}」上一張圖片`} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-md transition hover:scale-105 hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => move(1)} aria-label={`查看「${idea.title}」下一張圖片`} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-md transition hover:scale-105 hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-bold text-white">{index + 1}/{media.length}</span>
        <div className="absolute bottom-3 left-1/2 flex max-w-[55%] -translate-x-1/2 gap-1 overflow-hidden rounded-full bg-zinc-950/45 px-2 py-1.5" aria-hidden>
          {media.slice(0, 10).map((url, dotIndex) => <span key={`${url}-${dotIndex}`} className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotIndex === index ? "bg-white" : "bg-white/45"}`} />)}
        </div>
      </> : null}
    </div>
  );
}

export function TopicLibraryClient({ initialIdeas, canDelete }: { initialIdeas: TopicIdea[]; canDelete: boolean }) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [libraryView, setLibraryView] = useState<"recommended" | "latest" | "all">(
    initialIdeas.some((idea) => idea.recommended) ? "recommended" : "all"
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [location, setLocation] = useState("全部地區");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [masonryColumnCount, setMasonryColumnCount] = useState(4);
  const coverInput = useRef<HTMLInputElement>(null);
  const [coverIdeaId, setCoverIdeaId] = useState<string | null>(null);
  const repairingCovers = useRef(new Set<string>());

  const categories = useMemo(() => ["全部", ...Array.from(new Set(ideas.map((idea) => idea.category)))], [ideas]);
  const locations = useMemo(() => ["全部地區", ...Array.from(new Set(ideas.flatMap((idea) => [...(idea.localities ?? []), ...(idea.regions ?? []), ...(idea.countries ?? [])])))], [ideas]);
  const recommendedCount = useMemo(() => ideas.filter((idea) => idea.recommended).length, [ideas]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const matches = ideas.filter((idea) =>
      (libraryView === "all" || idea.recommended) &&
      (libraryView !== "latest" || idea.workspace_id !== null) &&
      (category === "全部" || idea.category === category) &&
      (location === "全部地區" || [...(idea.localities ?? []), ...(idea.regions ?? []), ...(idea.countries ?? [])].includes(location)) &&
      (!value || [idea.title, idea.summary, idea.source_name, ...idea.tags].filter(Boolean).join(" ").toLowerCase().includes(value))
    );
    return libraryView === "latest" ? [...matches].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) : matches;
  }, [category, ideas, libraryView, location, query]);
  const masonryColumns = Array.from({ length: masonryColumnCount }, (_, columnIndex) =>
    filtered.filter((_, ideaIndex) => ideaIndex % masonryColumnCount === columnIndex)
  );

  useEffect(() => {
    function updateColumnCount() {
      const width = window.innerWidth;
      setMasonryColumnCount(width <= 520 ? 1 : width <= 860 ? 2 : width <= 1180 ? 3 : 4);
    }
    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  async function act(idea: TopicIdea, action: "save" | "create" | "dismiss") {
    setPendingId(idea.id);
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "操作失敗");
      if (action === "dismiss") {
        setIdeas((current) => current.filter((item) => item.id !== idea.id));
      } else {
        setIdeas((current) => current.map((item) => item.id === idea.id
          ? { ...item, saved: true, want_to_create: action === "create" }
          : item));
      }
      if (action === "create") {
        router.push(`/tools/script?topic=${encodeURIComponent(idea.title)}&background=${encodeURIComponent(idea.summary ?? "")}`);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setPendingId(null);
    }
  }

  async function removeIdea(idea: TopicIdea) {
    if (!window.confirm(`刪除「${idea.title}」？此操作無法復原。`)) return;
    setPendingId(idea.id);
    try {
      const response = await fetch(`/api/topics?ideaId=${encodeURIComponent(idea.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能刪除題材");
      setIdeas((current) => current.filter((item) => item.id !== idea.id));
    } catch (error) { window.alert(error instanceof Error ? error.message : "未能刪除題材"); }
    finally { setPendingId(null); }
  }

  async function replaceCover(file: File) {
    if (!coverIdeaId) return;
    setPendingId(coverIdeaId);
    try {
      const form = new FormData();
      form.set("ideaId", coverIdeaId);
      form.set("cover", file);
      const response = await fetch("/api/topics", { method: "PATCH", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能更換封面");
      setIdeas((current) => current.map((item) => item.id === coverIdeaId ? { ...item, image_url: result.imageUrl } : item));
    } catch (error) { window.alert(error instanceof Error ? error.message : "未能更換封面"); }
    finally { setPendingId(null); setCoverIdeaId(null); if (coverInput.current) coverInput.current.value = ""; }
  }

  const repairBrokenCover = useCallback(async (idea: TopicIdea) => {
    if (!idea.manageable || repairingCovers.current.has(idea.id)) return;
    repairingCovers.current.add(idea.id);
    try {
      const response = await fetch("/api/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "repair-cover", ideaId: idea.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能自動修復封面");
      setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, image_url: result.imageUrl, media_urls: result.mediaUrls } : item));
    } catch (error) { console.error("Topic cover auto repair failed", error); }
  }, []);

  useEffect(() => {
    const legacyInstagramIdeas = ideas.filter((idea) => idea.manageable && idea.platform === "Instagram" && idea.image_url && !idea.image_url.includes("/storage/v1/object/public/egg-topic-media/"));
    legacyInstagramIdeas.forEach((idea) => void repairBrokenCover(idea));
  }, [ideas, repairBrokenCover]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="flex min-h-16 flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">題材靈感庫</h1>
          <p className="mt-1 text-xs text-zinc-500">SOON 每日整理新題材，並按你的內容定位優先排列</p>
        </div>
      </header>

      <section className="px-3 pb-10 pt-5 sm:px-5 lg:px-6">
        <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceCover(file); }} />
        <div className="sticky top-0 z-10 bg-white/95 pb-4 backdrop-blur">
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-100 p-1" aria-label="題材檢視方式">
            <button type="button" onClick={() => { setLibraryView("recommended"); setCategory("全部"); }} disabled={recommendedCount === 0} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "recommended" ? "bg-amber-400 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"} disabled:cursor-not-allowed disabled:opacity-40`}>
              為你推薦 ({recommendedCount})
            </button>
            <button type="button" onClick={() => { setLibraryView("latest"); setCategory("全部"); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "latest" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>
              最新題材
            </button>
            <button type="button" onClick={() => { setLibraryView("all"); setCategory("全部"); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "all" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>
              所有題材
            </button>
          </div>
          {libraryView === "recommended" ? <p className="mb-3 text-xs leading-relaxed text-zinc-500">根據你在設定中選擇的內容類型排列。你可以隨時到個人設定更新喜好。</p> : null}
          {libraryView === "latest" ? <p className="mb-3 text-xs leading-relaxed text-zinc-500">查看所有創作者最近分享入題材庫嘅靈感，最新內容會排最前。</p> : null}
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋題材、reference、tag" className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-zinc-900" />
          </label>
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-0.5" aria-label="題材分類">
            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${category === item ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}>{item}</button>)}
          </div>
          {locations.length > 1 ? <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5" aria-label="地區篩選">
            {locations.map((item) => <button key={item} type="button" onClick={() => setLocation(item)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${location === item ? "border-amber-500 bg-amber-50 text-amber-800" : "border-zinc-200 text-zinc-500"}`}>{item}</button>)}
          </div> : null}
        </div>

        {filtered.length ? (
          <div className="grid items-start gap-[18px]" style={{ gridTemplateColumns: `repeat(${masonryColumnCount}, minmax(0, 1fr))` }} aria-label="題材 reference">
            {masonryColumns.map((column, columnIndex) => (
              <div key={`topic-column-${columnIndex}`} className="flex min-w-0 flex-col gap-[18px]">
              {column.map((idea) => {
              const media = topicMedia(idea);
              return (
                <article key={idea.id} className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-xl">
                  {media.length ? (
                    <TopicMedia idea={idea} onBrokenCover={(brokenIdea) => void repairBrokenCover(brokenIdea)} />
                  ) : (
                    <div className="relative min-h-36 bg-gradient-to-br from-amber-100 via-orange-50 to-white p-5"><span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">{idea.category}</span></div>
                  )}
                    <div className="p-3">
                    {(idea.manageable || (canDelete && idea.workspace_id)) ? <div className="mb-2 flex justify-end gap-1.5">
                      {idea.manageable ? <button type="button" disabled={pendingId !== null} onClick={() => { setCoverIdeaId(idea.id); coverInput.current?.click(); }} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-semibold text-zinc-600 hover:border-zinc-900"><ImagePlus className="h-3.5 w-3.5" />更換封面</button> : null}
                      {canDelete && idea.workspace_id ? <button type="button" disabled={pendingId !== null} onClick={() => void removeIdea(idea)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />刪除</button> : null}
                    </div> : null}
                    <p className="text-[11px] font-semibold uppercase text-zinc-400">{idea.source_name || idea.platform}</p>
                    <h2 className="mt-1.5 text-[17px] font-extrabold leading-[1.15] text-zinc-900">{idea.title}</h2>
                    {idea.summary ? <p className="mt-2 text-xs leading-[1.45] text-zinc-600">{idea.summary}</p> : null}
                    {idea.why_now ? <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-900"><strong>點解值得留意：</strong>{idea.why_now}</p> : null}
                    {idea.hook ? <p className="mt-2 text-xs leading-relaxed text-zinc-700"><strong>開場 Hook：</strong>{idea.hook}</p> : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">{idea.tags.map((tag) => <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500">{tag}</span>)}</div>
                    {idea.source_url ? <Link href={idea.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:underline">查看原文 <ExternalLink className="h-3 w-3" /></Link> : null}
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <button type="button" disabled={pendingId === idea.id} onClick={() => void act(idea, "save")} className={`flex min-h-8 items-center justify-center gap-1 rounded-lg border text-xs font-semibold ${idea.saved ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 text-zinc-700"}`}><Bookmark className="h-3.5 w-3.5" />{idea.saved ? "已收藏" : "收藏"}</button>
                      <button type="button" disabled={pendingId === idea.id} onClick={() => void act(idea, "dismiss")} className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-500 hover:border-red-500 hover:text-red-600"><ThumbsDown className="h-3.5 w-3.5" />不合適</button>
                      <button type="button" disabled={pendingId === idea.id} onClick={() => void act(idea, "create")} className="flex min-h-8 items-center justify-center gap-1 rounded-lg bg-zinc-950 text-xs font-semibold text-white"><Video className="h-3.5 w-3.5" />想拍</button>
                    </div>
                  </div>
                </article>
              );
              })}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center"><strong className="block text-sm">暫時未有相符題材</strong><span className="mt-2 block text-sm text-zinc-500">SOON 正在整理新一批靈感，你亦可以探索其他題材。</span>{ideas.length ? <button type="button" onClick={() => { setQuery(""); setCategory("全部"); setLocation("全部地區"); setLibraryView("all"); }} className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white">探索所有題材</button> : null}</div>
        )}
      </section>
    </main>
  );
}
