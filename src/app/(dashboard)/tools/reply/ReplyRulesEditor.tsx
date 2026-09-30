"use client";
import { useRef, useState } from "react";

export function ReplyRulesEditor() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    dialog.current?.showModal();
    setBusy(true); setLoaded(false); setError(""); setNotice(""); setValue(""); setOriginal("");
    try {
      const response = await fetch("/api/creator-workspaces/prompt", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "未能載入商務規則");
      setValue(data.systemPrompt ?? ""); setOriginal(data.systemPrompt ?? ""); setLoaded(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "連線失敗，請重試"); }
    finally { setBusy(false); }
  }
  function close() {
    if (!busy && (value === original || window.confirm("放棄未儲存的修改？"))) dialog.current?.close();
  }
  async function save() {
    if (busy || !loaded) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/creator-workspaces/prompt", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "未能儲存商務規則");
      setOriginal(value); setNotice("已儲存新版本，舊版本已保留。"); dialog.current?.close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "連線失敗，請重試"); }
    finally { setBusy(false); }
  }
  return <div>
    <button onClick={() => void load()} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-[#7c4b50]">管理商務規則</button>
    {notice ? <p role="status" className="text-xs text-emerald-700">{notice}</p> : null}
    <dialog ref={dialog} aria-labelledby="rules-title" onCancel={(event) => { event.preventDefault(); close(); }} className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-white p-5 text-zinc-900 backdrop:bg-black/50">
      <h2 id="rules-title" className="text-lg font-semibold">商務規則</h2>
      <p className="mt-2 text-sm text-zinc-500">套用到目前工作空間的回覆。只限擁有者修改；每次儲存都會保留版本。</p>
      {!loaded && busy ? <p role="status" className="py-8 text-center">正在載入商務規則…</p> : null}
      {loaded ? <><textarea aria-label="商務規則內容" value={value} maxLength={50000} disabled={busy} onChange={(event) => setValue(event.target.value)} className="mt-4 h-[45vh] w-full rounded-xl border p-3 text-base" /><p className="text-sm text-zinc-500">{value.length.toLocaleString()} / 50,000 字（最少 100 字）</p></> : null}
      {error ? <p role="alert" className="my-3 text-red-700">{error} {!loaded && !busy ? <button onClick={() => void load()} className="underline">重試</button> : null}</p> : null}
      <div className="mt-4 flex justify-end gap-3"><button disabled={busy} onClick={close} className="rounded-xl border px-4 py-2">取消</button><button disabled={busy || !loaded || value.trim().length < 100 || value === original} onClick={() => void save()} className="rounded-xl bg-[#7c4b50] px-4 py-2 text-white disabled:opacity-40">{busy && loaded ? "儲存中…" : "儲存新版本"}</button></div>
    </dialog>
  </div>;
}
