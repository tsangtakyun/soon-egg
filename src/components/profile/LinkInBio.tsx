"use client";

import { useRef, useState } from "react";
import { Check, Copy, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const publicUrl = `https://egg.sooncreator.network/${profile.username}`;

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setAvatarError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("egg_creator_profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
    } catch {
      setAvatarError("頭像未能上載，請稍後再試。");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="flex items-start gap-8">
      <div className="flex-1 space-y-5">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">我的主頁</h1>
          <p className="mt-2 text-sm text-gray-500">
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

        <div>
          <input
            ref={fileInputRef}
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadingAvatar ? "上載中..." : "更換頭像"}
          </button>
          {avatarError && <p className="mt-2 text-sm text-red-600">{avatarError}</p>}
        </div>

        <BlockEditor creatorId={profile.id} blocks={blocks} onBlocksChange={setBlocks} blocksError={blocksError} />
      </div>

      <div className="flex-none">
        <PhonePreview profile={profile} theme={theme} blocks={blocks} />
      </div>
    </div>
  );
}
