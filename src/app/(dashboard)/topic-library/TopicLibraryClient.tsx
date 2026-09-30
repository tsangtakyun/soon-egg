"use client";

import { rotateRecommendations } from "@/lib/topic-rotation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  SlidersHorizontal,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  Search,
  Sparkles,
  EyeOff,
} from "lucide-react";
import { countryLabel, topicCountryKeys, matchesCountry } from "@/lib/topicGeography";
import { topicLocations, topicLocationLabel } from "@/lib/topicCountries";
import type { TopicIdea } from "@/lib/topic-library";

function TopicThumbnail({ idea }: { idea: TopicIdea }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5eee7]">
    {idea.image_url && !failed
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={idea.image_url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      : <span className="flex flex-col items-center gap-1 text-[#7b4a4f]"><ImagePlus className="h-6 w-6" /><span className="max-w-16 truncate text-[10px]">{idea.source_name || '題材'}</span></span>}
  </span>;
}

function topicMedia(idea: TopicIdea) {
  return Array.from(
    new Set(
      [...(idea.media_urls ?? []), idea.image_url].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  );
}

function TopicMedia({
  idea,
  onBrokenCover,
}: {
  idea: TopicIdea;
  onBrokenCover: (idea: TopicIdea) => void;
}) {
  const media = topicMedia(idea);
  const [index, setIndex] = useState(0);
  const hasMultiple = media.length > 1;
  const sourceUrl = /^https?:\/\//i.test(idea.source_url || "") ? idea.source_url! : undefined;

  if (!media.length) return null;

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + media.length) % media.length);
  }

  return (
    <div className="group relative block overflow-hidden bg-zinc-100">
      <a href={sourceUrl} target={sourceUrl ? "_blank" : undefined} rel="noopener noreferrer" aria-label={sourceUrl ? `查看原片或原帖：${idea.title}` : undefined} className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media[index]}
        alt={`${idea.title}－第 ${index + 1} 張圖片`}
        onError={() => onBrokenCover(idea)}
        className="block h-auto w-full"
      />
      {sourceUrl ? <span className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-2 text-xs font-bold text-white">點圖查看原片／原帖 ↗</span> : null}
      </a>
      <span className="absolute left-2.5 top-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-semibold text-white">
        {idea.category}
      </span>
      {idea.recommended ? (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-bold text-zinc-950">
          為你推薦
        </span>
      ) : null}
      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`查看「${idea.title}」上一張圖片`}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-md transition hover:scale-105 hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`查看「${idea.title}」下一張圖片`}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-md transition hover:scale-105 hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-zinc-950/75 px-2 py-1 text-[11px] font-bold text-white">
            {index + 1}/{media.length}
          </span>
          <div
            className="absolute bottom-3 left-1/2 flex max-w-[55%] -translate-x-1/2 gap-1 overflow-hidden rounded-full bg-zinc-950/45 px-2 py-1.5"
            aria-hidden
          >
            {media.slice(0, 10).map((url, dotIndex) => (
              <span
                key={`${url}-${dotIndex}`}
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotIndex === index ? "bg-white" : "bg-white/45"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TopicLibraryClient({
  initialIdeas,
  canManageCovers,
}: {
  initialIdeas: TopicIdea[];
  canManageCovers: boolean;
}) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [rotationHistory, setRotationHistory] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [libraryScope, setLibraryScope] = useState<"central" | "workspace">("central");
  const [libraryView, setLibraryView] = useState<
    "recommended" | "latest" | "all" | "saved"
  >("latest");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [location, setLocation] = useState("全部地區");
  const [country, setCountry] = useState('全部國家');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState('全部國家');
  const [draftLocation, setDraftLocation] = useState('全部地區');
  const [draftScope, setDraftScope] = useState<'central' | 'workspace'>('central');
  const [showHidden, setShowHidden] = useState(false);
  const [undoIdea, setUndoIdea] = useState<TopicIdea | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const filterDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (filtersOpen) filterDialog.current?.showModal(); else filterDialog.current?.close(); }, [filtersOpen]);
  function openFilters() { setDraftCountry(country); setDraftLocation(location); setDraftScope(libraryScope); setFiltersOpen(true); }
  function toggleHidden() { setShowHidden(!showHidden); setQuery(''); setCategory('全部'); setCountry('全部國家'); setLocation('全部地區'); }
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const detail = ideas.find((idea) => idea.id === detailId);
  useEffect(() => {
    if (detail) detailDialog.current?.showModal();
    else detailDialog.current?.close();
  }, [detail]);

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const masonryColumnCount = 1;
  const coverInput = useRef<HTMLInputElement>(null);
  const [coverIdeaId, setCoverIdeaId] = useState<string | null>(null);
  const repairingCovers = useRef(new Set<string>());

  const inScope = (idea: TopicIdea, scope: string) => scope === 'central' ? idea.scope === 'central' || idea.central_available : (idea.scope ?? (idea.workspace_id ? 'workspace' : 'central')) === 'workspace';
  const scopedIdeas = ideas.filter(idea => Boolean(idea.dismissed) === showHidden && (showHidden || inScope(idea, libraryScope)));
  const visibleIdeas = libraryView === "saved"
    ? ideas.filter((idea) => idea.saved && !idea.dismissed)
    : scopedIdeas;
  const draftIdeas = ideas.filter(idea => Boolean(idea.dismissed) === showHidden && (showHidden || inScope(idea, draftScope)));
  const centralCount = ideas.filter((idea) => !idea.dismissed && (idea.scope === "central" || idea.central_available)).length;
  const workspaceCount = ideas.filter(idea => !idea.dismissed && idea.scope === "workspace").length;
  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(visibleIdeas.map((idea) => idea.category)))],
    [visibleIdeas],
  );
  const countries = useMemo(() => ['全部國家', ...Array.from(new Set(draftIdeas.flatMap(topicCountryKeys)))], [draftIdeas]);
  const locations = useMemo(() => ['全部地區', ...Array.from(new Set(draftIdeas.filter((idea) => matchesCountry(idea, draftCountry)).flatMap(topicLocations)))], [draftIdeas, draftCountry]);
  const recommendedCount = useMemo(
    () => scopedIdeas.filter((idea) => idea.recommended).length,
    [scopedIdeas],
  );
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const matches = visibleIdeas.filter(
      (idea) =>
        (showHidden || libraryView !== "recommended" || country !== "全部國家" || idea.recommended) &&
        (category === "全部" || idea.category === category) &&
        matchesCountry(idea, country) &&
        (location === '全部地區' || topicLocations(idea).includes(location)) &&
        (!value ||
          [idea.title, idea.summary, idea.source_name, ...idea.tags, ...(idea.localities ?? []), ...(idea.regions ?? []), ...(idea.countries ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(value)),
    );
    return libraryView === "saved"
      ? [...matches].sort((a, b) => Date.parse(b.saved_at || b.created_at) - Date.parse(a.saved_at || a.created_at))
      : libraryView !== "recommended"
      ? [...matches].sort(
          (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
        )
      : showHidden ? matches : rotateRecommendations(matches, rotationHistory);
  }, [category, visibleIdeas, libraryView, location, country, query, showHidden, rotationHistory]);
  async function refreshRecommendations() {
    if (refreshing) return;
    setRefreshing(true); setRefreshError("");
    const first = filtered[0]?.id;
    try {
      const response = await fetch("/api/topics?includeHidden=1", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.ideas)) throw new Error(result.error || "未能更新題材");
      if (first) setRotationHistory(history => [...history, first].slice(-30));
      setIdeas(result.ideas);
    } catch { setRefreshError("未能更新，已保留目前題材。請再試一次。"); }
    finally { setRefreshing(false); }
  }
  const draftCount = draftIdeas.filter(idea =>
    (showHidden || libraryView !== 'recommended' || draftCountry !== '全部國家' || idea.recommended) &&
    (draftScope !== libraryScope || category === '全部' || idea.category === category) &&
    matchesCountry(idea, draftCountry) && (draftLocation === '全部地區' || topicLocations(idea).includes(draftLocation)) &&
    (!query.trim() || [idea.title, idea.summary, idea.source_name, ...idea.tags, ...(idea.localities ?? []), ...(idea.regions ?? []), ...(idea.countries ?? [])].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  ).length;
  const masonryColumns = Array.from(
    { length: masonryColumnCount },
    (_, columnIndex) =>
      filtered.filter(
        (_, ideaIndex) => ideaIndex % masonryColumnCount === columnIndex,
      ),
  );



  const pendingImportIds = ideas.filter((idea) => idea.import_state === "pending").map((idea) => idea.id).sort().join(",");
  useEffect(() => {
    if (!pendingImportIds) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refreshPendingImports() {
      try {
        const response = await fetch("/api/topics?includeHidden=1", { cache: "no-store", signal: controller.signal });
        if (response.ok) {
          const result = await response.json();
          if (!cancelled && Array.isArray(result.ideas)) {
            const incoming = new Map<string, TopicIdea>(result.ideas.map((idea: TopicIdea) => [idea.id, idea]));
            setIdeas((current) => current.map((idea) => {
              const refreshed = idea.import_state === "pending" ? incoming.get(idea.id) : undefined;
              return refreshed ? { ...refreshed, saved: idea.saved, saved_at: idea.saved_at, want_to_create: idea.want_to_create, dismissed: idea.dismissed } : idea;
            }));
          }
        }
      } catch {
        // A temporary network failure should not overwrite the import state.
      } finally {
        if (!cancelled) timer = setTimeout(refreshPendingImports, 5000);
      }
    }
    timer = setTimeout(refreshPendingImports, 5000);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [pendingImportIds]);

  function openSaved() {
    setShowHidden(false);
    setLibraryView("saved");
    setQuery("");
    setCategory("全部");
    setCountry("全部國家");
    setLocation("全部地區");
  }

  async function act(idea: TopicIdea, action: "save" | "unsave" | "create" | "dismiss" | "restore") {
    const previous = ideas;
    const nextSaved = action === "save" || action === "create";
    setPendingId(idea.id);
    setNotice(null);
    setIdeas(current => current.map(item => item.id !== idea.id ? item : action === 'dismiss' || action === 'restore'
      ? { ...item, dismissed: action === 'dismiss' }
      : { ...item, saved: nextSaved, saved_at: nextSaved ? new Date().toISOString() : null, want_to_create: action === 'create' || item.want_to_create }));
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "操作失敗");
      if (action === 'dismiss' || action === 'restore') { setDetailId(null); setUndoIdea(action === 'dismiss' ? idea : null); }
      if (action === "save") setNotice({ kind: "success", message: "已收藏題材" });
      if (action === "unsave") setNotice({ kind: "success", message: "已取消收藏" });
      if (action === "create") {
        setDetailId(null);
        router.push(
          `/egg-this?topicId=${encodeURIComponent(idea.id)}&input=${encodeURIComponent(idea.title)}`,
        );
      }
    } catch (error) {
      setIdeas(previous);
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "操作失敗，已還原原本狀態" });
    } finally {
      setPendingId(null);
    }
  }

  async function replaceCover(file: File) {
    if (!coverIdeaId) return;
    setPendingId(coverIdeaId);
    try {
      const form = new FormData();
      form.set("ideaId", coverIdeaId);
      form.set("cover", file);
      const response = await fetch("/api/topics", {
        method: "PATCH",
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能更換封面");
      setIdeas((current) =>
        current.map((item) =>
          item.id === coverIdeaId
            ? {
                ...item,
                image_url: result.imageUrl,
                media_urls: result.mediaUrls ?? [result.imageUrl],
              }
            : item,
        ),
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "未能更換封面");
    } finally {
      setPendingId(null);
      setCoverIdeaId(null);
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  const repairBrokenCover = useCallback(
    async (idea: TopicIdea) => {
      if (
        !(idea.manageable || (canManageCovers && idea.workspace_id)) ||
        repairingCovers.current.has(idea.id)
      )
        return;
      repairingCovers.current.add(idea.id);
      try {
        const response = await fetch("/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "repair-cover", ideaId: idea.id }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "未能自動修復封面");
        setIdeas((current) =>
          current.map((item) =>
            item.id === idea.id
              ? {
                  ...item,
                  image_url: result.imageUrl,
                  media_urls: result.mediaUrls,
                }
              : item,
          ),
        );
      } catch (error) {
        console.error("Topic cover auto repair failed", error);
      }
    },
    [canManageCovers],
  );

  useEffect(() => {
    const legacyInstagramIdeas = ideas.filter(
      (idea) =>
        (idea.manageable || (canManageCovers && idea.workspace_id)) &&
        idea.platform === "Instagram" &&
        idea.image_url &&
        !idea.image_url.includes("/storage/v1/object/public/egg-topic-media/"),
    );
    legacyInstagramIdeas.forEach((idea) => void repairBrokenCover(idea));
  }, [canManageCovers, ideas, repairBrokenCover]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="flex min-h-16 flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">題材靈感庫</h1>
        </div>
      </header>

      <section className="px-3 pb-10 pt-5 sm:px-5 lg:px-6">
        <input
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void replaceCover(file);
          }}
        />
        <div className="bg-white pb-2">
          <div
            className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1"
            aria-label="題材檢視方式"
          >
            <button
              type="button"
              onClick={() => {
                setShowHidden(false);
                setLibraryView("recommended");
                setCategory("全部");
              }}
              disabled={false}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "recommended" ? "bg-amber-400 text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              推薦
              <span className="sr-only">（{recommendedCount} 個）</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLibraryView("latest");
                setCategory("全部");
              }}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "latest" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              最新
            </button>
            <button
              type="button"
              onClick={() => {
                setLibraryView("all");
                setCategory("全部");
              }}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "all" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              所有
            </button>
            <button
              type="button"
              onClick={openSaved}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${libraryView === "saved" ? "bg-[#7b4a4f] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              收藏 <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-black/10 px-1 text-[11px] leading-5">{ideas.filter((idea) => idea.saved && !idea.dismissed).length}</span>
            </button>
          </div>
          {libraryView === "recommended" ? <div className="mb-3 flex items-center justify-between text-sm"><Link href="/egg-preferences" className="text-amber-800">調整 Creator DNA</Link><button disabled={refreshing} onClick={() => void refreshRecommendations()} className="min-h-11 px-3">{refreshing ? "更新中…" : "換一批推薦 ↻"}</button></div> : null}
          {refreshError ? <p role="alert">{refreshError}</p> : null}
          {notice ? <div role={notice.kind === "error" ? "alert" : "status"} className={`mb-3 flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-sm ${notice.kind === "error" ? "bg-red-50 text-red-800" : "bg-[#f5eee7] text-[#5f353a]"}`}><span>{notice.message}</span>{notice.kind === "success" && libraryView !== "saved" ? <button type="button" onClick={openSaved} className="min-h-11 shrink-0 font-bold underline">查看收藏</button> : null}</div> : null}
          <div className="flex gap-2"><label className="relative block flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋題材" aria-label="搜尋題材"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-zinc-900"
            />
          </label><button type="button" aria-label="篩選題材" aria-expanded={filtersOpen} onClick={openFilters} className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200"><SlidersHorizontal className="h-5 w-5" /></button></div>
          <div
            className="mt-4 flex gap-2.5 overflow-x-auto pb-0.5"
            aria-label="題材分類"
          >
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold ${category === item ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={openFilters} className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{libraryScope === 'workspace' ? '我的題材' : 'SOON 中央題材'}</button>
            {country !== '全部國家' || location !== '全部地區' ? <button aria-label="清除地區篩選" onClick={() => { setCountry('全部國家'); setLocation('全部地區'); }} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">{[country !== '全部國家' ? countryLabel(country) : '', location !== '全部地區' ? location : ''].filter(Boolean).join(' · ')} ×</button> : null}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">{showHidden ? '只在目前工作區隱藏，原題材及收藏仍會保留。' : ''}</p>
          <button type="button" onClick={toggleHidden} className="min-h-11 shrink-0 text-sm text-amber-800">{showHidden ? '返回題材' : '已隱藏題材'}</button>
        </div>
        {undoIdea ? <div role="status" className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 px-4"><span className="text-sm">已隱藏題材</span><button disabled={pendingId !== null} onClick={() => void act(undoIdea, 'restore')} className="min-h-11 font-bold text-amber-800">復原</button></div> : null}
        {filtered.length ? (
          <div
            className="grid items-start gap-2"
            style={{
              gridTemplateColumns: `repeat(${masonryColumnCount}, minmax(0, 1fr))`,
            }}
            aria-label="題材列表"
          >
            {masonryColumns.map((column, columnIndex) => (
              <div
                key={`topic-column-${columnIndex}`}
                className="flex min-w-0 flex-col gap-2"
              >
                {column.map((idea) => {
                  const status = idea.import_state === 'pending' ? '整理中' : idea.import_state === 'failed' ? '整理未完成' : '';
                  return <article key={idea.id} className="flex min-h-[112px] items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-2">
                    <button type="button" aria-label={`查看題材：${idea.title}`} onClick={() => setDetailId(idea.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left focus-visible:outline-2 focus-visible:outline-[#7b4a4f]">
                      <TopicThumbnail key={idea.image_url || idea.id} idea={idea} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-xs text-zinc-500">{topicLocationLabel(idea) || (idea.geography_kind === 'none' ? '不限地區' : '地點未確認')}</p>
                        <h2 className="line-clamp-2 text-[15px] font-bold leading-5 text-zinc-950">{idea.title}</h2>
                        <p className="truncate text-xs text-zinc-500">{[status, idea.category, idea.platform].filter(Boolean).join(' · ')}</p>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col">
                      <button type="button" aria-label={idea.saved ? '已收藏，按此取消收藏' : '收藏題材'} aria-pressed={idea.saved} disabled={pendingId !== null} onClick={() => void act(idea, idea.saved ? 'unsave' : 'save')} className={`flex min-h-11 min-w-[76px] flex-col items-center justify-center rounded-xl px-2 text-[11px] font-bold transition ${idea.saved ? 'bg-[#7b4a4f] text-white' : 'bg-[#f5eee7] text-[#7b4a4f]'}`}><Bookmark className="h-5 w-5" fill={idea.saved ? 'currentColor' : 'none'} /><span>{idea.saved ? '已收藏' : '收藏'}</span></button>
                      <details className="relative"><summary aria-label={`管理題材：${idea.title}`} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg"><MoreHorizontal className="h-5 w-5" /></summary><div className="absolute right-0 z-20 w-40 rounded-xl border bg-white p-2 shadow-lg">
                        <button disabled={pendingId !== null} onClick={() => void act(idea, idea.dismissed ? 'restore' : 'dismiss')} className="min-h-11 w-full rounded-lg text-sm hover:bg-zinc-100">{idea.dismissed ? '恢復顯示' : '隱藏此題材'}</button>
                        {idea.manageable || (canManageCovers && idea.workspace_id) ? <button disabled={pendingId !== null} onClick={() => { setCoverIdeaId(idea.id); coverInput.current?.click(); }} className="min-h-11 w-full rounded-lg text-sm hover:bg-zinc-100">更換封面</button> : null}
                      </div></details>
                    </div>
                  </article>;
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center">
            <strong className="block text-sm">{showHidden ? '沒有已隱藏的題材符合篩選' : '暫時未有相符題材'}</strong>
            <span className="mt-2 block text-sm text-zinc-500">
              {showHidden ? '隱藏的題材可以在此恢復顯示。' : 'SOON 正在整理新一批靈感，你亦可以探索其他題材。'}
            </span>
            {ideas.length ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("全部");
                  setLocation("全部地區");
                  setCountry("全部國家");
                  setLibraryView("all");
                }}
                className="mt-4 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white"
              >
                探索所有題材
              </button>
            ) : null}
          </div>
        )}
      </section>
      <dialog ref={filterDialog} onCancel={() => setFiltersOpen(false)} onClose={() => setFiltersOpen(false)} aria-label="篩選題材" className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-3xl p-0 backdrop:bg-black/40 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3"><h2 className="text-lg font-bold">篩選題材</h2><button autoFocus aria-label="關閉篩選" onClick={() => setFiltersOpen(false)} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" /></button></div>
        <div className="space-y-5 p-5">
          {!showHidden ? <label className="block text-sm">來源<select aria-label="題材來源" value={draftScope} onChange={e => { setDraftScope(e.target.value as 'central' | 'workspace'); setDraftCountry('全部國家'); setDraftLocation('全部地區'); }} className="mt-2 block h-11 w-full rounded-lg border bg-white px-3"><option value="central">SOON 中央題材 ({centralCount})</option><option value="workspace">我的題材 ({workspaceCount})</option></select></label> : null}
          <fieldset><legend className="mb-2 text-sm">國家／地區</legend><div className="flex flex-wrap gap-2">{countries.map(item => <button key={item} type="button" aria-pressed={draftCountry === item} onClick={() => { setDraftCountry(item); setDraftLocation('全部地區'); }} className={`min-h-11 rounded-full px-4 text-sm ${draftCountry === item ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>{countryLabel(item)}</button>)}</div></fieldset>
          {draftCountry !== '全部國家' && locations.length > 1 ? <fieldset><legend className="mb-2 text-sm">城市／區域</legend><div className="flex flex-wrap gap-2">{locations.map(item => <button key={item} type="button" aria-pressed={draftLocation === item} onClick={() => setDraftLocation(item)} className={`min-h-11 rounded-full px-4 text-sm ${draftLocation === item ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'}`}>{item}</button>)}</div></fieldset> : null}
        </div>
        <div className="sticky bottom-0 flex gap-4 border-t bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"><button type="button" className="min-h-11 px-3 text-sm text-amber-800" onClick={() => { setDraftCountry('全部國家'); setDraftLocation('全部地區'); }}>重設</button><button type="button" className="min-h-11 flex-1 rounded-xl bg-zinc-950 text-sm font-bold text-white" onClick={() => { if (draftScope !== libraryScope) setCategory('全部'); setLibraryScope(draftScope); setCountry(draftCountry); setLocation(draftLocation); setFiltersOpen(false); }}>顯示 {draftCount} 個題材</button></div>
      </dialog>
      <dialog ref={detailDialog} onCancel={() => setDetailId(null)} onClose={() => setDetailId(null)} aria-label="題材詳情" className="fixed inset-0 m-auto max-h-[90dvh] w-[92vw] max-w-xl overflow-y-auto rounded-2xl p-0 backdrop:bg-black/40">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-5 py-2"><h2 className="font-bold">題材詳情</h2><button autoFocus type="button" aria-label="關閉詳情" onClick={() => setDetailId(null)} className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" /></button></div>
        {detail ? (() => { const idea = detail; return <><TopicMedia key={idea.id} idea={idea} onBrokenCover={(broken) => void repairBrokenCover(broken)} />                      <div className="space-y-3 p-5">
                        {idea.manageable || (canManageCovers && idea.workspace_id) ? (
                          <div className="mb-2 flex justify-end gap-1.5">
                            {idea.manageable ||
                            (canManageCovers && idea.workspace_id) ? (
                              <button
                                type="button"
                                disabled={pendingId !== null}
                                onClick={() => {
                                  setCoverIdeaId(idea.id);
                                  coverInput.current?.click();
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-semibold text-zinc-600 hover:border-zinc-900"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                                更換封面
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-[11px] font-semibold uppercase text-zinc-400">
                          {idea.source_name || idea.platform}
                        </p>
                        <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-zinc-900">
                          {idea.title}
                        </h2>
                        {idea.import_state === 'pending' ? <p className="text-sm text-amber-800">正在背景整理，可以離開此頁。</p> : null}
                        {idea.import_state === 'failed' ? <p className="text-sm text-red-600">{idea.import_error || '整理未完成，請重試。'}</p> : null}
                        {idea.recommendation_reason ? <p className="text-sm text-amber-800">{idea.recommendation_reason}</p> : null}
                        {idea.hook ? <p className="text-sm">開場：{idea.hook}</p> : null}
                        {idea.summary ? (
                          <p className="mt-2 text-base leading-relaxed text-zinc-600">
                            {idea.summary}
                          </p>
                        ) : null}
                        {idea.import_state === "failed" && idea.source_url && <button type="button" disabled={retryingId === idea.id} onClick={async () => {
                          setRetryingId(idea.id);
                          try {
                            const response = await fetch("/api/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", sourceUrl: idea.source_url, context: idea.summary }) });
                            const result = await response.json().catch(() => ({}));
                            if (!response.ok) throw new Error(result.error || "整理未完成，請補充原文後重試。");
                            window.location.reload();
                          } catch (error) { window.alert(error instanceof Error ? error.message : "整理服務暫時無法回應。"); }
                          finally { setRetryingId(null); }
                        }}>{retryingId === idea.id ? "正在重新整理…" : "重新整理題材"}</button>}
                        {idea.why_now && !idea.why_now.includes("由 EGG 創作者社群共享") ? (
                          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-900">
                            <strong>製作價值：</strong>
                            {idea.why_now}
                          </p>
                        ) : null}

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {idea.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {idea.source_url ? (
                          <Link
                            href={idea.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:underline"
                          >
                            查看原文 <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            disabled={pendingId === idea.id}
                            onClick={() => void act(idea, idea.saved ? "unsave" : "save")}
                            className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold ${idea.saved ? "bg-[#7b4a4f] text-white" : "bg-[#f5eee7] text-[#7b4a4f]"}`}
                          >
                            <Bookmark className="h-3.5 w-3.5" fill={idea.saved ? "currentColor" : "none"} />
                            {idea.saved ? "已收藏" : "收藏"}
                          </button>
                          <button
                            type="button"
                            disabled={pendingId !== null || idea.import_state === 'pending' || idea.import_state === 'failed'}
                            onClick={() => void act(idea, idea.dismissed ? "restore" : "create")}
                            className="flex min-h-10 items-center justify-center gap-1 rounded-lg bg-zinc-950 px-2 text-xs font-semibold text-white"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {idea.dismissed ? "恢復顯示" : "開始製作"}
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={pendingId === idea.id}
                          onClick={() => void act(idea, idea.dismissed ? "restore" : "dismiss")}
                          className="mt-1.5 flex min-h-8 w-full items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          {idea.dismissed ? "恢復顯示" : "隱藏此題材"}
                        </button>
                      </div>
</>; })() : null}
      </dialog>
    </main>
  );
}
