import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/runtime/mode";

export function createSupabaseBrowserClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  return createBrowserClient(env.url, env.anonKey);
}
