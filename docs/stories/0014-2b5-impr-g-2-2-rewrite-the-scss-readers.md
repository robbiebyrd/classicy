---
id: 0014-2b5
title: 'G 2.2: Rewrite the SCSS readers'
purpose: Replace the simple `calc(var(--x) * N)` multipliers across ~45 stylesheets with the named derivations, leaving an enumerated one-off list for part H.
type: impr
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:56:33.172Z"
updated: "2026-10-30T04:21:11.638Z"
started: "2026-10-30T01:53:24.028Z"
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
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss
      - src/SystemFolder/SystemResources/Button/ClassicyButton.scss
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss
      - src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss
      - src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss
      - src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.scss
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.scss
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
      - src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss
      - src/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss
      - src/SystemFolder/SystemResources/Meter/ClassicyMeter.scss
      - src/SystemFolder/SystemResources/Table/ClassicyTable.scss
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss
      - src/SystemFolder/SystemResources/Output/ClassicyOutput.scss
      - src/SystemFolder/SystemResources/Separator/ClassicySeparator.scss
      - src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.scss
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss
      - src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss
      - src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss
      - src/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.scss
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss
      - src/SystemFolder/SystemResources/Input/ClassicyInput.scss
      - src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss
      - src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss
      - src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0013-qck", "depends"]
  plans:
    - ["0004-vqt", "included", ["2.2"]]
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

# G 2.2: Rewrite the SCSS readers

## Problem Statement

Audit §2.4 / D11 and §9 Phase 6 item 2: once the derivations exist (G 2.1), every simple `calc(var(--x) * N)` / `calc(var(--x) / N)` site matched by `grep -rnoE 'calc\(\s*var\(--[a-z0-9-]+\)\s*[*/]\s*[0-9.]+(\s*/\s*[0-9.]+)?\s*\)' src --include=*.scss` (391 sites, 86 distinct) is rewritten to read the name. Multipliers that are not in the table (one-offs), negative forms (`* -1`), multi-term calcs and the scrollbar-glyph geometry stay in place and are collected for part H.

The umbrella 0002-ldj gate is pixel parity; `px3` rounding changes no layout pixel, and the plan names the fallback (raw JS string for the typography family) if a font-size story differs.

**Impact:** Part H's pixel-literal purge starts from the one-off inventory this story writes; without the rewrite the 35 derivations are emitted but unread and a package changing `controlSize` still fights 391 hidden ratios.

## Steps

### 1: Write the failing reader test

`src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts` compiles the touched files and asserts the exact declarations, one `it` per family: `it("window: collapsed heights, frame inset, header font")` (`rule(".classicyWindow.collapsed").height` toBe `"var(--window-collapsed-height)"`; `rule(".classicyWindowUtility.collapsed").height` toBe `"var(--window-utility-collapsed-height)"`; `rule(".classicyWindow").padding` toBe `"var(--window-frame-inset)"`; `rule(".classicyWindowHeader")["font-size"]` toBe `"var(--window-header-font-size)"`) — if Part A's class rename has not merged, the selectors are `.classicyWindowCollapsed` / `.classicyWindowUtility.classicyWindowCollapsed`; write the test against whatever `main` has. `it("menu: min width, icon size and gap")` (`rule(".classicyMenu")["min-width"]` toBe `"var(--menu-min-width)"`; `rule(".classicyMenuItemCheck").width` toBe `"var(--menu-item-icon-size)"`; `["margin-right"]` toBe `"var(--menu-item-icon-gap)"`); `it("pop-up: height, mini size, arrow width")`; `it("typography steps")` (`rule(".classicyButtonSmall")["font-size"]` toBe `"var(--ui-font-size-mini)"`; `rule(".classicyControlLabelSizeSmall")["font-size"]` toBe `"var(--ui-font-size-small)"`; `rule(".classicyControlGroupLegend")["font-size"]` toBe `"var(--ui-font-size-caption)"`; tabs small `"var(--ui-font-size-compact)"`, tabs large `"var(--ui-font-size-large)"`); `it("tabs, slider, icon grid")` (`rule(".classicyTabsSizeSmall .classicyTabButton")["min-width"]` toBe `"var(--tab-min-width)"`; slider thumb width declaration toContain `"var(--slider-thumb-width)"`; `rule(".classicyDesktopIcon").width` toBe `"var(--desktop-icon-cell)"`); `it("no rewritten family still carries its multiplier")` (window not match `/control-size\) \* 1\.25\)/`, menu `/control-size\) \* 15\)/`, popUp `/2\.125|1\.3125/`, tabs `/10 \/ 12|\* 9\)|4 \/ 2\.5/`, button `/\/1\.5\)/`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts` — Expected: FAIL — declarations still read `calc(...)`.

### 3: Rewrite the readers file by file

Rules: (1) replace only the simple `calc(var(--x) * N)` form; leave it when it is one term of a larger expression (e.g. `calc(100% - var(--window-control-size) * 4 - …)`); (2) `calc(var(--x) * 1)` / `/ 1` → `var(--x)`; (3) border `* 2` → `var(--control-frame-width)`, `* 3` → `--control-bevel-md`, `* 4` → `--control-bevel-lg`; (4) never change a value — a multiplier not in the table stays and joins the one-off list. Per-file map: Window.scss (:14 →--window-collapsed-height, :19 →--window-header-font-size, :31 →--control-row-height, :231 delete the local custom prop and read the global --window-frame-inset, :251 →--control-bevel-lg, :254 →--control-square-size, :255,:301 →--window-title-stripe-height, :256,:302,:312,:492,:664 →--control-padding, :311 → var(--window-control-size), :352 →--control-frame-width, :511-512 →--window-frame-inset, :612 →--window-utility-collapsed-height, :164,:180,:483,:486 →--control-padding-tight); WindowFrame.scss (:18 →--control-row-height, :25 →--control-padding-wide, :27 →--window-header-font-size); Menu.scss (:24,46,76,94 →--menu-min-width; :134,135,167 →--menu-item-icon-size; :136,168 →--menu-item-icon-gap; :234 →--ui-font-size-caption; :236 →--control-padding; :17 →--control-frame-width); PopUpMenu.scss (:11,12 →--popup-mini-size; :13,33 →--ui-font-size-small; :53 →--popup-height; :110 →--popup-arrow-width; :154 →--control-padding; :156,190 →--control-padding-narrow / --control-padding-loose; :201 →--control-padding-wide; :80 → var(--window-padding-size); :91,121,146 →--control-frame-width); Tabs.scss (:216 →--tab-height; :221 →--ui-font-size-compact; :222,258 →--tab-min-width; :247 →--ui-font-size-large; :248 →--tab-min-width-large; :253-254 →--control-row-height; :83,101,232 →--control-square-size; :51 control×1; :102,114,205,223,233,249 per the padding/control families; :32,138,243,108,227-228,239 one-offs); Button.scss (:9,:83 →--control-padding; :19 →--control-frame-width; :71 →--button-square-width; :82 →--ui-font-size-mini; :87-88 →--control-square-size; :89 →--control-padding); BevelButton.scss (:12,16,128 →--control-padding; :35 →--control-frame-width; :57 →--button-square-width; :134 →--ui-font-size-mini); ButtonToolbar.scss (:25,26,32 →--control-padding-narrow; :27 →--control-padding-loose; :28 →--ui-font-size-compact; :39,40,46 →--control-padding-tight; :41 →--control-padding; :42 →--ui-font-size-mini; :45 →--control-square-size; :31 one-off); Placard.scss (:17 →--control-padding; :20 →--control-padding-loose; :23,101 →--ui-font-size-compact; :39 →--control-frame-width; :74 →--ui-font-size-mini; :97 →--control-padding-narrow); Checkbox.scss (:18,81 → var(--ui-font-size); :19,82 →--ui-font-size-caption; :23,38,86 →--control-frame-width; :69-70 one-offs); RadioInput.scss (:13 →--control-bevel-lg; :39,68 →--control-frame-width; :27,28,93 → var(--window-control-size); :29,70,92,94,95,110 one-offs); ControlLabel (:23 →--ui-font-size-small), TextEditor (:9 →--ui-font-size-small; :41 →--control-frame-width), Slider (:4 →--slider-thumb-width; :5 →--slider-thumb-height; :185,392 →--ui-font-size-small), ColorPicker (:318 →--ui-font-size-small; :157,223,235,362 →--control-frame-width), ControlGroup (:18 →--control-frame-width; :46 →--ui-font-size-small; :51 →--ui-font-size-caption), Kbd (:17,27 →--control-padding; :29 →--ui-font-size-caption), Meter (:55 →--control-padding; :60 →--ui-font-size-caption), Table (:41,46 →--ui-font-size-small), DriveSetupList (:67 →--ui-font-size-small), ListBox (:24 →--control-padding; :26 →--control-padding-loose), Output (:17), Separator (:20,36), Spinner (:21 →--control-square-size; :22 →--control-padding; :26 border×1), Tree (:44,52), FileInput (:40), FileOpenDialog (:6 padding×1; :37), DatePicker (:16; :28), TimePicker (:16; :33 →--control-row-height), LittleArrows (:14 →--control-glyph-size; :18; :79 →--control-bevel-md; :105 →--control-frame-width), ProgressBar (:86-87 →--control-glyph-size), FileBrowserViewTable (:100 →--control-glyph-size), Assistant (:17 →--control-row-height; :46-47 →--control-glyph-size; :16 and the rest one-offs), QuickTimeMovieEmbed (every control×1.5 →--control-row-height; :124,145 →--control-glyph-size; :48; :255 →--control-frame-width), Icon/DesktopIcon (:11-12 →--desktop-icon-cell; Icon:31-32, DesktopIcon:34 →--desktop-icon-label-pad; DesktopIcon:129 `--alias-badge-size: var(--desktop-icon-padding)`), MenuBar (:29,81), MenuWidgetTime (:16), ImageWell (:40,47), Input (:21,22), RichTextEditor (:17,18), appearance.scss (border×1 → var(--window-border-size); border×2 →--control-frame-width; :205 →--control-bevel-md), scrollbars.scss (:162,163,169,170 →--control-frame-width; :4-6 arrow-size forms stay), StartupScreen (:62 →--control-padding-wide). Commit every ~10 files: `refactor(scss): read named derivations in <files>`.

### 4: Verify the multiplier count dropped to the one-off set

`grep -rnoE 'calc\(\s*var\(--[a-z0-9-]+\)\s*[*/]\s*[0-9.]+(\s*/\s*[0-9.]+)?\s*\)' src --include=*.scss | grep -v Extensions/ScreenSaver | wc -l` — Expected: ≤ 60 (from 391), every remaining line is in the one-off list written to docs in G 4; paste the list into the commit body.

### 5: Run the whole suite

`pnpm test` — Expected: PASS, including the five pre-existing compiled-CSS tests (Window.resizer, Tabs.typescale, ColorPickerDialog.styles, FileBrowserViewTable.styles, HelpButton); update Tabs.typescale.test.ts's resolver to also understand `var(--ui-font-size-compact)` via `getThemeVars` if it fails.

### 6: Early parity on Window/Menu/PopUpMenu/Tabs/Button

Re-shoot `desktop-window--*`, `desktop-menu--*`, `desktop-menubar--*`, `controls-popupmenu--*`, `controls-tabs--*`, `controls-button--*`, `controls-placard--*` into `mid/` and compare. Expected AE 0 everywhere; if a font-size story differs, drop `px3` rounding for the typography family and pin the raw JS string instead — record which.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(scss): read named theme derivations instead of multipliers"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts
- [ ] VERIFY: grep -rnoE 'calc\(\s*var\(--[a-z0-9-]+\)\s*[*/]\s*[0-9.]+(\s*/\s*[0-9.]+)?\s*\)' src --include=*.scss | grep -v Extensions/ScreenSaver | wc -l   # <= 60
- [ ] Every site in the per-file map reads `var(--<name>)`; no rewritten family still carries its multiplier; the remaining sites are enumerated as the part H one-off inventory.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - window family + padding/border reads
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` - :18,25,27
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - menu family
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - popup family
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` - tab family + typography
- `src/SystemFolder/SystemResources/Button/ClassicyButton.scss` - control family
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss` - control family
- `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss` - padding + typography
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss` - padding + typography
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss` - typography + frame
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss` - bevel/frame
- `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss` - :23
- `src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.scss` - :9,41
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` - thumb sizes, typography
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` - typography + frame
- `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss` - :18,46,51
- `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss` - :17,27,29
- `src/SystemFolder/SystemResources/Meter/ClassicyMeter.scss` - :55,60
- `src/SystemFolder/SystemResources/Table/ClassicyTable.scss` - :41,46
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss` - :67
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss` - :24,26
- `src/SystemFolder/SystemResources/Output/ClassicyOutput.scss` - :17
- `src/SystemFolder/SystemResources/Separator/ClassicySeparator.scss` - :20,36
- `src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss` - :21,22,26
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.scss` - :44,52
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - :40
- `src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss` - :6,37
- `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss` - :16,28
- `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss` - :16,33
- `src/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.scss` - :14,18,79,105
- `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss` - :86-87
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss` - :100
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss` - :17,46-47
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss` - control×1.5, glyph, frame reads
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - :11-12,31-32
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - :11-12,34,129
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss` - :29,81
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss` - :16
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss` - :40,47
- `src/SystemFolder/SystemResources/Input/ClassicyInput.scss` - :21,22
- `src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.scss` - :17,18
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss` - border×1/×2/×3 reads
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss` - :162,163,169,170
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss` - :35 one-off (listed)
- `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss` - :62
- `src/Appearance/vocabulary/ClassicyDerivationReaders.test.ts` - create
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts` - resolver understands var(--ui-font-size-compact)

## Work Log
### 2026-10-29T20:14:15.844Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T04:21:11.638Z - G 2.2 implemented on feat/appearance-part-g-v2: 1a80b4e40 (G13 derived-variable reservation), 9c257a6e7 (G 1.2 review minors), 6012b2ce9 (readers use named derivations). Gate green: 4097 tests. 302/302 screenshots and computed styles identical to G 1.2's after-set; forced states 67/67 Chromium, 6/6 Firefox. Six font-size derivations emitted unrounded to keep computed values exact. Multiplier sites 327 -> 85, above the brief's <=60 estimate; the remaining sites are listed in the commit body. Task review dispatched to classify them.
