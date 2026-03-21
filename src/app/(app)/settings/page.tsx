import Link from "next/link";

import { DevToolbar } from "@/components/app/dev-toolbar";
import { InstallStatusCard } from "@/components/app/install-status-card";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { APP_DESCRIPTION, APP_VERSION, STUDY_DOCUMENT_LINKS } from "@/lib/domain/app-meta";
import { EXAM_DATE, HARD_BOUNDARY_DATE } from "@/lib/domain/constants";
import { getRuntimeLabel, getRuntimeMode } from "@/lib/runtime/mode";
import { setDayOneDateAction, setThemeAction } from "@/lib/server/actions";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const runtimeMode = getRuntimeMode();
  const { settings, simulatedNow } = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return {
      settings: structuredClone(store.userState[user.id].settings),
      simulatedNow: store.dev.simulatedNowIso,
    };
  });

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">Settings</div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl">Control the plan, keep the app quiet.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{APP_DESCRIPTION}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="status-badge" data-tone="neutral">
              v{APP_VERSION}
            </span>
            <span className="status-badge" data-tone="neutral">
              {getRuntimeLabel(runtimeMode)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="metric-slab">
          <div className="metric-label">Exam Date</div>
          <div className="metric-value text-2xl">August 30, 2026</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{EXAM_DATE}</p>
        </div>
        <div className="metric-slab">
          <div className="metric-label">Hard Boundary</div>
          <div className="metric-value text-2xl">August 20, 2026</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{HARD_BOUNDARY_DATE}</p>
        </div>
        <div className="metric-slab">
          <div className="metric-label">Current Theme</div>
          <div className="metric-value text-2xl capitalize">{settings.theme}</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Theme preference persists with your app settings.</p>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Plan setup</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          Day 1 anchors the full 100-day date map. Change it only if you are intentionally remapping the study calendar.
        </p>
        <form action={setDayOneDateAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grow">
            <span className="mb-2 block text-sm text-[var(--muted)]">Day 1</span>
            <input className="field" type="date" name="dayOneDate" defaultValue={settings.dayOneDate ?? ""} />
          </label>
          <input type="hidden" name="theme" value={settings.theme} />
          <button className="button-primary min-h-11" type="submit">
            Save
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          Dark mode stays the default night-study surface, but the toggle remains available on both devices.
        </p>
        <form action={setThemeAction} className="mt-4">
          <input type="hidden" name="theme" value={settings.theme === "dark" ? "light" : "dark"} />
          <button className="button-secondary min-h-11" type="submit">
            Switch to {settings.theme === "dark" ? "light" : "dark"}
          </button>
        </form>
      </section>

      <InstallStatusCard />

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Backup & documents</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          Export the active runtime state as JSON, or open the source plan documents directly from the app.
        </p>
        <Link className="button-secondary mt-4 inline-flex min-h-11 items-center" href="/api/export">
          Export JSON
        </Link>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STUDY_DOCUMENT_LINKS.map((link) => (
            <a key={link.href} className="note-card block p-4" href={link.href} target="_blank" rel="noreferrer">
              <div className="eyebrow">{link.label}</div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{link.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">About</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          <p>Version {APP_VERSION}. Quiet by design, single-user by design.</p>
          <p>Schedule and quotes are build-time source data loaded from the repo.</p>
          <p>Sync is realtime in Supabase mode and intentionally local-only in local test mode.</p>
          <p>No push reminders, no streak pressure, no cached offline shadow state.</p>
        </div>
      </section>

      {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={simulatedNow} /> : null}
    </div>
  );
}
