"use client";

import { useRef, useState } from "react";
import { Check, Copy, Upload } from "lucide-react";
import { BlockEditor } from "./BlockEditor";
import { PhonePreview, type PhonePreviewProfile, type PhonePreviewTheme, type ProfileBlock } from "./PhonePreview";

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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [coverError, setCoverError] = useState("");
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

  const openCoverPicker = () => {
    coverInputRef.current?.click();
  };

  const uploadProfileImage = async (file: File, kind: "avatar" | "cover") => {
    const isAvatar = kind === "avatar";
    if (isAvatar) {
      setUploadingAvatar(true);
      setAvatarError("");
    } else {
      setUploadingCover(true);
      setCoverError("");
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/profile/${kind}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const nextUrl = isAvatar ? result.avatarUrl : result.coverUrl;
      if (!response.ok || !nextUrl) {
        throw new Error(result.error || "Upload failed");
      }

      setProfile((current) => ({
        ...current,
        ...(isAvatar ? { avatar_url: nextUrl } : { cover_url: nextUrl }),
      }));
    } catch {
      if (isAvatar) {
        setAvatarError("頭像未能上載，請稍後再試。");
      } else {
        setCoverError("封面圖未能上載，請稍後再試。");
      }
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
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
              if (file) void uploadProfileImage(file, "avatar");
              event.target.value = "";
            }}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadProfileImage(file, "cover");
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
            onClick={openCoverPicker}
            disabled={uploadingCover}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadingCover ? "上載中..." : "更換封面圖"}
          </button>
        </div>
        {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
        {coverError && <p className="text-sm text-red-600">{coverError}</p>}

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
    </div>
  );
}
