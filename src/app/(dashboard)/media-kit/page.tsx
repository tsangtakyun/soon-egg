"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CreatorProfile = {
  id: string;
  display_name: string | null;
  ai_profile_summary: string | null;
  instagram_followers: number | null;
  youtube_subscribers: number | null;
  instagram_engagement_rate: number | null;
};

type RateCard = {
  id: string;
  creator_id: string;
  service_name: string | null;
  service_name_zh: string | null;
  platform: string | null;
  price: number | null;
  currency: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

const emptyRate = {
  service_name: "",
  service_name_zh: "",
  platform: "",
  price: 0,
};

export default function MediaKitPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState(emptyRate);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: creator } = await supabase
        .from("egg_creator_profiles")
        .select("id, display_name, ai_profile_summary, instagram_followers, youtube_subscribers, instagram_engagement_rate")
        .eq("user_id", user.id)
        .single();

      if (!creator || cancelled) {
        setLoading(false);
        return;
      }

      setProfile(creator as CreatorProfile);

      const { data } = await supabase
        .from("egg_rate_cards")
        .select("*")
        .eq("creator_id", creator.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!cancelled) {
        setRateCards((data ?? []) as RateCard[]);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSaveRate() {
    if (!profile) return;
    if (!newRate.service_name && !newRate.service_name_zh) return;

    const { data, error } = await supabase
      .from("egg_rate_cards")
      .insert({
        creator_id: profile.id,
        service_name: newRate.service_name || newRate.service_name_zh,
        service_name_zh: newRate.service_name_zh,
        platform: newRate.platform,
        price: newRate.price,
        currency: "HKD",
        sort_order: rateCards.length,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setRateCards((current) => [...current, data as RateCard]);
      setShowAddRate(false);
      setNewRate(emptyRate);
    }
  }

  async function handleDeleteRate(id: string) {
    await supabase.from("egg_rate_cards").update({ is_active: false }).eq("id", id);
    setRateCards((current) => current.filter((rate) => rate.id !== id));
  }

  const totalReach = Number(profile?.instagram_followers ?? 0) + Number(profile?.youtube_subscribers ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Media Kit</h1>
        <p className="mt-2 text-zinc-500">整理你的品牌合作資料、受眾數據和服務報價。</p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Creator Profile</p>
        <h2 className="mt-2 text-2xl font-black text-zinc-950">{profile?.display_name || "你的 Media Kit"}</h2>
        <p className="mt-3 max-w-2xl text-zinc-600">{profile?.ai_profile_summary || "完成 onboarding 後，SOON AI 會自動整理你的創作者定位。"}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Total Reach</p>
            <p className="mt-1 text-2xl font-bold text-zinc-950">{loading ? "..." : totalReach.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">IG Followers</p>
            <p className="mt-1 text-2xl font-bold text-zinc-950">{loading ? "..." : Number(profile?.instagram_followers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Engagement</p>
            <p className="mt-1 text-2xl font-bold text-zinc-950">{profile?.instagram_engagement_rate ? `${profile.instagram_engagement_rate}%` : "—"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-zinc-950">Rate Cards</h2>
            <p className="text-sm text-zinc-400">設定品牌可參考的服務報價。</p>
          </div>
          <button
            onClick={() => setShowAddRate(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            type="button"
          >
            + 新增服務
          </button>
        </div>

        {rateCards.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">尚未設定報價，點擊「新增服務」開始</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rateCards.map((rate) => (
              <div key={rate.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">{rate.service_name_zh || rate.service_name}</div>
                  {rate.platform && <div className="text-xs text-zinc-400">{rate.platform}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-950">HK${Number(rate.price ?? 0).toLocaleString()}</span>
                  <button onClick={() => handleDeleteRate(rate.id)} className="text-xs text-zinc-300 hover:text-red-400" type="button">
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAddRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="mb-4 text-lg font-medium text-zinc-950">新增服務報價</h3>

            <label className="mb-1 block text-sm text-zinc-500">服務名稱（中文）</label>
            <input
              value={newRate.service_name_zh}
              onChange={(event) => setNewRate({ ...newRate, service_name_zh: event.target.value })}
              placeholder="例如：Instagram 貼文"
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

            <label className="mb-1 block text-sm text-zinc-500">Service Name (English)</label>
            <input
              value={newRate.service_name}
              onChange={(event) => setNewRate({ ...newRate, service_name: event.target.value })}
              placeholder="e.g. Instagram In-feed Post"
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

            <label className="mb-1 block text-sm text-zinc-500">平台</label>
            <select
              value={newRate.platform}
              onChange={(event) => setNewRate({ ...newRate, platform: event.target.value })}
              className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選擇平台</option>
              <option value="Instagram">Instagram</option>
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="小紅書">小紅書</option>
              <option value="Facebook">Facebook</option>
              <option value="其他">其他</option>
            </select>

            <label className="mb-1 block text-sm text-zinc-500">報價 (HKD)</label>
            <input
              type="number"
              value={newRate.price}
              onChange={(event) => setNewRate({ ...newRate, price: Number(event.target.value) })}
              placeholder="500"
              className="mb-5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div className="flex gap-3">
              <button onClick={handleSaveRate} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white" type="button">
                儲存
              </button>
              <button onClick={() => setShowAddRate(false)} className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-500" type="button">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
