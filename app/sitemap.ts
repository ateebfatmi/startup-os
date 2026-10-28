import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return [
    { url: origin, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/login`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
