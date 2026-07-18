# Phase 3: Authenticated classify

> File name: `phase-3-authenticated-classify.md`. Linked from `overview.md`.

## Purpose

Change `/api/classify` so public plugin use resolves the caller via plugin token, loads that user’s decrypted keys, runs analysis, and returns rows — without persisting comments or PII.

## Tasks

- [x] Require `Authorization: Bearer <plugin_token>` (update CORS allow-headers)
- [x] Resolve token → user (hash lookup); reject revoked/expired; update `last_used_at` via privileged path
- [x] Decrypt user’s Figma + Anthropic keys server-side; fail with clear errors if missing/invalid ciphertext
- [x] Fetch Figma comments with **user** Figma token; classify with **user** Anthropic key
- [x] Keep mock/fallback modes for local demo, but gated (e.g. only when `DEMO_MODE` and no production requirement)
- [x] Confirm request/response path never writes comment bodies, person names, or embeddings to Supabase
- [x] Per-user (or per-token) rate limiting; keep origin allowlist
- [x] Structured logging: user_id / token prefix only — never secrets or comment text

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| Ephemeral comment processing only | Explicit non-storage requirement |
| Remove dependency on shared env FIGMA/AI keys for public path | Multi-tenant product goal |
| Unauthenticated bypass only when `DEMO_MODE=mock` + `NODE_ENV=development` | Local dev without full auth setup; production always requires Bearer |
| Decrypt isolated in `load-for-classify.ts` | Single v1 decrypt path besides admin tooling (none) |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Notes

- Optional stretch (phase 6): privacy transform before Anthropic — still in-memory only.
- Classify error codes: `unauthorized`, `email_not_confirmed`, `missing_figma_token`, `missing_anthropic_key`, `invalid_figma_token`, `classification_failed`
- Phase 5 plugin must send `Authorization: Bearer fc_…` header
