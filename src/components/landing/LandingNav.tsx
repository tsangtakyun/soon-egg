"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md transition ${scrolled ? "border-b border-black/10" : ""}`}>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="SOON-EGG home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-8 w-auto object-contain" />
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/login" className="text-sm font-semibold text-zinc-700 transition hover:text-black">登入</Link>
          <Link href="/signup" className="rounded-full bg-[#0a0a0a] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5">
            免費開始 →
          </Link>
        </div>

        <button type="button" onClick={() => setOpen(!open)} className="rounded-full border border-black/10 p-2 sm:hidden" aria-label="開關選單">
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-black/10 bg-white/90 px-6 py-4 backdrop-blur-md sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <Link href="/login" className="rounded-xl px-3 py-3 text-sm font-semibold text-zinc-700">登入</Link>
            <Link href="/signup" className="rounded-full bg-[#0a0a0a] px-5 py-3 text-center text-sm font-bold text-white">免費開始 →</Link>
          </div>
        </div>
      )}
    </header>
  );
}
