"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fal } from "@fal-ai/client";
import { Captions, FileAudio, FileVideo, Loader2, Trash2, Upload } from "lucide-react";
import type { SubtitleSession } from "@/types/subtitle";

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
];

fal.config({ proxyUrl: "/api/tools/subtitle/service/fal/proxy" });

const statusLabels: Record<SubtitleSession["status"], string> = {
  pending: "準備中",
  transcribing: "轉錄中",
  refining: "AI 優化中",
  ready: "已完成",
  error: "處理失敗",
};

export function SubtitleClient({ sessions: initialSessions }: { sessions: SubtitleSession[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function chooseFile(nextFile?: File) {
    setError("");
    setStatus("");
    if (!nextFile) return;
    const accepted = ACCEPTED_TYPES.includes(nextFile.type) || /\.(mp4|mov|mp3|m4a|wav)$/i.test(nextFile.name);
    if (!accepted) {
      setError("請上傳 MP4、MOV、MP3、M4A 或 WAV 檔案。");
      return;
    }
    setFile(nextFile);
    if (!title.trim()) setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
  }

  async function startUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      setStatus("正在安全上傳影片／錄音…");
      const mediaUrl = await fal.storage.upload(file);
      setStatus("正在建立字幕 Session…");
      const response = await fetch("/api/tools/subtitle/service/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: mediaUrl,
          title: title.trim() || file.name,
          originalFilename: file.name,
          originalSizeBytes: file.size,
          compressedSizeBytes: file.size,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.session?.id) {
        throw new Error(data.error || "建立字幕 Session 失敗");
      }
      router.push(`/tools/subtitle/${data.session.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上傳失敗，請稍後再試。");
      setStatus("");
      setUploading(false);
    }
  }

  async function deleteSession(session: SubtitleSession) {
    if (!window.confirm(`確定刪除「${session.title || "未命名字幕"}」？`)) return;
    setDeletingId(session.id);
    const response = await fetch(`/api/tools/subtitle/service/sessions/${session.id}`, { method: "DELETE" });
    if (response.ok) {
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "刪除失敗，請稍後再試。");
    }
    setDeletingId(null);
  }

  return (
    <main className="space-y-6 bg-[#f7f7f8] px-4 pb-10 pt-[10vh] sm:px-6">
      <header className="lg:ml-[10%]">
        <h1 className="text-3xl font-black text-zinc-950">字幕工作台</h1>
        <p className="mt-2 text-zinc-500">上傳影片或錄音，AI 會按真實語音時間生成廣東話字幕。</p>
        <p className="mt-1 text-xs text-zinc-400">支援 MP4、MOV、MP3、M4A、WAV · 暫時免費使用</p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Captions className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-zinc-950">新增字幕 Session</h2><p className="text-xs text-zinc-400">完成後可以逐行修改及下載 .srt</p></div>
          </div>

          <input ref={inputRef} type="file" className="hidden" accept="video/mp4,video/quicktime,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/wav,audio/wave" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
            className={`flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${dragging ? "border-violet-500 bg-violet-50" : "border-zinc-200 bg-zinc-50 hover:border-violet-300 hover:bg-violet-50/40"}`}
          >
            {file ? (file.type.startsWith("video/") ? <FileVideo className="h-9 w-9 text-violet-600" /> : <FileAudio className="h-9 w-9 text-violet-600" />) : <Upload className="h-9 w-9 text-zinc-400" />}
            <span className="mt-3 max-w-full truncate text-sm font-semibold text-zinc-800">{file?.name || "拖放檔案到這裡，或點擊選擇"}</span>
            <span className="mt-1 text-xs text-zinc-400">{file ? formatFileSize(file.size) : "影片或錄音檔案"}</span>
          </button>

          <label className="mt-5 block text-sm font-medium text-zinc-700">字幕標題
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：IG Reel 字幕" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400" />
          </label>
          {status ? <p className="mt-3 text-sm text-violet-600">{status}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="button" onClick={() => void startUpload()} disabled={!file || uploading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "上傳中…" : "上傳並生成字幕"}
          </button>
        </div>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-zinc-950">處理流程</h2>
          <ol className="mt-5 space-y-5">
            {["上傳影片或錄音", "AI 按真實語音建立時間碼", "自動整理廣東話字幕", "逐行修改並下載 .srt"].map((item, index) => (
              <li key={item} className="flex gap-3 text-sm text-zinc-600"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">{index + 1}</span><span className="pt-0.5">{item}</span></li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="font-bold text-zinc-950">字幕記錄</h2><p className="mt-1 text-xs text-zinc-400">只有你可以查看自己的字幕 Session</p></div><span className="text-xs text-zinc-400">{sessions.length} 個</span></div>
        {sessions.length === 0 ? <div className="py-12 text-center text-sm text-zinc-400">暫未有字幕記錄</div> : (
          <div className="mt-4 divide-y divide-zinc-100">
            {sessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{session.title || "未命名字幕"}</p><p className="mt-1 text-xs text-zinc-400">{statusLabels[session.status]} · {formatDate(session.created_at)} · {session.line_count || 0} 行</p>{session.error_message ? <p className="mt-1 text-xs text-red-600">{session.error_message}</p> : null}</div>
                <div className="flex gap-2"><Link href={`/tools/subtitle/${session.id}`} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">開啟</Link><button type="button" onClick={() => void deleteSession(session)} disabled={deletingId === session.id} className="rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`刪除 ${session.title || "字幕"}`}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatFileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(new Date(value)); }
