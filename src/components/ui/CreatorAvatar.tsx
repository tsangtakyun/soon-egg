"use client";

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

  return (
    <span className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-zinc-900 ${className}`}>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{initials}</span>
      {avatarUrl ? (
        // Creator avatars can be hosted by connected platforms or Supabase Storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={creatorName}
          className="absolute inset-0 h-full w-full bg-zinc-100 object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

