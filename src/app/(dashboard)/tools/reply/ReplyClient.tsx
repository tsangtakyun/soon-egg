"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Folder, ImagePlus, Loader2, Plus, RotateCcw, Send, Settings2, X } from "lucide-react";

export type MayanMessage = { id?: string; role: "user" | "assistant"; content: string; created_at: string };
type ReplyProject = { id: string; name: string; notes: string; tone: string; language: string; updated_at: string };
type ImageAttachment = { dataUrl: string; mediaType: "image/jpeg"; name: string };
const tones = [["friendly", "親切"], ["professional", "專業"], ["concise", "簡潔"], ["firm", "堅定"]];
const languages = [["zh-HK", "香港繁中"], ["zh-TW", "台灣繁中"], ["en", "English"]];

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
  const [lastSubmitted, setLastSubmitted] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"projects" | "messages" | "ai">("messages");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function selectProject(projectId: string) {
    if (projectId === activeId || switching) return;
    setSwitching(true); setError(""); setImage(null);
    try {
      const response = await fetch(`/api/tools/reply/projects?projectId=${encodeURIComponent(projectId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "讀取失敗");
      setActiveId(projectId); setMessages(data.messages ?? []); setMobilePanel("messages");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "讀取 Project 失敗。"); }
    finally { setSwitching(false); }
  }

  async function createProject() {
    const name = newProjectName.trim();
    if (!name) return;
    setError("");
    const response = await fetch("/api/tools/reply/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.project) { setError(data.error ?? "建立 Project 失敗。"); return; }
    setProjects((current) => [data.project, ...current]); setActiveId(data.project.id); setMessages([]); setNewProjectName(""); setShowNewProject(false); setMobilePanel("messages");
  }

  async function saveProject(update: Partial<ReplyProject>) {
    if (!activeProject) return;
    const next = { ...activeProject, ...update };
    setProjects((current) => current.map((project) => project.id === activeProject.id ? next : project));
    const response = await fetch("/api/tools/reply/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: next.id, notes: next.notes, tone: next.tone, language: next.language }) });
    if (!response.ok) setError("Project 設定暫時未能儲存。");
  }

  async function prepareImage(file: File) {
    if (!file.type.startsWith("image/")) { setError("請選擇 JPG、PNG 或 WebP 圖片。"); return; }
    if (file.size > 12 * 1024 * 1024) { setError("圖片太大，請選擇 12MB 以下圖片。"); return; }
    try { setImage(await compressImage(file)); setError(""); } catch { setError("圖片太大或暫時未能讀取，請重新選擇。"); }
  }

  async function sendMessage(nextInput = input) {
    const cleanInput = nextInput.trim() || (image ? "請閱讀截圖內容，幫我草擬合適回覆。" : "");
    if (!cleanInput || loading || !activeProject) return;
    const userMsg: MayanMessage = { role: "user", content: image ? `${cleanInput}\n\n[已附上截圖]` : cleanInput, created_at: new Date().toISOString() };
    const history = messages.slice(-10); const sentImage = image;
    setMessages((current) => [...current, userMsg]); setInput(""); setImage(null); setLoading(true); setLastSubmitted(cleanInput); setError("");
    try {
      const response = await fetch("/api/tools/reply/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: cleanInput, history, projectId: activeProject.id, tone: activeProject.tone, language: activeProject.language, projectNotes: activeProject.notes, image: sentImage ? { data: sentImage.dataUrl.split(",")[1], mediaType: sentImage.mediaType } : undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reply) throw new Error(data.error ?? "請稍後再試");
      setMessages((current) => [...current, { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
      if (data.warning) setError(data.warning);
    } catch (cause) {
      setMessages((current) => current.filter((message) => message !== userMsg)); setInput(cleanInput); setImage(sentImage);
      setError(`AI 暫時回覆唔到：${cause instanceof Error ? cause.message : "請稍後再試"}`);
    } finally { setLoading(false); }
  }

  async function clearHistory() {
    if (!messages.length || !activeProject || !window.confirm(`確定清空「${activeProject.name}」對話記錄？`)) return;
    const response = await fetch("/api/tools/reply/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: activeProject.id }) });
    if (response.ok) setMessages([]); else setError("清空失敗，請稍後再試。");
  }

  return <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-zinc-100 p-3 sm:p-5 lg:h-screen lg:min-h-0">
    <header className="mb-3 flex items-center justify-between rounded-2xl border bg-white px-4 py-3"><div><h1 className="text-xl font-black text-zinc-950">AI 回覆工作台</h1><p className="text-xs text-zinc-500">按 Project 整理對話，貼上截圖即時生成回覆。</p></div><span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">暫時免費</span></header>
    {error ? <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
    <div className="mb-3 grid grid-cols-3 rounded-xl border bg-white p-1 lg:hidden">{([["projects", "Projects"], ["messages", "對話"], ["ai", "AI 設定"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMobilePanel(value)} className={`rounded-lg px-2 py-2 text-xs font-medium ${mobilePanel === value ? "bg-black text-white" : "text-zinc-500"}`}>{label}</button>)}</div>
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(360px,1fr)_300px]">
      <aside className={`${mobilePanel === "projects" ? "flex" : "hidden"} min-h-0 flex-col rounded-2xl border bg-zinc-900 p-3 text-white lg:flex`}>
        <div className="mb-3 flex items-center justify-between px-2"><span className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4" />Projects</span><button type="button" onClick={() => setShowNewProject((value) => !value)} aria-label="建立新 Project" className="rounded-lg p-1.5 hover:bg-white/10"><Plus className="h-4 w-4" /></button></div>
        {showNewProject ? <form onSubmit={(event) => { event.preventDefault(); void createProject(); }} className="mb-2 flex gap-1"><input autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value.slice(0, 80))} placeholder="Project／人名" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-400" /><button type="submit" disabled={!newProjectName.trim()} className="rounded-lg bg-white px-2 text-xs font-semibold text-black disabled:opacity-40">加入</button></form> : null}
        <div className="space-y-1 overflow-y-auto">{projects.map((project) => <button key={project.id} type="button" onClick={() => void selectProject(project.id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${project.id === activeProject?.id ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10"}`}>{project.name}</button>)}</div>
        {!projects.length ? <p className="px-2 py-6 text-center text-xs text-zinc-400">建立第一個 Project 開始。</p> : null}
      </aside>
      <section className={`${mobilePanel === "messages" ? "flex" : "hidden"} min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border bg-white lg:flex lg:min-h-0`}>
        <div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="font-semibold text-zinc-950">{activeProject?.name ?? "未選擇 Project"}</h2><p className="text-xs text-zinc-400">每個 Project 有獨立對話記錄</p></div><button type="button" onClick={() => void clearHistory()} className="text-xs text-zinc-400 hover:text-red-600">清空對話</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{switching ? <div className="flex h-full items-center justify-center text-zinc-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />載入中</div> : messages.length ? <div className="space-y-4">{messages.map((message, index) => <ChatBubble key={message.id ?? `${message.role}-${index}-${message.created_at}`} message={message} copied={copiedIndex === index} onCopy={async () => { await navigator.clipboard.writeText(message.content); setCopiedIndex(index); window.setTimeout(() => setCopiedIndex(null), 1800); }} />)}{loading ? <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />AI 正在閱讀及起草…</div> : null}<div ref={scrollRef} /></div> : <EmptyState onTemplate={setInput} />}</div>
        <div className="border-t bg-zinc-50 p-3" onPaste={(event) => { const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/")); if (file) void prepareImage(file); }}>
          {image ? <div className="mb-2 flex items-center gap-3 rounded-xl border bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- transient local data URL preview */}
            <img src={image.dataUrl} alt="待分析截圖預覽" className="h-16 w-16 rounded-lg object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{image.name}</p><p className="text-xs text-zinc-400">AI 會閱讀呢張截圖</p></div><button type="button" onClick={() => setImage(null)} aria-label="移除截圖"><X className="h-4 w-4" /></button>
          </div> : null}
          <div className="flex items-end gap-2"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void prepareImage(file); event.currentTarget.value = ""; }} /><button type="button" onClick={() => fileRef.current?.click()} aria-label="上載訊息截圖" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white hover:bg-zinc-100"><ImagePlus className="h-4 w-4" /></button><textarea value={input} onChange={(event) => setInput(event.target.value.slice(0, 8000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="貼上對方訊息，或者直接貼入／上載截圖…" rows={2} className="min-h-11 flex-1 resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-purple-300" /><button type="button" onClick={() => void sendMessage()} disabled={(!input.trim() && !image) || loading || !activeProject} aria-label="生成回覆" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400"><span>避免上載密碼、身份證或付款資料</span>{lastSubmitted && !loading ? <button type="button" onClick={() => void sendMessage(lastSubmitted)} className="flex items-center gap-1 text-purple-600"><RotateCcw className="h-3 w-3" />重新生成</button> : null}</div>
        </div>
      </section>
      <aside className={`${mobilePanel === "ai" ? "flex" : "hidden"} min-h-0 flex-col rounded-2xl border bg-white p-4 lg:flex`}>
        <div className="mb-5 flex items-center gap-2"><Settings2 className="h-4 w-4" /><h2 className="font-semibold">AI 回覆設定</h2></div>
        {activeProject ? <div className="space-y-4"><SelectField label="語氣" value={activeProject.tone} onChange={(value) => void saveProject({ tone: value })} options={tones} /><SelectField label="語言" value={activeProject.language} onChange={(value) => void saveProject({ language: value })} options={languages} /><label className="block"><span className="mb-1.5 block text-xs font-medium text-zinc-600">Project 背景／注意事項</span><textarea value={activeProject.notes} onChange={(event) => setProjects((current) => current.map((project) => project.id === activeProject.id ? { ...project, notes: event.target.value.slice(0, 2000) } : project))} onBlur={(event) => void saveProject({ notes: event.target.value })} rows={8} placeholder="例如：合作內容、報價原則、對方稱呼、唔可以承諾嘅事項…" className="w-full resize-none rounded-xl border px-3 py-2 text-sm leading-6 outline-none focus:border-purple-300" /></label><div className="rounded-xl bg-purple-50 p-3 text-xs leading-5 text-purple-800"><p className="font-semibold">截圖回覆流程</p><p className="mt-1">上載 WhatsApp、IG 或 Email 截圖，AI 會結合呢個 Project 背景草擬回覆。</p></div></div> : <p className="text-sm text-zinc-400">先建立或選擇 Project。</p>}
      </aside>
    </div>
  </main>;
}

function EmptyState({ onTemplate }: { onTemplate: (value: string) => void }) { return <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl">🪬</div><h3 className="font-semibold">貼入截圖，AI 幫你回覆</h3><p className="mt-1 max-w-sm text-sm text-zinc-500">可以直接貼 WhatsApp、Instagram 或 Email 截圖，亦可以先輸入文字。</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["幫我回覆品牌合作邀請：", "禮貌提出合作報價：", "跟進未回覆嘅品牌："].map((item) => <button key={item} type="button" onClick={() => onTemplate(`${item}\n\n`)} className="rounded-full border px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50">{item.slice(0, -1)}</button>)}</div></div>; }
function ChatBubble({ message, copied, onCopy }: { message: MayanMessage; copied: boolean; onCopy: () => void }) { const isUser = message.role === "user"; return <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? "bg-black text-white" : "bg-zinc-100 text-zinc-800"}`}>{message.content}{!isUser ? <button type="button" onClick={onCopy} className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "已複製" : "複製回覆"}</button> : null}</div></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-purple-300">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
async function compressImage(file: File): Promise<ImageAttachment> { const source = await createImageBitmap(file); const scale = Math.min(1, 1600 / Math.max(source.width, source.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale); canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height); source.close(); const dataUrl = canvas.toDataURL("image/jpeg", 0.82); if (dataUrl.length > 4_000_000) throw new Error("Compressed image too large"); return { dataUrl, mediaType: "image/jpeg", name: file.name || "訊息截圖.jpg" }; }
