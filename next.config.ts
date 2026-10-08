import type { NextConfig } from "next";

// Register this isolated branch without deploying the legacy application against
// inherited Preview credentials. Remove this hold only with the reviewed staging
// Lab implementation and verified branch-scoped staging connection in place.
// No environment switch can bypass the hold; other branches are unaffected.
if (process.env.VERCEL_GIT_COMMIT_REF === "codex/credits-wallet-staging") {
  throw new Error("EGG_STAGING_REGISTRATION_HOLD: staging Lab is not ready to deploy");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
