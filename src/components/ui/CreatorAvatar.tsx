"use client";

import { useEffect, useRef, useState } from "react";

export function CreatorAvatar({
  avatarUrl,
  creatorName,
  className = "h-10 w-10",
}: {
  avatarUrl?: string | null;
  creatorName: string;
  className?: string;
}) {
  const initials = creatorName.trim().slice(0, 2).toUpperCase() || "CR";
  const isEggSoon = creatorName.toLowerCase().replace(/[^a-z]/g, "") === "eggsoon";
  const resolvedAvatarUrl = avatarUrl || (isEggSoon ? "/soon-egg.png" : null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedAvatarUrl) return;

    const image = imageRef.current;
    // A cached image can fail before React hydrates, so onError alone is not
    // reliable. Check the completed image again after the client mounts.
    if (image?.complete && image.naturalWidth === 0) {
      setFailedUrl(resolvedAvatarUrl);
    }
  }, [resolvedAvatarUrl]);

  return (
    <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-zinc-900 ${className}`}>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{initials}</span>
      {resolvedAvatarUrl && failedUrl !== resolvedAvatarUrl ? (
        // Creator avatars can be hosted by connected platforms or Supabase Storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={resolvedAvatarUrl}
          alt={creatorName}
          className="absolute inset-0 h-full w-full bg-zinc-100 object-cover"
          onError={(event) => {
            setFailedUrl(resolvedAvatarUrl);
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}
