"use client";

import { startTransition, useEffect, useState, useSyncExternalStore } from "react";

import { detectPlatform, resolveInstallGuide } from "@/lib/domain/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const SERVER_PLATFORM = {
  isAppleMobile: false,
  isAndroid: false,
  isSafari: false,
};

function subscribeOnline(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia("(display-mode: standalone)");
  const handleChange = () => callback();

  media.addEventListener?.("change", handleChange);
  window.addEventListener("pageshow", handleChange);
  return () => {
    media.removeEventListener?.("change", handleChange);
    window.removeEventListener("pageshow", handleChange);
  };
}

function getStandaloneSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallStatusCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [platform, setPlatform] = useState(SERVER_PLATFORM);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, () => true);
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPlatform(detectPlatform(navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };

    const onInstalled = () => {
      setInstallPrompt(null);
      setFeedback("Installed. Open Beside You from the home screen for the quiet standalone view.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const guide = resolveInstallGuide({
    isStandalone,
    supportsPrompt: installPrompt !== null,
    platform,
  });

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    startTransition(() => {
      setFeedback(result.outcome === "accepted" ? "Install accepted." : "Install dismissed for now.");
      if (result.outcome === "accepted") {
        setInstallPrompt(null);
      }
    });
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Install & Connection</div>
          <h2 className="mt-3 text-xl font-semibold">{guide.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{guide.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-badge" data-tone={isStandalone ? "green" : "neutral"}>
            {isStandalone ? "Standalone active" : "Browser mode"}
          </span>
          <span className="status-badge" data-tone={isOnline ? "neutral" : "yellow"}>
            {isOnline ? "Online-first" : "No connection"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <ol className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
          {guide.steps.map((step) => (
            <li key={step} className="note-card px-4 py-3">
              {step}
            </li>
          ))}
        </ol>
        {guide.state === "prompt" ? (
          <button className="button-primary min-h-11 px-5" type="button" onClick={handleInstall}>
            Install on this device
          </button>
        ) : null}
      </div>

      <div
        aria-live="polite"
        className="mt-4 note-card p-4 text-sm leading-7 text-[var(--text-secondary)]"
      >
        {feedback ?? "Beside You is online-first. The current screen stays readable offline, but new writes wait for a connection instead of caching stale study state."}
      </div>
    </section>
  );
}
