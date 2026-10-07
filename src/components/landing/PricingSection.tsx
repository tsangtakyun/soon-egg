"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import type { trialPreviewPolicy } from "@/lib/credits/policy";

export default function PricingSection({ trial }: { trial: ReturnType<typeof trialPreviewPolicy> }) {
  const ref = useScrollReveal();
  return <section className="relative overflow-hidden bg-[#faf6ef] py-24 sm:py-32">
    <div ref={ref} className="reveal relative mx-auto max-w-5xl px-6">
      <h2 className="text-center text-4xl font-black text-zinc-950">先試用，有需要才升級</h2>
      <p className="mt-4 text-center text-sm text-amber-800">Preview 規格 · 試用、扣點及購買尚未啟用</p>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-8">
          <h3 className="text-2xl font-black text-zinc-950">{trial.days} 日免信用卡試用</h3>
          <p className="mt-6 text-5xl font-black text-zinc-950">HK$0</p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-zinc-700">
            <li>{trial.credits} 試用 Credits（可調暫定額度）</li>
            <li>無需提供信用卡，不自動收費</li>
            <li>到期停止生成，仍可查看、編輯及下載</li>
            <li>試用與永久免費方案的關係待確認，不改現有用戶權益</li>
          </ul>
          <Link href="/credits" className="mt-8 block rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-bold text-zinc-950">查看試用規格</Link>
        </article>
        <article className="rounded-2xl border-2 border-amber-400 bg-white p-8">
          <h3 className="text-2xl font-black text-zinc-950">創作者版</h3>
          <p className="mt-6 text-5xl font-black text-zinc-950">HK$98 <span className="text-base text-zinc-500">／月</span></p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-zinc-700">
            <li>每個工作空間每月 150 Credits，團隊共用</li>
            <li>輕量 1／標準 3／重度生成 5 Credits</li>
            <li>字幕每分鐘 3 Credits，包含轉錄，按影片時長向上取整</li>
            <li>按訂閱週期重置，月額不累積</li>
          </ul>
          <Link href="/credits" className="mt-8 block rounded-full bg-zinc-950 px-6 py-3 text-center text-sm font-bold text-white">查看方案規格</Link>
        </article>
      </div>
      <p className="mt-6 text-center text-sm text-zinc-600">既有免費方案每月 30 Credits，香港時間每月 1 號重置。新工作空間錢包尚未配置。</p>
    </div>
  </section>;
}
