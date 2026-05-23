"use client";

import { useState } from "react";

export function FollowButton({
  creatorId,
  displayName,
  initialCount = 0,
  buttonColor,
  btnColor,
}: {
  creatorId: string;
  displayName: string;
  initialCount?: number;
  buttonColor?: string;
  btnColor?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const color = btnColor || buttonColor || "#3b82f6";

  const follow = async () => {
    if (followed || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: creatorId }),
      });

      if (!response.ok) throw new Error("Follow failed");

      setFollowed(true);
      setCount((current) => current + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <button
        type="button"
        onClick={follow}
        disabled={followed || loading}
        className="w-full rounded-full py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-70"
        style={{ backgroundColor: color }}
      >
        {followed ? "✓ 已追蹤" : `＋ 追蹤 ${displayName}`}
      </button>
      {count > 0 && <p className="mt-2 text-center text-xs text-gray-500">已有 {count.toLocaleString()} 人追蹤</p>}
    </div>
  );
}
