# Date & Time Manager — Sync Button

Date: 2026-07-25
Status: Approved

## Summary

Add a **Sync** button to the Date and Time Manager control panel that sets the
Classicy clock from the host machine's real clock. Host apps may opt into a
*time-only* mode that preserves the displayed calendar date and syncs only the
time of day.

## Motivation

Classicy's clock is virtual: `System.Manager.DateAndTime.dateTime` holds a UTC
ISO string that advances on its own anchors, and host apps may seed it with an
arbitrary instant or clamp it with `minDateTime`/`maxDateTime`. Once it drifts
from — or was never aligned with — real time, the only way back is to retype the
date and time by hand.

Time-only mode serves apps that deliberately pin a fictional date (a period-piece
desktop set in 1997, a demo frozen on a fixed day) but still want the menu-bar
clock to read as the user's real time of day.

## Behavior

Sync adopts the true current instant **and** resets the timezone popup to the
browser's offset. Choosing a timezone and then syncing therefore returns the
panel to the machine's own timezone; the synced hour always reads as real local
time.

In time-only mode the calendar date currently shown in the panel is preserved
exactly, and only hours, minutes, and seconds come from the machine. The
timezone still resets to the browser's offset, so the hour reads as real local
time on the preserved date.

Sync is disabled whenever `dateTimeLocked` is true, greying out in step with the
date and time pickers. When `minDateTime`/`maxDateTime` are set, the synced
value is clamped by the reducer's existing bounds logic exactly as a manual set
would be.

`paused` is deliberately untouched. A host that paused the clock keeps it
paused, now frozen at real time.

## Store & host API

One new field on `ClassicyStoreSystemDateAndTimeManager`
(`src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`):

```ts
/** When true, Sync replaces only the time-of-day and preserves the
 *  displayed calendar date. Set by the host app. Default false. */
syncTimeOnly: boolean;
```

Defaulted to `false` in `DefaultAppManagerState`. Host apps set it through the
existing `defaultState` channel:

```tsx
<ClassicyAppManagerProvider
  defaultState={{ System: { Manager: { DateAndTime: { syncTimeOnly: true } } } }}
>
```

`ClassicyControlPanels` mounts `<ClassicyDateAndTimeManager />` with no props, so
store-seeded configuration is the only channel available. This matches how
`dateTimeLocked`, `minDateTime`, and `maxDateTime` are already configured.

## Reducer — `ClassicyManagerDateTimeSync`

Added to `ClassicyDateAndTimeEventHandler.ts`. The action carries no payload; the
reducer reads `new Date()` internally, which stays deterministic under
`vi.setSystemTime()`.

A single algorithm serves both modes:

1. `newTz = -now.getTimezoneOffset() / 60` — the browser's offset in hours.
2. `nowLocal = now + newTz · 3600000`; take **H:M:S** from it using UTC getters.
   This is the machine's wall-clock time of day.
3. Take **Y/M/D** from `nowLocal` in full mode. In `syncTimeOnly` mode take them
   from the currently displayed date, `stored.dateTime + oldTz · 3600000`, so a
   fictional date survives the sync.
4. Recombine: `Date.UTC(Y, M, D, H, Mi, S)`, then subtract `newTz · 3600000` to
   get the UTC instant to store.
5. Write `timeZoneOffset = String(newTz)` and pass the instant through the
   extracted `applyDateTimeWithBounds()` helper.

Because the reducer runs inside Zustand's `set()`, both fields land in one state
write and subscribers never observe a half-synced state where the instant has
moved but the offset has not.

The min/max clamp and `boundaryLocked` update currently inline in the
`ClassicyManagerDateTimeSet` case are extracted into a small
`applyDateTimeWithBounds(ds, date)` helper in the same file, so Sync inherits
clamping rather than duplicating it. `ClassicyManagerDateTimeSet` is refactored
to call the helper; its behavior is unchanged.

## UI

`ClassicyDateAndTimeManager.tsx` gains a bottom flex row holding Sync on the left
and the existing Quit button on the right:

```
+-- Date and Time Manager -----+
| [Current Date] [Current Time]|
|  7/25/2026      10:42:05 AM  |
| [Timezone]                   |
|  America/New_York          v |
| [Time Format]                |
|  (o) 12-Hour  ( ) Military   |
|                              |
|  ( Sync )          ( Quit )  |
+------------------------------+
```

A new `.classicyDateAndTimeManagerButtonRow` rule in the co-located SCSS supplies
`display: flex; justify-content: space-between`. The window stays 350×265 — the
row replaces the standalone Quit button rather than adding height. Sync takes
`disabled={dateAndTimeState.dateTimeLocked}`; its handler, `syncClock`, dispatches
`{ type: "ClassicyManagerDateTimeSync" }` and also increments a `syncGeneration`
counter held in component state.

`syncGeneration` is passed as `key` to both `ClassicyDatePicker` and
`ClassicyTimePicker`, forcing them to remount on Sync. Both pickers seed their
internal `useState` from `prefillValue` only on mount and ignore later prop
changes, so without the remount the panel's own Current Date / Current Time
fields would keep showing stale values after a Sync. The counter is bumped only
inside `syncClock`, not on every store update — keying on `dateTime` instead
would remount the pickers on each minute tick and destroy a user's half-typed
entry.

## Testing

Reducer tests in `ClassicyDateTimeManagerEventHandler.test.ts`, using
`vi.useFakeTimers()` with `vi.setSystemTime()`:

- Full sync sets `dateTime` to the current instant and `timeZoneOffset` to the
  browser's offset.
- Time-only sync preserves the displayed calendar date and replaces H:M:S.
- Time-only sync preserves the date as computed in the *old* timezone, not the
  new one.
- Sync clamps to `maxDateTime` and sets `boundaryLocked`.
- Sync clamps to `minDateTime`.

Component tests in `ClassicyDateAndTimeManager.test.tsx`:

- The Sync button renders and dispatches `ClassicyManagerDateTimeSync`.
- The Sync button is disabled when `dateTimeLocked` is true.

The local `makeStore()` factory in the reducer test file needs `syncTimeOnly`
added to satisfy the widened interface.

## Out of scope

- Network time (NTP/HTTP) sync. "Sync" here means the host machine's clock only.
- Automatic or periodic re-syncing. The button is a manual, one-shot action.
- Balloon help on the Sync button.
