import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf9f7] px-5 py-10 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#6f3025]">← 返回 SOON-EGG</Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">{summary}</p>
        <p className="mt-3 text-xs text-zinc-400">最後更新：2026 年 9 月 3 日</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-700 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-950 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <nav className="mt-10 flex flex-wrap gap-4 border-t pt-6 text-sm text-zinc-500">
          <Link href="/privacy">私隱政策</Link><Link href="/terms">使用條款</Link><Link href="/data-deletion">資料刪除</Link><Link href="/contact">聯絡我們</Link>
        </nav>
      </article>
    </main>
  );
}
