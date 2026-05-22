"use client";

import Link from "next/link";
import { CountUp } from "./CountUp";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function HeroSection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-[#fafafa] py-20 sm:py-28">
      <div ref={ref} className="reveal mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="inline-flex rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 px-4 py-2 text-sm font-bold text-[#9a6200]">✦ 亞洲創作者專屬平台</div>
          <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight text-[#0a0a0a] sm:text-7xl">
            搵品牌合作
            <br />
            就係咁簡單
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            MOON AI 幫你配對香港、台灣、新加坡品牌，自動生成繁體中文 pitch，讓你專注創作。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-full bg-[#0a0a0a] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5">
              免費開始
            </Link>
            <Link href="/soon_egg" className="rounded-full border border-black/15 px-7 py-3.5 text-sm font-bold text-[#0a0a0a] transition hover:border-black">
              睇示範 →
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold text-zinc-700">
            <span className="text-[#f5a623]">★★★★★</span>
            <span>已有 2,400+ 亞洲創作者使用</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="phone-mockup mx-auto h-[580px] w-[280px] overflow-hidden rounded-[2.5rem] border-4 border-black bg-white shadow-2xl">
            <div className="flex h-full flex-col items-center bg-[linear-gradient(145deg,#ff8f70,#f5a623_48%,#0a0a0a)] px-6 py-10 text-center text-white">
              <div className="h-24 w-24 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7d6,#f5a623_45%,#0a0a0a)] shadow-xl" />
              <div className="mt-5 text-xl font-black">Chloe @chloe.hk</div>
              <div className="mt-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">128K followers</div>
              <div className="mt-8 w-full space-y-3">
                {["最新咖啡店地圖 🗺️", "Creator Media Kit 模板", "品牌合作查詢"].map((item) => (
                  <div key={item} className="rounded-full bg-[#0a0a0a] px-5 py-4 text-sm font-bold shadow-lg">{item}</div>
                ))}
              </div>
              <div className="mt-auto text-xs font-semibold opacity-70">Powered by SOON-EGG</div>
            </div>
          </div>

          <div className="absolute -right-3 top-14 hidden w-52 rounded-2xl bg-white p-4 shadow-2xl sm:block">
            <div className="text-sm font-black text-[#0a0a0a]">🤝 品牌合作邀請</div>
            <p className="mt-1 text-xs text-zinc-500">卓悅 wants to collab</p>
            <button className="mt-3 rounded-full bg-[#0a0a0a] px-4 py-1.5 text-xs font-bold text-white">查看</button>
          </div>
          <div className="absolute -left-4 bottom-16 hidden w-52 rounded-2xl bg-[#0a0a0a] p-4 text-white shadow-2xl sm:block">
            <div className="text-sm font-bold text-white/70">💰 本月收入</div>
            <div className="mt-2 font-mono text-2xl font-black"><CountUp end={18400} prefix="HK$" /></div>
            <div className="mt-1 text-xs font-bold text-[#00c853]">↑ +34% vs last month</div>
          </div>
          <div className="absolute -left-2 top-8 hidden rounded-2xl bg-white px-4 py-3 shadow-xl sm:block">
            <div className="text-xs font-bold text-zinc-500">📊 今日流量</div>
            <div className="mt-1 font-mono text-lg font-black text-[#0a0a0a]">3,241 views</div>
          </div>
        </div>
      </div>
    </section>
  );
}
