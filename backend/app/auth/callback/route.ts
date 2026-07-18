/**
 * Completes Supabase's PKCE email-confirmation flow and writes the session cookies.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES = new Set<string>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

function getSafeNextPath(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/profile";
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return typeof value === "string" && EMAIL_OTP_TYPES.has(value);
}

export async function GET(request: NextRequest) {
  console.log("[authCallback] started");

  const request_url = new URL(request.url);
  const code = request_url.searchParams.get("code");
  const token_hash = request_url.searchParams.get("token_hash");
  const type = request_url.searchParams.get("type");
  const next_path = getSafeNextPath(request_url.searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[authCallback] code_exchange_failed", error);
      const next_path = getSafeNextPath(request_url.searchParams.get("next"));
      const error_path =
        next_path === "/reset-password"
          ? "/forgot-password?error=recovery"
          : "/login?error=confirmation";
      return NextResponse.redirect(new URL(error_path, request.url));
    }

    console.log("[authCallback] completed", { flow: "pkce_code" });
    return NextResponse.redirect(new URL(next_path, request.url));
  }

  if (token_hash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      console.error("[authCallback] token_verification_failed", error);
      const error_path =
        type === "recovery"
          ? "/forgot-password?error=recovery"
          : "/login?error=confirmation";
      return NextResponse.redirect(new URL(error_path, request.url));
    }

    console.log("[authCallback] completed", { flow: "token_hash" });
    return NextResponse.redirect(new URL(next_path, request.url));
  }

  console.error("[authCallback] missing_credentials");
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
