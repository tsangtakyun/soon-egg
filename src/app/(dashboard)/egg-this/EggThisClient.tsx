"use client";

import { useEffect, useRef, useState } from "react";
import { usePendingPageWarning } from "@/hooks/usePendingPageWarning";
import { ProductionStylePicker, type StyleChoice } from "@/components/egg/ProductionStylePicker";
import {
  Camera,
  Check,
  Clipboard,
  Clock3,
  Images,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Mic2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Video,
  WandSparkles,
  X,
} from "lucide-react";

type Recipe = {
  id: string;
  name: string;
  production_mode: string;
  format: string;
  config: Record<string, unknown>;
};
type Angle = {
  id: string;
  label: string;
  premise: string;
  audience_promise: string;
  rationale: string;
  risk_flags?: string[];
};
type Pack = {
  id: string;
  content: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  edited_at?: string | null;
  edit_count?: number;
  approval_status?: "draft" | "approved" | "dismissed";
  approved_by_role?: string | null;
  approved_at?: string | null;
  approval_method?: string | null;
  approved_content_hash?: string | null;
};
type WorkflowPhase = "script" | "shoot" | "publish";
type ScriptPart = { section: string; time: string; visual: string; dialogue: string };
type Clarification = { summary: string; question: string; options: string[] };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ [index: number]: { transcript?: string } }> }) => void) | null;
  start: () => void;
  abort: () => void;
};
type SourcePreview = {
  url: string;
  domain: string;
  title: string;
  description: string;
  excerpt: string;
};

export function EggThisClient({
  initialInput,
  initialTopicId,
  initialMode,
}: {
  initialInput: string;
  initialTopicId: string;
  initialMode: string;
}) {
  const [input, setInput] = useState(initialInput);
  const [projectId, setProjectId] = useState("");
  const [styleChoice, setStyleChoice] = useState<StyleChoice | null>(null);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedAngle, setSelectedAngle] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [pack, setPack] = useState<Pack | null>(null);
  const [history, setHistory] = useState<Pack[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [preferenceSignalCount, setPreferenceSignalCount] = useState(0);
  const [loading, setLoading] = useState<"angles" | "pack" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [clarification, setClarification] = useState<Clarification | null>(null);
  const [clarificationInput, setClarificationInput] = useState("");
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>("script");
  const [completedParts, setCompletedParts] = useState<number[]>([]);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(
    null,
  );
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [shootStatus, setShootStatus] = useState<
    "not_visited" | "visited" | "existing_assets"
  >("not_visited");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shootSaveQueue = useRef<Promise<void>>(Promise.resolve());
  usePendingPageWarning(Boolean(loading) || voiceLoading || listening);
  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/egg/packs?limit=20")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (!active) return;
        const packs = result.packs ?? [];
        setHistory(packs);
        setHistoryError("");
      })
      .catch(() => {
        if (active) setHistoryError("未能載入最近內容，請重新整理後再試。");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles]);

  useEffect(() => {
    if (loading !== "pack") {
      setGenerationSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setGenerationSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loading]);


  function openPack(item: Pack) {
    const workflow = isRecord(item.content._workflow) ? item.content._workflow : {};
    setPack(item);
    setWorkflowPhase(isWorkflowPhase(workflow.phase) ? workflow.phase : "script");
    setCompletedParts(Array.isArray(workflow.completed_parts) ? workflow.completed_parts.filter((value): value is number => typeof value === "number") : []);
    setPreferenceSignalCount(0);
  }

  async function findAngles(clarificationAnswer?: string) {
    if (!input.trim() && !initialTopicId && !imageFiles.length) return;
    setLoading("angles");
    setError("");
    setPack(null);
    setClarification(null);
    setClarificationInput("");
    setPreferenceSignalCount(0);
    setSourcePreview(null);
    try {
      const body = new FormData();
      body.set("input", clarificationAnswer ? `${input.trim()}\n使用者補充確認：${clarificationAnswer}` : input);
      body.set("sourceTopicId", initialTopicId);
      body.set("origin", initialTopicId ? "topic_library" : "egg_this");
      imageFiles.slice(0, 6).forEach((file) => body.append("images", file));
      const response = await fetch("/api/egg/projects", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能整理內容方向");
      if (result.needsClarification) {
        setClarification(result.understanding);
        return;
      }
      setProjectId(result.project.id);
      setAngles(result.angles ?? []);
      setRecipes(result.recipes ?? []);
      setSourcePreview(result.sourcePreview ?? null);
      setSelectedAngle(result.angles?.[0]?.id ?? "");
      setSelectedRecipe(
        result.recipes?.find(
          (recipe: Recipe) => recipe.production_mode === initialMode,
        )?.id ??
          result.recipes?.[0]?.id ??
          "",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "未能整理內容方向");
    } finally {
      setLoading(null);
    }
  }

  function toggleSpeech() {
    if (listening) return;
    const SpeechRecognition = (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      ?? (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("此瀏覽器不支援即時語音辨識。可選擇錄音檔轉成文字，或使用鍵盤的語音輸入。");
      voiceInputRef.current?.click();
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "zh-HK";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("未能辨識語音，請再說一次。"); };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setInput((current) => current ? `${current}\n${transcript}` : transcript);
    };
    try { recognition.start(); } catch { setListening(false); setError("未能啟動麥克風，請檢查權限，或改為上載錄音檔。"); }
  }

  async function transcribeAudio(file: File) {
    if (file.size > 25 * 1024 * 1024) { setError("錄音檔不可超過 25MB。"); return; }
    setVoiceLoading(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/mobile/reply/transcribe", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.transcript) throw new Error(result.error || "未能辨識錄音");
      setInput(current => [current.trim(), result.transcript].filter(Boolean).join("\n"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "未能辨識錄音，請改用文字輸入。"); }
    finally { setVoiceLoading(false); }
  }

  async function generatePack() {
    if (!projectId || !selectedAngle || !selectedRecipe) return;
    setLoading("pack");
    setError("");
    try {
      const response = await fetch(`/api/egg/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angleId: selectedAngle,
          recipeId: selectedRecipe,
          shootStatus,
          styleChoice,
          styleFlowVersion: 1,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能生成內容包");
      setPack(result.pack);
      setWorkflowPhase("script");
      setCompletedParts([]);
      setPreferenceSignalCount(result.preferenceSignalCount ?? 0);
      setHistory((current) => [
        result.pack,
        ...current.filter((item) => item.id !== result.pack.id),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "未能生成內容包");
    } finally {
      setLoading(null);
    }
  }

  async function copyPack() {
    if (!pack) return;
    await navigator.clipboard.writeText(packToText(pack.content));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function savePack(content: Record<string, unknown>, updateCurrent = true) {
    if (!pack) return false;
    const response = await fetch(`/api/egg/packs/${pack.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "未能儲存修改");
    if (updateCurrent) {
      setPack((current) => current ? { ...current, content: result.pack?.content ?? content } : current);
    }
    setHistory((current) =>
      current.map((item) =>
        item.id === pack.id
          ? {
              ...item,
              ...result.pack,
              content: result.pack?.content ?? content,
            }
          : item,
      ),
    );
    return true;
  }

  async function approvePack(content: Record<string, unknown>) {
    if (!pack) return;
    await shootSaveQueue.current.catch(() => undefined);
    const response = await fetch(`/api/egg/packs/${pack.id}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", content, method: "creator_confirmed" }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "未能確認定稿");
    setPack((current) => current ? { ...current, ...result.pack } : current);
    setHistory((current) => current.map((item) => item.id === pack.id ? { ...item, ...result.pack } : item));
  }

  function workflowContent(content: Record<string, unknown>, phase: WorkflowPhase, completed = completedParts) {
    return { ...content, _workflow: { phase, completed_parts: completed, updated_at: new Date().toISOString() } };
  }

  async function saveWorkflow(content: Record<string, unknown>, phase: WorkflowPhase, completed = completedParts) {
    const next = workflowContent(content, phase, completed);
    await savePack(next);
    setPack((current) => current ? { ...current, content: next } : current);
    return next;
  }

  async function confirmScript(content: Record<string, unknown>) {
    const next = await saveWorkflow(content, "shoot");
    setPack((current) => current ? { ...current, content: next } : current);
    setWorkflowPhase("shoot");
  }

  function toggleShot(content: Record<string, unknown>, index: number) {
    if (!pack) return;
    const completed = completedParts.includes(index) ? completedParts.filter((item) => item !== index) : [...completedParts, index];
    const next = workflowContent(content, "shoot", completed);
    setCompletedParts(completed);
    setPack({ ...pack, content: next });
    shootSaveQueue.current = shootSaveQueue.current
      .catch(() => undefined)
      .then(() => savePack(next, false).then(() => undefined))
      .catch(() => setError("拍攝進度未能在背景儲存，請重新標記該段。"));
  }

  function finishShooting(content: Record<string, unknown>) {
    if (!pack) return;
    const next = workflowContent(content, "publish", completedParts);
    setPack({ ...pack, content: next });
    setWorkflowPhase("publish");
    shootSaveQueue.current = shootSaveQueue.current
      .catch(() => undefined)
      .then(() => savePack(next, false).then(() => undefined))
      .catch(() => setError("拍攝進度未能在背景儲存，請返回拍攝清單再試。"));
  }

  function returnToEggHome() {
    setPack(null);
    setInput("");
    setProjectId("");
    setAngles([]);
    setRecipes([]);
    setSelectedAngle("");
    setSelectedRecipe("");
    setImageFiles([]);
    setSourcePreview(null);
    setClarification(null);
    setCompletedParts([]);
    setWorkflowPhase("script");
  }

  const selectedProductionMode = recipes.find(
    (recipe) => recipe.id === selectedRecipe,
  )?.production_mode;
  const statusOptions =
    selectedProductionMode === "snapshot_reference"
      ? SNAPSHOT_STATUS_OPTIONS
      : SHOOT_STATUS_OPTIONS;

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-4 pb-12 pt-[8vh] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b4a4f]">
            Egg This
          </p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">
            將日常變成內容
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            輸入文字、貼上連結、上載相片，或者向 EGG 說明你的想法。
          </p>
        </header>

        <section className="mb-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#7b4a4f]" />
                <h2 className="text-sm font-black text-zinc-900">最近內容</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                重新整理後仍可開啟之前生成及修改過的內容。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPack(null);
                setPreferenceSignalCount(0);
                setInput("");
                setProjectId("");
                setAngles([]);
                setImageFiles([]);
                setSourcePreview(null);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              新增
            </button>
          </div>
          {historyLoading ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在載入紀錄…
            </div>
          ) : historyError ? (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-3 py-3 text-xs text-red-700">
              {historyError}
            </p>
          ) : history.length ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openPack(item)}
                  className={`min-w-56 max-w-72 rounded-2xl border p-3 text-left transition ${pack?.id === item.id ? "border-[#7b4a4f] bg-[#fff7e6] ring-1 ring-[#ead8dc]" : "border-zinc-200 hover:border-zinc-400"}`}
                >
                  <span className="line-clamp-2 text-sm font-black leading-5 text-zinc-900">
                    {String(item.content.title ?? "未命名內容")}
                  </span>
                  <span className="mt-2 block text-[11px] text-zinc-500">
                    {formatHistoryDate(item.updated_at ?? item.created_at)}
                    {item.edit_count ? ` · 修改 ${item.edit_count} 次` : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-zinc-50 px-3 py-3 text-xs text-zinc-500">
              未有內容紀錄。生成第一份內容後會自動保存在這裡。
            </p>
          )}
        </section>

        <ol className="mb-5 grid gap-2 sm:grid-cols-3" aria-label="使用步驟">
          {["輸入文字、語音或相片", "選擇方向及製作方式", "編輯劇本並完成拍攝"].map(
            (step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff0c2] text-xs font-black text-[#7b4a4f]">
                  {index + 1}
                </span>
                {step}
              </li>
            ),
          )}
        </ol>

        <section className="rounded-3xl border border-[#ead8dc] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-zinc-900">
                將日常變成內容？
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                文字、語音和相片可以分開或一併提供，最多加入 6 張相片。
              </p>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={5}
            placeholder="例如：台灣有一個以十八層地獄為主題的景點，或者直接貼上文章連結…"
            className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 outline-none focus:border-[#7b4a4f]"
          />
          <button
            type="button"
            onClick={toggleSpeech}
            disabled={listening || voiceLoading || Boolean(loading)}
            className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-bold ${listening ? "border-[#7b4a4f] bg-[#fff7e6] text-[#7b4a4f]" : "border-zinc-200 bg-white text-zinc-700 hover:border-[#7b4a4f]"}`}
          >
            {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
            {listening ? "正在聆聽，請開始說話…" : "使用語音輸入"}
          </button>
          <input ref={voiceInputRef} type="file" accept="audio/*,.opus,.m4a,.mp3,.wav,.ogg" className="sr-only" aria-label="選擇錄音檔" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void transcribeAudio(file); }} />
          <button type="button" disabled={voiceLoading || listening || Boolean(loading)} onClick={() => voiceInputRef.current?.click()} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-200 text-sm disabled:opacity-50">{voiceLoading ? "正在轉寫，請暫時留在此頁…" : "上載錄音檔"}</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            multiple
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []).slice(0, Math.max(0, 6 - imageFiles.length));
              setError(selected.some((file) => file.size > 8 * 1024 * 1024) ? "每張圖片不可超過 8MB" : "");
              setImageFiles((current) => [...current, ...selected.filter((file) => file.size <= 8 * 1024 * 1024)].slice(0, 6));
              event.target.value = "";
            }}
          />
          {imagePreviews.length ? (
            <div className="mt-3 rounded-2xl border border-[#ead8dc] bg-[#fff7e6] p-3">
              <div className="mb-2 flex items-center justify-between text-xs"><strong>現場相片 {imageFiles.length}/6</strong><span className="text-zinc-500">可以繼續加入</span></div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagePreviews.map((preview, index) => <div key={preview} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                  <img src={preview} alt={`現場相片 ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`移除第 ${index + 1} 張相片`} onClick={() => setImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-zinc-950/75 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  <span className="absolute bottom-1 left-1 rounded-full bg-zinc-950/75 px-2 py-0.5 text-[10px] text-white">{index + 1}</span>
                </div>)}
              </div>
              {imageFiles.length < 6 ? <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-bold text-[#7b4a4f]">＋ 再加入相片</button> : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex min-h-24 w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-sm font-bold text-zinc-700 hover:border-[#7b4a4f] hover:bg-[#fff7e6]"
            >
              <ImagePlus className="h-5 w-5 text-[#7b4a4f]" />
              <span>
                上載現場相片
                <span className="mt-1 block text-xs font-normal text-zinc-400">
                  最多 6 張，每張不超過 8MB
                </span>
              </span>
            </button>
          )}
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            <strong className="text-zinc-700">小提示：</strong>
            最好說明希望吸引哪類觀眾，或者希望觀眾看完有甚麼感受；資料越具體，方向越貼近你。
          </p>
          <button
            type="button"
            onClick={() => void findAngles()}
            disabled={
              loading !== null ||
              (!input.trim() && !initialTopicId && !imageFiles.length)
            }
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {loading === "angles" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading === "angles" ? "EGG 正在處理…" : "找出內容方向"}
          </button>
          {loading === "angles" ? <LoadingProgress steps={["正在理解文字及相片", "正在查證題材與來源", "正在配合你的 Creator DNA 整理方向"]} /> : null}
        </section>

        {clarification ? <section className="mt-5 rounded-3xl border border-[#dcb9bd] bg-[#fff7e6] p-5">
          <p className="text-xs text-zinc-500">EGG 暫時理解：{clarification.summary}</p>
          <h2 className="mt-3 text-lg font-black text-zinc-950">{clarification.question}</h2>
          <div className="mt-4 grid gap-2">{clarification.options.map((option) => <button key={option} type="button" onClick={() => void findAngles(option)} className="rounded-2xl border border-[#ead8dc] bg-white px-4 py-3 text-left text-sm font-bold hover:border-[#7b4a4f]">{option} →</button>)}</div>
          <div className="mt-3 flex gap-2">
            <input value={clarificationInput} onChange={(event) => setClarificationInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && clarificationInput.trim()) void findAngles(clarificationInput.trim()); }} placeholder="補充店名、地址或其他資料…" className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[#ead8dc] bg-white px-4 text-sm outline-none focus:border-[#7b4a4f]" />
            <button type="button" disabled={!clarificationInput.trim() || loading !== null} onClick={() => void findAngles(clarificationInput.trim())} className="min-h-12 shrink-0 rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white disabled:opacity-40">送出</button>
          </div>
        </section> : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        {sourcePreview ? (
          <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-black text-emerald-950">
                Egg 已讀取網頁內容
              </h2>
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              {sourcePreview.domain}
            </p>
            <h3 className="mt-3 font-black leading-6 text-zinc-950">
              {sourcePreview.title || "未有網頁標題"}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">
              {sourcePreview.description || sourcePreview.excerpt}
            </p>
          </section>
        ) : null}

        {angles.length ? (
          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7b4a4f]">
                為你度身挑選
              </p>
              <h2 className="mt-1 text-2xl font-black">選擇一個方向</h2>
              <p className="mt-1 text-sm text-zinc-500">
                選擇最有感覺的一個，之後仍然可以調整。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {angles.map((angle, index) => (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => setSelectedAngle(angle.id)}
                  className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition ${selectedAngle === angle.id ? "border-[#7b4a4f] bg-[#fff7e6] shadow-md ring-2 ring-[#ead8dc]" : "bg-white hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-sm"}`}
                >
                  <span className="absolute right-4 top-3 text-4xl font-black text-zinc-100 group-hover:text-[#fff0c2]">
                    0{index + 1}
                  </span>
                  <span className="relative text-xs font-black text-[#7b4a4f]">
                    {angle.label}
                  </span>
                  <h3 className="relative mt-3 line-clamp-2 text-lg font-black leading-7 text-zinc-950">
                    {angle.premise}
                  </h3>
                  <p className="relative mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-zinc-600">
                    <span className="font-bold text-zinc-900">觀眾會看到：</span>
                    {angle.audience_promise}
                  </p>
                  {selectedAngle === angle.id ? (
                    <p className="relative mt-3 border-t border-[#ead8dc] pt-3 text-xs leading-5 text-zinc-500">
                      <span className="font-bold text-zinc-700">
                        適合你的原因：
                      </span>
                      {angle.rationale}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {angles.length ? (
          <section className="mt-7 rounded-3xl border bg-white p-5">
            <h2 className="text-lg font-black">你希望如何製作？</h2>
            <p className="mt-1 text-sm text-zinc-500">
              按你願意投入的時間和出鏡程度選擇。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {recipes.map((recipe) => {
                const option = recipeOption(recipe.production_mode);
                const Icon = option.icon;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setSelectedRecipe(recipe.id)}
                    className={`rounded-2xl border p-4 text-left transition ${selectedRecipe === recipe.id ? "border-zinc-950 bg-zinc-950 text-white shadow-md" : "border-zinc-200 hover:border-zinc-400"}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${selectedRecipe === recipe.id ? "text-[#ffc83d]" : "text-[#8b5cf6]"}`}
                    />
                    <span className="mt-3 block text-sm font-black">
                      {option.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${selectedRecipe === recipe.id ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 border-t border-zinc-100 pt-5">
              <h3 className="text-sm font-black">你的素材狀態是？</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Egg 會按真實狀態安排語氣和製作需要，避免幫你作故事。
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setShootStatus(option.value)}
                    className={`rounded-xl border px-3 py-3 text-left ${shootStatus === option.value ? "border-[#7b4a4f] bg-[#fff7e6] ring-1 ring-[#ead8dc]" : "border-zinc-200"}`}
                  >
                    <span className="block text-sm font-bold text-zinc-900">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <ProductionStylePicker key={`${projectId}:${selectedAngle}:${selectedRecipe}:${shootStatus}`} projectId={projectId} angleId={selectedAngle} recipeId={selectedRecipe} shootStatus={shootStatus} onChange={setStyleChoice} />
            <button
              type="button"
              onClick={() => void generatePack()}
              disabled={loading !== null || !selectedAngle || !selectedRecipe || !styleChoice}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc83d] px-5 text-sm font-black text-zinc-950 disabled:opacity-40"
            >
              {loading === "pack" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="h-4 w-4" />
              )}
              {loading === "pack"
                ? generationStatus(generationSeconds)
                : "生成內容"}
            </button>
            {loading === "pack" ? <LoadingProgress steps={["正在整理所選方向", "正在編排內容流程", "正在生成可以直接使用的內容"]} /> : null}
          </section>
        ) : null}

        {pack ? (
          <>
            {isRecord(pack.content._production_style) ? <p className="mb-3 text-sm text-zinc-600">製作風格：{String(pack.content._production_style.styleName || "基本做法")} {String(pack.content._production_style.styleVersionRef || "")}</p> : null}
            <CreatorDnaUsed content={pack.content} fallbackSignalCount={preferenceSignalCount} />
            {getScriptParts(pack.content).length ? <WorkflowPack
              pack={pack}
              phase={workflowPhase}
              completedParts={completedParts}
              onConfirmScript={confirmScript}
              onTogglePart={toggleShot}
              onFinishShooting={finishShooting}
              onApprove={approvePack}
              onComplete={returnToEggHome}
            /> : <ContentPack pack={pack} copied={copied} onCopy={() => void copyPack()} onSave={savePack} />}
          </>
        ) : null}
      </div>
    </main>
  );
}

function LoadingProgress({ steps }: { steps: string[] }) {
  return <div className="mt-3 rounded-2xl border border-[#ead8dc] bg-[#fff7e6] px-4 py-3" role="status" aria-live="polite">
    <div className="flex items-center gap-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#7b4a4f]" />
      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-zinc-900">{steps[0].includes("文字及相片") ? "正在分析題材與來源…" : "正在生成劇本與拍攝內容…"}</p><p className="mt-0.5 text-[11px] text-zinc-500">請暫時留在此頁，完成後會顯示結果。</p></div>
    </div>
  </div>;
}

function WorkflowPack({ pack, phase, completedParts, onConfirmScript, onTogglePart, onFinishShooting, onApprove, onComplete }: {
  pack: Pack;
  phase: WorkflowPhase;
  completedParts: number[];
  onConfirmScript: (content: Record<string, unknown>) => Promise<void>;
  onTogglePart: (content: Record<string, unknown>, index: number) => void;
  onFinishShooting: (content: Record<string, unknown>) => void;
  onApprove: (content: Record<string, unknown>) => Promise<void>;
  onComplete: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => structuredClone(pack.content));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => setDraft(structuredClone(pack.content)), [pack.id]);
  const parts = getScriptParts(draft);
  const updatePart = (index: number, key: keyof ScriptPart, value: string) => setDraft((current) => ({ ...current, script_flow: getScriptParts(current).map((part, partIndex) => partIndex === index ? { ...part, [key]: value } : part) }));
  const runSaving = async (action: () => Promise<void>) => {
    setSaving(true); setSaveError("");
    try { await action(); } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "暫時未能儲存"); }
    finally { setSaving(false); }
  };

  return <section className="mt-8">
    <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-xl">{phase === "script" ? "1" : phase === "shoot" ? "2" : "3"}</span><div><p className="text-xs font-bold text-[#7b4a4f]">第 {phase === "script" ? "1" : phase === "shoot" ? "2" : "3"} 步 · {phase === "script" ? "劇本" : phase === "shoot" ? "拍攝" : "發布"}</p><h2 className="text-2xl font-black">{phase === "script" ? "預覽影片流程" : phase === "shoot" ? "逐段完成拍攝" : "準備發布內容"}</h2></div></div>
    {saveError ? <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p> : null}

    {phase === "script" ? <div className="space-y-3">
      <textarea value={String(draft.title ?? "")} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} rows={2} className="w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-xl font-black outline-none focus:border-[#7b4a4f]" aria-label="劇本標題" />
      {draft.topic != null ? <textarea value={String(draft.topic)} onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))} rows={2} className="w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-sm outline-none focus:border-[#7b4a4f]" aria-label="劇本主題" /> : null}
      {parts.map((part, index) => <div key={index} className="rounded-3xl border border-zinc-200 bg-white p-5">
        <div className="flex gap-3"><input value={part.section} onChange={(event) => updatePart(index, "section", event.target.value)} className="min-w-0 flex-1 font-black text-[#7b4a4f] outline-none" aria-label={`第 ${index + 1} 段名稱`} /><input value={part.time} onChange={(event) => updatePart(index, "time", event.target.value)} className="w-28 text-right text-xs font-bold text-zinc-500 outline-none" aria-label={`第 ${index + 1} 段時間`} /></div>
        <label className="mt-4 block text-xs font-bold text-zinc-400">🎥 畫面</label><textarea value={part.visual} onChange={(event) => updatePart(index, "visual", event.target.value)} rows={2} className="mt-1 w-full resize-y text-sm leading-6 outline-none" />
        <label className="mt-3 block text-xs font-bold text-zinc-400">💬 對白</label><textarea value={part.dialogue} onChange={(event) => updatePart(index, "dialogue", event.target.value)} rows={3} className="mt-1 w-full resize-y font-bold leading-6 outline-none" />
      </div>)}
      <button type="button" disabled={saving} onClick={() => void runSaving(() => onConfirmScript(draft))} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "正在儲存…" : "確認劇本，開始拍攝"}</button>
    </div> : null}

    {phase === "shoot" ? <div className="space-y-3">
      <p className="text-sm text-zinc-500">每完成一段即可標記，進度會在背景自動儲存。</p>
      {parts.map((part, index) => { const done = completedParts.includes(index); return <button key={index} type="button" onClick={() => onTogglePart(draft, index)} className={`flex w-full gap-3 rounded-3xl border p-5 text-left transition active:scale-[0.995] ${done ? "border-[#7b4a4f] bg-[#fff7e6]" : "border-zinc-200 bg-white"}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${done ? "border-[#7b4a4f] bg-[#7b4a4f] text-white" : "border-zinc-300"}`}>{done ? <Check className="h-4 w-4" /> : null}</span>
        <span className="min-w-0 flex-1"><span className="flex justify-between gap-3"><strong className={done ? "text-zinc-500 line-through" : "text-zinc-950"}>{part.section}</strong><small className="text-zinc-500">{part.time}</small></span><span className={`mt-2 block text-sm leading-6 ${done ? "text-zinc-500 line-through" : "text-zinc-800"}`}>{part.visual}</span><span className="mt-2 line-clamp-2 block text-sm text-zinc-500">{part.dialogue}</span></span>
      </button>; })}
      <p className="text-center text-sm font-bold text-zinc-500">已完成 {completedParts.length}/{parts.length}</p>
      <button type="button" disabled={completedParts.length < parts.length} onClick={() => onFinishShooting(draft)} className="min-h-14 w-full rounded-2xl bg-zinc-950 px-5 font-black text-white disabled:opacity-30">{completedParts.length >= parts.length ? "全部拍完，下一步 →" : "完成所有段落後繼續"}</button>
    </div> : null}

    {phase === "publish" ? <div className="space-y-3">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5"><label className="text-xs font-bold text-[#7b4a4f]">標題</label><textarea value={String(draft.title ?? "")} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} rows={2} className="mt-3 w-full resize-y text-xl font-black outline-none" /></div>
      <div className="rounded-3xl border border-zinc-200 bg-white p-5"><label className="text-xs font-bold text-[#7b4a4f]">Caption</label><textarea value={String(draft.caption ?? "")} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} rows={9} className="mt-3 w-full resize-y text-sm leading-6 outline-none" /></div>
      {pack.approval_status === "approved" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">已確認定稿 · {pack.approved_by_role ?? "creator"} · {pack.approved_at ? new Intl.DateTimeFormat("zh-HK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(pack.approved_at)) : ""}</div> : null}
      <button type="button" disabled={saving} onClick={() => void runSaving(async () => { const content = { ...draft, _workflow: { phase: "publish", completed_parts: completedParts, updated_at: new Date().toISOString() } }; await onApprove(content); onComplete(); })} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "正在記錄定稿…" : "確認定稿並返回 EGG"}</button>
    </div> : null}
  </section>;
}

function ContentPack({
  pack,
  copied,
  onCopy,
  onSave,
}: {
  pack: Pack;
  copied: boolean;
  onCopy: () => void;
  onSave: (content: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown>>(() =>
    structuredClone(pack.content),
  );
  useEffect(() => setDraft(structuredClone(pack.content)), [pack.content]);
  const content = editing ? draft : pack.content;
  const changeCount = editing ? countChangedLeaves(pack.content, draft) : 0;
  const detailEntries = Object.entries(content)
    .filter(
      ([key]) => !TECHNICAL_PACK_KEYS.has(key) && !PRIMARY_PACK_KEYS.has(key),
    )
    .sort(([a], [b]) => detailRank(a) - detailRank(b));
  async function saveEdits() {
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "未能儲存修改");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="bg-zinc-950 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ffc83d]">
              Content Pack
            </p>
            {editing ? (
              <EditableField
                value={content.title}
                onChange={(value) => setAtPath(setDraft, ["title"], value)}
                className="mt-2 text-xl font-black"
              />
            ) : (
              <h2 className="mt-2 text-2xl font-black">
                {String(content.title ?? "可以開始製作")}
              </h2>
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(structuredClone(pack.content));
                    setEditing(false);
                    setSaveError("");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdits()}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#ffc83d] px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  儲存草稿
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"
                >
                  <Pencil className="h-4 w-4" />
                  編輯
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                  {copied ? "已複製" : "複製"}
                </button>
              </>
            )}
          </div>
        </div>
        {content.hook ? (
          <div className="mt-5 rounded-2xl bg-[#ffc83d] p-4 text-zinc-950">
            <p className="text-xs font-black uppercase tracking-wider">
              開場 Hook
            </p>
            {editing ? (
              <EditableField
                value={content.hook}
                onChange={(value) => setAtPath(setDraft, ["hook"], value)}
                className="mt-2 text-base font-black"
              />
            ) : (
              <p className="mt-2 text-lg font-black leading-7">
                {String(content.hook)}
              </p>
            )}
          </div>
        ) : null}
        {content.core_concept ? (
          editing ? (
            <EditableField
              value={content.core_concept}
              onChange={(value) => setAtPath(setDraft, ["core_concept"], value)}
              className="mt-4 text-sm"
            />
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {String(content.core_concept)}
            </p>
          )
        ) : null}
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {editing ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[#ead8dc] bg-[#fff7e6] p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7b4a4f]" />
            <div>
              <p className="text-sm font-black text-zinc-900">
                改成你真正會講、會拍的版本
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                每項修改會先儲存為 Creator DNA 訊號，幫 EGG
                逐步理解你的用字、節奏和內容取向。
              </p>
            </div>
          </div>
        ) : null}
        {saved ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            修改已儲存，EGG 已更新 Creator DNA。
          </p>
        ) : null}
        {saveError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {saveError}
          </p>
        ) : null}
        {detailEntries.map(([key, value]) => (
          <details
            key={key}
            open={editing || key === "host_lines" || key === "shot_list"}
            className="group rounded-2xl border border-zinc-200 bg-zinc-50"
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black text-zinc-900">
              {PACK_LABELS[key] ?? key.replaceAll("_", " ")}
              <span className="float-right text-zinc-400 group-open:rotate-45">
                ＋
              </span>
            </summary>
            <div className="border-t border-zinc-200 px-4 py-4">
              {editing ? (
                <EditablePackValue
                  value={value}
                  path={[key]}
                  onChange={(path, next) => setAtPath(setDraft, path, next)}
                />
              ) : (
                <PackValue value={value} />
              )}
            </div>
          </details>
        ))}
        {editing ? (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white shadow-2xl">
            <div>
              <p className="text-sm font-black">
                {changeCount ? `已修改 ${changeCount} 項` : "尚未有修改"}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                儲存後會成為 Creator DNA 訊號
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(structuredClone(pack.content));
                  setEditing(false);
                  setSaveError("");
                }}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void saveEdits()}
                disabled={saving || changeCount === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffc83d] px-4 py-2 text-xs font-black text-zinc-950 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "儲存中…" : "儲存並讓 Egg 學習"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditableField({
  value,
  onChange,
  className = "",
}: {
  value: unknown;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <textarea
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      rows={Math.min(
        8,
        Math.max(2, Math.ceil(String(value ?? "").length / 45)),
      )}
      className={`w-full resize-y rounded-xl border border-zinc-600 bg-white/10 px-3 py-2 leading-6 text-white outline-none focus:border-[#7b4a4f] ${className}`}
    />
  );
}

function EditablePackValue({
  value,
  path,
  onChange,
}: {
  value: unknown;
  path: Array<string | number>;
  onChange: (path: Array<string | number>, value: unknown) => void;
}) {
  if (Array.isArray(value))
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-white p-3"
          >
            <EditablePackValue
              value={item}
              path={[...path, index]}
              onChange={onChange}
            />
          </div>
        ))}
      </div>
    );
  if (value && typeof value === "object")
    return (
      <div className="space-y-3">
        {Object.entries(value as Record<string, unknown>).map(
          ([key, child]) => (
            <label key={key} className="block">
              <span className="text-xs font-bold text-zinc-500">
                {PACK_LABELS[key] ?? key.replaceAll("_", " ")}
              </span>
              <EditablePackValue
                value={child}
                path={[...path, key]}
                onChange={onChange}
              />
            </label>
          ),
        )}
      </div>
    );
  return (
    <textarea
      value={String(value ?? "")}
      onChange={(event) => onChange(path, event.target.value)}
      rows={Math.min(
        7,
        Math.max(2, Math.ceil(String(value ?? "").length / 55)),
      )}
      className="mt-1 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none focus:border-[#7b4a4f]"
    />
  );
}

function setAtPath(
  setter: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
  path: Array<string | number>,
  value: unknown,
) {
  setter((current) => {
    const next = structuredClone(current);
    let target: any = next;
    for (let index = 0; index < path.length - 1; index += 1)
      target = target[path[index]];
    target[path[path.length - 1]] = value;
    return next;
  });
}

function countChangedLeaves(before: unknown, after: unknown): number {
  if (JSON.stringify(before) === JSON.stringify(after)) return 0;
  if (Array.isArray(before) && Array.isArray(after))
    return Array.from(
      { length: Math.max(before.length, after.length) },
      (_, index) => countChangedLeaves(before[index], after[index]),
    ).reduce((sum, count) => sum + count, 0);
  if (isPlainRecord(before) && isPlainRecord(after))
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].reduce(
      (sum, key) => sum + countChangedLeaves(before[key], after[key]),
      0,
    );
  return 1;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recipeOption(mode: string) {
  const options = {
    presenter: { label: "真人出鏡", description: "你對鏡頭講", icon: Video },
    presenter_plus_vo: {
      label: "出鏡＋旁白",
      description: "出鏡配畫面",
      icon: Camera,
    },
    full_vo: { label: "全旁白", description: "不用出鏡", icon: Mic2 },
    ai_visual: { label: "AI 短片", description: "全旁白＋AI 畫面", icon: Mic2 },
    carousel: {
      label: "多圖圖卡",
      description: "滑動逐頁看",
      icon: LayoutGrid,
    },
    single_image: {
      label: "單圖 Post",
      description: "一張圖講重點",
      icon: ImagePlus,
    },
    snapshot_reference: {
      label: "拍攝參考圖",
      description: "構圖、角度、Pose 參考",
      icon: Images,
    },
  } as const;
  return (
    options[mode as keyof typeof options] ?? {
      label: mode.replaceAll("_", " "),
      description: "自訂製作方式",
      icon: WandSparkles,
    }
  );
}

function PackSection({ label, value }: { label: string; value: unknown }) {
  return (
    <section className="rounded-2xl bg-zinc-50 p-4">
      <h3 className="text-sm font-black text-zinc-900">
        {PACK_LABELS[label] ?? label.replaceAll("_", " ")}
      </h3>
      <div className="mt-3">
        <PackValue value={value} />
      </div>
    </section>
  );
}

function PackValue({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-white p-3"
          >
            <PackValue value={item} />
          </div>
        ))}
      </div>
    );
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return (
      <div>
        {item.timecode || item.shot ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {item.shot ? (
              <span className="rounded-full bg-zinc-900 px-2 py-1 text-[11px] font-bold text-white">
                鏡號 {String(item.shot)}
              </span>
            ) : null}
            {item.timecode ? (
              <span className="rounded-full bg-[#fff0c2] px-2 py-1 text-[11px] font-bold text-[#7b4a4f]">
                {String(item.timecode)}
              </span>
            ) : null}
          </div>
        ) : null}
        <dl className="space-y-2">
          {Object.entries(item)
            .filter(([key]) => key !== "timecode" && key !== "shot")
            .map(([key, child]) => (
              <div key={key}>
                <dt className="text-xs font-bold text-zinc-400">
                  {PACK_LABELS[key] ?? key.replaceAll("_", " ")}
                </dt>
                <dd
                  className={`mt-0.5 whitespace-pre-wrap leading-6 text-zinc-800 ${key === "line" || key === "description" ? "text-sm font-semibold" : "text-sm"}`}
                >
                  <PackValue value={child} />
                </dd>
              </div>
            ))}
        </dl>
      </div>
    );
  }
  return (
    <span className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">
      {String(value ?? "")}
    </span>
  );
}

const TECHNICAL_PACK_KEYS = new Set([
  "id",
  "recipe_id",
  "creator",
  "language",
  "platform",
  "format",
  "production_mode",
  "_workflow",
  "_creator_dna",
]);
const PRIMARY_PACK_KEYS = new Set(["title", "hook", "core_concept"]);
const DETAIL_ORDER = [
  "host_lines",
  "shot_list",
  "vo",
  "scenes",
  "visual_prompts",
  "cover",
  "slides",
  "visual_direction",
  "image_concept",
  "image_prompt",
  "references",
  "visual_notes",
  "caption",
  "risk_flags",
  "source_warnings",
  "production_notes",
];
const SHOOT_STATUS_OPTIONS = [
  {
    value: "not_visited" as const,
    label: "尚未拍攝／體驗",
    description: "準備之後拍攝（預設）",
  },
  {
    value: "visited" as const,
    label: "已有親身素材",
    description: "可以使用親身經歷語氣",
  },
  {
    value: "existing_assets" as const,
    label: "只用現有素材",
    description: "不安排額外現場補拍",
  },
];
const SNAPSHOT_STATUS_OPTIONS = [
  {
    value: "not_visited" as const,
    label: "準備新拍攝",
    description: "需要完整構圖及 Pose 指引",
  },
  {
    value: "visited" as const,
    label: "已有拍攝經驗",
    description: "可以沿用親身拍攝語氣",
  },
  {
    value: "existing_assets" as const,
    label: "只用現有道具",
    description: "可以拍攝，但不新增道具或器材",
  },
];
const PACK_LABELS: Record<string, string> = {
  title: "內容標題",
  core_concept: "核心概念",
  hook: "開場 Hook",
  caption: "帖文 Caption",
  host_lines: "主持台詞",
  vo: "旁白",
  shot_list: "鏡頭清單",
  scenes: "場景安排",
  visual_prompts: "AI 畫面提示",
  cover: "封面",
  slides: "每頁內容",
  visual_direction: "視覺方向",
  image_concept: "單圖概念",
  image_prompt: "圖片提示",
  references: "參考畫面",
  visual_notes: "拍攝重點",
  source_warnings: "素材提醒",
  risk_flags: "發布前檢查",
  timecode: "時間",
  line: "台詞",
  text: "內容",
  direction: "演繹提示",
  description: "畫面",
  camera_direction: "鏡頭方向",
  notes: "備註",
  shot: "鏡號",
  shot_number: "鏡號",
  main_text: "正文",
  cta: "行動呼籲",
  hashtags: "Hashtags",
  target_seconds: "目標秒數",
  production_notes: "製作提示",
  scene_number: "場景",
  vo_ref: "對應旁白時間",
  prompt: "AI 畫面 Prompt",
  overlay_text: "後製字卡",
  headline: "標題",
  subheadline: "副標題",
  body: "內文",
  role: "這頁作用",
  slide_number: "頁數",
  visual_note: "畫面建議",
  composition: "構圖",
  overall_mood: "整體氣氛",
  color_palette: "配色",
  props_reference: "道具參考",
  typography_style: "字體方向",
  mood: "整體感覺",
  layout: "版面",
  background: "背景",
  typography: "字體",
  overlay_text_main: "主字句",
  overlay_text_sub: "副字句",
  overlay_text_tag: "帳號標記",
  label: "參考名稱",
  light_note: "光線建議",
  composition_note: "構圖重點",
  pose_note: "Pose 指引",
};

function generationStatus(seconds: number) {
  return `正在生成內容，已等候 ${seconds} 秒…`;
}

function detailRank(key: string) {
  const index = DETAIL_ORDER.indexOf(key);
  return index === -1 ? DETAIL_ORDER.length : index;
}

function formatHistoryDate(value?: string) {
  if (!value) return "剛剛建立";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorkflowPhase(value: unknown): value is WorkflowPhase {
  return value === "script" || value === "shoot" || value === "publish";
}

function getScriptParts(content: Record<string, unknown>): ScriptPart[] {
  if (!Array.isArray(content.script_flow)) return [];
  return content.script_flow.flatMap((value) => {
    if (!isRecord(value)) return [];
    return [{
      section: String(value.section ?? ""),
      time: String(value.time ?? ""),
      visual: String(value.visual ?? ""),
      dialogue: String(value.dialogue ?? ""),
    }];
  });
}

function packToText(content: Record<string, unknown>) {
  return Object.entries(content)
    .filter(([key]) => !key.startsWith("_"))
    .map(
      ([key, value]) =>
        `${key.replaceAll("_", " ").toUpperCase()}\n${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`,
    )
    .join("\n\n");
}

type CreatorDnaRuleUsed = { category: string; scope: string; rule_text: string; evidence_count: number };

function CreatorDnaUsed({ content, fallbackSignalCount }: { content: Record<string, unknown>; fallbackSignalCount: number }) {
  const metadata = isRecord(content._creator_dna) ? content._creator_dna : {};
  const rules = Array.isArray(metadata.rules) ? metadata.rules.flatMap((value): CreatorDnaRuleUsed[] => {
    if (!isRecord(value) || typeof value.rule_text !== "string") return [];
    return [{ category: String(value.category ?? "內容風格"), scope: String(value.scope ?? "all"), rule_text: value.rule_text, evidence_count: Number(value.evidence_count ?? 0) }];
  }) : [];
  const signalCount = Number(metadata.signal_count ?? fallbackSignalCount ?? 0);
  if (!rules.length && !signalCount) return null;
  return <details className="group mt-6 rounded-2xl border border-[#ead8dc] bg-[#fff8e8] px-4 py-3">
    <summary className="cursor-pointer list-none text-sm font-black text-zinc-900">
      <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#9a5f17]" />{rules.length ? `本次使用了 ${rules.length} 項 Creator DNA` : `本次參考了 ${signalCount} 項過往修改`}</span>
      <span className="float-right text-xs font-bold text-zinc-400 group-open:hidden">查看</span><span className="float-right hidden text-xs font-bold text-zinc-400 group-open:inline">收起</span>
    </summary>
    <div className="mt-3 border-t border-[#ead8dc] pt-3">
      {rules.length ? <div className="space-y-3">{rules.map((rule, index) => <div key={`${rule.category}-${index}`}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#9a5f17]">{rule.category}</span><span className="text-[11px] text-zinc-400">{scopeLabel(rule.scope)} · 根據 {rule.evidence_count} 次修改</span></div><p className="mt-1.5 text-xs leading-5 text-zinc-700">{rule.rule_text}</p></div>)}</div> : <p className="text-xs leading-5 text-zinc-600">尚未有已確認規則；EGG 本次只把近期修改當作輕量參考。</p>}
      {rules.length && signalCount ? <p className="mt-3 text-[11px] text-zinc-400">另外參考 {signalCount} 項近期內容修改。</p> : null}
    </div>
  </details>;
}

function scopeLabel(scope: string) { return ({ all: "所有內容", presenter: "真人短片", presenter_plus_vo: "真人短片", full_vo: "AI 短片", ai_visual: "AI 短片", carousel: "資訊圖卡", single_image: "相片帖文", snapshot_reference: "拍攝參考" } as Record<string, string>)[scope] ?? "指定內容"; }
