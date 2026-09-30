"use client";
/* eslint-disable @next/next/no-img-element -- local screenshot previews use transient data URLs */

import { ReplyRulesEditor } from "./ReplyRulesEditor";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ClipboardList, Copy, FileQuestion, FileText, Folder, ImagePlus, Lightbulb, Loader2, Mic, Plus, Send, ShieldAlert, X } from "lucide-react";
import { replyProjectStatusLabels, replyProjectStatuses, type ReplyProjectStatus } from '@/lib/reply-project-status';
import { usePendingPageWarning } from '@/hooks/usePendingPageWarning';

export type MayanMessage = { id?: string; role: "user" | "assistant"; content: string; created_at: string; attachment_url?: string | null };
export type EnquiryBrief = { summary?: string; brand?: string; contact?: string; collaborationType?: string; deliverables?: string[]; timeline?: string; usageRights?: string; exclusivity?: string; budget?: string; missing?: string[]; risks?: string[]; nextSteps?: string[]; conflicts?: string[]; fieldEvidence?: Array<{ field: string; value: string; source: "text" | "screenshot" | "audio" | "previous"; observedAt: string; confirmation: "client_stated" | "creator_confirmed" | "unconfirmed" }> };
export type ReplyProject = { id: string; name: string; brief: EnquiryBrief; updated_at: string; lifecycle_status?: ReplyProjectStatus; status_updated_at?: string | null };
type ImageAttachment = { dataUrl: string; mediaType: "image/jpeg"; name: string };
type FeedbackMode = "project" | "workspace_rule";

export function ReplyClient({ messages: initialMessages, projects: initialProjects, canManageRules = false }: { messages: MayanMessage[]; projects: ReplyProject[]; canManageRules?: boolean }) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(initialProjects[0]?.id ?? "");
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [loading, setLoading] = useState(Boolean(initialProjects[0]?.id));
  const [submitting, setSubmitting] = useState(false);
  const [jobRevision, setJobRevision] = useState(0);
  const submittingRef = useRef(false);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const deliveredJobs = useRef(new Set<string>());
  const projectDrafts = useRef(new Map<string, { input: string; image: ImageAttachment | null }>());
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"projects" | "brief" | "chat">("projects");
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("project");
  const [notice, setNotice] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [menuProject, setMenuProject] = useState<ReplyProject | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProject = projects.find((project) => project.id === activeId);
  usePendingPageWarning(submitting || voiceLoading);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        if (submittingRef.current) return;
        const response = await fetch(`/api/tools/reply/chat?projectId=${encodeURIComponent(activeId)}`, { cache: 'no-store' });
        const data = await response.json();
        if (cancelled || submittingRef.current) return;
        if (!response.ok) throw new Error(data.error || '未能讀取處理進度');
        const job = data.job;
        setLoading(job?.status === 'processing');
        if (!job || job.status === 'processing' || deliveredJobs.current.has(job.id)) return;
        const historyResponse = await fetch(`/api/tools/reply/projects?projectId=${encodeURIComponent(activeId)}`, { cache: 'no-store' });
        const history = await historyResponse.json();
        if (cancelled) return;
        if (!historyResponse.ok) throw new Error('未能載入最新對話，正在重試。');
        const restored: MayanMessage[] = history.messages ?? [];
        if (job.status === 'completed' && job.result?.reply && job.result?.warning && !restored.some(message => message.role === 'assistant' && message.content === job.result.reply)) {
          restored.push({ id: job.id, role: 'assistant', content: job.result.reply, created_at: job.updated_at });
        }
        setMessages(restored);
        if (history.project) setProjects(current => current.map(project => project.id === activeId ? { ...project, ...history.project } : project));
        deliveredJobs.current.add(job.id);
        if (job.status === 'failed') {
          setError(job.error || '處理未完成，請檢查對話後重試。');
          setInput(current => current || job.result?.input || '');
        } else {
          setNotice(job.result?.warning || '回覆及摘要已更新。');
          setInput(current => current === job.result?.input ? '' : current);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '連線暫時中斷，正在重新讀取進度；請勿重複送出。');
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeId, jobRevision]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function selectProject(projectId: string) {
    if (switching || submitting || voiceLoading) return;
    if (projectId === activeId) { setMobilePanel('chat'); return; }
    setSwitching(true); setError(""); setNotice(""); setImage(null); setFeedbackMode("project");
    projectDrafts.current.set(activeId, { input, image });
    try {
      const response = await fetch(`/api/tools/reply/projects?projectId=${encodeURIComponent(projectId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "讀取失敗");
      setLoading(true); setActiveId(projectId); setMessages(data.messages ?? []); setMobilePanel("chat");
      const draft = projectDrafts.current.get(projectId);
      setInput(draft?.input ?? ''); setImage(draft?.image ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "讀取項目 失敗。"); }
    finally { setSwitching(false); }
  }

  async function createProject() {
    const name = newProjectName.trim(); if (!name) return;
    const response = await fetch("/api/tools/reply/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.project) { setError(data.error ?? "建立項目 失敗。"); return; }
    setLoading(true); setInput(''); setImage(null);
    setProjects((current) => [data.project, ...current]); setActiveId(data.project.id); setMessages([]); setNewProjectName(""); setShowNewProject(false); setMobilePanel("chat");
  }

  async function changeProjectStatus(project: ReplyProject, status: ReplyProjectStatus) {
    if (statusSaving || !window.confirm(`將「${project.name}」移到${replyProjectStatusLabels[status]}？摘要及對話會保留，不會向對方發送訊息。`)) return;
    setStatusSaving(true); setError('');
    try {
      const response = await fetch('/api/tools/reply/projects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, lifecycle_status: status }) });
      const data = await response.json();
      if (!response.ok || !data.project) throw new Error(data.error || '未能更新項目狀態');
      setProjects(current => current.map(project => project.id === data.project.id ? { ...project, ...data.project } : project));
      setNotice(`已移到${replyProjectStatusLabels[status]}，對話已保留。`);
      setMenuProject(null);
      setMobilePanel('projects');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '未能更新項目狀態'); }
    finally { setStatusSaving(false); }
  }

  async function deleteProject(projectId: string) {
    const project = projects.find(item => item.id === projectId);
    if (!project || statusSaving || !window.confirm(`永久刪除「${project.name}」？所有對話都會一併刪除，無法復原。如需保留記錄，請改用封存。`)) return;
    setStatusSaving(true); setError('');
    try {
      const response = await fetch(`/api/tools/reply/projects?projectId=${encodeURIComponent(projectId)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? '未能刪除項目');
      setProjects(current => current.filter(item => item.id !== projectId));
      setMenuProject(null);
      if (activeId === projectId) { setActiveId(''); setLoading(false); setMessages([]); setInput(''); setImage(null); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '未能刪除項目，請重試'); }
    finally { setStatusSaving(false); }
  }

  async function prepareImage(file: File) {
    if (!file.type.startsWith("image/")) { setError("請選擇 JPG、PNG 或 WebP 圖片。"); return; }
    if (file.size > 12 * 1024 * 1024) { setError("圖片太大，請選擇 12MB 以下圖片。"); return; }
    try { setImage(await compressImage(file)); setError(""); } catch { setError("圖片太大或暫時未能讀取，請重新選擇。"); }
  }

  async function transcribeVoice(file: File) {
    if (file.size > 25 * 1024 * 1024) { setError("錄音檔太大，請選擇 25MB 以下檔案。"); return; }
    setVoiceLoading(true); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/mobile/reply/transcribe", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.transcript) throw new Error(data.error ?? "未能辨識錄音");
      setInput((current) => [current.trim(), `[錄音轉寫]\n${data.transcript.trim()}`].filter(Boolean).join("\n\n"));
      setNotice(`已將「${file.name || "錄音"}」轉成文字，請確認後再生成回覆。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "暫時未能辨識錄音，請稍後再試。"); }
    finally { setVoiceLoading(false); }
  }

  async function generateReply() {
    const cleanInput = input.trim() || (image ? "請閱讀截圖，整理查詢並草擬第一輪回覆。" : "");
    if (!cleanInput || loading || submittingRef.current || !activeProject) return;
    const sentImage = image;
    const projectId = activeProject.id;
    submittingRef.current = true;
    setSubmitting(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/tools/reply/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ background: true, requestId: crypto.randomUUID(), message: cleanInput, history: messages.slice(-6), projectId, feedbackMode, image: sentImage ? { data: sentImage.dataUrl.split(",")[1], mediaType: sentImage.mediaType } : undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.job) throw new Error(data.error ?? "未能確認任務，請先檢查處理進度。");
      if (activeIdRef.current === projectId) {
        setLoading(true);
        setImage(null);
        setNotice('已交由背景處理，可以切換頁面；返回此項目會自動載入結果。');
        setFeedbackMode("project");
      }
    } catch (cause) {
      if (activeIdRef.current === projectId) setError(cause instanceof Error ? cause.message : '連線中斷，正在確認任務是否已接收；請勿重複送出。');
    } finally {
      submittingRef.current = false; setSubmitting(false); setJobRevision(current => current + 1);
    }
  }

  return <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-zinc-100 p-3 sm:p-5 lg:h-screen lg:min-h-0">
    <header className="mb-3 flex items-center justify-between rounded-2xl border bg-white px-4 py-3"><div><h1 className="text-xl font-black text-zinc-950">回覆中心</h1><p className="text-xs text-zinc-500">加入文字、截圖或錄音，整理合作摘要並草擬回覆。</p></div>{canManageRules ? <ReplyRulesEditor /> : null}</header>
    {error ? <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p> : null}
    {submitting || voiceLoading || loading ? <p role="status" className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm">{submitting ? '正在提交內容，請暫時留在此頁…' : voiceLoading ? '正在轉寫錄音，請暫時留在此頁…' : '正在背景整理回覆及摘要，可以切換頁面；返回此項目會載入結果。'}</p> : null}
    <div className="mb-3 grid grid-cols-3 rounded-xl border bg-white p-1 lg:hidden">{([["projects", "項目"], ["brief", "摘要"], ["chat", "AI 回覆"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMobilePanel(value)} className={`rounded-lg px-2 py-2 text-xs font-medium ${mobilePanel === value ? "bg-black text-white" : "text-zinc-500"}`}>{label}</button>)}</div>
    {activeProject ? <div className={`${mobilePanel === 'projects' ? 'hidden lg:flex' : 'flex'} mb-3 flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-sm`}>
      <span>{activeProject.name} · {replyProjectStatusLabels[activeProject.lifecycle_status ?? 'negotiating']}</span>
      <button type="button" aria-label="項目操作" disabled={statusSaving} onClick={() => setMenuProject(activeProject)} className="ml-auto min-h-11 min-w-11 rounded-lg text-xl">⋯</button>
      {statusSaving ? <span role="status">儲存中…</span> : null}
    </div> : null}
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(320px,0.9fr)_minmax(380px,1.1fr)]">
<ProjectList projects={projects} activeId={activeProject?.id} visible={mobilePanel === "projects"} showNew={showNewProject} newName={newProjectName} onToggleNew={() => setShowNewProject((value) => !value)} onNameChange={setNewProjectName} onCreate={() => void createProject()} onSelect={(id) => void selectProject(id)} onMenu={(id) => setMenuProject(projects.find(project => project.id === id) ?? null)} />
      <section className={`${mobilePanel === "brief" ? "flex" : "hidden"} min-h-[560px] flex-col overflow-hidden rounded-2xl border bg-white lg:flex lg:min-h-0`}><div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4" />合作摘要</h2><p className="mt-1 text-xs text-zinc-400">{activeProject?.name ?? "未選擇項目"} · {activeProject ? `根據最新對話更新 · ${formatBriefUpdatedAt(activeProject.updated_at)}` : "根據最新對話更新"}</p></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{switching ? <Loading /> : <BriefPanel key={activeProject?.id ?? "none"} project={activeProject} canApprove={canManageRules} />}</div></section>
      <section className={`${mobilePanel === "chat" ? "flex" : "hidden"} min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border bg-white lg:flex lg:min-h-0`}>
        <div className="border-b px-4 py-3"><h2 className="font-semibold">AI 客戶回覆</h2><p className="mt-1 text-xs text-zinc-400">只會輸出可直接發送草稿；不會自動發訊息或接受合作</p></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{messages.length ? <div className="space-y-4">{messages.map((message, index) => <ChatBubble key={message.id ?? `${message.role}-${index}`} message={message} copied={copiedIndex === index} onCopy={async () => { await navigator.clipboard.writeText(message.content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1800); }} />)}{loading ? <Loading label="正在閱讀查詢、整理摘要 及草擬回覆…" /> : null}<div ref={scrollRef} /></div> : <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center"><div className="mb-3 text-3xl">🪬</div><h3 className="font-semibold">放入品牌查詢截圖</h3><p className="mt-1 max-w-xs text-sm text-zinc-500">支援 WhatsApp、Instagram DM、Email 截圖或完整文字。</p></div>}</div>
        <Composer input={input} image={image} loading={loading || submitting} voiceLoading={voiceLoading} enabled={Boolean(activeProject)} hasDraft={messages.some((message) => message.role === "assistant")} feedbackMode={feedbackMode} fileRef={fileRef} voiceRef={voiceRef} onInput={setInput} onMode={setFeedbackMode} onImage={prepareImage} onVoice={transcribeVoice} onRemoveImage={() => setImage(null)} onSend={() => void generateReply()} />
      </section>
    </div>
    <ProjectActionMenu project={menuProject} busy={statusSaving} onClose={() => setMenuProject(null)} onStatus={(project, status) => void changeProjectStatus(project, status)} onDelete={id => void deleteProject(id)} />
  </main>;
}

function ProjectActionMenu({ project, busy, onClose, onStatus, onDelete }: { project: ReplyProject | null; busy: boolean; onClose: () => void; onStatus: (project: ReplyProject, status: ReplyProjectStatus) => void; onDelete: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (project) ref.current?.showModal(); else ref.current?.close(); }, [project]);
  return <dialog ref={ref} aria-labelledby="project-actions-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-3xl bg-white p-6 text-zinc-900 backdrop:bg-black/40 sm:inset-0 sm:m-auto sm:max-w-sm sm:rounded-3xl">
    {project ? <div className="space-y-2"><h2 id="project-actions-title" className="text-lg font-bold">{project.name}</h2><p className="text-sm text-zinc-500">{replyProjectStatusLabels[project.lifecycle_status ?? 'negotiating']}</p>
      {replyProjectStatuses.filter(status => status !== (project.lifecycle_status ?? 'negotiating')).map(status => <button key={status} type="button" disabled={busy} className="block min-h-12 w-full rounded-xl px-3 py-3 text-left hover:bg-amber-50 disabled:opacity-40" onClick={() => onStatus(project, status)}>{status === 'confirmed' ? (project.lifecycle_status === 'archived' ? '移至已確認' : '確認合作') : status === 'archived' ? '封存' : '移回洽談中'}</button>)}
      <button type="button" disabled={busy} className="min-h-12 w-full border-t px-3 py-3 text-left text-red-700" onClick={() => onDelete(project.id)}>永久刪除</button>
      <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-zinc-100 py-3">取消</button>
    </div> : null}
  </dialog>;
}

function ProjectOpenButton({ project, onSelect, onMenu }: { project: ReplyProject; onSelect: (id: string) => void; onMenu: (id: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <button type="button" className="min-w-0 flex-1 select-none px-3 py-3 pr-12 text-left text-sm" onPointerDown={event => { cancel(); held.current = false; start.current = { x: event.clientX, y: event.clientY }; if (event.pointerType !== 'mouse') timer.current = setTimeout(() => { held.current = true; onMenu(project.id); }, 450); }} onPointerMove={event => { if (Math.abs(event.clientX-start.current.x) + Math.abs(event.clientY-start.current.y) > 10) cancel(); }} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onContextMenu={event => { event.preventDefault(); cancel(); held.current = true; onMenu(project.id); }} onClick={() => { if (held.current) { held.current = false; return; } onSelect(project.id); }}>{project.name}</button>;
}

function ProjectListRows({ projects, activeId, visible, showNew, newName, onToggleNew, onNameChange, onCreate, onSelect, onMenu }: { projects: ReplyProject[]; activeId?: string; visible: boolean; showNew: boolean; newName: string; onToggleNew: () => void; onNameChange: (value: string) => void; onCreate: () => void; onSelect: (id: string) => void; onMenu: (id: string) => void }) { const sorted = [...projects].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)); return <aside className={`${visible ? "flex" : "hidden"} min-h-0 flex-col rounded-2xl border bg-zinc-900 p-3 text-white lg:flex`}><div className="mb-3 flex items-center justify-between px-2"><span className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4" />項目</span><button type="button" onClick={onToggleNew} aria-label="建立新項目" className="rounded-lg p-1.5 hover:bg-white/10"><Plus className="h-4 w-4" /></button></div>{showNew ? <form onSubmit={(event) => { event.preventDefault(); onCreate(); }} className="mb-2 flex gap-1"><input autoFocus value={newName} onChange={(event) => onNameChange(event.target.value.slice(0, 80))} placeholder="品牌／聯絡人" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-400" /><button type="submit" disabled={!newName.trim()} className="rounded-lg bg-white px-2 text-xs font-semibold text-black disabled:opacity-40">加入</button></form> : null}<div className="space-y-1 overflow-y-auto">{sorted.map((project) => { const activity = projectActivity(project.updated_at); return <div key={project.id} className={`relative flex items-center rounded-xl ${project.id === activeId ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10"}`}><ProjectOpenButton project={project} onSelect={onSelect} onMenu={onMenu} />{(project.lifecycle_status ?? "negotiating") === "negotiating" ? <span title={activity.label} aria-label={activity.label} className={`mr-3 h-3 w-3 shrink-0 rounded-full ${activity.className}`} /> : <Check className="mr-3 h-3 w-3" aria-label="已移出洽談" />}<button type="button" onClick={() => onMenu(project.id)} aria-label={`${project.name} 項目操作`} className="absolute right-7 top-0 min-h-11 min-w-11 rounded-full text-xl text-zinc-300 hover:bg-white/10">⋯</button></div>; })}</div></aside>; }

function ProjectList(props: React.ComponentProps<typeof ProjectListRows>) {
  const [filter, setFilter] = useState<ReplyProjectStatus>('negotiating');
  const filtered = props.projects.filter(project => (project.lifecycle_status ?? 'negotiating') === filter);
  return <div className={`${props.visible ? 'flex' : 'hidden'} min-h-0 flex-col gap-2 lg:flex`}>
    <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="合作階段">{replyProjectStatuses.map(status => <button type="button" role="tab" aria-selected={filter === status} key={status} onClick={() => setFilter(status)} className={`rounded-lg px-1 py-3 text-xs ${filter === status ? 'bg-black text-white' : 'bg-white text-zinc-600'}`}>{replyProjectStatusLabels[status]} {props.projects.filter(project => (project.lifecycle_status ?? 'negotiating') === status).length}</button>)}</div>
    <ProjectListRows {...props} projects={filtered} />
    {!filtered.length ? <p className="p-3 text-sm text-zinc-500">尚未有{replyProjectStatusLabels[filter]}項目</p> : null}
    {filter === 'negotiating' ? <section aria-label="互動提示" className="shrink-0 rounded-2xl bg-stone-100 p-4 text-xs text-stone-600">
      <h3 className="mb-3 font-semibold">互動提示</h3>
      <ul className="space-y-2">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />最近 7 日有互動</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />7–13 日沒有互動</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />14 日或以上沒有互動</li>
      </ul>
      <p className="mt-3 leading-5">按此項目在 EGG 的最近互動時間計算。</p>
    </section> : null}
  </div>;
}

function projectActivity(updatedAt: string) { const days = Math.max(0, (Date.now() - Date.parse(updatedAt || new Date(0).toISOString())) / 86_400_000); if (days >= 14) return { className: "bg-red-500", label: "14 日或以上沒有新互動" }; if (days >= 7) return { className: "bg-yellow-400", label: "7 日或以上沒有新互動" }; return { className: "bg-green-500", label: "最近 7 日有互動" }; }

function BriefPanel({ project }: { project?: ReplyProject; canApprove: boolean }) { const brief = project?.brief; if (!brief || !Object.keys(brief).length) return <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-zinc-400"><ClipboardList className="mb-3 h-8 w-8" /><p className="text-sm">加入第一個查詢後，摘要會自動出現。</p></div>; return <div className="space-y-3 text-sm"><section className="rounded-2xl bg-zinc-950 p-4 text-white"><p className="mb-2 text-[11px] font-bold tracking-wider text-zinc-400">對話重點</p><ul className="space-y-2 leading-6">{summaryPoints(brief.summary).map((point) => <li key={point} className="flex gap-2"><span className="text-amber-400">•</span><span>{point}</span></li>)}</ul></section><BriefList title="待客戶補充" items={brief.missing} tone="missing" icon={<FileQuestion className="h-4 w-4" />} /><BriefList title="建議下一步" items={brief.nextSteps} tone="next" icon={<Lightbulb className="h-4 w-4" />} /><details className="rounded-2xl border p-4"><summary className="cursor-pointer text-xs font-bold text-zinc-950">合作資料</summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><BriefField label="品牌／代理" value={brief.brand} /><BriefField label="聯絡人" value={brief.contact} /><BriefField label="合作形式" value={brief.collaborationType} /><BriefField label="預算" value={brief.budget} /><BriefField label="發布時間" value={brief.timeline} /><BriefField label="交付內容" value={brief.deliverables?.join("、")} /></div></details><details className="rounded-2xl border p-4"><summary className="cursor-pointer text-xs font-bold text-zinc-950">報價與授權</summary><div className="mt-4 space-y-3"><BriefField label="廣告授權／使用權" value={brief.usageRights} /><BriefField label="排他條款" value={brief.exclusivity} /></div></details>{brief.conflicts?.length ? <BriefList title="資料有衝突" items={brief.conflicts} tone="risk" icon={<ShieldAlert className="h-4 w-4" />} /> : null}{brief.fieldEvidence?.length ? <details className="rounded-2xl border p-4"><summary className="cursor-pointer text-xs font-bold">資料來源與確認</summary><div className="mt-3 space-y-3">{brief.fieldEvidence.map(item => <div key={`${item.field}-${item.observedAt}`}><p className="font-medium">{item.field}：{item.value}</p><p className="text-xs text-zinc-500">{item.source === "audio" ? "錄音" : item.source === "screenshot" ? "截圖" : item.source === "previous" ? "之前對話" : "文字"} · {item.confirmation === "creator_confirmed" ? "創作者已確認" : item.confirmation === "client_stated" ? "客戶陳述" : "未確認"} · {formatBriefUpdatedAt(item.observedAt)}</p></div>)}</div></details> : null}<details className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-900"><summary className="cursor-pointer text-xs font-bold">商業風險 <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5">{brief.risks?.length ?? 0} 項</span></summary>{brief.risks?.length ? <ul className="mt-3 space-y-2 text-xs leading-5">{brief.risks.map((item) => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul> : <p className="mt-3 text-xs opacity-70">暫未發現</p>}</details>{project?.lifecycle_status === "confirmed" ? <Link href={`/quotations?projectId=${encodeURIComponent(project.id)}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#dcc7c0] bg-[#fbf7f3] p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2e5df] text-[#7b4a4f]"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-bold text-zinc-950">建立報價草稿</span><span className="mt-0.5 block text-xs text-zinc-500">已確認合作；會自動帶入摘要資料</span></span><span aria-hidden="true">›</span></Link> : null}</div>; }

function summaryPoints(summary?: string) { const clean = (summary || "未提供").trim(); const points = clean.split(/(?<=[。！？])\s*/).map((item) => item.trim()).filter(Boolean); return (points.length ? points : [clean]).slice(0, 5); }
function formatBriefUpdatedAt(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "時間未明"; return new Intl.DateTimeFormat("zh-HK", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date); }
function BriefField({ label, value }: { label: string; value?: string }) { const missing = !value || value === "未提供"; return <div><p className="mb-1 text-[11px] font-semibold text-zinc-400">{label}</p>{missing ? <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">未提供</span> : <p className="leading-5 text-zinc-800">{value}</p>}</div>; }
function BriefList({ title, items, tone, icon }: { title: string; items?: string[]; tone: "missing" | "risk" | "next"; icon: React.ReactNode }) { const styles = tone === "risk" ? "border-red-100 bg-red-50 text-red-900" : tone === "missing" ? "border-amber-100 bg-amber-50 text-amber-900" : "border-emerald-100 bg-emerald-50 text-emerald-900"; return <section className={`rounded-2xl border p-4 ${styles}`}><p className="mb-2 flex items-center gap-2 text-xs font-bold">{icon}{title}<span className="ml-auto rounded-full bg-white/70 px-2 py-0.5">{items?.length ?? 0}</span></p>{items?.length ? <ul className="space-y-2 text-xs leading-5">{items.map((item) => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul> : <p className="flex items-center gap-2 text-xs opacity-70"><CheckCircle2 className="h-3.5 w-3.5" />暫未發現</p>}</section>; }
function ChatBubble({ message, copied, onCopy }: { message: MayanMessage; copied: boolean; onCopy: () => void }) { const user = message.role === "user"; return <div className={`flex ${user ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${user ? "bg-black text-white" : "bg-zinc-100 text-zinc-800"}`}>{message.attachment_url ? <img src={message.attachment_url} alt="品牌查詢截圖" className="mb-3 max-h-[420px] w-full rounded-xl object-contain" /> : null}{message.content}{!user ? <button type="button" onClick={onCopy} className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "已複製" : "複製草稿"}</button> : null}</div></div>; }
function Loading({ label = "載入中…" }: { label?: string }) { return <div className="flex h-full min-h-24 items-center justify-center text-sm text-zinc-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{label}</div>; }

function Composer({ input, image, loading, voiceLoading, enabled, hasDraft, feedbackMode, fileRef, voiceRef, onInput, onMode, onImage, onVoice, onRemoveImage, onSend }: { input: string; image: ImageAttachment | null; loading: boolean; voiceLoading: boolean; enabled: boolean; hasDraft: boolean; feedbackMode: FeedbackMode; fileRef: React.RefObject<HTMLInputElement | null>; voiceRef: React.RefObject<HTMLInputElement | null>; onInput: (value: string) => void; onMode: (mode: FeedbackMode) => void; onImage: (file: File) => Promise<void>; onVoice: (file: File) => Promise<void>; onRemoveImage: () => void; onSend: () => void }) { return <div className="border-t bg-zinc-50 p-3" onPaste={(event) => { const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/")); if (file) void onImage(file); }}>{hasDraft ? <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-200 p-1 text-[11px]"><button type="button" onClick={() => onMode("project")} className={`rounded-lg px-2 py-2 font-medium ${feedbackMode === "project" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}>只修改本次草稿</button><button type="button" onClick={() => onMode("workspace_rule")} className={`rounded-lg px-2 py-2 font-medium ${feedbackMode === "workspace_rule" ? "bg-purple-700 text-white shadow-sm" : "text-zinc-500"}`}>儲存為商務規則</button></div> : null}{feedbackMode === "workspace_rule" ? <p className="mb-2 rounded-lg bg-purple-50 px-3 py-2 text-[11px] text-purple-800">此修改會套用至工作空間內的其他客戶，並保留版本。</p> : null}{image ? <div className="mb-2 flex items-center gap-3 rounded-xl border bg-white p-2"><img src={image.dataUrl} alt="查詢截圖預覽" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{image.name}</p><p className="text-xs text-zinc-400">AI 會閱讀這張截圖</p></div><button type="button" onClick={onRemoveImage} aria-label="移除截圖"><X className="h-4 w-4" /></button></div> : null}{voiceLoading ? <p role="status" className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><Loader2 className="h-3.5 w-3.5 animate-spin" />正在辨識錄音，完成後會放入草稿供你確認…</p> : null}<div className="flex items-end gap-2"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImage(file); event.currentTarget.value = ""; }} /><input ref={voiceRef} type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onVoice(file); event.currentTarget.value = ""; }} /><div className="flex shrink-0 gap-1"><button type="button" onClick={() => fileRef.current?.click()} aria-label="上載查詢截圖" className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white"><ImagePlus className="h-4 w-4" /></button><button type="button" onClick={() => voiceRef.current?.click()} disabled={voiceLoading || !enabled} aria-label="上載錄音檔" className="flex h-11 w-11 items-center justify-center rounded-xl border bg-white disabled:opacity-40">{voiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}</button></div><textarea value={input} onChange={(event) => onInput(event.target.value.slice(0, 8000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder={hasDraft ? "告訴 AI 本次草稿要如何修改…" : "貼上 Email／DM／WhatsApp，或加入截圖／錄音…"} rows={3} className="min-h-11 flex-1 resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-purple-300" /><button type="button" onClick={onSend} disabled={(!input.trim() && !image) || loading || voiceLoading || !enabled} aria-label="整理查詢並生成回覆" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[11px] text-zinc-400">錄音只會先轉成可編輯文字；AI 不會自動傳送、報價、接受合作或承諾檔期。</p></div>; }

async function compressImage(file: File): Promise<ImageAttachment> { const source = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(source.width, source.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale); canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height); source.close(); const dataUrl = canvas.toDataURL("image/jpeg", 0.82); if (dataUrl.length > 4_000_000) throw new Error("Compressed image too large"); return { dataUrl, mediaType: "image/jpeg", name: file.name || "查詢截圖.jpg" }; }
