import type { ReactNode } from "react";
import { SOONAIPanel } from "@/components/ui/SOONAIPanel";
import { Sidebar } from "@/components/ui/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f5]">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pr-[320px]">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <SOONAIPanel />
    </div>
  );
}
