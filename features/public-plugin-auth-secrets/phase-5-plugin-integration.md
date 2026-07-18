# Phase 5: Plugin integration

> File name: `phase-5-plugin-integration.md`. Linked from `overview.md`.

## Purpose

Let plugin users paste their plugin API token (and optional backend URL) so classify calls authenticate as that user.

## Tasks

- [x] Plugin UI/settings: plugin token field (clientStorage); keep backend URL override
- [x] Send `Authorization: Bearer …` on classify `fetch`
- [x] Surface 401/403/invalid-key errors with clear copy
- [x] Update plugin README / in-plugin help: “get token from web profile”
- [x] Smoke test: sign up → save keys → mint token → run analysis in Figma

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| Token in `figma.clientStorage` | Per-user machine storage; not checked into repo |
| Dedicated `POST /api/plugin/verify` | Token gate verifies auth without fetching comments or calling AI |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| Plugin `URL` constructor unavailable in Figma typings | Used string replace to derive verify URL from classify URL | Fixed in `deriveVerifyUrl` |

## Notes

- Figma OAuth login is explicitly out of scope for v1; PAT + plugin token is the path.
