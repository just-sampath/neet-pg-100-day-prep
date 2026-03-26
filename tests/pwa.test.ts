import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { APP_DESCRIPTION, APP_VERSION, PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/lib/domain/app-meta";
import { detectPlatform, PWA_MANIFEST_ICONS, resolveInstallGuide } from "@/lib/domain/pwa";

describe("settings, pwa, and installability", () => {
  it("exposes production-ready manifest metadata and icons", () => {
    const appManifest = manifest();

    expect(appManifest).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: PWA_BACKGROUND_COLOR,
      theme_color: PWA_THEME_COLOR,
      prefer_related_applications: false,
    });
    expect(appManifest.icons).toEqual([...PWA_MANIFEST_ICONS]);
  });

  it("keeps app metadata focused on runtime product details, not source downloads", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(APP_DESCRIPTION).toContain("quiet");
    expect(APP_DESCRIPTION).toContain("NEET PG 2026");
  });

  it("detects Apple Safari install flow separately from Android and desktop flows", () => {
    const iosSafari = detectPlatform(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    const androidChrome = detectPlatform(
      "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );

    expect(iosSafari).toEqual({
      isAppleMobile: true,
      isAndroid: false,
      isSafari: true,
    });
    expect(androidChrome).toEqual({
      isAppleMobile: false,
      isAndroid: true,
      isSafari: false,
    });
  });

  it("resolves the quiet install guidance for the core branches", () => {
    expect(
      resolveInstallGuide({
        isStandalone: true,
        supportsPrompt: false,
        platform: {
          isAppleMobile: false,
          isAndroid: true,
          isSafari: false,
        },
      }).state,
    ).toBe("installed");

    expect(
      resolveInstallGuide({
        isStandalone: false,
        supportsPrompt: true,
        platform: {
          isAppleMobile: false,
          isAndroid: true,
          isSafari: false,
        },
      }).state,
    ).toBe("prompt");

    expect(
      resolveInstallGuide({
        isStandalone: false,
        supportsPrompt: false,
        platform: {
          isAppleMobile: true,
          isAndroid: false,
          isSafari: true,
        },
      }).state,
    ).toBe("ios_share_sheet");

    expect(
      resolveInstallGuide({
        isStandalone: false,
        supportsPrompt: false,
        platform: {
          isAppleMobile: false,
          isAndroid: false,
          isSafari: false,
        },
      }).state,
    ).toBe("menu_install");
  });
});
