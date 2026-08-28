"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, Check, Globe2, Mail, Play, Upload } from "lucide-react";
import Link from "next/link";
import { isValidProfileUsername, normalizeProfileUsername } from "@/lib/profile-username";

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

type SaveStatus = "idle" | "saving" | "success" | "error";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

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
  const [username, setUsername] = useState(profile?.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(
    isValidProfileUsername(profile?.username ?? "") ? "available" : "idle",
  );
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
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>("idle");
  const [socialSaveStatus, setSocialSaveStatus] = useState<SaveStatus>("idle");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [stripeStatus, setStripeStatus] = useState<"checking" | "connected" | "incomplete" | "error">(
    stripeConnected ? "checking" : "incomplete",
  );

  const initials = (displayName || profile?.username || userEmail).slice(0, 2).toUpperCase();

  useEffect(() => {
    const normalized = normalizeProfileUsername(username);
    if (!isValidProfileUsername(normalized) || normalized === profile?.username) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/settings/profile?username=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        const result = await response.json();
        setUsernameStatus(response.ok && result.available ? "available" : "taken");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setUsernameStatus("idle");
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [profile?.username, username]);

  useEffect(() => {
    let cancelled = false;
    async function verifyStripe() {
      try {
        const response = await fetch("/api/stripe/connect/status", { cache: "no-store" });
        const result = await response.json();
        if (!cancelled) setStripeStatus(response.ok && result.complete ? "connected" : "incomplete");
      } catch {
        if (!cancelled) setStripeStatus("error");
      }
    }
    void verifyStripe();
    return () => { cancelled = true; };
  }, []);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setAvatarError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.avatarUrl) setAvatarUrl(data.avatarUrl);
    else setAvatarError(data.error ?? "頭像上傳失敗，請重試。");
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!displayName.trim()) return;
    setProfileSaveStatus("saving");
    const res = await fetch("/api/settings/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: normalizeProfileUsername(username),
        avatar_url: avatarUrl || null,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        content_categories: selectedCategories,
      }),
    });
    const data = await res.json();
    setProfileSaveStatus(res.ok ? "success" : "error");
    if (!res.ok && data.error === "呢個用戶名已經有人使用。") setUsernameStatus("taken");
    setTimeout(() => setProfileSaveStatus("idle"), 3000);
  }

  async function saveSocial() {
    setSocialSaveStatus("saving");
    const res = await fetch("/api/settings/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(socials),
    });
    setSocialSaveStatus(res.ok ? "success" : "error");
    setTimeout(() => setSocialSaveStatus("idle"), 3000);
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
              {avatarError ? <p role="alert" className="mt-1 text-xs text-red-500">{avatarError}</p> : null}
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
            <Field label="公開網址用戶名">
              <div className="relative">
                <Globe2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={username}
                  onChange={(event) => {
                    const next = normalizeProfileUsername(event.target.value).replace(/[^a-z0-9._-]/g, "");
                    setUsername(next);
                    setUsernameStatus(
                      !isValidProfileUsername(next)
                        ? "invalid"
                        : next === profile?.username
                          ? "available"
                          : "checking",
                    );
                  }}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${inputClass} pl-9 pr-24`}
                  aria-describedby="username-help username-status"
                />
                <span id="username-status" className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${usernameStatus === "available" ? "text-emerald-600" : usernameStatus === "taken" || usernameStatus === "invalid" ? "text-red-500" : "text-gray-400"}`}>
                  {usernameStatus === "checking" ? "檢查中…" : usernameStatus === "available" ? "可以使用" : usernameStatus === "taken" ? "已被使用" : usernameStatus === "invalid" ? "格式不符" : ""}
                </span>
              </div>
              <p id="username-help" className="mt-1 break-all text-xs text-gray-400">
                egg.sooncreator.network/{normalizeProfileUsername(username) || "你的用戶名"}
              </p>
              {normalizeProfileUsername(username) !== profile?.username ? (
                <p className="mt-1 text-xs text-amber-600">儲存後舊網址將會失效，記得更新已分享嘅連結。</p>
              ) : null}
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
            <div className="flex items-center">
              <button onClick={saveProfile} disabled={profileSaveStatus === "saving" || !displayName.trim() || usernameStatus !== "available"} className={primaryButtonClass}>
                {profileSaveStatus === "saving" ? "儲存中..." : "儲存個人資料"}
              </button>
              <SaveStatusText status={profileSaveStatus} />
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">社交帳號</h2>
          <div className="space-y-3">
            <SocialRow icon={<AtSign size={16} />} label="Instagram">
              <input
                value={socials.instagram_handle}
                onChange={(e) => setSocials({ ...socials, instagram_handle: e.target.value })}
                readOnly={Boolean(profile?.instagram_handle) && Number(profile?.instagram_followers ?? 0) > 0}
                className={`${inputClass} read-only:bg-zinc-50 read-only:text-zinc-500`}
                placeholder="@username"
              />
              <div className="mt-2 flex items-center justify-between">
                {Number(profile?.instagram_followers ?? 0) > 0 ? (
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
                    OAuth 已連接 · {Number(profile?.instagram_followers).toLocaleString()} followers
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">未連結</span>
                )}
                <Link href="/api/auth/instagram" prefetch={false} className="text-xs text-purple-600 hover:underline">
                  管理／重新連接
                </Link>
              </div>
            </SocialRow>
            <SocialInput icon={<Play size={16} />} label="YouTube" value={socials.youtube_handle} onChange={(value) => setSocials({ ...socials, youtube_handle: value })} comingSoon />
            <SocialInput label="TikTok" value={socials.tiktok_handle} onChange={(value) => setSocials({ ...socials, tiktok_handle: value })} comingSoon />
            <SocialInput label="小紅書" value={socials.xiaohongshu_handle} onChange={(value) => setSocials({ ...socials, xiaohongshu_handle: value })} comingSoon />
            <SocialInput label="Facebook" value={socials.facebook_handle} onChange={(value) => setSocials({ ...socials, facebook_handle: value })} />
            <SocialInput label="Threads" value={socials.threads_handle} onChange={(value) => setSocials({ ...socials, threads_handle: value })} />
          </div>
          <div className="mt-4 flex items-center">
            <button onClick={saveSocial} disabled={socialSaveStatus === "saving"} className={primaryButtonClass}>
              {socialSaveStatus === "saving" ? "儲存中..." : "儲存社交帳號"}
            </button>
            <SaveStatusText status={socialSaveStatus} />
          </div>
        </section>

        <section className="mb-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">收款設定</h2>
          {stripeStatus === "connected" ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Stripe 已連接並可收款</p>
                  <p className="text-xs text-gray-400">Stripe Connect 帳戶 ...{stripeAccountMasked}</p>
                </div>
              </div>
              <button onClick={handleStripeConnect} className="rounded-lg border px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600">
                重新連結
              </button>
            </div>
          ) : stripeStatus === "checking" ? (
            <p className="text-sm text-gray-400">正在向 Stripe 核實收款狀態…</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{stripeStatus === "error" ? "暫時未能核實 Stripe 狀態" : "Stripe 尚未完成設定"}</p>
                <p className="mt-0.5 text-xs text-gray-400">完成 Stripe Connect 驗證後，買家付款先可以直接轉入你的帳戶。</p>
              </div>
              <button onClick={handleStripeConnect} className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
                立即連結
              </button>
            </div>
          )}
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

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-medium text-zinc-700">工作空間管理</h3>
          <p className="text-xs leading-5 text-gray-400">切換、建立或刪除創作者工作空間，請使用左上角工作空間選單。刪除前系統會要求再次確認。</p>
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

function SaveStatusText({ status }: { status: SaveStatus }) {
  if (status === "success") return <span className="ml-3 text-xs text-green-600">✓ 已儲存</span>;
  if (status === "error") return <span className="ml-3 text-xs text-red-500">儲存失敗，請重試</span>;
  if (status === "saving") return <span className="ml-3 text-xs text-gray-400">儲存中...</span>;
  return null;
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
  comingSoon = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  comingSoon?: boolean;
}) {
  return (
    <SocialRow icon={icon} label={label}>
      {comingSoon ? <div className="flex h-10 items-center justify-between rounded-xl border border-gray-100 bg-zinc-50 px-3"><span className="text-sm text-zinc-400">暫時未開放</span><span className="rounded-full bg-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-500">未開放</span></div> : <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="@username" />}
    </SocialRow>
  );
}
