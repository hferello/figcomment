# Phase 1: Supabase foundation

> File name: `phase-1-supabase-foundation.md`. Linked from `overview.md`.

## Purpose

Stand up Supabase Auth + schema + RLS + encryption helpers so later phases can store and use per-user secrets safely under the project’s Data API / query rules.

## Tasks

- [x] Document cloud Supabase setup (email/password Auth, Confirm email, Data API on) — user creates project and supplies keys
- [x] Add Supabase clients in backend: browser (publishable) + **server** (user session) + service_role (server-only)
- [x] Ship schema as SQL (`backend/db/auth-foundation.sql`) applied via Supabase Dashboard SQL Editor — no CLI
- [x] Tables:
  - `profiles` — `id` = `auth.users.id`, display fields (no secrets)
  - `user_secrets` — encrypted Figma token + Anthropic key (ciphertext + nonce/iv + key version); `user_id` FK
  - `plugin_tokens` — `token_hash`, `prefix` (for UI display), `user_id`, `revoked_at`, `last_used_at`, `expires_at` (optional)
- [x] Enable RLS on all exposed tables; policies: users read/write **own** rows only where appropriate
- [x] Column grants: authenticated cannot UPDATE privileged lifecycle columns (`revoked_at`, etc.) directly — use SECURITY DEFINER RPCs / service_role server paths
- [x] Implement `lib/crypto/secrets.ts`: AES-256-GCM encrypt/decrypt with `SECRETS_ENCRYPTION_KEY` (env); never log plaintext
- [x] Document env vars in `documentation.md` (no secrets committed)

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| Ciphertext columns + app decrypt | Aligns with research; see `findings.md` |
| Hash plugin tokens with strong KDF/hash (e.g. SHA-256 of high-entropy token or bcrypt/argon2) | Tokens are high-entropy → HMAC-SHA256 with server pepper is acceptable; prefer peppered hash |
| No Supabase CLI; SQL via Dashboard | User preference; cloud project + hand-applied schema |
| `user_secrets` not granted to `authenticated` | Ciphertext must not be readable via Data API; Phase 2 uses service_role after encrypt |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| Supabase CLI telemetry EPERM in sandbox | Tried `npx supabase init` | Abandoned CLI per user; removed package + `supabase/` folder |

## Notes

- Do **not** put `security definer` functions in exposed schemas without tight `REVOKE`/`GRANT`.
- Never use `user_metadata` for authorization; use `auth.uid()` / app_metadata if needed.
- User still must: create project → run `backend/db/auth-foundation.sql` in SQL Editor → fill `backend/.env.local`.
- Rules 1–5 locked in `overview.md` + SQL header; lifecycle write-guard triggers on `plugin_tokens` / `user_secrets`.
