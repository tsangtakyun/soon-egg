import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-[#fafafa] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-7 w-auto object-contain" />
        </div>
        <p className="text-sm text-gray-500">亞洲創作者的變現中樞</p>
        <nav aria-label="網站資訊" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-zinc-950">私隱政策</Link>
          <Link href="/terms" className="hover:text-zinc-950">使用條款</Link>
          <Link href="/data-deletion" className="hover:text-zinc-950">資料刪除</Link>
          <Link href="/contact" className="hover:text-zinc-950">聯絡我們</Link>
        </nav>
        <p className="text-xs text-gray-400">© 2026 SOON-EGG · their.studio Limited · 香港</p>
      </div>
    </footer>
  );
}
