"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

const cards = [
  {
    icon: "🎨",
    title: "自訂你的主頁",
    subtitle: "令你的品牌令人難忘",
    body: "幾分鐘內建立完全個人化的 Link in Bio 或完整網站，5款亞洲風格主題即時預覽。",
  },
  {
    icon: "📬",
    title: "擁有你的受眾",
    subtitle: "唔好再靠算法",
    body: "建立訂閱者名單、發送電郵、自動回覆留言，把粉絲變成付費客戶。",
  },
];

export default function OneDoneSection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-[#f4f1ec] py-24 sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-7xl px-6">
        <div className="text-sm font-black tracking-[0.28em] text-[#9a6200]">ONE AND DONE</div>
        <h2 className="mt-4 text-4xl font-black text-[#0a0a0a] sm:text-6xl">一個平台，管理所有事</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <article key={card.title} className="rounded-2xl bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl">{card.icon}</div>
              <h3 className="mt-6 text-2xl font-black text-[#0a0a0a]">{card.title}</h3>
              <p className="mt-2 text-sm font-bold text-[#f5a623]">{card.subtitle}</p>
              <p className="mt-5 max-w-xl text-base leading-8 text-zinc-600">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
