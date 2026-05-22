import { demoCreator } from "@/lib/mock-data";
import Image from "next/image";

export function ProfileBrief() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Image src={demoCreator.avatar_url ?? ""} alt={demoCreator.display_name} width={64} height={64} unoptimized className="h-16 w-16 rounded-full bg-zinc-100" />
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">{demoCreator.display_name}</h3>
          <p className="text-sm text-zinc-500">{demoCreator.bio}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-zinc-50 p-3">
          <div className="text-xs text-zinc-500">Instagram</div>
          <div className="font-mono text-lg font-semibold">48.2K</div>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <div className="text-xs text-zinc-500">YouTube</div>
          <div className="font-mono text-lg font-semibold">12.6K</div>
        </div>
        <div className="rounded-md bg-zinc-50 p-3">
          <div className="text-xs text-zinc-500">Engagement</div>
          <div className="font-mono text-lg font-semibold">5.8%</div>
        </div>
      </div>
    </div>
  );
}
