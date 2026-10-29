---
id: 0045-1c6
title: 'I 2.2: Controls group 2: Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput'
purpose: Wire useClassicyAppearance into the second group of control roots so a package can decorate them and receive their drag, press, select, change, expand, collapse and click events.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:17:37.615Z"
updated: "2026-10-29T20:22:00.352Z"
started: "2026-10-29T18:25:53.340Z"
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
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.tsx
      - src/SystemFolder/SystemResources/Link/ClassicyLink.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.appearance.test.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.appearance.test.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.appearance.test.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.appearance.test.tsx
      - src/SystemFolder/SystemResources/Tree/ClassicyTree.appearance.test.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.appearance.test.tsx
      - src/SystemFolder/SystemResources/Link/ClassicyLink.appearance.test.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.appearance.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0044-uvc", "depends"]
  plans:
    - ["0006-dy6", "included", ["2.2"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: pending
  "6":
    status: complete
---

# I 2.2: Controls group 2: Slider, Placard, Tabs, Disclosure, Tree, Table, Link, FileInput

## Problem Statement

Audit §9 Phase 7 item 1 / §8.5 (umbrella 0002-ldj), second control group, same wiring pattern and test shape as 2.1. Per component (root → states → events): Slider (ClassicySlider.tsx:281-293 `<input class=classicySlider>`, inputRef :208) → { disabled, dragging, hover: highlighted } → dragStart when `dragging` becomes true, dragEnd at :249, change in handleChange (detail { value }). Placard (:101-104 commonProps root `.classicyPlacard`; add rootRef on the button/div that carries commonProps) → { pressed, disabled, open } → press/release at :133-145, click in handleClick, open/close around setOpen (detail { menu: hasMenu }). Tabs (:307 `<div class=classicyTabContainer>`; add rootRef) → {} → press in pressTab (:145, detail { tabId }), select in selectTab (:139, detail { tabId }), change in stepScroll (:219, detail { scroll: direction }). Disclosure (:104 `<div class=classicyDisclosure>`; add rootRef) → { expanded: open } → expand/collapse in setOpenState. Tree (:525 `<ul class=classicyTree>`; add rootRef) → {} → select in the onSelectNode path (detail { nodeId }), expand/collapse in toggle (:162, detail { nodeId, open }). Table (:448 `<div class=classicyTableContainer>`; add rootRef) → {} → select on row click (detail { rowId }), change on header sort click (:489-491, detail { columnId, desc }). Link (`<a class=classicyLink>`; add ref) → { disabled } → click. FileInput (root `.classicyFileInput`; add rootRef) → { error: hasError, disabled } → change (detail { fileName }). Sound dispatches stay until 3.1.

**Impact:** 3.1 moves the Placard and Tabs click sounds into Platinum hooks through these emits; without them the sounds would be lost when the component dispatches are removed.

## Steps

### 1: Write the failing component appearance tests

Same two/three tests per component as 2.1 (`carries the probe decoration and state classes`, `emits its events`, `adds nothing when the package returns nothing`) with these exact expectations: Slider (disabled) → "disabled"; fireEvent.change to 40 → change { value: 40 }. Placard (interactive) → mouseDown/mouseUp → [press, release]; with menu, click → open. Tabs → mouseDown on tab 2 → press { tabId: 1 }; click → select { tabId: 1 }. Disclosure (open) → "expanded"; click header → collapse; click again → expand. Tree → click a branch row → expand { nodeId, open: true }. Table (sortable column) → click header → change { columnId, desc: false }. Link (disabled) → "disabled"; click (enabled) → click. FileInput → "error" when rendered with an error, change { fileName: "a.txt" } on a file selection.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} -t appearance` — Expected: FAIL.

### 3: Wire the eight components

Per the component table in the problem statement; sound dispatches stay until 3.1.

### 4: Run the group's tests and the full suite

`pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} && pnpm test` — Expected: PASS.

### 5: Parity for the group's stories

Re-shoot controls-slider*, controls-placard*, controls-tabs*, controls-disclosure*, controls-tree*, controls-table*, controls-link*, controls-fileinput* into `.playwright-mcp/parity/part-i/after/` → `compare -metric AE` 0 each.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): wire useClassicyAppearance into sliders, placards, tabs, disclosures, trees, tables, links and file inputs"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/{Slider,Placard,Tabs,Disclosure,Tree,Table,Link,FileInput} -t appearance
- [ ] The eight roots carry the probe decoration and the listed state classes, emit the listed events with their detail payloads, and add no DOM attribute or inline style when the package returns nothing.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx` - hook; dragStart/dragEnd/change
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx` - hook; press/release/click/open/close
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx` - hook; press/select/change
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx` - hook; expand/collapse
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.tsx` - hook; select/expand/collapse
- `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx` - hook; select/change
- `src/SystemFolder/SystemResources/Link/ClassicyLink.tsx` - hook; click
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx` - hook; change
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Tree/ClassicyTree.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Table/ClassicyTable.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/Link/ClassicyLink.appearance.test.tsx` - create
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.appearance.test.tsx` - create

## Work Log

### 2026-10-29T18:25:47.482Z - Started beside Part B (I reconciliation: 2.x code is safe early; B's remaining work is SCSS-only). I-R4 strict (no class-list change), I-R5 attrs first, keyboard paths must emit what mouse paths emit (lesson from I 2.1's review), reuse the shared internal useClassicyMergedRef. Out of chain order: depends 0044-uvc (I 2.1) is code complete, awaiting only post-B parity. Base 3c2dc4e76; implementer dispatched. Parity deferred until after B lands.

### 2026-10-29T19:28:16.540Z - Code complete on feat/appearance-part-i at 81ad67308 (bf9a71527 wiring, 06fe74709 I-R14 input source, 81ad67308 review round I-R15). Review approved. Controller re-ran lint/tsc and 31 files/475 tests green; pushed. Stays in_progress for the Storybook parity, deferred until after Part B lands.

### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
