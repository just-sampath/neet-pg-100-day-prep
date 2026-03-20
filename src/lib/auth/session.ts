import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSession, mutateStore, readStore } from "@/lib/data/local-store";
import type { LocalUser } from "@/lib/domain/types";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const SESSION_COOKIE = "beside_you_session";
export const THEME_COOKIE = "beside_you_theme";

function toSupabaseUserRecord(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): LocalUser {
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : user.email?.split("@")[0] || "Aspirant";

  return {
    id: user.id,
    email: user.email || "",
    password: "",
    displayName,
  };
}

async function getCurrentLocalUser(): Promise<LocalUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) {
    return null;
  }

  return store.users[session.userId] ?? null;
}

async function getCurrentSupabaseUser(): Promise<LocalUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? toSupabaseUserRecord(user) : null;
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  return getRuntimeMode() === "supabase" ? getCurrentSupabaseUser() : getCurrentLocalUser();
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

async function loginLocal(email: string, password: string) {
  const user = await mutateStore((store) => {
    return Object.values(store.users).find(
      (candidate) =>
        candidate.email.toLowerCase() === email.trim().toLowerCase() &&
        candidate.password === password,
    );
  });

  if (!user) {
    return { ok: false as const, message: "Those credentials did not match the local test user." };
  }

  const session = await mutateStore((store) => {
    const nextSession = createSession(user.id);
    store.sessions[nextSession.id] = nextSession;
    return nextSession;
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true as const };
}

async function loginSupabase(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false as const,
      message: "Supabase mode is active, but the runtime is missing the required Supabase environment variables.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}

export async function loginUser(email: string, password: string) {
  return getRuntimeMode() === "supabase" ? loginSupabase(email, password) : loginLocal(email, password);
}

async function logoutLocal() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await mutateStore((store) => {
      delete store.sessions[sessionId];
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

async function logoutSupabase() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function logoutUser() {
  if (getRuntimeMode() === "supabase") {
    await logoutSupabase();
    return;
  }

  await logoutLocal();
}
