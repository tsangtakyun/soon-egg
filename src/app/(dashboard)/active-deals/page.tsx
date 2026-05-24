"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefCard, type ProjectBrief } from "@/components/brand-deals/BriefCard";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
};

export default function ActiveDealsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [briefs, setBriefs] = useState<ProjectBrief[]>([]);
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

      const { data: profileData } = await supabase.from("egg_creator_profiles").select("id").eq("user_id", user.id).single();
      if (!profileData?.id) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: briefData } = await supabase
        .from("egg_project_briefs")
        .select("*")
        .eq("creator_id", profileData.id)
        .order("received_at", { ascending: false });

      if (!cancelled) {
        setProfile(profileData as Profile);
        setBriefs((briefData ?? []) as ProjectBrief[]);
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
    <div className="space-y-5 pt-[20vh]">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">進行中合作</h1>
        <p className="mt-2 text-zinc-500">查看品牌發來的項目簡報，了解合作詳情與交付要求。</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
      ) : !profile || briefs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400">暫未有進行中合作</p>
          <p className="mt-1 text-xs text-zinc-300">接受品牌邀請並收到項目簡報後，合作詳情將顯示於此。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {briefs.map((brief) => (
            <BriefCard key={brief.id} brief={brief} onConfirm={handleConfirm} />
          ))}
        </div>
      )}
    </div>
  );
}
