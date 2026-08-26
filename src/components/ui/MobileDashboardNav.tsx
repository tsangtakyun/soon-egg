"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, X, Zap } from "lucide-react";
import { useState } from "react";
import { SidebarNav } from "./SidebarNav";

export function MobileDashboardNav({
  avatarUrl,
  creatorName,
}: {
  avatarUrl?: string | null;
  creatorName: string;
}) {
  const pathname = usePathname();
  const [openAtPath, setOpenAtPath] = useState<string | null>(null);
  const open = openAtPath === pathname;

  return (
    <>
      <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="返回 SOON-EGG 主頁">
          <Image src="/soon-egg.png" alt="SOON-EGG" width={104} height={32} className="h-7 w-auto object-contain" priority />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <CreatorAvatar avatarUrl={avatarUrl} creatorName={creatorName} />
          <span className="max-w-28 truncate text-sm font-semibold text-zinc-800">{creatorName}</span>
          <button
            type="button"
            onClick={() => setOpenAtPath(pathname)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700"
            aria-label="開啟導覽選單"
            aria-expanded={open}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpenAtPath(null)}
            aria-label="關閉導覽選單"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-zinc-50 px-4 py-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-2 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <CreatorAvatar avatarUrl={avatarUrl} creatorName={creatorName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{creatorName}</p>
                  <p className="text-xs text-zinc-400">創作者帳戶</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenAtPath(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-white"
                aria-label="關閉導覽選單"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav />
            </div>

            <div className="space-y-1 border-t border-zinc-200 pt-4">
              <MobileAccountLink href="/settings" icon={<Settings size={17} />} label="設定" />
              <MobileAccountLink href="/credits" icon={<Zap size={17} />} label="Credits" />
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 hover:bg-white">
                  <LogOut size={17} />
                  登出
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function CreatorAvatar({ avatarUrl, creatorName }: { avatarUrl?: string | null; creatorName: string }) {
  if (avatarUrl) {
    return (
      // Remote creator images can come from connected platforms or storage.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 object-cover" />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
      {creatorName.slice(0, 2).toUpperCase()}
    </span>
  );
}

function MobileAccountLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 hover:bg-white">
      {icon}
      {label}
    </Link>
  );
}
