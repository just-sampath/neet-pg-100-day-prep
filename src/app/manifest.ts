import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/lib/domain/app-meta";
import { PWA_MANIFEST_ICONS } from "@/lib/domain/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beside You",
    short_name: "Beside You",
    description: APP_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "en-IN",
    categories: ["education", "productivity"],
    prefer_related_applications: false,
    icons: [...PWA_MANIFEST_ICONS],
  };
}
