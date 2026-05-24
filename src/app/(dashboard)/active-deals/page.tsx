"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefCard, type ProjectBrief } from "@/components/brand-deals/BriefCard";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  username: string;
};

type BrandPerk = {
  title: string | null;
  type: string | null;
  description: string | null;
  brand_name?: string | null;
  brand_website?: string | null;
};

type PerkClaim = {
  id: string;
  perk_id: string;
  creator_username: string;
  status: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  delivery_address: string | null;
  delivery_district: string | null;
  brand_notes: string | null;
  updated_at: string | null;
  brand_perks?: BrandPerk | BrandPerk[] | null;
};

export default function ActiveDealsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [briefs, setBriefs] = useState<ProjectBrief[]>([]);
  const [perkClaims, setPerkClaims] = useState<PerkClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveDeals() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: profileData } = await supabase.from("egg_creator_profiles").select("id,username").eq("user_id", user.id).single();
      if (!profileData?.id || !profileData.username) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [{ data: briefData }, perkClaimsResult] = await Promise.all([
        supabase
          .from("egg_project_briefs")
          .select("*")
          .eq("creator_id", profileData.id)
          .order("received_at", { ascending: false }),
        supabase
          .from("perk_claims")
          .select(
            `
            *,
            brand_perks!inner(
              title, type, description,
              brand_name, brand_website
            )
          `
          )
          .eq("creator_username", profileData.username)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("updated_at", { ascending: false }),
      ]);

      let activePerkClaims = (perkClaimsResult.data ?? []) as PerkClaim[];

      if (perkClaimsResult.error) {
        const { data: claimData } = await supabase
          .from("perk_claims")
          .select("*")
          .eq("creator_username", profileData.username)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("updated_at", { ascending: false });

        const claims = (claimData ?? []) as PerkClaim[];
        const perkIds = Array.from(new Set(claims.map((claim) => claim.perk_id).filter(Boolean)));
        const { data: perkData } =
          perkIds.length > 0
            ? await supabase.from("brand_perks").select("id,title,type,description,brand_name,brand_website").in("id", perkIds)
            : { data: [] };
        const perkById = new Map((perkData ?? []).map((perk) => [perk.id, perk]));
        activePerkClaims = claims.map((claim) => ({
          ...claim,
          brand_perks: perkById.get(claim.perk_id) ?? null,
        })) as PerkClaim[];
      }

      if (!cancelled) {
        setProfile(profileData as Profile);
        setBriefs((briefData ?? []) as ProjectBrief[]);
        setPerkClaims(activePerkClaims);
        setLoading(false);
      }
    }

    void loadActiveDeals();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function handleConfirm(briefId: string, confirmation: Partial<ProjectBrief>) {
    setBriefs((current) => current.map((brief) => (brief.id === briefId ? { ...brief, ...confirmation } : brief)));
  }

  return (
    <div className="space-y-5 pt-[10vh]">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">進行中合作</h1>
        <p className="mt-2 text-zinc-500">查看品牌發來的項目簡報，了解合作詳情與交付要求。</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
      ) : !profile || (briefs.length === 0 && perkClaims.length === 0) ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400">暫未有進行中合作</p>
          <p className="mt-1 text-xs text-zinc-300">接受品牌邀請並收到項目簡報後，合作詳情將顯示於此。</p>
        </div>
      ) : (
        <div className="space-y-8">
          {briefs.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {briefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} onConfirm={handleConfirm} />
              ))}
            </div>
          )}

          {perkClaims.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">公關宣傳安排</h2>
              <div className="space-y-3">
                {perkClaims.map((claim) => (
                  <PerkClaimCard key={claim.id} claim={claim} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getClaimPerk(claim: PerkClaim): BrandPerk {
  const relation = Array.isArray(claim.brand_perks) ? claim.brand_perks[0] : claim.brand_perks;
  return relation ?? { title: "公關宣傳項目", type: claim.preferred_date ? "service" : "product", description: null };
}

function PerkClaimCard({ claim }: { claim: PerkClaim }) {
  const perk = getClaimPerk(claim);
  const isService = perk.type === "service";

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span
            className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
              isService ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
            }`}
          >
            {isService ? "服務" : "產品"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              claim.status === "confirmed"
                ? "bg-blue-50 text-blue-600"
                : claim.status === "in_progress"
                  ? "bg-purple-50 text-purple-600"
                  : "bg-green-50 text-green-600"
            }`}
          >
            {claim.status === "confirmed" ? "✓ 已確認" : claim.status === "in_progress" ? "進行中" : "✓ 已完成"}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-medium">{perk.title}</h3>
      {perk.brand_name && <p className="mt-0.5 text-xs text-gray-400">{perk.brand_name}</p>}

      {isService && claim.preferred_date && <p className="mt-2 text-xs text-gray-500">預約日期：{claim.preferred_date}</p>}
      {!isService && claim.delivery_address && (
        <p className="mt-2 text-xs text-gray-500">
          寄送至：{claim.delivery_district} {claim.delivery_address}
        </p>
      )}
      {claim.brand_notes && (
        <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">品牌備注：{claim.brand_notes}</p>
        </div>
      )}
    </div>
  );
}
