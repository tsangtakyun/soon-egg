"use client";

import { useState } from "react";
import { Moon, Send, X } from "lucide-react";

interface MOONProps {
  context: "analytics" | "brand-deals" | "media-kit" | "general";
  creatorData?: unknown;
}

const QUICK_PROMPTS = {
  analytics: ["今週流量點解跌咗？", "邊條連結最多人click？", "點樣提升互動率？"],
  "brand-deals": ["我適合接咩品牌？", "幫我起稿 pitch", "今個月有咩好機會？"],
  "media-kit": ["幫我更新介紹", "點樣令 Media Kit 更吸引？"],
  general: ["我下一步應該做咩？", "點樣增加收入？"],
};

export function MOONAssistant({ context, creatorData }: MOONProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");

    const response = await fetch("/api/moon/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, context, creatorData }),
    });

    const data = await response.json();
    setMessages([...newMessages, { role: "assistant", content: data.reply ?? "MOON 暫時未能回覆，請稍後再試。" }]);
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="MOON AI 助理"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xl shadow-zinc-950/20 transition hover:-translate-y-0.5"
      >
        <Moon className="h-6 w-6" aria-hidden />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl sm:right-6 sm:w-96">
          <div className="flex items-center justify-between bg-zinc-950 p-4 text-white">
            <div>
              <h3 className="font-bold">MOON AI 助理</h3>
              <p className="text-xs text-white/60">你的亞洲創作者事業智囊</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} title="關閉" className="rounded-md p-1 hover:bg-white/10">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 p-3">
            {QUICK_PROMPTS[context]?.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition hover:bg-amber-100 hover:text-zinc-950">
                {prompt}
              </button>
            ))}
          </div>

          <div className="h-56 space-y-2 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`rounded-md p-2 text-sm ${msg.role === "user" ? "ml-8 bg-amber-50 text-zinc-900" : "mr-8 bg-zinc-100 text-zinc-800"}`}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="text-xs text-zinc-400">MOON 諗緊...</div>}
          </div>

          <div className="flex gap-2 border-t border-zinc-200 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage(input)}
              placeholder="問 MOON 任何問題..."
              className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
            />
            <button type="button" onClick={() => sendMessage(input)} title="送出" className="rounded-md bg-zinc-950 px-3 py-2 text-white">
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
