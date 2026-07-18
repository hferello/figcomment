/**
 * App-level AES-256-GCM for Figma / Anthropic secrets.
 * Master key: SECRETS_ENCRYPTION_KEY (base64-encoded 32 bytes).
 * Never log plaintext or decrypted values.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
/** Bump when rotating SECRETS_ENCRYPTION_KEY and re-encrypting rows. */
export const CURRENT_KEY_VERSION = 1;

export type EncryptedPayload = {
  ciphertext_b64: string;
  nonce_b64: string;
  key_version: number;
};

function loadEncryptionKey(): Buffer {
  const raw = requireEnv("SECRETS_ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `[loadEncryptionKey] SECRETS_ENCRYPTION_KEY must be ${KEY_BYTES} bytes (base64). Got ${key.length}. Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

/**
 * Encrypt a secret string. Returns base64 ciphertext (includes auth tag) + nonce.
 */
export function encryptSecret(
  plaintext: string,
  key_version: number = CURRENT_KEY_VERSION,
): EncryptedPayload {
  console.log("[encryptSecret] started", { key_version, plaintext_length: plaintext.length });

  const key = loadEncryptionKey();
  const nonce = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  console.log("[encryptSecret] completed", {
    key_version,
    ciphertext_bytes: ciphertext.length,
  });

  return {
    ciphertext_b64: ciphertext.toString("base64"),
    nonce_b64: nonce.toString("base64"),
    key_version,
  };
}

/**
 * Decrypt a previously encrypted secret. Throws if auth tag fails or key is wrong.
 */
export function decryptSecret(payload: EncryptedPayload): string {
  console.log("[decryptSecret] started", {
    key_version: payload.key_version,
    ciphertext_length: payload.ciphertext_b64.length,
  });

  if (payload.key_version !== CURRENT_KEY_VERSION) {
    console.error("[decryptSecret] unsupported_key_version", {
      key_version: payload.key_version,
      expected: CURRENT_KEY_VERSION,
    });
    throw new Error(
      `[decryptSecret] Unsupported key_version ${payload.key_version}; expected ${CURRENT_KEY_VERSION}`,
    );
  }

  try {
    const key = loadEncryptionKey();
    const nonce = Buffer.from(payload.nonce_b64, "base64");
    const data = Buffer.from(payload.ciphertext_b64, "base64");

    if (nonce.length !== IV_BYTES) {
      throw new Error(`[decryptSecret] Invalid nonce length: ${nonce.length}`);
    }
    if (data.length <= AUTH_TAG_BYTES) {
      throw new Error("[decryptSecret] Ciphertext too short");
    }

    const auth_tag = data.subarray(data.length - AUTH_TAG_BYTES);
    const encrypted = data.subarray(0, data.length - AUTH_TAG_BYTES);

    const decipher = createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(auth_tag);

    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    console.log("[decryptSecret] completed", {
      key_version: payload.key_version,
      plaintext_length: plaintext.length,
    });

    return plaintext;
  } catch (error) {
    console.error("[decryptSecret] failed", {
      key_version: payload.key_version,
      // Intentionally omit ciphertext / nonce / plaintext from logs
    });
    throw error;
  }
}
