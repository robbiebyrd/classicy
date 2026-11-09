---
id: 0163-l8n
title: Overlay, reducer, control panel and Control Strip follow the active package
purpose: Plan 0016-vbq section 1.3.
type: feat
status: pending
priority: "2"
effort: M
created: "2026-11-09T19:24:40.835Z"
updated: "2026-11-09T19:24:40.835Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
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
---

# Overlay, reducer, control panel and Control Strip follow the active package

## Problem Statement

Plan 0016-vbq §1.3 (Overlay, reducer, control panel and Control Strip follow the active package). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {"consumes": "1.2's `listClassicyScreenSaversFor`, `resolveClassicyScreenSaverFor`, `activeClassicyScreenSaverPackageId`.", "produces": "`SCREEN_SAVER_DEFAULT_SAVER_ID` removed. The overlay draws `resolveClassicyScreenSaverFor(activeId, data.selectedSaver)`. `ClassicyAppScreenSaverActivate` (and the idle timer) does nothing when that resolves to undefined. `SetSaver`/`SetConfig` accept any registered id (offered or not) and still refuse unregistered ids. The control panel lists `listClassicyScreenSaversFor(activeId)`, shows the resolved saver as selected, and with none offered shows a short message in place of the list (e.g. \"This appearance has no screen savers.\") with Sleep Now disabled; the Control Strip module's activate item is disabled likewise."}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the failing tests

Using fake savers (not the built-ins): `the overlay draws the active package's default when the stored choice belongs to another package`; `the stored selectedSaver is unchanged after a package switch and back`; `idle and Activate never show the overlay when no saver is offered`; `SetSaver stores a registered saver another package offers`; `the control panel lists only offered savers and shows the empty message with none`; `the Control Strip's activate item is disabled with none offered`. Existing tests that relied on the built-ins switch to fakes registered in the test.

### 2: Confirm they fail

Command: `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels/ScreenSaverManager`

### 3: Implement; remove SCREEN_SAVER_DEFAULT_SAVER_ID and its readers

Implement; remove SCREEN_SAVER_DEFAULT_SAVER_ID and its readers

### 4: Confirm they pass

Command: `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/ControlStrip`

### 5: Commit

Command: `git commit -m "feat(screen-saver): overlay and control panel offer the active package's savers"`

## Acceptance Criteria

- [ ] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.tsx` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext.tsx` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule.ts` - modify
- `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.tsx` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.test.tsx` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext.test.tsx` - modify
- `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.test.tsx` - modify

## Work Log
