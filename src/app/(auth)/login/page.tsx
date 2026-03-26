import type { Metadata } from "next";

import { AppLogo } from "@/components/app/logo";
import { scheduleData } from "@/lib/generated/schedule-data";
import { getRuntimeLabel, getRuntimeMode } from "@/lib/runtime/mode";
import { loginAction } from "@/lib/server/actions";

export const metadata: Metadata = {
  title: "Login",
};

const entryPoints = [
  "The schedule is curated as typed semantic app data before runtime.",
  "Traffic lights change the scope of the day without guilt language.",
  "Revision, backlog, GTs, exports, and rollover logic stay locally testable.",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const runtimeMode = getRuntimeMode();

const stats = [
  {
    label: "Schedule Days",
    value: String(scheduleData.daywisePlan.days.length),
    note: "Mapped from the curated semantic schedule data.",
  },
  {
    label: "Subjects",
    value: String(scheduleData.subjectStrategy.subjects.length),
    note: "Strategy data included as first-class metadata.",
  },
  {
    label: "GT Markers",
    value: String(scheduleData.gtTestPlan.tests.length),
    note: "Grand tests preserved as part of the cadence.",
  },
  ];

  return (
    <>
      <section className="panel panel-hero grain reveal-rise relative overflow-hidden p-8 md:p-10">
        <div className="relative z-10">
          <AppLogo />
          <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="eyebrow">Entry Brief</div>
              <h2 className="display mt-3 text-4xl md:text-5xl">
                The plan stays exact. The interface stays human.
              </h2>
              <p className="lead mt-5 max-w-xl">
                This is a focused companion for a hundred difficult days, not a productivity playground. It is built to
                let you tell the truth about pace, recover cleanly, and protect sleep when the day goes off-script.
              </p>
            </div>
            <div className="grid gap-3">
              {stats.map((stat, index) => (
                <article key={stat.label} className={`metric-slab reveal-rise stagger-${index + 1}`}>
                  <div className="metric-label">{stat.label}</div>
                  <div className="metric-value">{stat.value}</div>
                  <p className="metric-note">{stat.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {entryPoints.map((point) => (
              <div key={point} className="note-card p-4 text-sm leading-7 text-(--text-secondary)">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel reveal-rise stagger-2 p-8 md:p-10">
        <div className="eyebrow">Entry Console</div>
        <h2 className="display mt-3 text-3xl md:text-4xl">Enter quietly and work from the day that is actually here.</h2>
        <p className="lead mt-4 text-sm md:text-base">
          No signup funnel. No notifications. Just the seeded account and the live state of the plan.
        </p>

        <div className="note-card mt-6 p-5">
          <div className="eyebrow">{getRuntimeLabel(runtimeMode)}</div>
          <div className="mt-3 space-y-2 text-sm leading-7 text-(--text-secondary)">
            {runtimeMode === "local" ? (
              <>
                <p>
                  Default seeded email: <span className="font-mono text-[var(--foreground)]">aspirant@beside-you.local</span>
                </p>
                <p>
                  Default seeded secret phrase: <span className="font-mono text-[var(--foreground)]">beside-you-2026</span>
                </p>
                <p>Override through `.env.local` if you want different local credentials.</p>
              </>
            ) : (
              <>
                <p>Use the Supabase-seeded credentials created for the single study account.</p>
                <p>The same login stays live across phone and tablet and refreshes through secure session cookies.</p>
              </>
            )}
          </div>
        </div>

        <form action={loginAction} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Email</span>
            <input className="field" type="email" name="email" placeholder="aspirant@beside-you.local" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[var(--muted)]">Secret phrase</span>
            <input className="field" type="password" name="password" placeholder="beside-you-2026" required />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{decodeURIComponent(error)}</p> : null}
          <button className="button-primary w-full" type="submit">
            Enter Beside You
          </button>
        </form>
      </section>
    </>
  );
}
