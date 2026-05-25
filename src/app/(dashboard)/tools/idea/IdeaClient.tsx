"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Plus, Search, Trash2 } from "lucide-react";

export type Idea = {
  id: string;
  title: string;
  topic?: string | null;
  summary?: string | null;
  viral_score?: number | null;
  thumb?: string | null;
  platform?: string | null;
  region?: string | null;
  tags?: string[] | null;
  views?: number | null;
  script_hook?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type PlatformFilter = "全部" | "IG Reel" | "YouTube" | "小紅書";

const filters: PlatformFilter[] = ["全部", "IG Reel", "YouTube", "小紅書"];
const platformOptions = ["IG Reel", "YouTube", "小紅書", "其他"];

export function IdeaClient({
  trendingIdeas,
  myIdeas,
  balance,
}: {
  trendingIdeas: Idea[];
  myIdeas: Idea[];
  workspaceId: string;
  userEmail: string;
  balance: number;
}) {
  const [activeTab, setActiveTab] = useState<"trending" | "mine">("trending");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("全部");
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>(myIdeas);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTrending = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return trendingIdeas.filter((idea) => {
      const matchesPlatform = platform === "全部" || normalizePlatform(idea.platform) === platform;
      const searchTarget = [idea.title, idea.topic, idea.summary, idea.script_hook, ...(idea.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || searchTarget.includes(normalizedQuery);
      return matchesPlatform && matchesQuery;
    });
  }, [platform, query, trendingIdeas]);

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">靈感工作台</h1>
          <p className="mt-2 text-sm text-zinc-500">探索爆款題材，整理你的創作靈感庫。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("trending")}
          className={`px-5 py-3 text-sm font-medium transition ${activeTab === "trending" ? "border-b-2 border-black text-black" : "text-zinc-400"}`}
          type="button"
        >
          爆款題材
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-5 py-3 text-sm font-medium transition ${activeTab === "mine" ? "border-b-2 border-black text-black" : "text-zinc-400"}`}
          type="button"
        >
          我的靈感庫
        </button>
      </div>

      {activeTab === "trending" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋題材、平台、標籤..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-950 outline-none focus:border-purple-300"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlatform(filter)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    platform === filter ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-950"
                  }`}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredTrending.length === 0 ? (
            <EmptyState text="暫未找到相關題材" />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredTrending.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onSaved={(savedIdea) => setSavedIdeas((current) => [savedIdea, ...current.filter((item) => item.id !== savedIdea.id)])}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden />
              新增靈感
            </button>
          </div>

          {savedIdeas.length === 0 ? (
            <EmptyState text="暫未儲存靈感" />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {savedIdeas.map((idea) => (
                <SavedIdeaCard key={idea.id} idea={idea} onDelete={(id) => setSavedIdeas((current) => current.filter((item) => item.id !== id))} />
              ))}
            </div>
          )}
        </section>
      )}

      {showAddModal && (
        <AddIdeaModal
          onClose={() => setShowAddModal(false)}
          onAdded={(idea) => {
            setSavedIdeas((current) => [idea, ...current]);
            setShowAddModal(false);
          }}
        />
      )}
    </main>
  );
}

function IdeaCard({ idea, onSaved }: { idea: Idea; onSaved: (idea: Idea) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/tools/idea/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: idea.title,
        topic: idea.topic,
        summary: idea.summary,
        viral_score: idea.viral_score,
        thumb: idea.thumb,
        platform: idea.platform,
        tags: idea.tags,
        script_hook: idea.script_hook,
        source_idea_id: idea.id,
      }),
    });
    const data = await response.json();
    if (data.success) {
      setSaved(true);
      onSaved({ ...idea, id: data.idea?.id ?? idea.id, created_at: new Date().toISOString() });
    } else if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
    } else {
      alert(`儲存失敗：${data.error ?? "請稍後再試"}`);
    }
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      {idea.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={idea.thumb} className="h-36 w-full object-cover" alt={idea.title} />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50">
          <Lightbulb className="h-9 w-9 text-purple-500" aria-hidden />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-sm font-semibold">{idea.title}</h3>
          {Number(idea.viral_score ?? 0) > 0 && (
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{idea.viral_score}x</span>
          )}
        </div>
        {idea.summary && <p className="mb-2 line-clamp-2 text-xs leading-5 text-zinc-500">{idea.summary}</p>}
        {idea.script_hook && <p className="mb-2 line-clamp-1 text-xs italic text-purple-600">Hook: {idea.script_hook}</p>}
        {idea.views ? <p className="mb-2 text-xs text-zinc-400">{Number(idea.views).toLocaleString()} views</p> : null}
        {idea.tags && idea.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {idea.tags.slice(0, 3).map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saved || saving}
          className={`w-full rounded-xl py-2 text-xs font-medium transition ${
            saved ? "cursor-default bg-green-50 text-green-600" : "bg-black text-white hover:bg-zinc-800 disabled:opacity-50"
          }`}
          type="button"
        >
          {saving ? "儲存中..." : saved ? "已儲存" : "儲存靈感"}
        </button>
      </div>
    </div>
  );
}

function SavedIdeaCard({ idea, onDelete }: { idea: Idea; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch("/api/tools/idea/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea_id: idea.id }),
    });
    const data = await response.json();
    if (data.success) onDelete(idea.id);
    else alert(`刪除失敗：${data.error ?? "請稍後再試"}`);
    setDeleting(false);
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-purple-600">{idea.platform ?? "其他"}</p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-950">{idea.title}</h3>
          {idea.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{idea.notes}</p>}
          {idea.created_at && <p className="mt-2 text-xs text-zinc-400">{new Date(idea.created_at).toLocaleString("zh-HK")}</p>}
        </div>
        <button onClick={handleDelete} disabled={deleting} className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600" type="button">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function AddIdeaModal({ onClose, onAdded }: { onClose: () => void; onAdded: (idea: Idea) => void }) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("IG Reel");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);
    const response = await fetch("/api/tools/idea/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, platform, summary, notes }),
    });
    const data = await response.json();
    if (data.success) {
      onAdded(data.idea);
    } else {
      alert(`新增失敗：${data.error ?? "請稍後再試"}`);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold">新增靈感</h3>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">標題 *</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">平台</label>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">描述</label>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} className="w-full resize-none rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">備注</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full resize-none rounded-xl border px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={handleSave} disabled={!title.trim() || loading} className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40" type="button">
            {loading ? "儲存中..." : "儲存"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm text-zinc-500" type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border bg-white py-16 text-center text-sm text-zinc-400">{text}</div>;
}

function normalizePlatform(platform?: string | null): PlatformFilter | string {
  const value = (platform ?? "").toLowerCase();
  if (value.includes("ig") || value.includes("reel") || value.includes("instagram")) return "IG Reel";
  if (value.includes("youtube")) return "YouTube";
  if (value.includes("小紅書") || value.includes("xhs")) return "小紅書";
  return platform ?? "其他";
}
