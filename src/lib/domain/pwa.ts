export type InstallGuideState = "installed" | "prompt" | "ios_share_sheet" | "menu_install";

export interface PlatformSnapshot {
  isAppleMobile: boolean;
  isAndroid: boolean;
  isSafari: boolean;
}

export interface InstallGuide {
  state: InstallGuideState;
  title: string;
  body: string;
  steps: string[];
}

export const PWA_MANIFEST_ICONS = [
  {
    src: "/icons/icon-192x192.png",
    sizes: "192x192",
    type: "image/png",
  },
  {
    src: "/icons/icon-512x512.png",
    sizes: "512x512",
    type: "image/png",
  },
  {
    src: "/icons/icon-maskable-192x192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
] as const;

export function detectPlatform(userAgent: string): PlatformSnapshot {
  const normalized = userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/u.test(normalized);
  const isAndroid = normalized.includes("android");
  const isSafari = normalized.includes("safari") && !normalized.includes("chrome") && !normalized.includes("crios");

  return {
    isAppleMobile,
    isAndroid,
    isSafari,
  };
}

export function resolveInstallGuide(input: {
  isStandalone: boolean;
  supportsPrompt: boolean;
  platform: PlatformSnapshot;
}): InstallGuide {
  if (input.isStandalone) {
    return {
      state: "installed",
      title: "Installed and running standalone",
      body: "This device is already using the app without browser chrome.",
      steps: ["Open Beside You from your home screen whenever you want the focused full-screen view."],
    };
  }

  if (input.supportsPrompt) {
    return {
      state: "prompt",
      title: "Install this device",
      body: "Chrome can install Beside You directly as a quiet full-screen app.",
      steps: ["Use the install button below, then pin the app to the home screen if you want one-tap access."],
    };
  }

  if (input.platform.isAppleMobile && input.platform.isSafari) {
    return {
      state: "ios_share_sheet",
      title: "Add to Home Screen from Safari",
      body: "Safari on iPhone and iPad installs the app from the Share sheet.",
      steps: ['Tap "Share".', 'Choose "Add to Home Screen".', 'Open Beside You from the home screen for standalone mode.'],
    };
  }

  return {
    state: "menu_install",
    title: "Install from the browser menu",
    body: "If this browser supports install prompts, the install option will appear in the browser menu.",
    steps: ['Open the browser menu.', 'Choose "Install app" or "Add to Home Screen" when available.'],
  };
}
