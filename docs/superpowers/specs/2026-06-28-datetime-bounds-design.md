# DateTime Boundary Settings — Design Spec

**Date:** 2026-06-28
**Status:** Approved

## Overview

Add `minDateTime` and `maxDateTime` developer-only bounds to the Classicy date/time system. When the clock reaches `maxDateTime` it enters a locked state and stops advancing. If the stored time is ever below `minDateTime`, it immediately resets to `minDateTime`. Both pickers in the DateAndTimeManager UI enforce these bounds so the user cannot select out-of-range values.

## State Shape

Two nullable ISO strings and a derived boolean are added to `ClassicyStoreSystemDateAndTimeManager`:

```typescript
minDateTime: string | null;  // null = no lower bound
maxDateTime: string | null;  // null = no upper bound
boundaryLocked: boolean;     // true when clock is pinned at maxDateTime
```

`boundaryLocked` is orthogonal to the existing `paused` flag — both can be true simultaneously. When `boundaryLocked` is cleared (because the time is set back into range), the clock only resumes ticking if `paused` is also false.

Default values (passed via `defaultState`):

```typescript
DateAndTime: {
  // ...existing fields unchanged...
  minDateTime: null,
  maxDateTime: null,
  boundaryLocked: false,
}
```

## Enforcement Logic

Boundary enforcement has three sites:

### 1. Event handler (`ClassicyDateAndTimeEventHandler.ts`)

`ClassicyManagerDateTimeSet` checks the incoming value against both bounds before writing to state:

- `value < minDateTime` → clamp to `minDateTime`, clear `boundaryLocked`
- `value >= maxDateTime` → clamp to `maxDateTime`, set `boundaryLocked: true`
- Otherwise → write value, clear `boundaryLocked`

`ClassicyManagerDateTimeResume` is a no-op while `boundaryLocked` is `true`.

### 2. `useClassicyDateTime` hook tick

On every tick interval, before advancing `localDate`:

- If `paused` or `boundaryLocked` → don't advance
- If stored time is below `minDateTime` → dispatch `ClassicyManagerDateTimeSet` with `minDateTime` (handles out-of-range initial state)
- If next tick would meet or exceed `maxDateTime` → dispatch `ClassicyManagerDateTimeSet` with `maxDateTime` (triggers handler to lock)

### 3. DateAndTimeManager wiring (safety net)

The existing `updateSystemDate` / `updateSystemTime` handlers route through `ClassicyManagerDateTimeSet`, so store enforcement catches anything the picker clamping misses.

## Picker Enforcement

`ClassicyDateAndTimeManager.tsx` reads `minDateTime` and `maxDateTime` from the Zustand store, converts them to `Date | undefined`, and passes them to both pickers.

**New props added to `ClassicyDatePickerProps` and `ClassicyTimePickerProps`:**

```typescript
minValue?: Date;
maxValue?: Date;
```

**DatePicker:** `handleDatePartChange` and `incrementDatePartChange` clamp the assembled `Date` against `minValue`/`maxValue` before calling `onChangeFunc`. Arrow key increments stop at the bound rather than wrapping.

**TimePicker:** Same pattern. Since the picker works on time-of-day, the full datetime is assembled from the `prefillValue` date portion plus the picker's time portion, then clamped against `minValue`/`maxValue`.

## Locked State Semantics

| `paused` | `boundaryLocked` | Clock advances? | Resume works? |
|----------|-----------------|-----------------|---------------|
| false    | false           | yes             | n/a           |
| true     | false           | no              | yes           |
| false    | true            | no              | no            |
| true     | true            | no              | no            |

`boundaryLocked` is cleared only by `ClassicyManagerDateTimeSet` dispatching a value strictly within `[minDateTime, maxDateTime)`.

## Files to Change

| File | Change |
|------|--------|
| `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` | Add `minDateTime`, `maxDateTime`, `boundaryLocked` to interface and default state |
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeEventHandler.ts` | Enforce bounds in `ClassicyManagerDateTimeSet`; gate `ClassicyManagerDateTimeResume` |
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx` | Extend `useClassicyDateTime` hook tick to check bounds and dispatch corrections |
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx` | Read bounds from store, pass as `minValue`/`maxValue` to pickers |
| `src/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.tsx` | Add `minValue`/`maxValue` props; clamp in change handlers |
| `src/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.tsx` | Add `minValue`/`maxValue` props; clamp in change handlers |
