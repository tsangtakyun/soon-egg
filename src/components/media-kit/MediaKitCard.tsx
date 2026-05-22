import { demoCreator } from "@/lib/mock-data";
import { StatsDisplay } from "./StatsDisplay";

export function MediaKitCard() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Media Kit</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">{demoCreator.display_name}</h1>
          <p className="mt-3 max-w-2xl text-zinc-600">{demoCreator.ai_profile_summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {demoCreator.content_categories.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">{tag}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-950 px-4 py-3 text-white">
          <div className="text-xs text-white/60">合作報價由</div>
          <div className="font-mono text-2xl font-semibold">HK$6K-18K</div>
        </div>
      </div>
      <div className="mt-6">
        <StatsDisplay
          stats={[
            { label: "Total Reach", value: "103.5K", note: "IG + YT + XHS + TikTok" },
            { label: "IG Engagement", value: "5.8%", note: "近 30 日平均" },
            { label: "Avg Views", value: "8.8K", note: "YouTube Shorts" },
          ]}
        />
      </div>
    </section>
  );
}
