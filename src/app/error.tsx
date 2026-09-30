"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-[#7a2f25]">SOON-EGG</p>
        <h1 className="mt-3 text-3xl font-black text-zinc-950">暫時未能載入呢一頁</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">可能係網絡或服務暫時繁忙。你可以重試，已儲存嘅資料唔會受影響。</p>
        {error.digest && <p className="mt-3 text-xs text-zinc-400">錯誤編號：{error.digest}</p>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white">重新載入</button>
          <Link href="/dashboard" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-bold text-zinc-700">返回主頁</Link>
        </div>
      </section>
    </main>
  );
}
