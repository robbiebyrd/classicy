---
id: 0071-h9m
title: 'H 4.1: Pixel-matched surfaces read their knob families (60 literals)'
purpose: Rewrite the menu frame, scrollbar arrow glyphs, Pager, Balloon Help and PopUpSlider literals to their `measurements.<family>` knobs, pixel-identical.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:37:19.203Z"
updated: "2026-10-28T20:37:19.203Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/styles/_mixins.scss
      - src/Appearance/Platinum/styles/_scrollbars.scss
      - src/SystemFolder/SystemResources/Pager/ClassicyPager.scss
      - src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss
      - src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.scss
      - bin/pixel-literal-allowlist.json
      - src/SystemFolder/SystemResources/Pager/ClassicyPager.test.tsx
      - src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx
      - src/Appearance/Platinum/styles/pixelLiterals.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0070-yf7", "depends"]
  plans:
    - ["0011-v9t", "included", ["4.1"]]
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

# H 4.1: Pixel-matched surfaces read their knob families (60 literals)

## Problem Statement

Audit §2.5 names the menu frame (19 literals, HIGOS8 Figure 6-15), the scrollbar arrow glyph boxes (8), the Pager (17, measured from the About Help capture), Balloon Help (9) and the PopUpSlider (7, HIGOS8 Figure 2-16) as pixel-matched art whose geometry a package must be able to change (D9, §8.7). Umbrella 0002-ldj assigns them `measurements.<family>` knobs.

This section (plan 0011-v9t §4.1) rewrites the five files per a line-by-line table to `--menu-frame-*`, `--scrollbar-arrow-glyph-*`, `--pager-*`, `--balloon-help-*` and `--pop-up-slider-*` (from H 2.1) plus `--focus-ring-width` and `--ui-font-size`, with source-level tests that each file has no bare literal, then ratchets the allowlist. Balloon Help's `calc(var(--ui-font-size) * 0.85)` is a multiplier and stays Part G's.

**Impact:** These five files hold 60 of the 283 literals; without this story the allowlist cannot reach empty in H 6.1 and the Platinum menu frame, pager and balloon stay fixed-size for every package.

## Steps

### 1: Write the failing tests

Pager (`ClassicyPager.test.tsx`): jsdom does not cascade custom properties into `calc`, so assert the SCSS source: `reads its geometry from --pager-* variables` → `expect(readFileSync(pagerScss,'utf8')).toMatch(/width:\s*var\(--pager-arrow-width\)/)` and `no bare literal` via `scanPixelLiteralsInSource(...).filter(bare)` → `[]`. Same `no bare literal` test for BalloonHelp (in `ClassicyBalloonHelp.test.tsx`), and a `_mixins.scss`/`_scrollbars.scss`/`ClassicyPopUpSlider.scss` source check in a new `src/Appearance/Platinum/styles/pixelLiterals.test.ts` (one `it.each` over the three files).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/Appearance/Platinum/styles` — Expected: FAIL with the literal lists (17, 9, 19+8+7).

### 3: Rewrite the five files per the table

Menu frame (`_mixins.scss`, the former `platinumMenuFrame` lines 20-52): `border: 1px` → `var(--menu-frame-border-width)`; the four `px-rect` lines: each `1px` → `var(--menu-frame-bevel-width)`, `calc(100% - 1px)` → `calc(100% - var(--menu-frame-bevel-width))`; right shadow `top: 1px` → `var(--menu-frame-shadow-start)`, `right: -2px; bottom: -2px` → `calc(var(--menu-frame-shadow-offset) * -1)`, `width: 1px` → `var(--menu-frame-shadow-width)`; bottom shadow `left: 1px` → shadow-start, `right/bottom: -2px` → offset, `height: 1px` → shadow-width. Scrollbars (`_scrollbars.scss` lines 298, 314, 335, 352 today): `7px 8px` → `var(--scrollbar-arrow-glyph-width) var(--scrollbar-arrow-glyph-height)`; `8px 7px` → height then width (the vertical bar's glyph is rotated). Pager: `border: 1px` → `var(--pager-border-width)`; `width: 42px` → `--pager-arrow-width`; `height: 36px` ×2 → `--pager-cell-height`; `border-block: 8px` → `--pager-glyph-half-height`; `11px` ×2 → `--pager-glyph-depth`; `border-block-width: 5px` ×2 → `--pager-punch-half-height`; `7px` ×2 → `--pager-punch-depth`; `min-width: 32px` → `--pager-page-min-width`; `font-size: 12px` → `var(--ui-font-size)`; `border-top: 2px` → `--pager-page-top-border`; the three `1px` cell borders → `--pager-border-width`. Balloon Help: `border-radius: 8px` → `--balloon-help-corner-radius`; `min-width: 80px` → `--balloon-help-min-width`; `max-width: 220px` → `--balloon-help-max-width`; `margin-bottom: 3px` → `--balloon-help-title-gap`; `bottom: -12px` / `top: -12px` → `calc(var(--balloon-help-tail-offset) * -1)`; `left: 8px` / `right: 8px` → `--balloon-help-tail-inset`; `calc(50% - 10px)` → `calc(50% - var(--balloon-help-tail-width) / 2)`. PopUpSlider: `width: 17px` → `--pop-up-slider-width`; `height: 73px` → `--pop-up-slider-height`; focus `1px` → `var(--focus-ring-width)`, `outline-offset: -1px` → `calc(var(--focus-ring-width) * -1)`; `left: 4px; top: 3px` → `--pop-up-slider-track-left/-top`; `left: 1px` → `--pop-up-slider-thumb-left`. Keep every comment that explains a measurement; append `(measurements.<family>, platinum.json)` where a comment names a pixel value.

### 4: Ratchet the allowlist

`node bin/check-pixel-literals.ts` — Expected: five `tighten` messages; delete the five entries; re-run → exit 0.

### 5: Run tests and parity

`pnpm exec vitest run src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/SystemResources/PopUpSlider src/SystemFolder/SystemResources/Menu src/Appearance` — Expected: PASS. Re-shoot `desktop-menu--*`, `controls-pager--*`, `controls-balloonhelp--*`, `controls-popupslider--*`, `desktop-window--*` (scrollbars) into `after/`; `compare -metric AE` → `0` each.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/Appearance/Platinum/styles src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/SystemResources/PopUpSlider bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): menu frame, scrollbar arrows, pager, balloon help and pop-up slider read package knobs"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: node bin/check-pixel-literals.ts && ! grep -E 'Pager|BalloonHelp|PopUpSlider|_mixins|_scrollbars' bin/pixel-literal-allowlist.json
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Pager src/SystemFolder/SystemResources/BalloonHelp src/Appearance/Platinum/styles
- [ ] [MANUAL] `desktop-menu--*`, `controls-pager--*`, `controls-balloonhelp--*`, `controls-popupslider--*` and `desktop-window--*` stories compare AE 0 before vs after.

## Files

- `src/Appearance/Platinum/styles/_mixins.scss` - modify: menu frame reads --menu-frame-*
- `src/Appearance/Platinum/styles/_scrollbars.scss` - modify: arrow glyph box reads --scrollbar-arrow-glyph-*
- `src/SystemFolder/SystemResources/Pager/ClassicyPager.scss` - modify: 17 literals read --pager-* and --ui-font-size
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss` - modify: 9 literals read --balloon-help-*
- `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.scss` - modify: 7 literals read --pop-up-slider-* and --focus-ring-width
- `bin/pixel-literal-allowlist.json` - modify: five entries removed
- `src/SystemFolder/SystemResources/Pager/ClassicyPager.test.tsx` - modify: source-level geometry and no-literal tests
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.test.tsx` - modify: no-literal test
- `src/Appearance/Platinum/styles/pixelLiterals.test.ts` - create: no-literal check over the three Platinum/PopUpSlider files

## Work Log
