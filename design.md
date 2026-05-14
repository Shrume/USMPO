# Visual design reference (globe / military shell)

Scope: tokens and UI patterns used by `src/routes/+layout.svelte`, `src/lib/UGN-globe.svelte`, `src/lib/GlobeMainIndex.svelte`, `src/lib/GlobeHoverPanel.svelte`, `src/lib/UGN-checkboxes.svelte`, plus shared SCSS. There is no `src/app.css`; global partials are loaded via `svelte.config.js` (`prependData: @use "src/styles" as *`).

## CSS custom properties (design tokens)

Defined on `body` inside `:global` in `src/routes/+layout.svelte` (mirrored in `src/routes/uganglobe/+layout.svelte` for the legacy route).

| Token | Value |
|--------|--------|
| **Spacing** | |
| `--_pad-border` | `20px` (tablet portrait / mobile: `25px`; max-width 350px: `15px`) |
| `--_pad-4xl` | `35px` |
| `--_pad-2xl` | `20px` |
| `--_pad-xl` | `15px` |
| `--_pad-lg` | `12px` |
| `--_pad-md` | `10px` |
| `--_pad-sm` | `6px` |
| `--_pad-xs` | `4px` |
| **Radius** | |
| should have 0 radius
| **Focus** | |
| `--_focus-outline-width` | `3px` |
| `--_focus-outline` | `solid var(--_focus-outline-width) var(--_clr-accent-700)` |
| **Typography scale** | |
| `--_font-2xl` | `3rem` |
| `--_font-lg` | `1.2rem` |
| `--_font-md` | `1.1rem` |
| `--_font-sm` | `1rem` |
| **Motion** | |
| `--_trans-fast` | `0.1s ease` |
| `--_trans-normal` | `0.2s ease` |
| **Neutrals** | |
| `--_clr-1000` through `--_clr-0` | `#000000` through `#ffffff` stepped grays (900 `#303030`, 800 `#474747`, 700 `#666666`, 200 `#d1d1d1`, 50 `#f2f2f2`, etc.) |
| **Accent** | |
| `--_clr-accent-700` | `#eb6200` |

**Additional (globe component):** `UGN-globe.svelte` sets `--_scrollToTop-height` on `body` as `calc(2 * var(--_pad-xl) + 15px)` for mobile scroll-to-top affordance.

**UGN-checkboxes (local, not on `body`):** `--_clr-border: #ffffff`; `--_border-radius: 5px` (duplicates small radius intent).

**GlobeHoverPanel:** CSS variable `--accent` set inline on `.panelTitle` from data (`style:--accent={...}`) for title underline color.

## SCSS variables (non-custom-property)

From `src/styles/_variables.scss`:

- `$UGNbp-tablet: 1200px`
- `$UGNbp-mobile: 650px`
- `$input-minSize: 44px` (not referenced in the files above)

## Shadows

No `box-shadow` tokens in these components. Depth is conveyed via borders, opacity, and color steps. Focus uses `--_focus-outline` only.

## Typography

| Role | Where | Family | Weight | Size |
|------|--------|--------|--------|------|
| Headline number | `.headline .bigNumber` | `'Montserrat', sans-serif` | 700 | `var(--_font-2xl)` (3rem), line-height 1em |
| Headline subline | `.headline .sub` | inherits `Manrope` | 500 | `var(--_font-sm)`, color `--_clr-700`, line-height 1.3em |
| Body / lede | `.lede` | Manrope | default | `var(--_font-sm)`, color `--_clr-800`, line-height 1.45 |
| Section labels | `.sectionTitle`, `.sidebarHeading` | Manrope | 600 | `var(--_font-sm)`, color `--_clr-800` |
| List row title | `.row .name` | Manrope | 700 | `var(--_font-md)`, line-height 1.15em |
| Row badge | `.row .badge` | Manrope | 400 | `var(--_font-sm)`; inverted pill (`--_clr-0` on `--_clr-900`) |
| Panel title | `.panelTitle` | Manrope | 700 | `var(--_font-lg)`; bottom border 3px `var(--accent, --_clr-300)` |
| Muted / placeholder | `.muted`, `.placeholder` | Manrope | default | `var(--_font-sm)` or `--_clr-600` for placeholder |
| Stat label (`dt`) | `.stats dt` | Manrope | 600 | `0.75rem`, uppercase, letter-spacing `0.04em`, `--_clr-600` |
| Stat value (`dd`) | `.stats dd` | Manrope | 600 | `var(--_font-md)`, `--_clr-900` |
| Subtitle (battles) | `.subTitle` | Manrope | 600 | `var(--_font-sm)`, `--_clr-800` |
| Footer | `footer` | Manrope | default | implicit; color `--_clr-700` |
| Globe HTML labels | `.arcLabel` (global in `UGN-globe`) | Manrope | 700 / 400 in `.population` | `var(--_font-md)` / `var(--_font-sm)` |
| Checkbox group label | `p.label` in `UGN-checkboxes` | inherits | default | hard-coded `#5e5e5e`; group `font-size: 1rem` |

**Font loading:** Manrope + Montserrat (weights 200-800 and 500) via `@import` Google Fonts URL in `+layout.svelte` `<style>`. `src/styles/typefaces.scss` defines General Sans, Clash Grotesk, JetBrains Mono for the wider app but not used by this globe layout stack.

## Layout: globe column vs sidebar

**Desktop (`src/routes/+layout.svelte`):**

- `main`: `display: flex; flex-flow: row nowrap; width: 100%`.
- `.globeColumn`: `flex: 1 1 auto; min-width: 0; flex-direction: column` � globe + index + `<slot />`.
- `.sidebar`: `flex-shrink: 0; width: 380px` (max-width 800px: `320px`), `padding: var(--_pad-border)`, `overflow: auto`.

**Tablet portrait / mobile** � combined query used in layout + globe:

```text
(max-width: $UGNbp-tablet) and (orientation: portrait), (max-width: $UGNbp-mobile)
```

Effects:

- `main`: column, centered, `padding-bottom: env(safe-area-inset-bottom)`.
- `.globeColumn`: `width: 100%; max-width: 500px`.
- `.sidebar`: full width, `max-width: 500px`, extra top padding to clear sticky globe / skip control.

**Max-width 350px:** `--_pad-border` becomes `15px` on `body`.

**Skip control:** fixed position; desktop hidden above viewport with `transform`; mobile bottom-fixed; `.halfWay` on `main` (from `IntersectionObserver` on sidebar, `rootMargin: 0px 0px -50% 0px`) shifts skip button down when sidebar is mid-viewport.

## Component appearance

**Lists (GlobeMainIndex):** `ul.rows` � no bullets, `margin: 0 0 var(--_pad-4xl)`. Each row is a full-width `<button class="row">`: flex row, gap `--_pad-md`, transparent background, `border-bottom: 1px solid var(--_clr-200)`, `padding: var(--_pad-lg) 0`. Hover / `.hover` / focus: `--_clr-1000`, border `--_clr-500`. `.dim`: `opacity: 0.55`. Swatch: `0.55rem` by `1.6rem`, radius `--_border-radius-sm`.

**Badges (rows):** pill with `padding: 0 var(--_pad-sm)`, `border-radius: var(--_border-radius-sm)`, text `--_clr-0` on `--_clr-900`.

**Filter chips (UGN-checkboxes):** flex wrap, `gap: 8px`. Hidden checkbox + `label`: `padding: 5px 8px`, `border: 1px solid var(--_clr-border)` (white), transparent background; hover `--_clr-900` on `--_clr-100`; checked `--_clr-1000` on `--_clr-0`; transitions `color` / `background-color` `0.1s ease`.

**Icon buttons (UGN-globe zoom / fullscreen):** container `--_clr-100`, radius `--_border-radius-sm`; inner padding `var(--_pad-xl)`; icon `.icon` `width: 15px`. States: hover/focus `--_clr-900` / `--_clr-150`; active `--_clr-1000` / `--_clr-300`; disabled zoom `--_clr-400` / `--_clr-100`, `cursor: not-allowed`.

**GlobeHoverPanel lists:** `.battles li` — flex space-between, `border-bottom: 1px solid var(--_clr-200)`, `font-size: var(--_font-sm)`; `.bnum` tabular nums, `--_clr-700`.

**Footer version chip (uganglobe layout only):** `.version` — `padding: var(--_pad-xs) var(--_pad-md)`, `border: 1px solid var(--_clr-300)`, `border-radius: var(--_border-radius-sm)`.

## Globe visual config (`UGN-globe.svelte` / globe.gl)

| Setting | Value |
|---------|--------|
| Scene background | `#ffffff` (`.backgroundColor`) |
| Globe material | `MeshBasicMaterial({ color: '#f2f2f2' })` |
| Atmosphere | `.showAtmosphere(false)` |
| Polygons | `globe-countries.json`; cap `#d1d1d1`, side/stroke `#a3a3a3` |
| Arcs | Start at `origin`; end `arc.lat` / `arc.lng`; stroke `0.35 + min(annualAvg_B/40, 1.2)`; curve resolution `32`; `arcsTransitionDuration(0)`; color from data `arc.color` with hover dimming to `rgba(r,g,b,0.25)` |
| Points | `pointAltitude(0.012)`; radius `0.35 + min(sqrt(usCasualties)/200, 0.85)`; hover dim `rgba(..., 0.35)` |
| HTML labels | Class `arcLabel` + nested `population` (globe tooltips) |

**Theme color:** `<meta name="theme-color" content="#f2f2f2" />` in layout `<svelte:head>`.

## Shared utility

- **`.visuallyHidden`:** `src/styles/global.scss` (clip, 1px square, off-screen).

## Implementation note

`GlobeMainIndex.svelte`, `GlobeHoverPanel.svelte`, and `UGN-globe.svelte` import globe hover stores (`UGNglobeHoverAidArc`, `UGNlistHoverAidArc`, `UGNglobeHoverConflict`, `UGNlistHoverConflict`) and assign `$UGNglobe` / `$UGNaltOffset`. The on-disk `src/store/store.ts` in this repo may not list every symbol those files import; keep exports aligned when building the military route.
