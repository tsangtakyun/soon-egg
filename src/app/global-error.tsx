"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-HK">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "sans-serif", background: "#f7f7f5" }}>
          <section style={{ maxWidth: 520, padding: 32, textAlign: "center", border: "1px solid #e4e4e7", borderRadius: 24, background: "white" }}>
            <h1 style={{ margin: 0, fontSize: 30 }}>SOON-EGG 暫時遇到問題</h1>
            <p style={{ color: "#71717a", lineHeight: 1.7 }}>請重新載入。如果問題持續，請記低錯誤編號再聯絡支援。</p>
            {error.digest && <p style={{ color: "#a1a1aa", fontSize: 12 }}>錯誤編號：{error.digest}</p>}
            <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", border: 0, borderRadius: 999, color: "white", background: "black", fontWeight: 700 }}>重新載入</button>
          </section>
        </main>
      </body>
    </html>
  );
}
