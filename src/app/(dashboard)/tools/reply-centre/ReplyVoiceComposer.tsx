"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, RefreshCw } from "lucide-react";

export function ReplyVoiceComposer() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [assistantName, setAssistantName] = useState("EGG 經理人");
  const [identityMode, setIdentityMode] = useState<"self" | "manager">("manager");
  const [voiceName, setVoiceName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function transcribe(file?: File) {
    if (!file) return;
    setVoiceName(file.name);
    setStatus("正在上載及辨識語音…");
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/mobile/reply/transcribe", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "語音轉寫失敗");
      setMessage((current) => [current.trim(), String(result.transcript || "").trim()].filter(Boolean).join("\n\n"));
      setStatus("轉寫完成，請先核對文字。");
    } catch (voiceError) {
      setStatus("");
      setError(voiceError instanceof Error ? voiceError.message : "語音轉寫失敗，請重試。");
    }
  }

  async function generateDraft() {
    if (!message.trim()) return setError("請貼上客戶訊息，或先匯入語音。");
    if (!creatorName.trim()) return setError("請填寫要代表的 Creator 名稱。");
    setStatus("正在整理對話上下文及草擬回覆…");
    setError("");
    try {
      const response = await fetch("/api/mobile/reply/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalMessage: message, identityMode, creatorName, assistantName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "未能生成回覆草稿");
      setDraft(result.draft || "");
      setStatus("草稿已完成。請審閱後自行複製及發送。");
    } catch (draftError) {
      setStatus("");
      setError(draftError instanceof Error ? draftError.message : "未能生成回覆草稿");
    }
  }

  return <section className="rounded-3xl border border-amber-200 bg-[#fffaf0] p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">EGG Reply Assistant</p><h2 className="mt-1 text-2xl font-black text-zinc-950">語音及虛擬經理人草稿</h2><p className="mt-2 text-sm leading-6 text-zinc-600">匯入 WhatsApp 語音或貼上文字，核對內容後才生成草稿。系統不會自動發送。</p></div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(status && !draft)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-900 disabled:opacity-50"><Mic className="h-4 w-4" />匯入語音</button>
      <input ref={inputRef} type="file" accept="audio/*,.opus,.ogg" className="hidden" onChange={(event) => { void transcribe(event.target.files?.[0]); event.target.value = ""; }} />
    </div>
    {voiceName ? <p className="mt-3 text-xs text-zinc-500">已選擇：{voiceName}</p> : null}
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-zinc-700">Creator 名稱<input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} placeholder="例如 Renee" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label><label className="text-sm font-bold text-zinc-700">虛擬經理人名稱<input value={assistantName} onChange={(event) => setAssistantName(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-amber-400" /></label></div>
    <div className="mt-4 flex gap-2">{([['self', '本人模式'], ['manager', '虛擬經理人']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setIdentityMode(value)} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold ${identityMode === value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600"}`}>{label}</button>)}</div>
    <p className="mt-2 text-xs text-zinc-500">{identityMode === "self" ? "草稿會以 Creator 第一身撰寫。" : "草稿會清楚表明由虛擬經理人代表 Creator 回覆。"}</p>
    <label className="mt-5 block text-sm font-bold text-zinc-700">客戶訊息／語音轉寫<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} placeholder="貼上文字，或匯入語音後在這裡核對及修改…" className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-normal leading-6 outline-none focus:border-amber-400" /></label>
    {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><p>{error}</p>{voiceName ? <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 inline-flex items-center gap-1 font-bold"><RefreshCw className="h-3.5 w-3.5" />重新選擇並轉寫</button> : null}</div> : null}
    {status ? <p className="mt-3 inline-flex items-center gap-2 text-sm text-amber-800">{status.includes("正在") ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{status}</p> : null}
    <button type="button" onClick={() => void generateDraft()} className="mt-4 min-h-12 w-full rounded-xl bg-[#6d2f23] px-4 font-bold text-white">生成可審閱草稿</button>
    {draft ? <label className="mt-5 block text-sm font-bold text-zinc-700">回覆草稿<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={8} className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-4 font-normal leading-6 outline-none focus:border-amber-400" /><span className="mt-2 block text-xs font-normal text-zinc-500">報價、檔期及接單仍須由 Creator 確認；請審閱後自行複製發送。</span></label> : null}
  </section>;
}
