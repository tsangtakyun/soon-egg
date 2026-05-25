"use client";

import { useState } from "react";
import { Captions, Check, Clipboard, Loader2 } from "lucide-react";

export type SubtitleSession = {
  id: string;
  title: string | null;
  language: string | null;
  srt_content: string | null;
  status: string | null;
  created_at: string | null;
};

const languages = ["廣東話", "普通話", "英文", "日文", "韓文"];

export function SubtitleClient({ sessions, balance: initialBalance }: { sessions: SubtitleSession[]; balance: number }) {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("廣東話");
  const [transcript, setTranscript] = useState("");
  const [srt, setSrt] = useState("");
  const [history, setHistory] = useState(sessions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(initialBalance);

  async function generate() {
    if (!transcript.trim()) return;
    setLoading(true);
    const res = await fetch("/api/tools/subtitle/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "未命名字幕", language, transcript_text: transcript }),
    });
    const data = await res.json();
    if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
      return;
    }
    if (!res.ok) {
      alert(`生成失敗：${data.error ?? "請稍後再試"}`);
      setLoading(false);
      return;
    }
    setSrt(data.srt_content ?? "");
    if (typeof data.balance === "number") setBalance(data.balance);
    if (data.session) setHistory((current) => [data.session, ...current.filter((item) => item.id !== data.session.id)]);
    setLoading(false);
  }

  async function copySrt() {
    await navigator.clipboard.writeText(srt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="space-y-6 pt-[10vh]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">SOON Tools</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">字幕工作台</h1>
          <p className="mt-2 text-sm text-zinc-500">將逐字稿整理成可用的 SRT 字幕。</p>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-500">
          目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
        </div>
      </header>

      <div className="flex border-b">
        <button onClick={() => setActiveTab("new")} className={`px-5 py-3 text-sm font-medium ${activeTab === "new" ? "border-b-2 border-black text-black" : "text-zinc-400"}`} type="button">新增字幕</button>
        <button onClick={() => setActiveTab("history")} className={`px-5 py-3 text-sm font-medium ${activeTab === "history" ? "border-b-2 border-black text-black" : "text-zinc-400"}`} type="button">字幕記錄</button>
      </div>

      {activeTab === "new" ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5">
            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="標題" className="w-full rounded-xl border px-3 py-2.5 text-sm" />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                {languages.map((item) => <option key={item}>{item}</option>)}
              </select>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="貼上原始逐字稿或 captions..." rows={16} className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-6" />
              <button onClick={generate} disabled={!transcript.trim() || loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white disabled:opacity-40" type="button">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Captions className="h-4 w-4" />}
                {loading ? "整理中..." : "AI 整理字幕"}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">SRT 輸出</h2>
              <button onClick={copySrt} disabled={!srt} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40" type="button">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                {copied ? "已複製" : "複製 SRT"}
              </button>
            </div>
            {srt ? <pre className="whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 text-xs leading-6 text-zinc-800">{srt}</pre> : <div className="rounded-2xl bg-zinc-50 py-16 text-center text-sm text-zinc-400">整理後字幕會顯示在這裡。</div>}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-white p-5">
          {history.length === 0 ? <p className="py-10 text-center text-sm text-zinc-400">暫未有字幕記錄</p> : (
            <div className="divide-y">
              {history.map((session) => (
                <button key={session.id} onClick={() => setExpandedId(expandedId === session.id ? null : session.id)} className="block w-full py-4 text-left" type="button">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{session.title}</p>
                      <p className="mt-1 text-xs text-zinc-400">{session.language} · {session.created_at ? new Date(session.created_at).toLocaleString("zh-HK") : ""}</p>
                      <p className="mt-2 line-clamp-1 text-xs text-zinc-500">{firstSubtitleLine(session.srt_content)}</p>
                    </div>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">{session.status ?? "completed"}</span>
                  </div>
                  {expandedId === session.id && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs leading-6 text-zinc-700">{session.srt_content}</pre>}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function firstSubtitleLine(content?: string | null) {
  return content?.split("\n").find((line) => line.trim() && !/^\d+$/.test(line.trim()) && !line.includes("-->")) ?? "無預覽";
}
