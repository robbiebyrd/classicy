---
id: 0005-dlx
title: 'A 3.1: Passthrough on every public component; ClassicyButton spread order'
purpose: Give every exported component `className` and `style` passthrough that merges onto the root, and fix ClassicyButton dropping a consumer className.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T19:49:52.097Z"
updated: "2026-10-28T19:49:52.097Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Button/ClassicyButton.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHSV.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHLS.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx
      - src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.tsx
      - src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog.tsx
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog.tsx
      - src/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx
      - src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.tsx
      - src/SystemFolder/SystemResources/Input/ClassicyInput.tsx
      - src/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog.tsx
      - src/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentDialog.tsx
      - src/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField.tsx
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx
      - src/SystemFolder/SystemResources/Meter/ClassicyMeter.tsx
      - src/SystemFolder/SystemResources/Output/ClassicyOutput.tsx
      - src/SystemFolder/SystemResources/Pager/ClassicyPager.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx
      - src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx
      - src/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.tsx
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx
      - src/SystemFolder/SystemResources/Spinner/ClassicySpinner.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx
      - src/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.tsx
      - src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.tsx
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow.tsx
      - src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx
      - src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.tsx
      - src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.tsx
      - src/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx
      - src/SystemFolder/SystemResources/Form/ClassicyForm.tsx
      - src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.tsx
      - src/SystemFolder/SystemResources/Kbd/ClassicyKbd.tsx
      - src/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx
      - src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx
      - src/SystemFolder/SystemResources/Separator/ClassicySeparator.tsx
      - src/SystemFolder/SystemResources/SplitView/ClassicySplitView.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.tsx
      - src/SystemFolder/SystemResources/Triangle/ClassicyTriangle.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx
      - src/Appearance/vocabulary/ClassicyPassthrough.test.tsx
      - src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0004-l1f", "depends"]
  plans:
    - ["0003-7x7", "included", ["3.1"]]
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

# A 3.1: Passthrough on every public component; ClassicyButton spread order

## Problem Statement

Audit §5: `className`/`style` passthrough is inconsistent — ~18 components merge `className`, 41 accept neither, and `ClassicyButton` accepts `className` in its type but overwrites it because `{...rest}` is spread before `className=` (ClassicyButton.tsx:165-171). §9 Phase 1 item 3 and umbrella 0002-ldj require every exported component to merge both props onto its root so hosts and packages can decorate without wrappers.

Rule: `className` is merged LAST into the root's `classNames(...)`; `style` is spread AFTER the component's own inline style (`style={{ ...ownStyle, ...style }}`) so a consumer can override position/size but never remove the root class. `ClassicyWindow` is the one exception: `style` is merged before `windowStyle`, so `style.width/height` cannot override the stored size.

**Impact:** Part I's `useClassicyAppearance` hook returns `{ className, style, attrs }` decorations that are merged onto component roots; without passthrough on every component, package decorations have nowhere to land.

## Steps

### 1: Write the failing table-driven test

`src/Appearance/vocabulary/ClassicyPassthrough.test.tsx`: `const cases: Array<[name: string, render: () => ReactElement, root: (c: HTMLElement) => HTMLElement]>` with one row per component in the file list, e.g. `["ClassicyButton", () => <ClassicyButton className="host" style={{ marginTop: 7 }}>x</ClassicyButton>, (c) => c.querySelector(".classicyButton")!]`; `it.each(cases)("%s merges className and style onto its root", (_, make, root) => { const { container } = render(make(), { wrapper: Providers }); const el = root(container); expect(el.className.split(" ")).toContain("host"); expect(el.className).toMatch(/^classicy[A-Z]/); expect(el.style.marginTop).toBe("7px"); })`; `it("ClassicyButton keeps its own class when className is passed (spread-order bug)")` (`expect(b).toHaveClass("classicyButton", "host")`); `it("ClassicyWindow: style cannot override the stored size")` (window with `initialSize [300,200]` and `style={{ width: 999 }}` → `root.style.width === "300px"`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyPassthrough.test.tsx` — Expected: FAIL for every row except the ~18 components that already merge `className` (those fail only on `style`).

### 3: Fix ClassicyButton.tsx:165-171

`const { className, …rest }` in the destructure; `className={classNames("classicyButton", …, className)}` after the spread; `rest` keeps `style`.

### 4: Add the props to the remaining components

Mechanical: add `className?: string; style?: CSSProperties;` to each props type, destructure, merge per the rule (className last in `classNames(...)`, `style={{ ...ownStyle, ...style }}`); where the component forwards `…rest` to a DOM element, destructure `className`/`style` before the spread so they cannot clobber the merge. Components with neither prop today (41): Alert, Assistant, Checkbox, ColorPicker (+Dialog, Crayon, HSV, HLS, CMYK, RGB, Wheel), ComboBox, ControlLabel, DatePicker, Desktop, DesktopIcon, DesktopMenuBar, Disclosure, FileBrowser, FileDialog/FileOpenDialog/FileSaveDialog, FileInput, Icon, ImageWell, Input, InputDialog, KeyboardEquivalentDialog, KeyboardEquivalentField, ListBox, Meter, Output, Pager, Placard, ProgressBar, RadioInput, RichTextEditor, Slider, Spinner, Tabs, TextEditor, TimePicker, Tree, Window, AboutWindow (list them in the commit body). Components with `className` but no `style`: BalloonHelp, ButtonToolbar, ContextualMenuTarget, ControlGroup, ControlStrip, Form, HelpButton, Kbd, LittleArrows, Menu, PixelArt, PopUpMenu, PopUpSlider, Separator, SplitView, Table, Triangle, WindowFrame — add `style`. `ClassicyApp`, providers and the dialogs that render a `ClassicyWindow` forward both to that window; `ClassicyWindow` merges `style` before `windowStyle`.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources` — Expected: PASS.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "feat(components): className and style passthrough on every component; fix ClassicyButton dropping className"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyPassthrough.test.tsx
- [ ] Every exported component's props include `className?: string` and `style?: CSSProperties`; the root keeps its `classicy<Component>` class and carries the host class; `style.marginTop` lands on the root.
- [ ] `ClassicyButton` renders `classicyButton host` when `className="host"` is passed.
- [ ] `ClassicyWindow` ignores `style.width/height` while the store has a size (merge `style` first, then `windowStyle`).

## Files

- `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx` - :165-171 merge className after the spread
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - className after state classes; style merged before windowStyle
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` - add className/style (and the other 39 no-prop components listed in step 4)
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx` - add style (and the other 17 className-only components listed in step 4)
- `src/Appearance/vocabulary/ClassicyPassthrough.test.tsx` - create: table-driven passthrough test
- `src/SystemFolder/SystemResources/Button/ClassicyButton.test.tsx` - add one spread-order case

## Work Log
