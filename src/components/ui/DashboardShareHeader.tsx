"use client";

import Link from "next/link";
import { ExternalLink, Share2 } from "lucide-react";

export function DashboardShareHeader() {
  const copyProfileLink = async () => {
    await navigator.clipboard.writeText("https://sooncreator.network/soon_egg");
    alert("連結已複製！");
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">主頁</h1>
        <p className="text-xs text-gray-400">歡迎回來</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-xs text-gray-500">sooncreator.network/</span>
          <span className="text-xs font-semibold text-gray-900">soon_egg</span>
          <Link href="/soon_egg" target="_blank" className="text-gray-400 transition-colors hover:text-blue-500" aria-label="開啟公開主頁">
            <ExternalLink size={12} />
          </Link>
        </div>

        <button
          type="button"
          onClick={copyProfileLink}
          className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          <Share2 size={14} />
          分享主頁
        </button>
      </div>
    </div>
  );
}
