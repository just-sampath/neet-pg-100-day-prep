import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beside You",
    short_name: "Beside You",
    description: "A calm NEET PG 2026 study companion.",
    start_url: "/today",
    display: "standalone",
    background_color: "#070b12",
    theme_color: "#070b12",
    icons: [
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
