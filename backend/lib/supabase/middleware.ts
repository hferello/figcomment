/**
 * Supabase client for the Next.js proxy (session refresh).
 * Official dashboard snippet omits getUser() — callers must call it before returning.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/env";

export function createMiddlewareClient(request: NextRequest) {
  let supabase_response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies_to_set, headers) {
          cookies_to_set.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabase_response = NextResponse.next({
            request,
          });
          cookies_to_set.forEach(({ name, value, options }) => {
            supabase_response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabase_response.headers.set(key, value);
          });
        },
      },
    },
  );

  return { supabase, supabase_response: () => supabase_response };
}
