"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  Captions,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  Lightbulb,
  MessageSquare,
  Package,
  UserRound,
  WandSparkles,
  Wallet,
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
];

const creatorToolItems = [
  { href: "/tools/idea", label: "靈感工作台", icon: Lightbulb },
  { href: "/tools/script", label: "劇本工作台", icon: FileText },
  { href: "/tools/subtitle", label: "字幕工作台", icon: Captions },
];

const productionToolItems = [
  { href: "/tools/docs", label: "文件中心", icon: FolderOpen },
  { href: "/tools/schedule", label: "行程中心", icon: Calendar },
  { href: "/tools/finance", label: "財務中心", icon: Wallet },
  { href: "/tools/reply", label: "回覆中心", icon: MessageSquare },
];

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/brand-deals") return pathname === "/brand-deals";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function SidebarItem({
    href,
    icon: Icon,
    label,
    prefetch = true,
  }: {
    href: string;
    icon: typeof Home;
    label: string;
    prefetch?: boolean;
  }) {
    const active = isActive(href);

    return (
      <Link
        href={href}
        prefetch={prefetch}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
          active ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <nav className="mt-6 space-y-1">
      {items.map((item) => (
        <SidebarItem key={item.href} href={item.href} icon={item.icon} label={item.label} prefetch={false} />
      ))}

      <div className="pt-5">
        <SidebarSection label="創作工具" defaultOpen={true}>
          {creatorToolItems.map((item) => (
            <SidebarItem key={item.href} href={item.href} icon={item.icon} label={item.label} prefetch={false} />
          ))}
        </SidebarSection>

        <SidebarSection label="制片工具" defaultOpen={true} small={true}>
          {productionToolItems.map((item) => (
            <SidebarItem key={item.href} href={item.href} icon={item.icon} label={item.label} prefetch={false} />
          ))}
        </SidebarSection>
      </div>
    </nav>
  );
}

function SidebarSection({
  label,
  children,
  defaultOpen = true,
  small = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  small?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 hover:bg-white"
      >
        <span className={`font-medium uppercase tracking-wider text-gray-400 ${small ? "text-[10px]" : "text-xs"}`}>
          {label}
        </span>
        <ChevronDown size={12} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}
