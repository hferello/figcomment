# Findings & Decisions

> **HANDOFF — every agent, before you stop:** Capture discoveries here so the **next agent** (new chat/model) does not lose research.

## Requirements

- Public multi-user Figcomment (not single shared env keys).
- Email/password auth.
- Store encrypted Figma token + Anthropic API key per user.
- Issue separate plugin API token for Figma plugin auth.
- Encrypt secrets in Supabase storage path.
- Do **not** store comments or PII.
- Edge cases: invalid provider keys, leaked plugin token, lost password, rate limits, account delete.
- UI: simple playful DaisyUI.
- Non-goals v1: teams/orgs, Figma OAuth login, billing; vectorization stretch if possible without persistence.
- DB rules: Data API on; schema SQL in Dashboard (no CLI); server Supabase + RLS; service_role/SECURITY DEFINER for privileged lifecycle; tight grants/triggers.

## Research Findings

### Current product state

- Backend is Next.js (`backend/`) with `POST /api/classify`: CORS allowlist, in-memory rate limit, fetches Figma comments via `FIGMA_TOKEN`, classifies via Anthropic env key or mock/fallback.
- Plugin posts `{ file_key }` only; no Authorization header today.
- No Supabase in repo yet; no auth UI.

### Encryption options

1. **App-level AES-256-GCM in Next.js (recommended for v1)**
   - Encrypt before write; store `ciphertext`, `nonce`, `key_version` on `user_secrets`.
   - Master key in Vercel/server env (`SECRETS_ENCRYPTION_KEY`), never in DB, never `NEXT_PUBLIC_`.
   - Decrypt only in server classify / save paths.
   - Threat covered: DB dump, overly broad SELECT, backups → ciphertext only.
   - Threat not covered alone: compromised app server with env key (same as any server-side secret model).

2. **Supabase Vault** ([docs](https://supabase.com/docs/guides/database/vault))
   - Authenticated encryption at rest; decrypt via `vault.decrypted_secrets` view.
   - Project root key managed by Supabase (exportable via Management API for migrations).
   - Must tightly lock privileges on decrypted view; unsuitable to expose to `authenticated` broadly.
   - Better for secrets needed inside SQL; our decrypt happens in Node for Anthropic/Figma HTTP calls.

3. **CipherStash** ([partner](https://supabase.com/partners/catalog/cipherstash), [blog](https://supabase.com/blog/searchable-field-level-encryption-with-cipherstash))
   - App-layer encrypt + ZeroKMS; searchable encrypted metadata; complements RLS.
   - High value when you need `WHERE`/`JOIN` on encrypted PII fields.
   - Per-user API keys are opaque blobs looked up by `user_id` — searchable encryption adds cost/complexity without product benefit in v1.

### Auth notes from Supabase docs

- Frontend/Data API: publishable key + RLS; never expose service_role ([secure data](https://supabase.com/docs/guides/database/secure-data)).
- Figma social login exists ([auth-figma](https://supabase.com/docs/guides/auth/social-login/auth-figma)) but is **out of scope** for v1 (user non-goal).
- Never authorize from editable `user_metadata` in JWT (skill security checklist).

### “Vectorization” vs no-store

- Persisting embeddings of comments **is** storing derived comment content → conflicts with “not storing comments/PII” unless embeddings are discarded immediately.
- Viable stretch: **ephemeral** redaction / tokenization in the classify request memory before calling Anthropic; optionally compute embeddings in-process and discard after the response.
- True enterprise “data never leaves in raw form” may need Anthropic zero-retention / customer agreements — product + legal, not only engineering.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Phased plan (overview + phase-*.md), no task_plan.md | Multi-phase feature; single plan shape |
| Recommend AES-GCM app encryption | Best fit for opaque secrets + server-only decrypt; Vault/CipherStash deferred |
| Plugin Bearer token, hash-at-rest | Standard PAT pattern; fits Figma plugin |
| Schema via SQL file (Dashboard); no Supabase CLI | Matches user’s query-layer rules; user supplies cloud keys |
| Draft user stories in PRD | User skipped providing stories |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Supabase MCP `search_docs` needed auth | Used docs `.md` fetch + web search instead |
| Supabase CLI blocked / unwanted | Removed CLI package and `supabase/` scaffold; schema is `backend/db/auth-foundation.sql` for Dashboard SQL Editor |

## Phase 1 audit (Supabase skill + postgres best-practices) — 2026-07-18

Checked against: RLS docs, column-level security, hardening Data API, security checklist, rules `security-rls-*`, `security-privileges`, `schema-foreign-key-indexes`, `query-partial-indexes`.

| Check | Result |
|-------|--------|
| RLS on all public tables | Pass (+ `FORCE ROW LEVEL SECURITY`) |
| `(select auth.uid())` in policies | Pass |
| Policies scoped `TO authenticated` | Pass |
| SECURITY DEFINER not in exposed schema | Pass (`private.handle_new_user`) |
| `search_path = ''` on definer/invoker helpers | Pass |
| Auth trigger EXECUTE for `supabase_auth_admin` | **Fixed** (was revoked from `public` with no grant → signup would fail) |
| `set_updated_at` least privilege | **Fixed** (DEFINER → INVOKER + explicit EXECUTE) |
| `user_secrets` not granted to authenticated | Pass |
| Lifecycle cols not UPDATEable by authenticated | Pass |
| profiles cannot UPDATE `id` / timestamps | **Fixed** (column grants: UPDATE `display_name` only) |
| FK indexes | Pass (`user_secrets.user_id` unique; `plugin_tokens.user_id` indexed) |
| Partial unique active token | Pass |
| Default privileges opt-in | **Added** (revoke auto-grants for future public objects) |
| service_role not in `NEXT_PUBLIC_` / `server-only` on admin | Pass (added `import "server-only"`) |
| No `user_metadata` in authZ | Pass |
| Live `get_advisors` / execute_sql verify | **Blocked** — Supabase MCP needs auth; user applies SQL in Dashboard |

### Rules 1–5 compliance (user mandate)

| Rule | Status |
|------|--------|
| 1 Data API ON | Documented; schema in `public` + RLS (do not turn API off) |
| 2 SQL schema only | `auth-foundation.sql`; no Drizzle query layer |
| 3 Server Supabase + RLS | `lib/supabase/server.ts` for user-scoped work |
| 4 service_role for privileged | `lib/supabase/admin.ts`; secrets/tokens not client-writable |
| 5 Column grants + lifecycle triggers | Grants + `*_server_writes_only` triggers on secrets/tokens |

Sources: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security), [hardening Data API](https://supabase.com/docs/guides/database/hardening-data-api), [product security](https://supabase.com/docs/guides/security/product-security).

## Resources

- Feature folder: `features/public-plugin-auth-secrets/`
- Classify: `backend/app/api/classify/route.ts`
- Plugin: `plugin/code.ts`, `plugin/ui.html`
- Plugin verify: `backend/app/api/plugin/verify/route.ts`
- Vault: https://supabase.com/docs/guides/database/vault
- CipherStash partner: https://supabase.com/partners/catalog/cipherstash
- CipherStash blog: https://supabase.com/blog/searchable-field-level-encryption-with-cipherstash
- Secure data: https://supabase.com/docs/guides/database/secure-data
- Figma Auth (future): https://supabase.com/docs/guides/auth/social-login/auth-figma

## Visual/Browser Findings

- CipherStash partner catalog page returned minimal content; details taken from CipherStash docs + Supabase blog instead.
- **Hilos UI reference (2026-07-18):** User provided screenshot of hilos.sh “Why hilos” bento (pastel blue/yellow/pink/peach panels, cream bg, serif titles, sans body, black doodle mascots). Spec written to `design-hilos.md`. Owner will supply Figcomment illustrations; use placeholders.
- **Component stack:** DaisyUI removed from plan → shadcn/ui with Base UI primitives + basic components only.
- **Phase 5 plugin auth:** Connect screen gates Analyse UI; token in `figma.clientStorage`; verify via `POST /api/plugin/verify`; classify sends Bearer header. Figma plugin typings omit `URL` — verify URL derived via string replace from classify URL.

## Encryption options report (security + performance)

Audience: “best-in-class eng” criteria — threat model, failure modes, ops cost, latency. Not marketing.

### Shared threat model for Figcomment

| Threat | What breaks |
|--------|-------------|
| T1 DB dump / backup leak | Attacker reads Postgres rows |
| T2 Over-broad Data API / RLS bug | Authenticated or anon client SELECTs secret columns |
| T3 Compromised Next.js host / env | Attacker reads `SECRETS_ENCRYPTION_KEY` + can call decrypt paths |
| T4 Compromised Supabase project key / dashboard | Attacker has SQL as postgres / can read Vault decrypt view |
| T5 Insider at cloud vendor | Provider can access plaintext under their key custody model |
| T6 Log / error leakage | Secrets printed in Vercel/Supabase logs |

Passwords: **never encrypt with our AES**. Supabase Auth stores password **hashes** (not reversible). We only encrypt **Figma + Anthropic tokens**; plugin API tokens are **hashed**.

### Option A — App-level AES-256-GCM (Next.js) ✅ chosen

**How:** Server encrypts before insert; columns hold ciphertext + nonce + key_version; decrypt only in classify / rotate paths; key in Vercel env.

| Lens | Assessment |
|------|------------|
| Security (engineers) | Strong for T1/T2 if ciphertext never granted to `authenticated` for raw read, or if even SELECT returns opaque blobs the client can’t use. Standard pattern (envelope encryption). Matches OWASP “don’t store secrets in plaintext.” |
| Weaknesses | T3 is fatal (one key decrypts all users). Must rotate keys carefully (`key_version`). Easy to accidentally log plaintext. No crypto search needed — good. |
| Performance | Negligible: one AES-GCM op per secret (~µs–ms). Classify latency dominated by Figma + Anthropic HTTP. |
| Ops | Simple: one env secret, no vendor. Key backup/rotation is on you. |
| Verdict | **Best v1 fit** for opaque PATs looked up by `user_id`. |

### Option B — Supabase Vault

**How:** `vault.create_secret` / `vault.decrypted_secrets`; project root key held by Supabase ([docs](https://supabase.com/docs/guides/database/vault)).

| Lens | Assessment |
|------|------------|
| Security | Good for T1 (disk/backup ciphertext). **Weak for T2/T4** if any role can query decrypted view — “encrypt at rest” ≠ “app roles can’t read secrets.” Root key is Supabase-managed (T5). |
| Performance | Decrypt in SQL on read; fine at our scale. |
| Ops | Native; migration of keys between projects needs Management API root-key copy. |
| Verdict | Better for secrets consumed *inside Postgres*. Our consumers are Node HTTP clients → app crypto is cleaner. |

### Option C — CipherStash

**How:** Encrypt in app with ZeroKMS; searchable encrypted metadata; works with RLS ([blog](https://supabase.com/blog/searchable-field-level-encryption-with-cipherstash)).

| Lens | Assessment |
|------|------------|
| Security | Strongest against T4/T5 (provider can’t decrypt). DLAC at decrypt time. |
| Weaknesses | Complexity, vendor dependency, EQL/index footguns on Supabase (seq scans if wrong query form). **Searchable encryption is unused** if we never `WHERE secret = …`. |
| Performance | Extra KMS round-trips on encrypt/decrypt/filter; overkill for 2 secrets/user. |
| Ops | CLI init, schema types, cost, learning curve. |
| Verdict | Defer until multi-tenant searchable PII or “Supabase can’t decrypt” is a hard requirement. |

### Recommendation locked

**AES-256-GCM in Next.js** + hash plugin tokens + Supabase Auth password hashing. Do not put ciphertext columns on paths the browser can SELECT; prefer server-only writes and classify-time decrypt via service role / locked RPC.

## “Vectorize for AI privacy” — research answer

**Short answer: No — that is not how you safely send comments to Anthropic for classification.**

What people usually mean by “vectorize”:

1. Turn text into an **embedding** (array of floats) for similarity search / RAG.
2. Store those vectors in pgvector, retrieve later.

Why that **does not** match Figcomment’s need:

- Claude must **read the comment language** to classify type / critique lens. Sending only vectors is not a supported/useful prompt for this product.
- Embeddings are **not anonymous**. Research (e.g. Tonic / embedding inversion work) shows substantial text/PII can be reconstructed from embeddings; privacy engineers treat embeddings like sensitive text ([Tonic](https://www.tonic.ai/blog/sensitive-data-in-text-embeddings-is-recoverable), [Simple Talk anonymization guide](https://www.red-gate.com/simple-talk/security-and-compliance/how-to-anonymize-pii-in-llm-pipelines-5-key-techniques-explained/)).
- Best practice is the opposite order: **redact/tokenize PII before** embedding or before the LLM sees the prompt — not “vectorize instead of redact.”

What **does** match the user’s intent (“don’t give sensitive info to the AI agent”):

| Technique | Fits classify? |
|-----------|----------------|
| Regex + NER redaction (emails, phones, URLs, tokens) | Yes — stretch in phase 6 |
| Reversible tokenization (`EMAIL_1`) then detokenize labels in response if needed | Yes |
| Strip author handles / keep “Person A” | Yes |
| Anthropic zero-data-retention / enterprise agreement | Yes for enterprise narrative |
| Replace prompt with embeddings only | **No** |

Also already decided: we **do not store** comments or embeddings.

## Figma OAuth — ease and approval

From [Figma OAuth apps docs](https://developers.figma.com/docs/rest-api/oauth-apps/):

| App type | Who can use | Figma review? |
|----------|-------------|---------------|
| Draft | You / plan admins testing | N/A (limited) |
| **Private** | Users in associated team/org | **No review** |
| **Public** | Any Figma user who authorizes | **Yes — Figma reviews before you can authorize general users** |

For a **public** Figcomment product, OAuth is **not “flip a switch”**:

- Create app, client id/secret, redirect URLs, scopes (e.g. `file_comments:read`), PKCE recommended
- Callback server to exchange code (30s expiry) + refresh tokens (~90 day access tokens)
- Submit testing instructions / credentials for reviewers; follow Community Apps Review Guidelines
- Config changes on public apps trigger **re-review**
- Supabase also has a [Figma social login provider](https://supabase.com/docs/guides/auth/social-login/auth-figma) — that is **login as Figma user**, not the same as storing a REST API token for comments; still needs Figma OAuth app credentials

**PAT path (v1):** no Figma app review; user pastes a personal access token. Tradeoff: long-lived user secret + worse UX + Figma has been tightening PAT/rate-limit posture.

**Verdict (user-confirmed 2026-07-18):** Keep OAuth out until the product is successful. v1 priority = get into the plugin with a relatively easy path (paste Figma PAT on web + paste plugin token in Figma).

## Email confirmation (Supabase)

Yes — built-in. Docs: by default users must verify email; disable via project Auth settings (“Confirm email”). With confirmation enabled, `signUp` returns `user` with `session: null` until they click the link. Production guidance also recommends keeping confirmations on ([going into prod](https://supabase.com/docs/guides/platform/going-into-prod)).

App rule: block plugin-token mint and classify until `email_confirmed_at` is set.

## Next.js + Supabase Auth SSR notes (Context7 / official prompt)

- Use `@supabase/ssr` with cookie **`getAll` / `setAll` only** — never legacy `auth-helpers-nextjs` or individual `get`/`set`/`remove`.
- Middleware/proxy must refresh session via `getUser()` and forward cache-control headers when setting auth cookies.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` via `NEXT_PUBLIC_`.

## Env / Vercel (`/env`)

- Vercel CLI present but **not logged in** / project **not linked** → could not `vercel env ls`.
- Added `backend/.env.example` (names only). `.gitignore` already allows `!.env.example`.

## Phase 6 security checklist (static audit — 2026-07-18)

| Check | Result |
|-------|--------|
| `createAdminClient` only in server libs/actions/routes | Pass — no `"use client"` imports |
| `server-only` on admin client | Pass (`lib/supabase/admin.ts`) |
| No `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` | Pass |
| RLS + FORCE on public tables | Pass (schema unchanged) |
| `user_secrets` not granted to authenticated | Pass |
| Lifecycle columns not client-writable | Pass (grants + triggers) |
| Revoked token rejected on verify/classify | Pass (hash lookup + `revoked_at`) |
| Classify never returns upstream error bodies | Pass (status + safe codes only) |
| PII redaction ephemeral only | Pass (`pii-redact.ts` request-local Map) |
| Live Supabase Advisors MCP | Blocked — needs MCP auth |

---
*Update this file after every 2 view/browser/search operations*
