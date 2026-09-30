import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://egg.sooncreator.network";
  return ["", "/privacy", "/terms", "/data-deletion", "/contact"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path ? "monthly" as const : "weekly" as const, priority: path ? 0.5 : 1 }));
}
