---
id: 0073-wte
title: 'H 6.1: Remaining 43 literals, the 50 fallbacks, four derivations, coverage test'
purpose: Purge the long tail of pixel literals across 25 files, drop every `var(--x, Npx)` fallback, add the four derivations Part G did not name, empty the allowlist, and pin a test that every `var(--…)` read in SCSS is emitted, declared or set.
type: impr
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:39:09.687Z"
updated: "2026-10-30T20:16:00.441Z"
started: "2026-10-30T17:33:43.278Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileDrag.scss
      - src/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss
      - src/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalent.scss
      - src/SystemFolder/SystemResources/Link/ClassicyLink.scss
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss
      - src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss
      - src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.scss
      - src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.scss
      - src/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss
      - src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/SystemFolder/SystemResources/Table/ClassicyTable.scss
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss
      - src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.scss
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss
      - bin/pixel-literal-allowlist.json
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
      - src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0072-fjm", "depends"]
  plans:
    - ["0011-v9t", "included", ["6.1"]]
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

# H 6.1: Remaining 43 literals, the 50 fallbacks, four derivations, coverage test

## Problem Statement

After H 3.1–5.1, 43 bare literals remain across 23 files (1–4 each: dialog widths, focus rings, the crash-screen art width, the progress-bar stripe period, …) plus the 50 `var(--x, Npx)` fallbacks the audit (§2.5, §8.7) says must go once Platinum always supplies the variable.

This section (plan 0011-v9t §6.1) rewrites each remaining literal per table (token, Part G derivation, or H 2.1 knob), adds the four derivations H needs beyond Part G's inventory only if absent (`--focus-ring-width`, `--focus-ring-inset`, `--control-corner-radius`, `--window-shadow-offset`), deletes every fallback whose variable `getThemeVars` emits (keeping the two `--classicy-control-strip-*, 0px` instance fallbacks), empties `bin/pixel-literal-allowlist.json`, and adds `ClassicyAppearance.varCoverage.test.ts` proving every `var(--…)` read in `src/**/*.scss` is emitted by `getThemeVars`, declared in SCSS, set from TS/TSX, or a `--classicy-(art|cursor|layout)-*` variable.

**Impact:** Without this story the gate never reaches an empty allowlist, fallbacks keep masking missing variables, and the parity/docs story H 7.1 cannot claim D9 complete.

## Steps

### 1: Write the failing tests

ClassicyAppearance.test.ts: `emits the focus ring, corner radius and window shadow derivations` (`--focus-ring-width` '1px', `--focus-ring-inset` '3px', `--control-corner-radius` '2px', `--window-shadow-offset` '2px'; with `borderSize: 2` → '2px', '6px', '4px', '4px'). ClassicyAppearance.varCoverage.test.ts: `every var(--…) read in src/**/*.scss is emitted, declared or set from TSX` — collect reads with `/var\(\s*(--[a-zA-Z0-9-]+)/g` over `src/**/*.scss` minus `savers/**`; allowed = `new Set(Object.keys(getThemeVars(getTheme('default'))))` ∪ names matching `/^--(\S+):/m` declared in any `src/**/*.scss` ∪ names appearing as string literals `"--name"`/`'--name'` in any `src/**/*.{ts,tsx}` ∪ names matching `/^--classicy-(art|cursor|layout)-/`; `expect([...reads].filter(n => !allowed.has(n)).sort()).toEqual([])`. `no var() fallback carries a pixel literal` — `scanPixelLiterals(root)` entries with `kind === 'fallback'` whose text is not `0px` → `[]`. `the pixel allowlist is empty` — `expect(JSON.parse(readFileSync('bin/pixel-literal-allowlist.json','utf8'))).toEqual({})`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts` — Expected: FAIL — derivations undefined (unless Part G added them), 48 fallbacks listed, allowlist non-empty; the coverage test lists exactly the names Part A was to remove (expected `[]` if A is complete). Verify Part A's removals: `grep -rn 'box-border-size\|color-theme-1\b\|theme-hover\|theme-selection' src --include=*.scss` → 0; if any remain, rewrite `--box-border-size, 2px` to `var(--control-frame-width)` here and report to Part A.

### 3: Add the derivations (if absent) and apply the rewrite and fallback tables

Derivations, added to `getThemeVars` ONLY if absent (`grep -c '<name>' ClassicyAppearance.ts` = 0): `--focus-ring-width` = `intToPx(border)`, `--focus-ring-inset` = `intToPx(border * 3)`, `--control-corner-radius` = `intToPx(border * 2)`, `--window-shadow-offset` = `intToPx(border * 2)` — say in the commit body that these four are H's additions to Part G's inventory. Rewrites, one file at a time (`grep -n px <file>` before and after): ProgressBar `:53 --slide-var: 40px` → `var(--progress-bar-stripe-period)`, `:64,65 + 10px` → `+ var(--progress-bar-stripe-period) / 4`, `:66 + 20px` → `/ 2`; Alert `:9,10` → `var(--dialog-alert-min-width)` / `--dialog-alert-max-width`, `:39 padding-top: 1px` → `var(--window-border-size)`; FileDrag `:28 outline: 2px` → `var(--control-frame-width)`, `:29 -2px` → `calc(var(--control-frame-width) * -1)`, `:42 border: 2px` → `var(--control-frame-width)`; DriveSetupList `:20 180px` → `var(--control-panel-list-max-height)`, `:31 2px 6px` → `calc(var(--layout-item-gap) / 2) var(--window-padding-size)`; InputDialog `:9,10` → `--dialog-input-min-width` / `-max-width`; Window `:682 background-size: 4px 3px` (if Part E left it) → `var(--title-bar-dither-width) var(--title-bar-dither-height)`; WindowFrame `:11 box-shadow: 2px 2px 0` → `var(--window-shadow-offset) var(--window-shadow-offset) 0`; KeyboardEquivalent `:35,36` → `--dialog-keyboard-equivalent-min-width` / `-max-width`; Link `:15 1px` → `var(--focus-ring-width)`, `:16 outline-offset: 1px` → `var(--focus-ring-width)`; FileInput `:19,20 1px` → `var(--window-border-size)` (visually-hidden hairline); CrashScreen `:18 245px` → `var(--crash-screen-art-width)`; BootSequence `:13 4px 4px` → `var(--boot-halftone-tile) var(--boot-halftone-tile)`; Slider `:75,91 999px` → `calc(infinity * 1px)`; HelpButton `:17,18 14px` → `var(--help-button-glyph-size)`; Kbd `:36 2px` → `var(--control-corner-radius)`, `:37 1px` → `var(--focus-ring-width)`; BevelButton `:162 inset 1px 1px 0 0` → `inset var(--window-border-size) var(--window-border-size) 0 0`; QuickTimeMovieEmbed `:242 0px 0 3px` → `0 0 var(--quick-time-caption-shadow-blur)`; ControlLabel `:77 @media (max-width: 480px)` stays (exempt prelude; add comment `viewport breakpoint, not a theme value`); PopUpMenu `:134 300px` → `var(--menu-pop-up-max-height)`; Table `:109 15px` → `var(--table-resizer-width)`; FileOpenDialog `:14 220px` → `var(--dialog-file-dialog-min-height)`; ControlGroup `:36 1px` → `var(--window-border-size)`; AppearanceManager.Colors `:16 210px` → `var(--control-panel-colors-scroll-max-height)`. Fallbacks (50): delete the `, Npx` in every `var(--name, Npx)` whose name `getThemeVars` emits (`--icon-size-regular` ×10, `--icon-small-size` ×2, `--layout-focus-gap` ×6, `--layout-group-gap` ×6, `--layout-dialog-edge` ×3, `--button-gap` ×3, `--control-frame-width` ×3, `--control-bevel-sm/-md` ×2 each, `--control-bevel-lg`, `--control-row-height`, `--edit-field-height` ×2, `--help-button-height`, `--help-button-width`, `--ui-font-size`, `--window-control-size` ×2, `--window-padding-size`) in KeyboardEquivalent, InputDialog, Alert, BevelButton, DriveSetupList, Tree, Placard, StartupScreen, HelpButton, ImageWell; keep the two `--classicy-control-strip-*, 0px` instance fallbacks. Update `ClassicyHelpButton.test.tsx:109-110` expectations to `var(--help-button-width)` / `var(--help-button-height)` in the same change.

### 4: Empty the allowlist

`node bin/check-pixel-literals.ts` — Expected: `tighten` messages for every remaining entry; write `{}`; re-run → exit 0 with no output.

### 5: Run tests to verify they pass

`pnpm test` — Expected: PASS (coverage test `[]`, allowlist `{}`).

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add -A src bin/pixel-literal-allowlist.json && git commit -m "refactor(scss): purge the remaining pixel literals and var() fallbacks; pin variable coverage"` (body: lists the four derivations added beyond Part G) (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: node bin/check-pixel-literals.ts && test "$(cat bin/pixel-literal-allowlist.json | tr -d ' \n')" = '{}'
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts -t 'focus ring, corner radius and window shadow'
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/HelpButton

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts` - create: var() coverage, no-fallback and empty-allowlist tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - modify: four derivations if Part G did not name them
- `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss` - modify: stripe period knob
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - modify: dialog knobs; fallbacks dropped
- `src/SystemFolder/SystemResources/File/ClassicyFileDrag.scss` - modify: --control-frame-width
- `src/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog.scss` - modify: dialog knobs; fallbacks dropped
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: title-bar dither knobs (if Part E left the literal)
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` - modify: --window-shadow-offset
- `src/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalent.scss` - modify: dialog knobs; fallbacks dropped
- `src/SystemFolder/SystemResources/Link/ClassicyLink.scss` - modify: --focus-ring-width
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - modify: hairline reads --window-border-size
- `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss` - modify: --crash-screen-art-width
- `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss` - modify: --boot-halftone-tile
- `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss` - modify: fallbacks dropped
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` - modify: pill radius via calc(infinity * 1px)
- `src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.scss` - modify: glyph size knob; fallbacks dropped
- `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss` - modify: --control-corner-radius, --focus-ring-width
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss` - modify: inset highlight reads border size; fallbacks dropped
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss` - modify: caption shadow blur knob
- `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss` - modify: breakpoint comment only
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - modify: --menu-pop-up-max-height
- `src/SystemFolder/SystemResources/Table/ClassicyTable.scss` - modify: --table-resizer-width
- `src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss` - modify: --dialog-file-dialog-min-height
- `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss` - modify: --window-border-size
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.scss` - modify: fallbacks dropped
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss` - modify: fallbacks dropped
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss` - modify: fallback dropped
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss` - modify: control-panel knob; fallbacks dropped
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss` - modify: --control-panel-colors-scroll-max-height
- `bin/pixel-literal-allowlist.json` - modify: emptied to {}
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` - modify: derivation test
- `src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.test.tsx` - modify: expectations without fallbacks

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T17:33:48.086Z - H 6.1 started in worktree part-h-61 (branch h/6.1) from land/part-h d6aed9d95, H rebased onto the landed Part E. Parity compares against before-post-e/. Runs in parallel with H 6.2a; 6.1 leaves multiplier sites to 6.2b.

### 2026-10-30T20:07:40.454Z - H 6.1 implemented (1abd8703b on h/6.1): the pixel allowlist is empty (43 bare + 45 fallback literals gone), 13 color fallbacks dropped (H-R14), a var() coverage test added, and the carry-forward items done (strip popup inset read once per opening, DriveSetupList half-gap, PopUpSlider drag fix). Parity AE 0 on 342 stories + 4 app shots; computed styles and forced states identical. Rulings: four deviations accepted; H-R26 makes POPUP_MENU_MAX_HEIGHT read the theme. In review.

### 2026-10-30T20:16:00.441Z - H 6.1 review: Needs fixes. (1) the pop-up height cap is still a hard-coded 300 in JS (H-R26); (2) the crash screen's new width variable never applies, because the Sad Mac renders outside the themed desktop (H-R27a). H-R25 holds: all 20 Metrics-tab metrics checked, 61/61 equal. Ruling H-R27 also derives the progress-bar stripe period, renames controlStripPopup to stripMenu, and makes Kbd/Link read their border role. Fix round running.
