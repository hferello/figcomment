/**
 * Service-role Supabase client — server-only, bypasses RLS.
 * Never import from Client Components or expose via NEXT_PUBLIC_.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
