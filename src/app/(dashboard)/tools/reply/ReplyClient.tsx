"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageSquare, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";

export type MayanMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const quickPrompts = ["回覆品牌合作邀請", "禮貌提出合作報價", "跟進未回覆嘅品牌", "婉拒不合適合作"];

export function ReplyClient({ messages: initialMessages }: { messages: MayanMessage[] }) {
  const [messages, setMessages] = useState<MayanMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("brand");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("zh-HK");
  const [goal, setGoal] = useState("");
  const [saveHistory, setSaveHistory] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(nextInput = input) {
    if (!nextInput.trim() || loading) return;
    const userMsg: MayanMessage = { role: "user", content: nextInput, created_at: new Date().toISOString() };
    const history = messages.slice(-10);
    setMessages((current) => [...current, userMsg]);
    setInput("");
    setLoading(true);
    setLastSubmitted(nextInput);
    setError("");

    try {
      const res = await fetch("/api/tools/reply/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nextInput, history, mode, tone, language, goal, saveHistory }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) throw new Error(data.error ?? "請稍後再試");

      const assistantMsg: MayanMessage = {
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMsg]);
      if (data.warning) setError(data.warning);
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message !== userMsg));
      setInput(nextInput);
      setError(`Mayan 暫時回覆唔到：${sendError instanceof Error ? sendError.message : "請稍後再試"}`);
    } finally {
      setLoading(false);
    }
  }

  async function copyReply(content: string, index: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1800);
  }

  async function clearHistory() {
    if (!messages.length || !window.confirm("確定清空全部回覆記錄？")) return;
    setError("");
    try {
      const res = await fetch("/api/tools/reply/clear", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error ?? "清空失敗");
      setMessages([]);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "清空失敗，請稍後再試。");
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col px-4 py-5 sm:px-6 lg:h-screen lg:px-8 lg:py-6">
      <header className="mb-4 flex flex-col gap-4 rounded-2xl border bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl text-purple-700">🪬</div>
          <div>
            <h1 className="text-2xl font-black text-zinc-950">AI 回覆中心</h1>
            <p className="text-sm text-zinc-500">貼上品牌或粉絲訊息，按你嘅語氣起草可直接發送嘅回覆。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-xs text-zinc-500">SOON-EGG 原生工具 · 暫時免費</div>
          <button onClick={clearHistory} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50" type="button">
            <Trash2 className="h-3.5 w-3.5" />
            清空
          </button>
        </div>
      </header>

      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="mb-4 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3">
        <SelectField label="回覆類型" value={mode} onChange={setMode} options={[["brand", "品牌邀請"], ["negotiation", "報價／議價"], ["follow_up", "合作跟進"], ["decline", "婉拒合作"], ["fan", "粉絲留言／私訊"]]} />
        <SelectField label="語氣" value={tone} onChange={setTone} options={[["friendly", "親切"], ["professional", "專業"], ["concise", "簡潔"], ["firm", "堅定"]]} />
        <SelectField label="語言" value={language} onChange={setLanguage} options={[["zh-HK", "香港繁中"], ["zh-TW", "台灣繁中"], ["en", "English"]]} />
        <label className="sm:col-span-3"><span className="mb-1 block text-xs font-medium text-zinc-600">今次回覆目的（選填）</span><input value={goal} onChange={(event) => setGoal(event.target.value.slice(0, 500))} placeholder="例如：先了解預算，不承諾檔期" className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-purple-300" /></label>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-white p-5">
        {messages.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl">🪬</div>
            <h2 className="text-lg font-semibold text-zinc-950">今次想點樣回覆？</h2>
            <p className="mt-1 text-sm text-zinc-500">揀一個常用情境，或者直接貼上對方訊息。</p>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quickPrompts.map((prompt) => (
                <button key={prompt} onClick={() => setInput(`${prompt}：\n\n`)} className="rounded-xl border bg-white px-4 py-3 text-left text-sm text-zinc-600 hover:border-purple-200 hover:bg-purple-50" type="button">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatBubble key={message.id ?? `${message.role}-${index}-${message.created_at}`} message={message} copied={copiedIndex === index} onCopy={() => void copyReply(message.content, index)} />
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm">🪬</div>
                <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                  <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" />
                  Mayan 正在思考...
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </section>

      <footer className="mt-4 rounded-2xl border bg-white p-3">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="貼上對方訊息，或輸入你想回覆嘅內容…"
            rows={Math.min(5, Math.max(2, input.split("\n").length))}
            className="min-h-12 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-purple-300"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-white hover:bg-zinc-800 disabled:opacity-40" type="button">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={saveHistory} onChange={(event) => setSaveHistory(event.target.checked)} className="h-4 w-4" />儲存到目前 workspace 對話記錄</label><span>{input.length.toLocaleString()}/8,000</span></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1 text-xs text-zinc-400"><MessageSquare className="h-3.5 w-3.5" />訊息會傳送至 AI；請避免貼上密碼、身份證或付款資料。</p>{lastSubmitted && !loading ? <button type="button" onClick={() => void sendMessage(lastSubmitted)} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600"><RotateCcw className="h-3.5 w-3.5" />重新生成</button> : null}</div>
      </footer>
    </main>
  );
}

function ChatBubble({ message, copied, onCopy }: { message: MayanMessage; copied: boolean; onCopy: () => void }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm">🪬</div>}
      <div className={`group relative max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${isUser ? "bg-black text-white" : "bg-zinc-100 text-zinc-800"}`}>
        {message.content}{!isUser ? <button type="button" onClick={onCopy} className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "已複製" : "複製回覆"}</button> : null}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label><span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-purple-300">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
