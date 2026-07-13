# Window/App Focus Coordination — Design

**Date:** 2026-07-13
**Status:** Approved

## Problem

Focus state in Classicy can drift into invalid configurations:

- `ClassicyWindowFocus` (dispatched on window mousedown) focuses the clicked app
  and window but never de-focuses other apps or their windows, and never updates
  `focusedAppId`. Cleanup relies on a follow-up `ClassicyAppActivate` fired from a
  `click` handler on the app wrapper div — which never fires on drags
  (mousedown → move → mouseup elsewhere). Result: two apps and two windows can be
  `focused: true` simultaneously.
- `deFocusApps` only clears the app pointed to by `focusedAppId`, so once that
  pointer is stale, stale focus flags are never swept.
- The app-switcher menu (`ClassicyAppFocus` → `focusApp`) restores the app's
  `default` window or the last window in array order — not the most recently
  accessed window — and force-reopens closed windows.

## Requirements

1. Selecting (mousedown on) a window marks its application active, in a single
   self-sufficient action.
2. **Global invariant:** at most one window is focused across the entire store,
   and exactly one app is focused (the one owning that window, or an app with no
   focused window when all its windows are closed).
3. Clicking an app in the app-switcher menu activates that app and focuses its
   **last-accessed** window. All of the app's windows come forward as a group
   (already delivered by the CSS tiers: active window `z-index: 300`, active
   app's windows `150`, others unset — no stacking code needed).
4. If the last-accessed window is collapsed, it becomes active but **stays
   collapsed**.
5. If all of an app's windows are closed, the app becomes active (menu bar,
   switcher state) with **no focused window**; closed windows are never reopened
   by focus/activation.
6. Behavior applies transparently to every `ClassicyApp` — no new event types,
   no per-app changes.

## State model

- `ClassicyStoreSystemApp` gains `lastAccessedWindowId?: string`, updated every
  time one of the app's windows is focused. Optional field: previously persisted
  localStorage state loads unchanged and falls back per the restoration chain.
- `zOrder` (already stamped `Date.now()` on focus) remains the secondary
  recency signal.

## Canonical helpers (`ClassicyAppHelpers.ts`)

- **`deFocusApps(ds)`** — rewritten to iterate **all** apps and all their
  windows, clearing every `focused` flag and `focusedAppId`. Self-healing
  against stale persisted state; no longer trusts the `focusedAppId` pointer.
- **`focusWindow(ds, appId, windowId, menuBar?)`** *(new)* — the single write
  path for window focus: `deFocusApps`, then set `app.focused = true`,
  `focusedAppId = appId`, `window.focused = true`, `window.zOrder = Date.now()`,
  `app.lastAccessedWindowId = windowId`, and swap `Desktop.appMenu` (fresh menu
  from the action when provided, else the window's stored `menuBar`). Never
  changes `closed` or `collapsed`.
- **`focusApp(ds, appId)`** — becomes "activate app": `deFocusApps`, set
  `app.focused` + `focusedAppId`, then restore a window via the fallback chain,
  all candidates filtered to non-closed windows:
  1. the window with id `lastAccessedWindowId`, if present and not closed;
  2. else the highest-`zOrder` non-closed window;
  3. else the `default` non-closed window;
  4. else no window (app active with menu bar only).
  A picked window is focused via `focusWindow` (collapsed stays collapsed). The
  current force-reopen (`closed = false`) is removed — `openApp` un-closes
  windows itself before calling `focusApp`, so it is unaffected.
- **`activateApp`** is deleted; `ClassicyAppActivate` routes to the same
  `focusApp` logic (today it is a near-duplicate that activates without
  restoring a window, which would fight the new behavior).

## Event routing changes

- `ClassicyWindowFocus` handler → `focusWindow`. A single mousedown is now
  sufficient; the `click`-driven `ClassicyAppActivate` handshake is no longer
  load-bearing (but remains, idempotently, as `focusApp`).
- App switcher keeps dispatching `ClassicyAppFocus` → new `focusApp`.
- `ClassicyAppClose`'s fallback (focus the next open app) inherits
  last-accessed restoration for free.
- `ClassicyWindowClose` keeps promoting the next-highest-`zOrder` window but
  routes the promotion through `focusWindow`, so it also updates
  `lastAccessedWindowId` and the menu bar.
- `ClassicyWindowOpen` calls `focusWindow` **only when the window did not
  already exist in the store** — a genuinely new window opens focused (Mac
  behavior); remounts of persisted windows steal nothing.

## Component changes

- **`ClassicyWindow.tsx`** — remove the mount-time `ClassicyWindowFocus`
  dispatch (previously used to refresh menu closures; on reload it would let
  mount order clobber `lastAccessedWindowId` and global focus). Menu refresh is
  already handled by the effect dispatching `ClassicyWindowMenu` when
  `ws.focused && appMenu`.
- **`ClassicyApp.tsx`** — the default-window effect (focus `defaultWindow` when
  app focused and no window focused) gains a `!closed` guard so it can no longer
  focus an invisible window. It remains as a first-launch fallback only.

## Edge cases

- **Stale `lastAccessedWindowId`** (window destroyed or closed since): the
  restoration chain falls through; no cleanup bookkeeping.
- **Old persisted state** with multiple `focused: true` flags: heals on the
  first focus event via the unconditional `deFocusApps` sweep.
- **Modals:** no special-casing; they are windows.
- **Collapsed windows:** focusable; never auto-expanded by activation.

## Testing

Extend `ClassicyAppManager.test.ts`, `ClassicyWindowEventHandler.test.ts`,
`ClassicyReducerRouting.test.ts`:

- **Helper-level:** after any `focusWindow`/`focusApp`, exactly one focused
  window and one focused app store-wide — including when starting from a
  corrupted multi-focused state; the full restoration fallback chain
  (lastAccessed → zOrder → default → none); collapsed stays collapsed; closed
  windows never reopened by focus.
- **Reducer-level:** `ClassicyWindowFocus` on app B defocuses app A's windows
  in one action (the drag scenario); app-switcher `ClassicyAppFocus` restores
  the last-accessed window; `ClassicyAppClose` fallback focuses the next open
  app's last-accessed window; `ClassicyWindowOpen` focuses only genuinely-new
  windows.

## Out of scope

- Mapping `zOrder` to CSS `z-index` (relative order within the active-app tier
  remains DOM order — existing behavior).
- `ClassicyWindowOpen`'s existing un-close-on-reregister behavior.
- Desktop-click → Finder activation.
