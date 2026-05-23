"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CreatorProfile = {
  id: string;
  username: string;
  instagram_handle: string | null;
  contact_email?: string | null;
  mediakit_bg_color: string | null;
  mediakit_text_color: string | null;
  mediakit_accent_color: string | null;
  mediakit_accent_text_color: string | null;
  mediakit_font: string | null;
  mediakit_is_public: boolean | null;
  mediakit_allow_matching?: boolean | null;
  mediakit_layout?: string | null;
  mediakit_lock_contact: boolean | null;
  mediakit_lock_about: boolean | null;
  mediakit_lock_case_studies: boolean | null;
  mediakit_lock_brand_partners: boolean | null;
  mediakit_lock_rates: boolean | null;
  mediakit_lock_analytics?: boolean | null;
  mediakit_collab_title?: string | null;
  mediakit_collab_message?: string | null;
  mediakit_about_title?: string | null;
  mediakit_bio?: string | null;
};

type ProfileField = keyof CreatorProfile;

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

type TabKey = "design" | "permissions" | "rates";
type SectionKey = "contact" | "about" | "cases" | "partners" | "rates" | "analytics";

const emptyRate = {
  service_name: "",
  service_name_zh: "",
  platform: "",
  price: 0,
};

const colorPresets = [
  { name: "暖調雜誌", bg: "#FFF5E6", text: "#1a1a1a", accent: "#E63946", accentText: "#FFFFFF" },
  { name: "深夜藍", bg: "#111827", text: "#F9FAFB", accent: "#60A5FA", accentText: "#0B1220" },
  { name: "抹茶柔和", bg: "#F4F7ED", text: "#1F2933", accent: "#6A994E", accentText: "#FFFFFF" },
  { name: "工作室粉紅", bg: "#FFF1F5", text: "#2A1720", accent: "#DB2777", accentText: "#FFFFFF" },
  { name: "極簡黑白", bg: "#F8FAFC", text: "#0F172A", accent: "#111827", accentText: "#FFFFFF" },
  { name: "日落金", bg: "#FFF7ED", text: "#24140A", accent: "#F59E0B", accentText: "#1A1200" },
];

const fonts = ["Poppins", "Saira", "Roboto", "Jost", "Helvetica", "Quicksand", "Merriweather", "Arvo"];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-6 w-10 rounded-full transition-colors ${value ? "bg-black" : "bg-gray-200"}`}
      type="button"
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50"
        type="button"
      >
        <span className="text-sm font-medium text-zinc-900">{title}</span>
        <span className="text-xs text-gray-400">{open ? "∧" : "∨"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <span className="relative h-8 w-8 overflow-hidden rounded-full border border-zinc-200 shadow-sm" style={{ backgroundColor: value }}>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onSave(draft)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onSave(draft)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
      )}
    </label>
  );
}

function SectionEditor({
  sectionKey,
  profile,
  onUpdate,
}: {
  sectionKey: SectionKey;
  profile: CreatorProfile;
  onUpdate: (updates: Partial<CreatorProfile>) => void;
}) {
  if (sectionKey === "contact") {
    return (
      <div className="space-y-3 p-4">
        <TextField
          label="標題"
          value={profile.mediakit_collab_title ?? ""}
          placeholder="品牌合作查詢"
          onSave={(value) => onUpdate({ mediakit_collab_title: value })}
        />
        <TextField
          label="說明文字"
          value={profile.mediakit_collab_message ?? ""}
          placeholder="歡迎發送合作邀請，我會盡快回覆！"
          multiline
          onSave={(value) => onUpdate({ mediakit_collab_message: value })}
        />
        <TextField
          label="聯絡電郵"
          value={profile.contact_email ?? ""}
          placeholder="hello@example.com"
          onSave={(value) => onUpdate({ contact_email: value })}
        />
      </div>
    );
  }

  if (sectionKey === "about") {
    return (
      <div className="space-y-3 p-4">
        <TextField
          label="區塊標題"
          value={profile.mediakit_about_title ?? ""}
          placeholder="ABOUT ME"
          onSave={(value) => onUpdate({ mediakit_about_title: value })}
        />
        <TextField
          label="個人簡介"
          value={profile.mediakit_bio ?? ""}
          placeholder="介紹你的內容定位、受眾和合作亮點"
          multiline
          onSave={(value) => onUpdate({ mediakit_bio: value })}
        />
      </div>
    );
  }

  if (sectionKey === "rates") {
    return <p className="p-4 text-sm text-zinc-500">服務報價可在「報價」分頁新增、刪除和排序。</p>;
  }

  if (sectionKey === "analytics") {
    return <p className="p-4 text-sm text-zinc-500">數據分析會根據已連結社交帳號自動顯示。</p>;
  }

  if (sectionKey === "cases") {
    return <p className="p-4 text-sm text-zinc-500">過往項目內容會顯示在公開 Media Kit，稍後可加入案例管理。</p>;
  }

  return <p className="p-4 text-sm text-zinc-500">品牌合作內容會顯示在公開 Media Kit，稍後可加入品牌管理。</p>;
}

function LockedBlockRow({
  label,
  toggleField,
  sectionKey,
  profile,
  onUpdate,
}: {
  label: string;
  toggleField: ProfileField;
  sectionKey: SectionKey;
  profile: CreatorProfile;
  onUpdate: (updates: Partial<CreatorProfile>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = !Boolean(profile[toggleField]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
        <span className="text-sm font-medium text-zinc-900">{label}</span>
        <div className="flex items-center gap-3">
          <Toggle value={visible} onChange={(value) => onUpdate({ [toggleField]: !value } as Partial<CreatorProfile>)} />
          <button
            onClick={() => setExpanded((current) => !current)}
            className="flex h-6 w-6 items-center justify-center text-base text-gray-400 hover:text-gray-700"
            type="button"
          >
            {expanded ? "∧" : "›"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-zinc-100 bg-gray-50">
          <SectionEditor sectionKey={sectionKey} profile={profile} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

export default function MediaKitPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("design");
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState(emptyRate);
  const [previewKey, setPreviewKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: creator } = await supabase.from("egg_creator_profiles").select("*").eq("user_id", user.id).single();

      if (!creator) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("egg_rate_cards")
        .select("*")
        .eq("creator_id", creator.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!cancelled) {
        setProfile(creator as CreatorProfile);
        setRateCards((data ?? []) as RateCard[]);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function saveProfile(updates: Partial<CreatorProfile>, refreshPreview = true) {
    if (!profile) return;

    const { error } = await supabase.from("egg_creator_profiles").update(updates).eq("id", profile.id);

    if (!error) {
      setProfile((current) => (current ? { ...current, ...updates } : current));
      if (refreshPreview) setPreviewKey((current) => current + 1);
    }
  }

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
      setPreviewKey((current) => current + 1);
    }
  }

  async function handleDeleteRate(id: string) {
    await supabase.from("egg_rate_cards").update({ is_active: false }).eq("id", id);
    setRateCards((current) => current.filter((rate) => rate.id !== id));
    setPreviewKey((current) => current + 1);
  }

  const bgColor = profile?.mediakit_bg_color ?? "#FFF5E6";
  const accentColor = profile?.mediakit_accent_color ?? "#E63946";
  const accentTextColor = profile?.mediakit_accent_text_color ?? "#FFFFFF";
  const selectedFont = profile?.mediakit_font ?? "Poppins";

  return (
    <div className="min-h-screen pt-20">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Media Kit</h1>
          <p className="mt-2 text-zinc-500">編輯你的公開 Media Kit，讓品牌快速了解你的受眾、作品和合作報價。</p>
        </div>
        <a
          href={profile ? `/${profile.username}/mediakit` : "#"}
          target="_blank"
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          分享
        </a>
      </div>

      <div className="grid min-h-[720px] gap-6 xl:grid-cols-[480px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex border-b border-zinc-100 bg-zinc-50 p-2">
            {[
              { key: "design", label: "設計" },
              { key: "permissions", label: "權限" },
              { key: "rates", label: "報價" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[calc(100vh-210px)] overflow-y-auto">
            {loading || !profile ? (
              <p className="py-12 text-center text-sm text-zinc-400">載入 Media Kit 設定中...</p>
            ) : (
              <>
                {activeTab === "design" && (
                  <div>
                    <CollapsibleSection title="色彩預設">
                      <p className="mb-4 text-sm text-zinc-400">選擇一組適合你個人品牌的色彩組合。</p>
                      <div className="grid grid-cols-2 gap-3">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() =>
                              saveProfile({
                                mediakit_bg_color: preset.bg,
                                mediakit_text_color: preset.text,
                                mediakit_accent_color: preset.accent,
                                mediakit_accent_text_color: preset.accentText,
                              })
                            }
                            className="rounded-2xl border border-zinc-100 p-3 text-left transition hover:border-zinc-300"
                            type="button"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <span className="h-8 w-8 rounded-full border border-zinc-200" style={{ backgroundColor: preset.bg }} />
                              <span className="h-8 w-8 rounded-full border border-zinc-200" style={{ backgroundColor: preset.accent }} />
                            </div>
                            <span className="text-sm font-medium text-zinc-900">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="自訂顏色">
                      <div className="space-y-3">
                        <ColorPicker label="頁面背景" value={bgColor} onChange={(value) => saveProfile({ mediakit_bg_color: value })} />
                        <ColorPicker label="主題色" value={accentColor} onChange={(value) => saveProfile({ mediakit_accent_color: value })} />
                        <ColorPicker
                          label="主題文字色"
                          value={accentTextColor}
                          onChange={(value) => saveProfile({ mediakit_accent_text_color: value })}
                        />
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="字型">
                      <div className="grid grid-cols-2 gap-3">
                        {fonts.map((font) => (
                          <button
                            key={font}
                            onClick={() => saveProfile({ mediakit_font: font })}
                            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                              selectedFont === font ? "border-black bg-zinc-950 text-white" : "border-zinc-100 text-zinc-700 hover:border-zinc-300"
                            }`}
                            style={{ fontFamily: `${font}, sans-serif` }}
                            type="button"
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    </CollapsibleSection>

                    <div className="px-4 py-4">
                      <h2 className="mb-3 text-sm font-medium text-zinc-900">版面佈局</h2>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "webpage", label: "網頁版" },
                          { value: "resume", label: "履歷版" },
                        ].map((layout) => (
                          <button
                            key={layout.value}
                            onClick={() => saveProfile({ mediakit_layout: layout.value })}
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                              (profile.mediakit_layout ?? "webpage") === layout.value
                                ? "border-black bg-zinc-950 text-white"
                                : "border-zinc-100 text-zinc-700 hover:border-zinc-300"
                            }`}
                            type="button"
                          >
                            {layout.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "permissions" && (
                  <div className="space-y-6 p-5">
                    <div className="space-y-3">
                      <h2 className="text-base font-semibold text-zinc-950">公開設定</h2>
                      <ToggleRow
                        title="公開我的 Media Kit"
                        value={Boolean(profile.mediakit_is_public)}
                        onChange={(value) => saveProfile({ mediakit_is_public: value })}
                      />
                      <ToggleRow
                        title="允許 SOON-EGG 幫我配對品牌合作機會"
                        description="SOON-EGG 會在合適的品牌合作機會中分享你的 Media Kit"
                        value={Boolean(profile.mediakit_allow_matching)}
                        onChange={(value) => saveProfile({ mediakit_allow_matching: value })}
                      />
                    </div>

                    <div className="space-y-3">
                      <h2 className="text-base font-semibold text-zinc-950">內容區塊</h2>
                      <LockedBlockRow label="聯絡表單" toggleField="mediakit_lock_contact" sectionKey="contact" profile={profile} onUpdate={saveProfile} />
                      <LockedBlockRow label="關於我" toggleField="mediakit_lock_about" sectionKey="about" profile={profile} onUpdate={saveProfile} />
                      <LockedBlockRow
                        label="過往項目"
                        toggleField="mediakit_lock_case_studies"
                        sectionKey="cases"
                        profile={profile}
                        onUpdate={saveProfile}
                      />
                      <LockedBlockRow
                        label="品牌合作"
                        toggleField="mediakit_lock_brand_partners"
                        sectionKey="partners"
                        profile={profile}
                        onUpdate={saveProfile}
                      />
                      <LockedBlockRow label="服務報價" toggleField="mediakit_lock_rates" sectionKey="rates" profile={profile} onUpdate={saveProfile} />
                      <LockedBlockRow
                        label="數據分析"
                        toggleField="mediakit_lock_analytics"
                        sectionKey="analytics"
                        profile={profile}
                        onUpdate={saveProfile}
                      />
                    </div>

                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <h2 className="text-base font-semibold text-zinc-950">已連結帳號</h2>
                      <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">Instagram</p>
                          <p className="text-xs text-zinc-400">{profile.instagram_handle ? `@${profile.instagram_handle}` : "尚未連結"}</p>
                        </div>
                        {profile.instagram_handle ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">● 已完整連結</span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-400">未連結</span>
                        )}
                      </div>
                      <Link
                        href="/onboarding"
                        className="mt-3 block rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900"
                      >
                        + 新增社交帳號
                      </Link>
                    </div>
                  </div>
                )}

                {activeTab === "rates" && (
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-950">報價</h2>
                        <p className="mt-1 text-sm text-zinc-400">設定品牌合作服務和收費。</p>
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
                      <p className="rounded-2xl bg-zinc-50 py-10 text-center text-sm text-zinc-400">尚未設定報價，點擊「新增服務」開始。</p>
                    ) : (
                      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
                        {rateCards.map((rate) => (
                          <div key={rate.id} className="flex items-center justify-between px-4 py-3">
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
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950">即時預覽</p>
              <p className="text-xs text-zinc-400">{profile ? `/${profile.username}/mediakit` : "載入中..."}</p>
            </div>
            <button
              onClick={() => setPreviewKey((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
              type="button"
            >
              <RefreshCw size={14} />
              重新整理
            </button>
          </div>
          <div className="h-[calc(100vh-220px)] min-h-[620px] bg-white">
            {profile ? (
              <iframe src={`/${profile.username}/mediakit`} className="h-full w-full border-none" key={previewKey} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">載入 preview 中...</div>
            )}
          </div>
        </section>
      </div>

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
