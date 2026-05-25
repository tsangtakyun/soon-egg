"use client";

import { useState } from "react";

export function BuyCreditsButton({ packageId }: { packageId: string }) {
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error ?? "未能建立付款連結");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={buy} disabled={loading} className="mt-4 w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
      {loading ? "處理中..." : "購買"}
    </button>
  );
}
