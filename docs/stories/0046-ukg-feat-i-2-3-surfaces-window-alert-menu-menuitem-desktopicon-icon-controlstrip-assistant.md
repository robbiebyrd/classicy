---
id: 0046-ukg
title: 'I 2.3: Surfaces: Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant'
purpose: Wire useClassicyAppearance into the window, alert, menu, icon, control strip and assistant roots so a package can decorate them and receive focus, collapse, expand, zoom, close, drag, press, release, open, select and change events.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:18:19.144Z"
updated: "2026-10-29T21:06:06.605Z"
started: "2026-10-29T19:28:41.968Z"
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
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.appearance.test.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.appearance.test.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.appearance.test.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.appearance.test.tsx
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.appearance.test.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.appearance.test.tsx
      - src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.appearance.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0045-1c6", "depends"]
  plans:
    - ["0006-dy6", "included", ["2.3"]]
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

# I 2.3: Surfaces: Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip, Assistant

## Problem Statement

Audit §9 Phase 7 item 1 / §8.5 (umbrella 0002-ldj): the surfaces whose Platinum feedback moves in 3.2 (window sounds, menu-item flash) must emit the events first. Per component (root → states → events): Window (ClassicyWindow.tsx:1620-1660 `<div class=classicyWindow>`, windowRef) → { active: modal || isActive(), inactive: !(modal || isActive()), focused: ws.focused, collapsed: ws.collapsed, dragging: ws.moving, error: modal && type === "error" } → focus inside the `!ws.focused` branch of setActive (:1203-1217); collapse/expand in setCollapse (:1278-1298) and once in collapseOrExpandAll (:1245, the clicked window only); zoom in setZoomFlag when playSound is true (:1404-1415, detail { zoomed: toZoom }); close in finishClose (:1529); dragStart where ClassicyWindowMoveIdle plays (:1084); change with detail { kind: "move" } where ClassicyWindowMoveMoving plays (:1108) and { kind: "resize" } in the resize branch; dragEnd where ClassicyWindowMoveStop is interrupted (:984 document mouseup and :1135 stopChangeWindow — once per gesture, guarded by the existing refs). Alert (:264-271 `<div class=classicyAlert>`, contentRef) → { error: type === "error" } → open on mount (via the hook's mount), close in the button path that calls onClose (:165). Menu (:157 `<ul class=<navClass>>`; add listRef) → { open: menuBarActive } → open/close when the menu's open child changes. MenuItem (ClassicyMenuItemComponent :177-183, `<li class=classicyMenuItem>` :371-379, itemRef) → { disabled: menuItem.disabled, open: isOpen, pressed: isFlashing } → press in handleClick's leaf branch (:310-320, where the flash starts), release in finishFlash (:270-285), open in the submenu-open branch (:304-309), focus on onFocus/onMouseOver (:355-365), blur on onBlur/onMouseOut (:366-370). DesktopIcon (ClassicyDesktopIcon.tsx:442-449, iconRef :198) → { selected: active, open, dragging } → select when ClassicyDesktopIconFocus is dispatched (:227/:316), open in launchIcon (:421), dragStart in startDrag when dragging starts (:329), dragEnd in stopChangeIcon (:301). Icon (ClassicyIcon.tsx:274-278, iconRef :156) → { selected: active, dragging } → select in toggleFocus (:296), open in doDoubleClick (:306), dragStart/dragEnd as DesktopIcon. ControlStrip (:505-512, stripRef :269) → { collapsed } → collapse/expand in setCollapsed (:243), dragStart/dragEnd around the tab/collapse-box drags (:334-375). Assistant (root `.classicyAssistant`; add rootRef) → {} → change in changePage (:146-152, detail { page: next }). ClassicyMenu.tsx keeps `isFlashing` as the pending-action flag and keeps adding `classicyMenuItemFlash` for now; sound dispatches stay until 3.1/3.2.

**Impact:** 3.2 removes the window and menu sound dispatches and the flash class from component code; without these emits the Platinum handlers would never fire and the feedback would vanish.

## Steps

### 1: Write the failing surface appearance tests

Window (titlebar harness of ClassicyWindow.titlebar.test.tsx; a window record focused: false): root has probe-Window and "inactive"; click → focus; collapse-box click → collapse; expand → expand; zoom-box click → zoom { zoomed: true }; close-box click → close; title-bar mousedown + 10 px mousemove + mouseup → [dragStart, change { kind: "move" }…, dragEnd] with exactly one dragEnd. Alert: probe-Alert + "error" for type error; mount → open; default button click → close. Menu (setup of ClassicyMenu.test.tsx): `li.classicyMenuItem` has probe-MenuItem; click a leaf → press, then (waitFor) release exactly once; mouseOver/mouseOut → focus, blur; a submenu parent click → open. DesktopIcon: probe-DesktopIcon; mousedown → select; double-click → open. Icon: mousedown → select; double-click → open. ControlStrip: tab click → collapse; again → expand. Assistant: Next click → change { page: 1 }.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} -t appearance` — Expected: FAIL.

### 3: Wire the seven files

Per the component table in the problem statement. In ClassicyMenu.tsx keep `isFlashing` as the pending-action flag and keep adding the `classicyMenuItemFlash` class for now (3.2 moves it); the existing sound dispatches stay until 3.1/3.2.

### 4: Run the surfaces' tests and the full suite

`pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} && pnpm test` — Expected: PASS (every pre-existing Window/Menu test unchanged).

### 5: Parity for the surfaces' stories

Re-shoot desktop-window*, desktop-desktop*, desktop-desktopicon*, desktop-menu*, desktop-menubar*, desktop-controlstrip*, dialogs-alert*, dialogs-assistant*, controls-icon* into `.playwright-mcp/parity/part-i/after/` → `compare -metric AE` 0 each.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): wire useClassicyAppearance into windows, alerts, menus, icons, the control strip and the assistant"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/{Window,Alert,Menu,Desktop,Icon,ControlStrip,Assistant} -t appearance
- [ ] Window, Alert, Menu, MenuItem, DesktopIcon, Icon, ControlStrip and Assistant roots carry the probe decoration and the listed state classes and emit the listed events (one dragEnd per window gesture, one release per menu flash); every pre-existing Window and Menu test still passes.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - hook; focus/collapse/expand/zoom/close/dragStart/change/dragEnd
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` - hook; open/close
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` - hook on Menu and MenuItem; press/release/open/focus/blur
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx` - hook; select/open/dragStart/dragEnd
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.tsx` - hook; select/open/dragStart/dragEnd
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` - hook; collapse/expand/dragStart/dragEnd
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx` - hook; change
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.appearance.test.tsx` - create

## Work Log

### 2026-10-29T19:28:43.701Z - Started beside Part B (TSX only; B's remaining work is SCSS, Platinum/** and docs). Base 81ad67308; implementer dispatched. Binding: I-R4 strict, I-R5 attrs first, I-R13, I-R14/I-R15 (input on dual-path gestures, listeners only for the duration of a gesture). Window geometry and zIndex stay state-owned. Edits stay tight to the roots so G (ClassicyWindow menu-bar height) and E (ControlStrip art, title bar) rebase cleanly. Parity deferred until after B lands.

### 2026-10-29T20:17:08.194Z - Implementer DONE_WITH_CONCERNS at 848cdde6e: 54 new tests (41 RED to GREEN), 5 Passthrough rows plus a test that package style never moves or restacks windows or icons; the DOM dump with no package is unchanged. Concerns for 3.2: window resizes emit dragStart and change { kind: "resize" }; zoom { zoomed: false } also fires on collapse and resize start, where today's zoom sound plays; MenuItem focus fires on every mouseover; Finder outline drags emit no events. Controller re-ran lint, tsc and 104 files/1255 tests green; pushed. Reviewer dispatched with the concerns as focus; rulings follow the review.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-29T21:06:06.605Z - Implementer DONE_WITH_CONCERNS at 848cdde6e. Review: Needs fixes, with one Important finding. A submenu leaf's flash bubbles animationend to every ancestor <li>, which emits a spurious release with no press. The new test missed it because jsdom never delivers fireEvent.animationEnd to React. Fix round 1 dispatched: own-target guard (I-R7), two tests using a real bubbling webkitAnimationEnd, plus the MenuItem focus/blur ancestor-echo minor.
