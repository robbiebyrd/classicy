---
id: 0013-qck
title: 'G 2.1: ClassicyThemeDerivations.ts and getThemeVars emission'
purpose: 'Name the Platinum proportions once: a derivation table with formula, doc and Platinum value for each, emitted by `getThemeVars` and pinned by tests.'
type: feat
status: pending
priority: "2"
effort: M
created: "2026-10-28T19:54:56.238Z"
updated: "2026-10-28T19:54:56.238Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.test.ts
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0012-3av", "depends"]
  plans:
    - ["0004-vqt", "included", ["2.1"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
---

# G 2.1: ClassicyThemeDerivations.ts and getThemeVars emission

## Problem Statement

Audit §2.4 / D11: 86 distinct `calc(var(--x) * N)` combinations (391 sites) hide the Platinum proportions — collapsed window height 1.25× control, menu min-width 15×, pop-up height 2.125×, UI font steps 0.75/0.8/10⁄12/1.5. Umbrella 0002-ldj (colors and numbers): named derivations are added to `getThemeVars` beside the existing metric derivations (`ClassicyThemeMetrics.ts` pattern), named `--<family>-<measure>`; part G owns the inventory and the names, part H consumes them.

This story adds `ClassicyThemeDerivations.ts` with `CLASSICY_THEME_DERIVATIONS` (35 entries: cssVar, formula, doc, compute), `px3` (3-decimal rounding so tests pin exact strings) and `classicyThemeDerivations(inputs)`, spread into `getThemeVars` after `--layout-focus-gap`. Coincident formulas are kept as separate names where a package may want them independent. `--menu-item-height` (suggested by the contract) is not emitted: nothing reads a menu row height today.

**Impact:** G 2.2 rewrites the SCSS to these names and G 3.1/3.2 read `--menu-bar-height`, `--window-zoom-margin`, `--window-resize-inset`, `--desktop-icon-*` from CSS; without the emission every reader resolves to nothing.

## Steps

### 1: Write the failing tests

`ClassicyAppearance.test.ts`, after `emits every metric input and derivation for the default theme`: `it("emits every named derivation for the default theme")` — `const vars = getThemeVars(getTheme("default")) as Record<string, string>;` expected: `--window-collapsed-height` `15px`, `--window-utility-collapsed-height` `6px`, `--window-frame-inset` `4.8px`, `--window-zoom-margin` `8px`, `--window-resize-inset` `5px`, `--window-header-font-size` `12.11px`, `--window-title-stripe-height` `15px`, `--menu-bar-height` `30px`, `--menu-min-width` `180px`, `--menu-item-icon-size` `15px`, `--menu-item-icon-gap` `6px`, `--popup-height` `25.5px`, `--popup-mini-size` `15.75px`, `--popup-arrow-width` `21px`, `--control-glyph-size` `15px`, `--control-square-size` `24px`, `--button-square-width` `48px`, `--control-padding` `3px`, `--control-padding-tight` `1.5px`, `--control-padding-narrow` `2px`, `--control-padding-loose` `4px`, `--control-padding-wide` `9px`, `--ui-font-size-small` `11.2px`, `--ui-font-size-caption` `10.5px`, `--ui-font-size-compact` `11.667px`, `--ui-font-size-mini` `9.333px`, `--ui-font-size-large` `21px`, `--tab-height` `19.2px`, `--tab-min-width` `48px`, `--tab-min-width-large` `108px`, `--slider-thumb-width` `24px`, `--slider-thumb-height` `21px`, `--desktop-icon-padding` `12px`, `--desktop-icon-cell` `96px`, `--desktop-icon-label-pad` `3px`; `for (const [k, v] of Object.entries(expected)) expect(vars[k], k).toBe(v); expect(Object.keys(expected)).toHaveLength(35);`. `it("derives from the inputs, not constants")` — theme via `withDefaultThemeMetrics` with `window.controlSize: 16, paddingSize: 8`, `typography.uiSize: 12`, `desktop.iconSize: 32` → `--window-collapsed-height` `20px`, `--menu-bar-height` `40px`, `--popup-height` `34px`, `--window-frame-inset` `6.4px`, `--window-zoom-margin` `10px`, `--window-resize-inset` `7px`, `--ui-font-size-small` `9.6px`, `--ui-font-size-compact` `10px`, `--desktop-icon-cell` `64px`, `--desktop-icon-padding` `8px`. `it("keeps the pre-existing derivations unchanged")` (`--control-row-height` `18px`, `--edit-field-height` `22px`). `ClassicyThemeDerivations.test.ts`: `it("has 35 unique cssVars, each starting with --")`, `it("every entry has a non-empty formula and doc")`, `it("px3 rounds to three decimals")` (`px3(14 * 0.865)` toBe `"12.11px"`, `px3(14 * 10 / 12)` toBe `"11.667px"`, `px3(12)` toBe `"12px"`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager` — Expected: FAIL — module not found; `--window-collapsed-height` undefined.

### 3: Implement ClassicyThemeDerivations.ts and the getThemeVars spread

`export const px3 = (n: number): string => intToPx(Math.round(n * 1000) / 1000)`; `export type ClassicyThemeDerivationInputs = { measurements: ClassicyThemeMeasurements; typography: Pick<ClassicyThemeTypography, "uiSize">; desktop: Pick<ClassicyThemeDesktop, "iconSize" | "iconFontSize"> }`; `export type ClassicyThemeDerivation = { cssVar: string; formula: string; doc: string; compute: (i: ClassicyThemeDerivationInputs) => number }`; `export const CLASSICY_THEME_DERIVATIONS: readonly ClassicyThemeDerivation[]` with exactly the 35 entries (cssVar · formula): window-collapsed-height controlSize×1.25; window-utility-collapsed-height controlSize×0.5; window-frame-inset paddingSize/1.25; window-zoom-margin paddingSize + borderSize×2; window-resize-inset paddingSize − borderSize; window-header-font-size uiSize×0.865; window-title-stripe-height controlSize×1.25; menu-bar-height controlSize×2.5; menu-min-width controlSize×15; menu-item-icon-size controlSize×1.25; menu-item-icon-gap controlSize×0.5; popup-height controlSize×2.125; popup-mini-size controlSize×1.3125; popup-arrow-width controlSize×1.75; control-glyph-size controlSize×1.25; control-square-size controlSize×2; button-square-width controlSize×4; control-padding paddingSize×0.5; control-padding-tight paddingSize/4; control-padding-narrow paddingSize/3; control-padding-loose paddingSize/1.5; control-padding-wide paddingSize×1.5; ui-font-size-small uiSize×0.8; ui-font-size-caption uiSize×0.75; ui-font-size-compact uiSize×10/12; ui-font-size-mini uiSize/1.5; ui-font-size-large uiSize×1.5; tab-height controlSize×4/2.5; tab-min-width controlSize×4; tab-min-width-large controlSize×9; slider-thumb-width controlSize×2; slider-thumb-height controlSize×1.75; desktop-icon-padding iconSize/4; desktop-icon-cell iconSize×2; desktop-icon-label-pad iconFontSize/4. Each `doc` is one sentence naming the reader (e.g. `--menu-min-width`: 'Minimum dropdown width (ClassicyMenu.scss)') and, for the coincident 1.25×/2×/1.75×/4× pairs, its structural reason. `export const classicyThemeDerivations = (i) => Object.fromEntries(CLASSICY_THEME_DERIVATIONS.map((d) => [d.cssVar, px3(d.compute(i))]))`. In `getThemeVars` (ClassicyAppearance.ts:258-270), after `"--layout-focus-gap"`, spread `...classicyThemeDerivations({ measurements: m, typography: theme.typography, desktop: theme.desktop })`; the existing 11 derivations stay unchanged. Run `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager && pnpm exec tsc --noEmit -p .` — Expected: PASS.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/ControlPanels/AppearanceManager src/index.ts && git commit -m "feat(theme): named derivations for the Platinum proportions in getThemeVars"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts -t 'named derivation'
- [ ] `getThemeVars(getTheme("default"))` emits all 35 named derivations with the pinned values (e.g. `--window-collapsed-height` 15px, `--menu-bar-height` 30px, `--popup-height` 25.5px, `--ui-font-size-compact` 11.667px) and they change with the inputs.
- [ ] The pre-existing 11 derivations (`--control-row-height` 18px, `--edit-field-height` 22px, …) are unchanged; `--menu-item-height` is not emitted.
- [ ] `CLASSICY_THEME_DERIVATIONS` has 35 unique `--`-prefixed cssVars, each with a formula and a doc naming its reader.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts` - create: px3, types, CLASSICY_THEME_DERIVATIONS, classicyThemeDerivations
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - :258-270 spread the derivations after --layout-focus-gap
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` - three new cases
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.test.ts` - create
- `src/index.ts` - regenerated barrel

## Work Log
