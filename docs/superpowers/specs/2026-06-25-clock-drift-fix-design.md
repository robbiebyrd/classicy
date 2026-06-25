# Clock Drift Fix — Design Spec

**Date:** 2026-06-25
**Status:** Approved

## Problem

The virtual clock uses `setInterval(1000)` and accumulates `prevTime + 1000ms` on each
tick. JavaScript's `setInterval` guarantees a *minimum* delay, not an exact one — ticks
can be late due to main-thread pressure, garbage collection, or browser tab throttling.
Each late tick is never recovered, so the virtual clock runs perpetually behind real time.
Because the MenuBar widget writes the drifted time back to the Zustand store on minute
boundaries, the drift is propagated to every consumer of `useClassicyDateTime`.

## Solution — Wall-Clock Anchoring

Replace the accumulator pattern with a formula anchored to real wall-clock time:

```
virtualNow = virtualAnchorMs + (Date.now() - realAnchorMs)
```

Two refs live inside the hook (not in the store — ephemeral runtime state only):

- `virtualAnchorMs` — the virtual epoch-ms at which the anchor was last set
- `realAnchorMs` — `Date.now()` at that exact same moment

No matter how late the interval fires or how long the tab was backgrounded, the formula
always yields the mathematically correct virtual time.

## Anchor Lifecycle

| Event | `virtualAnchorMs` | `realAnchorMs` |
|---|---|---|
| Store `dateTime` changes (init, user set) | `new Date(dateTime).getTime()` | `Date.now()` |
| Normal tick | unchanged | unchanged |
| Pause | snapshot: `virtualAnchorMs + (Date.now() - realAnchorMs)` | `Date.now()` |
| Resume | unchanged (stays at paused moment) | `Date.now()` |

**Pause:** both anchors are snapped to the current virtual moment, freezing it.

**Resume:** only `realAnchorMs` is reset to `Date.now()`. `virtualAnchorMs` remains the
paused moment, so the formula yields exactly that moment on the first post-resume tick,
then advances from there. No jump, no catch-up — clock resumes from the exact instant
it was paused.

## Tick Interval

The interval changes from 1000 ms to **250 ms**. Because the callback only evaluates
the formula (no accumulation), the extra calls are cheap. The benefit: second boundaries
are detected within ≤250 ms of occurring rather than potentially a full second late.
React state only updates when the displayed second actually changes, so render frequency
is unchanged.

## Files Changed

| File | Change |
|---|---|
| `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils.tsx` | Replace `setInterval(1000)` accumulator with 250 ms anchor formula; add `useEffect` for pause/resume anchor management |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx` | Same anchor pattern for its own independent interval |

## Store / API Changes

**Store:** None. `virtualAnchorMs` and `realAnchorMs` never enter the Zustand store or
localStorage — they are purely ephemeral `useRef` values inside the hook.

**Public API:** None changed. `useClassicyDateTime`, `localDate`, `localHMS`, `pause`,
`resume`, `paused` — identical signatures and semantics.

## Testing

Add to `ClassicyDateTimeManagerEventHandler.test.ts`:

1. **No drift under delayed ticks** — mock `Date.now()` advancing by irregular amounts
   (e.g. 1000, 1050, 980, 1100 ms intervals); verify final virtual time equals
   `startTime + totalRealElapsed` within ≤1 ms.

2. **Pause freezes time** — advance real time while paused; verify virtual time does not
   move.

3. **Resume from exact pause point** — pause at virtual time T, advance real time by
   arbitrary amount, resume; verify first post-resume virtual time equals T (±1 ms), then
   advances correctly from T.

## Out of Scope

- Variable playback speed (groundwork is trivially added later — multiply elapsed by a
  speed factor before adding to `virtualAnchorMs`)
- Refactoring the MenuBar widget to consume `useClassicyDateTime` (separate concern)
