/**
 * Browser Supabase client (publishable key + RLS).
 * Matches Supabase Connect prompt; lives under lib/ (not utils/) for this repo.
 * Use only in Client Components.
 */

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
