import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/privacy", "/terms", "/data-deletion", "/contact"], disallow: ["/api/", "/dashboard", "/settings", "/team", "/onboarding", "/tools/", "/analytics", "/media-kit"] },
    sitemap: "https://egg.sooncreator.network/sitemap.xml",
  };
}
