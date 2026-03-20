export type AppRuntimeMode = "local" | "supabase";

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupabasePublicEnv() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabasePublicEnv() {
  return Boolean(getSupabasePublicEnv());
}

export function getRuntimeMode(): AppRuntimeMode {
  const explicit = clean(process.env.BESIDE_YOU_RUNTIME);

  if (explicit === "local") {
    return "local";
  }

  if (explicit === "supabase") {
    if (!hasSupabasePublicEnv()) {
      throw new Error(
        "BESIDE_YOU_RUNTIME=supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }
    return "supabase";
  }

  return hasSupabasePublicEnv() ? "supabase" : "local";
}

export function getRuntimeLabel(mode: AppRuntimeMode) {
  return mode === "supabase" ? "Supabase sync mode" : "Local test mode";
}
