# Non-Utility Window Focus Succession

**Date:** 2026-07-23
**Components:** `ClassicyAppHelpers`, `ClassicyDesktopWindowManagerContext`, `ClassicyWindow`, store window model
**Status:** Approved — ready for implementation plan

## Summary

Make focus succession skip Utility (tool-palette) windows. When a document
window closes, an app quits, or an app becomes focused without a focused
window, the framework should land focus on a **non-Utility** window. Utility
windows float and never become the "active document window" (Mac OS 8
palette behavior).

Three behaviors, from the request:

1. **Window closes** — when a window closes in an app, focus the next
   available open window that is **not** a Utility window.
2. **App quits** — when an app quits, focus the most-previously-selected app,
   and within it the appropriate non-Utility window.
3. **App focused, no focused window** — if an app is focused but has no
   focused window, select its most-recently-accessed **non-Utility** window.

## Background — what already exists

The succession machinery is largely built; it is simply blind to window type:

- `ClassicyWindowClose` (`ClassicyDesktopWindowManagerContext.tsx:192-213`)
  already promotes a sibling window (highest `zOrder`) when the closing
  window's app holds focus — but does not exclude Utility windows.
- `ClassicyAppClose` (`ClassicyAppManager.ts:225-249`) already hands off to
  the most-recently-focused successor app via `pickSuccessorApp`
  (`ClassicyAppHelpers.ts:93-109`, recency by `lastFocusedAt`) and calls
  `focusApp` on it.
- `focusApp` (`ClassicyAppHelpers.ts:67-82`) already restores a window via
  `pickWindowToRestore` (`ClassicyAppHelpers.ts:51-65`), which implements
  "most recently accessed": `lastAccessedWindowId` → highest `zOrder` →
  `default` → last. It does not exclude Utility windows. When no window is
  restorable it already falls back to "app focused, no focused window".

**The gap:** the persisted window record
(`ClassicyStoreSystemAppWindow`, `ClassicyAppManager.ts:79-99`) has **no
`windowType` field**. The reducer that picks successors cannot tell a Utility
window from a document window. Everything else is a one-line filter away.

## Requirements

- R1 — On window close, focus the next open **non-Utility** window in that app
  (only when the app holds focus, matching the existing guard).
- R2 — On app quit, focus the most-recently-selected other app (existing
  `pickSuccessorApp` behavior) and, within it, a **non-Utility** window.
- R3 — When an app is focused with no focused window, select its
  most-recently-accessed **non-Utility** window.
- R4 — **Fallback (approved):** when the only remaining open windows in the
  relevant app are Utility windows, the app stays focused and owns the menu
  bar, but **no window** receives focus. Utility windows keep their
  always-active chrome (they never dim). No Utility window is ever focused by
  a succession event.
- R5 — Backward compatible: window records without a `windowType` (legacy /
  persisted, or plain document windows) are treated as `"document"` and are
  eligible for focus exactly as today.

## Design

### 1. Persist `windowType` in the store window record

Add the field to the window model:

```ts
// ClassicyAppManager.ts, interface ClassicyStoreSystemAppWindow
windowType?: "document" | "utility";
```

`ClassicyWindow` already receives `windowType` as a prop (default
`"document"`). Include it in the `ClassicyWindowOpen` action payload so the
reducer can persist it:

- In `ClassicyWindow.tsx` (the `ClassicyWindowOpen` dispatch, ~line 355),
  carry `windowType` on the dispatched window object.
- In the `ClassicyWindowOpen` reducer
  (`ClassicyDesktopWindowManagerContext.tsx:136-173`), write `windowType`
  onto the new window record in the `window < 0` (genuinely new) branch.
  windowType is static per window, so it need only be set at creation; a
  re-registering persisted window already carries it.

Absent `windowType` ⇒ treated as `"document"` (R5). Only Utility windows
carry the non-default value.

### 2. Shared exclusion rule

The rule is simply `w.windowType !== "utility"`. It is applied at the two
succession pick-sites:

**Site A — window close (R1).** In `ClassicyWindowClose`
(`ClassicyDesktopWindowManagerContext.tsx:203-211`), extend the
sibling-candidate filter:

```ts
const openWindows = ds.System.Manager.Applications.apps[action.app.id]
  ?.windows.filter(
    (w) => !w.closed && w.id !== action.window.id && w.windowType !== "utility",
  );
if (openWindows?.length) {
  const nextFocus = openWindows.reduce((best, w) =>
    (w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
  );
  ds = focusWindow(ds, action.app.id, nextFocus.id);
}
// else: no non-Utility sibling → app stays focused, no window focused (R4)
```

The existing outer guard (only promote when
`focusedAppId === action.app.id`) is unchanged: closing a background app's
window must not steal global focus.

**Site B — `pickWindowToRestore` (R2, R3).** Restrict every candidate stage
to non-Utility windows:

```ts
function pickWindowToRestore(app: ClassicyStoreSystemApp) {
  const candidates = app.windows.filter(
    (w) => !w.closed && w.windowType !== "utility",
  );
  if (candidates.length === 0) return undefined;
  const lastAccessed = candidates.find((w) => w.id === app.lastAccessedWindowId);
  if (lastAccessed) return lastAccessed; // only returns if it is non-Utility
  const withZOrder = candidates.filter((w) => w.zOrder !== undefined);
  if (withZOrder.length > 0) {
    return withZOrder.reduce((best, w) =>
      (w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
    );
  }
  return candidates.find((w) => w.default) ?? candidates[candidates.length - 1];
}
```

Because `candidates` is pre-filtered, a `lastAccessedWindowId` pointing at a
Utility window no longer matches, and the pick falls through to the most
recent non-Utility window by `zOrder` (R3). When no non-Utility window
remains, it returns `undefined`, and `focusApp`'s existing else-branch keeps
the app focused with no focused window (R4) — **no new fallback code**.

`focusApp` backs both R2 (app-quit succession, via
`ClassicyAppClose → pickSuccessorApp → focusApp`) and R3 (`ClassicyAppFocus`
/ `ClassicyAppActivate → focusApp`), so both are covered by this single
change.

## Testing

Reducer-level tests (dispatch events against the store; no rendering). Window
records set `windowType` directly.

- Closing the focused document window promotes the next non-Utility sibling,
  **skipping** an open Utility window with a higher `zOrder`.
- Closing the last document window while a Utility window remains open ⇒ the
  app stays `focused`, `focusedAppId` unchanged, and **no** window has
  `focused: true`.
- App quit ⇒ the most-recently-focused successor app (`pickSuccessorApp`)
  becomes focused and its most-recent **non-Utility** window is focused.
- `focusApp` on an app whose `lastAccessedWindowId` is a Utility window
  selects the most-recent **non-Utility** window instead.
- Regression: an app with only document windows behaves exactly as before
  (window close promotes the highest-`zOrder` sibling; `focusApp` restores
  `lastAccessedWindowId`).
- Persistence/threading: a window opened with `windowType: "utility"` lands
  in the store record with `windowType === "utility"`.

## Out of scope (YAGNI)

- No change to **manual** Utility-window focus — clicking a palette still
  focuses it (dispatches `ClassicyWindowFocus`) exactly as today. This
  feature governs only automatic succession events.
- No change to how `lastFocusedAt` / `lastAccessedWindowId` are written.
- No cross-app Utility handling, palette docking, or z-order layering changes.

## Acceptance criteria

- Closing a document window in a focused app moves focus to the next open
  non-Utility window; open Utility windows are never chosen.
- Quitting an app focuses the most-recently-selected other app and a
  non-Utility window within it.
- Focusing an app with no focused window selects its most-recently-accessed
  non-Utility window.
- When only Utility windows remain, the app is focused with no focused window.
- Apps with only document windows are behaviorally unchanged; all existing
  tests pass.
