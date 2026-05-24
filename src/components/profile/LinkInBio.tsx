"use client";

import { useRef, useState } from "react";
import { Check, Copy, Upload, X } from "lucide-react";
import { BlockEditor } from "./BlockEditor";
import { PhonePreview, type PhonePreviewProfile, type PhonePreviewTheme, type ProfileBlock } from "./PhonePreview";

const COVER_OPTIONS = [
  { src: "/hero-bg.jpg", name: "藍天白雲" },
  { src: "/star-bg.jpg", name: "萬天星空" },
  { src: "/secondbg.jpg", name: "搞笑戲劇" },
  { src: "/tech.jpg", name: "科技感覺" },
  { src: "/classic.jpg", name: "經典復古" },
  { src: "/creative.jpg", name: "創意主題" },
];

export function LinkInBio({
  profile: initialProfile,
  theme,
  blocks: initialBlocks,
  blocksError = "",
}: {
  profile: PhonePreviewProfile;
  theme: PhonePreviewTheme | null;
  blocks: ProfileBlock[];
  blocksError?: string;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(initialProfile.display_name || "");
  const [profileBio, setProfileBio] = useState(initialProfile.bio || "");
  const [savingProfileInfo, setSavingProfileInfo] = useState(false);
  const [profileInfoMessage, setProfileInfoMessage] = useState("");
  const [coffeeUrl, setCoffeeUrl] = useState(initialProfile.buy_me_a_coffee_url || "");
  const [savingCoffeeUrl, setSavingCoffeeUrl] = useState(false);
  const [coffeeMessage, setCoffeeMessage] = useState("");
  const publicUrl = `https://egg.sooncreator.network/${profile.username}`;

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.error || "Avatar upload failed");
      }

      setProfile((current) => ({ ...current, avatar_url: result.avatarUrl }));
    } catch {
      setAvatarError("頭像未能上載，請稍後再試。");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const selectCover = async (selectedSrc: string) => {
    setSavingCover(true);
    setCoverError("");

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_url: selectedSrc }),
      });

      if (!response.ok) throw new Error("Save failed");

      setProfile((current) => ({ ...current, cover_url: selectedSrc }));
      setCoverModalOpen(false);
    } catch {
      setCoverError("封面圖未能更新，請稍後再試。");
    } finally {
      setSavingCover(false);
    }
  };

  const saveProfileInfo = async () => {
    const trimmedDisplayName = profileDisplayName.trim();
    if (!trimmedDisplayName) {
      setProfileInfoMessage("請填寫創作者名稱。");
      return;
    }

    setSavingProfileInfo(true);
    setProfileInfoMessage("");

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: trimmedDisplayName,
          bio: profileBio.trim() || null,
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      setProfile((current) => ({
        ...current,
        display_name: trimmedDisplayName,
        bio: profileBio.trim() || null,
      }));
      setProfileInfoMessage("已儲存");
    } catch {
      setProfileInfoMessage("未能儲存，請稍後再試。");
    } finally {
      setSavingProfileInfo(false);
    }
  };

  const saveCoffeeUrl = async () => {
    setSavingCoffeeUrl(true);
    setCoffeeMessage("");

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buy_me_a_coffee_url: coffeeUrl.trim() || null }),
      });

      if (!response.ok) throw new Error("Save failed");

      setProfile((current) => ({ ...current, buy_me_a_coffee_url: coffeeUrl.trim() || null }));
      setCoffeeMessage("已儲存");
    } catch {
      setCoffeeMessage("未能儲存，請稍後再試。");
    } finally {
      setSavingCoffeeUrl(false);
    }
  };

  return (
    <div className="p-6 flex gap-8 items-start">
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-zinc-950">我的主頁</h1>
          <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
            編輯你的 Link in Bio，公開網址為{" "}
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              egg.sooncreator.network/{profile.username}
            </a>
            <button
              type="button"
              onClick={copyPublicUrl}
              className="ml-1 inline-flex items-center p-1 text-gray-400 hover:text-gray-700"
              title="複製連結"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAvatar(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={openAvatarPicker}
            disabled={uploadingAvatar}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadingAvatar ? "上載中..." : "更換頭像"}
          </button>
          <button
            type="button"
            onClick={() => setCoverModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            更換封面圖
          </button>
        </div>
        {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
        {coverError && <p className="text-sm text-red-600">{coverError}</p>}

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">創作者資料</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="profile-display-name" className="mb-1 block text-xs font-medium text-zinc-500">
                創作者名稱 *
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profileDisplayName}
                onChange={(event) => {
                  setProfileDisplayName(event.target.value);
                  setProfileInfoMessage("");
                }}
                onBlur={() => {
                  if (profileDisplayName.trim() !== (profile.display_name || "")) void saveProfileInfo();
                }}
                placeholder="例如：Rosary Lifestyle"
                maxLength={50}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="mb-1 block text-xs font-medium text-zinc-500">
                一句介紹自己
              </label>
              <textarea
                id="profile-bio"
                value={profileBio}
                onChange={(event) => {
                  setProfileBio(event.target.value);
                  setProfileInfoMessage("");
                }}
                onBlur={() => {
                  if (profileBio.trim() !== (profile.bio || "")) void saveProfileInfo();
                }}
                placeholder="例如：分享精緻生活美學與日常靈感"
                maxLength={150}
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveProfileInfo}
                disabled={savingProfileInfo}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {savingProfileInfo ? "儲存中" : "儲存資料"}
              </button>
              {profileInfoMessage && <p className="text-xs text-gray-500">{profileInfoMessage}</p>}
            </div>
          </div>
        </div>

        <BlockEditor creatorId={profile.id} blocks={blocks} onBlocksChange={setBlocks} blocksError={blocksError} />

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <label htmlFor="buy-me-a-coffee-url" className="text-sm font-semibold text-zinc-900">
            Buy Me A Coffee 連結
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="buy-me-a-coffee-url"
              type="url"
              value={coffeeUrl}
              onChange={(event) => {
                setCoffeeUrl(event.target.value);
                setCoffeeMessage("");
              }}
              onBlur={() => {
                if (coffeeUrl !== (profile.buy_me_a_coffee_url || "")) void saveCoffeeUrl();
              }}
              placeholder="https://buymeacoffee.com/yourname"
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={saveCoffeeUrl}
              disabled={savingCoffeeUrl}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {savingCoffeeUrl ? "儲存中" : "儲存"}
            </button>
          </div>
          {coffeeMessage && <p className="mt-2 text-xs text-gray-500">{coffeeMessage}</p>}
        </div>
      </div>

      <div className="flex-none">
        <PhonePreview
          profile={profile}
          theme={theme}
          blocks={blocks}
          onAvatarClick={openAvatarPicker}
          avatarUploading={uploadingAvatar}
        />
      </div>

      {coverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950">選擇封面背景</h2>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="關閉"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {COVER_OPTIONS.map((option) => {
                const selected = profile.cover_url === option.src;

                return (
                  <button
                    key={option.src}
                    type="button"
                    onClick={() => void selectCover(option.src)}
                    disabled={savingCover}
                    className="group text-left disabled:opacity-60"
                  >
                    <div
                      className={`relative h-28 overflow-hidden rounded-2xl ring-offset-2 transition ${
                        selected ? "ring-4 ring-blue-500" : "ring-1 ring-gray-200 group-hover:ring-2 group-hover:ring-blue-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={option.src} alt={option.name} className="h-full w-full object-cover" />
                      {selected && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-center text-sm font-medium text-zinc-700">{option.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
