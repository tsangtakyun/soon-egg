import { CalendarClock } from "lucide-react";
import { demoBrandMatches } from "@/lib/mock-data";

export default function ActiveDealsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">進行中合作</h1>
        <p className="mt-2 text-zinc-500">追蹤 pitch、合約、deliverables、deadline 和付款狀態。</p>
      </div>
      <div className="grid gap-4">
        {demoBrandMatches.slice(0, 4).map((match, index) => (
          <article key={match.brand.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-zinc-950">{match.brand.name_zh || match.brand.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{match.suggested_deliverable}</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
                <CalendarClock className="h-4 w-4" aria-hidden />
                {index === 0 ? "negotiating" : index === 1 ? "active" : "pitched"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
