import Image from "next/image";

export function EggLoader({ label = "正在載入…", size = "md", fullPage = false }: { label?: string; size?: "sm" | "md" | "lg"; fullPage?: boolean }) {
  const pixels = size === "sm" ? 24 : size === "lg" ? 88 : 44;
  return (
    <div className={`egg-loader ${fullPage ? "egg-loader-full" : ""}`} role="status" aria-live="polite">
      <Image className="egg-loader-logo" src="/soon-egg.png" width={pixels} height={pixels} alt="" priority={fullPage} />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
