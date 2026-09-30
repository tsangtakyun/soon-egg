"use client";

import { useMemo, useState } from "react";
import { FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReplyProject } from "../tools/reply/ReplyClient";
import { QuoteAssistant } from "@/components/quotations/QuoteAssistant";

export function QuotationsClient({ projects, initialProjectId, canApprove }: { projects: ReplyProject[]; initialProjectId?: string; canApprove: boolean }) {
  const [projectId, setProjectId] = useState(initialProjectId || projects[0]?.id || "");
  const project = useMemo(() => projects.find((item) => item.id === projectId) ?? projects[0], [projectId, projects]);
  const riskCount = project?.brief.risks?.length ?? 0;

  if (!project) return <main className="p-5 lg:p-8"><header><h1 className="text-2xl font-black">報價管理</h1></header><section className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-2xl border bg-white p-8 text-center"><FileText className="mb-3 h-8 w-8 text-zinc-400" /><h2 className="font-bold">未有可報價項目</h2><p className="mt-2 max-w-md text-sm text-zinc-500">喺回覆中心建立洽談項目後，就可以整理報價草稿；客戶接受後先再標記「客戶已接受」。</p><Link href="/tools/reply" className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white">前往回覆中心</Link></section></main>;

  return <main className="p-5 lg:p-8">
    <header><h1 className="text-2xl font-black">報價管理</h1><p className="mt-1 text-sm text-zinc-500">洽談期間建立及批核報價；客戶接受後先確認合作。</p></header>
    <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-white p-3">
        <h2 className="px-2 pb-2 text-xs font-bold text-zinc-500">合作項目</h2>
        <div className="space-y-1">{projects.map((item) => <button key={item.id} type="button" onClick={() => setProjectId(item.id)} className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold ${item.id === project.id ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}>{item.name}</button>)}</div>
      </aside>
      <section className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><h2 className="font-bold text-zinc-950">{project.name}</h2><p className="mt-1 text-xs text-zinc-500">{project.brief.brand || "品牌未填寫"} · {project.brief.collaborationType || "合作形式未填寫"}</p></div>{riskCount ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-800"><ShieldAlert className="h-3.5 w-3.5" />商業風險 {riskCount} 項</span> : null}</div>
        <QuoteAssistant key={project.id} project={project} canApprove={canApprove} />
      </section>
    </div>
  </main>;
}
