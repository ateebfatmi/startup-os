import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PZ Orbit",
    short_name: "Orbit",
    description: "A spatial operating system for focused startup teams.",
    start_url: "/office",
    display: "standalone",
    background_color: "#173f2b",
    theme_color: "#173f2b",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
