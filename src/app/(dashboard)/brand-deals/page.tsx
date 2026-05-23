"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandCard } from "@/components/brand-deals/BrandCard";
import { PitchDrafter } from "@/components/brand-deals/PitchDrafter";
import { createClient } from "@/lib/supabase/client";
import { demoBrandMatches } from "@/lib/mock-data";

type ActiveTab = "campaigns" | "brands";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  instagram_followers: number | null;
};

type Campaign = {
  id: string;
  name: string;
  theme: string | null;
  status: string | null;
  starts_on: string | null;
  duration_weeks: number | null;
  target_audience: string | null;
  call_to_action: string | null;
  cover_image_url: string | null;
  workspace_id: string;
  created_at: string;
  workspaces?: {
    name?: string | null;
  } | null;
};

function statusLabel(status: string | null) {
  return status === "active" ? "招募中" : "即將開始";
}

function CampaignCard({
  campaign,
  applied,
  onApply,
}: {
  campaign: Campaign;
  applied: boolean;
  onApply: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:shadow-md">
      {campaign.cover_image_url && !campaign.cover_image_url.startsWith("/api/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={campaign.cover_image_url} className="h-40 w-full object-cover" alt={campaign.name} />
      )}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-950">{campaign.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-400">{campaign.workspaces?.name ?? "SOON Creator Network"}</p>
          </div>
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
              campaign.status === "active" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
            }`}
          >
            {statusLabel(campaign.status)}
          </span>
        </div>

        {campaign.theme && <p className="mb-3 text-xs leading-5 text-zinc-500">{campaign.theme}</p>}

        <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
          {campaign.starts_on && <span>日期：{campaign.starts_on}</span>}
          {campaign.duration_weeks && <span>週期：{campaign.duration_weeks} 週</span>}
        </div>

        {campaign.call_to_action && <p className="mb-3 text-xs text-blue-600">目標：{campaign.call_to_action}</p>}

        <button
          onClick={onApply}
          disabled={applied}
          className={`w-full rounded-lg py-2 text-sm font-medium transition ${
            applied ? "cursor-not-allowed bg-zinc-100 text-zinc-400" : "bg-black text-white hover:bg-zinc-800"
          }`}
          type="button"
        >
          {applied ? "已申請" : "申請合作"}
        </button>
      </div>
    </article>
  );
}

function ApplyModal({
  campaign,
  onClose,
  onSuccess,
}: {
  campaign: Campaign;
  profile: Profile;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/campaigns/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaign.id,
        workspace_id: campaign.workspace_id,
        campaign_name: campaign.name,
        brand_name: campaign.workspaces?.name,
        cover_image_url: campaign.cover_image_url,
        theme: campaign.theme,
        call_to_action: campaign.call_to_action,
        starts_on: campaign.starts_on,
        pitch_message: pitch,
      }),
    });
    const data = await res.json();

    setLoading(false);
    if (data.success) {
      onSuccess(campaign.id);
    } else {
      setError(data.error || data.detail || "提交失敗，請稍後再試。");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-zinc-950">{campaign.name}</h3>
        <p className="mb-4 text-sm text-zinc-400">{campaign.workspaces?.name ?? "SOON Creator Network"}</p>

        <label className="mb-2 block text-sm font-medium text-zinc-900">你的 Pitch（可選）</label>
        <textarea
          value={pitch}
          onChange={(event) => setPitch(event.target.value)}
          placeholder="介紹自己同點樣配合呢個 campaign..."
          rows={4}
          className="mb-4 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
        />

        <p className="mb-4 text-xs leading-relaxed text-zinc-400">申請後，品牌主會喺 sooncreator.network 收到你的 Media Kit 連結。</p>
        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50"
            type="button"
          >
            {loading ? "提交中..." : "確認申請"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm text-zinc-500" type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignFeed({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPitchModal, setShowPitchModal] = useState<Campaign | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaigns() {
      setLoading(true);
      setError("");

      try {
        const [campaignRes, applicationRes] = await Promise.all([
          fetch("/api/campaigns/feed"),
          supabase.from("egg_campaign_applications").select("cw_campaign_id").eq("creator_id", profile.id),
        ]);
        const campaignData = await campaignRes.json();

        if (!cancelled) {
          if (!campaignRes.ok) setError(campaignData.error || "未能載入合作機會");
          setCampaigns(campaignData.campaigns ?? []);
          setApplications(applicationRes.data?.map((item) => item.cw_campaign_id as string) ?? []);
        }
      } catch {
        if (!cancelled) setError("未能載入合作機會");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [profile.id, supabase]);

  if (loading) return <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>;
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>;
  if (campaigns.length === 0) return <div className="py-12 text-center text-sm text-zinc-400">暫無合作機會</div>;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            applied={applications.includes(campaign.id)}
            onApply={() => setShowPitchModal(campaign)}
          />
        ))}
      </div>
      {showPitchModal && (
        <ApplyModal
          campaign={showPitchModal}
          profile={profile}
          onClose={() => setShowPitchModal(null)}
          onSuccess={(id) => {
            setApplications((current) => [...current, id]);
            setShowPitchModal(null);
          }}
        />
      )}
    </>
  );
}

function RecommendedBrands() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        {demoBrandMatches.slice(0, 6).map((match) => (
          <BrandCard key={match.brand.id} brand={match.brand} score={match.match_score} reason={match.reason_zh} />
        ))}
      </div>
      <PitchDrafter />
    </div>
  );
}

export default function BrandDealsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>("campaigns");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoadingProfile(false);
        return;
      }

      const { data } = await supabase.from("egg_creator_profiles").select("*").eq("user_id", user.id).single();

      if (!cancelled) {
        setProfile(data as Profile | null);
        setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">品牌合作</h1>
        <p className="mt-2 text-zinc-500">瀏覽最新合作機會，或查看 SOON AI 為你推薦的亞洲品牌。</p>
      </div>

      <div className="mb-6 flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition ${
            activeTab === "campaigns" ? "border-black text-black" : "border-transparent text-zinc-400"
          }`}
          type="button"
        >
          合作機會
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={`border-b-2 px-6 py-3 text-sm font-medium transition ${
            activeTab === "brands" ? "border-black text-black" : "border-transparent text-zinc-400"
          }`}
          type="button"
        >
          推薦品牌
        </button>
      </div>

      {activeTab === "campaigns" && (
        loadingProfile ? (
          <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
        ) : profile ? (
          <CampaignFeed profile={profile} />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">請先完成創作者檔案設定。</div>
        )
      )}

      {activeTab === "brands" && <RecommendedBrands />}
    </div>
  );
}
