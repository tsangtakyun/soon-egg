"use client";

import { useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { Bot, CalendarDays, ClipboardList, Lightbulb, MessageCircleReply, PenLine } from "lucide-react";
import { InsufficientCreditsModal } from "@/components/credits/InsufficientCreditsModal";

type Tool = {
  title: string;
  subtitle: string;
  href: string;
  icon: ElementType;
  costLabel: string;
  action: "tool_enter" | "ai_generate";
};

const tools: Tool[] = [
  { title: "題材庫", subtitle: "IG Idea", href: "/tools/idea-library", icon: Lightbulb, costLabel: "10 Credits", action: "tool_enter" },
  { title: "劇本生成", subtitle: "Script", href: "/tools/script-generator", icon: PenLine, costLabel: "10 Credits", action: "tool_enter" },
  { title: "工作板", subtitle: "Work Board", href: "/tools/work-board", icon: ClipboardList, costLabel: "10 Credits", action: "tool_enter" },
  { title: "日程", subtitle: "Schedule", href: "/tools/schedule", icon: CalendarDays, costLabel: "10 Credits", action: "tool_enter" },
  { title: "回覆中心", subtitle: "Reply Centre", href: "/tools/reply-centre", icon: MessageCircleReply, costLabel: "10 Credits", action: "tool_enter" },
  { title: "SOON AI", subtitle: "AI Assistant", href: "/tools/soon-ai", icon: Bot, costLabel: "3 Credits/次", action: "ai_generate" },
];

export function ToolsHub() {
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [insufficient, setInsufficient] = useState<{ balance: number; required: number } | null>(null);

  async function enterTool(tool: Tool) {
    if (loadingHref) return;
    setLoadingHref(tool.href);

    try {
      const response = await fetch("/api/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tool.action,
          description: `Enter ${tool.title}`,
        }),
      });
      const payload = await response.json();

      if (!response.ok && payload?.error === "insufficient_credits") {
        setInsufficient({ balance: payload.balance ?? 0, required: payload.required ?? (tool.action === "ai_generate" ? 3 : 10) });
        return;
      }

      if (!response.ok) throw new Error(payload?.error || "deduct_failed");
      router.push(tool.href);
    } finally {
      setLoadingHref(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const loading = loadingHref === tool.href;
          return (
            <button
              key={tool.href}
              type="button"
              onClick={() => enterTool(tool)}
              className="group rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 text-zinc-800 transition group-hover:bg-amber-50 group-hover:text-amber-700">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{tool.costLabel}</span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-zinc-950">{tool.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{tool.subtitle}</p>
              <p className="mt-5 text-sm font-semibold text-zinc-700">{loading ? "正在扣除 Credits..." : "進入工具 →"}</p>
            </button>
          );
        })}
      </div>

      {insufficient ? (
        <InsufficientCreditsModal
          balance={insufficient.balance}
          required={insufficient.required}
          onClose={() => setInsufficient(null)}
        />
      ) : null}
    </>
  );
}
