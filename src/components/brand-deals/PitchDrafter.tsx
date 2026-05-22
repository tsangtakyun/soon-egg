"use client";

import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { demoCreator } from "@/lib/mock-data";
import { ASIAN_BRANDS } from "@/lib/seed-brands";

export function PitchDrafter() {
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const response = await fetch("/api/brands/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator: demoCreator, brand: ASIAN_BRANDS[0], language: "zh-HK" }),
    });
    const data = await response.json();
    setPitch(data.pitch ?? "");
    setLoading(false);
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-zinc-950">AI Pitch 起稿</h2>
          <p className="mt-1 text-sm text-zinc-500">用 SOON-EGG 數據生成品牌合作電郵。</p>
        </div>
        <button type="button" onClick={generate} className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm text-white">
          <WandSparkles className="h-4 w-4" aria-hidden />
          {loading ? "生成中" : "生成"}
        </button>
      </div>
      <textarea
        value={pitch}
        onChange={(event) => setPitch(event.target.value)}
        placeholder="按生成後，MOON 會在這裡寫出 pitch 草稿。"
        className="mt-4 min-h-56 w-full rounded-md border border-zinc-200 p-3 text-sm leading-6 outline-none focus:border-zinc-950"
      />
    </section>
  );
}
