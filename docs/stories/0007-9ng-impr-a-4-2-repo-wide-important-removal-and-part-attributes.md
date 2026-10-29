---
id: 0007-9ng
title: 'A 4.2: Repo-wide !important removal and part attributes'
purpose: Remove the remaining ~96 `!important`s from src SCSS (test-enforced) and add the `data-classicy-control`, `data-classicy-role` and `data-classicy-part` part attributes.
type: impr
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:51:33.139Z"
updated: "2026-10-29T00:45:38.416Z"
started: "2026-10-29T00:45:38.074Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/SystemFolder/SystemResources/Button/ClassicyButton.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss
      - src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss
      - src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss
      - src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.scss
      - src/SystemFolder/SystemResources/Table/ClassicyTable.scss
      - src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss
      - src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/Appearance/vocabulary/ClassicyCascade.repo.test.ts
      - src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0006-wx6", "depends"]
  plans:
    - ["0003-7x7", "included", ["4.2"]]
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

# A 4.2: Repo-wide !important removal and part attributes

## Problem Statement

Audit §2.6: after A 4.1, 27 other SCSS files still carry ~96 `!important`s (DesktopIcon 14, scrollbars 13, Icon 11, DesktopMenuBar 7, Menu 6, …) — a package can only win over them by escalating (§2.9). §8.6 / umbrella 0002-ldj part attributes: window control boxes share one wrapper class with no role, alert buttons carry no role, and the menu bar's clusters are addressable only by DOM order (§5), so CSS `order` (part F) has nothing to target.

This story removes every remaining `!important` by order or specificity (the hard cases have named resolutions: mask-size on icons, scrollbar hidden/inactive mixins, menu-bar `:after`, keyboard-shortcut font size, CrashScreen/ScreenSaver ids), adds `data-classicy-control="close|zoom|collapse"`, `data-classicy-role="default|cancel|other"` and `data-classicy-part="apple|app|help|switcher|extensions|clock"` (via a new `ClassicyMenuItem.partAttr` field rendered on the item's `<li>`), and pins zero `!important` with a repo-wide test.

**Impact:** A 5.1 layers all component CSS; any surviving `!important` would stay unbeatable from `classicy.package`. Part F's arrangement slots (control-box order, alert button order, menu-bar clusters) need the part attributes.

## Steps

### 1: Write the failing tests

`src/Appearance/vocabulary/ClassicyCascade.repo.test.ts`: `it("no SCSS under src uses !important", () => { const files = globSync("src/**/*.scss"); const hits = files.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => l.includes("!important") ? `${f}:${i + 1}` : null).filter(Boolean)); expect(hits).toEqual([]); })`. `src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx`: `it("window control boxes carry data-classicy-control")` (render a closable+zoomable+collapsable window; `container.querySelector('[data-classicy-control="close"] .classicyWindowCloseBox')` not null, same for zoom/collapse; `querySelectorAll("[data-classicy-control]")` toHaveLength 3); `it("alert buttons carry data-classicy-role")` (render `<ClassicyAlert buttons={[{ id: "cancel", label: "Cancel", role: "cancel" }, { id: "other", label: "Later", role: "normal" }, { id: "ok", label: "OK", role: "default" }]}/>`; Cancel → `data-classicy-role="cancel"`, Later → `other`, OK → `default`); `it("menu bar clusters carry data-classicy-part")` (render the desktop menu bar via its story helper; for each of `apple`, `help`, `switcher`, `extensions`, `clock` the `[data-classicy-part="<p>"]` selector matches).

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyCascade.repo.test.ts src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx` — Expected: FAIL — ~96 `!important` hits listed; attribute selectors return null.

### 3: Remove !important file by file, largest first

For each file: delete the flag, run that component's existing tests and compile the file with sass to confirm the intended rule still wins. Resolutions: DesktopIcon.scss:53,65,141-143 and Icon.scss:55,67 `mask-size/mask-mode/mask-repeat` — base rule drops `!important`, move `.classicyDesktopIconAliasBadge .classicyDesktopIconMask` after the base `.classicyDesktopIconMask` so order wins; scrollbars.scss:243-279 (`scrollbars-hidden`/`-inactive` mixins) — callers include them after the base scrollbar mixin; DesktopMenuBar.scss:34,62,73-75,97 (`display: none` on `:after`, hover backgrounds) — nest under `.classicyDesktopMenu` (one extra class) to beat `.classicyMenuItem:after`; Menu.scss:234-236 `.classicyMenuItemKeyboardShortcut` — nest under `.classicyMenuItem`; CrashScreen/ScreenSaver overlays — keep specificity via their existing ids; appearance.scss:234 `theme-halftone` background-image. Commit after every 3–4 files: `refactor(scss): remove !important from <files>`.

### 4: Add the part attributes

ClassicyWindow.tsx:1690,1732,1746 — each `<div className="classicyWindowControlBox">` gains `data-classicy-control="close" | "zoom" | "collapse"`. ClassicyAlert.tsx:289-308 — each `ClassicyButton` gains `data-classicy-role` = `"default"` when `button.id === defaultButton?.id`, `"cancel"` when `button.role === "cancel"`, else `"other"` (the help button gets `"other"`). ClassicyMenu.tsx — add optional `partAttr?: string` to `ClassicyMenuItem`, rendered as `data-classicy-part={item.partAttr}` on the item's `<li>`. ClassicyDesktopMenuBar.tsx:176,240,283,352-366 — Apple item `partAttr: "apple"`, each app menu item `"app"`, Help `"help"`, App Switcher `"switcher"`, the Extensions `<ul>` `data-classicy-part="extensions"`; ClassicyDesktopMenuWidgetTime.tsx:196 — root `data-classicy-part="clock"`.

### 5: Run tests to verify they pass

`pnpm test` — Expected: PASS.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "feat(vocabulary): data-classicy-control/role/part attributes; no !important left in src"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: grep -rn '!important' src --include=*.scss | wc -l  # expect 0
- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyCascade.repo.test.ts src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx
- [ ] Window control boxes carry `data-classicy-control`, alert buttons `data-classicy-role` (`default`/`cancel`/`other`), menu-bar clusters `data-classicy-part` (`apple`, `app`, `help`, `switcher`, `extensions`, `clock`) via `ClassicyMenuItem.partAttr`.
- [ ] Every removed flag is replaced by order or by one extra class, never by a new `!important`; each component's existing tests still pass (parity is confirmed in A 6).

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - 14 !important removed; alias-badge rule reordered
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss` - 13 removed (hidden/inactive mixins by order)
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - 11 removed
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss` - 7 removed (nest under .classicyDesktopMenu)
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - 6 removed (nest shortcut under .classicyMenuItem)
- `src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss` - 4 removed
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss` - 4 removed
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - 4 removed
- `src/SystemFolder/SystemResources/Button/ClassicyButton.scss` - 4 removed
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - :234 theme-halftone removed
- `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss` - 2 removed
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss` - 2 removed
- `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss` - 2 removed
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss` - 2 removed
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.scss` - 2 removed
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss` - 2 removed
- `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss` - 2 removed
- `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.scss` - 2 removed (id specificity)
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss` - 2 removed
- `src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.scss` - 1 removed
- `src/SystemFolder/SystemResources/Table/ClassicyTable.scss` - 1 removed
- `src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.scss` - 1 removed
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss` - 1 removed
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss` - 1 removed
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss` - 1 removed
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - 1 removed
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.scss` - 1 removed (id specificity)
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - :1690,1732,1746 data-classicy-control
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` - :289-308 data-classicy-role
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - :176,240,283,352-366 partAttr / data-classicy-part
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx` - :196 data-classicy-part=clock
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` - ClassicyMenuItem.partAttr rendered as data-classicy-part
- `src/Appearance/vocabulary/ClassicyCascade.repo.test.ts` - create: repo-wide !important guard
- `src/Appearance/vocabulary/ClassicyPartAttributes.test.tsx` - create: part attribute tests

## Work Log

### 2026-10-29T00:45:38.416Z - Implementation dispatched
