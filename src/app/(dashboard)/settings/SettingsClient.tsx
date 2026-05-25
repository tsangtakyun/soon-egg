"use client";

import { useRef, useState } from "react";
import { AtSign, Check, Lock, Mail, Play, Upload } from "lucide-react";

type Profile = {
  avatar_url?: string | null;
  bio?: string | null;
  content_categories?: string[] | null;
  display_name?: string | null;
  facebook_handle?: string | null;
  instagram_followers?: number | null;
  instagram_handle?: string | null;
  notification_prefs?: Record<string, boolean> | null;
  threads_handle?: string | null;
  tiktok_handle?: string | null;
  username?: string | null;
  xiaohongshu_handle?: string | null;
  youtube_handle?: string | null;
};

const categories = [
  "生活美學",
  "美容護膚",
  "時尚穿搭",
  "美食",
  "旅遊",
  "健康運動",
  "親子",
  "科技",
  "財經",
  "教育",
  "娛樂",
  "其他",
];

const notificationOptions = [
  { key: "notify_brand_invite", label: "品牌合作邀請", desc: "收到品牌邀請時通知我" },
  { key: "notify_order", label: "貨品訂單", desc: "有新訂單時通知我" },
  { key: "notify_perk_update", label: "公關宣傳更新", desc: "申請狀態更新時通知我" },
];

const defaultNotifications = {
  notify_brand_invite: true,
  notify_order: true,
  notify_perk_update: true,
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100";
const primaryButtonClass =
  "rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50";

export function SettingsClient({
  profile,
  userEmail,
  stripeConnected,
  stripeAccountMasked,
}: {
  profile: Profile | null;
  userEmail: string;
  stripeConnected: boolean;
  stripeAccountMasked: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile?.content_categories ?? []);
  const [socials, setSocials] = useState({
    instagram_handle: profile?.instagram_handle ?? "",
    youtube_handle: profile?.youtube_handle ?? "",
    tiktok_handle: profile?.tiktok_handle ?? "",
    xiaohongshu_handle: profile?.xiaohongshu_handle ?? "",
    facebook_handle: profile?.facebook_handle ?? "",
    threads_handle: profile?.threads_handle ?? "",
  });
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    ...defaultNotifications,
    ...(profile?.notification_prefs ?? {}),
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initials = (displayName || profile?.username || userEmail).slice(0, 2).toUpperCase();

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!displayName.trim()) return;
    setSavingProfile(true);
    await fetch("/api/settings/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatar_url: avatarUrl || null,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        content_categories: selectedCategories,
      }),
    });
    setSavingProfile(false);
  }

  async function saveSocial() {
    setSavingSocial(true);
    await fetch("/api/settings/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(socials),
    });
    setSavingSocial(false);
  }

  async function saveNotifications(next: Record<string, boolean>) {
    setNotifications(next);
    await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: next }),
    });
  }

  async function handleStripeConnect() {
    const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-950">設定</h1>
          <p className="mt-1 text-sm text-gray-500">管理你的創作者資料、社交帳號和收款設定。</p>
        </div>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">個人資料</h2>
          <div className="mb-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName || "Avatar"} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
              <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/55 py-1 text-white">
                <Upload size={12} />
              </span>
            </button>
            <div>
              <p className="text-sm font-medium text-zinc-900">頭像</p>
              <p className="text-xs text-gray-400">{uploadingAvatar ? "上傳中..." : "點擊頭像上傳新相片"}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
          </div>

          <div className="space-y-4">
            <Field label="創作者名稱 *">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="用戶名">
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={profile?.username ?? ""} readOnly className={`${inputClass} bg-gray-50 pl-9 text-gray-400`} />
              </div>
            </Field>
            <Field label="一句介紹">
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} rows={3} className={`${inputClass} resize-none`} />
              <p className="mt-1 text-right text-xs text-gray-400">{bio.length}/150</p>
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">內容類型</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      selectedCategories.includes(category)
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-purple-300"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveProfile} disabled={savingProfile || !displayName.trim()} className={primaryButtonClass}>
              {savingProfile ? "儲存中..." : "儲存個人資料"}
            </button>
          </div>
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">社交帳號</h2>
          <div className="space-y-3">
            <SocialRow icon={<AtSign size={16} />} label="Instagram">
              <input
                value={socials.instagram_handle}
                onChange={(e) => setSocials({ ...socials, instagram_handle: e.target.value })}
                className={inputClass}
                placeholder="@username"
              />
              <div className="mt-2 flex items-center justify-between">
                {Number(profile?.instagram_followers ?? 0) > 0 ? (
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
                    已連結 · {Number(profile?.instagram_followers).toLocaleString()} followers
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">未連結</span>
                )}
                <a href="/api/auth/instagram" className="text-xs text-purple-600 hover:underline">
                  重新連結 IG OAuth
                </a>
              </div>
            </SocialRow>
            <SocialInput icon={<Play size={16} />} label="YouTube" value={socials.youtube_handle} onChange={(value) => setSocials({ ...socials, youtube_handle: value })} />
            <SocialInput label="TikTok" value={socials.tiktok_handle} onChange={(value) => setSocials({ ...socials, tiktok_handle: value })} />
            <SocialInput label="小紅書" value={socials.xiaohongshu_handle} onChange={(value) => setSocials({ ...socials, xiaohongshu_handle: value })} />
            <SocialInput label="Facebook" value={socials.facebook_handle} onChange={(value) => setSocials({ ...socials, facebook_handle: value })} />
            <SocialInput label="Threads" value={socials.threads_handle} onChange={(value) => setSocials({ ...socials, threads_handle: value })} />
          </div>
          <button onClick={saveSocial} disabled={savingSocial} className={`${primaryButtonClass} mt-4`}>
            {savingSocial ? "儲存中..." : "儲存社交帳號"}
          </button>
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">收款設定</h2>
          {stripeConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Stripe 已連結</p>
                  <p className="text-xs text-gray-400">帳號尾號 ...{stripeAccountMasked}</p>
                </div>
              </div>
              <button onClick={handleStripeConnect} className="rounded-lg border px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600">
                重新連結
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">尚未連結 Stripe</p>
                <p className="mt-0.5 text-xs text-gray-400">連結後買家可直接付款，款項直接入帳</p>
              </div>
              <button onClick={handleStripeConnect} className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
                立即連結
              </button>
            </div>
          )}
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">通知設定</h2>
          <div className="divide-y">
            {notificationOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{option.label}</p>
                  <p className="text-xs text-gray-400">{option.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => saveNotifications({ ...notifications, [option.key]: !notifications[option.key] })}
                  className={`relative h-6 w-11 rounded-full transition ${notifications[option.key] ? "bg-purple-600" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      notifications[option.key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">帳號</h2>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
            <Mail size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">{userEmail}</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              登出
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-medium text-red-600">危險區域</h3>
          <p className="mb-3 text-xs text-gray-400">刪除帳號後所有資料將永久消除，無法復原。</p>
          <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-400 hover:text-red-600">
            刪除帳號
          </button>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function SocialRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[120px_1fr] sm:items-start">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SocialInput({
  icon,
  label,
  value,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SocialRow icon={icon} label={label}>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="@username" />
    </SocialRow>
  );
}
