"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Home, Package, UserRound, WandSparkles, Zap } from "lucide-react";

const items = [
  { href: "/dashboard", label: "主頁", icon: Home },
  { href: "/profile", label: "我的主頁", icon: UserRound },
  { href: "/media-kit", label: "Media Kit", icon: WandSparkles },
  { href: "/brand-deals", label: "品牌合作", icon: BriefcaseBusiness },
  { href: "/brand-deals/discover", label: "探索品牌", icon: BriefcaseBusiness },
  { href: "/active-deals", label: "進行中合作", icon: BriefcaseBusiness },
  { href: "/products", label: "數位產品", icon: Package },
  { href: "/analytics", label: "數據分析", icon: BarChart3 },
  { href: "/credits", label: "Credits", icon: Zap },
];

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/brand-deals") return pathname === "/brand-deals";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="mt-6 space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
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
  );
}
