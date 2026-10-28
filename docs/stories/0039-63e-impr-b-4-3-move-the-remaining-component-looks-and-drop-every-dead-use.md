---
id: 0039-63e
title: 'B 4.3: Move the remaining component looks and drop every dead @use'
purpose: 'Finish the base/package split: seventeen more per-component Platinum partials, the ControlStrip and Slider local bevels moved, and every dead @use of the old style modules deleted across the component stylesheets.'
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:14:27.078Z"
updated: "2026-10-28T20:14:27.078Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/styles/components/_BevelButton.scss
      - src/Appearance/Platinum/styles/components/_Button.scss
      - src/Appearance/Platinum/styles/components/_Checkbox.scss
      - src/Appearance/Platinum/styles/components/_Placard.scss
      - src/Appearance/Platinum/styles/components/_Table.scss
      - src/Appearance/Platinum/styles/components/_DriveSetupList.scss
      - src/Appearance/Platinum/styles/components/_Meter.scss
      - src/Appearance/Platinum/styles/components/_Output.scss
      - src/Appearance/Platinum/styles/components/_ProgressBar.scss
      - src/Appearance/Platinum/styles/components/_SplitView.scss
      - src/Appearance/Platinum/styles/components/_Assistant.scss
      - src/Appearance/Platinum/styles/components/_StartupScreen.scss
      - src/Appearance/Platinum/styles/components/_QuickTimeMovieEmbed.scss
      - src/Appearance/Platinum/styles/components/_ControlStrip.scss
      - src/Appearance/Platinum/styles/components/_Slider.scss
      - src/Appearance/Platinum/styles/components/_DesktopIcon.scss
      - src/Appearance/Platinum/styles/components/_Icon.scss
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss
      - src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss
      - src/SystemFolder/SystemResources/Button/ClassicyButton.scss
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Meter/ClassicyMeter.scss
      - src/SystemFolder/SystemResources/Output/ClassicyOutput.scss
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.scss
      - src/SystemFolder/SystemResources/SplitView/ClassicySplitView.scss
      - src/SystemFolder/SystemResources/Table/ClassicyTable.scss
      - src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss
      - src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
      - src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu.scss
      - src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss
      - src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss
      - src/SystemFolder/SystemResources/Input/ClassicyInput.scss
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss
      - src/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.scss
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss
      - src/SystemFolder/SystemResources/Separator/ClassicySeparator.scss
      - src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss
      - src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.scss
      - src/SystemFolder/SystemResources/Triangle/ClassicyTriangle.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/Appearance/Platinum/styles/platinum.scss
      - src/Appearance/Platinum/styles/platinum.css.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0038-dzn", "depends"]
  plans:
    - ["0005-1b3", "included", ["4.3"]]
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

# B 4.3: Move the remaining component looks and drop every dead @use

## Problem Statement

Audit §9 Phase 2 item 3 (umbrella 0002-ldj): the remaining 37 component stylesheets still `@use` the deleted AppearanceManager/styles modules. Seventeen of them include a Platinum mixin or a local bevel re-implementation (§2.3: ControlStrip:23-60, Slider:39) and get a `components/_<Name>.scss` partial under the 4.2 move rule; the other twenty only carry a dead `@use` line and lose it. ColorPicker's `color-track` (:251-263) is crayon data, not a bevel, and stays.

After this story no file under src/SystemFolder references `AppearanceManager/styles/(appearance|scrollbars|assets)`, `@include appearance.`, `@include scrollbars.` or `assets.$`, enforced by a repo-wide test, and the full Storybook story set compares AE 0.

**Impact:** The library and Storybook do not build between 4.1 and this story; 5.1's exports and the parity gate assume the split is complete, and part I's Platinum partial edits (_Menu.scss) assume the partial layout exists.

## Steps

### 1: Extend the css test and add the repo-wide guard

platinum.css.test.ts: `scopes the push button bevels` (contains `… .classicyButton{` with `border-radius:` and `… .classicyButtonDefault.classicyButtonKeyActive{`); `scopes the control strip bevels` (contains `… .classicyControlStripCell{background:linear-gradient(`); `scopes the slider thumb` (contains `… .classicySlider::-webkit-slider-thumb{clip-path:`); `no base stylesheet uses the old style modules` (glob `src/SystemFolder/**/*.scss` → no file matches /AppearanceManager\/styles\/(appearance|scrollbars|assets)|@include appearance\.|@include scrollbars\.|assets\.\$/; the glob must skip `src/Appearance/`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts` — Expected: FAIL — 37 base files still reference the old modules.

### 3: Create the seventeen partials and strip the base files

Every partial follows the 4.2 header; platinum.scss includes all 23 partials inside the wrapper. Moves (partial mixin name in parentheses): _Button (button): ClassicyButton.scss:22 depressable under `.classicyButton`, :38 depressable-default under `.classicyButtonDefault`, :56 and :63 depressed under `.classicyButtonDepressed` / `.classicyButtonKeyActive`, :67 box-shadow-active under `.classicyButtonDefault.classicyButtonKeyActive`. _BevelButton (bevelButton): :158 menu-frame under `.classicyBevelButtonPopup.classicyBevelButtonPopupPanel`. _Checkbox: :9 window-border under `.classicyCheckbox`. _Placard: :91 window-border under `.classicyPlacardMenu`. _Table: :54 window-box-shadow under `.classicyTableColumnHeader`, :58 header-border-depressed under `.classicyTableColumnHeaderSelected`. _DriveSetupList: :72 window-box-shadow under `.driveSetupList__head th`. _Meter: :31 inner-border under `.classicyMeter`. _Output: :19 inner-border under `.classicyOutputInset`. _ProgressBar: :13 inner-border under `.classicyProgress progress[value]::-webkit-progress-bar`. _SplitView: :35 window-border under `.classicySplitViewDivider` (:36 no-select → vocabulary, stays). _Assistant: :22 header-border under `.classicyAssistantHeader` (:23, :80 no-select → vocabulary). _StartupScreen: :21 window-border under `.classicyStartupScreenPanel` (:47 no-select → vocabulary). _QuickTimeMovieEmbed: :68 undepressable under `.quickTimePlayerVideoControlsTime`, :83 and :103 depressable under `…ControlsButton` / `…ProgressBarHolder`, :187 inner-box-shadow under `…VolumeBar` (:8, :47 no-select → vocabulary). _ControlStrip: the three local look mixins `bevel-raised` (:23-34), `bevel-recessed` (:36-45), `bevel-pressed` (:47-58) move verbatim as `platinum-control-strip-bevel-raised/-recessed/-pressed` (bodies call `layout.classicy-px-rect`), with their five includes :144, :151, :182, :201, :227 under their chains (`.classicyControlStripCell`, `… &:active:not(:disabled)`, `.classicyControlStripScroll &:disabled`, `.classicyControlStrip .classicyBevelButton.classicyControlStripModule`, `… &[aria-expanded="true"]`); `strip-cell` (:60) is structure and stays; the `@use … as *` line becomes `@use "../../../Appearance/vocabulary/layout"`. _Slider: the `thumb-appearance` mixin (ClassicySlider.scss:39-47) and the `$_thumb-*-svg` / `$thumb-shape` variables it reads move as `platinum-slider-thumb`, with the eight includes :113-:163 under their chains (`.classicySlider::-webkit-slider-thumb`, `::-moz-range-thumb`, `:active::…`, and the `.classicySliderHighlighted` variants); `url('../../../../assets/img/ui/slider-strikes.svg')` becomes `url('../../../../../assets/img/ui/slider-strikes.svg')` from the new depth. _DesktopIcon: :55 `platinum-halftone(#000000, 7%)` under `.classicyDesktopIconMask`. _Icon: :57 likewise under `.classicyIconMask`. Dead `@use` lines deleted outright (a script is fine): BalloonHelp:1, ButtonToolbar:1, ColorPicker:1, ContextualMenu:1, ControlGroup:1-2, DatePicker:1, Disclosure:1, FileOpenDialog:1, FileInput:2, ImageWell:1, Input:1, ListBox:1, LittleArrows:1, RadioInput:1-2, Separator:1-2, Spinner:1, Tabs:1, TimePicker:1, Tree:1, Triangle:1, plus the now-unused lines in Alert:2, DesktopIcon:1-2, Icon:1-2.

### 4: Run the css test and the full suite

`pnpm exec vitest run src/Appearance/Platinum && pnpm test && pnpm build:source` — Expected: PASS and a clean build; `grep -rn 'AppearanceManager/styles/' src --include=*.scss` prints nothing.

### 5: Parity: the full story set

Re-shoot every id in stories.txt into `after/`; `for f in before/*.png; do compare -metric AE "$f" "after/$(basename $f)" null: 2>&1; echo " $f"; done` → 0 everywhere. Non-zero → apply the move rule's property grep to that component and re-shoot.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "refactor(appearance): move every remaining component look into the Platinum package"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: test "$(grep -rn 'AppearanceManager/styles/' src --include=*.scss | wc -l)" -eq 0
- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum && pnpm build:source
- [ ] Seventeen new partials hold the moved includes, the ControlStrip bevels and the Slider thumb under their original selector chains; no file under src/SystemFolder references AppearanceManager/styles, `@include appearance.`, `@include scrollbars.` or `assets.$`.
- [ ] [MANUAL] Every story in .playwright-mcp/parity/part-b/stories.txt compares with AE 0 before vs after.

## Files

- `src/Appearance/Platinum/styles/components/_BevelButton.scss` - create
- `src/Appearance/Platinum/styles/components/_Button.scss` - create
- `src/Appearance/Platinum/styles/components/_Checkbox.scss` - create
- `src/Appearance/Platinum/styles/components/_Placard.scss` - create
- `src/Appearance/Platinum/styles/components/_Table.scss` - create
- `src/Appearance/Platinum/styles/components/_DriveSetupList.scss` - create
- `src/Appearance/Platinum/styles/components/_Meter.scss` - create
- `src/Appearance/Platinum/styles/components/_Output.scss` - create
- `src/Appearance/Platinum/styles/components/_ProgressBar.scss` - create
- `src/Appearance/Platinum/styles/components/_SplitView.scss` - create
- `src/Appearance/Platinum/styles/components/_Assistant.scss` - create
- `src/Appearance/Platinum/styles/components/_StartupScreen.scss` - create
- `src/Appearance/Platinum/styles/components/_QuickTimeMovieEmbed.scss` - create
- `src/Appearance/Platinum/styles/components/_ControlStrip.scss` - create: three bevel mixins and includes
- `src/Appearance/Platinum/styles/components/_Slider.scss` - create: platinum-slider-thumb
- `src/Appearance/Platinum/styles/components/_DesktopIcon.scss` - create: halftone
- `src/Appearance/Platinum/styles/components/_Icon.scss` - create: halftone
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss` - include moved
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss` - include moved; no-select from vocabulary
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss` - include moved
- `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss` - include moved; no-select from vocabulary
- `src/SystemFolder/SystemResources/Button/ClassicyButton.scss` - includes moved
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss` - include moved
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.scss` - bevel mixins moved; vocabulary @use
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - halftone moved; dead @use removed
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - halftone moved; dead @use removed
- `src/SystemFolder/SystemResources/Meter/ClassicyMeter.scss` - include moved
- `src/SystemFolder/SystemResources/Output/ClassicyOutput.scss` - include moved
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss` - include moved
- `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss` - include moved
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss` - includes moved; no-select from vocabulary
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` - thumb mixin moved
- `src/SystemFolder/SystemResources/SplitView/ClassicySplitView.scss` - include moved; no-select from vocabulary
- `src/SystemFolder/SystemResources/Table/ClassicyTable.scss` - includes moved
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.scss` - dead @use removed
- `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss` - dead @use removed
- `src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.scss` - dead @use removed
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Input/ClassicyInput.scss` - dead @use removed
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss` - dead @use removed
- `src/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.scss` - dead @use removed
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Separator/ClassicySeparator.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` - dead @use removed
- `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Triangle/ClassicyTriangle.scss` - dead @use removed
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - dead @use removed
- `src/Appearance/Platinum/styles/platinum.scss` - includes all 23 partials
- `src/Appearance/Platinum/styles/platinum.css.test.ts` - bevel/strip/slider assertions and repo-wide guard

## Work Log
