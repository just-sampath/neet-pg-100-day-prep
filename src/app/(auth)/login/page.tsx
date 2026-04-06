import type { Metadata } from "next";

import { AppLogo } from "@/components/app/logo";
import { loginAction } from "@/lib/server/actions";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="panel reveal-rise p-8 md:p-10">
      <AppLogo />

      <form action={loginAction} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--muted)]">Email</span>
          <input className="field" type="email" name="email" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--muted)]">Secret phrase</span>
          <input className="field" type="password" name="password" required autoComplete="current-password" />
        </label>
        {error ? <p className="text-sm text-[var(--danger)]">{decodeURIComponent(error)}</p> : null}
        <button className="button-primary w-full" type="submit">
          Enter Beside You
        </button>
      </form>
    </section>
  );
}
