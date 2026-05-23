"use client";

import { useState } from "react";

export function FollowButton({
  creatorId,
  displayName,
  initialCount,
  buttonColor,
}: {
  creatorId: string;
  displayName: string;
  initialCount: number;
  buttonColor: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [followed, setFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  const follow = async () => {
    if (followed || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/public/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
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
        className="block w-full rounded-full border-2 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-70"
        style={{ borderColor: buttonColor, color: buttonColor }}
      >
        {followed ? "已追蹤" : `＋ 追蹤 ${displayName}`}
      </button>
      {count > 0 && <p className="mt-2 text-center text-xs text-gray-500">已有 {count.toLocaleString()} 人追蹤</p>}
    </div>
  );
}
