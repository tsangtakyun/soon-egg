"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Mail, Trash2, UserPlus, Users, X } from "lucide-react";
import { EggLoader } from "@/components/ui/EggLoader";
import type { WorkspaceRole } from "@/lib/creator-workspace";


type Member = { avatarUrl?: string | null; name?: string; isSelf?: boolean; user_id: string; email: string; role: WorkspaceRole };
type Invitation = { id: string; email: string; role: "admin" | "member" };
type IncomingInvitation = { id: string; workspaceId: string; workspaceName: string; workspaceAvatar: string | null; inviterEmail: string; role: "admin" | "member"; expiresAt: string };
const roleLabel: Record<WorkspaceRole, string> = { owner: "擁有者", admin: "管理員", member: "協作者" };

export function WorkspaceAccessSettings({ role }: { role: WorkspaceRole }) {
  const inviteDialog = useRef<HTMLDialogElement>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [workspaceAvatar, setWorkspaceAvatar] = useState<string | null>(null);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [incoming, setIncoming] = useState<IncomingInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canManage = role === "owner" || role === "admin";
  useEffect(() => {
    const dialog = inviteDialog.current;
    if (inviteOpen && dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [inviteOpen]);

  const loadMembers = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setLoadError(""); setMembers([]); setInvitations([]); setIncoming([]);
    try {
      const [response, incomingResponse] = await Promise.all([
        fetch("/api/creator-workspaces/members", { cache: "no-store" }),
        fetch("/api/creator-workspaces/invitations", { cache: "no-store" }),
      ]);
      const [data, incomingData] = await Promise.all([response.json(), incomingResponse.json()]);
      if (!response.ok || !incomingResponse.ok) throw new Error(data.error || incomingData.error || "未能載入團隊");
      if (request !== generation.current) return;
      setMembers(data.members ?? []); setInvitations(data.invitations ?? []);
      setIncoming(incomingData.invitations ?? []); setWorkspaceName(data.workspaceName ?? "目前工作空間"); setWorkspaceAvatar(data.workspaceAvatar ?? null);
    } catch (cause) {
      if (request === generation.current) setLoadError(cause instanceof Error ? cause.message : "未能載入團隊");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Reset stale workspace data before starting the external request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers();
    return () => { generation.current += 1; };
  }, [loadMembers, role]);

  async function invite() {
    if (!email.trim() || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
    const response = await fetch("/api/creator-workspaces/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: inviteRole }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setInviteOpen(false); setEmail(""); setNotice(data.emailSent ? "邀請電郵已寄出；對方登入後可接受或拒絕。" : "邀請已建立；對方需自行接受後先會加入。" ); await loadMembers(); }
    else setError(data.error ?? "邀請失敗");
    } catch { setError("連線失敗，請稍後重試"); } finally { setBusy(false); }
  }
  async function respond(invitationId: string, action: "accept" | "decline") {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
    const response = await fetch("/api/creator-workspaces/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId, action }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setIncoming((current) => current.filter((item) => item.id !== invitationId));
      setNotice(action === "accept" ? "已接受邀請，重新整理後可切換到新工作空間。" : "已拒絕邀請。");
      if (action === "accept") window.location.reload();
    } else setError(data.error ?? "未能處理邀請");
    } catch { setError("連線失敗，請稍後重試"); } finally { setBusy(false); }
  }
  async function changeRole(userId: string, nextRole: "admin" | "member") {
    setBusy(true); setError("");
    try {
    const response = await fetch("/api/creator-workspaces/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: nextRole }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) await loadMembers(); else setError(data.error ?? "更新失敗");
    } catch { setError("連線失敗，請稍後重試"); } finally { setBusy(false); }
  }
  async function remove(payload: { userId?: string; invitationId?: string }) {
    if (busy || !window.confirm("確定移除／取消呢項邀請？")) return;
    setBusy(true); setError("");
    try {
    const response = await fetch("/api/creator-workspaces/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) await loadMembers(); else setError(data.error ?? "移除失敗");
    } catch { setError("連線失敗，請稍後重試"); } finally { setBusy(false); }
  }
  if (loading) return <div className="flex min-h-80 items-center justify-center"><EggLoader label="正在載入團隊…" /></div>;
  if (loadError) return <div role="alert" className="rounded-2xl border p-6 text-center"><p>{loadError}</p><button onClick={() => void loadMembers()} className="mt-4 rounded-xl border px-5 py-3">重試</button></div>;

  return <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
    <div className="mb-5 flex items-center gap-3"><TeamAvatar workspace key={workspaceAvatar ?? workspaceName} src={workspaceAvatar} name={workspaceName} size={52} /><div className="min-w-0"><p className="text-xl font-semibold">{workspaceName}</p><p className="mt-1 text-sm text-zinc-500">你是{roleLabel[role]}</p></div></div>
    <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Users className="h-4 w-4" />目前成員 · {members.length}</h2></div>{canManage ? <button onClick={() => { setError(""); setInviteOpen(true); }} className="shrink-0 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-[#7c4b50]">＋ 邀請成員</button> : null}</div>
<>
        <div className="mt-5 divide-y divide-zinc-200 rounded-xl border border-zinc-200">{members.map((member) => <div key={member.user_id} className="flex items-center gap-3 px-3 py-3"><TeamAvatar key={member.avatarUrl ?? member.user_id} src={member.avatarUrl} name={member.name || member.email} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.name || member.email}{member.isSelf ? <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-[#7c4b50]">你</span> : null}</p></div>{role === "owner" && member.role !== "owner" ? <select aria-label={`更改 ${member.email} 角色`} value={member.role} disabled={busy} onChange={(event) => void changeRole(member.user_id, event.target.value as "admin" | "member")} className="rounded-lg border px-2 py-1 text-xs"><option value="admin">管理員</option><option value="member">協作者</option></select> : <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{roleLabel[member.role]}</span>}{canManage && member.role !== "owner" && (role === "owner" || member.role === "member") ? <button type="button" aria-label={`移除 ${member.email}`} disabled={busy} onClick={() => void remove({ userId: member.user_id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> : null}</div>)}{invitations.length ? <h3 className="px-3 py-3 text-sm font-semibold">已發出的邀請</h3> : null}{invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 px-3 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600"><UserPlus className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{invitation.email}</p><p className="text-xs text-amber-600">等待接受 · {roleLabel[invitation.role]}</p></div><button type="button" aria-label={`取消 ${invitation.email} 邀請`} disabled={busy} onClick={() => void remove({ invitationId: invitation.id })} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button></div>)}</div>
      </>
      {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}{error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
    </section>
    <section className={incoming.length ? "mb-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm" : "py-3"}>
      {incoming.length ? <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Mail className="h-4 w-4" />收到的工作空間邀請</h2><p className="mt-1 text-xs text-gray-400">只有你按接受後，系統先會將你加入對方工作空間。</p></div>{incoming.length ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{incoming.length} 個待處理</span> : null}</div> : null}
      {incoming.length ? <div className="mt-4 space-y-3">{incoming.map((invitation) => <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><TeamAvatar workspace key={invitation.workspaceAvatar ?? invitation.id} src={invitation.workspaceAvatar} name={invitation.workspaceName} /><div className="min-w-0"><p className="truncate text-sm font-bold text-zinc-900">{invitation.workspaceName}</p><p className="truncate text-xs text-zinc-500">{invitation.inviterEmail} 邀請你成為 {roleLabel[invitation.role]}</p><p className="mt-1 text-[11px] text-zinc-400">有效至 {new Date(invitation.expiresAt).toLocaleDateString("zh-HK")}</p></div></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void respond(invitation.id, "decline")} className="flex-1 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-zinc-600 sm:flex-none">拒絕</button><button type="button" disabled={busy} onClick={() => void respond(invitation.id, "accept")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white sm:flex-none"><Check className="h-3.5 w-3.5" />接受</button></div></div>)}</div> : <div className="text-center text-sm text-zinc-500">暫時未有待處理邀請</div>}
    </section>
      <details className="mt-3 text-sm text-zinc-500"><summary>了解角色權限</summary><p className="mt-2">所有成員可查看團隊。擁有者及管理員可管理成員；只有擁有者可更改角色。</p></details>
    {canManage ? <dialog ref={inviteDialog} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => setInviteOpen(false)} aria-labelledby="invite-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/40">
      <div className="flex items-center justify-between"><h2 id="invite-title" className="text-lg font-semibold">邀請成員</h2><button aria-label="關閉邀請" disabled={busy} onClick={() => setInviteOpen(false)} className="p-2"><X size={20}/></button></div>
              <div className="mt-5 grid gap-3"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="邀請電郵" placeholder="輸入邀請電郵" autoFocus disabled={busy} className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-purple-400" /><select aria-label="成員角色" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")} className="rounded-xl border px-3 py-2 text-sm" disabled={busy || role !== "owner"}><option value="member">協作者</option>{role === "owner" ? <option value="admin">管理員</option> : null}</select><button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white disabled:opacity-40"><UserPlus className="h-4 w-4" />{busy ? "處理中…" : "發出邀請"}</button></div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </dialog> : null}

  </div>;
}

function TeamAvatar({ src, name, size = 40, workspace = false }: { src?: string | null; name: string; size?: number; workspace?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600" style={{ width: size, height: size }}>
    {src && !failed ? <Image src={src} width={size} height={size} alt="" unoptimized onError={() => setFailed(true)} className="h-full w-full object-cover" /> : workspace && name.toLowerCase().replace(/[^a-z]/g, "") === "eggsoon" ? <Image src="/soon-egg.png" width={size} height={size} alt="" /> : (name || "?").slice(0, 1).toUpperCase()}
  </div>;
}
