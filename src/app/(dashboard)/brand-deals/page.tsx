"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ActiveTab = "campaigns" | "invitations" | "completed";

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
  workspaces?: { name?: string | null } | null;
};

type BrandInvitation = {
  id: string;
  creator_id: string;
  cw_campaign_id: string;
  cw_workspace_id: string | null;
  campaign_name: string | null;
  brand_name: string | null;
  cover_image_url: string | null;
  theme: string | null;
  call_to_action: string | null;
  starts_on: string | null;
  brand_overview: string | null;
  brand_website: string | null;
  collab_formats: string[] | null;
  budget_range: string | null;
  duration_weeks: number | null;
  message: string | null;
  status: string;
  sent_at: string;
  responded_at: string | null;
};

function CampaignCard({ campaign, applied, onApply }: { campaign: Campaign; applied: boolean; onApply: () => void }) {
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
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${campaign.status === "active" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
            {campaign.status === "active" ? "招募中" : "即將開始"}
          </span>
        </div>
        {campaign.theme && <p className="mb-3 text-xs leading-5 text-zinc-500">{campaign.theme}</p>}
        <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
          {campaign.starts_on && <span>開始日期：{campaign.starts_on}</span>}
          {campaign.duration_weeks && <span>週期：{campaign.duration_weeks} 週</span>}
        </div>
        {campaign.call_to_action && <p className="mb-3 text-xs text-blue-600">目標：{campaign.call_to_action}</p>}
        <button
          onClick={onApply}
          disabled={applied}
          className={`w-full rounded-lg py-2 text-sm font-medium transition ${applied ? "cursor-not-allowed bg-zinc-100 text-zinc-400" : "bg-black text-white hover:bg-zinc-800"}`}
          type="button"
        >
          {applied ? "已申請" : "申請合作"}
        </button>
      </div>
    </article>
  );
}

function ApplyModal({ campaign, onClose, onSuccess }: { campaign: Campaign; profile: Profile; onClose: () => void; onSuccess: (id: string) => void }) {
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
    if (data.success) onSuccess(campaign.id);
    else setError(data.error || data.detail || "提交失敗，請稍後再試。");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="mb-1 text-lg font-semibold text-zinc-950">{campaign.name}</h3>
        <p className="mb-4 text-sm text-zinc-400">{campaign.workspaces?.name ?? "SOON Creator Network"}</p>
        <label className="mb-2 block text-sm font-medium text-zinc-900">你的 Pitch（可選）</label>
        <textarea value={pitch} onChange={(event) => setPitch(event.target.value)} rows={4} className="mb-4 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200" />
        <p className="mb-4 text-xs leading-relaxed text-zinc-400">申請後，品牌主會在 sooncreator.network 收到你的 Media Kit 連結。</p>
        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={handleApply} disabled={loading} className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50" type="button">
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

function InvitationCard({
  invitation,
  profileId,
  onRespond,
}: {
  invitation: BrandInvitation;
  profileId: string;
  onRespond: (id: string, status: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const isPending = invitation.status === "pending";

  async function respond(status: "accepted" | "declined") {
    setLoading(true);
    const { error } = await supabase.from("egg_brand_invitations").update({ status, responded_at: new Date().toISOString() }).eq("id", invitation.id);
    if (!error) {
      if (status === "accepted" && invitation.brand_name) {
        const { data: existingPartner } = await supabase
          .from("egg_brand_partners")
          .select("id")
          .eq("creator_id", profileId)
          .eq("brand_name", invitation.brand_name)
          .maybeSingle();

        if (!existingPartner?.id) {
          await supabase.from("egg_brand_partners").insert({
            creator_id: profileId,
            brand_name: invitation.brand_name,
          });
        }
      }

      await fetch("/api/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cw_workspace_id: invitation.cw_workspace_id,
          cw_campaign_id: invitation.cw_campaign_id,
          campaign_name: invitation.campaign_name,
          status,
        }),
      }).catch(() => null);
      onRespond(invitation.id, status);
    }
    setLoading(false);
  }

  return (
    <article className={`overflow-hidden rounded-xl border border-zinc-200 bg-white ${!isPending ? "opacity-60" : ""}`}>
      {invitation.cover_image_url && !invitation.cover_image_url.startsWith("/api/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invitation.cover_image_url} className="h-36 w-full object-cover" alt={invitation.campaign_name ?? ""} />
      )}
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">{invitation.campaign_name}</h3>
            <p className="mt-0.5 text-xs text-zinc-400">{invitation.brand_name}</p>
          </div>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${invitation.status === "pending" ? "bg-yellow-50 text-yellow-600" : invitation.status === "accepted" ? "bg-green-50 text-green-600" : "bg-zinc-100 text-zinc-400"}`}>
            {invitation.status === "pending" ? "待回覆" : invitation.status === "accepted" ? "已接受" : "已婉拒"}
          </span>
        </div>
        {invitation.brand_overview && (
          <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2">
            <p className="mb-0.5 text-xs font-medium text-blue-600">關於品牌</p>
            <p className="line-clamp-3 text-xs text-blue-800">{invitation.brand_overview}</p>
          </div>
        )}
        {invitation.brand_website && <a href={invitation.brand_website} target="_blank" rel="noopener noreferrer" className="mb-2 block text-xs text-blue-500 hover:underline">{invitation.brand_website}</a>}
        {invitation.collab_formats && invitation.collab_formats.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {invitation.collab_formats.map((format) => <span key={format} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{format}</span>)}
          </div>
        )}
        {invitation.theme && <p className="mb-3 line-clamp-2 text-xs text-zinc-500">{invitation.theme}</p>}
        <div className="mb-3 flex items-center gap-4 text-xs text-zinc-400">
          {invitation.starts_on && <span>開始日期：{invitation.starts_on}</span>}
          {invitation.duration_weeks && <span>{invitation.duration_weeks} 週</span>}
        </div>
        {invitation.budget_range && <p className="mb-3 text-xs text-zinc-500">預算：{invitation.budget_range}</p>}
        {invitation.call_to_action && <p className="mb-3 text-xs text-blue-600">{invitation.call_to_action}</p>}
        {invitation.message && (
          <div className="mb-3 rounded-lg bg-zinc-50 px-3 py-2">
            <p className="text-xs text-zinc-400">品牌訊息：</p>
            <p className="mt-0.5 text-xs text-zinc-700">{invitation.message}</p>
          </div>
        )}
        {isPending ? (
          <div className="mt-2 flex gap-2">
            <button onClick={() => respond("accepted")} disabled={loading} className="flex-1 rounded-lg bg-black py-2 text-sm font-medium text-white disabled:opacity-50" type="button">接受邀請</button>
            <button onClick={() => respond("declined")} disabled={loading} className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm text-zinc-500 disabled:opacity-50" type="button">婉拒</button>
          </div>
        ) : (
          <p className="mt-2 text-center text-xs text-zinc-400">{invitation.status === "accepted" ? "已接受此邀請" : "已婉拒此邀請"}</p>
        )}
      </div>
    </article>
  );
}

function CompletedBrandCard({ invitation }: { invitation: BrandInvitation }) {
  return (
    <article className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-400">
        {invitation.brand_name?.[0] ?? "?"}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-zinc-950">{invitation.brand_name || "未命名品牌"}</h3>
        <p className="mt-0.5 text-xs text-zinc-400">{invitation.campaign_name || "未命名 Campaign"}</p>
        {invitation.collab_formats && invitation.collab_formats.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {invitation.collab_formats.map((format) => (
              <span key={format} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {format}
              </span>
            ))}
          </div>
        )}
        {invitation.responded_at && <p className="mt-2 text-xs text-zinc-300">已合作 {new Date(invitation.responded_at).toLocaleDateString("zh-HK")}</p>}
        <p className="mt-1 text-xs text-green-500">✓ 已加入 Media Kit</p>
      </div>
      <span className="flex-shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">已合作</span>
    </article>
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
        {campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} applied={applications.includes(campaign.id)} onApply={() => setShowPitchModal(campaign)} />)}
      </div>
      {showPitchModal && <ApplyModal campaign={showPitchModal} profile={profile} onClose={() => setShowPitchModal(null)} onSuccess={(id) => { setApplications((current) => [...current, id]); setShowPitchModal(null); }} />}
    </>
  );
}

export default function BrandDealsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>("campaigns");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invitations, setInvitations] = useState<BrandInvitation[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    supabase.from("egg_brand_invitations").select("*").eq("creator_id", profile.id).order("sent_at", { ascending: false }).then(({ data }) => {
      if (!cancelled) setInvitations((data ?? []) as BrandInvitation[]);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, supabase]);

  const pendingInvitationCount = invitations.filter((invitation) => invitation.status === "pending").length;
  const completedInvitations = invitations.filter((invitation) => invitation.status === "accepted");
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "campaigns", label: "合作機會" },
    { id: "invitations", label: "品牌邀請" },
    { id: "completed", label: "已合作品牌" },
  ];

  useEffect(() => {
    if (!profile?.id || completedInvitations.length === 0) return;

    let cancelled = false;

    async function backfillBrandPartners() {
      const brandNames = Array.from(new Set(completedInvitations.map((invitation) => invitation.brand_name?.trim()).filter(Boolean))) as string[];
      if (brandNames.length === 0 || !profile?.id) return;

      const { data: existingPartners } = await supabase
        .from("egg_brand_partners")
        .select("brand_name")
        .eq("creator_id", profile.id)
        .in("brand_name", brandNames);

      if (cancelled) return;

      const existingNames = new Set((existingPartners ?? []).map((partner) => partner.brand_name));
      const missingPartners = brandNames
        .filter((brandName) => !existingNames.has(brandName))
        .map((brandName) => ({
          creator_id: profile.id,
          brand_name: brandName,
        }));

      if (missingPartners.length > 0) {
        await supabase.from("egg_brand_partners").insert(missingPartners);
      }
    }

    void backfillBrandPartners();

    return () => {
      cancelled = true;
    };
  }, [completedInvitations, profile?.id, supabase]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">品牌合作</h1>
        <p className="mt-2 text-zinc-500">管理合作機會、品牌邀請和合作記錄。</p>
      </div>
      <div className="mb-6 flex border-b border-zinc-200">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition ${activeTab === tab.id ? "border-black text-black" : "border-transparent text-zinc-400"}`} type="button">
            {tab.label}
            {tab.id === "invitations" && pendingInvitationCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingInvitationCount}</span>}
          </button>
        ))}
      </div>
      {activeTab === "campaigns" && (loadingProfile ? <Loading /> : profile ? <CampaignFeed profile={profile} /> : <Empty text="請先完成創作者個人檔案。" />)}
      {activeTab === "invitations" &&
        (loadingProfile ? (
          <Loading />
        ) : !profile ? (
          <Empty text="請先完成創作者個人檔案。" />
        ) : invitations.length === 0 ? (
          <Empty text="暫時未有品牌邀請。" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                profileId={profile.id}
                onRespond={(id, status) =>
                  setInvitations((current) => current.map((item) => (item.id === id ? { ...item, status, responded_at: new Date().toISOString() } : item)))
                }
              />
            ))}
          </div>
        ))}
      {activeTab === "completed" &&
        (loadingProfile ? (
          <Loading />
        ) : completedInvitations.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-400">未有已合作品牌記錄</p>
            <p className="mt-1 text-xs text-zinc-300">接受品牌邀請後，合作記錄會自動出現於此</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {completedInvitations.map((invitation) => (
              <CompletedBrandCard key={invitation.id} invitation={invitation} />
            ))}
          </div>
        ))}
    </div>
  );
}

function Loading() {
  return <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm text-zinc-400">{text}</div>;
}
