"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  History,
  Lightbulb,
  Loader2,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type Suggestion = {
  title: string;
  angle: string;
  reason: string;
  production_mode: string;
  source_topic_id: string | null;
  source?: { source_name?: string; source_url?: string; address?: string } | null;
  source_note?: string;
};
type Result = {
  answer: string;
  suggestions: Suggestion[];
  actions: Array<{ label: string; href: string }>;
  used: { topics: number; dnaRules: number; daily: number };
  interpreted?: Record<string, string>;
  sessionId?: string;
  messages?: Array<{ role: string; content: string }>;
};
type CommandSession = {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
  interpreted_context?: Record<string, string>;
  updated_at: string;
};
const quick = [
  { label: "今日題材", prompt: "請建議我今天可以發布甚麼內容", icon: CalendarDays },
  { label: "為你推薦", prompt: "題材庫有哪些內容適合我？", icon: Lightbulb },
];

export function EggCommandCenter() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<CommandSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/egg/command", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const loadedSessions = Array.isArray(data.sessions)
          ? data.sessions
          : [];
        if (active) setSessions(loadedSessions);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  async function ask(value = input, mode: "chat" | "daily" | "recommended" = "chat") {
    if (!value.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/egg/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          mode,
          sessionId: mode === "chat" ? sessionId || undefined : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      setSessionId(data.sessionId ?? "");
      void fetch("/api/egg/command", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((latest) =>
          setSessions(Array.isArray(latest.sessions) ? latest.sessions : []),
        )
        .catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Egg 暫時未能回覆");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="mx-auto flex min-h-[360px] max-w-4xl flex-col justify-center py-10 sm:min-h-[430px]">
      <div className="relative">
        <Image
          src="/soon-egg.png"
          alt="Egg"
          width={58}
          height={58}
          priority
          className="egg-command-drift mx-auto mb-3 h-14 w-14 object-contain"
        />
        <h1 className="text-center text-2xl font-black tracking-[-0.035em] text-zinc-950 sm:text-3xl">
          要一齊處理什麼？
        </h1>
        <div className="mt-3 flex items-center justify-center gap-4 sm:absolute sm:right-0 sm:top-5 sm:mt-0">
          {sessions.length ? (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-800"
            >
              <History className="h-3.5 w-3.5" />
              對話記錄
            </button>
          ) : null}
          {sessionId ? (
            <button
              type="button"
              onClick={() => {
                setSessionId("");
                setResult(null);
                setInput("");
              }}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" />
              新對話
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 rounded-[28px] border border-[#e5d7d7] bg-white p-3 shadow-[0_8px_24px_rgba(42,23,24,0.06)] transition focus-within:border-[#7b4a4f] focus-within:shadow-[0_12px_32px_rgba(42,23,24,0.10)]">
        {sessionId ? <p className="px-2 pb-2 text-xs text-zinc-500">可直接修改要求，或繼續追問</p> : null}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask();
            }
          }}
          rows={result ? 2 : 3}
          placeholder="試試輸入：我想在香港拍一條 reel ！"
          className="w-full resize-none border-0 bg-transparent px-2 py-2 text-base leading-7 text-zinc-950 outline-none placeholder:text-zinc-400"
        />
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => void ask()}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-white disabled:opacity-30"
            aria-label="送出指令"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quick.map(({ label, prompt, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => void ask(prompt, label === "今日題材" ? "daily" : "recommended")}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {loading ? <p role="status" className="mt-4 text-sm text-zinc-600">正在搜尋及整理題材；不足時會補充網上來源，請稍候…</p> : null}
      {error ? (
        <p role="alert" className="mt-5 text-center text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-7 border-t border-zinc-200 pt-6">
          {result.interpreted ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(result.interpreted)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-full bg-[#fff7e6] px-3 py-1.5 text-[11px] font-bold text-[#7b4a4f]"
                  >
                    {contextLabel(key)}：{value}
                  </span>
                ))}
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#8b5cf6]" />
            <div>
              <p className="text-sm font-semibold leading-6 text-zinc-900">
                {result.answer}
              </p>
            </div>
          </div>
          {result.suggestions?.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.suggestions.map((idea, index) => (
                <article
                  key={`${idea.title}-${index}`}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <h2 className="text-base font-bold leading-6">
                    {idea.title}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {idea.angle}
                  </p>
                  {idea.source_note ? <p className="mt-1 text-[11px] text-zinc-500">{idea.source_note}</p> : null}
                  {idea.source?.source_name ? (
                    <p className="mt-2 text-[11px] text-zinc-400">
                      來源：
                      {idea.source.source_url ? (
                        <a
                          href={idea.source.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline"
                        >
                          {idea.source.source_name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        idea.source.source_name
                      )}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-400">
                      一般創作方向
                    </p>
                  )}
                  <Link
                    href={`/egg-this?input=${encodeURIComponent([idea.title, idea.angle, idea.source?.address, idea.source?.source_url].filter(Boolean).join("\n"))}${idea.source_topic_id ? `&topicId=${idea.source_topic_id}` : ""}`}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-950"
                  >
                    開始製作 <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {result.actions?.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {historyOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/20"
          role="dialog"
          aria-modal="true"
          aria-label="對話記錄"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setHistoryOpen(false)}
            aria-label="關閉對話記錄"
          />
          <aside className="relative h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-400">
                  Egg Command Center
                </p>
                <h2 className="mt-1 text-xl font-bold text-zinc-950">
                  對話記錄
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    setSessionId(session.id);
                    setResult(null);
                    setInput("");
                    setHistoryOpen(false);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${session.id === sessionId ? "border-[#7b4a4f] bg-[#fff7e6]" : "border-zinc-200 hover:border-zinc-400"}`}
                >
                  <span className="block truncate text-sm font-semibold text-zinc-900">
                    {session.title || "新對話"}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-400">
                    {formatSessionTime(session.updated_at)}
                    {session.id === sessionId ? " · 目前對話" : ""}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function contextLabel(key: string) {
  return (
    (
      {
        location: "地點",
        count: "題材數量",
        format: "格式",
        on_camera: "出鏡",
        goal: "目標",
      } as Record<string, string>
    )[key] ?? key
  );
}

function formatSessionTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
