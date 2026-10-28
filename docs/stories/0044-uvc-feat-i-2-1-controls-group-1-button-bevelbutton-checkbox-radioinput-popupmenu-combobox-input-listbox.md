---
id: 0044-uvc
title: 'I 2.1: Controls group 1: Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox'
purpose: Wire useClassicyAppearance into the eight basic control roots so a package can decorate them and receive their press, release, click, open, close, change, focus, blur and select events.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:17:02.861Z"
updated: "2026-10-28T20:17:02.861Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Button/ClassicyButton.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx
      - src/SystemFolder/SystemResources/Input/ClassicyInput.tsx
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx
      - src/SystemFolder/SystemResources/Button/ClassicyButton.appearance.test.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.appearance.test.tsx
      - src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.appearance.test.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.appearance.test.tsx
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.appearance.test.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.appearance.test.tsx
      - src/SystemFolder/SystemResources/Input/ClassicyInput.appearance.test.tsx
      - src/SystemFolder/SystemResources/ListBox/ClassicyListBox.appearance.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0043-u43", "depends"]
  plans:
    - ["0006-dy6", "included", ["2.1"]]
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

# I 2.1: Controls group 1: Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox

## Problem Statement

Audit §9 Phase 7 item 1 / §8.5 (umbrella 0002-ldj): every component root calls the hook. Group 1 covers the basic controls. Wiring pattern: `const appearance = useClassicyAppearance("<Name>", { …states }, rootRef)`; the root gets `className={classNames(<existing classes>, appearance.className)}` (replacing the `classicyStateClasses(...)` call part A placed there, so no state class is emitted twice), `style={{ ...existingStyle, ...appearance.style }}` only when the root already had a style prop or appearance.style is set, `{...appearance.attrs}` spread last; events through `appearance.emit`. Sound dispatches stay in place until 3.1.

Per component (root → states → events): Button (ClassicyButton.tsx:171-199 `<button class=classicyButton>`, an internal buttonRef merged with the forwarded ref via a callback ref) → { pressed: depressed || keyActive, disabled, default: isDefault } → press on onMouseDown and the keydown branch at :149, release on onMouseUp and keyup at :158, click in onHandleFunc (:140). BevelButton (:440-470, buttonRef) → { pressed, checked: onState, mixed, disabled, open: popupOpen } → press/release at :480-495, click in onHandleFunc, open in the popup-open path at :328-335 (detail { trigger }), close when popupOpen turns false. Checkbox (:121-131 `<input class=classicyCheckbox>`; add inputRef) → { checked: check, mixed, disabled, default: isDefault } → change in handleOnClick (:93-99, detail { checked: !check }). RadioInput (:132-136 `.classicyRadioInputGroup`; groupRef) → { disabled } → press/release at :165-205 on both the input and the label (detail { itemId }), change when `check` changes (detail { itemId }). PopUpMenu (:486-492 `.classicyPopUpMenu`, wrapperRef) → { open, disabled } → open/close around setOpen(true)/setOpen(false) at :243/:255, change on selection (detail { value }). ComboBox (:349-353 `.classicyComboBox`; add rootRef) → { open, disabled } → open/close when its list opens/closes, change on commit (detail { value }). Input (:140-160 `<input class=classicyInput>`, forwarded ref merged as for Button) → { default: isDefault, disabled } → focus/blur on onFocus/onBlur, change in handleOnChangeFunc (detail { value }). ListBox (:186-189 `.classicyListBox`; add rootRef) → { disabled } → select on option click (detail { value }), focus/blur on the root.

**Impact:** Without the wiring, 3.1 cannot move the click sounds for Button, BevelButton, Placard and RadioInput into Platinum hooks and the 4.1 stories have no decorations or events to show.

## Steps

### 1: Write the failing component appearance tests

One `<Name>.appearance.test.tsx` per component, each with `installClassicyAppearanceProbe()` in beforeEach and `uninstall` in afterEach. `carries the probe decoration and state classes` — root.classList contains `probe-<Name>` and the expected bare state class (Button rendered with depressed → "pressed"; BevelButton on → "checked"; Checkbox checked → "checked"; RadioInput disabled → "disabled"; PopUpMenu disabled → "disabled"; ComboBox disabled → "disabled"; Input isDefault → "default"; ListBox disabled → "disabled") and `data-probe-state` equals the joined state classes. `emits its events` — Button: fireEvent.mouseDown/mouseUp/click → events (after "mount") equal [press, release, click]; BevelButton (mode toggle): mouseDown/mouseUp/click → [press, release, click]; Checkbox: click → [{ event: "change", detail: { checked: true } }]; RadioInput (two items): mouseDown/mouseUp on item b's input → [press { itemId: "b" }, release { itemId: "b" }] and click → change { itemId: "b" }; PopUpMenu: click the button → open, pick an option → [change { value }, close]; ComboBox: focus+type → open, Enter → [change, close]; Input: focus, type "a", blur → [focus, change { value: "a" }, blur]; ListBox: click an option → select { value }. `adds nothing when the package returns nothing` — with uninstall() called first (Platinum stub without hooks): root has no `data-probe-state` attribute and no inline style.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} -t appearance` — Expected: FAIL — no probe class on the root.

### 3: Wire the eight components

Per the component table in the problem statement; the hook call sits beside the other hooks at the top of each component so the hook order is unconditional. Keep the existing sound dispatches (3.1 removes them).

### 4: Run the group's tests and the full suite

`pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} && pnpm test` — Expected: PASS.

### 5: Parity for the group's stories

Re-shoot ids starting with controls-button, controls-bevelbutton, controls-checkbox, controls-radioinput, controls-popupmenu, controls-combobox, controls-input, controls-listbox into `.playwright-mcp/parity/part-i/after/`; `compare -metric AE` → 0 each (the wiring adds no attribute and no style under Platinum).

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): wire useClassicyAppearance into the push, bevel, check, radio, pop-up, combo, input and list controls"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} -t appearance
- [ ] The eight roots carry the probe decoration and the listed state classes, emit the listed events with their detail payloads, and add no DOM attribute or inline style when the package returns nothing.
- [ ] [MANUAL] controls-button*, controls-bevelbutton*, controls-checkbox*, controls-radioinput*, controls-popupmenu*, controls-combobox*, controls-input* and controls-listbox* stories compare AE 0 before vs after.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/SystemResources/Button/ClassicyButton.tsx` - hook on the button root; press/release/click
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` - hook; press/release/click/open/close
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.tsx` - hook on the input; change
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx` - hook on the group; press/release/change
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` - hook; open/close/change
- `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx` - hook; open/close/change
- `src/SystemFolder/SystemResources/Input/ClassicyInput.tsx` - hook; focus/blur/change
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.tsx` - hook; select/focus/blur
- `src/SystemFolder/SystemResources/Button/ClassicyButton.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Input/ClassicyInput.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/ListBox/ClassicyListBox.appearance.test.tsx` - create

## Work Log
