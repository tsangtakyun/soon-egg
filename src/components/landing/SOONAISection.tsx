"use client";

import { Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tags = ["品牌配對", "Pitch 起稿", "繁中溝通", "報價建議", "數據洞察", "24/7 待命", "趨勢發現", "談判支援", "創作者工具"];

export default function SOONAISection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-[#0a0a0a] py-28 text-white sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-4xl px-6 text-center">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,166,35,0.32),transparent_65%)] blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#f5a623]/40 bg-[#f5a623] text-3xl font-black text-[#0a0a0a] shadow-2xl shadow-[#f5a623]/20">
            S
          </div>
        </div>
        <div className="mt-8 text-sm font-black tracking-[0.28em] text-[#f5a623]">SOON AI</div>
        <h2 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
          認識 SOON AI
          <br />
          你的亞洲市場創作夥伴
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400">
          SOON AI 24/7 為你工作：分析數據、配對品牌、起草繁體中文 pitch、建議合理報價，並提供協作創作者的工具。賦權創作者，而非取代創作者。
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <span key={tag} className="shimmer-tag inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-white/10">
              <Sparkles size={14} className="text-[#f5a623]" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
