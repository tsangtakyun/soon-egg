import Image from "next/image";

export function EggBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="SOON-EGG">
      <Image
        src="/soon-egg.png"
        alt=""
        width={40}
        height={40}
        className={compact ? "h-8 w-8 object-contain" : "h-10 w-10 object-contain"}
        priority
      />
      <span className={compact ? "text-lg font-black tracking-tight text-zinc-950" : "text-xl font-black tracking-tight text-zinc-950"}>
        SOON-EGG
      </span>
    </span>
  );
}

