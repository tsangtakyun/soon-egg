"use client";

import { Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tags = ["品牌配對", "Pitch 起稿", "繁中溝通", "報價建議", "數據洞察", "24/7 待命", "趨勢發現", "談判支援", "創作者工具"];

export default function SOONAISection() {
  const ref = useScrollReveal();

  return (
    <section
      className="relative overflow-hidden py-28 sm:py-32"
      style={{
        backgroundImage: "url(/hero-bg.jpg)",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-white/20" />
      <div ref={ref} className="reveal relative z-10 mx-auto max-w-4xl px-6 text-center">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.78),transparent_65%)] blur-xl" />
          <svg className="relative h-24 w-24 drop-shadow-2xl" viewBox="0 0 96 96" role="img" aria-label="SOON AI moon">
            <path d="M62 12C45 17 32 32 32 50c0 18 13 33 30 38-5 3-11 5-18 5C21 93 3 75 3 52S21 11 44 11c7 0 13 2 18 5Z" fill="#f5a623" />
          </svg>
        </div>
        <div className="mt-8 text-sm font-black tracking-[0.28em] text-blue-600">SOON AI</div>
        <h2 className="mt-4 text-4xl font-black leading-tight text-gray-900 sm:text-6xl">
          認識 SOON AI
          <br />
          你的亞洲市場創作夥伴
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-700">
          SOON AI 24/7 為你工作：分析數據、配對品牌、起草繁體中文 pitch、建議合理報價，並提供協作創作者的工具。賦權創作者，而非取代創作者。
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {tags.map((tag) => (
            <span key={tag} className="shimmer-tag inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-gray-800 shadow-sm ring-1 ring-white/70">
              <Sparkles size={14} className="text-blue-600" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
