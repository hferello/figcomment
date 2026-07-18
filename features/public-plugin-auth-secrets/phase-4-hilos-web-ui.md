# Phase 4: Hilos-inspired web UI (shadcn + Base UI)

> File name: `phase-4-hilos-web-ui.md`. Linked from `overview.md`.  
> Design spec: [`design-hilos.md`](design-hilos.md) — match [hilos.sh](https://hilos.sh).  
> Stack: **shadcn/ui** with **Base UI** primitives — no DaisyUI.

## Purpose

Ship signup, login, profile secrets, and plugin token management in a Hilos-like visual system using Tailwind + shadcn (Base UI), with placeholder slots for owner-made illustrations.

## Tasks

- [x] Init **Tailwind CSS** + shadcn in `backend`: current CLI uses `npx shadcn@latest init -d --base base`
- [x] Configure `@theme` per `design-hilos.md`: base `html { font-size: 18px }`, scale `12…96` for `--text-fc-*`, `--spacing-fc-*`, radii; Hilos colours as `--color-fc-*`
- [x] Add only **basic** shadcn components: Button, Input, Label, Form/Field, Alert, Separator — prefer Tailwind panels over heavy Cards
- [x] Restyle shadcn defaults to cream/ink/pastel + fc scale (no purple/glow dashboard look)
- [x] Load serif + sans via `next/font` into `--font-display` / `--font-sans`
- [x] Restyle landing (`app/page.tsx`) brand-forward + cream/bento language
- [x] Pages: `/signup`, `/login`, `/profile`
- [x] Forms: email/password via Supabase Auth (`@supabase/ssr`)
- [x] Profile: Figma PAT + Anthropic key; save encrypted
- [x] Plugin token panel: one token, copy-once, rotate, revoke
- [x] `public/illustrations/` placeholders; wire for real assets later
- [x] Empty/loading/error states; accessible labels; password show/hide
- [x] Mobile stack; verify `design-hilos.md` checklist

**Status:** complete

## Decisions (this phase)

| Decision | Rationale |
|----------|-----------|
| shadcn/ui + Base UI (`--base base` in CLI v4.13+) | User: drop DaisyUI; use shadcn with Base UI |
| Basic components only | Keep surface area small for auth/profile |
| Visual reference = Hilos | Unchanged |
| Confirmation endpoint accepts PKCE code and token hash | Supports stock redirects plus Supabase's recommended SSR email template |

## Errors (this phase)

| Error | Attempt | Resolution |
|-------|---------|------------|
| CLI rejected `--base base-ui` | Ran phase command against shadcn 4.13.1 | Current enum renamed Base UI to `--base base` |
| CLI could not detect Tailwind | Ran shadcn before Tailwind existed | Installed Tailwind v4 + PostCSS first, then initialized shadcn |

## Notes

- Prefer Server Components + small client islands for interactive forms.
- Do not invent final mascot art — placeholder slots only.
- If AI Elements are added later and conflict with Base UI, revisit `--base radix` per shadcn skill warning.
- Verified with `npm run typecheck`, `npm run build`, and HTTP smoke tests for landing/auth/profile redirects.
- Post-build review applied Next.js, Cache Components, React, shadcn, and component-architecture guidance:
  - Profile panel chrome is server-rendered; only forms/token controls are client islands.
  - Profile reads call server services directly; Server Actions are mutation-only.
  - Proxy redirects preserve Supabase cookie updates and support the legacy anon-key fallback.
  - `cacheComponents` remains intentionally disabled: the current session-bound routes gain little until profile/login are split into Suspense-based PPR regions.
