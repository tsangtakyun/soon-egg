"use client";
/* eslint-disable @next/next/no-img-element -- local screenshot previews use transient data URLs */

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ClipboardList, Copy, FileQuestion, Folder, ImagePlus, Lightbulb, Loader2, Plus, Send, ShieldAlert, X } from "lucide-react";

export type MayanMessage = { id?: string; role: "user" | "assistant"; content: string; created_at: string; attachment_url?: string | null };
type EnquiryBrief = { summary?: string; brand?: string; contact?: string; collaborationType?: string; deliverables?: string[]; timeline?: string; usageRights?: string; exclusivity?: string; budget?: string; missing?: string[]; risks?: string[]; nextSteps?: string[] };
type ReplyProject = { id: string; name: string; brief: EnquiryBrief; updated_at: string };
type ImageAttachment = { dataUrl: string; mediaType: "image/jpeg"; name: string };
type FeedbackMode = "project" | "workspace_rule";

export function ReplyClient({ messages: initialMessages, projects: initialProjects }: { messages: MayanMessage[]; projects: ReplyProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(initialProjects[0]?.id ?? "");
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"projects" | "brief" | "chat">("chat");
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("project");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function selectProject(projectId: string) {
    if (projectId === activeId || switching) return;
    setSwitching(true); setError(""); setNotice(""); setImage(null); setFeedbackMode("project");
    try {
      const response = await fetch(`/api/tools/reply/projects?projectId=${encodeURIComponent(projectId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "讀取失敗");
      setActiveId(projectId); setMessages(data.messages ?? []); setMobilePanel("chat");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "讀取 Project 失敗。"); }
    finally { setSwitching(false); }
  }

  async function createProject() {
    const name = newProjectName.trim(); if (!name) return;
    const response = await fetch("/api/tools/reply/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.project) { setError(data.error ?? "建立 Project 失敗。"); return; }
    setProjects((current) => [data.project, ...current]); setActiveId(data.project.id); setMessages([]); setNewProjectName(""); setShowNewProject(false); setMobilePanel("chat");
  }

  async function prepareImage(file: File) {
    if (!file.type.startsWith("image/")) { setError("請選擇 JPG、PNG 或 WebP 圖片。"); return; }
    if (file.size > 12 * 1024 * 1024) { setError("圖片太大，請選擇 12MB 以下圖片。"); return; }
    try { setImage(await compressImage(file)); setError(""); } catch { setError("圖片太大或暫時未能讀取，請重新選擇。"); }
  }

  async function generateReply() {
    const cleanInput = input.trim() || (image ? "請閱讀截圖，整理查詢並草擬第一輪回覆。" : "");
    if (!cleanInput || loading || !activeProject) return;
    const sentImage = image;
    const userMessage: MayanMessage = { role: "user", content: cleanInput, attachment_url: sentImage?.dataUrl, created_at: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]); setInput(""); setImage(null); setLoading(true); setError("");
    try {
      const response = await fetch("/api/tools/reply/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: cleanInput, history: messages.slice(-6), projectId: activeProject.id, feedbackMode, image: sentImage ? { data: sentImage.dataUrl.split(",")[1], mediaType: sentImage.mediaType } : undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reply) throw new Error(data.error ?? "請稍後再試");
      setMessages((current) => [...current.map((message) => message === userMessage && data.attachmentUrl ? { ...message, attachment_url: data.attachmentUrl } : message), { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
      if (data.brief) setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, name: data.projectName || project.name, brief: data.brief, updated_at: new Date().toISOString() } : project));
      if (data.ruleSaved) setNotice("今次修改已儲存為 Workspace 商務規則，之後其他客戶都會套用。");
      setFeedbackMode("project");
      if (data.warning) setError(data.warning);
    } catch (cause) {
      setMessages((current) => current.filter((message) => message !== userMessage)); setInput(cleanInput); setImage(sentImage);
      setError(`AI 暫時處理唔到：${cause instanceof Error ? cause.message : "請稍後再試"}`);
    } finally { setLoading(false); }
  }

  return <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-zinc-100 p-3 sm:p-5 lg:h-screen lg:min-h-0">
    <header className="mb-3 flex items-center justify-between rounded-2xl border bg-white px-4 py-3"><div><h1 className="text-xl font-black text-zinc-950">合作查詢工作台</h1><p className="text-xs text-zinc-500">選擇 Project，貼上查詢截圖，自動整理 Brief 及草擬第一輪回覆。</p></div><span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">專屬商務規則</span></header>
    {error ? <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p> : null}
    <div className="mb-3 grid grid-cols-3 rounded-xl border bg-white p-1 lg:hidden">{([["projects", "Projects"], ["brief", "Brief"], ["chat", "AI 回覆"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMobilePanel(value)} className={`rounded-lg px-2 py-2 text-xs font-medium ${mobilePanel === value ? "bg-black text-white" : "text-zinc-500"}`}>{label}</button>)}</div>
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(320px,0.9fr)_minmax(380px,1.1fr)]">
      <ProjectList projects={projects} activeId={activeProject?.id} visible={mobilePanel === "projects"} showNew={showNewProject} newName={newProjectName} onToggleNew={() => setShowNewProject((value) => !value)} onNameChange={setNewProjectName} onCreate={() => void createProject()} onSelect={(id) => void selectProject(id)} />
      <section className={`${mobilePanel === "brief" ? "flex" : "hidden"} min-h-[560px] flex-col overflow-hidden rounded-2xl border bg-white lg:flex lg:min-h-0`}><div className="border-b px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4" />Enquiry Brief</h2><p className="mt-1 text-xs text-zinc-400">{activeProject?.name ?? "未選擇 Project"} · 每次生成後自動更新</p></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{switching ? <Loading /> : <BriefPanel brief={activeProject?.brief} />}</div></section>
      <section className={`${mobilePanel === "chat" ? "flex" : "hidden"} min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border bg-white lg:flex lg:min-h-0`}>
        <div className="border-b px-4 py-3"><h2 className="font-semibold">AI 客戶回覆</h2><p className="mt-1 text-xs text-zinc-400">只會輸出可直接發送草稿；不會自動發訊息或接受合作</p></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{messages.length ? <div className="space-y-4">{messages.map((message, index) => <ChatBubble key={message.id ?? `${message.role}-${index}`} message={message} copied={copiedIndex === index} onCopy={async () => { await navigator.clipboard.writeText(message.content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1800); }} />)}{loading ? <Loading label="正在閱讀查詢、建立 Brief 及草擬回覆…" /> : null}<div ref={scrollRef} /></div> : <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center"><div className="mb-3 text-3xl">🪬</div><h3 className="font-semibold">放入品牌查詢截圖</h3><p className="mt-1 max-w-xs text-sm text-zinc-500">支援 WhatsApp、Instagram DM、Email 截圖或完整文字。</p></div>}</div>
        <Composer input={input} image={image} loading={loading} enabled={Boolean(activeProject)} hasDraft={messages.some((message) => message.role === "assistant")} feedbackMode={feedbackMode} fileRef={fileRef} onInput={setInput} onMode={setFeedbackMode} onImage={prepareImage} onRemoveImage={() => setImage(null)} onSend={() => void generateReply()} />
      </section>
    </div>
  </main>;
}

function ProjectList({ projects, activeId, visible, showNew, newName, onToggleNew, onNameChange, onCreate, onSelect }: { projects: ReplyProject[]; activeId?: string; visible: boolean; showNew: boolean; newName: string; onToggleNew: () => void; onNameChange: (value: string) => void; onCreate: () => void; onSelect: (id: string) => void }) { return <aside className={`${visible ? "flex" : "hidden"} min-h-0 flex-col rounded-2xl border bg-zinc-900 p-3 text-white lg:flex`}><div className="mb-3 flex items-center justify-between px-2"><span className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4" />Projects</span><button type="button" onClick={onToggleNew} aria-label="建立新 Project" className="rounded-lg p-1.5 hover:bg-white/10"><Plus className="h-4 w-4" /></button></div>{showNew ? <form onSubmit={(event) => { event.preventDefault(); onCreate(); }} className="mb-2 flex gap-1"><input autoFocus value={newName} onChange={(event) => onNameChange(event.target.value.slice(0, 80))} placeholder="Project／人名" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-400" /><button type="submit" disabled={!newName.trim()} className="rounded-lg bg-white px-2 text-xs font-semibold text-black disabled:opacity-40">加入</button></form> : null}<div className="space-y-1 overflow-y-auto">{projects.map((project) => <button key={project.id} type="button" onClick={() => onSelect(project.id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${project.id === activeId ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10"}`}>{project.name}</button>)}</div></aside>; }

function BriefPanel({ brief }: { brief?: EnquiryBrief }) { if (!brief || !Object.keys(brief).length) return <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-zinc-400"><ClipboardList className="mb-3 h-8 w-8" /><p className="text-sm">上載第一個查詢後，Brief 會自動出現。</p></div>; return <div className="space-y-3 text-sm"><section className="rounded-2xl bg-zinc-950 p-4 text-white"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">查詢摘要</p><p className="leading-6">{brief.summary || "未提供"}</p></section><section className="rounded-2xl border p-4"><p className="mb-3 text-xs font-bold text-zinc-950">已知資料</p><div className="grid gap-3 sm:grid-cols-2"><BriefField label="品牌／Agency" value={brief.brand} /><BriefField label="聯絡人" value={brief.contact} /><BriefField label="合作類型" value={brief.collaborationType} /><BriefField label="預算" value={brief.budget} /><BriefField label="Timeline" value={brief.timeline} /><BriefField label="Deliverables" value={brief.deliverables?.join("、")} /></div></section><section className="rounded-2xl border p-4"><p className="mb-3 text-xs font-bold text-zinc-950">商務條款</p><div className="space-y-3"><BriefField label="廣告授權／使用權" value={brief.usageRights} /><BriefField label="排他條款" value={brief.exclusivity} /></div></section><BriefList title="待客戶補充" items={brief.missing} tone="missing" icon={<FileQuestion className="h-4 w-4" />} /><BriefList title="商業風險" items={brief.risks} tone="risk" icon={<ShieldAlert className="h-4 w-4" />} /><BriefList title="建議下一步" items={brief.nextSteps} tone="next" icon={<Lightbulb className="h-4 w-4" />} /></div>; }
function BriefField({ label, value }: { label: string; value?: string }) { const missing = !value || value === "未提供"; return <div><p className="mb-1 text-[11px] font-semibold text-zinc-400">{label}</p>{missing ? <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">未提供</span> : <p className="leading-5 text-zinc-800">{value}</p>}</div>; }
function BriefList({ title, items, tone, icon }: { title: string; items?: string[]; tone: "missing" | "risk" | "next"; icon: React.ReactNode }) { const styles = tone === "risk" ? "border-red-100 bg-red-50 text-red-900" : tone === "missing" ? "border-amber-100 bg-amber-50 text-amber-900" : "border-emerald-100 bg-emerald-50 text-emerald-900"; return <section className={`rounded-2xl border p-4 ${styles}`}><p className="mb-2 flex items-center gap-2 text-xs font-bold">{icon}{title}<span className="ml-auto rounded-full bg-white/70 px-2 py-0.5">{items?.length ?? 0}</span></p>{items?.length ? <ul className="space-y-2 text-xs leading-5">{items.map((item) => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul> : <p className="flex items-center gap-2 text-xs opacity-70"><CheckCircle2 className="h-3.5 w-3.5" />暫未發現</p>}</section>; }
function ChatBubble({ message, copied, onCopy }: { message: MayanMessage; copied: boolean; onCopy: () => void }) { const user = message.role === "user"; return <div className={`flex ${user ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${user ? "bg-black text-white" : "bg-zinc-100 text-zinc-800"}`}>{message.attachment_url ? <img src={message.attachment_url} alt="品牌查詢截圖" className="mb-3 max-h-[420px] w-full rounded-xl object-contain" /> : null}{message.content}{!user ? <button type="button" onClick={onCopy} className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "已複製" : "複製草稿"}</button> : null}</div></div>; }
function Loading({ label = "載入中…" }: { label?: string }) { return <div className="flex h-full min-h-24 items-center justify-center text-sm text-zinc-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{label}</div>; }

function Composer({ input, image, loading, enabled, hasDraft, feedbackMode, fileRef, onInput, onMode, onImage, onRemoveImage, onSend }: { input: string; image: ImageAttachment | null; loading: boolean; enabled: boolean; hasDraft: boolean; feedbackMode: FeedbackMode; fileRef: React.RefObject<HTMLInputElement | null>; onInput: (value: string) => void; onMode: (mode: FeedbackMode) => void; onImage: (file: File) => Promise<void>; onRemoveImage: () => void; onSend: () => void }) { return <div className="border-t bg-zinc-50 p-3" onPaste={(event) => { const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/")); if (file) void onImage(file); }}>{hasDraft ? <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-200 p-1 text-[11px]"><button type="button" onClick={() => onMode("project")} className={`rounded-lg px-2 py-2 font-medium ${feedbackMode === "project" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}>只修改今次草稿</button><button type="button" onClick={() => onMode("workspace_rule")} className={`rounded-lg px-2 py-2 font-medium ${feedbackMode === "workspace_rule" ? "bg-purple-700 text-white shadow-sm" : "text-zinc-500"}`}>儲存為商務規則</button></div> : null}{feedbackMode === "workspace_rule" ? <p className="mb-2 rounded-lg bg-purple-50 px-3 py-2 text-[11px] text-purple-800">呢段修改指示會套用到 Workspace 之後所有客戶，並保留版本。</p> : null}{image ? <div className="mb-2 flex items-center gap-3 rounded-xl border bg-white p-2"><img src={image.dataUrl} alt="查詢截圖預覽" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{image.name}</p><p className="text-xs text-zinc-400">AI 會閱讀呢張截圖</p></div><button type="button" onClick={onRemoveImage} aria-label="移除截圖"><X className="h-4 w-4" /></button></div> : null}<div className="flex items-end gap-2"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImage(file); event.currentTarget.value = ""; }} /><button type="button" onClick={() => fileRef.current?.click()} aria-label="上載查詢截圖" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white"><ImagePlus className="h-4 w-4" /></button><textarea value={input} onChange={(event) => onInput(event.target.value.slice(0, 8000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder={hasDraft ? "話俾 AI 知今次草稿要點改…" : "貼上完整 Email／DM／WhatsApp，或直接貼入截圖…"} rows={3} className="min-h-11 flex-1 resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-purple-300" /><button type="button" onClick={onSend} disabled={(!input.trim() && !image) || loading || !enabled} aria-label="整理查詢並生成回覆" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[11px] text-zinc-400">AI 只會草擬回覆，不會自動傳送、報價、接受合作或承諾檔期。</p></div>; }

async function compressImage(file: File): Promise<ImageAttachment> { const source = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(source.width, source.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale); canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height); source.close(); const dataUrl = canvas.toDataURL("image/jpeg", 0.82); if (dataUrl.length > 4_000_000) throw new Error("Compressed image too large"); return { dataUrl, mediaType: "image/jpeg", name: file.name || "查詢截圖.jpg" }; }
