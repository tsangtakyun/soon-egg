"use client";

import { type ElementType } from "react";
import { useRouter } from "next/navigation";
import { Bot, CalendarDays, ClipboardList, Lightbulb, MessageCircleReply, PenLine } from "lucide-react";

type Tool = {
  title: string;
  subtitle: string;
  href: string;
  icon: ElementType;
  costLabel: string;
};

const tools: Tool[] = [
  { title: "題材庫", subtitle: "IG Idea", href: "/tools/idea-library", icon: Lightbulb, costLabel: "免費使用" },
  { title: "劇本生成", subtitle: "Script", href: "/tools/script-generator", icon: PenLine, costLabel: "免費使用" },
  { title: "工作板", subtitle: "Work Board", href: "/tools/work-board", icon: ClipboardList, costLabel: "免費使用" },
  { title: "日程", subtitle: "Schedule", href: "/tools/schedule", icon: CalendarDays, costLabel: "免費使用" },
  { title: "回覆中心", subtitle: "Reply Centre", href: "/tools/reply-centre", icon: MessageCircleReply, costLabel: "免費使用" },
  { title: "SOON AI", subtitle: "AI Assistant", href: "/tools/soon-ai", icon: Bot, costLabel: "10 Credits / 次生成" },
];

export function ToolsHub() {
  const router = useRouter();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.href}
            type="button"
            onClick={() => router.push(tool.href)}
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
            <p className="mt-5 text-sm font-semibold text-zinc-700">進入工具 →</p>
          </button>
        );
      })}
    </div>
  );
}
