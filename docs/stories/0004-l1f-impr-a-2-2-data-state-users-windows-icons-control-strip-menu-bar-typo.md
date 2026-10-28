---
id: 0004-l1f
title: 'A 2.2: data-state users, windows, icons, Control Strip, menu-bar typo'
purpose: Move BevelButton, Placard and ImageWell off `data-state`, and windows, icons, the Control Strip and the menu bar onto the bare shared state classes, fixing the doubled AppleMenu class and the dead window selectors.
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T19:49:01.956Z"
updated: "2026-10-28T19:49:01.956Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.tsx
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.test.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.popup.test.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.test.tsx
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.test.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.collapse.test.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0003-yx8", "depends"]
  plans:
    - ["0003-7x7", "included", ["2.2"]]
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

# A 2.2: data-state users, windows, icons, Control Strip, menu-bar typo

## Problem Statement

Audit §2.8 / D19: state is expressed three ways — classes, `data-state` (BevelButton, Placard, ImageWell) and one `[aria-expanded]` selector (ControlStrip.scss:224-226 styling BevelButton). The window fuses look and state in `classicyWindowActive/Inactive/Collapsed/Dragging`, keeps an empty `.classicyWindowZoomed` rule (Window.scss:9-11) and an undefined `block` class (ClassicyWindow.tsx:1784); `.classicyDesktopMenuAppleMenu` is declared twice (MenuBar.scss:6-16 and :58-100) and its doubled "Menu" is the audit's typo.

This story converts those surfaces to `classicyStateClasses` per the plan's mapping (BevelButton's seven `data-state` values become `checked`/`pressed`/`disabled`/`mixed`/`open` combinations; windows get `active`/`inactive`/`collapsed`/`dragging`; icons get `selected`/`open`/`dragging`), deletes the dead `Zoomed`/`block`, keeps `classicyWindowInvisible` (it is live: ClassicyWindow.tsx:704-712 and :790 render closed windows hidden — the audit's §9 item 6 claim is corrected in docs), and renames `classicyDesktopMenuAppleMenu` to `classicyDesktopMenuApple`.

**Impact:** A 4.1 reorders ClassicyWindow.scss by these new state selectors; A 4.2's ControlStrip `!important` removal and part attributes assume `.pressed`/`.open` exist; 8 existing tests assert `data-state` and would stay coupled to the old contract.

## Steps

### 1: Rewrite the data-state assertions in the four existing test files first

BevelButton.test.tsx: each `toHaveAttribute("data-state", "pressed-on")` → `toHaveClass("pressed", "checked")`; `"disabled-off"` → `toHaveClass("disabled")` and `not.toHaveClass("checked")`; `"mixed"` → `toHaveClass("mixed")`; `"on"` → `toHaveClass("checked")` and `not.toHaveClass("pressed")`; `"off"` → neither. popup.test.tsx: `toHaveClass("open")`. Placard.test.tsx: `toHaveClass("pressed")` / `"disabled"`. ImageWell.test.tsx: `toHaveClass("selected")` / `"disabled"` / `not.toHaveClass("disabled")`. Window.utility.test.tsx:111-130: `active`/`inactive`. Window.collapse.test.tsx:138,171,186,210: `collapsed`. Add `src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx` with `it("ClassicyWindow contents carry collapsed while collapsed and never 'block'")`, `it("DesktopIcon selected+launched → selected open")`, `it("ControlStrip collapsed → collapsed; dragging the tab → dragging")`, `it("menu bar Apple menu item carries classicyDesktopMenuApple")`, and a compiled-CSS test asserting ClassicyBevelButton.scss has no `data-state`, ControlStrip.scss has no `aria-expanded`, MenuBar.scss has exactly one `.classicyDesktopMenuApple {` top-level block and no `classicyDesktopMenuAppleMenu`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/BevelButton src/SystemFolder/SystemResources/Placard src/SystemFolder/SystemResources/ImageWell src/SystemFolder/SystemResources/Window src/Appearance` — Expected: FAIL on the rewritten assertions.

### 3: Implement bevelButtonStates and the BevelButton/Placard/ImageWell conversions

BevelButton: replace `ClassicyBevelButtonState` (:53-60) and `computeState` (:196-206) with `bevelButtonStates(disabled, mixed, pressed, on): Partial<Record<ClassicyState, boolean>>` = `{ disabled, mixed: mixed && !disabled, pressed: pressed && !disabled && !mixed, checked: on, open: popupOpen }`; the root (:446) emits `classicyStateClasses(...)` and no `data-state`. SCSS: `[data-state="on"]`→`.checked`, `pressed-off|pressed-on`→`.pressed`, `mixed`→`.mixed`, `disabled-off|disabled-on`→`.disabled`, `disabled-on`→`.disabled.checked`. Placard (:86,100-105): `{ disabled, pressed: pressed || open }`; `classicyPlacardDisabled` DELETE; SCSS `[data-state="pressed"]`→`&.pressed`, `[data-state="disabled"]`→`&.disabled`. ImageWell (:74-79): `{ disabled: !enabled, selected }`; `classicyImageWellDisabled/Selected` DELETE; `data-state` removed; `classicyImageWellDragOver` KEEP. Remove `ClassicyBevelButtonState` from the public type exports (D16); `grep -n data-state docs` for mentions to update in A 6.

### 4: Convert Window, Icon, DesktopIcon, FileBrowser, ControlStrip, MenuBar

Window.tsx:1632-1643: Active→active, Inactive→inactive, Collapsed→collapsed, Dragging→dragging (DELETE legacy), Zoomed→DELETE with no replacement (`ws.zoomed` stops emitting a class; delete Window.scss:9-11), Resizing/Invisible/ActiveApp/Floating/Backgrounded/ModalFront/Red/NoScroll/ScrollBarsHidden/*Dimmed/ContentsNotDimmed/ModalScrimError KEEP; :1784 `ws.collapsed ? "hidden" : "block"` → `classicyStateClasses({ collapsed: ws.collapsed })`, move `.hidden { visibility: hidden }` (appearance.scss:245) to `.classicyWindowContents.collapsed, .classicyWindowContentsModal.collapsed { visibility: hidden; }` and delete `.hidden`. Window.scss: rename the state rules only (do not reorder yet — 4.1 does that); keep the biome-ignore comments. Icon.tsx:276-277 / DesktopIcon.tsx:396-404,444 / FileBrowser.tsx:182,195: Active→selected, Open→open, ActiveAndOpen→`selected open`, Dragging→dragging DELETE, Invisible KEEP; SCSS `.classicyIconActive`→`.classicyIcon.selected`, `.classicyIconActiveAndOpen`→`.classicyIcon.selected.open` placed after `.selected` and `.open`. ControlStrip.tsx:509,511: Collapsed→collapsed, Moving→dragging DELETE; ControlStrip.scss:224-226 becomes `&.pressed, &.open` (`aria-expanded` stays on the tab). MenuBar.tsx:283 `classicyDesktopMenuAppleMenu` → `classicyDesktopMenuApple`; merge MenuBar.scss:6-16 and :58-100 into one block keeping every declaration.

### 5: Verify nothing still reads the deleted names

`grep -rnE 'data-state|classicy(WindowActive|WindowInactive|WindowCollapsed|WindowDragging|WindowZoomed|IconActive|IconOpen|IconActiveAndOpen|IconDragging|DesktopIconActive|DesktopIconOpen|DesktopIconActiveAndOpen|DesktopIconDragging|ControlStripCollapsed|ControlStripMoving|PlacardDisabled|ImageWellDisabled|ImageWellSelected|DesktopMenuAppleMenu)\b|\.hidden \{|"block"' src example storybook/.storybook docs/AGENT-REFERENCE.md | grep -v 'ClassicyWindowActiveApp' | wc -l` — Expected: 0 (`classicyWindowActiveApp` is KEEP and excluded).

### 6: Run tests to verify they pass

`pnpm test` — Expected: PASS.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(vocabulary): shared state classes on windows, icons, bevel buttons, placards and the Control Strip"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx src/SystemFolder/SystemResources/BevelButton src/SystemFolder/SystemResources/Window
- [ ] VERIFY: grep -rn 'data-state' src | wc -l   # 0
- [ ] BevelButton/Placard/ImageWell emit `checked`/`pressed`/`disabled`/`mixed`/`open`/`selected` combinations and no `data-state`; ControlStrip.scss has no `[aria-expanded]` selector; `aria-expanded` is still emitted.
- [ ] `.classicyWindowZoomed`, the `block` class and `.hidden` are gone; `classicyWindowInvisible` still hides closed-but-mounted windows; MenuBar.scss has one `.classicyDesktopMenuApple` block.
- [ ] Each replaced selector keeps its specificity and position (the `.selected.open` block follows `.selected` and `.open`), so computed styles are unchanged.

## Files

- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` - :53-60 type, :196-206 computeState → bevelButtonStates, :381, :446
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss` - :63-65,73-74,79,88-89,104 data-state → state classes
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx` - :86,100-105
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss` - :44,52
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.tsx` - :74-79
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss` - :39,53
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` - :509,511
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss` - :224-226 → &.pressed, &.open
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - :1632-1643,1651,1784
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - :9-15,49,85,155,159,163,178 renames; Zoomed deleted
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx` - :276-277 (+ .scss)
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - selectors
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx` - :396-404,444
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - selectors
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx` - :182,195
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - :283 classicyDesktopMenuApple
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss` - :6-16 and :58-100 merged
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - :245 .hidden deleted
- `src/Appearance/vocabulary/ClassicyStateClasses.surfaces.test.tsx` - create
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.test.tsx` - 7 data-state asserts → classes
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.popup.test.tsx` - 1 assert → open
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.test.tsx` - 2 asserts
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.test.tsx` - 3 asserts
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.utility.test.tsx` - :111-130 active/inactive
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.collapse.test.tsx` - :138,171,186,210 collapsed
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.test.tsx` - keeps passing (aria-expanded)

## Work Log
