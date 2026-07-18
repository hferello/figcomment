# Product Requirements Document: public-plugin-auth-secrets

## 1. Introduction/Overview

Figcomment today runs as a single-tenant demo: the Next.js backend uses shared environment variables for Figma and Anthropic, and the Figma plugin calls `/api/classify` without per-user credentials. This feature makes Figcomment usable by the general public by adding email/password accounts, encrypted per-user API credentials, and a separate plugin API token used inside Figma to authenticate analysis runs.

## 2. Goals

1. Any designer can create an account with email/password.
2. Users can store their Figma personal access token and Anthropic API key encrypted at rest.
3. Users receive a plugin API token they can paste into the Figma plugin to prove identity.
4. Authenticated plugin requests successfully fetch that user’s file comments and return classified rows.
5. Comment text and other PII are **not** stored in Supabase.
6. Follow the project’s Supabase access patterns (Data API on, schema via SQL in Dashboard, RLS via server client, privileged RPCs for lifecycle).

## 3. User Stories

*(Drafted after user skipped providing stories.)*

1. As a designer, I want to sign up with email and password so I can use Figcomment without sharing someone else’s API keys.
2. As a designer, I want to save my Figma token and Anthropic key in my profile so the backend can call those services on my behalf.
3. As a designer, I want a plugin token I can paste into Figma so the plugin can verify me without putting my Anthropic/Figma secrets in the plugin.
4. As a designer, I want to rotate or revoke my plugin token so a leaked token stops working.
5. As a designer, I want to run analysis from the plugin and get a classified table so I can review feedback on the canvas.
6. As an enterprise-minded user, I want comment content handled carefully (and ideally privacy-transformed) when sent to Anthropic so sensitive design discussions are less exposed — without the product retaining that content.

## 4. Functional Requirements

1. **FR-1 Auth:** Users can sign up, log in, log out, and reset password (Supabase Auth email/password).
2. **FR-2 Secret storage:** Authenticated users can create/update Figma token and Anthropic API key; values are encrypted before persistence; UI does not re-show full secrets after save.
3. **FR-3 Plugin token:** Authenticated users can mint, view metadata (prefix, dates), rotate, and revoke plugin tokens; full token shown only at mint time; only hash stored.
4. **FR-4 Classify auth:** `POST /api/classify` requires a valid, non-revoked plugin Bearer token.
5. **FR-5 Per-user providers:** Classify uses the authenticated user’s decrypted Figma + Anthropic credentials (not shared env keys) for the public path.
6. **FR-6 No comment persistence:** Comment bodies, author names, and embeddings are not written to the database.
7. **FR-7 Edge handling:** Invalid provider keys, revoked tokens, rate limits, and account deletion behave with clear errors / cleanup.
8. **FR-8 Web UI:** Hilos-inspired Tailwind screens using basic shadcn/Base UI components for auth, profile secrets, and plugin tokens.
9. **FR-9 Plugin:** Plugin stores and sends the plugin token on classify requests.
10. **FR-10 Security baseline:** RLS on exposed tables; no `service_role` in client; privileged lifecycle via server/service_role or SECURITY DEFINER RPCs; tight column grants.

## 5. Non-Goals (Out of Scope)

1. Team / organization accounts and shared workspaces.
2. Figma OAuth social login (Supabase Figma Auth provider).
3. Billing / subscriptions / metering UI.
4. Persisting analysis history, comment archives, or RAG corpora of comments.
5. CipherStash searchable encryption (deferred unless requirements change).
6. Full enterprise compliance packaging (SSO, DPA UI, audit exports) — future.

**Stretch (not required for acceptance):** ephemeral privacy transform / “vectorization” before Anthropic, with zero persistence.

## 6. Design Considerations (Optional)

- Visual system: match [hilos.sh](https://hilos.sh) — warm cream canvas, pastel flat bento panels, serif display + sans body, thick-line doodle illustration style.
- Full tokens + checklist: [`design-hilos.md`](design-hilos.md). Screenshot reference captured in Cursor assets.
- Illustrations: owner will create; implementation uses labeled placeholders until then.
- Styling: **Tailwind CSS** with `@theme` tokens; **shadcn/ui + Base UI** (basic components only); no DaisyUI.
- Type/spacing scale: base **18px**; steps `12, 14, 18, 21, 24, 36, 48, 56, 63, 72, 96` (see `design-hilos.md`).
- Theme must not look like default purple/dashboard shadcn.
- Landing: brand-forward first viewport + CTA into signup/login.
- Copy-once token UX (password-manager friendly).

## 7. Technical Considerations (Optional)

### Database & access rules (mandatory)

1. Data API **on**.
2. SQL (Dashboard file / migrations) for **schema only** — not the main query layer unless there is a strong reason. (Drizzle allowed only as schema tooling; Figcomment uses SQL file + Supabase clients.)
3. Server-side Supabase client for user-scoped reads/writes under **RLS**.
4. `service_role` / private SECURITY DEFINER RPCs for privileged lifecycle (token revoke, secrets, payments/status) — anything that must not be client-writable.
5. Tight column grants + triggers on lifecycle-sensitive columns from day one (even before payments exist).

### Encryption recommendation (research)

| Option | Pros | Cons | Fit for v1 |
|--------|------|------|------------|
| **Next.js AES-256-GCM** (recommended) | App holds key; DB stores ciphertext; decrypt only on server for classify | Key management / rotation is app responsibility; no SQL search on secrets | **Best** — we never need to query *by* secret value |
| **Supabase Vault** | Encrypted at rest in Postgres; project key managed by Supabase | Anyone who can query `vault.decrypted_secrets` (or overly broad privileges) sees plaintext; Supabase holds root key | Good for app-wide secrets; weaker “zero trust of DB readers” story for per-user PATs |
| **CipherStash** | Field-level encryption; searchable; keys via ZeroKMS; works with RLS | Extra vendor, EQL setup, overkill when secrets are opaque blobs never searched | Defer |

Sources: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [CipherStash × Supabase](https://supabase.com/partners/catalog/cipherstash), [CipherStash searchable encryption blog](https://supabase.com/blog/searchable-field-level-encryption-with-cipherstash), [Supabase secure data](https://supabase.com/docs/guides/database/secure-data).

### Current codebase anchors

- Classify route: `backend/app/api/classify/route.ts` (env keys, no user auth).
- Plugin fetch: `plugin/code.ts` → `POST` `{ file_key }` to `/api/classify`.

## 8. Success Metrics

**Primary acceptance (user-stated):** Someone can sign up, store keys in their profile, get a token for Figma, and run a successful analysis.

Secondary:

- Revoked token cannot classify.
- DB inspection shows ciphertext / hashes only for secrets and plugin tokens.
- No comment rows in any table after a successful run.

## 9. Open Questions

Resolved 2026-07-18:

1. **Encryption:** App-level AES-256-GCM (confirmed after security/performance report).
2. **“Vectorize” intent:** User wanted safer AI payloads without sensitive info — correct pattern is **PII redaction/tokenization in-memory**, not sending embeddings to Claude. Stretch task reframed in phase 6.
3. **Plugin tokens:** One active token per user.
4. **Email confirmation:** Required; use Supabase Confirm email (keep enabled).
5. **Supabase project:** User will create; use `backend/.env.example`.

Still open (non-blocking for Phase 1):

- Whether to add Anthropic zero-data-retention / enterprise agreements later (legal/product, not schema).

**Post-success (explicitly not v1):** Public Figma OAuth (requires Figma app review) — revisit only if the plugin gains traction.
