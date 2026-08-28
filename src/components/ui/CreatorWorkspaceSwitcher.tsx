"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { CreatorAvatar } from "./CreatorAvatar";
import type { CreatorWorkspace } from "@/lib/creator-workspace";

export function CreatorWorkspaceSwitcher({ initialWorkspaces, initialActiveId, canCreate }: {
  initialWorkspaces: CreatorWorkspace[];
  initialActiveId: string | null;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0] ?? null;

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function selectWorkspace(id: string) {
    if (id === activeId || busy) return;
    setBusy(true); setError("");
    const response = await fetch("/api/creator-workspaces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: id }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "切換失敗"); setBusy(false); return; }
    setActiveId(id);
    window.location.reload();
  }

  async function createWorkspace() {
    if (!name.trim() || busy) return;
    setBusy(true); setError("");
    const response = await fetch("/api/creator-workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.workspace) { setError(data.error ?? "建立失敗"); setBusy(false); return; }
    setWorkspaces((current) => [...current, data.workspace]);
    setActiveId(data.workspace.id);
    window.location.assign("/onboarding");
  }

  return (
    <div ref={wrapRef} className="relative mt-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300">
        <CreatorAvatar avatarUrl={active?.avatar_url} creatorName={active?.display_name || active?.username || "Creator"} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900">{active?.display_name || active?.username || "Creator"}</span><span className="block text-xs text-zinc-400">Creator workspace</span></span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="absolute left-0 right-0 z-50 mt-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">我的工作空間</p>
        <div className="max-h-56 overflow-y-auto">{workspaces.map((workspace) => <button type="button" disabled={busy} key={workspace.id} onClick={() => void selectWorkspace(workspace.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-zinc-50 disabled:opacity-50"><CreatorAvatar avatarUrl={workspace.avatar_url} creatorName={workspace.display_name || workspace.username} className="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{workspace.display_name || workspace.username}</span>{workspace.id === activeId ? <Check className="h-4 w-4 text-emerald-600" /> : null}</button>)}</div>
        {canCreate ? <div className="mt-2 border-t pt-2">{creating ? <div className="space-y-2 p-1"><div className="flex gap-1"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createWorkspace(); }} placeholder="例如：Renee" className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm outline-none focus:border-zinc-400" /><button type="button" onClick={() => setCreating(false)} className="rounded-lg border p-2"><X className="h-4 w-4" /></button></div><button type="button" disabled={!name.trim() || busy} onClick={() => void createWorkspace()} className="w-full rounded-lg bg-zinc-950 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "建立中…" : "建立 workspace"}</button></div> : <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"><Plus className="h-4 w-4" />建立新 workspace</button>}</div> : null}
        {error ? <p role="alert" className="mt-2 rounded-lg bg-red-50 px-2 py-2 text-xs text-red-700">{error}</p> : null}
      </div> : null}
    </div>
  );
}
