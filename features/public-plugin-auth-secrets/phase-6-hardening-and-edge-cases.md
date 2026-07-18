# Phase 6: Hardening & edge cases

> File name: `phase-6-hardening-and-edge-cases.md`. Linked from `overview.md`.

## Purpose

Cover the edge cases called out in discovery and optionally add an ephemeral privacy transform before Anthropic — without storing comments.

## Tasks

- [x] Invalid/expired Figma token → clear API error; do not leak upstream body secrets
- [x] Invalid Anthropic key → clear API error; optional fallback only in demo mode
- [x] Stolen/leaked plugin token → revoke/rotate invalidates immediately
- [x] Password reset via Supabase Auth email flow
- [x] Rate limits: per IP + per plugin token
- [x] Account delete: cascade revoke tokens; wipe ciphertext rows; Auth user delete
- [x] Advisors / security checklist: RLS, view privileges, no service_role in client
- [x] **Stretch:** in-memory **PII redaction / reversible tokenization** before Anthropic (emails, phones, URLs, names as configured) — do **not** replace the prompt with embeddings; do not persist comments or embeddings

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| Vectorization as stretch, ephemeral-only | User wants it if possible; also forbids comment/PII storage |
| PII = regex tokenize + detokenize in classify memory | Easy v1 win; no NER dependency |
| Account delete requires typed email | User confirmation; prevents mis-clicks |
| Dual rate limit (IP + token) | Throttle stolen tokens and shared-IP abuse independently |
| Mock AI fallback only in dev | `DEMO_MODE=fallback` + `NODE_ENV=development`; production surfaces real errors |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| `/reset-password` PPR build | Uncached `getUser()` outside Suspense | Wrapped session gate in Suspense boundary |

## Notes

- Revoke immediacy was already correct (hash lookup + `revoked_at` on every verify/classify).
- Live Supabase Advisors MCP still needs auth — static repo audit recorded in `findings.md`.
