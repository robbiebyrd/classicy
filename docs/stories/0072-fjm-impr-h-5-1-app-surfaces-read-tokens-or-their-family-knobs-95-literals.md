---
id: 0072-fjm
title: 'H 5.1: App surfaces read tokens or their family knobs (95 literals)'
purpose: Rewrite HyperCard, Finder About This Computer, Finder Preferences, Apple Guide and Color Picker literals to core tokens or their `--hyper-card-*`, `--finder-*`, `--apple-guide-*`, `--color-picker-*` knobs, pixel-identical.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:38:01.840Z"
updated: "2026-10-28T20:38:01.840Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/HyperCard/HyperCard.scss
      - src/SystemFolder/Finder/FinderAboutThisComputer.scss
      - src/SystemFolder/Finder/FinderPreferences.scss
      - src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
      - bin/pixel-literal-allowlist.json
      - src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0071-h9m", "depends"]
  plans:
    - ["0011-v9t", "included", ["5.1"]]
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
  "6":
    status: pending
---

# H 5.1: App surfaces read tokens or their family knobs (95 literals)

## Problem Statement

After the pixel-matched surfaces, the next largest literal counts in audit §2.5 are app-level layouts: HyperCard 40, FinderAboutThisComputer 20, ColorPicker 16, AppleGuide 12 and FinderPreferences 7. D9 says every one becomes a theme variable or a value computed from one.

This section (plan 0011-v9t §5.1) applies the plan's rule: a literal that equals an existing token with the same meaning reads that token (`4px` gap → `--layout-item-gap`, `6px` → `--window-padding-size`, `1px` edge → `--window-border-size`, `16px` icon → `--icon-small-size`); everything else reads the knob family H 2.1 added (`--hyper-card-*`, `--finder-*`, `--apple-guide-*`, `--color-picker-*`). The Color Picker's Sass ratio math (`$cp-wheel-max`, `$cp-wheel-inset`) becomes unitless so the percentage survives without a pixel literal. Color literals on the same lines are Part G's and are left as Part G left them.

**Impact:** These five files hold 95 of the 283 literals; H 6.1 requires the allowlist to be empty and would fail its `the pixel allowlist is empty` test.

## Steps

### 1: Write the failing test

`src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts`: `it.each([HyperCard.scss, FinderAboutThisComputer.scss, FinderPreferences.scss, AppleGuide.scss, ClassicyColorPicker.scss])('%s has no bare pixel literal', f => expect(scanPixelLiteralsInSource(readFileSync(f,'utf8'), f).filter(l => l.kind === 'bare').map(l => `${l.line}:${l.text}`)).toEqual([]))`.

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts` — Expected: FAIL listing 40, 20, 7, 12, 16 entries.

### 3: Rewrite the five files per the table

Verify each cited line first (`grep -n px <file>`); Parts A/G may have shifted lines but not the literals. HyperCard (40): `:54,66,180,248 border: 1px` → `var(--window-border-size)`; `:57 font-size: 11px` → `var(--hyper-card-font-size)`; `:186-187 6px` → `var(--hyper-card-handle-size)`; `:192-199` every `-3px` → `calc(var(--hyper-card-handle-size) / -2)` and every `calc(50% - 3px)` → `calc(50% - var(--hyper-card-handle-size) / 2)` (16); `:204,205,210,229,244,249,252 4px` → `var(--layout-item-gap)`; `:215,266 padding: 2px 4px` → `calc(var(--layout-item-gap) / 2) var(--layout-item-gap)`; `:222,223,238,239 6px` → `var(--window-padding-size)`; `:224 max-width: 220px` → `var(--hyper-card-palette-max-width)`; `:257 margin-left: 12px` → `var(--hyper-card-indent)`. FinderAboutThisComputer (20): `:13 gap: 16px` → `--layout-group-gap`; `:14,39 padding: 8px` → `--finder-padding`; `:19 260px` → `--finder-about-banner-width`; `:20 120px` → `--finder-about-banner-height`; `:30 drop-shadow(4px 4px 6px …)` → `drop-shadow(var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-blur) …)`; `:47 gap: 12px` → `--finder-about-row-gap`; `:50,51 56px` → `--finder-about-icon-size`; `:52 padding: 4px` → `--layout-item-gap`; `:69 padding: 4px 8px 6px` → `var(--layout-item-gap) var(--finder-padding) var(--window-padding-size)`; `:93 gap: 6px` → `--window-padding-size`; `:94 padding: 4px 8px` → `var(--layout-item-gap) var(--finder-padding)`; `:104 80px` → `--finder-about-label-width`; `:108 60px` → `--finder-about-value-width`. FinderPreferences (7): `:4,5,23 8px` → `--finder-padding`; `:12 gap: 4px`, `:16 margin: 4px 0 0` → `--layout-item-gap`; `:28,29 16px` → `--icon-small-size`. AppleGuide (12): `:23 42px` → `--apple-guide-header-height`; `:24 0 12px` → `0 var(--apple-guide-header-padding-x)`; `:28 13px` → `--apple-guide-header-font-size`; `:35 14px` → `--apple-guide-body-font-size`; `:37 12px 20px` → `var(--apple-guide-body-padding-y) var(--apple-guide-body-padding-x)`; `:40,44 0 0 12px` → `0 0 var(--apple-guide-paragraph-gap)`; `:45 18px` → `--apple-guide-list-indent`; `:58 2px` → `--apple-guide-list-item-gap`; `:69 48px` → `--apple-guide-footer-height`; `:70 0 10px` → `0 var(--apple-guide-footer-padding-x)`. ColorPicker (16): `:11-12` → `$cp-wheel-max: 240; $cp-wheel-inset: math.div(20, $cp-wheel-max) * 100%;` (unitless; `:304 inset: $cp-wheel-inset` stays a percentage) and `:297 max-width: $cp-wheel-max` → `var(--color-picker-wheel-max)`; `:17` → delete, `:299 margin-left` → `var(--color-picker-label-overhang)`; `:78 90px` → `--color-picker-mode-list-width`; `:88,89` → `var(--focus-ring-width)` / `calc(var(--focus-ring-inset) * -1)`; `:93 3px 6px` → `var(--color-picker-item-padding-y) var(--window-padding-size)`; `:219 -8px` → `calc(var(--color-picker-crayon-hover-lift) * -1)`; `:227 -5px` → `calc(var(--color-picker-crayon-selected-lift) * -1)`; `:233 22px` → `--color-picker-box-lip-height`; `:236 6px` → `--window-padding-size`; `:241 20px` → `var(--control-height)`; `:358 44px` → `--color-picker-field-width`; `:362 4px` → `--layout-item-gap`; `:371 14px` → `--color-picker-unit-width`. After making `$cp-wheel-max` unitless: `pnpm exec sass --no-source-map src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss | grep -c 'inset: 8.3333'` → 1.

### 4: Ratchet the allowlist

`node bin/check-pixel-literals.ts` — Expected: five `tighten` messages; delete the entries; re-run → exit 0.

### 5: Run tests and parity

`pnpm exec vitest run src/SystemFolder/HyperCard src/SystemFolder/Finder src/SystemFolder/Extensions/AppleGuide src/SystemFolder/SystemResources/ColorPicker` — Expected: PASS. Re-shoot `extensions-appleguide--*`, `controls-colorpicker--*` into `after/` → AE 0; re-shoot the four example-app screens (`app-hypercard`, `app-about`, `app-finder-preferences`, `app-drive-setup`) → AE 0.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/HyperCard src/SystemFolder/Finder src/SystemFolder/Extensions/AppleGuide src/SystemFolder/SystemResources/ColorPicker bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): HyperCard, Finder, Apple Guide and Color Picker read theme variables and knobs"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts
- [ ] VERIFY: node bin/check-pixel-literals.ts && ! grep -E 'HyperCard|FinderAbout|FinderPreferences|AppleGuide|ColorPicker' bin/pixel-literal-allowlist.json
- [ ] VERIFY: pnpm exec sass --no-source-map src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss | grep -c 'inset: 8.3333'  # expect 1
- [ ] [MANUAL] `extensions-appleguide--*`, `controls-colorpicker--*` and the four example-app screens compare AE 0 before vs after.

## Files

- `src/SystemFolder/HyperCard/HyperCard.scss` - modify: 40 literals read tokens and --hyper-card-*
- `src/SystemFolder/Finder/FinderAboutThisComputer.scss` - modify: 20 literals read tokens and --finder-about-*
- `src/SystemFolder/Finder/FinderPreferences.scss` - modify: 7 literals read tokens and --finder-padding
- `src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss` - modify: 12 literals read --apple-guide-*
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` - modify: 16 literals read tokens and --color-picker-*; unitless Sass ratio math
- `bin/pixel-literal-allowlist.json` - modify: five entries removed
- `src/SystemFolder/HyperCard/HyperCard.pixelLiterals.test.ts` - create: no-literal check over the five files

## Work Log
