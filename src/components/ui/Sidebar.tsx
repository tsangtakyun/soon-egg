"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, CreditCard, Home, Mail, Package, Settings, UserRound, WandSparkles } from "lucide-react";
import { CreditBadge } from "./CreditBadge";

const items = [
  { href: "/", label: "主頁", icon: Home },
  { href: "/profile", label: "我的主頁", icon: UserRound },
  { href: "/media-kit", label: "Media Kit", icon: WandSparkles },
  { href: "/brand-deals", label: "品牌合作", icon: BriefcaseBusiness },
  { href: "/brand-deals/discover", label: "探索品牌", icon: BriefcaseBusiness },
  { href: "/brand-deals/active", label: "進行中合作", icon: BriefcaseBusiness },
  { href: "/products", label: "數位產品", icon: Package },
  { href: "/analytics", label: "數據分析", icon: BarChart3 },
  { href: "/onboarding", label: "推廣工具", icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-zinc-200 bg-zinc-50/80 px-4 py-5 lg:block">
      <Link href="/" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-sm font-black text-white">SE</div>
        <div>
          <div className="text-sm font-black tracking-wide text-zinc-950">SOON-EGG</div>
          <div className="text-xs text-zinc-500">Creator Network</div>
        </div>
      </Link>

      <div className="mt-6 px-2">
        <CreditBadge credits={300} />
      </div>

      <nav className="mt-6 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-zinc-200 pt-4">
        <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-white">
          <Settings className="h-4 w-4" aria-hidden />
          設定
        </Link>
        <Link href="/products" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-white">
          <CreditCard className="h-4 w-4" aria-hidden />
          升級計劃
        </Link>
      </div>
    </aside>
  );
}
