import { AutoRefresh } from "@/components/app/auto-refresh";
import { HeaderTitle } from "@/components/app/header-title";
import { NavBar } from "@/components/app/nav-bar";
import { RegisterServiceWorker } from "@/components/app/register-sw";
import { SyncStatus } from "@/components/app/sync-status";
import { requireCurrentUser } from "@/lib/auth/session";
import { readStore } from "@/lib/data/local-store";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { logoutAction } from "@/lib/server/actions";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCurrentUser();
  const runtimeMode = getRuntimeMode();
  const store = await readStore();
  const setupComplete = !!store.userState[user.id]?.settings?.dayOneDate;

  return (
    <main id="main-content" className="app-shell">
      <AutoRefresh runtimeMode={runtimeMode} />
      <RegisterServiceWorker />
      <header className="panel panel-hero overflow-hidden p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <HeaderTitle
            badges={
              <>
                <span className="status-badge" data-tone="neutral">
                  quiet by design
                </span>
                <SyncStatus runtimeMode={runtimeMode} userId={user.id} />
              </>
            }
          />
          <div className="grid gap-3">
            <div className="note-card p-4">
              <div className="eyebrow">Signed In</div>
              <p className="mt-3 text-sm text-(--text-secondary)">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <form action={logoutAction}>
                <button className="button-secondary" type="submit">
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="grid gap-2 text-sm text-(--text-secondary) md:grid-cols-3">
            <p>One aspirant. One source of truth. No social clutter.</p>
            <p>Traffic lights reshape the day without turning the app punitive.</p>
            <p>Manual time travel and cron triggers keep every rule locally testable.</p>
          </div>
        </div>
      </header>
      <div className="mt-5">
        <NavBar setupComplete={setupComplete} />
      </div>
      <div className="mt-6">
        <div className="grid gap-6">{children}</div>
      </div>
    </main>
  );
}
