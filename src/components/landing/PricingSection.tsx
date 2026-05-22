"use client";

import Link from "next/link";
import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const freeFeatures = [
  ["✓", "Link in Bio 主頁"],
  ["✓", "基礎 Media Kit"],
  ["✓", "每月 3 個品牌配對"],
  ["✓", "30 AI Credits / 日"],
  ["✓", "1 個數位產品"],
  ["✗", "交易佣金 9%"],
  ["✗", "自訂域名"],
  ["✗", "無限電郵發送"],
];

const creatorFeatures = [
  ["✓", "全部免費功能"],
  ["✓", "0% 交易佣金", true],
  ["✓", "無限品牌配對"],
  ["✓", "MOON AI 無限對話"],
  ["✓", "自動更新 Media Kit"],
  ["✓", "自訂域名"],
  ["✓", "無限電郵發送"],
  ["✓", "Email 自動化"],
  ["✓", "Buy Now Pay Later"],
];

export default function PricingSection() {
  const ref = useScrollReveal();
  const [annual, setAnnual] = useState(false);
  const creatorPrice = annual ? 78 : 98;

  return (
    <section className="bg-[#f4f1ec] py-24 sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-7xl px-6">
        <div className="text-center">
          <div className="text-sm font-black tracking-[0.28em] text-[#9a6200]">定價</div>
          <h2 className="mt-4 text-4xl font-black text-[#0a0a0a] sm:text-6xl">免費開始，有需要才升級</h2>
          <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-sm">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-5 py-2 text-sm font-bold ${!annual ? "bg-[#0a0a0a] text-white" : "text-zinc-600"}`}>月費</button>
            <button onClick={() => setAnnual(true)} className={`rounded-full px-5 py-2 text-sm font-bold ${annual ? "bg-[#0a0a0a] text-white" : "text-zinc-600"}`}>年費 8折</button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
          <article className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#0a0a0a]">免費版</h3>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">永久免費</span>
            </div>
            <div className="mt-6 font-mono text-5xl font-black text-[#0a0a0a]">HK$0 <span className="text-base font-bold text-zinc-500">/ 月</span></div>
            <ul className="mt-8 space-y-3 text-sm text-zinc-700">
              {freeFeatures.map(([mark, text]) => <Feature key={text as string} mark={mark as string} text={text as string} />)}
            </ul>
            <Link href="/signup" className="mt-8 block rounded-full border border-black/20 px-6 py-3 text-center text-sm font-black text-[#0a0a0a]">免費開始</Link>
          </article>

          <article className="relative rounded-2xl border-2 border-[#f5a623] bg-white p-8 shadow-xl">
            <div className="absolute -top-4 right-8 rounded-full bg-[#f5a623] px-4 py-1.5 text-xs font-black text-[#0a0a0a]">🌟 推薦</div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#0a0a0a]">創作者版</h3>
              <span className="rounded-full bg-[#00c853]/10 px-3 py-1 text-xs font-black text-[#008b3a]">多賺 30% 收入</span>
            </div>
            <div className="mt-6 font-mono text-5xl font-black text-[#0a0a0a]">HK${creatorPrice} <span className="text-base font-bold text-zinc-500">/ 月</span></div>
            <ul className="mt-8 space-y-3 text-sm text-zinc-700">
              {creatorFeatures.map(([mark, text, bold]) => <Feature key={text as string} mark={mark as string} text={text as string} bold={Boolean(bold)} />)}
            </ul>
            <Link href="/signup" className="mt-8 block rounded-full bg-[#0a0a0a] px-6 py-3 text-center text-sm font-black text-white">立即升級</Link>
          </article>
        </div>
        <p className="mt-10 text-center text-sm italic text-zinc-500">最有野心的亞洲創作者都選擇 SOON-EGG。你都會。</p>
      </div>
    </section>
  );
}

function Feature({ mark, text, bold = false }: { mark: string; text: string; bold?: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={mark === "✓" ? "font-black text-[#00c853]" : "font-black text-zinc-300"}>{mark}</span>
      <span className={bold ? "font-black text-[#0a0a0a]" : ""}>{text}</span>
    </li>
  );
}
