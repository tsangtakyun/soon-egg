"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, Loader2, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import type { SubtitleLine, SubtitleSession } from "@/types/subtitle";

const statusLabels: Record<SubtitleSession["status"], string> = {
  pending: "準備中",
  transcribing: "正在辨識語音及時間碼…",
  refining: "正在整理廣東話字幕…",
  ready: "已完成",
  error: "處理失敗",
};

export function SubtitleSessionClient({ initialSession, initialLines }: { initialSession: SubtitleSession; initialLines: SubtitleLine[] }) {
  const [session, setSession] = useState(initialSession);
  const [lines, setLines] = useState(initialLines);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const transcribeStarted = useRef(false);
  const refineStarted = useRef(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/tools/subtitle/service/sessions/${session.id}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || "讀取字幕失敗");
    setSession(data.session);
    setLines(data.lines || []);
  }, [session.id]);

  useEffect(() => {
    if (session.status !== "pending" || transcribeStarted.current) return;
    transcribeStarted.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/tools/subtitle/service/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "語音轉錄失敗");
        await refresh();
      } catch (processError) {
        setError(processError instanceof Error ? processError.message : "語音轉錄失敗");
        await refresh().catch(() => undefined);
      }
    })();
  }, [refresh, session.id, session.status]);

  useEffect(() => {
    if (session.status !== "refining" || refineStarted.current) return;
    refineStarted.current = true;
    void (async () => {
      try {
        let pending = Number.POSITIVE_INFINITY;
        while (pending > 0) {
          const response = await fetch("/api/tools/subtitle/service/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id, batchLimit: 5 }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) throw new Error(data.error || "字幕整理失敗");
          if (data.session) setSession(data.session);
          if (data.lines) setLines(data.lines);
          pending = typeof data.remaining === "number" ? data.remaining : 0;
          setRemaining(pending);
        }
        await refresh();
      } catch (processError) {
        setError(processError instanceof Error ? processError.message : "字幕整理失敗");
        await refresh().catch(() => undefined);
      } finally {
        refineStarted.current = false;
      }
    })();
  }, [refresh, session.id, session.status]);

  useEffect(() => {
    if (!["pending", "transcribing", "refining"].includes(session.status)) return;
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [refresh, session.id, session.status]);

  async function downloadSrt() {
    const response = await fetch(`/api/tools/subtitle/service/export-srt?sessionId=${session.id}`);
    if (!response.ok) { setError("下載 SRT 失敗，請稍後再試。"); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(session.title || "soon-subtitles").replace(/[\\/:*?"<>|]/g, "-")}.srt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function retryRefine() {
    const target = lines.filter((line) => !line.refined_text && !line.is_edited && !line.is_hallucination);
    if (!target.length) return;
    setRetrying(true); setError("");
    const response = await fetch("/api/tools/subtitle/service/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id, lineIds: target.map((line) => line.id) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) setError(data.error || "重新整理失敗");
    await refresh().catch(() => undefined);
    setRetrying(false);
  }

  const working = ["pending", "transcribing", "refining"].includes(session.status);
  const retryableCount = lines.filter((line) => !line.refined_text && !line.is_edited && !line.is_hallucination).length;

  return (
    <main className="space-y-6 bg-[#f7f7f8] px-4 pb-10 pt-[7vh] sm:px-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <Link href="/tools/subtitle" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900"><ArrowLeft className="h-3.5 w-3.5" />返回字幕工作台</Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">字幕 Session</p><h1 className="mt-2 text-3xl font-black text-zinc-950">{session.title || "未命名字幕"}</h1><p className="mt-2 text-sm text-zinc-500">{statusLabels[session.status]} · {lines.length} 行{session.duration_seconds ? ` · ${Number(session.duration_seconds).toFixed(1)} 秒` : ""}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void downloadSrt()} disabled={!lines.length} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Download className="h-4 w-4" />下載 .srt</button>{session.status === "ready" && retryableCount > 0 ? <button type="button" onClick={() => void retryRefine()} disabled={retrying} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700"><RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />重新整理 {retryableCount} 行</button> : null}</div>
        </div>
        {working ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full bg-violet-600 transition-all ${session.status === "refining" ? "w-3/4" : "w-1/3"}`} /></div> : null}
        {remaining !== null && session.status === "refining" ? <p className="mt-2 text-xs text-zinc-400">尚餘 {remaining} 行</p> : null}
        {(error || session.error_message) ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error || session.error_message}</p> : null}
      </header>

      {lines.length ? <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"><div className="hidden grid-cols-[70px_150px_minmax(0,1fr)] border-b bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-400 sm:grid"><span>#</span><span>時間</span><span>字幕</span></div>{lines.map((line) => <SubtitleLineRow key={line.id} line={line} onChange={(next) => setLines((current) => current.map((item) => item.id === next.id ? next : item))} onDelete={(id) => setLines((current) => current.filter((item) => item.id !== id))} />)}</section> : <section className="rounded-2xl border border-zinc-200 bg-white py-20 text-center text-sm text-zinc-400 shadow-sm">{session.status === "error" ? "處理失敗，請返回並重新上傳檔案。" : <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />字幕處理中，完成後會自動顯示。</span>}</section>}
    </main>
  );
}

function SubtitleLineRow({ line, onChange, onDelete }: { line: SubtitleLine; onChange: (line: SubtitleLine) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false); const [text, setText] = useState(line.display_text); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function request(method: "PATCH" | "DELETE", body?: object) { setSaving(true); setError(""); const response = await fetch(`/api/tools/subtitle/service/lines/${line.id}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); const data = response.status === 204 ? {} : await response.json().catch(() => ({})); if (!response.ok) { setError(data.error || "儲存失敗"); setSaving(false); return; } if (method === "DELETE") onDelete(line.id); else if (data.line) onChange(data.line); setEditing(false); setSaving(false); }
  return <div className={`grid gap-3 border-b border-zinc-100 p-4 last:border-0 sm:grid-cols-[70px_150px_minmax(0,1fr)] ${line.is_hallucination ? "bg-red-50/60" : ""}`}><span className="text-xs font-semibold text-zinc-400">#{line.line_index}</span><span className="text-xs text-zinc-500">{formatTime(Number(line.start_time), Number(line.end_time))}</span><div>{line.is_hallucination ? <p className="mb-2 text-xs font-semibold text-red-600">疑似錯誤字幕，請確認保留或刪除</p> : null}{editing ? <div className="space-y-2"><textarea value={text} onChange={(event) => setText(event.target.value)} className="w-full rounded-xl border border-zinc-200 p-3 text-sm leading-6 outline-none focus:border-violet-400" rows={3} /><div className="flex gap-2"><button type="button" onClick={() => void request("PATCH", { text: text.trim() })} disabled={!text.trim() || saving} className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />儲存</button><button type="button" onClick={() => { setText(line.display_text); setEditing(false); }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><X className="h-3.5 w-3.5" />取消</button></div></div> : <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => setEditing(true)} className="flex-1 text-left text-sm leading-6 text-zinc-800">{line.display_text}</button><button type="button" onClick={() => setEditing(true)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" aria-label="修改字幕"><Pencil className="h-3.5 w-3.5" /></button></div>}{line.is_hallucination ? <div className="mt-2 flex gap-2"><button type="button" onClick={() => void request("PATCH", { isHallucination: false })} disabled={saving} className="rounded-lg border px-3 py-1.5 text-xs">保留</button><button type="button" onClick={() => { if (window.confirm("確定刪除呢行字幕？")) void request("DELETE"); }} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"><Trash2 className="h-3 w-3" />刪除</button></div> : null}{error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}</div></div>;
}

function formatTime(start: number, end: number) { const format = (value: number) => { const total = Math.floor(Math.max(0, value)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }; return `${format(start)}–${format(end)}`; }
