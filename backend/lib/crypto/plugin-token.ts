/**
 * Plugin API token generation and peppered HMAC-SHA256 hashing.
 * Full tokens are shown once at mint; only hash + prefix are stored.
 */

import { createHmac, randomBytes } from "node:crypto";
import { requireEnv } from "@/lib/env";

const TOKEN_PREFIX = "fc_";
const RANDOM_BYTES = 32;
/** Display prefix length including `fc_` (e.g. `fc_a1b2c3d`). */
const DISPLAY_PREFIX_LENGTH = 10;

/** Pepper for HMAC — dedicated env preferred so token hashes rotate independently of AES key. */
function getTokenPepper(): string {
  const pepper = process.env.PLUGIN_TOKEN_PEPPER;
  if (typeof pepper === "string" && pepper.length > 0) {
    return pepper;
  }
  return requireEnv("SECRETS_ENCRYPTION_KEY");
}

export type GeneratedPluginToken = {
  token: string;
  prefix: string;
  token_hash: string;
};

/**
 * Generate an opaque plugin token (`fc_…`), display prefix, and storage hash.
 */
export function generatePluginToken(): GeneratedPluginToken {
  console.log("[generatePluginToken] started");

  const random_part = randomBytes(RANDOM_BYTES).toString("base64url");
  const token = `${TOKEN_PREFIX}${random_part}`;
  const prefix = token.slice(0, DISPLAY_PREFIX_LENGTH);
  const token_hash = hashPluginToken(token);

  console.log("[generatePluginToken] completed", { prefix_length: prefix.length });

  return { token, prefix, token_hash };
}

/**
 * Hash a bearer token for lookup. Uses HMAC-SHA256 with server pepper.
 */
export function hashPluginToken(token: string): string {
  return createHmac("sha256", getTokenPepper()).update(token, "utf8").digest("hex");
}

/**
 * Parse `Authorization: Bearer fc_…` header value.
 * Returns null (not an error) so callers can distinguish missing vs invalid tokens.
 */
export function parseBearerPluginToken(header_value: string | null): string | null {
  if (!header_value) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header_value.trim());
  const token = match?.[1]?.trim();
  if (!token || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  return token;
}
