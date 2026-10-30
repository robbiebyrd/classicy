---
id: 0004-vqt
title: 'Part G: Colors, derivations and JS geometry'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T18:58:37.718Z"
updated: "2026-10-30T01:53:25.338Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: pending
  "1.1":
    status: complete
  "1.2":
    status: in_progress
  "2":
    status: pending
  "2.1":
    status: complete
  "2.2":
    status: in_progress
  "3":
    status: pending
  "3.1":
    status: complete
  "3.2":
    status: complete
  "4":
    status: pending
---

# Part G: Colors, derivations and JS geometry

## Summary

**Goal:** No literal color and no anonymous multiplier in Classicy's SCSS, and no hard-coded geometry in Classicy's JS: every color is a token or a `classicy-tint/shade/alpha` of one, every proportion is a named `getThemeVars` derivation, and `ClassicyWindow`/icon-grid math reads the CSS variables it used to guess.

**Problem:** Audit §2.1: literal colors leak in 11 files (`#f7cecd` duplicated at ClassicyWindow.scss:198 and ClassicyAlert.scss:88, `#c00` FileInput.scss:31, `rgba(255,255,255,.5)`/`rgba(0,0,0,.5)` at Icon.scss:34,95,118 and DesktopIcon.scss:36,93,116, scrollbar track shading scrollbars.scss:163-164,170-171, `#999`/`rgba(255,255,255,.5)` FinderAboutThisComputer.scss:30,53,83, `white` WebViewer.scss:6 and ProgressBar.scss:68, `groove rgb(239,239,239)` ControlGroup.scss:31, `rgba(0,0,0,.5)` QuickTimeMovieEmbed.scss:89, and `theme-halftone(#000000, 7%)` Icon.scss:57 / DesktopIcon.scss:55 compiling a color into a data URI). §2.4: 86 distinct `calc(var(--x) * N)` combinations (391 sites) hide the Platinum proportions — collapsed window height 1.25×, menu min-width 15×, pop-up height 2.125×, UI font steps 0.75/0.8/10⁄12/1.5… §3.1: `ClassicyWindow.tsx` hard-codes `menuBarHeight = 30` four times (:57,:120,:160,:1316), a `+ 5` resize fudge (:958-959,:1098-1099), a zoom `margin = 8` (:1317) and a stale '~24px' collapsed-height comment (:1492-1495); §3.2: `getIconSize` (ClassicyDesktopIconContext.tsx:46-48), `iconGridLattice` (ClassicyFileBrowserUtils.ts:63-71) and ClassicyFileBrowser.tsx:231-233 read `theme.desktop.iconSize` instead of `--desktop-icon-size`.

**Approach:** Add `src/Appearance/vocabulary/_color.scss` (three `color-mix` helpers, pinned by a compiled-CSS test) and replace each literal with a helper whose arithmetic reproduces today's pixels (two exceptions are named); extend `getThemeVars` with ~30 named derivations next to the existing ones, test every emitted value, and rewrite the SCSS readers; add `readClassicyThemeVar` (the `useClassicyBalloonHelp` pattern) and route the window and icon-grid geometry through it.

---

# Part 2 — Implementation

**Architecture:** Implements umbrella plan 0002-ldj (Shared Contract: colors and numbers — `_color.scss` helpers, named derivations `--<family>-<measure>` in `getThemeVars`) and docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md §9 Phase 6 items 1, 2 and 4 (§2.1, §2.4, §3.1, §3.2; decisions D9–D11). Part H consumes the names pinned here for the pixel-literal purge; part B later moves `appearance.scss` (including the rewritten `theme-halftone`) into the Platinum package. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5, SCSS (sass 1.101; `color-mix()` emitted verbatim — baseline since 2023, Chromium 111+/Firefox 113+/Safari 16.2+), `getThemeVars` in `ClassicyAppearance.ts`, vitest 5 + jsdom (compiled-CSS tests via `sass.compile`, the ClassicyWindow.resizer.test.ts idiom), Biome, Storybook + Playwright + ImageMagick `compare`.

## Constraints

- Platinum pixel-identical except two NAMED changes: (a) the error title-bar fill becomes `classicy-tint("--color-error", 80%)` = `color-mix(in srgb, #ff0000, white 80%)` = #ffcccc instead of #f7cecd (no tint of pure red can reach R=0xf7; the alternative, a new theme color input, is rejected because it widens the 28-target color schema — raise in review if the owner prefers it); (b) nothing else — every other replacement is arithmetically exact (`#c00` = shade(error, 20%) = 255×0.8 = 204; `#999` = shade(system-04, 10%) = 170×0.9 = 153; `rgb(239,239,239)` = tint(system-01, 6%) = 238×0.94 + 255×0.06 = 239.02; alpha helpers reproduce `rgba(…, .5/.25)` exactly). Any other non-zero AE is a bug.
- Depends on Part A only for the directory `src/Appearance/vocabulary/` (Part A 1.1 creates it with the generated vocabulary). If A has not merged, create the directory with `_color.scss` alone; no other A artifact is needed. Part A also removes `!important` from `theme-halftone` (appearance.scss:234) — this part rewrites that mixin wholesale, so the order does not matter.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`. Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Library code uses `classicyLog`, never `console.*`. New modules are picked up by `pnpm exec barrelsby -c .ts-barrel.json`; never hand-edit `src/index.ts`.
- Derivation names follow the contract `--<family>-<measure>`; the contract's suggested `--popup-height`, `--window-collapsed-height`, `--ui-font-size-small`, `--ui-font-size-large` are used as suggested; `--menu-item-height` is NOT emitted (no SCSS reads a menu row height today — recorded as a contract gap). Emitted values are rounded to 3 decimals (`px3`) so tests pin exact strings.
- Multipliers rewritten here are exactly the simple forms `calc(var(--x) * N)` / `calc(var(--x) / N)` matched by `grep -rnoE 'calc\(\s*var\(--[a-z0-9-]+\)\s*[*/]\s*[0-9.]+(\s*/\s*[0-9.]+)?\s*\)' src --include=*.scss` (391 sites, 86 distinct). Negative forms (`* -1`), multi-term calcs, the scrollbar-glyph geometry in scrollbars.scss (Platinum art, part B/E) and the listed one-offs stay in place and are documented for part H.
- Spelling: American English (color, behavior, gray, center, normalize).
- Review focus: (1) a helper whose arithmetic does not reproduce the literal (e.g. tint vs shade confusion) — 1.1 compiled-CSS test pins each helper's expansion and 1.2 pins each replaced declaration; (2) a derivation emitted but read by nothing, or read but not emitted — 2.1 test + 2.2 `grep` validation that no rewritten site still carries its multiplier; (3) a float derivation whose string differs between the test and the browser (`14 * 0.865`) — `px3` rounding in 2.1; (4) `readClassicyThemeVar` returning 0/NaN in jsdom or before the desktop mounts, moving windows to y=0 — 3.1 fallback test; (5) the halftone rewrite masking the icon's `<img>` — 1.2 keeps the pattern on a `::before` child, never on the element's own `mask-image`, and Phase 0/4 parity on Controls/Icon and Desktop/DesktopIcon.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/vocabulary/_color.scss` | create | `classicy-tint`, `classicy-shade`, `classicy-alpha` (color-mix) — Classicy-owned, package-neutral. |
| `src/Appearance/vocabulary/ClassicyColorHelpers.test.ts` | create | Compiles a fixture that includes each helper and pins the emitted `color-mix(...)` strings. |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` | modify | `theme-halftone($token, $size)` becomes a `::before` mask-pattern painted with a token; `encode-color` deleted if unused. |
| `src/SystemFolder/SystemResources/{Window,Alert,FileInput,Icon,Desktop,ControlGroup,ProgressBar,QuickTime}/*.scss, src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss, src/SystemFolder/Finder/FinderAboutThisComputer.scss, src/SystemFolder/WebViewer/WebViewer.scss` | modify | Literal colors → tokens/helpers (1.2). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts` | create | `CLASSICY_THEME_DERIVATIONS` table (name → formula → doc) and `classicyThemeDerivations(m, typography, desktop)` used by `getThemeVars`; `px3`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` | modify | `getThemeVars` spreads the derivations beside the existing metric block (:258-270). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` | modify | Pins every derived value for the default theme and the input→derivation relationship. |
| `~40 SCSS files listed in 2.2` | modify | Read the derivation names instead of multipliers. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts` | create | `readClassicyThemeVar(name, fallback?, el?)` — the one way JS reads a theme metric from CSS. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` | modify | menu-bar height, resize inset, zoom margin via `readClassicyThemeVar`; collapsed-height comment corrected. |
| `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx` | modify | `readControlSize` delegates to `readClassicyThemeVar`. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx, src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts, src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx, src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons.tsx` | modify | Icon-grid math reads `--desktop-icon-size` / `--desktop-icon-padding` / `--desktop-icon-cell`. |
| `docs/AGENT-REFERENCE.md (§8 'CSS custom properties', lines ~1089-1162)` | modify | Color helpers table; derived-metrics table extended; one-off multipliers list for part H. |
| `CLAUDE.md (Theming section)` | modify | Two sentences: color helpers and named derivations. |

## Phase 0: Parity baseline

- [ ] Start Storybook (`pnpm storybook`, background; note the port).
- [ ] Collect every `Controls/*`, `Desktop/*` and `Dialogs/*` story id from `http://localhost:<port>/index.json` into `.playwright-mcp/parity/part-G/stories.txt` (same python one-liner as plan 0001 Phase 0; this part touches ~45 stylesheets, so the full set is the gate).
- [ ] Playwright: `iframe.html?id=<id>&viewMode=story` at 1024×768, networkidle + 500 ms, save `.playwright-mcp/parity/part-G/before/<id>.png`.
- [ ] Verify the PNG count equals the stories.txt line count. Also record `getComputedStyle(document.querySelector('.classicyWindowTitleBar')).backgroundColor` on `dialogs-alert--stop` → `rgb(247, 206, 205)` (the value the named change replaces). No commit.

**Validation:** `ls .playwright-mcp/parity/part-G/before/*.png | wc -l  # equals the stories.txt line count`

## Phase 1: Color helpers and literal replacement

### 1.1: _color.scss: classicy-tint, classicy-shade, classicy-alpha

**Files:**
- Create: `src/Appearance/vocabulary/_color.scss`
- Test: `src/Appearance/vocabulary/ClassicyColorHelpers.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: The directory `src/Appearance/vocabulary/` (Part A 1.1; create it if absent).
- Produces: ```scss
// src/Appearance/vocabulary/_color.scss
@use "sass:meta";
@function classicy-token($token) { @if meta.type-of($token) != string or not str-index($token, "--") == 1 { @error "classicy color helpers take a custom-property name string such as \"--color-system-01\", got #{$token}"; } @return $token; }
@function classicy-tint($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}), white #{$pct}); }
@function classicy-shade($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}), black #{$pct}); }
@function classicy-alpha($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}) #{$pct}, transparent); }
```
`$token` is the full custom-property name string (`"--color-system-01"`); `$pct` is a Sass percentage (`80%`). Emitted CSS is `color-mix(in srgb, var(--color-error), white 80%)`, `color-mix(in srgb, var(--color-system-04), black 10%)`, `color-mix(in srgb, var(--color-black) 50%, transparent)`.

- [ ] **Step 1: Write the failing compiled-CSS test** — `ClassicyColorHelpers.test.ts` compiles a string with `sass.compileString` and `loadPaths: ["src/Appearance/vocabulary"]`:
```ts
const css = sass.compileString(`@use "color" as c; .t { a: c.classicy-tint("--color-error", 80%); b: c.classicy-shade("--color-system-04", 10%); d: c.classicy-alpha("--color-black", 50%); }`, { loadPaths: [path.resolve(process.cwd(), "src/Appearance/vocabulary")], style: "expanded" }).css;
it("classicy-tint mixes toward white", () => expect(css).toContain("a: color-mix(in srgb, var(--color-error), white 80%);"));
it("classicy-shade mixes toward black", () => expect(css).toContain("b: color-mix(in srgb, var(--color-system-04), black 10%);"));
it("classicy-alpha mixes with transparent", () => expect(css).toContain("d: color-mix(in srgb, var(--color-black) 50%, transparent);"));
it("rejects a token that is not a custom-property name", () => expect(() => sass.compileString(`@use "color" as c; .t { a: c.classicy-tint(red, 10%); }`, …)).toThrow(/custom-property name/));
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — `Can't find stylesheet to import` (color). — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts`
- [ ] **Step 3: Implement src/Appearance/vocabulary/_color.scss per Interfaces** — Four functions, header comment citing audit §8.7 and D10; no mixins, no literals.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS (4). — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts`
- [ ] **Step 5: Lint, type-check, commit** — git add src/Appearance/vocabulary && git commit -m "feat(scss): classicy-tint, classicy-shade and classicy-alpha color helpers" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts`

### 1.2: Replace every literal color; token-driven halftone

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss (:198)`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss (:88)`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss (:31)`
- Modify: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss (:34,57,95,118)`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss (:36,55,93,116)`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss (:163-164,170-171)`
- Modify: `src/SystemFolder/Finder/FinderAboutThisComputer.scss (:30,53,83)`
- Modify: `src/SystemFolder/WebViewer/WebViewer.scss (:6)`
- Modify: `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss (:68)`
- Modify: `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss (:31)`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss (:89)`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss (:225-237 encode-color + theme-halftone)`
- Test: `src/Appearance/vocabulary/ClassicyLiteralColors.test.ts (new)`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `classicy-tint/shade/alpha` (1.1), via `@use "../../../Appearance/vocabulary/color" as c;` (relative path from each file; part B swaps these for the `classicy/scss/color` export).
- Produces: Replacement table (file:line → new value → arithmetic): Window.scss:198 and Alert.scss:88 `#f7cecd` → `c.classicy-tint("--color-error", 80%)` (NAMED change: #ffcccc); FileInput.scss:31 `#c00` → `c.classicy-shade("--color-error", 20%)` (= #cc0000); Icon.scss:34 and DesktopIcon.scss:36 `rgba(255,255,255,.5)` → `c.classicy-alpha("--color-white", 50%)`; Icon.scss:95,118, DesktopIcon.scss:93,116, QuickTimeMovieEmbed.scss:89 `rgba(0,0,0,.5)` → `c.classicy-alpha("--color-black", 50%)`; scrollbars.scss:163,170 `rgba(0,0,0,.25)` → `c.classicy-alpha("--color-black", 25%)`, :164,171 `rgba(255,255,255,.25)` → `c.classicy-alpha("--color-white", 25%)`; FinderAboutThisComputer.scss:30 → `c.classicy-alpha("--color-white", 50%)`, :53,:83 `#999` → `c.classicy-shade("--color-system-04", 10%)` (= #999999); WebViewer.scss:6 `white` → `var(--color-white)`; ProgressBar.scss:68 `white` → `var(--color-white)`; ControlGroup.scss:31 `rgb(239,239,239)` → `c.classicy-tint("--color-system-01", 6%)` (= 239.02 → 239). Halftone: `@mixin theme-halftone($token: "--color-black", $size: 5%)` now emits `position: relative; &::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-color: var(#{$token}); mask-image: url('data:image/svg+xml,<svg …same paths… fill="black"/>…'); mask-repeat: repeat; mask-size: $size; }` — the dot geometry is unchanged, the color comes from the token, and the element's own `mask-image` (the icon shape) still clips the pseudo-element exactly as it clipped the old `background-image`. Callers: Icon.scss:57 and DesktopIcon.scss:55 become `@include appearance.theme-halftone("--color-black", 7%)`. `encode-color` is deleted (its only user was the mixin; confirm with `grep -rn encode-color src`). Intentionally untouched (audit says data, not leaks): ColorPicker crayon/track colors, `var(--x, #hex)` fallbacks in HyperCard/DriveSetup/CrashScreen, saver art.

- [ ] **Step 1: Write the failing compiled-CSS tests** — `ClassicyLiteralColors.test.ts` compiles each file in the list (`sass.compile`, `style: "expanded"`) and asserts:
```ts
it("ClassicyWindow red title bar uses the error tint", () => expect(window).toContain("background-color: color-mix(in srgb, var(--color-error), white 80%);"));
it("ClassicyAlert movable title bar uses the same tint", …);
it("FileInput error text is a 20% shade of --color-error", () => expect(fileInput).toContain("color: color-mix(in srgb, var(--color-error), black 20%);"));
it("icon label overlays are alpha tokens", () => { expect(icon).toContain("background: color-mix(in srgb, var(--color-white) 50%, transparent);"); expect(icon).toContain("background: color-mix(in srgb, var(--color-black) 50%, transparent);"); expect(icon).not.toMatch(/rgba\(/); });
it("scrollbar track shading is alpha tokens", () => expect(scrollbarsFixture).toContain("color-mix(in srgb, var(--color-black) 25%, transparent)") and the white one);
it("About This Computer borders are a 10% shade of system-04", …);
it("ControlGroup groove is a 6% tint of system-01", () => expect(controlGroup).toContain("groove color-mix(in srgb, var(--color-system-01), white 6%)"));
it("halftone is a token-painted mask on ::before", () => { expect(icon).toContain(".classicyIconMask::before {"); expect(rule(".classicyIconMask::before")["background-color"]).toBe("var(--color-black)"); expect(rule(".classicyIconMask::before")["mask-size"]).toBe("7%"); expect(rule(".classicyIconMask")["background-image"]).toBeUndefined(); });
it("no literal color remains in the audited files", () => for each compiled css: expect(css.replace(/url\([^)]*\)/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|(^|[\s:,(])(white|black)([\s;,)]|$)/im) — the regex strips data URIs first and ignores the `white`/`black` keywords inside `color-mix(` by pre-deleting `color-mix\([^)]*\)` as well);
```
(`rule()` helper from ClassicyColorPickerDialog.styles.test.ts; scrollbars is a mixin file, so compile a fixture that `@include`s `scrollbars.scrollbars()` on `.x`.)
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL on every `toContain`. — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyLiteralColors.test.ts`
- [ ] **Step 3: Apply the replacement table** — Add `@use "<relative>/Appearance/vocabulary/color" as c;` at the top of each file (after existing `@use`s). Replace each literal exactly as tabled; nothing else in the declaration changes (offsets, widths, `inset` keywords stay).
- [ ] **Step 4: Rewrite theme-halftone and delete encode-color** — Per Interfaces. Keep the SVG path data byte-identical; only `fill` becomes the literal `black` (it is a mask now). Update both callers.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources/Icon src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/Window`
- [ ] **Step 6: Repo-wide literal sweep** — Expected: 0 (the CrashScreen `var(--color-black, black)` fallback is excluded by the `var(--x, …` filter; ColorPicker crayon data is excluded by design). — `grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\([0-9]|(^|[ :,(])(white|black)([ ;,)]|$)|groove rgb' src --include=*.scss | grep -v 'var(--[a-z0-9-]*, *#\|Extensions/ScreenSaver\|ColorPicker\|data:image\|white-space\|^\S*:\s*//' | wc -l`
- [ ] **Step 7: Early parity on Icon/DesktopIcon/Alert/ControlGroup** — Re-shoot `controls-icon--*`, `desktop-desktopicon--*`, `controls-controlgroup--*`, `dialogs-alert--*` into `.playwright-mcp/parity/part-G/mid/`; `compare -metric AE` vs `before/`. Expected: 0 for all except `dialogs-alert--stop` and `dialogs-alert--movable` (and any other error-styled alert story), whose `compare … diff.png` must show changed pixels only inside the title bar; record the AE counts in the commit body.
- [ ] **Step 8: Lint, type-check, commit** — git add -A src && git commit -m "refactor(scss): replace literal colors with token tints, shades and alphas; token-painted halftone" (with the trailer; the body names the #f7cecd → tint change) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyLiteralColors.test.ts`

## Phase 2: Named derivations

### 2.1: ClassicyThemeDerivations.ts and getThemeVars emission

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts (:258-270)`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: `ClassicyThemeMeasurements`, `ClassicyThemeTypography`, `ClassicyThemeDesktop` types; `CLASSICY_DEFAULT_THEME_METRICS` (window {1,12,6,17,19,10}); default typography uiSize 14; default desktop iconSize 48, iconFontSize 12.
- Produces: `export const px3 = (n: number): string => intToPx(Math.round(n * 1000) / 1000)`. `export type ClassicyThemeDerivationInputs = { measurements: ClassicyThemeMeasurements; typography: Pick<ClassicyThemeTypography, "uiSize">; desktop: Pick<ClassicyThemeDesktop, "iconSize" | "iconFontSize"> }`. `export type ClassicyThemeDerivation = { cssVar: string; formula: string; doc: string; compute: (i: ClassicyThemeDerivationInputs) => number }`. `export const CLASSICY_THEME_DERIVATIONS: readonly ClassicyThemeDerivation[]` with exactly these entries (cssVar · formula · Platinum value): `--window-collapsed-height` · controlSize×1.25 · 15; `--window-utility-collapsed-height` · controlSize×0.5 · 6; `--window-frame-inset` · paddingSize/1.25 · 4.8; `--window-zoom-margin` · paddingSize + borderSize×2 · 8; `--window-resize-inset` · paddingSize − borderSize · 5; `--window-header-font-size` · uiSize×0.865 · 12.11; `--window-title-stripe-height` · controlSize×1.25 · 15; `--menu-bar-height` · controlSize×2.5 · 30; `--menu-min-width` · controlSize×15 · 180; `--menu-item-icon-size` · controlSize×1.25 · 15; `--menu-item-icon-gap` · controlSize×0.5 · 6; `--popup-height` · controlSize×2.125 · 25.5; `--popup-mini-size` · controlSize×1.3125 · 15.75; `--popup-arrow-width` · controlSize×1.75 · 21; `--control-glyph-size` · controlSize×1.25 · 15; `--control-square-size` · controlSize×2 · 24; `--button-square-width` · controlSize×4 · 48; `--control-padding` · paddingSize×0.5 · 3; `--control-padding-tight` · paddingSize/4 · 1.5; `--control-padding-narrow` · paddingSize/3 · 2; `--control-padding-loose` · paddingSize/1.5 · 4; `--control-padding-wide` · paddingSize×1.5 · 9; `--ui-font-size-small` · uiSize×0.8 · 11.2; `--ui-font-size-caption` · uiSize×0.75 · 10.5; `--ui-font-size-compact` · uiSize×10/12 · 11.667; `--ui-font-size-mini` · uiSize/1.5 · 9.333; `--ui-font-size-large` · uiSize×1.5 · 21; `--tab-height` · controlSize×4/2.5 · 19.2; `--tab-min-width` · controlSize×4 · 48; `--tab-min-width-large` · controlSize×9 · 108; `--slider-thumb-width` · controlSize×2 · 24; `--slider-thumb-height` · controlSize×1.75 · 21; `--desktop-icon-padding` · iconSize/4 · 12; `--desktop-icon-cell` · iconSize×2 · 96; `--desktop-icon-label-pad` · iconFontSize/4 · 3 (35 entries). Coincidences kept separate on purpose (a package may want them independent): `--window-collapsed-height` / `--window-title-stripe-height` / `--menu-item-icon-size` / `--control-glyph-size` (all 1.25×), `--control-square-size` / `--slider-thumb-width` (2×), `--popup-arrow-width` / `--slider-thumb-height` (1.75×), `--button-square-width` / `--tab-min-width` (4×); each `doc` names its structural reason. `export const classicyThemeDerivations = (i: ClassicyThemeDerivationInputs): Record<string, string>` → `Object.fromEntries(CLASSICY_THEME_DERIVATIONS.map((d) => [d.cssVar, px3(d.compute(i))]))`. In `getThemeVars`, after `"--layout-focus-gap"`, spread `...classicyThemeDerivations({ measurements: m, typography: theme.typography, desktop: theme.desktop })`; the existing 11 derivations stay where they are (unchanged names and values).

- [ ] **Step 1: Write the failing tests** — `ClassicyAppearance.test.ts`, after `emits every metric input and derivation for the default theme`:
```ts
it("emits every named derivation for the default theme", () => {
  const vars = getThemeVars(getTheme("default")) as Record<string, string>;
  const expected: Record<string, string> = { "--window-collapsed-height": "15px", "--window-utility-collapsed-height": "6px", "--window-frame-inset": "4.8px", "--window-zoom-margin": "8px", "--window-resize-inset": "5px", "--window-header-font-size": "12.11px", "--window-title-stripe-height": "15px", "--menu-bar-height": "30px", "--menu-min-width": "180px", "--menu-item-icon-size": "15px", "--menu-item-icon-gap": "6px", "--popup-height": "25.5px", "--popup-mini-size": "15.75px", "--popup-arrow-width": "21px", "--control-glyph-size": "15px", "--control-square-size": "24px", "--button-square-width": "48px", "--control-padding": "3px", "--control-padding-tight": "1.5px", "--control-padding-narrow": "2px", "--control-padding-loose": "4px", "--control-padding-wide": "9px", "--ui-font-size-small": "11.2px", "--ui-font-size-caption": "10.5px", "--ui-font-size-compact": "11.667px", "--ui-font-size-mini": "9.333px", "--ui-font-size-large": "21px", "--tab-height": "19.2px", "--tab-min-width": "48px", "--tab-min-width-large": "108px", "--slider-thumb-width": "24px", "--slider-thumb-height": "21px", "--desktop-icon-padding": "12px", "--desktop-icon-cell": "96px", "--desktop-icon-label-pad": "3px" };
  for (const [k, v] of Object.entries(expected)) expect(vars[k], k).toBe(v);
  expect(Object.keys(expected)).toHaveLength(35);
});
it("derives from the inputs, not constants", () => {
  const theme = withDefaultThemeMetrics({ ...getTheme("default"), measurements: { ...getTheme("default").measurements, window: { ...getTheme("default").measurements.window, controlSize: 16, paddingSize: 8 } }, typography: { ...getTheme("default").typography, uiSize: 12 }, desktop: { ...getTheme("default").desktop, iconSize: 32 } });
  const vars = getThemeVars(theme) as Record<string, string>;
  expect(vars["--window-collapsed-height"]).toBe("20px"); expect(vars["--menu-bar-height"]).toBe("40px"); expect(vars["--popup-height"]).toBe("34px"); expect(vars["--window-frame-inset"]).toBe("6.4px"); expect(vars["--window-zoom-margin"]).toBe("10px"); expect(vars["--window-resize-inset"]).toBe("7px"); expect(vars["--ui-font-size-small"]).toBe("9.6px"); expect(vars["--ui-font-size-compact"]).toBe("10px"); expect(vars["--desktop-icon-cell"]).toBe("64px"); expect(vars["--desktop-icon-padding"]).toBe("8px");
});
it("keeps the pre-existing derivations unchanged", () => { expect(vars["--control-row-height"]).toBe("18px"); expect(vars["--edit-field-height"]).toBe("22px"); });
```
`ClassicyThemeDerivations.test.ts`: `it("has 35 unique cssVars, each starting with --")`, `it("every entry has a non-empty formula and doc")`, `it("px3 rounds to three decimals", () => { expect(px3(14 * 0.865)).toBe("12.11px"); expect(px3(14 * 10 / 12)).toBe("11.667px"); expect(px3(12)).toBe("12px"); })`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found; `--window-collapsed-height` undefined. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 3: Implement ClassicyThemeDerivations.ts and the getThemeVars spread** — Per Interfaces. Each `doc` is one sentence naming the reader (e.g. `--menu-min-width`: 'Minimum dropdown width (ClassicyMenu.scss)'). Run `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager && pnpm exec tsc --noEmit -p .`
- [ ] **Step 5: Lint, type-check, commit** — git add src/SystemFolder/ControlPanels/AppearanceManager src/index.ts && git commit -m "feat(theme): named derivations for the Platinum proportions in getThemeVars" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts -t 'named derivation'`

### 2.2: Rewrite the SCSS readers

**Files:**
- Modify: `Window/ClassicyWindow.scss (:14 collapsed, :19 header font, :31 header height→--control-row-height, :231 frame inset (delete the local custom prop, read the global), :251 border×4→--control-bevel-lg, :254 →--control-square-size, :255,:301 →--window-title-stripe-height, :256,:302,:312,:492,:664 →--control-padding, :311 control×1 → var(--window-control-size), :352 →--control-frame-width, :511-512 →--window-frame-inset, :612 →--window-utility-collapsed-height, :164,:180,:483,:486 →--control-padding-tight)`
- Modify: `Window/ClassicyWindowFrame.scss (:18 →--control-row-height, :25 →--control-padding-wide, :27 →--window-header-font-size, :33 padding×2 stays)`
- Modify: `Menu/ClassicyMenu.scss (:24,46,76,94 →--menu-min-width; :134,135,167 →--menu-item-icon-size; :136,168 →--menu-item-icon-gap; :234 →--ui-font-size-caption; :236 →--control-padding; :17 border×2 →--control-frame-width)`
- Modify: `PopUpMenu/ClassicyPopUpMenu.scss (:11,12 →--popup-mini-size; :13,33 →--ui-font-size-small; :53 →--popup-height; :110 →--popup-arrow-width; :154 →--control-padding; :156,190 →--control-padding-narrow / --control-padding-loose; :201 →--control-padding-wide; :80 padding×1 → var(--window-padding-size); :91,121,146 →--control-frame-width)`
- Modify: `Tabs/ClassicyTabs.scss (:216 →--tab-height; :221 →--ui-font-size-compact; :222,258 →--tab-min-width; :247 →--ui-font-size-large; :248 →--tab-min-width-large; :253-254 →--control-row-height; :83,101,232 →--control-square-size; :51 control×1; :102,114,205,223,233,249 per the padding/control families; :32,138,243,108,227-228,239 one-offs stay)`
- Modify: `Button/ClassicyButton.scss (:9,:83 →--control-padding; :19 →--control-frame-width; :71 →--button-square-width; :82 →--ui-font-size-mini; :87-88 →--control-square-size; :89 →--control-padding)`
- Modify: `BevelButton/ClassicyBevelButton.scss (:12,16,128 →--control-padding; :35 →--control-frame-width; :57 →--button-square-width; :134 →--ui-font-size-mini)`
- Modify: `ButtonToolbar/ClassicyButtonToolbar.scss (:25,26,32 →--control-padding-narrow; :27 →--control-padding-loose; :28 →--ui-font-size-compact; :39,40,46 →--control-padding-tight; :41 →--control-padding; :42 →--ui-font-size-mini; :45 →--control-square-size; :31 one-off stays)`
- Modify: `Placard/ClassicyPlacard.scss (:17 →--control-padding; :20 →--control-padding-loose; :23,101 →--ui-font-size-compact; :39 →--control-frame-width; :74 →--ui-font-size-mini; :97 →--control-padding-narrow)`
- Modify: `Checkbox/ClassicyCheckbox.scss (:18,81 ui×1 → var(--ui-font-size); :19,82 →--ui-font-size-caption; :23,38,86 →--control-frame-width; :69-70 one-offs stay)`
- Modify: `RadioInput/ClassicyRadioInput.scss (:13 →--control-bevel-lg; :39,68 →--control-frame-width; :27,28,93 control/1 → var(--window-control-size); :29,70,92,94,95,110 one-offs stay)`
- Modify: `ControlLabel (:23 →--ui-font-size-small; :35,39,56,64 one-offs), TextEditor (:9 →--ui-font-size-small; :41 →--control-frame-width), Slider (:4 →--slider-thumb-width; :5 →--slider-thumb-height; :185,392 →--ui-font-size-small; :322,369 one-offs), ColorPicker (:318 →--ui-font-size-small; :157,223,235,362 →--control-frame-width; :29-30,271,286 one-offs), ControlGroup (:18 →--control-frame-width; :46 →--ui-font-size-small; :51 →--ui-font-size-caption), Kbd (:17,27 →--control-padding; :29 →--ui-font-size-caption), Meter (:55 →--control-padding; :60 →--ui-font-size-caption), Table (:41,46 →--ui-font-size-small; :89 one-off), DriveSetupList (:67 →--ui-font-size-small; :21 one-off), ListBox (:24 →--control-padding; :26 →--control-padding-loose), Output (:17), Separator (:20,36), Spinner (:21 →--control-square-size; :22 →--control-padding; :26 border×1), Tree (:44,52), FileInput (:40), FileOpenDialog (:6 padding×1; :37), DatePicker (:16 border×1; :28), TimePicker (:16; :33 →--control-row-height; :53 one-off), LittleArrows (:14 →--control-glyph-size; :18 border×1; :79 →--control-bevel-md; :105 →--control-frame-width), ProgressBar (:86-87 →--control-glyph-size), FileBrowserViewTable (:100 →--control-glyph-size; :50,55 one-offs), Assistant (:16 →--menu-item-icon-gap? NO — Assistant is not a menu: :16 stays as a one-off listed; :17 →--control-row-height; :46-47 →--control-glyph-size; :51-52,58-59,75,86,93 one-offs), QuickTimeMovieEmbed (every control×1.5 →--control-row-height; :124,145 →--control-glyph-size; :48 border×1; :255 →--control-frame-width; the rest one-offs), Icon/DesktopIcon (:11-12 →--desktop-icon-cell; Icon:31-32, DesktopIcon:34 →--desktop-icon-label-pad; DesktopIcon:129 `--alias-badge-size: var(--desktop-icon-padding)`; :33,:43,:45 one-offs), MenuBar (:29,81 →--control-frame-width), MenuWidgetTime (:16), ImageWell (:40,47), Input (:21,22), RichTextEditor (:17,18), appearance.scss (:92-94,100,161,173,195,217 border×1 → var(--window-border-size); :162,174,196,204,218,220 →--control-frame-width; :205 →--control-bevel-md), scrollbars.scss (:162,163,169,170 →--control-frame-width; :4-6 arrow-size forms stay — Platinum glyph geometry), AppearanceManager.Colors.scss (:35 one-off), StartupScreen (:62 →--control-padding-wide; :17-19,57-58 one-offs)`
- Test: `src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts (new)`
- Test: `the existing compiled-CSS tests: Window/ClassicyWindow.resizer.test.ts, Tabs/ClassicyTabs.typescale.test.ts, ColorPicker/ClassicyColorPickerDialog.styles.test.ts, File/ClassicyFileBrowserViewTable.styles.test.ts, HelpButton/ClassicyHelpButton.test.tsx — all must keep passing`

**Depends on:** 2.1

**Interfaces:**
- Consumes: The 35 derivation names (2.1) plus the pre-existing `--control-row-height`, `--control-frame-width`, `--control-bevel-md`, `--control-bevel-lg`.
- Produces: Every site in the file list reads `var(--<name>)`; the one-offs listed as 'stay' are collected into `docs/AGENT-REFERENCE.md` §8 as the part H inventory. Tabs.typescale.test.ts currently resolves `calc(var(--ui-font-size) * 10 / 12)` by hand — update its resolver to also understand `var(--ui-font-size-compact)` via `getThemeVars`.

- [ ] **Step 1: Write the failing reader test** — `ClassicyDerivationReaders.test.ts` compiles the touched files and asserts the exact declarations (one `it` per family):
```ts
it("window: collapsed heights, frame inset, header font", () => { expect(rule(".classicyWindow.collapsed").height).toBe("var(--window-collapsed-height)"); expect(rule(".classicyWindowUtility.collapsed").height).toBe("var(--window-utility-collapsed-height)"); expect(rule(".classicyWindow").padding).toBe("var(--window-frame-inset)"); expect(rule(".classicyWindowHeader")["font-size"]).toBe("var(--window-header-font-size)"); });
```
(If Part A's class rename has not merged, the selectors are `.classicyWindowCollapsed` / `.classicyWindowUtility.classicyWindowCollapsed` — write the test against whatever `main` has.)
```ts
it("menu: min width, icon size and gap", () => { expect(rule(".classicyMenu")["min-width"]).toBe("var(--menu-min-width)"); expect(rule(".classicyMenuItemCheck").width).toBe("var(--menu-item-icon-size)"); expect(rule(".classicyMenuItemCheck")["margin-right"]).toBe("var(--menu-item-icon-gap)"); });
it("pop-up: height, mini size, arrow width", …);
it("typography steps", () => { expect(rule(".classicyButtonSmall")["font-size"]).toBe("var(--ui-font-size-mini)"); expect(rule(".classicyControlLabelSizeSmall")["font-size"]).toBe("var(--ui-font-size-small)"); expect(rule(".classicyControlGroupLegend")["font-size"]).toBe("var(--ui-font-size-caption)"); expect(tabsSmallFontSize).toBe("var(--ui-font-size-compact)"); expect(tabsLargeFontSize).toBe("var(--ui-font-size-large)"); });
it("tabs, slider, icon grid", () => { expect(rule(".classicyTabsSizeSmall .classicyTabButton")["min-width"]).toBe("var(--tab-min-width)"); expect(sliderThumbWidthDeclaration).toContain("var(--slider-thumb-width)"); expect(rule(".classicyDesktopIcon").width).toBe("var(--desktop-icon-cell)"); });
it("no rewritten family still carries its multiplier", () => { for (const [file, re] of [[window, /control-size\) \* 1\.25\)/], [menu, /control-size\) \* 15\)/], [popUp, /2\.125|1\.3125/], [tabs, /10 \/ 12|\* 9\)|4 \/ 2\.5/], [button, /\/1\.5\)/]]) expect(file).not.toMatch(re); });
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — declarations still read `calc(...)`. — `pnpm exec vitest run src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts`
- [ ] **Step 3: Rewrite the readers file by file** — Apply the per-file list in Files. Rules: (1) replace only the simple `calc(var(--x) * N)` form; when it is one term of a larger expression (e.g. `calc(100% - var(--window-control-size) * 4 - …)`) leave it; (2) `calc(var(--x) * 1)` / `/ 1` → `var(--x)`; (3) `* 2` on border → `var(--control-frame-width)`, `* 3` → `--control-bevel-md`, `* 4` → `--control-bevel-lg`; (4) never change a value — if a site's multiplier is not in the table (one-offs), leave it and add it to the one-off list. Commit every ~10 files: `refactor(scss): read named derivations in <files>`.
- [ ] **Step 4: Verify the multiplier count dropped to the one-off set** — Expected: ≤ 60 (from 391), and every remaining line is in the one-off list written to docs in Phase 4; paste the list into the commit body. — `grep -rnoE 'calc\(\s*var\(--[a-z0-9-]+\)\s*[*/]\s*[0-9.]+(\s*/\s*[0-9.]+)?\s*\)' src --include=*.scss | grep -v Extensions/ScreenSaver | wc -l`
- [ ] **Step 5: Run the whole suite** — Expected: PASS, including the five pre-existing compiled-CSS tests (fix Tabs.typescale's resolver per Interfaces if it fails). — `pnpm test`
- [ ] **Step 6: Early parity on Window/Menu/PopUpMenu/Tabs/Button** — Re-shoot `desktop-window--*`, `desktop-menu--*`, `desktop-menubar--*`, `controls-popupmenu--*`, `controls-tabs--*`, `controls-button--*`, `controls-placard--*` into `mid/` and compare. Expected AE 0 everywhere (rounding to 3 decimals changes no layout pixel; if a font-size story differs, drop `px3` rounding for the typography family and pin the raw JS string instead — record which).
- [ ] **Step 7: Lint, type-check, commit** — git add -A src && git commit -m "refactor(scss): read named theme derivations instead of multipliers" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts`

## Phase 3: JS geometry reads CSS

### 3.1: readClassicyThemeVar and ClassicyWindow geometry

**Files:**
- Create: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx (:57-68, :120-143, :160-168, :958-959, :1098-1099, :1316-1317,1336,1351,1396, :1492-1495 comment)`
- Modify: `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx (:27-35)`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts (new)`
- Test: `existing: Window/ClassicyWindow.hig.test.tsx (:180 expects position [8, 38] — must keep passing), Window/ClassicyWindow.zoom*.test.* if present`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `--menu-bar-height`, `--window-zoom-margin`, `--window-resize-inset`, `--window-collapsed-height` (2.1); `getThemeVars`, `getTheme("default")`.
- Produces: ```ts
// ClassicyThemeMetricReader.ts
export const classicyDefaultThemeVarPx = (name: string): number  // parseFloat(getThemeVars(getTheme("default"))[name]); throws `classicyLog("error", "Theme", …)`-logged Error when the name is not emitted
export const readClassicyThemeVar = (name: string, fallback: number = classicyDefaultThemeVarPx(name), el?: Element | null): number
```
`readClassicyThemeVar` returns `parseFloat(getComputedStyle(el ?? document.getElementById("classicyDesktop") ?? document.documentElement).getPropertyValue(name))` when that is a finite number > 0, else `fallback`; with no `document` it returns `fallback`. `ClassicyWindow.tsx`: `resolveSize` (:57), `resolvePosition` (:120), `clampPosition`/the :160 function and `computeStandardRect` (:1316) replace `const menuBarHeight = 30` with `const menuBarHeight = readClassicyThemeVar("--menu-bar-height")`; `const margin = 8` → `readClassicyThemeVar("--window-zoom-margin")`; the two `+ 5` pairs → `+ resizeInset` where `const resizeInset = readClassicyThemeVar("--window-resize-inset")` is read once at the top of each handler; the comment at :1492-1495 is rewritten to 'forced to `--window-collapsed-height` (15 px) by `.classicyWindow.collapsed`'. `useClassicyBalloonHelp.readControlSize` → `readClassicyThemeVar("--window-control-size")`.

- [ ] **Step 1: Write the failing tests** — `ClassicyThemeMetricReader.test.ts`:
```ts
it("reads the variable from #classicyDesktop", () => { const d = document.createElement("div"); d.id = "classicyDesktop"; d.style.setProperty("--menu-bar-height", "42px"); document.body.append(d); expect(readClassicyThemeVar("--menu-bar-height")).toBe(42); });
it("falls back to the default theme value when the desktop is absent", () => expect(readClassicyThemeVar("--menu-bar-height")).toBe(30));
it("falls back when the computed value is empty or NaN", () => { desktop without the property → 30; explicit fallback 7 → 7 });
it("classicyDefaultThemeVarPx throws for an unknown name", () => expect(() => classicyDefaultThemeVarPx("--nope")).toThrow(/not emitted/));
```
`ClassicyWindow.geometry.test.ts`:
```ts
it("resolveSize subtracts the menu-bar height read from CSS", () => { mount #classicyDesktop 800×600 (define clientWidth/Height via Object.defineProperty) with --menu-bar-height: 40px; expect(resolveSize(["100%", "100%"])).toEqual([800, 560]); });
it("resolvePosition clamps y to the CSS menu-bar height", () => { --menu-bar-height: 25px → resolvePosition(["left", "top"], [100, 100])[1] === 25 });
it("without a desktop the constants equal today's values", () => { expect(resolveSize(["100%", "100%"])).toEqual([800, 570]); });
it("zoom standard rect uses --window-zoom-margin", () => { render a zoomable window with --window-zoom-margin: 10px, trigger toggleZoom via the zoom box; expect the dispatched position [10, 40] (10 margin, 30 menu bar + 10) — follow ClassicyWindow.hig.test.tsx:170-185's dispatch-capture idiom });
```
(jsdom's `getComputedStyle` returns inline custom properties set with `style.setProperty`; if it does not, the test sets `Object.defineProperty(window, "getComputedStyle", …)` to return a stub with `getPropertyValue` — note which in the test header.)
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found; `resolveSize` returns 570 regardless of the variable. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts`
- [ ] **Step 3: Implement ClassicyThemeMetricReader.ts and rewire ClassicyWindow.tsx and useClassicyBalloonHelp** — Per Interfaces. Run `pnpm exec barrelsby -c .ts-barrel.json`. Verify with `grep -n 'menuBarHeight = 30\|margin = 8\|+ 5;' src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` → no hits.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS, including ClassicyWindow.hig.test.tsx `[8, 38]`. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 5: Lint, type-check, commit** — git add -A src && git commit -m "refactor(window): read menu-bar height, zoom margin and resize inset from theme variables" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts`

### 3.2: Icon-grid math reads --desktop-icon-*

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx (:46-48)`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts (:63-71)`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx (:231-233, :252-258)`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons.tsx (:178-186)`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts (add)`
- Test: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts (add; create if absent)`

**Depends on:** 3.1

**Interfaces:**
- Consumes: `readClassicyThemeVar` (3.1); `--desktop-icon-size`, `--desktop-icon-padding`, `--desktop-icon-cell` (2.1).
- Produces: `getIconSize(theme): [number, number]` keeps its signature and returns `[readClassicyThemeVar("--desktop-icon-size", theme.desktop.iconSize), readClassicyThemeVar("--desktop-icon-padding", theme.desktop.iconSize / 4)]`; `iconGridLattice(theme, iconSizeOverride?)` computes `step` as `iconSizeOverride !== undefined ? iconSizeOverride * 2 : readClassicyThemeVar("--desktop-icon-cell", themeIconSize * 2)`; `ClassicyFileBrowser.tsx:231-233` keeps the store selector (it is the fallback) and passes `readClassicyThemeVar("--desktop-icon-size", themeIconSize)` to `listViewIconSize`; the literal `18` fallback at :258 stays (documented as deliberate in the existing comment). Behavior is identical whenever the desktop's inline vars equal the theme (always, today).

- [ ] **Step 1: Write the failing tests** — `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts`:
```ts
it("getIconSize prefers the desktop's --desktop-icon-size over the theme number", () => { mount #classicyDesktop with --desktop-icon-size: 64px and --desktop-icon-padding: 16px; expect(getIconSize(getTheme("default"))).toEqual([64, 16]); });
it("getIconSize falls back to the theme without a desktop", () => expect(getIconSize(getTheme("default"))).toEqual([48, 12]));
it("iconGridLattice pitch reads --desktop-icon-cell", () => { --desktop-icon-cell: 80px → pitch [80, 80]; origin [padding, padding] });
it("iconGridLattice with an override ignores the CSS cell", () => expect(iconGridLattice(theme, 32).pitch).toEqual([64, 64]));
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `[48, 12]` returned despite the desktop vars. — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.test.ts`
- [ ] **Step 3: Implement per Interfaces** — Three small edits; keep `getIconSize`'s export and signature so `ClassicyFileBrowserViewIcons.tsx:179` needs no change beyond the lattice.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS (desktop clean-up and Finder icon-view tests unchanged). — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/File`
- [ ] **Step 5: Lint, type-check, commit** — git add -A src && git commit -m "refactor(icons): icon-grid math reads --desktop-icon-size/-padding/-cell" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts`

## Phase 4: Parity, docs, final verification

- [ ] Re-shoot every id in `.playwright-mcp/parity/part-G/stories.txt` into `after/` (restart Storybook first).
- [ ] `for f in .playwright-mcp/parity/part-G/before/*.png; do n=$(compare -metric AE "$f" ".playwright-mcp/parity/part-G/after/$(basename "$f")" ".playwright-mcp/parity/part-G/diff/$(basename "$f")" 2>&1); echo "$n $(basename "$f")"; done | sort -n | tail -20` → every line is `0` except the error-styled alert stories named in 1.2 Step 7; for those, open `diff/<id>.png` and confirm the changed pixels lie inside the title bar only. List the non-zero ids and counts in the PR description under 'Named visual change'.
- [ ] docs/AGENT-REFERENCE.md §8 'CSS custom properties': add a 'Color helpers' table (`classicy-tint/shade/alpha` → expansion → example), extend the 'Derived metrics' table (~line 1144-1162) with the 35 entries from `CLASSICY_THEME_DERIVATIONS` (name · formula · Platinum value · readers), and add 'Multipliers still in SCSS (part H inventory)' listing every remaining `calc(var(--x) * N)` site from 2.2 Step 4 with file:line.
- [ ] CLAUDE.md Theming section: 'Colors: never a literal — use a `--color-*` token or `classicy-tint/shade/alpha("--color-x", pct)` from `src/Appearance/vocabulary/_color.scss`. Proportions: `getThemeVars` emits named derivations (`CLASSICY_THEME_DERIVATIONS`, `ClassicyThemeDerivations.ts`) such as `--window-collapsed-height`, `--menu-bar-height`, `--popup-height`, `--ui-font-size-small`; JS reads them with `readClassicyThemeVar` (`ClassicyThemeMetricReader.ts`), never a hard-coded number.'
- [ ] docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md §2.1: add 'Done (part G)'; §3.1 rows for :57/:120/:160/:1316, :958-959/:1098-1099, :1316-1317, :1492-1499: 'read from CSS (part G)'; §3.2 iconSize row likewise.
- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` → PASS; `grep -c 'color-mix' dist/classicy.css` ≥ 14; `grep -c '!important' …` is not this part's gate.
- [ ] `verify` skill: run the example app; `getComputedStyle(document.querySelector('.classicyDesktop')).getPropertyValue('--menu-bar-height')` → `30px`; zoom a window (position lands at [8, 38]); collapse a window; open the Apple menu (min-width 180 px); no console errors.
- [ ] Commit docs: `docs(theme): color helpers, named derivations and the metric reader` (with the trailer). Stop background dev servers.

**Validation:** `compare loop over .playwright-mcp/parity/part-G → AE 0 for every story except the named error-alert title bars`

## Acceptance Criteria

- [ ] `src/Appearance/vocabulary/_color.scss` exports `classicy-tint`, `classicy-shade`, `classicy-alpha`; the compiled-CSS test pins their `color-mix` expansions and the non-token error.
- [ ] The repo-wide literal sweep (1.2 Step 6) returns 0; `#f7cecd` appears nowhere; `theme-halftone` takes a token and paints a `::before` mask.
- [ ] `getThemeVars(getTheme("default"))` emits the 35 named derivations with the pinned values and reacts to changed inputs; the pre-existing 11 derivations are unchanged.
- [ ] The simple-multiplier count under src/**/*.scss drops from 391 to the documented one-off list (≤ 60), and no rewritten site still carries its multiplier.
- [ ] `ClassicyWindow.tsx` contains no `menuBarHeight = 30`, `margin = 8` or `+ 5` fudge; geometry reads `--menu-bar-height`, `--window-zoom-margin`, `--window-resize-inset` with the default theme as fallback; `getIconSize`/`iconGridLattice`/FileBrowser read `--desktop-icon-size`/`-padding`/`-cell`.
- [ ] All parity stories compare AE 0 except the named error-alert title bars, whose diff is confined to the title bar.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Contract: `_color.scss` with `classicy-tint`, `classicy-shade`, `classicy-alpha` (color-mix) and a compiled-CSS test | 1.1, Steps 1–4 |
| §9 Phase 6 item 1 — replace every literal in §2.1 incl. the duplicated #f7cecd (decision pinned: tint of --color-error, named change), #c00, overlays, scrollbar shading, Finder/WebViewer stragglers, theme-halftone | 1.2, Steps 3–4 (table in Interfaces) |
| §9 Phase 6 item 2 — multiplier inventory, named derivations beside the metric derivations, pinned names/formulas/values, a test per value, SCSS rewritten | 2.1 Steps 1–3; 2.2 Steps 3–4; constraints (inventory regex) |
| §9 Phase 6 item 4 / §3.1 — four menuBarHeight copies, +5 fudge, zoom margin, collapsed-height assumption via getComputedStyle (the useClassicyBalloonHelp pattern) | 3.1, Step 3 |
| §3.2 — iconSize reads in FileBrowserViewIcons/DesktopIconContext/FileBrowser bypassing the CSS var | 3.2, Step 3 |
| Depends on Part A only for `src/Appearance/vocabulary/` existing | constraints; 1.1 Interfaces |
| Platinum pixel-identical (with the one named exception) | Phase 0, 1.2 Step 7, 2.2 Step 6, Phase 4 |

**Placeholder scan:** No TBDs. Every replacement has file:line → value → arithmetic; every derivation has name, formula and value; every geometry site has its variable; one-offs are enumerated rather than waved at.
**Residual risk:** (1) The halftone rewrite depends on a `::before` child being clipped by the parent's `mask-image` exactly as a background was — true per CSS Masking, but Chromium's compositing of a masked child under a masked parent can differ by a sub-pixel at the icon edge; the Icon/DesktopIcon parity shots are the gate, and the fallback (if AE ≠ 0) is to keep `background-image` and emit the data URI from JS as `--classicy-halftone-image` in `getThemeVars` — a contract gap to raise with part C (`--classicy-art-*` namespace). (2) `px3` rounding of font sizes (11.667 vs 11.666…) could move a glyph by a layout unit in some engine; 2.2 Step 6 names the fallback (raw string for the typography family). (3) `readClassicyThemeVar` in jsdom: if `getComputedStyle` ignores inline custom properties, the fallback path keeps every existing test green but the two 'reads from CSS' tests need the stub noted in 3.1 Step 1. (4) The error-tint change is a visible (if small) departure; if the owner rejects it, the alternative is a `color.window.titleError` theme input (schema + 29th color target + migration) — scoped as a follow-up, not silently done here.

## Next Steps

1. Part H (pixel-literal purge) consumes the 35 names and the one-off inventory written to AGENT-REFERENCE §8; the negative-multiplier and multi-term calcs listed there are its first targets.
2. Part B moves `appearance.scss` (with the token-driven `theme-halftone`) into the Platinum package and swaps the relative `@use …/Appearance/vocabulary/color` paths for `classicy/scss/color`.
3. Contract gaps to raise on 0002-ldj: (a) `--menu-item-height` is suggested but nothing reads a menu row height — not emitted; (b) `readClassicyThemeVar` / `ClassicyThemeMetricReader.ts` and `CLASSICY_THEME_DERIVATIONS` / `ClassicyThemeDerivations.ts` are not pinned (parts F and H will read them); (c) whether a theme-colored data-URI art variable (`--classicy-halftone-image`) belongs to part C's `--classicy-art-*` namespace; (d) the `#f7cecd` decision (tint vs new color input) needs an owner call.
