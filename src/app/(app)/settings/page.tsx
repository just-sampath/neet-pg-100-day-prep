import { DevToolbar } from "@/components/app/dev-toolbar";
import { InstallStatusCard } from "@/components/app/install-status-card";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { getEffectiveNow, mutateStore } from "@/lib/data/local-store";
import { APP_DESCRIPTION, APP_VERSION } from "@/lib/domain/app-meta";
import { EXAM_DATE, HARD_BOUNDARY_DATE } from "@/lib/domain/constants";
import { getRuntimeLabel, getRuntimeMode } from "@/lib/runtime/mode";
import { addDaysToDateOnly, getMinutesInTimeZone, IST_TIME_ZONE, toDateOnlyInTimeZone } from "@/lib/utils/date";
import { resetAppStateAction, setDayOneDateAction, setThemeAction } from "@/lib/server/actions";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const runtimeMode = getRuntimeMode();
  const showDevelopmentReset = process.env.NODE_ENV !== "production";
  const { settings, simulatedNow, todayDate, nowIso } = await mutateStore((store) => {
    applyAutomations(store, user.id);
    const now = getEffectiveNow(store);
    return {
      settings: structuredClone(store.userState[user.id].settings),
      simulatedNow: store.dev.simulatedNowIso,
      todayDate: toDateOnlyInTimeZone(now, IST_TIME_ZONE),
      nowIso: now.toISOString(),
    };
  });
  const minDate = process.env.NODE_ENV === "production"
    ? getMinutesInTimeZone(new Date(nowIso), IST_TIME_ZONE) >= 720
      ? addDaysToDateOnly(todayDate, 1)
      : todayDate
    : undefined;

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">Settings</div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl">Control the plan, keep the app quiet.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-(--text-secondary)">{APP_DESCRIPTION}</p>
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
          <p className="mt-2 text-sm text-(--text-secondary)">{EXAM_DATE}</p>
        </div>
        <div className="metric-slab">
          <div className="metric-label">Hard Boundary</div>
          <div className="metric-value text-2xl">August 28, 2026</div>
          <p className="mt-2 text-sm text-(--text-secondary)">{HARD_BOUNDARY_DATE}</p>
        </div>
        <div className="metric-slab">
          <div className="metric-label">Current Theme</div>
          <div className="metric-value text-2xl capitalize">{settings.theme}</div>
          <p className="mt-2 text-sm text-(--text-secondary)">Theme preference persists with your app settings.</p>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Plan setup</h2>
        <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
          Day 1 anchors the full 100-day date map. Change it only if you are intentionally remapping the study calendar.
        </p>
        <form action={setDayOneDateAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grow">
            <span className="mb-2 block text-sm text-[var(--muted)]">Day 1</span>
            <input className="field" type="date" name="dayOneDate" defaultValue={settings.dayOneDate ?? addDaysToDateOnly(todayDate, 1)} min={minDate} />
          </label>
          <input type="hidden" name="theme" value={settings.theme} />
          <button className="button-primary min-h-11" type="submit">
            Save
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
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
        <h2 className="text-xl font-semibold">Backup</h2>
        <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
          Export the active runtime state as JSON.
        </p>
        <a className="button-secondary mt-4 inline-flex min-h-11 items-center" href="/api/export">
          Export JSON
        </a>
      </section>

      {showDevelopmentReset ? (
        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Reset app state</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-(--text-secondary)">
            Clear the current account back to a true first-run state: Day 1 mapping, block progress, revision history,
            backlog, MCQ logs, GT logs, weekly summaries, quote history, and simulated time. The app will sign you out
            immediately after the reset completes.
          </p>
          <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
            This reset applies to the active runtime only: {getRuntimeLabel(runtimeMode)}.
          </p>
          <form action={resetAppStateAction} className="mt-4 grid gap-4 md:max-w-2xl">
            <label className="note-card flex gap-3 p-4 text-sm leading-7 text-(--text-secondary)">
              <input className="mt-1 h-4 w-4 shrink-0 accent-[var(--danger)]" type="checkbox" name="confirmReset" value="yes" required />
              <span>I understand this permanently clears the current account state for this runtime and returns the app to first setup.</span>
            </label>
            <div>
              <button className="button-secondary min-h-11 text-[var(--danger)]" type="submit">
                Reset everything and sign out
              </button>
            </div>
          </form>
        </section>
      ) : null}

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
