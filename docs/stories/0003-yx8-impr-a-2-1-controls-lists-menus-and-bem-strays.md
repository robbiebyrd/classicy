---
id: 0003-yx8
title: 'A 2.1: Controls, lists, menus and BEM strays'
purpose: Replace component-specific state classes on controls, lists and menus with the bare shared state classes, and rename the BEM strays.
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T19:48:00.334Z"
updated: "2026-10-28T19:48:00.334Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Button/ClassicyButton.tsx
      - src/SystemFolder/SystemResources/Button/ClassicyButton.scss
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.scss
      - src/SystemFolder/SystemResources/Table/ClassicyTable.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss
      - src/SystemFolder/SystemResources/Link/ClassicyLink.tsx
      - src/SystemFolder/SystemResources/Output/ClassicyOutput.tsx
      - src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx
      - src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.scss
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.tsx
      - src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss
      - src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0002-r2d", "depends"]
  plans:
    - ["0003-7x7", "included", ["2.1"]]
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

# A 2.1: Controls, lists, menus and BEM strays

## Problem Statement

Audit §2.8: ~88 component-specific state classes (`classicyButtonDepressed`, `classicyListBoxOptionSelected`, `classicyMenuItemDisabled`, …) plus BEM strays (`select--disabled` PopUpMenu.tsx:489, `classicyColorPickerSlider--red/--green/--blue` ColorPickerRGB.tsx:37/49/61, `driveSetupList__row--selected` DriveSetupList.tsx:37-38). Decision D20 and umbrella 0002-ldj: shared state classes are bare and sit beside the root (`.classicyButton.pressed`), emitted through `classicyStateClasses` (A 1.1).

This story converts every control, list and menu per a fixed mapping table (legacy → shared, DELETE or KEEP), replaces the SCSS selectors one class for one class (specificity unchanged, so no rule order changes), renames the BEM strays to `classicyColorPickerSliderRed/Green/Blue` and `classicyDriveSetupListRow.selected`, and updates the 11 test files that assert legacy names.

**Impact:** A 2.2 (windows, icons, data-state users) and A 4.1/4.2 (cascade order) assume the controls already use the shared vocabulary; packages (part B) target `.classicyX.<state>` and would find nothing.

## Steps

### 1: Write the failing DOM tests

`src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx`, one `it` per component rendered through the existing story helpers / providers: `it("ClassicyButton: isDefault → default, depressed → pressed")` (`render(<ClassicyButton isDefault depressed>x</ClassicyButton>)`; `getByRole("button")` toHaveClass `"classicyButton", "default", "pressed"` and not `"classicyButtonDefault", "classicyButtonDepressed"`); `it("ClassicyCheckbox: mixed/checked/disabled")` (toHaveClass `"mixed"`, not `"classicyCheckboxMixed"`); `it("ClassicyMenu: disabled item carries disabled, open item carries open")`; `it("ClassicyPopUpMenu: disabled → disabled, no select--disabled")`; `it("ClassicyListBox: selected option → selected; disabled option → disabled")`; `it("ClassicyTabs: the selected tab button carries selected, not classicyTabButtonActive")`; `it("ClassicyTree / ClassicyTable / FileBrowserViewTable rows: selected")`; `it("ClassicyColorPickerRGB sliders: classicyColorPickerSliderRed/Green/Blue")`; `it("DriveSetupList: classicyDriveSetupListRow.selected")`. Plus a compiled-CSS test in the same file (`sass.compile` each touched .scss, `style: "expanded"`) asserting `css` contains `.classicyButton.pressed {` and does not contain `.classicyButtonDepressed`, `.select--disabled`, `&--red`/`.classicyColorPickerSlider--red`, `driveSetupList__row--selected`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx` — Expected: FAIL on every `toHaveClass(<state>)`.

### 3: Convert the TSX emitters per the mapping table

One component at a time; import `classicyStateClasses` from `@/Appearance/vocabulary/ClassicyVocabulary`; emission pattern `classNames("classicyX", classicyStateClasses({ disabled, selected }), …)`. Mapping (DELETE = legacy class and rule removed, KEEP = stays as a part): Button Default→default DELETE, Depressed→pressed DELETE, KeyActive→pressed + KEEP `classicyButtonKeyActive` (`.classicyButtonDefault.classicyButtonKeyActive` becomes `.classicyButton.default.classicyButtonKeyActive`); Checkbox Default→default, Mixed→mixed DELETE, plus `checked` and `disabled` from the props; RadioInput WrapperChecked→checked, WrapperDisabled→disabled, LabelDisabled→disabled, Default→default, Mixed→mixed DELETE; Menu ItemDisabled→disabled, ItemOpen→open DELETE (also BevelButtonPopup.tsx:30, BevelButton.tsx:70); PopUpMenu Open→open, ButtonDisabled→disabled, `select--disabled`→disabled DELETE; ListBox Disabled→disabled, OptionSelected→selected, OptionDisabled→disabled DELETE; Tabs TabButtonActive→selected DELETE (tabs are selected; `active` is reserved for focus); Tree NodeSelected→selected, NodeDisabled→disabled DELETE; Table RowSelected→selected, ColumnHeaderSelected→selected DELETE; FileBrowserViewTable RowSelected→selected DELETE; Link/Output/ControlLabel/ComboBox/PopUpSlider Disabled→disabled DELETE; Slider Disabled→disabled, TicksDisabled→disabled (on the ticks element) DELETE, Highlighted KEEP, GhostHidden KEEP; ColorPicker SwatchDisabled→disabled, CrayonSelected→selected, ModeListItemSelected→selected DELETE; `classicyColorPickerSlider--red/--green/--blue` → `classicyColorPickerSliderRed/Green/Blue` (parts); FileInput Error→error DELETE; Disclosure InnerOpen→open DELETE; DriveSetup `driveSetupList__row`→`classicyDriveSetupListRow`, `__row--selected`→`.classicyDriveSetupListRow.selected`, `__tableContainer`→`classicyDriveSetupListTable`.

### 4: Convert the SCSS selectors

For each DELETE class, replace the selector with `.<root>.<state>` at the same nesting depth (one class for one class, no rule order changes); `.classicyX { &#{classicy-state(disabled)} { … } }` or the literal `.classicyX.disabled` are both allowed. Rename the BEM strays (`&--red` → `.classicyColorPickerSliderRed`, DriveSetupList.scss:75-81). Update the 11 legacy-name test files (`grep -rln 'classicyListBoxOptionSelected\|classicyMenuItemDisabled\|classicyTabButtonActive\|classicyTreeNodeSelected\|classicyTableRowSelected\|classicyButtonDepressed\|classicyCheckboxMixed\|classicyRadioInputWrapperChecked\|classicySliderDisabled\|classicyPopUpMenuOpen\|classicyFileInputError\|classicyDisclosureInnerOpen' src --include=*.test.tsx`) by replacing the class strings only.

### 5: Verify nothing still reads a deleted class

`grep -rnE 'classicy(ButtonDefault|ButtonDepressed|CheckboxDefault|CheckboxMixed|RadioInputWrapperChecked|RadioInputWrapperDisabled|RadioInputLabelDisabled|RadioInputDefault|RadioInputMixed|MenuItemDisabled|MenuItemOpen|PopUpMenuOpen|PopUpMenuButtonDisabled|ListBoxDisabled|ListBoxOptionSelected|ListBoxOptionDisabled|TabButtonActive|TreeNodeSelected|TreeNodeDisabled|TableRowSelected|TableColumnHeaderSelected|FileBrowserViewTableRowSelected|LinkDisabled|OutputDisabled|ControlLabelDisabled|ComboBoxDisabled|PopUpSliderDisabled|SliderDisabled|SliderTicksDisabled|ColorPickerSwatchDisabled|ColorPickerCrayonSelected|ColorPickerModeListItemSelected|FileInputError|DisclosureInnerOpen)\b|select--disabled|Slider--(red|green|blue)|driveSetupList__' src example storybook/.storybook | wc -l` — Expected: 0.

### 6: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources src/SystemFolder/ControlPanels/DriveSetup` — Expected: PASS.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(vocabulary): bare shared state classes on controls, lists and menus"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx
- [ ] VERIFY: grep -rnE 'classicy(ButtonDefault|ButtonDepressed|CheckboxDefault|CheckboxMixed|RadioInputWrapperChecked|RadioInputWrapperDisabled|RadioInputLabelDisabled|RadioInputDefault|RadioInputMixed|MenuItemDisabled|MenuItemOpen|PopUpMenuOpen|PopUpMenuButtonDisabled|ListBoxDisabled|ListBoxOptionSelected|ListBoxOptionDisabled|TabButtonActive|TreeNodeSelected|TreeNodeDisabled|TableRowSelected|TableColumnHeaderSelected|FileBrowserViewTableRowSelected|LinkDisabled|OutputDisabled|ControlLabelDisabled|ComboBoxDisabled|PopUpSliderDisabled|SliderDisabled|SliderTicksDisabled|ColorPickerSwatchDisabled|ColorPickerCrayonSelected|ColorPickerModeListItemSelected|FileInputError|DisclosureInnerOpen)\b|select--disabled|Slider--(red|green|blue)|driveSetupList__' src example storybook/.storybook | wc -l   # 0
- [ ] Every DELETE class in the mapping table is gone from TSX, SCSS and tests; every KEEP class (`classicyButtonKeyActive`, `classicySliderHighlighted`, `classicySliderGhostHidden`) still renders.
- [ ] Each replaced SCSS selector has the same specificity and position as the one it replaced, so computed styles are unchanged (parity is checked in A 6).

## Files

- `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx` - :173,176,177 shared states
- `src/SystemFolder/SystemResources/Button/ClassicyButton.scss` - :31,55,62,66 selectors
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx` - :123-124
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.scss` - selectors
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx` - :144-145,154-155
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss` - selectors
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` - :375,377
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - selectors
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup.tsx` - :30 classicyMenuItemDisabled
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` - :70 classicyMenuItemDisabled
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` - :489 select--disabled, :490, :505
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - :63
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx` - :188,211,212
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.scss` - selectors
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx` - :333
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` - 3 rules
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx` - :251,252,286,304,305
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.scss` - selectors
- `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx` - :477,538
- `src/SystemFolder/SystemResources/Table/ClassicyTable.scss` - selectors
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.tsx` - :466
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss` - selectors
- `src/SystemFolder/SystemResources/Link/ClassicyLink.tsx` - Disabled → disabled (+ .scss)
- `src/SystemFolder/SystemResources/Output/ClassicyOutput.tsx` - Disabled → disabled (+ .scss)
- `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.tsx` - Disabled → disabled (+ .scss)
- `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx` - Disabled → disabled (+ .scss)
- `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx` - Disabled → disabled (+ .scss)
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx` - :283-284,309,320
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` - selectors
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx` - :95
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx` - :102
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx` - :192
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx` - :37,49,61 BEM strays
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` - :257-259
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx` - :183
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - selector
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx` - :129
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss` - selector
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.tsx` - :37-38 BEM strays
- `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss` - :75-81
- `src/Appearance/vocabulary/ClassicyStateClasses.controls.test.tsx` - create: DOM + compiled-CSS tests

## Work Log
