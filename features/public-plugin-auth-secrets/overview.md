# Plan overview: public-plugin-auth-secrets

> **When you finish a phase:** Run the **Mandatory task: close out** in the `/feature` skill—update **this file’s phase table** and the matching **`phase-*.md`** so status stays in sync, then **`progress.md`** (and the rest per that checklist).

## Goal

Public users can sign up, store encrypted Figma + Anthropic credentials, receive a plugin API token, and run a successful Figcomment analysis from Figma — without the backend relying on a single shared env key.

## Phases

| # | Phase | Summary | Status |
|---|--------|---------|--------|
| 1 | [Supabase foundation](phase-1-supabase-foundation.md) | Auth, schema SQL (Dashboard), RLS, grants, encryption primitives | complete |
| 2 | [Secrets & plugin tokens](phase-2-secrets-and-plugin-tokens.md) | Profile secret upsert, plugin token issue/rotate/revoke (hash-only storage) | complete |
| 3 | [Authenticated classify](phase-3-authenticated-classify.md) | `/api/classify` validates plugin token, decrypts per-user keys, never persists comments | complete |
| 4 | [Hilos-inspired web UI](phase-4-hilos-web-ui.md) | Auth + profile via shadcn/Base UI matching [hilos.sh](https://hilos.sh) (`design-hilos.md`) | complete |
| 5 | [Plugin integration](phase-5-plugin-integration.md) | Plugin accepts user plugin token and sends it on classify requests | complete |
| 6 | [Hardening & edge cases](phase-6-hardening-and-edge-cases.md) | Invalid keys, revoke, password reset, rate limits, account delete; optional ephemeral privacy transform | complete |

**Current phase:** 6 — complete (feature shipped)

## DB access rules (mandatory — do not regress)

1. **Data API ON**
2. **SQL for schema only** (Dashboard SQL file / migrations) — not the main query layer
3. **Server-side Supabase client** for user-scoped reads/writes under **RLS**
4. **`service_role` / private SECURITY DEFINER RPCs** for secrets, token mint/revoke, status/lifecycle, payments — anything that must not be client-writable
5. **Tight column grants + triggers** on lifecycle tables from day one (no money tables in v1; same pattern when billing lands)

## Decisions (global)

| Decision | Rationale |
|----------|-----------|
| Supabase Auth email/password | Matches product ask; Data API + RLS-friendly sessions |
| Confirm email ON before mint/classify | User requirement; Supabase “Confirm email” exists (default on for new projects) |
| Data API ON | Explicit product/DB rule #1 |
| SQL schema only (Dashboard file; no CLI required) | Rule #2 — queries via Supabase clients, not Drizzle query layer |
| App-level AES-256-GCM for Figma + Anthropic secrets | Confirmed after encryption report in `findings.md` |
| Encrypt scope = provider tokens only; passwords via Supabase Auth hashing | User clarification |
| One plugin token per user (rotate replaces) | User decision |
| Plugin token hash-only at rest | Standard PAT pattern |
| AI privacy = in-memory redact/tokenize, not vectorize-as-prompt | Research: embeddings ≠ safe Claude input; see `findings.md` |
| Figma OAuth **only after product success** | User: ship plugin UX first (PAT + plugin token); OAuth later if traction |
| UI = Hilos + **Tailwind** `@theme` + shadcn/Base UI | Base type **18px**; scale 12…96; no DaisyUI; `design-hilos.md` |
| v1 non-goals: teams/orgs, Figma OAuth, billing | Thin first ship; easy-to-use plugin path |
| Env template at `backend/.env.example` | User creates Supabase project |

## Errors (global)

| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Notes

- Existing backend today: single `FIGMA_TOKEN` + `AI_PROVIDER_KEY`/`ANTHROPIC_API_KEY` from env; `/api/classify` has CORS + in-memory rate limit but **no user auth** (`backend/app/api/classify/route.ts`).
- Plugin calls `POST` with `{ file_key }` only (`plugin/code.ts`).
- Reassessment (Phase 0.3) logged in `progress.md`; open judgment calls listed there and in PRD §9.
