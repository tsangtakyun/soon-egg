"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Captions,
  FileText,
  Home,
  Lightbulb,
  MessageSquare,
  Link2,
  Brain,
  Package,
  ReceiptText,
  Sparkles,
  Sun,
  UserRound,
  WandSparkles,
} from "lucide-react";

const workspaceItems = [
  { href: "/dashboard", label: "主頁", icon: Home },
  { href: "/profile", label: "創作者檔案", icon: UserRound },
  { href: "/media-kit", label: "Media Kit", icon: WandSparkles },
  { href: "/analytics", label: "社交數據", icon: BarChart3 },
];

const businessItems = [
  { href: "/quotations", label: "報價管理", icon: ReceiptText },
  { href: "/products", label: "數位產品", icon: Package },
  { href: "/brand-deals", label: "合作機會", icon: BriefcaseBusiness },
];

const eggItems = [
  { href: "/egg-daily", label: "今日出咩？", icon: Sun },
  { href: "/egg-this", label: "Egg This", icon: Sparkles },
  { href: "/egg-publications", label: "發布內容配對", icon: Link2 },
  { href: "/egg-preferences", label: "Creator DNA", icon: Brain },
  { href: "/topic-library", label: "題材靈感庫", icon: Lightbulb },
];

const productionItems = [
  { href: "/tools/script", label: "劇本工作台", icon: FileText },
  { href: "/tools/subtitle", label: "字幕工作台", icon: Captions },
  { href: "/tools/reply", label: "回覆中心", icon: MessageSquare },
];

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/brand-deals") return pathname === "/brand-deals";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="mt-6 space-y-6" aria-label="主要導覽">
      <SidebarGroup
        label="創作者空間"
        items={workspaceItems}
        isActive={isActive}
      />
      <SidebarGroup
        label="Egg 內容助手"
        items={eggItems}
        isActive={isActive}
        accent
      />
      <SidebarGroup
        label="製作工具"
        items={productionItems}
        isActive={isActive}
      />
      <SidebarGroup
        label="商務工具"
        items={businessItems}
        isActive={isActive}
      />
    </nav>
  );
}

function SidebarGroup({
  label,
  items,
  isActive,
  accent = false,
}: {
  label: string;
  items: typeof workspaceItems;
  isActive: (href: string) => boolean;
  accent?: boolean;
}) {
  return (
    <section aria-labelledby={`nav-${label}`}>
      <h2
        id={`nav-${label}`}
        className={`mb-2 px-3 text-[11px] font-black uppercase tracking-[0.14em] ${accent ? "text-[#7b4a4f]" : "text-zinc-400"}`}
      >
        {label}
      </h2>
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            prefetch={false}
            active={isActive(item.href)}
          />
        ))}
      </div>
    </section>
  );
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  prefetch = true,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        active
          ? "bg-[#7b4a4f] text-white shadow-[2px_3px_0_#2a1718]"
          : "text-zinc-600 hover:bg-white hover:text-zinc-950"
      }`}
    >
      {active && href === "/dashboard" ? <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 10.5 12 2.5l9.5 8-1.8 2.1-1.2-1V21H5.5v-9.4l-1.2 1Z" fill="currentColor" /><path d="M9.5 21v-7h5v7Z" fill="#ffca28" /></svg> : <Icon className="h-4 w-4" fill={active && href === "/tools/reply" ? "#60A5FA" : "none"} aria-hidden />}
      {label}
    </Link>
  );
}
