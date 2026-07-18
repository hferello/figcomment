# Phase 2: Secrets & plugin tokens

> File name: `phase-2-secrets-and-plugin-tokens.md`. Linked from `overview.md`.

## Purpose

Let an authenticated user save Figma + Anthropic credentials and mint/rotate/revoke a plugin API token — with plaintext secrets never readable via the Data API.

## Tasks

- [x] Server actions / route handlers: verify session via **server** Supabase client (RLS); write secrets/tokens via **`createAdminClient()` (service_role)** only — not Drizzle, not browser client
- [x] Upsert encrypted secrets (encrypt in Next.js → insert ciphertext)
- [x] After save, UI shows only masked status (“saved”) — never re-display full keys from DB
- [x] Enforce **one active plugin token per user** (mint while active → reject or require rotate)
- [x] Mint plugin token: generate opaque token (`fc_…`), store hash + short prefix, return **full token once**
- [x] Rotate = revoke old + mint new; revoke sets `revoked_at` via privileged service_role path
- [x] Show current token metadata: prefix, created_at, last_used_at — never hash or full secret (server client + RLS SELECT grants OK)
- [x] Block mint/classify until `auth.users.email_confirmed_at` is set
- [x] Validate: reject empty keys; optional live ping to Figma/Anthropic on save (nice-to-have)
- [x] Ensure classify path is the **only** place that decrypts Figma/Anthropic keys (besides admin tooling none in v1)

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| Secrets written only through Next.js server with encrypt-then-insert | Client never sends ciphertext it computed; server owns crypto key |
| Plugin auth via `Authorization: Bearer <plugin_token>` | Fits Figma plugin `fetch`; no cookie jar in plugin |
| Server actions (not REST routes) for web profile flows | Phase 4 Hilos UI consumes actions directly; classify verify helper ready for Phase 3 |
| HMAC-SHA256 + `PLUGIN_TOKEN_PEPPER` (fallback `SECRETS_ENCRYPTION_KEY`) | High-entropy tokens; peppered hash at rest |
| Live provider ping on save deferred | Nice-to-have; validation is non-empty only in v1 |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Notes

- Payments/status-style rule from user: even without billing, treat token lifecycle columns as privileged (triggers / RPCs / service_role).
- Server actions: `app/actions/secrets.ts`, `app/actions/plugin-tokens.ts`
- Token verify helper for Phase 3: `lib/plugin-tokens/verify.ts`
