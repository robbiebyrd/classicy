---
id: 0006-wx6
title: 'A 4.1: ClassicyWindow.scss reorder (sixty-two to zero), mixin, phantom tokens'
purpose: Put the window's base rule before its state rules so source order wins and every `!important` in ClassicyWindow.scss and the control-box mixin can go, and remove the four phantom tokens.
type: impr
status: complete
priority: "2"
effort: M
created: "2026-10-28T19:50:33.651Z"
updated: "2026-10-29T00:45:29.178Z"
started: "2026-10-29T00:01:02.199Z"
completed: "2026-10-29T00:45:29.178Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0005-dlx", "depends"]
  plans:
    - ["0003-7x7", "included", ["4.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: complete
  "6":
    status: complete
  "7":
    status: complete
---

# A 4.1: ClassicyWindow.scss reorder (sixty-two to zero), mixin, phantom tokens

## Problem Statement

Audit §2.6: ClassicyWindow.scss carries 62 of the repo's 158 `!important`s because every window state rule (`Collapsed`, `Inactive`, `Active`, `Dragging`, `Red`, …) is declared before the base `.classicyWindow` rule at line 222, and `platinumWindowControlBox` (appearance.scss:120-121) forces `!important` sizes on its callers. §2.1 / §9 Phase 1 item 6: phantom tokens no theme supplies — `--box-border-size` and `--color-theme-1` (DriveSetupList.scss:17,79), `--color-theme-hover` (Placard.scss:109), `--color-theme-selection` (ImageWell.scss:41,48) — always resolve to their fallbacks.

This story reorders the file (base, parts, variants, states last in a fixed order), deletes all 62 flags (raising specificity by repeating the root class only where a higher-specificity rule would otherwise win), un-`!important`s the mixin, and replaces each phantom token with the value it resolves to today, so Platinum stays pixel-identical (umbrella 0002-ldj gate).

**Impact:** A 4.2 relies on this file being clean to reach zero `!important` repo-wide; A 5.1's `@layer` wrapping would otherwise preserve `!important` escalations inside the layer and packages could never override window chrome.

## Steps

### 1: Write the failing compiled-CSS cascade test

`src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts` (`sass.compile` the file, `style: "expanded"`; `rule()` helper copied from ClassicyColorPickerDialog.styles.test.ts): `it("contains no !important", () => expect(css).not.toContain("!important"))`; `const at = (sel) => { const i = css.indexOf(`\n${sel} {`); if (i < 0) throw new Error(sel); return i; }`; `it("base rule precedes every state rule")` (for each of `.classicyWindow.inactive`, `.classicyWindow.active`, `.classicyWindow.collapsed`, `.classicyWindowUtility.collapsed`, `.classicyWindow.dragging`, `.classicyWindowResizing`, `.classicyWindowRed`, `.classicyWindowInvisible`: `at(s)` greater than `at(".classicyWindow")`); `it("utility collapsed height follows document collapsed height")` (`at(".classicyWindowUtility.collapsed") > at(".classicyWindow.collapsed")`); `it("collapsed height is still control × 1.25 / × .5")` (`rule(".classicyWindow.collapsed").height` toBe `"calc(var(--window-control-size) * 1.25)"`, `rule(".classicyWindowUtility.collapsed").height` toBe `"calc(var(--window-control-size) * .5)"`); `it("z-index bands are intact")` (`.classicyWindow.active` `300`, `.classicyWindowFloating` `350`, `.classicyWindowModalFront` `370`, `.classicyWindowRed` `99999`, `.classicyWindowActiveApp` `150`); `it("no phantom tokens anywhere")` (DriveSetupList.scss, Placard.scss, ImageWell.scss compiled: not match `/--color-theme-1\b|--box-border-size|--color-theme-hover|--color-theme-selection/`); `it("platinumWindowControlBox sizes are not !important")` (compile a one-line scss that `@include`s the mixin, expect no `!important`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts` — Expected: FAIL — `!important` present; base rule at :222 follows the state rules.

### 3: Reorder ClassicyWindow.scss and strip !important

Layout: (1) `@use`s; (2) `.classicyWindow { … }` base block (today :222-475) first; (3) part rules (`.classicyWindowHeader`, `Contents*`, `FrameEdge*`, `PlacardBar`, `ModalScrim`); (4) variant rules (`.classicyWindowUtility`, `.classicyWindowModal`, `.classicyWindowDocument`); (5) state rules last, in this order: `.classicyWindow.inactive`, `.classicyWindow.active`, `.classicyWindowActiveApp`, `.classicyWindowFloating`, `.classicyWindowBackgrounded`, `.classicyWindowModalFront`, `.classicyWindowRed`, `.classicyWindow.collapsed`, `.classicyWindowUtility.collapsed`, `.classicyWindow.dragging`, `.classicyWindowResizing`, `.classicyWindowInvisible`, `.classicyWindowNoScroll`, `*Dimmed`. Cut/paste whole blocks; do not edit declarations while moving. Then delete every ` !important` (62); for each, confirm the winning rule by compiled order; raise specificity by repeating the root class once (`.classicyWindow.classicyWindow.collapsed`) only where a higher-specificity rule would otherwise win (expected: the `.classicyWindow .classicyWindowTitleBar .classicyWindowControlBox` chain vs mixin sizes, and `.classicyWindowUtility .classicyWindowTitleBar` vs the document title bar); list each such site in the commit body.

### 4: Un-!important the mixin and fix the phantom tokens

appearance.scss:120-121 → `width: var(--window-control-size); height: var(--window-control-size);` (verify Window.scss:330-331 `calc(var(--window-control-size) + var(--window-border-size))` now wins by order). DriveSetupList.scss:17 `var(--box-border-size, 2px)` → `var(--control-frame-width)`; :79 `var(--color-theme-1, #000)` → `var(--color-black)` (today's resolved fallback, pixel-identical); Placard.scss:109 `var(--color-theme-hover, var(--color-system-05))` → `var(--color-system-05)`; ImageWell.scss:41,48 `var(--color-theme-selection, var(--color-outline))` → `var(--color-outline)`. Alert.scss:88 keeps its color literal (part G replaces it) but loses `!important`.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Placard src/SystemFolder/SystemResources/ImageWell src/SystemFolder/ControlPanels/DriveSetup` — Expected: PASS, including the pre-existing ClassicyWindow.resizer.test.ts.

### 6: Spot-check parity on the window stories now (early signal)

Re-shoot only `desktop-window--*`, `dialogs-alert--*` and `desktop-desktop--default` into `.playwright-mcp/parity/part-A/mid/` and `compare -metric AE` against `before/`. Expected 0 for each; fix any drift in the SCSS before continuing.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(window): state rules after the base rule; remove every !important from ClassicyWindow.scss"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [x] VERIFY: grep -c '!important' src/SystemFolder/SystemResources/Window/ClassicyWindow.scss  # expect 0
- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts
- [x] The base `.classicyWindow` rule precedes every state rule; z-index bands (150/300/350/370/99999) and collapsed heights (control × 1.25 / × .5) are unchanged; `platinumWindowControlBox` sets plain sizes.
- [x] `--color-theme-1`, `--box-border-size`, `--color-theme-hover` and `--color-theme-selection` appear nowhere in compiled CSS.
- [x] [MANUAL] `desktop-window--*`, `dialogs-alert--*` and `desktop-desktop--default` compare AE 0 against the A 0 baseline.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - reorder base/parts/variants/states; 62 → 0 !important
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - :120-121 mixin sizes without !important
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - :88 drop !important
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss` - :17,79 phantom tokens
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss` - :109 phantom token
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss` - :41,48 phantom token
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.cascade.test.ts` - create: compiled-CSS order test
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts` - existing; must keep passing

## Work Log

### 2026-10-29T00:01:02.283Z - Implementation dispatched

### 2026-10-29T00:45:27.420Z - Completed: commits 4e390b34c..d42955098 (57d13ab37 reorder, d42955098 fix round), task review clean after one fix round (a consumer inline zIndex is stripped so window states own stacking). Evidence of pixel identity: computed-style diff 0 across 42 story variants (867,267 values) and 0 across a 17,280-combination class matrix (1.57M rows), negative control 43,914 diffs; screenshots AE 0 for all 42 story shots and the 25 mid-check shots (desktop-window--*, dialogs-alert--*, desktop-desktop--default) with the menu-bar clock masked (the seconds clock differs by 190-276 px unmasked). 62 to 0 !important; phantom tokens gone. Full gate green: lint 0, tsc 0, 3459 tests.

### 2026-10-29T00:45:27.645Z - Correction: classicyWindowInvisible is unreachable (root renders only when !ws.closed; the class is emitted only when ws.closed) — parked for a later task
