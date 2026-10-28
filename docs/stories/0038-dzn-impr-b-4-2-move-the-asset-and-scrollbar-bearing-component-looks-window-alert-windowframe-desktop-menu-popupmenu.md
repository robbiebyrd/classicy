---
id: 0038-dzn
title: 'B 4.2: Move the asset- and scrollbar-bearing component looks: Window, Alert, WindowFrame, Desktop, Menu, PopUpMenu'
purpose: Move the window chrome, title-bar art, desktop scrollbars and menu frames out of the base stylesheets into Platinum per-component partials, pixel-identical.
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:13:13.594Z"
updated: "2026-10-28T20:13:13.594Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/styles/components/_Window.scss
      - src/Appearance/Platinum/styles/components/_Alert.scss
      - src/Appearance/Platinum/styles/components/_WindowFrame.scss
      - src/Appearance/Platinum/styles/components/_Desktop.scss
      - src/Appearance/Platinum/styles/components/_Menu.scss
      - src/Appearance/Platinum/styles/components/_PopUpMenu.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/Appearance/Platinum/styles/platinum.scss
      - src/Appearance/Platinum/styles/platinum.css.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0037-gcg", "depends"]
  plans:
    - ["0005-1b3", "included", ["4.2"]]
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
  "7":
    status: pending
---

# B 4.2: Move the asset- and scrollbar-bearing component looks: Window, Alert, WindowFrame, Desktop, Menu, PopUpMenu

## Problem Statement

Audit §9 Phase 2 item 3 and umbrella 0002-ldj: base CSS holds structure only; look lives in the package's scoped CSS. The six stylesheets that read `$assets` data URIs and the scrollbar mixins (ClassicyWindow.scss, ClassicyAlert.scss, ClassicyWindowFrame.scss, ClassicyDesktop.scss, ClassicyMenu.scss, ClassicyPopUpMenu.scss) are migrated first: every `@include appearance.*` / `@include scrollbars.*` / `assets.$*` read is deleted from base and re-created in `src/Appearance/Platinum/styles/components/_<Name>.scss` under the same selector chain (relative to the package root, which is `.classicyDesktop[…]` itself for Desktop), each partial exposing one mixin (`window`, `alert`, `windowFrame`, `desktop`, `menu`, `popUpMenu`) included by platinum.scss inside the wrapper.

The move rule that keeps Platinum pixel-identical: after moving an include, grep the base file for every property the mixin or asset sets (border, border-*, box-shadow, background, background-image, color, border-radius) under a later selector of the same element or its state classes and move those declarations too, so the package layer keeps the same winner. `@include appearance.no-select` becomes `@include layout.classicy-no-select` and stays in base. Line numbers are as of main 9601617ee; re-verify after part A's reorder of ClassicyWindow.scss.

**Impact:** After 4.1 these six files `@use` paths that no longer exist, so `vite build` and Storybook are broken until this story lands; a missed state override here (e.g. `.classicyWindowRed`'s border or the utility title bar) would show up as a parity failure in every later story.

## Steps

### 1: Extend the css test with the moved selectors

platinum.css.test.ts: `scopes the window chrome` (compiled css contains `.classicyDesktop[data-classicy-appearance=platinum] .classicyWindow{` with `border:` and `box-shadow:` inside, `… .classicyWindowRed .classicyWindowTitleBar`, `… .classicyWindowResizer{background-image:url(`); `scopes the desktop scrollbars` (contains `.classicyDesktop[data-classicy-appearance=platinum] *::-webkit-scrollbar{` and `.classicyDesktop[data-classicy-appearance=platinum].classicyDesktopSplitArrows`); `scopes the menu frame` (contains `… .classicyContextSubMenu .classicySeparatorHorizontal{`); `the base stylesheets no longer reference the Platinum mixins` (for each of the six base files, readFileSync has no match for /AppearanceManager\/styles|platinum-|assets\.\$/).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts` — Expected: FAIL — the partials do not exist.

### 3: Create the six partials and strip the six base files per the move rule

Each partial starts `@use "../mixins"; @use "../scrollbars"; @use "../assets";` and wraps its rules in `@mixin window { … }` etc.; platinum.scss includes all six inside the wrapper. Keep every moved declaration's text identical except the mixin name and the dropped `!important`. Moves — Window (ClassicyWindow.scss): :24-25 header border + inner-box-shadow-outer under `.classicyWindowHeader`; :53 scrollbars-inactive under `.classicyWindowInactive`; :101-126 `$title-bar-center/right/left` under `.classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter|Right(::after|::before)`; :193 window-border and :202-215 red stripes under `.classicyWindowRed …`; :235 window-border under `.classicyWindow`; :326 box-shadow under `… .classicyWindowControlBox`; :336/:357 control-box-depressable under `.classicyWindowZoomBox` / `.classicyWindowCloseBox`; :342 `$collapse`, :350 `$zoom` under the box `&:after`; :394 `$resizer` under `.classicyWindowResizer`; :436 inner-border under `.classicyWindowContents`; :485/:488 under `.classicyWindowContentsModal`; :680 `$title-bar-utility !important` under `.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitleCenter` (drop the !important: the package layer wins). Alert: :92-105 red stripes under `.classicyWindow:has(.classicyAlertMovable) …`. WindowFrame: :19 `$title-bar-center` under `.classicyWindowFrameTitleBar`. Desktop: :25-26 platinum-scrollbars + platinum-scrollbars-themed under `&, & *`; :58 split-arrows under `&.classicyDesktopSplitArrows { &, & * }`; :21 no-select → vocabulary. Menu: :27/:47/:77/:95 menu-frame under `.classicyMenu`, `.classicySubMenu`, `.classicyContextMenu`, `.classicyContextSubMenu`; :108 menu-divider under `.classicyContextSubMenu .classicySeparatorHorizontal`; :227 `$triangle` under `.classicyMenuItemChildMenuIndicator:after`. PopUpMenu: :46 undepressable under `.classicyPopUpMenu`; :116 `$down-arrow` under `.classicyPopUpMenuIndicator`. Afterwards each base file has no `@use` of AppearanceManager/styles (only `@use "../../../Appearance/vocabulary/layout"` where no-select is used).

### 4: Run the css test and the full suite

`pnpm exec vitest run src/Appearance/Platinum && pnpm test` — Expected: PASS.

### 5: Build the library and the Storybook

`pnpm build:source && pnpm build:storybook` — Expected: both succeed; `grep -c 'classicy-appearance-platinum' dist/classicy.es.js` prints at least 1 (the injector call is in the bundle).

### 6: Parity: Window, Alert, Desktop, Menu and PopUpMenu stories

Re-shoot the ids whose title starts with Desktop/Window, Desktop/WindowFrame, Desktop/Desktop, Desktop/Menu, Desktop/MenuBar, Dialogs/Alert, Controls/PopUpMenu, Controls/ContextualMenu into `.playwright-mcp/parity/part-b/after/`; `compare -metric AE before/<id>.png after/<id>.png null:` → 0 for each. Any non-zero: a declaration that lost its winner — find it with the property grep of the move rule, move it, re-shoot; never touch the screenshot.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "refactor(appearance): move window, desktop and menu looks into the Platinum package"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts
- [ ] Six partials (window, alert, windowFrame, desktop, menu, popUpMenu) hold every moved include and asset read under the original selector chains; the six base stylesheets contain no AppearanceManager/styles @use, no platinum-* include and no assets.$ read.
- [ ] VERIFY: pnpm build:source && pnpm build:storybook
- [ ] [MANUAL] Window, WindowFrame, Desktop, Menu, MenuBar, Alert, PopUpMenu and ContextualMenu stories compare with AE 0 before vs after.

## Files

- `src/Appearance/Platinum/styles/components/_Window.scss` - create: window look partial
- `src/Appearance/Platinum/styles/components/_Alert.scss` - create: alert red stripes
- `src/Appearance/Platinum/styles/components/_WindowFrame.scss` - create: frame title-bar stripes
- `src/Appearance/Platinum/styles/components/_Desktop.scss` - create: desktop scrollbars
- `src/Appearance/Platinum/styles/components/_Menu.scss` - create: menu frames, divider, triangle
- `src/Appearance/Platinum/styles/components/_PopUpMenu.scss` - create: pop-up bevel and arrow
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - look includes and asset reads removed
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` - asset read removed
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - asset reads removed
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss` - scrollbar includes removed; no-select from vocabulary
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - menu-frame includes and triangle removed
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - undepressable include and arrow removed
- `src/Appearance/Platinum/styles/platinum.scss` - includes the six partials
- `src/Appearance/Platinum/styles/platinum.css.test.ts` - scoped-selector assertions

## Work Log
