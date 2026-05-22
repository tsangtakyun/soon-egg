import { demoBlocks, demoCreator, demoThemes } from "@/lib/mock-data";
import Image from "next/image";

export function PhonePreview() {
  const theme = demoThemes[0];
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[32px] border-8 border-zinc-950 bg-zinc-950 p-2 shadow-2xl">
      <div className="min-h-[620px] overflow-hidden rounded-[24px] p-5 text-center" style={{ background: theme.background_gradient, color: theme.text_color }}>
        <Image src={demoCreator.avatar_url ?? ""} alt={demoCreator.display_name} width={80} height={80} unoptimized className="mx-auto mt-6 h-20 w-20 rounded-full bg-white object-cover" />
        <h2 className="mt-4 text-xl font-bold">{demoCreator.display_name}</h2>
        <p className="mt-2 text-sm opacity-75">{demoCreator.bio}</p>
        <div className="mt-6 space-y-3">
          {demoBlocks.map((block) => (
            <div key={block.id} className="rounded-lg border border-white/20 bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur">
              {block.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
