"use client";

import { useState } from "react";
import { ChevronRight, Send, Sparkles, X } from "lucide-react";

const QUICK_PROMPTS = [
  "我本週最大嘅成果係咩？",
  "幫我優化 Media Kit 吸引更多品牌",
  "我最強嘅平台係邊個？",
  "推薦我應該接咩類型品牌",
  "點樣提升我嘅互動率？",
];

type Message = {
  role: string;
  content: string;
};

export function SOONAIPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我係 SOON AI，你的亞洲市場創作夥伴。告訴我你想達成咩目標，我幫你規劃下一步。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setLoading(true);
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await fetch("/api/soon-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context: "dashboard" }),
      });
      const data = await response.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply || "請稍後再試。" }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "暫時無法連線，請稍後再試。" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600"
        aria-label="開啟 SOON AI"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-[320px] flex-col border-l border-gray-100 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON AI" className="h-8 w-8 object-contain" style={{ animation: "spin-slow 4s linear infinite" }} />
          <div>
            <p className="text-sm font-semibold text-gray-900">SOON AI</p>
            <p className="text-xs text-gray-400">你的創作夥伴</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 transition-colors hover:text-gray-600" aria-label="關閉 SOON AI">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`max-w-[90%] rounded-2xl p-3 text-sm ${
              msg.role === "user" ? "ml-auto rounded-br-sm bg-blue-500 text-white" : "rounded-bl-sm bg-gray-100 text-gray-800"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-gray-100 p-3 text-xs text-gray-500">
            SOON AI 思考中...
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="space-y-2 px-4 pb-2">
          <p className="text-xs font-medium text-gray-400">快速提問</p>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="group flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              <span>{prompt}</span>
              <ChevronRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-2">
        <p className="text-xs text-gray-400">
          每次對話消耗 <span className="font-semibold text-blue-500">3 credits</span>
        </p>
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && sendMessage(input)}
            placeholder="問 SOON AI 任何問題..."
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
            aria-label="送出訊息"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
