"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

const tags = ["品牌配對", "Pitch 起稿", "繁中溝通", "報價建議", "數據洞察", "24/7 待命", "趨勢發現", "談判支援"];

export default function MOONSection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-[#0a0a0a] py-28 text-white sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-4xl px-6 text-center">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,166,35,0.32),transparent_65%)] blur-xl" />
          <svg viewBox="0 0 120 120" className="relative h-28 w-28" aria-label="MOON AI">
            <circle cx="60" cy="60" r="44" fill="#f5a623" />
            <circle cx="78" cy="50" r="38" fill="#0a0a0a" />
            <circle cx="50" cy="54" r="3" fill="#0a0a0a" />
            <circle cx="63" cy="54" r="3" fill="#0a0a0a" />
            <path d="M49 70c7 7 17 7 24 0" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className="mt-8 text-sm font-black tracking-[0.28em] text-[#f5a623]">MOON AI</div>
        <h2 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
          認識 MOON
          <br />
          你的亞洲市場 AI 隊友
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-400">
          MOON 24/7 為你工作：分析數據、配對品牌、起草繁體中文 pitch、建議合理報價。賦權創作者，而非取代創作者。
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <span key={tag} className="shimmer-tag rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-white/10">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
