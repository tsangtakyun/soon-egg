"use client";

import { useState } from "react";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";

export type CreditPackage = {
  id: string;
  name: string;
  emoji?: string | null;
  credits: number;
  price_hkd: number;
};

export type CreditTransaction = {
  id: string;
  amount: number;
  description: string | null;
  tool: string | null;
  created_at: string;
};

export type CreditSubscription = {
  plan: string;
  status: string;
  stripe_subscription_id: string;
};

type Plan = {
  key: "basic" | "pro";
  name: string;
  price: number;
  credits: number;
  priceId: string;
  features: string[];
  recommended?: boolean;
};

const plans: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    price: 68,
    credits: 800,
    priceId: "price_1Tb6uZQ7196tVqUaEFWWDZJ9",
    features: ["每月 800 credits", "所有創作工具", "優先支援"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 168,
    credits: 2500,
    priceId: "price_1Tb6vjQ7196tVqUaxIYaMIVk",
    features: ["每月 2,500 credits", "所有創作工具", "Mayan AI 無限對話", "優先支援"],
    recommended: true,
  },
];

export function CreditsClient({
  balance,
  packages,
  transactions,
  subscription,
  success,
  subscribed,
  insufficient,
}: {
  balance: number;
  packages: CreditPackage[];
  transactions: CreditTransaction[];
  subscription: CreditSubscription | null;
  success: boolean;
  subscribed: boolean;
  insufficient?: string;
}) {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleSubscribe(priceId: string) {
    console.log("[subscribe] clicked, priceId:", priceId);
    if (!priceId) {
      console.error("[subscribe] no priceId!");
      return;
    }

    try {
      setLoadingPriceId(priceId);
      const res = await fetch("/api/credits/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_id: priceId }),
      });
      const data = await res.json();
      console.log("[subscribe] response:", data);
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      console.error("[subscribe] no url in response:", data);
      alert(data.error ?? "未能建立訂閱，請稍後再試。");
    } catch (err) {
      console.error("[subscribe] error:", err);
    } finally {
      setLoadingPriceId(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!confirm("確認取消訂閱？當前週期結束後將停止扣款。")) return;
    setCancellingId(subscriptionId);
    await fetch("/api/credits/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: subscriptionId }),
    });
    window.location.reload();
  }

  return (
    <main className="space-y-8 pt-[10vh]">
      {subscribed && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-700">訂閱成功！Credits 已加入帳戶。</p>
        </div>
      )}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Credits 購買成功，餘額已更新。</div>}
      {insufficient === "tools" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm font-medium text-orange-700">Credits 不足</p>
          <p className="mt-0.5 text-xs text-orange-600">使用創作工具需要 10 credits，請先購買。</p>
        </div>
      )}
      {insufficient && insufficient !== "tools" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">Credits 不足，請先增值。</div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
        <p className="text-sm opacity-75">可用 Credits</p>
        <p className="mt-1 text-5xl font-bold">{balance.toLocaleString()}</p>
        <p className="mt-1 text-xs opacity-60">每次使用工具扣 10 · AI 生成扣 3</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">月費訂閱</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              currentPlan={subscription}
              loading={loadingPriceId === plan.priceId}
              cancelling={cancellingId === subscription?.stripe_subscription_id}
              onSubscribe={handleSubscribe}
              onCancel={handleCancel}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">一次性購買</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border bg-white p-4">
              <p className="text-2xl">{pkg.emoji ?? "⚡"}</p>
              <p className="mt-2 font-semibold">{pkg.name}</p>
              <p className="mt-1 font-bold text-purple-600">{Number(pkg.credits).toLocaleString()} credits</p>
              <p className="text-sm text-gray-500">HKD ${pkg.price_hkd}</p>
              <BuyCreditsButton packageId={pkg.id} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">使用記錄</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暫未有交易記錄</p>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="text-sm">{tx.description ?? "Credits 交易"}</p>
                  <p className="text-xs text-gray-400">
                    {tx.tool ?? "SOON-EGG"} · {new Date(tx.created_at).toLocaleString("zh-HK")}
                  </p>
                </div>
                <span className={tx.amount > 0 ? "text-green-600" : "text-red-500"}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PlanCard({
  plan,
  currentPlan,
  loading,
  cancelling,
  onSubscribe,
  onCancel,
}: {
  plan: Plan;
  currentPlan: CreditSubscription | null;
  loading: boolean;
  cancelling: boolean;
  onSubscribe: (priceId: string) => void;
  onCancel: (subscriptionId: string) => void;
}) {
  const isActive = currentPlan?.plan === plan.key && currentPlan?.status === "active";

  return (
    <div className={`relative rounded-2xl border bg-white p-5 ${plan.recommended ? "border-purple-400 shadow-sm" : "border-gray-200"}`}>
      {plan.recommended && (
        <span className="absolute -top-3 left-4 rounded-full bg-purple-600 px-3 py-0.5 text-xs text-white">推薦</span>
      )}
      <h3 className="text-base font-semibold">{plan.name}</h3>
      <div className="mb-3 mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">HKD ${plan.price}</span>
        <span className="text-sm text-gray-400">/ 月</span>
      </div>
      <p className="mb-3 text-sm font-medium text-purple-600">{plan.credits.toLocaleString()} credits / 月</p>
      <ul className="mb-4 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      {isActive ? (
        <div className="space-y-2">
          <div className="w-full rounded-xl bg-green-50 py-2.5 text-center text-sm font-medium text-green-700">✓ 當前方案</div>
          <button
            type="button"
            onClick={() => onCancel(currentPlan.stripe_subscription_id)}
            disabled={cancelling}
            className="w-full rounded-xl border border-gray-200 py-2 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            {cancelling ? "處理中..." : "取消訂閱"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSubscribe(plan.priceId)}
          disabled={loading}
          className={`w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 ${
            plan.recommended ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {loading ? "處理中..." : `訂閱 ${plan.name}`}
        </button>
      )}
    </div>
  );
}
