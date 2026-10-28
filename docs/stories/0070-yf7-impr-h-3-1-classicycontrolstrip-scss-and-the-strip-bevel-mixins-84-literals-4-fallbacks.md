---
id: 0070-yf7
title: 'H 3.1: ClassicyControlStrip.scss and the strip bevel mixins (84 literals, 4 fallbacks)'
purpose: Rewrite the Control Strip's 84 pixel literals and 4 fallbacks to read the `--control-strip-*` knobs and the focus-ring derivations, pixel-identical.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:36:39.615Z"
updated: "2026-10-28T20:36:39.615Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss
      - src/Appearance/Platinum/styles/_mixins.scss
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx
      - bin/pixel-literal-allowlist.json
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0069-fiu", "depends"]
  plans:
    - ["0011-v9t", "included", ["3.1"]]
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

# H 3.1: ClassicyControlStrip.scss and the strip bevel mixins (84 literals, 4 fallbacks)

## Problem Statement

The Control Strip is the audit's worst offender (§2.5: 84 bare literals, pixel-matched to HIGOS8 Figure 6-15 by design) plus 4 `var(--x, Npx)` fallbacks. Its geometry — 22 px cells, 13 px narrow cells, 30 px modules, 1 px bevel lines, glyph offsets and the +1 px pressed shift — is baked into SCSS, so a package cannot resize it (D9, §8.7).

This section (plan 0011-v9t §3.1) rewrites every literal per a line-by-line table to the `--control-strip-*` knobs from H 2.1 and the `--focus-ring-width`/`--focus-ring-inset` derivations, in both the component file and the Platinum file Part B moved the three strip bevel mixins to. The TSX `MODULE_STEP_FALLBACK = 31` becomes a read of `--control-strip-module-width` + `--control-strip-border-width` (the `useClassicyBalloonHelp` idiom). The allowlist entry for the file drops to 0.

**Impact:** The Control Strip is 84 of the 283 literals; skipping it leaves the allowlist far from empty and the strip unresizable by any package. Later sections assume the `--focus-ring-*` derivations this section adds if Part G did not.

## Steps

### 1: Write the failing test

In `ClassicyControlStrip.test.tsx` add `scrolls one module step read from the theme variables`: render the strip inside a desktop root whose style sets `--control-strip-module-width: 40px; --control-strip-border-width: 2px`, make `offsetWidth` of the first module `0` (jsdom default), click the right scroll arrow and assert `modules.scrollLeft === 42` (today 31). Also `reads no pixel literal` → `expect(scanPixelLiteralsInSource(readFileSync('src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss','utf8'), 'strip').filter(l => l.kind === 'bare')).toEqual([])`. First check `grep -c focus-ring src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`; if 0, add `--focus-ring-width` = `intToPx(border)` and `--focus-ring-inset` = `intToPx(border * 3)` to `getThemeVars` now with the test from H 6.1.

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/SystemResources/ControlStrip -t 'module step|no pixel literal'` — Expected: FAIL — scrollLeft 31; 84 literals listed.

### 3: Rewrite the SCSS and the TSX fallback per the rewrite table

Locate the strip bevels with `grep -rl 'bevel-raised\|platinum-control-strip' src/Appearance/Platinum/styles src/SystemFolder/SystemResources/ControlStrip` (expect one Platinum file; edit that one). Rewrite table (today's value → replacement): `$cell-height` → delete, read `var(--control-strip-cell-height)`; `$narrow-cell` → `var(--control-strip-narrow-cell-width)`; `$module-width` → `var(--control-strip-module-width)`. Bevel mixins: every `1px` → `var(--control-strip-bevel-width)`, `2px` → `calc(var(--control-strip-bevel-width) * 2)`, `calc(100% - 3px)` → `calc(100% - var(--control-strip-bevel-width) * 3)`, `calc(100% - 4px)` → `* 4`. `strip-cell`: `border: 1px solid` → `var(--control-strip-border-width)`; focus `outline: 1px` → `var(--focus-ring-width)`, `outline-offset: -3px` → `calc(var(--focus-ring-inset) * -1)` (also on `.classicyControlStripTab`). `.classicyControlStrip`: `#{$cell-height + 2px}` and `height: $cell-height + 2px` → `calc(var(--control-strip-cell-height) + var(--control-strip-border-width) * 2)`; keep `var(--classicy-control-strip-bottom, 0px)` and `…-top-inset, 0px)` (instance variables set by the TSX; `0px` is exempt). `.classicyControlStripRight .classicyControlStripScrollStart` and `.classicyControlStripCollapseBox` `border-left: 1px` → `var(--control-strip-border-width)`. Collapse glyph: `left: 2px; top: 7px` → `var(--control-strip-collapse-glyph-left)` / `-top`; active `3px/8px` → `calc(var(--control-strip-collapse-glyph-left) + var(--control-strip-pressed-shift))` etc. Scroll glyph: `2px/6px` → `--control-strip-scroll-glyph-left/-top`, active `+ pressed-shift`. Module icon `2px/3px` → `--control-strip-module-icon-left/-top`; `var(--icon-small-size, 16px)` ×2 → `var(--icon-small-size)`; label `22px/7px` → `--control-strip-module-arrow-left/-top`; pressed `3px/4px`, `23px/8px` → `calc(… + var(--control-strip-pressed-shift))`. TSX: `MODULE_STEP_FALLBACK = 31` → `const moduleStepFallback = () => readDesktopPx('--control-strip-module-width') + readDesktopPx('--control-strip-border-width') || 31` where `readDesktopPx(name)` copies the `readControlSize` idiom in `useClassicyBalloonHelp.tsx:27-34`. Apply the table top to bottom; `calc()` inside `px-rect()` arguments is fine (the function only concatenates). Keep the HIGOS8 comment block; add one line: `Geometry comes from measurements.controlStrip (platinum.json); see getThemeVars.`

### 4: Ratchet the allowlist

`node bin/check-pixel-literals.ts` — Expected: one message `tighten the allowlist for src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss: 2 < 88` (the two exempt `0px` fallbacks do not count, so the real remaining count is 0 — delete the entry; also lower the Platinum mixins file entry by the bevel literals moved). Re-run → exit 0.

### 5: Run tests and parity

`pnpm exec vitest run src/SystemFolder/SystemResources/ControlStrip && pnpm lint` — Expected: PASS. Re-shoot `desktop-controlstrip--*` stories into `.playwright-mcp/parity/part-H/after/` and `compare -metric AE before/<id>.png after/<id>.png null:` → `0` for each (collapsed, right-docked and pressed-module stories included).

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add src/SystemFolder/SystemResources/ControlStrip src/Appearance/Platinum/styles bin/pixel-literal-allowlist.json && git commit -m "refactor(control-strip): read strip geometry from measurements.controlStrip knobs"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: node bin/check-pixel-literals.ts && grep -c 'ClassicyControlStrip.scss' bin/pixel-literal-allowlist.json  # expect exit 0 and 0
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/ControlStrip -t 'module step|no pixel literal'
- [ ] [MANUAL] Every `desktop-controlstrip--*` story compares AE 0 before vs after (collapsed, right-docked and pressed-module included).

## Files

- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss` - modify: 84 literals read --control-strip-* and --focus-ring-*
- `src/Appearance/Platinum/styles/_mixins.scss` - modify: strip bevel mixins read --control-strip-bevel-width (or the Platinum file Part B placed them in)
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` - modify: module step read from CSS variables
- `bin/pixel-literal-allowlist.json` - modify: ControlStrip entry removed; mixins entry lowered
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.test.tsx` - modify: module-step and no-literal tests

## Work Log
