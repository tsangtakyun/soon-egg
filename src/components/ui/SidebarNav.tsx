"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Captions,
  FileText,
  Home,
  MessageSquare,
  Megaphone,
  Package,
  UserRound,
  WandSparkles,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "主頁", icon: Home },
  { href: "/profile", label: "創作者檔案", icon: UserRound },
  { href: "/media-kit", label: "Media Kit", icon: WandSparkles },
  { href: "/products", label: "數位產品", icon: Package },
  { href: "/analytics", label: "社交數據", icon: BarChart3 },
];

const creatorToolItems = [
  { href: "/tools/script", label: "劇本工作台", icon: FileText },
  { href: "/tools/subtitle", label: "字幕工作台", icon: Captions },
];

const utilityToolItems = [
  { href: "/tools/reply", label: "回覆中心", icon: MessageSquare },
  { href: "/meta-ads", label: "Meta Ads", icon: Megaphone },
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

      <SidebarItem
        href="/brand-deals"
        icon={BriefcaseBusiness}
        label="合作機會"
        prefetch={false}
        active={isActive("/brand-deals")}
      />

      <div>
        {creatorToolItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            prefetch={false}
            active={isActive(item.href)}
          />
        ))}

        {utilityToolItems.map((item) => (
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
    </nav>
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
          ? "bg-zinc-950 text-white"
          : "text-zinc-600 hover:bg-white hover:text-zinc-950"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
