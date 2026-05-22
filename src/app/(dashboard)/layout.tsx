import type { ReactNode } from "react";
import { SOONAIAssistant } from "@/components/ui/AIAssistant";
import { Sidebar } from "@/components/ui/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <SOONAIAssistant context="general" />
    </div>
  );
}
