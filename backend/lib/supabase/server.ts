/**
 * Server Supabase client bound to the user session cookies (RLS as that user).
 * Matches Supabase Connect prompt shape; cookie store is resolved inside so
 * callers can `await createClient()` without plumbing cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

export async function createClient() {
  const cookie_store = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookie_store.getAll();
      },
      setAll(cookies_to_set, _headers) {
        try {
          cookies_to_set.forEach(({ name, value, options }) => {
            cookie_store.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — safe to ignore when proxy refreshes sessions.
        }
      },
    },
  });
}
