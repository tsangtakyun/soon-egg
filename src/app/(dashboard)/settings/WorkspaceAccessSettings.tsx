"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import type { WorkspaceRole } from "@/lib/creator-workspace";

type Member = { user_id: string; email: string; role: WorkspaceRole };
type Invitation = { id: string; email: string; role: "admin" | "member" };
const roleLabel: Record<WorkspaceRole, string> = { owner: "擁有者", admin: "Admin", member: "Member" };

export function WorkspaceAccessSettings({ role }: { role: WorkspaceRole }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const canManage = role === "owner" || role === "admin";

  async function loadMembers() {
    if (!canManage) return;
    const response = await fetch("/api/creator-workspaces/members", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setMembers(data.members ?? []); setInvitations(data.invitations ?? []); }
    else setError(data.error ?? "未能載入成員");
  }
  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    fetch("/api/creator-workspaces/members", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json().catch(() => ({})) })).then(({ response, data }) => {
      if (cancelled) return;
      if (response.ok) { setMembers(data.members ?? []); setInvitations(data.invitations ?? []); }
      else setError(data.error ?? "未能載入成員");
    });
    return () => { cancelled = true; };
  }, [canManage]);

  async function invite() {
    if (!email.trim() || busy) return;
    setBusy(true); setError(""); setNotice("");
    const response = await fetch("/api/creator-workspaces/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: inviteRole }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setEmail(""); setNotice(data.emailSent ? "邀請電郵已寄出。" : data.existingAccount ? "邀請已建立；對方下次登入後會自動加入。" : "邀請已建立；請對方直接登入 Egg 接受。" ); await loadMembers(); }
    else setError(data.error ?? "邀請失敗");
    setBusy(false);
  }
  async function changeRole(userId: string, nextRole: "admin" | "member") {
    setBusy(true); setError("");
    const response = await fetch("/api/creator-workspaces/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: nextRole }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) await loadMembers(); else setError(data.error ?? "更新失敗");
    setBusy(false);
  }
  async function remove(payload: { userId?: string; invitationId?: string }) {
    if (busy || !window.confirm("確定移除／取消呢項邀請？")) return;
    setBusy(true); setError("");
    const response = await fetch("/api/creator-workspaces/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) await loadMembers(); else setError(data.error ?? "移除失敗");
    setBusy(false);
  }
  async function openPrompt() {
    setPromptOpen(true); setPromptLoading(true); setError("");
    const response = await fetch("/api/creator-workspaces/prompt", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setSystemPrompt(data.systemPrompt ?? ""); else setError(data.error ?? "未能讀取商務規則");
    setPromptLoading(false);
  }
  async function savePrompt() {
    setPromptLoading(true); setError("");
    const response = await fetch("/api/creator-workspaces/prompt", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setNotice("專屬商務規則已儲存，舊版本亦已保留。"); setPromptOpen(false); } else setError(data.error ?? "儲存失敗");
    setPromptLoading(false);
  }

  return <>
    <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Users className="h-4 w-4" />工作空間成員</h2><p className="mt-1 text-xs text-gray-400">你目前係 {roleLabel[role]}。</p></div>{role === "owner" ? <button type="button" onClick={() => void openPrompt()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium hover:bg-zinc-50"><KeyRound className="h-4 w-4" />管理商務規則</button> : <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs text-purple-700">已套用專屬回覆規則</span>}</div>
      {!canManage ? <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">只有擁有者或 Admin 可以管理成員。</div> : <>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-purple-400" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")} className="rounded-xl border px-3 py-2 text-sm" disabled={role !== "owner"}><option value="member">Member</option>{role === "owner" ? <option value="admin">Admin</option> : null}</select><button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white disabled:opacity-40"><UserPlus className="h-4 w-4" />邀請</button></div>
        <div className="mt-5 divide-y rounded-xl border">{members.map((member) => <div key={member.user_id} className="flex items-center gap-3 px-3 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">{member.email.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.email}</p><p className="text-xs text-zinc-400">{roleLabel[member.role]}</p></div>{role === "owner" && member.role !== "owner" ? <select aria-label={`更改 ${member.email} 角色`} value={member.role} disabled={busy} onChange={(event) => void changeRole(member.user_id, event.target.value as "admin" | "member")} className="rounded-lg border px-2 py-1 text-xs"><option value="admin">Admin</option><option value="member">Member</option></select> : <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{roleLabel[member.role]}</span>}{member.role !== "owner" && (role === "owner" || member.role === "member") ? <button type="button" aria-label={`移除 ${member.email}`} disabled={busy} onClick={() => void remove({ userId: member.user_id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> : null}</div>)}{invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 px-3 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600"><UserPlus className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invitation.email}</p><p className="text-xs text-amber-600">等待接受 · {roleLabel[invitation.role]}</p></div><button type="button" aria-label={`取消 ${invitation.email} 邀請`} disabled={busy} onClick={() => void remove({ invitationId: invitation.id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button></div>)}</div>
      </>}
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}{error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
    </section>
    {promptOpen ? <div role="dialog" aria-modal="true" aria-labelledby="prompt-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"><div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 id="prompt-title" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5" />專屬商務規則</h2><p className="mt-1 text-xs text-zinc-500">只有 workspace 擁有者可以查看及修改。每次儲存都會保留版本。</p></div><button type="button" aria-label="關閉" onClick={() => setPromptOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div><textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} disabled={promptLoading} className="mt-4 h-[55vh] w-full resize-none rounded-xl border p-4 font-mono text-xs leading-6 outline-none focus:border-purple-400" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPromptOpen(false)} className="rounded-xl border px-4 py-2 text-sm">取消</button><button type="button" disabled={promptLoading || systemPrompt.trim().length < 100} onClick={() => void savePrompt()} className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-40">{promptLoading ? "儲存中…" : "儲存新版本"}</button></div></div></div> : null}
  </>;
}
