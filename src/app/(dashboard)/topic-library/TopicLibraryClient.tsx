"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, ExternalLink, Plus, Search, Sparkles, ThumbsDown, Video, X } from "lucide-react";
import type { TopicIdea } from "@/lib/topic-library";

export function TopicLibraryClient({ initialIdeas, canImport }: { initialIdeas: TopicIdea[]; canImport: boolean }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [pending, setPending] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [context, setContext] = useState("");
  const [importError, setImportError] = useState("");
  const categories = useMemo(() => ["全部", ...Array.from(new Set(ideas.map((idea) => idea.category)))], [ideas]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return ideas.filter((idea) => (category === "全部" || idea.category === category) && (!value || [idea.title, idea.summary, idea.source_name, ...idea.tags].filter(Boolean).join(" ").toLowerCase().includes(value)));
  }, [category, ideas, query]);

  async function act(idea: TopicIdea, action: "save" | "create" | "dismiss") {
    setPending(true);
    try {
      const response = await fetch("/api/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ideaId: idea.id, action }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "操作失敗");
      if (action === "dismiss") setIdeas((current) => current.filter((item) => item.id !== idea.id));
      else setIdeas((current) => current.map((item) => item.id === idea.id ? { ...item, saved: true, want_to_create: action === "create" } : item));
      if (action === "create") window.location.href = `/tools/script?topic=${encodeURIComponent(idea.title)}&background=${encodeURIComponent(idea.summary ?? "")}`;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "操作失敗");
    } finally { setPending(false); }
  }

  async function importIdea() {
    if (!sourceUrl.trim()) return;
    setPending(true);
    setImportError("");
    try {
      const response = await fetch("/api/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", sourceUrl, context }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "匯入失敗");
      setIdeas((current) => [result.idea, ...current]);
      setSourceUrl(""); setContext(""); setShowImport(false);
    } catch (error) { setImportError(error instanceof Error ? error.message : "匯入失敗"); } finally { setPending(false); }
  }

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">SOON Inspiration</p><h1 className="mt-2 text-3xl font-black text-zinc-950">題材靈感庫</h1><p className="mt-2 text-sm text-zinc-500">SOON 為你整理可靠來源同可拍角度；收藏、略過，或者直接開始寫劇本。</p></div>{canImport ? <button type="button" onClick={() => setShowImport(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />加入新題材</button> : null}</header>
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋題材、來源或標籤" className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-400" /></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${category === item ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}>{item}</button>)}</div>
      </section>
      {filtered.length ? <section className="columns-1 gap-4 md:columns-2 xl:columns-3">{filtered.map((idea) => <article key={idea.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-white p-5"><div className="flex items-center justify-between gap-3 text-xs text-zinc-500"><span>{idea.platform} · {idea.category}</span><Sparkles className="h-4 w-4 text-amber-600" /></div><h2 className="mt-5 text-xl font-black leading-snug text-zinc-950">{idea.title}</h2></div>
        <div className="space-y-4 p-5">{idea.summary ? <p className="text-sm leading-6 text-zinc-600">{idea.summary}</p> : null}<div className="flex flex-wrap gap-1.5">{idea.tags.map((tag) => <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">{tag}</span>)}</div>{idea.source_url ? <Link href={idea.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 underline underline-offset-4">{idea.source_name || "查看原文"}<ExternalLink className="h-3 w-3" /></Link> : null}<div className="grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4"><button type="button" disabled={pending} onClick={() => void act(idea, "save")} className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold ${idea.saved ? "border-amber-300 bg-amber-50 text-amber-800" : "border-zinc-200 text-zinc-600"}`}><Bookmark className="h-3.5 w-3.5" />{idea.saved ? "已收藏" : "收藏"}</button><button type="button" disabled={pending} onClick={() => void act(idea, "dismiss")} className="flex items-center justify-center gap-1 rounded-xl border border-zinc-200 px-2 py-2 text-xs font-semibold text-zinc-500"><ThumbsDown className="h-3.5 w-3.5" />不合適</button><button type="button" disabled={pending} onClick={() => void act(idea, "create")} className="flex items-center justify-center gap-1 rounded-xl bg-zinc-950 px-2 py-2 text-xs font-semibold text-white"><Video className="h-3.5 w-3.5" />想拍</button></div></div>
      </article>)}</section> : <div className="rounded-2xl border border-dashed border-zinc-300 py-20 text-center text-sm text-zinc-500">暫時未有符合條件嘅題材，稍後再刷新。</div>}
      {showImport ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-zinc-950">加入新題材</h2><p className="mt-1 text-sm text-zinc-500">貼上原文連結，AI 只會根據可讀內容同你提供嘅補充資料整理。</p></div><button type="button" onClick={() => setShowImport(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" aria-label="關閉"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-zinc-800">原文連結<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://www.instagram.com/..." className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 font-normal outline-none focus:border-amber-400" /></label><label className="block text-sm font-semibold text-zinc-800">補充資料 <span className="font-normal text-zinc-400">（Instagram 無法讀取時必填）</span><textarea value={context} onChange={(event) => setContext(event.target.value)} rows={5} placeholder="貼上 caption、內容重點，或者你想點拍…" className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-3 font-normal outline-none focus:border-amber-400" /></label>{importError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p> : null}<button type="button" disabled={pending || !sourceUrl.trim()} onClick={() => void importIdea()} className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-semibold text-white disabled:opacity-40">{pending ? "AI 整理中…" : "整理並加入題材庫"}</button></div></div></div> : null}
    </main>
  );
}
