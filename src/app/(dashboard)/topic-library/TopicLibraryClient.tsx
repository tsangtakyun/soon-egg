"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, ExternalLink, Search, ThumbsDown, Video } from "lucide-react";
import type { TopicIdea } from "@/lib/topic-library";

const SEEDED_IMAGES: Record<string, string> = {
  "阿姆斯特丹「社區警貓」有新搭檔": "/topic-library/police-cat-amsterdam.jpg",
  "睡不着不是不夠累：睡前先讓身體慢慢關機": "/topic-library/sleep-wind-down.jpg",
  "每年春天都會消失的瑞典 ICEHOTEL": "/topic-library/sweden-icehotel.jpg",
  "食物跌落地，三秒內執起真的可以吃嗎？": "/topic-library/three-second-rule.jpg",
};

function topicImage(idea: TopicIdea) {
  return idea.image_url || SEEDED_IMAGES[idea.title] || null;
}

export function TopicLibraryClient({ initialIdeas, canImport }: { initialIdeas: TopicIdea[]; canImport: boolean }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [masonryColumnCount, setMasonryColumnCount] = useState(4);

  const categories = useMemo(() => ["全部", ...Array.from(new Set(ideas.map((idea) => idea.category)))], [ideas]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return ideas.filter((idea) =>
      (category === "全部" || idea.category === category) &&
      (!value || [idea.title, idea.summary, idea.source_name, ...idea.tags].filter(Boolean).join(" ").toLowerCase().includes(value))
    );
  }, [category, ideas, query]);
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
        window.location.href = `/tools/script?topic=${encodeURIComponent(idea.title)}&background=${encodeURIComponent(idea.summary ?? "")}`;
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setPendingId(null);
    }
  }

  async function importIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceUrl.trim() || pendingId === "import") return;
    setPendingId("import");
    setImportMessage("正在讀取連結…");
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "import", sourceUrl, context }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "匯入失敗");
      setIdeas((current) => [result.idea, ...current]);
      setSourceUrl("");
      setContext("");
      setShowContext(false);
      setCategory("全部");
      setImportMessage("已加入題材庫");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "匯入失敗");
      setShowContext(true);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="flex min-h-16 flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">題材靈感庫</h1>
          <p className="mt-1 text-xs text-zinc-500">按你的內容方向整理最新 reference、題材方向和創作靈感</p>
        </div>

        {canImport ? (
          <form className="relative w-full lg:w-[min(460px,46vw)]" onSubmit={importIdea}>
            <label htmlFor="topic-source-url" className="mb-1 block text-[11px] font-bold text-zinc-600">加入新題材</label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
              <input id="topic-source-url" type="url" inputMode="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="貼上 Instagram 或文章連結" required className="h-9 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] outline-none focus:border-zinc-900 focus:bg-white" />
              <button type="submit" disabled={pendingId === "import"} className="h-9 rounded-lg bg-zinc-950 px-4 text-[13px] font-bold text-white disabled:opacity-50">{pendingId === "import" ? "讀取中…" : "加入"}</button>
            </div>
            <button type="button" onClick={() => setShowContext((current) => !current)} className="mt-1 text-[11px] font-semibold text-zinc-500 underline underline-offset-2">{showContext ? "收起補充資料" : "Instagram 無法讀取？加入 caption／補充資料"}</button>
            {showContext ? <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} placeholder="貼上 caption、內容重點或你想點拍…" className="mt-2 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-zinc-900" /> : null}
            {importMessage ? <span className="mt-1 block text-right text-[11px] text-zinc-500">{importMessage}</span> : null}
          </form>
        ) : null}
      </header>

      <section className="px-3 pb-10 pt-5 sm:px-5 lg:px-6">
        <div className="sticky top-0 z-10 bg-white/95 pb-4 backdrop-blur">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋題材、reference、tag" className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-zinc-900" />
          </label>
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-0.5" aria-label="題材分類">
            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${category === item ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}>{item}</button>)}
          </div>
        </div>

        {filtered.length ? (
          <div className="grid items-start gap-[18px]" style={{ gridTemplateColumns: `repeat(${masonryColumnCount}, minmax(0, 1fr))` }} aria-label="題材 reference">
            {masonryColumns.map((column, columnIndex) => (
              <div key={`topic-column-${columnIndex}`} className="flex min-w-0 flex-col gap-[18px]">
              {column.map((idea) => {
              const image = topicImage(idea);
              return (
                <article key={idea.id} className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-xl">
                  {image ? (
                    <Link href={idea.source_url || "#"} target={idea.source_url ? "_blank" : undefined} rel={idea.source_url ? "noreferrer" : undefined} className="relative block overflow-hidden bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="block h-auto w-full" />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">{idea.category}</span>
                    </Link>
                  ) : (
                    <div className="relative min-h-36 bg-gradient-to-br from-amber-100 via-orange-50 to-white p-5"><span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">{idea.category}</span></div>
                  )}
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase text-zinc-400">{idea.source_name || idea.platform}</p>
                    <h2 className="mt-1.5 text-[17px] font-extrabold leading-[1.15] text-zinc-900">{idea.title}</h2>
                    {idea.summary ? <p className="mt-2 text-xs leading-[1.45] text-zinc-600">{idea.summary}</p> : null}
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
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center"><strong className="block text-sm">暫時未有相符題材</strong><span className="mt-2 block text-sm text-zinc-500">可以清除搜尋或切換分類。</span>{ideas.length ? <button type="button" onClick={() => { setQuery(""); setCategory("全部"); }} className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white">查看全部</button> : null}</div>
        )}
      </section>
    </main>
  );
}
