import type { NextConfig } from "next";

const stagingBranch = process.env.VERCEL_GIT_COMMIT_REF === "codex/credits-wallet-staging";
// This branch compiles only explicitly named staging entrypoints. No legacy
// product/auth/payment/provider route is included in the deployed route graph.
if (stagingBranch && (process.env.VERCEL_ENV !== "preview"
  || process.env.EGG_CREDIT_STAGING_ENABLED !== "true"
  || process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://netzschelivdhfkznfrq.supabase.co"
  || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error("EGG_STAGING_REGISTRATION_HOLD: isolated staging configuration is incomplete");
}

const nextConfig: NextConfig = {
  ...(stagingBranch ? { pageExtensions: ["staging.tsx", "staging.ts"] } : {}),
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
