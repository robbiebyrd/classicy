# Utility Windows Can Float Above All Apps (`alwaysOnTop`)

**Date:** 2026-07-23
**Component:** `ClassicyWindow`
**Related:** [#234](https://github.com/robbiebyrd/classicy/issues/234) — utility-window app-focus-aware layering (this feature adds an opt-in override)
**Status:** Approved — ready for implementation plan

## Summary

Add an opt-in `alwaysOnTop` prop to `ClassicyWindow`. When set on a
`windowType="utility"` palette, the palette floats above **every** app's
windows — even when its own app is backgrounded — instead of dropping behind
the focused app. It still sits below error modals. This restores the
"global floating palette" behavior (like a system-wide tool that stays on top)
as a deliberate per-window choice, without regressing the #234 default.

## Background

Z-order in Classicy is three static CSS bands keyed off focus state, in
`src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`:

- `.classicyWindowInactive` → base `z-index: 20`
- `.classicyWindowActiveApp` → `z-index: 150` (a non-active window of the focused app)
- `.classicyWindowActive` → `z-index: 300` (the active window)

Feature #234 added two utility-only bands and made palettes app-focus-aware
(`ClassicyWindow.tsx` ~line 930, `ClassicyWindow.scss`):

- `.classicyWindowFloating` → `z-index: 350` — palette when its app **is** focused
- `.classicyWindowBackgrounded` → `z-index: 20` — palette when its app is **not** focused

Today a utility window's band is chosen purely by app focus:

```tsx
windowType === "utility"
    ? (currentApp?.focused ? "classicyWindowFloating" : "classicyWindowBackgrounded")
    : ""
```

So a backgrounded app's palette drops to `20` (behind the focused app). Some
palettes should instead stay on top globally — that is what this feature adds.

`windowType` is a **component prop only**; the layering classes are computed
from the prop (lines 923/930), not from persisted `ws.windowType`. `alwaysOnTop`
follows the same pattern: a pure component prop consumed only in the className
computation. No store/schema/reducer change.

## Requirements

- **R1** — A `windowType="utility"` window with `alwaysOnTop` renders in the
  floating band (`z-index: 350`) **regardless** of whether its owning app is
  focused.
- **R2** — At `350` the palette floats above any app's active document window
  (`300`) but **below** error-modal scrims/dialogs (`99998`/`99999`), so a
  blocking system alert always surfaces over it.
- **R3** — Without `alwaysOnTop`, utility windows keep the exact #234 behavior
  (floating when app focused, backgrounded otherwise).
- **R4** — `alwaysOnTop` is a **no-op** on `windowType="document"` windows —
  they emit neither the floating nor backgrounded class.
- **R5** — Utility chrome is unchanged: the palette never dims and keeps its
  half-height crosshatch title bar in every state.
- **R6** — No change to persisted state, the window event reducer, or
  `ClassicyWindowOpen`. No existing consumer changes; the #234 default is
  untouched.

## Design

### 1. Prop (`ClassicyWindow.tsx`)

Add to `ClassicyWindowProps` (after `windowType`):

```tsx
/**
 * Utility-only. When true, a `windowType="utility"` palette floats above every
 * app's windows — even when its own app is backgrounded — instead of dropping
 * behind the focused app (the default #234 behavior). Still sits below error
 * modals. No-op on document windows.
 */
alwaysOnTop?: boolean;
```

Destructure with a `false` default in the component parameter list:

```tsx
alwaysOnTop = false,
```

### 2. Behavior (`ClassicyWindow.tsx`, className computation ~line 930)

Change only the utility branch's floating condition:

```tsx
windowType === "utility"
    ? (alwaysOnTop || currentApp?.focused
        ? "classicyWindowFloating"
        : "classicyWindowBackgrounded")
    : "",
```

`alwaysOnTop` short-circuits to the floating band. A document window still emits
neither token (the outer `windowType === "utility"` guard is unchanged).

### 3. Styles

**No SCSS change.** The feature reuses the existing `.classicyWindowFloating`
(`z-index: 350 !important`) band from #234. `350` already sits above the active
document band (`300`) and below the modal bands, satisfying R2.

### Resulting bands

| Scenario | Focused app's active window | `alwaysOnTop` palette (its app backgrounded) |
|---|---|---|
| Another app focused | `300` | floating **`350`** (above) |
| Error modal open | modal `99999` / scrim `99998` | floating `350` (below the modal) |

### 4. Tests (`ClassicyWindow.utility.test.tsx`)

Keep existing dimming and #234 layering tests green. Add:

- `alwaysOnTop` utility whose owning app is **not** focused → rendered window has
  `classicyWindowFloating` and **not** `classicyWindowBackgrounded`.
- `alwaysOnTop` utility whose owning app **is** focused → still
  `classicyWindowFloating`.
- Regression: utility **without** `alwaysOnTop`, app not focused → keeps
  `classicyWindowBackgrounded` (guards the #234 default).
- `alwaysOnTop` on a `windowType="document"` window → **neither** class.

The harness (`renderWindow`) already controls `currentApp.focused`; assert
against the class list on the `.classicyWindow` element.

### 5. In-browser verification (verify skill)

Use a consumer that sets `alwaysOnTop` — add a Storybook story for an
always-on-top utility palette (or temporarily flip HyperCard's palette for the
manual check; do not ship that change).

1. Palette's app backgrounded, focus another app (e.g. Finder) → the palette
   stays **above** that app's window (contrast: a plain #234 palette drops
   behind it).
2. Trigger an error modal → the modal and its scrim cover the palette.
3. Toggle focus back to the palette's app → still on top; chrome never dims.

## Out of scope (YAGNI)

- Ordering among multiple simultaneous `alwaysOnTop` palettes — they tie at
  `350` and resolve by DOM (render) order, like today's multi-palette case.
- Hiding or dimming backgrounded palettes (Classicy's standing decision is
  "utility never dims"; see `2026-07-22-utility-window-mode-design.md`).
- Persisting the flag to window state or toggling it at runtime via events.
- Any `alwaysOnTop` meaning for document windows.

## Acceptance criteria

- An `alwaysOnTop` utility palette renders at `z-index: 350` whether or not its
  app is focused, and above other apps' active windows.
- An error modal still appears over the palette.
- A utility window without `alwaysOnTop` is byte-for-byte unchanged from #234.
- `alwaysOnTop` on a document window changes nothing.
- The palette never dims. All existing `ClassicyWindow` tests pass; the new
  tests pass.
