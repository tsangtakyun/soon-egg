import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-[#7a2f25]">404 · SOON-EGG</p>
        <h1 className="mt-3 text-3xl font-black text-zinc-950">搵唔到呢一頁</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">連結可能已更新，或者內容尚未公開。</p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white">返回主頁</Link>
      </section>
    </main>
  );
}
