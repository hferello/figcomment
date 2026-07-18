# UI direction: Hilos-inspired (Figcomment web)

> Reference site: [https://hilos.sh](https://hilos.sh)  
> Screenshot: `assets/Screenshot_2026-07-18_at_11.19.25-e0f4eafb-09d2-427e-ad1d-de7970690479.png` (Cursor project assets)  
> Owner will supply final illustrations; use placeholders until then.

## Look & feel

- Warm cream page background; flat pastel “bento” panels (no drop shadows, no glow).
- Large corner radius on panels — prefer scale values **24** or **36** (`rounded-[length:var(--fc-24)]` or theme `rounded-fc-24`).
- Generous gutters from the same scale; calm, playful, editorial — not dashboard chrome.
- Hierarchy via color blocks + type size, not elevation.
- **Styling must use Tailwind** utility classes + `@theme` tokens (no ad-hoc CSS frameworks beyond Tailwind + shadcn).

## Design scale (single number system)

**Base type size: 18px** (`html` / body default = 18px).

Canonical steps (px) — use for **type, spacing, radius, and related tokens** (opacity as `N / 100` when needed):

| Step   | px     | Typical use                          |
| ------ | ------ | ------------------------------------ |
| 12     | 12     | Small labels, tight gaps, captions   |
| 14     | 14     | Secondary UI text, compact controls  |
| **18** | **18** | **Base body / default font-size**    |
| 21     | 21     | Emphasized body / large controls     |
| 24     | 24     | Subheads, panel padding, radius      |
| 36     | 36     | Section titles, large gaps           |
| 48     | 48     | Display / hero steps                 |
| 56     | 56     | Large display                        |
| 63     | 63     | XL display                           |
| 72     | 72     | Hero display                         |
| 96     | 96     | Max display / section breathing room |

Do **not** invent off-scale sizes (e.g. `16px`, `20px`, `32px`) unless unavoidable for 1px borders/hairlines.

Implement scale tokens in `rem` (`step ÷ 18`) so their names retain the intended
pixel equivalent at the 18px root while remaining relative to the document base.

### Tailwind v4 `@theme` (implement in Phase 4)

Wire the scale into Tailwind so utilities stay on-token ([theme customization](https://tailwindcss.com/docs/adding-custom-styles)):

```css
@import "tailwindcss";

@theme {
  /* Base: set on html in layout — font-size: 18px */

  --font-sans: "…", ui-sans-serif, system-ui, sans-serif;
  --font-display: "…", ui-serif, Georgia, serif;

  --text-fc-12: 0.666667rem;
  --text-fc-14: 0.777778rem;
  --text-fc-18: 1rem;
  --text-fc-21: 1.166667rem;
  --text-fc-24: 1.333333rem;
  --text-fc-36: 2rem;
  --text-fc-48: 2.666667rem;
  --text-fc-56: 3.111111rem;
  --text-fc-63: 3.5rem;
  --text-fc-72: 4rem;
  --text-fc-96: 5.333333rem;

  /* Spacing / size / gap — same steps relative to the 18px root */
  --spacing-fc-12: 0.666667rem;
  --spacing-fc-14: 0.777778rem;
  --spacing-fc-18: 1rem;
  --spacing-fc-21: 1.166667rem;
  --spacing-fc-24: 1.333333rem;
  --spacing-fc-36: 2rem;
  --spacing-fc-48: 2.666667rem;
  --spacing-fc-56: 3.111111rem;
  --spacing-fc-63: 3.5rem;
  --spacing-fc-72: 4rem;
  --spacing-fc-96: 5.333333rem;

  --radius-fc-24: 1.333333rem;
  --radius-fc-36: 2rem;

  --color-fc-bg: #f5f4f0;
  --color-fc-ink: #0a0a0a;
  --color-fc-panel-blue: #b4d4f2;
  --color-fc-panel-yellow: #fde08d;
  --color-fc-panel-pink: #fad1e6;
  --color-fc-panel-peach: #ffb899;
}

html {
  font-size: 18px;
}
```

Usage examples:

- Type: `text-fc-18`, `text-fc-36`, `font-display text-fc-72`
- Spacing: `p-fc-24`, `gap-fc-18`, `mt-fc-48`
- Radius: `rounded-fc-24`
- Opacity (when using scale): `opacity-[0.12]` / `opacity-[0.24]` etc. (step ÷ 100), or named `--opacity-fc-*` if preferred

Prefer named `*-fc-*` utilities over arbitrary `text-[18px]` so the scale stays enforceable.

## Colour (CSS variables — tune to match Hilos closely at build time)

| Token                         | Role                   | Starting hex                                        |
| ----------------------------- | ---------------------- | --------------------------------------------------- |
| `--fc-bg` / `--color-fc-bg`   | Page background        | `#F5F4F0`                                           |
| `--fc-ink` / `--color-fc-ink` | Primary text / strokes | `#0A0A0A`                                           |
| `--fc-panel-blue`             | Bento panel            | `#B4D4F2`                                           |
| `--fc-panel-yellow`           | Bento panel            | `#FDE08D`                                           |
| `--fc-panel-pink`             | Bento panel            | `#FAD1E6`                                           |
| `--fc-panel-peach`            | Bento panel            | `#FFB899`                                           |
| `--fc-muted`                  | Secondary labels       | ~40% ink on cream (`opacity` ~0.36–0.48 from scale) |

Map into shadcn semantic vars (`--background` = cream, `--foreground` = ink) **and** keep `--color-fc-*` for Tailwind (`bg-fc-bg`, `text-fc-ink`, `bg-fc-panel-blue`, …).

## Typography

| Role                  | Style                         | Size (scale)                           | Suggested fonts                                                 |
| --------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Display / card titles | High-contrast **serif**, bold | 36–72 (hero up to 96)                  | Instrument Serif, Newsreader via `next/font` → `--font-display` |
| Eyebrow / UI / body   | Clean geometric **sans**      | **18 base**; 14 secondary; 21 emphasis | Geist, Public Sans, or similar → `--font-sans`                  |
| Labels                | Small sans, optional tracking | 12 or 14                               | Same sans                                                       |

Landing + auth: brand “Figcomment” should read as a hero-level signal on the first viewport (per product design rules).

## Iconography / illustration

- Style: hand-drawn, thick black outline, doodle characters, simple eyes, flat black fills — **Hilos metaphor mascots**, not Lucide-default icon soup.
- **User will create finals.** Until then:
  - Placeholders: simple SVG silhouettes / empty frames with dashed border + caption (`Illustration: keys`, `Illustration: token`, etc.)
  - Path convention: `backend/public/illustrations/*.svg` (or `.png`)
- Do not invent a competing illustration style; leave clear slots.

## Layout patterns

- Marketing / “why” sections: bento grid of pastel panels (2-col desktop, stack mobile).
- Auth + profile: same cream canvas; forms in a single calm panel (or two: credentials | plugin token), not dense admin tables.
- Prefer one job per section; short supporting copy.

## Component stack (Tailwind + shadcn + Base UI)

- **Tailwind CSS** is the styling system (utilities + `@theme` scale above).
- **shadcn/ui** with **Base UI** primitives (`npx shadcn@latest init -d --base base-ui`).
- Use **basic** components only (Button, Input, Label, Form fields, Alert, simple panels) — no DaisyUI.
- Restyle shadcn to Hilos colours + **fc scale** (flat, large radius, ink-on-pastel). Avoid purple/glow dashboard defaults.
- Marketing bento: Tailwind colour panels (`bg-fc-panel-*`), not heavy shadowed Card chrome.

## Must match checklist (acceptance for Phase 4)

- [ ] Cream background + pastel panels match reference vibe
- [ ] Serif headings + sans body pairing
- [ ] Base font size **18px**; type/spacing/radius stay on scale `12…96`
- [ ] Tokens live in Tailwind `@theme` (`text-fc-*`, `p-fc-*`, etc.)
- [ ] Flat, large-radius panels, no heavy shadows
- [ ] Illustration slots present with placeholders
- [ ] Auth/profile feels like the same brand as the landing bento
