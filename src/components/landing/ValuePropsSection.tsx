"use client";

import { DollarSign, Handshake, ShoppingBag } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const props = [
  { icon: ShoppingBag, title: "推動銷售", body: "直接在 Link in Bio 賣數位產品、課程、預約、聯盟連結。最快一日內收款。" },
  { icon: DollarSign, title: "獲得報酬", body: "把聯盟佣金升級為正式品牌合作。直接 pitch 亞洲品牌，用 Media Kit 談到理想價錢。" },
  { icon: Handshake, title: "品牌合作", body: "SOON AI 幫你搵品牌、評估合適度、生成廣東話 pitch，令你的收件箱變成合作機會。" },
];

export default function ValuePropsSection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-white py-24 sm:py-32">
      <div ref={ref} className="reveal mx-auto max-w-7xl px-6">
        <div className="text-sm font-black tracking-[0.28em] text-[#9a6200]">三種變現方式</div>
        <h2 className="mt-4 text-4xl font-black text-[#0a0a0a] sm:text-6xl">你的收入，你話事</h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {props.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-black/10 bg-[#fafafa] p-7">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5a623]/15">
                  <Icon size={24} className="text-[#f5a623]" />
                </div>
                <h3 className="mt-7 text-2xl font-black text-[#0a0a0a]">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-zinc-600">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
