---
id: 0044-uvc
title: 'I 2.1: Controls group 1: Button, BevelButton, Checkbox, RadioInput, PopUpMenu, ComboBox, Input, ListBox'
purpose: Wire useClassicyAppearance into the eight basic control roots so a package can decorate them and receive their press, release, click, open, close, change, focus, blur and select events.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:17:02.861Z"
updated: "2026-10-29T20:22:00.352Z"
started: "2026-10-29T17:30:58.233Z"
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
    - ["0083-v8n", "blocks"]
    - ["0043-u43", "depends"]
  plans:
    - ["0006-dy6", "included", ["2.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "6":
    status: complete
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

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/{Button,BevelButton,Checkbox,RadioInput,PopUpMenu,ComboBox,Input,ListBox} -t appearance
- [x] The eight roots carry the probe decoration and the listed state classes, emit the listed events with their detail payloads, and add no DOM attribute or inline style when the package returns nothing.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

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

### 2026-10-29T17:30:49.037Z - Started beside Part B by controller decision (I reconciliation marks the 2.x code safe early: B's remaining work is SCSS-only apart from 5.1's decorator and docs). Ruling I-R4 binds strictly: each component passes the hook exactly today's state object, so class lists and the forced-state matrix are unchanged. Base e0f358082 on feat/appearance-part-i; implementer dispatched. Parity deferred until after Part B lands. Depends story 0043-u43 (I 1.1) is complete.

### 2026-10-29T18:24:55.900Z - Code complete on feat/appearance-part-i, e0f358082..3c2dc4e76: a82ef5255 (the eight roots call useClassicyAppearance with exactly today's state objects per I-R4 — RadioInput and Input pass {} — so class lists, style values and attributes are byte-identical with no package hooks (24-state DOM dump; only a consumer style attribute now serializes after class on Button/BevelButton, which the parity dumps cannot see); attrs spread first (I-R5); every emit isolated (I-R13); close emitted when the open flag falls, so a pick reports change before close; passthrough rows prove consumer style beats package style for 5 components), 7345b7ad1 (review round 1: shared internal useClassicyMergedRef for Button/Input fixes React 19 cleanup-returning callback refs, with object/callback/cleanup ref tests; ListBox select emitted from applySelection with { value, selected }, so keyboard selection reports too), 3c2dc4e76 (final minors: forwarded-ref identity-change tests). Reviews: Needs fixes (I1 M4) → Approved (M2, both closed). Gate on 3c2dc4e76: lint, tsc, build:source + verify:dist, 3972 tests + the 0082-lgo (l) vocab-scan timeout under load (passes alone; fixed on the integration branch in bd555eb15). Doc rows for the docs task are in task-2.1-report.md (close timing, RadioInput change on user selection only, ListBox select per gesture). Stays in_progress for the [MANUAL] AE-0 parity of the eight controls' stories, deferred until after Part B lands.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
