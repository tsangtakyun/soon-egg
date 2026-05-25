"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Layout, Loader2, Save } from "lucide-react";

export interface Scene {
  scene: number;
  time: string;
  visual: string;
  voiceover: string;
  shot_type: string;
  notes?: string;
}

export type RecentScript = {
  id: string;
  title: string;
  ai_draft: string | null;
  created_at: string | null;
};

export type SavedStoryboard = {
  id: string;
  title: string | null;
  scripts: string | null;
  selections: string | Scene[] | null;
  status: string | null;
  created_at: string | null;
};

const platforms = ["YouTube", "IG Reel", "小紅書"];
const sceneCounts = [5, 8, 10, 12];

export function StoryboardClient({
  scripts,
  storyboards,
  balance: initialBalance,
  initialScript,
}: {
  scripts: RecentScript[];
  storyboards: SavedStoryboard[];
  workspaceId: string;
  userEmail: string;
  balance: number;
  initialScript: string;
}) {
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [scriptText, setScriptText] = useState(initialScript);
  const [platform, setPlatform] = useState("IG Reel");
  const [sceneCount, setSceneCount] = useState(8);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [storyboardId, setStoryboardId] = useState<string | null>(null);
  const [title, setTitle] = useState(`分鏡 ${new Date().toLocaleDateString("zh-HK")}`);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [recentStoryboards, setRecentStoryboards] = useState(storyboards);

  const currentScript = useMemo(() => scripts.find((script) => script.id === selectedScriptId), [scripts, selectedScriptId]);

  function handleSelectScript(id: string) {
    setSelectedScriptId(id);
    const script = scripts.find((item) => item.id === id);
    if (script?.ai_draft) {
      setScriptText(script.ai_draft);
      setTitle(`${script.title} 分鏡`);
    }
  }

  async function handleGenerate() {
    if (!scriptText.trim()) return;
    setLoading(true);
    const response = await fetch("/api/tools/storyboard/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script_text: scriptText, platform, scene_count: sceneCount, title }),
    });
    const data = await response.json();

    if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
      return;
    }

    if (!response.ok) {
      alert(`生成失敗：${data.error ?? "請稍後再試"}`);
      setLoading(false);
      return;
    }

    setScenes(data.scenes ?? []);
    setStoryboardId(data.storyboard_id ?? null);
    if (typeof data.balance === "number") setBalance(data.balance);
    if (data.saved) {
      setRecentStoryboards((current) => [data.saved, ...current.filter((item) => item.id !== data.saved.id)].slice(0, 5));
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!storyboardId || scenes.length === 0) return;
    setSaving(true);
    const response = await fetch("/api/tools/storyboard/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyboard_id: storyboardId, title, scenes }),
    });
    const data = await response.json();
    if (data.success) {
      setRecentStoryboards((current) =>
        current.map((item) => (item.id === storyboardId ? { ...item, title, selections: scenes, status: "saved" } : item)),
      );
    } else {
      alert(`儲存失敗：${data.error ?? "請稍後再試"}`);
    }
    setSaving(false);
  }

  async function handleCopy() {
    if (scenes.length === 0) return;
    await navigator.clipboard.writeText(formatScenes(scenes));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">分鏡工作台</h1>
          <p className="mt-2 text-sm text-zinc-500">把劇本拆成清楚的拍攝場景，方便安排鏡頭、旁白和道具。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <section className="space-y-5 rounded-2xl border bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">Step 1 · 選擇或貼上劇本</h2>
          <p className="mt-1 text-xs text-zinc-400">可從最近劇本選取，亦可直接貼上任何文字。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">最近劇本</span>
            <select
              value={selectedScriptId}
              onChange={(event) => handleSelectScript(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300"
            >
              <option value="">手動貼上 / 不選擇</option>
              {scripts.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.title} {script.created_at ? `· ${new Date(script.created_at).toLocaleDateString("zh-HK")}` : ""}
                </option>
              ))}
            </select>
            {currentScript?.created_at && <p className="mt-1 text-xs text-zinc-400">建立於 {new Date(currentScript.created_at).toLocaleString("zh-HK")}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">劇本文字</span>
            <textarea
              value={scriptText}
              onChange={(event) => setScriptText(event.target.value)}
              placeholder="貼上劇本內容..."
              rows={8}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-purple-300"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Step 2 · 分鏡設定</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">分鏡標題</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300" />
          </label>
          <SelectField label="平台" value={platform} onChange={setPlatform} options={platforms} />
          <label>
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">分鏡數量</span>
            <select
              value={sceneCount}
              onChange={(event) => setSceneCount(Number(event.target.value))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300"
            >
              {sceneCounts.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!scriptText.trim() || loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-40"
          type="button"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Layout className="h-4 w-4" aria-hidden />}
          {loading ? "生成中..." : "AI 生成分鏡"}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-400">每次 AI 生成扣 3 credits</p>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">分鏡結果</h2>
            {storyboardId && <p className="mt-1 text-xs text-zinc-400">已建立 draft，可按「儲存分鏡」確認。</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} disabled={scenes.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40" type="button">
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Clipboard className="h-3.5 w-3.5" aria-hidden />}
              {copied ? "已複製" : "複製全部"}
            </button>
            <button
              onClick={handleSave}
              disabled={!storyboardId || scenes.length === 0 || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-40"
              type="button"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saving ? "儲存中..." : "儲存分鏡"}
            </button>
          </div>
        </div>

        {scenes.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 py-16 text-center text-sm text-zinc-400">生成後，場景卡片會顯示在這裡。</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {scenes.map((scene) => (
              <SceneCard key={`${scene.scene}-${scene.time}`} scene={scene} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">最近分鏡</h2>
        {recentStoryboards.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">暫未有分鏡</p>
        ) : (
          <div className="divide-y">
            {recentStoryboards.map((storyboard) => (
              <button
                key={storyboard.id}
                onClick={() => {
                  setStoryboardId(storyboard.id);
                  setTitle(storyboard.title ?? "");
                  setScriptText(storyboard.scripts ?? "");
                  setScenes(parseScenes(storyboard.selections));
                }}
                className="block w-full py-3 text-left hover:bg-zinc-50"
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{storyboard.title ?? "未命名分鏡"}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {storyboard.created_at ? new Date(storyboard.created_at).toLocaleString("zh-HK") : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">{storyboard.status ?? "draft"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-300">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SceneCard({ scene }: { scene: Scene }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">Scene {scene.scene}</span>
        <span className="text-xs text-zinc-400">{scene.time}</span>
      </div>
      <Detail label="畫面描述" value={scene.visual} />
      <Detail label="旁白 / 對白" value={scene.voiceover} />
      <Detail label="鏡頭類型" value={scene.shot_type} />
      {scene.notes && <Detail label="備注" value={scene.notes} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-xs font-medium text-zinc-400">{label}</p>
      <p className="text-sm leading-6 text-zinc-800">{value}</p>
    </div>
  );
}

function parseScenes(value: string | Scene[] | null): Scene[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : parsed.scenes ?? [];
  } catch {
    return [];
  }
}

function formatScenes(scenes: Scene[]) {
  return scenes
    .map((scene) => [`Scene ${scene.scene} (${scene.time})`, `畫面：${scene.visual}`, `旁白：${scene.voiceover}`, `鏡頭：${scene.shot_type}`, scene.notes ? `備注：${scene.notes}` : ""].filter(Boolean).join("\n"))
    .join("\n\n");
}
