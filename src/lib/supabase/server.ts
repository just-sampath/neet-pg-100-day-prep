import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/runtime/mode";

export async function createSupabaseServerClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read but not always mutate cookies.
        }
      },
    },
  });
}
