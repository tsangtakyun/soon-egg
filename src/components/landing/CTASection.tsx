"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function CTASection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-[#0a0a0a] py-24 text-white sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-5xl font-black leading-tight sm:text-7xl">
          你的品牌合作之旅
          <br />
          由今日開始
        </h2>
        <p className="mt-6 text-lg text-zinc-400">免費加入 2,400+ 亞洲創作者的行列</p>
        <Link href="/signup" className="mt-10 inline-flex rounded-full bg-[#f5a623] px-9 py-4 text-base font-black text-[#0a0a0a] transition hover:-translate-y-0.5">
          免費開始 →
        </Link>
        <p className="mt-6 text-sm font-semibold text-zinc-500">不需要信用卡 · 2分鐘完成設定 · 隨時取消</p>
      </div>
    </section>
  );
}
