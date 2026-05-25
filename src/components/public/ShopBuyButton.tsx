"use client";

import { useState } from "react";

type ShopBuyButtonProps = {
  productId: string;
  externalUrl: string | null;
  stripeReady: boolean;
};

export function ShopBuyButton({ productId, externalUrl, stripeReady }: ShopBuyButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    if (externalUrl && !stripeReady) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.url) {
      window.location.href = data.url;
      return;
    }

    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    alert(data.error ?? "暫時未能建立付款連結");
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      type="button"
    >
      {loading ? "處理中..." : "立即購買"}
    </button>
  );
}
