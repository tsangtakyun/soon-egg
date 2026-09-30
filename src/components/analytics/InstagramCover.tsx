"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export function InstagramCover({ mediaId, initialUrl }: { mediaId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const attempted = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const recover = useCallback(async () => {
    setUrl(null);
    if (attempted.current) return;
    attempted.current = true; setBusy(true);
    try {
      const response = await fetch("/api/instagram/media-cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaId }), signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (alive.current && response.ok && typeof data.imageUrl === "string") setUrl(data.imageUrl);
    } catch { /* Keep a readable fallback; never loop on a failed URL. */ }
    finally { if (alive.current) setBusy(false); }
  }, [mediaId]);
  useEffect(() => {
    // Starts an external cover lookup when the stored thumbnail is missing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initialUrl) void recover();
  }, [initialUrl, recover]);
  return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
    {url ? <Image src={url} width={56} height={56} unoptimized alt="" onError={() => void recover()} className="h-full w-full object-cover" /> : <span role="status" className="px-1 text-center text-[10px] leading-4 text-zinc-500">{busy ? "更新封面中…" : "封面暫未能載入"}</span>}
  </div>;
}
