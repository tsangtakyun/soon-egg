import { BadgeCheck, MapPin } from "lucide-react";
import type { Brand } from "@/lib/types";
import { MatchScore } from "./MatchScore";

export function BrandCard({ brand, score, reason }: { brand: Brand; score?: number; reason?: string }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
            {(brand.name_zh || brand.name).slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-1 font-semibold text-zinc-950">
              {brand.name_zh || brand.name}
              {brand.is_verified && <BadgeCheck className="h-4 w-4 text-sky-500" aria-hidden />}
            </div>
            <div className="text-sm text-zinc-500">{brand.name}</div>
          </div>
        </div>
        {score ? <MatchScore score={score} /> : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="rounded-full bg-zinc-100 px-2 py-1">{brand.category}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1">
          <MapPin className="h-3 w-3" aria-hidden />
          {brand.region.join(" / ")}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-1">min {brand.min_followers?.toLocaleString() ?? "1,000"}</span>
      </div>
      {reason && <p className="mt-3 text-sm leading-6 text-zinc-600">{reason}</p>}
    </article>
  );
}
