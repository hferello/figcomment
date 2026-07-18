/**
 * Next.js proxy: refresh Supabase Auth cookies and guard account-only routes.
 *
 * Uses the dashboard-style middleware client helper, plus auth.getUser()
 * (required — the stock Connect snippet returns the response without refreshing).
 */

import { type NextRequest, NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

function redirectWithCookies(url: URL, cookie_source: NextResponse): NextResponse {
  const redirect_response = NextResponse.redirect(url);
  cookie_source.cookies
    .getAll()
    .forEach((cookie) => redirect_response.cookies.set(cookie));
  return redirect_response;
}

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  const { supabase, supabase_response } = createMiddlewareClient(request);

  // Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const refreshed_response = supabase_response();

  if (!user && request.nextUrl.pathname.startsWith("/profile")) {
    return redirectWithCookies(new URL("/login", request.url), refreshed_response);
  }

  if (!user && request.nextUrl.pathname === "/reset-password") {
    return redirectWithCookies(
      new URL("/forgot-password?error=recovery", request.url),
      refreshed_response,
    );
  }

  if (
    user &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup" ||
      request.nextUrl.pathname === "/forgot-password")
  ) {
    return redirectWithCookies(new URL("/profile", request.url), refreshed_response);
  }

  return refreshed_response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
