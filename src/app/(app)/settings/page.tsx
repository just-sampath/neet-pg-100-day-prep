import Link from "next/link";

import { DevToolbar } from "@/components/app/dev-toolbar";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { setDayOneDateAction, setThemeAction } from "@/lib/server/actions";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
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
        <h1 className="display mt-3 text-3xl">Control the plan, keep the app quiet.</h1>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Day 1 date</h2>
        <form action={setDayOneDateAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grow">
            <span className="mb-2 block text-sm text-[var(--muted)]">Day 1</span>
            <input className="field" type="date" name="dayOneDate" defaultValue={settings.dayOneDate ?? ""} />
          </label>
          <input type="hidden" name="theme" value={settings.theme} />
          <button className="button-primary" type="submit">
            Save
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Theme</h2>
        <form action={setThemeAction} className="mt-4">
          <input type="hidden" name="theme" value={settings.theme === "dark" ? "light" : "dark"} />
          <button className="button-secondary" type="submit">
            Switch to {settings.theme === "dark" ? "light" : "dark"}
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Data export</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Export the current local user state as JSON for backup or inspection.</p>
        <Link className="button-secondary mt-4 inline-flex" href="/api/export">
          Export JSON
        </Link>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">About</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          <p>Exam date is fixed to August 30, 2026.</p>
          <p>Hard schedule boundary is August 20, 2026.</p>
          <p>Schedule and quotes are build-time source data loaded from the repo.</p>
        </div>
      </section>

      {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={simulatedNow} /> : null}
    </div>
  );
}
