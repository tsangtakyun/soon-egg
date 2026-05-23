"use client";

import { useState } from "react";

export function FollowButton({
  creatorId,
  displayName,
  initialCount = 0,
  buttonColor,
  btnColor,
  btnRadius = "50px",
}: {
  creatorId: string;
  displayName: string;
  initialCount?: number;
  buttonColor?: string;
  btnColor?: string;
  btnRadius?: string;
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
    <div style={{ width: "100%", maxWidth: 384, margin: "0 auto" }}>
      <button
        type="button"
        onClick={follow}
        disabled={followed || loading}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: btnRadius,
          border: "none",
          backgroundColor: color,
          color: "white",
          fontSize: 14,
          fontWeight: 500,
          cursor: followed || loading ? "default" : "pointer",
          opacity: followed || loading ? 0.7 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {followed ? "已追蹤" : `追蹤 ${displayName}`}
      </button>
      {count > 0 && (
        <p style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          已有 {count.toLocaleString()} 人追蹤
        </p>
      )}
    </div>
  );
}
