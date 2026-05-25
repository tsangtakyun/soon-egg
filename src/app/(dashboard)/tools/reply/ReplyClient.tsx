"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, Trash2 } from "lucide-react";

export type MayanMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const quickPrompts = ["幫我回覆一個品牌合作邀請", "幫我寫一個 IG caption", "幫我回覆粉絲留言", "幫我優化呢段文字"];

export function ReplyClient({ messages: initialMessages, balance: initialBalance }: { messages: MayanMessage[]; balance: number; userEmail: string }) {
  const [messages, setMessages] = useState<MayanMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
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

    const res = await fetch("/api/tools/reply/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: nextInput, history }),
    });
    const data = await res.json();

    if (data.error === "Insufficient credits") {
      window.location.href = "/credits?insufficient=tools";
      return;
    }

    if (!res.ok) {
      alert(`Mayan 暫時回覆唔到：${data.error ?? "請稍後再試"}`);
      setLoading(false);
      return;
    }

    const assistantMsg: MayanMessage = {
      role: "assistant",
      content: data.reply,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, assistantMsg]);
    if (typeof data.balance === "number") setBalance(data.balance);
    setLoading(false);
  }

  async function clearHistory() {
    const res = await fetch("/api/tools/reply/clear", { method: "POST" });
    const data = await res.json();
    if (data.success) setMessages([]);
  }

  return (
    <main className="flex h-[calc(100vh-1px)] flex-col pt-[6vh]">
      <header className="mb-4 flex flex-col gap-4 rounded-2xl border bg-white p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-xl text-purple-700">🪬</div>
          <div>
            <h1 className="text-2xl font-black text-zinc-950">Mayan</h1>
            <p className="text-sm text-zinc-500">你的亞洲市場創作夥伴</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            目前餘額 <span className="font-semibold text-zinc-950">{balance.toLocaleString()}</span> credits
          </div>
          <button onClick={clearHistory} className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50" type="button">
            <Trash2 className="h-3.5 w-3.5" />
            清空
          </button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-white p-5">
        {messages.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl">🪬</div>
            <h2 className="text-lg font-semibold text-zinc-950">想 Mayan 幫你做啲咩？</h2>
            <p className="mt-1 text-sm text-zinc-500">揀一個開場，或者直接輸入你的問題。</p>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quickPrompts.map((prompt) => (
                <button key={prompt} onClick={() => sendMessage(prompt)} className="rounded-xl border bg-white px-4 py-3 text-left text-sm text-zinc-600 hover:border-purple-200 hover:bg-purple-50" type="button">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatBubble key={message.id ?? `${message.role}-${index}-${message.created_at}`} message={message} />
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
            placeholder="問 Mayan 任何問題..."
            rows={Math.min(5, Math.max(2, input.split("\n").length))}
            className="min-h-12 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-purple-300"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-white hover:bg-zinc-800 disabled:opacity-40" type="button">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
          <MessageSquare className="h-3.5 w-3.5" /> 每次 AI 回覆扣 3 credits
        </p>
      </footer>
    </main>
  );
}

function ChatBubble({ message }: { message: MayanMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm">🪬</div>}
      <div className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? "bg-black text-white" : "bg-zinc-100 text-zinc-800"}`}>
        {message.content}
      </div>
    </div>
  );
}
