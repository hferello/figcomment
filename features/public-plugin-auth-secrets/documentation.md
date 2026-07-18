# Documentation: public-plugin-auth-secrets

> **HANDOFF:** Update when routes, env vars, APIs, or user flows change.

## Overview

Multi-user auth and encrypted credential storage so the Figcomment Figma plugin can be used by the public. Phases 1–6 are in place: schema, secrets/tokens, authenticated classify, the public web UI, plugin token integration, and hardening.

## What Was Built (Phase 1)

| Piece | Path |
|-------|------|
| Schema + RLS + grants | [`backend/db/auth-foundation.sql`](../../backend/db/auth-foundation.sql) |
| Browser client | `backend/lib/supabase/client.ts` (Connect prompt’s `utils/supabase/client`) |
| Server (user session) client | `backend/lib/supabase/server.ts` |
| Proxy/middleware helper | `backend/lib/supabase/middleware.ts` |
| Service-role client | `backend/lib/supabase/admin.ts` |
| Env helpers | `backend/lib/env.ts` |
| AES-256-GCM | `backend/lib/crypto/secrets.ts` |
| Session refresh | `backend/proxy.ts` (Next.js 16; calls `getUser()` — required) |
| Env template | [`backend/.env.example`](../../backend/.env.example) → copy to `.env.local` |

## What Was Built (Phase 2)

| Piece | Path |
|-------|------|
| Session guards | `backend/lib/auth/require-session.ts`, `backend/lib/auth/action-error.ts` |
| Plugin token crypto | `backend/lib/crypto/plugin-token.ts` |
| Secrets upsert + masked status | `backend/lib/user-secrets/service.ts` |
| Token mint / rotate / revoke | `backend/lib/plugin-tokens/service.ts` |
| Bearer verify (Phase 3) | `backend/lib/plugin-tokens/verify.ts` |
| Server actions — secrets | `backend/app/actions/secrets.ts` |
| Server actions — plugin tokens | `backend/app/actions/plugin-tokens.ts` |

### Server actions (web UI — Phase 4)

| Action | Auth | Returns |
|--------|------|---------|
| `saveUserSecretsAction({ figma_token?, anthropic_key? })` | Email confirmed | `{ figma_saved, anthropic_saved }` — never plaintext |
| `mintPluginTokenAction()` | Email confirmed | Full `fc_…` token **once** + metadata |
| `rotatePluginTokenAction()` | Email confirmed | Revokes old, returns new full token once |
| `revokePluginTokenAction()` | Email confirmed | `{ revoked: true }` |

Mint is rejected when an active token exists (use rotate). Mutations use Server Actions and `createAdminClient()`. The profile Server Component loads masked secret status and token metadata directly through server services; token metadata still uses the session client + RLS.

## What Was Built (Phase 3)

| Piece | Path |
|-------|------|
| Classify-only decrypt | `backend/lib/user-secrets/load-for-classify.ts` |
| Email confirmed gate (API) | `backend/lib/auth/email-confirmed.ts` |
| Authenticated classify route | `backend/app/api/classify/route.ts` |

### POST `/api/classify`

| Header | Required | Notes |
|--------|----------|-------|
| `Authorization` | Yes (except dev mock bypass) | `Bearer fc_…` plugin token |
| `Content-Type` | Yes | `application/json` |
| Body | `{ "file_key": "…" }` | Figma file key |

**Auth flow:** verify Bearer → check `email_confirmed_at` → decrypt user secrets → Figma fetch + Anthropic classify → touch `last_used_at`. No DB writes for comment content.

**Error codes:** `401 unauthorized`, `403 email_not_confirmed`, `400 missing_figma_token` / `missing_anthropic_key` / `invalid_figma_token` / `invalid_anthropic_key`, `502 classification_failed`, `429 rate_limited`

**Local dev bypass:** `DEMO_MODE=mock` + `NODE_ENV=development` skips Bearer auth and uses seeded comments (no shared env keys on authenticated path).

**Rate limit:** independent IP + plugin-token buckets (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`; verify may use `RATE_LIMIT_VERIFY_MAX`).

## What Was Built (Phase 4)

| Piece | Path |
|-------|------|
| Hilos/Tailwind theme | `backend/app/globals.css` |
| Landing | `backend/app/page.tsx` |
| Signup + login | `backend/app/signup`, `backend/app/login` |
| Email confirmation callback | `backend/app/auth/callback/route.ts` |
| Protected profile | `backend/app/(private)/profile` (public URL remains `/profile`) |
| Auth client islands | `backend/components/auth` |
| Secrets + token client islands | `backend/components/profile` |
| Basic shadcn/Base UI components | `backend/components/ui` |
| Owner-art placeholders | `backend/public/illustrations` |

The callback accepts both a PKCE `code` and Supabase's recommended SSR `token_hash` + `type` flow. `/profile` is protected in `proxy.ts` and again in its Server Component.

## What Was Built (Phase 5)

| Piece | Path |
|-------|------|
| Plugin token verify route | `backend/app/api/plugin/verify/route.ts` |
| Connect screen (token gate) | `plugin/ui.html` |
| Token storage + Bearer classify | `plugin/code.ts` |
| Public use docs | root `README.md` |

### POST `/api/plugin/verify`

| Header | Required | Notes |
|--------|----------|-------|
| `Authorization` | Yes | `Bearer fc_…` plugin token |
| `Content-Type` | Yes | `application/json` |

**Flow:** verify Bearer → check `email_confirmed_at` → return `{ ok: true, prefix }`. No Figma fetch or Anthropic call.

**Error codes:** `401 unauthorized`, `403 email_not_confirmed`, `403 forbidden_origin`

### Figma plugin flow

1. **Connect screen** — paste plugin token from `/profile`; optional backend URL override.
2. Plugin calls `POST /api/plugin/verify` before saving token to `figma.clientStorage`.
3. **Analyse screen** — existing Table / Sticky notes / CSV actions unchanged.
4. Classify sends `Authorization: Bearer fc_…` on `POST /api/classify`.
5. **Change token** returns to Connect and clears stored token.

**Storage keys:** `plugin_token`, `backend_url` (optional override; default `http://localhost:3000/api/classify`).

**Plugin error copy:** maps `unauthorized`, `email_not_confirmed`, `missing_figma_token`, `missing_anthropic_key`, `invalid_figma_token`, `invalid_anthropic_key`, and `rate_limited` to actionable messages.

## What Was Built (Phase 6)

| Piece | Path |
|-------|------|
| Dual rate limits | `backend/lib/rate-limit.ts` (classify + verify) |
| PII redact/detokenize | `backend/lib/classify/pii-redact.ts` |
| Account delete service | `backend/lib/account/delete-user.ts` |
| Account delete action | `backend/app/actions/account.ts` |
| Forgot / reset password | `backend/app/forgot-password`, `backend/app/reset-password` |
| Profile danger zone | `backend/components/profile/delete-account-section.tsx` |

### Password reset flow

1. `/forgot-password` → `resetPasswordForEmail` → email link → `/auth/callback?next=/reset-password`
2. `/reset-password` → `updateUser({ password })` → `/profile`

Recovery callback failures redirect to `/forgot-password?error=recovery`.

### Account delete flow

1. Profile danger zone → type account email → `deleteAccountAction`
2. Server wipes `user_secrets` + `plugin_tokens`, then `auth.admin.deleteUser` (cascades `profiles`)
3. Client signs out → `/`

### Classify hardening

- Figma 401/403 → `invalid_figma_token` (no upstream body in response)
- Anthropic auth failure → `invalid_anthropic_key`
- Mock AI fallback only when `DEMO_MODE=fallback` **and** `NODE_ENV=development`
- Ephemeral PII tokenization before Anthropic; detokenize rows before response
- Rate limits: independent IP + plugin-token buckets on classify and verify

**Error codes (added):** `invalid_figma_token`, `invalid_anthropic_key`

**Env (optional):** `RATE_LIMIT_VERIFY_MAX` — lower cap for `/api/plugin/verify` (defaults to `RATE_LIMIT_MAX`).

## How It Works

```
Designer → Web (Phase 4) → Supabase Auth (email/password)
                ↓
         Save Figma + Anthropic keys (Phase 2)
                ↓
         Next.js encrypts (AES-GCM) → user_secrets (ciphertext)
                ↓
         Mint plugin token → store hash → show token once (Phase 2)
                ↓
Figma plugin → Authorization: Bearer <plugin_token> → POST /api/classify (Phase 3/5)
                ↓
         Verify token → decrypt user keys → Figma + Anthropic (ephemeral) → JSON rows
                ↓
         No comment/PII rows written to DB
```

### Env vars (server)

Copy [`backend/.env.example`](../../backend/.env.example) → `backend/.env.local` and fill from your Supabase project (Settings → API).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + user-session server client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server privileged ops only — never `NEXT_PUBLIC_` |
| `SECRETS_ENCRYPTION_KEY` | AES-256-GCM master key (`openssl rand -base64 32`) |
| `PLUGIN_TOKEN_PEPPER` (optional) | Extra secret for token hashing (Phase 2) |
| `NEXT_PUBLIC_APP_URL` | Auth email redirect base |
| Existing demo vars | `DEMO_MODE`, CORS, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, optional `RATE_LIMIT_VERIFY_MAX` |

## Setup and usage

1. Create a Supabase cloud project.
2. Auth → Providers → Email: enable; keep **Confirm email** on.
3. Confirm **Data API** stays on (default).
4. In Dashboard → **SQL Editor**, paste and run `backend/db/auth-foundation.sql`.
5. Fill `backend/.env.local` from `.env.example` (URL, publishable/anon key, service_role, encryption key).
6. Auth → URL Configuration: set the production Site URL and allow `http://localhost:3000/auth/callback` for local development.
7. For SSR confirmation, set the **Confirm signup** email link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` so the existing callback can verify the token hash. The stock PKCE `code` callback is also supported.
8. Restart `next dev` after env changes.
9. Visit `/signup`, confirm the email, then use `/profile` to save provider keys and mint the copy-once plugin token.

## DB access rules (how Phase 1 implements them)

| # | Rule | Implementation |
|---|------|----------------|
| 1 | Data API ON | Project setting (do not disable). Schema stays in `public` with RLS. |
| 2 | SQL for schema only | `backend/db/auth-foundation.sql` — no Drizzle/ORM query layer. |
| 3 | Server Supabase + RLS | `lib/supabase/server.ts` (user session). Profiles via RLS. |
| 4 | Privileged via service_role | `lib/supabase/admin.ts` (`server-only`) for `user_secrets` + token mint/revoke/last_used. Private SECURITY DEFINER only for triggers/helpers (not exposed RPCs). |
| 5 | Column grants + lifecycle triggers | Grants block client UPDATEs; triggers `*_server_writes_only` reject authenticated/anon writes even if grants slip. |

## Schema access model

| Table | `authenticated` (Data API) | Server `service_role` |
|-------|----------------------------|------------------------|
| `profiles` | SELECT own; INSERT `(id, display_name)`; UPDATE `(display_name)` only | Full |
| `user_secrets` | No grants + write-guard trigger | Full (encrypt in Next.js, then write) |
| `plugin_tokens` | SELECT metadata only (not `token_hash`); no INSERT/UPDATE/DELETE + write-guard trigger | Full (mint/revoke/last_used) |

Lifecycle columns (`revoked_at`, `last_used_at`, `expires_at`, `token_hash`) are not client-writable.

**Column privileges:** do not `select *` on `plugin_tokens` from the browser — list columns explicitly.

**Phase 2+ query rule:** use `createClient()` (server, RLS) for profile UI; use `createAdminClient()` only for secrets/token lifecycle. Never introduce Drizzle/ORM as the read path unless there is a strong reason.

**After applying SQL:** sign up a test user and confirm a `profiles` row is created (auth trigger).

## Notes

- Passwords are hashed by Supabase Auth — we do not AES-encrypt passwords.
- AI privacy stretch = redact/tokenize comment text in memory before Anthropic (Phase 6 — shipped in `lib/classify/pii-redact.ts`).
- Web UI: Hilos look ([`design-hilos.md`](design-hilos.md)) with **shadcn/ui + Base UI** (Phase 4).
- Acceptance path must not depend on shared `FIGMA_TOKEN` / `ANTHROPIC_API_KEY` for public users.
- See `prd.md` and `overview.md` for scope and phase order.
