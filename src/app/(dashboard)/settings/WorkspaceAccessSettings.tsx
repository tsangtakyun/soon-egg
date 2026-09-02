"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Mail, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import type { WorkspaceRole } from "@/lib/creator-workspace";
import { WORKSPACE_ROLE_LABELS } from "@/lib/workspace-role-labels";

type Member = { user_id: string; email: string; role: WorkspaceRole };
type Invitation = { id: string; email: string; role: "admin" | "member" };
type IncomingInvitation = { id: string; workspaceId: string; workspaceName: string; workspaceAvatar: string | null; inviterEmail: string; role: "admin" | "member"; expiresAt: string };
const roleLabel: Record<WorkspaceRole, string> = WORKSPACE_ROLE_LABELS;

export function WorkspaceAccessSettings({ role }: { role: WorkspaceRole }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [incoming, setIncoming] = useState<IncomingInvitation[]>([]);
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
    let cancelled = false;
    fetch("/api/creator-workspaces/invitations", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json().catch(() => ({})) })).then(({ response, data }) => {
      if (cancelled) return;
      if (response.ok) setIncoming(data.invitations ?? []);
      else setError(data.error ?? "未能載入收到的邀請");
    });
    return () => { cancelled = true; };
  }, []);
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
    if (response.ok) { setEmail(""); setNotice(data.emailSent ? "邀請電郵已寄出；對方登入後可接受或拒絕。" : "邀請已建立；對方需自行接受後先會加入。" ); await loadMembers(); }
    else setError(data.error ?? "邀請失敗");
    setBusy(false);
  }
  async function respond(invitationId: string, action: "accept" | "decline") {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const response = await fetch("/api/creator-workspaces/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId, action }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setIncoming((current) => current.filter((item) => item.id !== invitationId));
      setNotice(action === "accept" ? "已接受邀請，重新整理後可切換到新工作空間。" : "已拒絕邀請。");
      if (action === "accept") window.location.reload();
    } else setError(data.error ?? "未能處理邀請");
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
      <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Mail className="h-4 w-4" />收到的工作空間邀請</h2><p className="mt-1 text-xs text-gray-400">只有你按接受後，系統先會將你加入對方工作空間。</p></div>{incoming.length ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{incoming.length} 個待處理</span> : null}</div>
      {incoming.length ? <div className="mt-4 space-y-3">{incoming.map((invitation) => <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3">{invitation.workspaceAvatar ? <img src={invitation.workspaceAvatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold">{invitation.workspaceName.slice(0, 1)}</div>}<div className="min-w-0"><p className="truncate text-sm font-bold text-zinc-900">{invitation.workspaceName}</p><p className="truncate text-xs text-zinc-500">{invitation.inviterEmail} 邀請你成為 {roleLabel[invitation.role]}</p><p className="mt-1 text-[11px] text-zinc-400">有效至 {new Date(invitation.expiresAt).toLocaleDateString("zh-HK")}</p></div></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void respond(invitation.id, "decline")} className="flex-1 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-zinc-600 sm:flex-none">拒絕</button><button type="button" disabled={busy} onClick={() => void respond(invitation.id, "accept")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white sm:flex-none"><Check className="h-3.5 w-3.5" />接受</button></div></div>)}</div> : <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">暫時未有待處理邀請</div>}
    </section>
    <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Users className="h-4 w-4" />工作空間成員</h2><p className="mt-1 text-xs text-gray-400">你目前係 {roleLabel[role]}。</p></div>{role === "owner" ? <button type="button" onClick={() => void openPrompt()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium hover:bg-zinc-50"><KeyRound className="h-4 w-4" />管理商務規則</button> : <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs text-purple-700">已套用專屬回覆規則</span>}</div>
      {!canManage ? <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">只有工作空間擁有者或管理員可以管理成員。</div> : <>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collaborator@example.com" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-purple-400" /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")} className="rounded-xl border px-3 py-2 text-sm" disabled={role !== "owner"}><option value="member">協作者</option>{role === "owner" ? <option value="admin">管理員</option> : null}</select><button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white disabled:opacity-40"><UserPlus className="h-4 w-4" />邀請</button></div>
        <div className="mt-5 divide-y rounded-xl border">{members.map((member) => <div key={member.user_id} className="flex items-center gap-3 px-3 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold">{member.email.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.email}</p><p className="text-xs text-zinc-400">{roleLabel[member.role]}</p></div>{role === "owner" && member.role !== "owner" ? <select aria-label={`更改 ${member.email} 角色`} value={member.role} disabled={busy} onChange={(event) => void changeRole(member.user_id, event.target.value as "admin" | "member")} className="rounded-lg border px-2 py-1 text-xs"><option value="admin">管理員</option><option value="member">協作者</option></select> : <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{roleLabel[member.role]}</span>}{member.role !== "owner" && (role === "owner" || member.role === "member") ? <button type="button" aria-label={`移除 ${member.email}`} disabled={busy} onClick={() => void remove({ userId: member.user_id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> : null}</div>)}{invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 px-3 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600"><UserPlus className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invitation.email}</p><p className="text-xs text-amber-600">等待接受 · {roleLabel[invitation.role]}</p></div><button type="button" aria-label={`取消 ${invitation.email} 邀請`} disabled={busy} onClick={() => void remove({ invitationId: invitation.id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button></div>)}</div>
      </>}
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}{error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
    </section>
    {promptOpen ? <div role="dialog" aria-modal="true" aria-labelledby="prompt-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"><div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 id="prompt-title" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5" />專屬商務規則</h2><p className="mt-1 text-xs text-zinc-500">只有 workspace 擁有者可以查看及修改。每次儲存都會保留版本。</p></div><button type="button" aria-label="關閉" onClick={() => setPromptOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div><textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} disabled={promptLoading} className="mt-4 h-[55vh] w-full resize-none rounded-xl border p-4 font-mono text-xs leading-6 outline-none focus:border-purple-400" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPromptOpen(false)} className="rounded-xl border px-4 py-2 text-sm">取消</button><button type="button" disabled={promptLoading || systemPrompt.trim().length < 100} onClick={() => void savePrompt()} className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-40">{promptLoading ? "儲存中…" : "儲存新版本"}</button></div></div></div> : null}
  </>;
}
