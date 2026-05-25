"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  Captions,
  Clapperboard,
  FileText,
  FolderOpen,
  Home,
  Layout,
  Lightbulb,
  Package,
  UserRound,
  WandSparkles,
  Zap,
} from "lucide-react";

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

const toolItems = [
  { href: "/tools/idea", label: "靈感工作台", icon: Lightbulb },
  { href: "/tools/script", label: "劇本工作台", icon: FileText },
  { href: "/tools/storyboard", label: "分鏡工作台", icon: Layout },
  { href: "/tools/production", label: "拍攝跟進", icon: Clapperboard },
  { href: "/tools/subtitle", label: "字幕工作台", icon: Captions },
  { href: "/tools/docs", label: "文件中心", icon: FolderOpen },
  { href: "/tools/schedule", label: "行程中心", icon: Calendar },
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
            prefetch={false}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
              active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <div className="px-3 pb-1 pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">創作工具</p>
      </div>
      {toolItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
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
