# Utility Windows Layer Behind the Focused App

**Date:** 2026-07-23
**Component:** `ClassicyWindow`
**Issue:** [#234](https://github.com/robbiebyrd/classicy/issues/234) — "Utility Windows should not be above Finder windows"
**Status:** Approved — ready for implementation plan

## Summary

A utility (tool-palette) window currently floats above **every** other window,
including a focused Finder file-browser window, even when the palette's own app
is in the background. Make utility windows **app-focus-aware**: a palette floats
above its *own* app's document windows, but drops behind whichever app is
currently focused. Focusing Finder therefore brings all Finder windows over a
background app's (e.g. HyperCard's) palettes — the Mac OS behavior the issue
asks for, generalized to every app rather than special-casing Finder.

## Background — why this happens

Z-order in Classicy is **not** a per-window index. It is three static CSS bands
keyed off focus state, in
`src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`:

- `.classicyWindowInactive` → `z-index: unset` (falls to `.classicyWindow`'s base `20`)
- `.classicyWindowActiveApp` → `z-index: 150` (a non-active window of the focused app)
- `.classicyWindowActive` → `z-index: 300` (the active window)

(The persisted `zOrder` field is a `Date.now()` stamp used only to pick a
*successor* window on close; it never drives CSS.)

The class is assigned in `ClassicyWindow.tsx` (~line 926):

```tsx
modal || isActive() ? "classicyWindowActive" : "classicyWindowInactive",
currentApp?.focused && !isActive() ? "classicyWindowActiveApp" : "",
```

`isActive()` (`ClassicyWindow.tsx:597-605`) returns `true` **unconditionally**
for `windowType === "utility"` so the palette never dims:

```tsx
const isActive = useCallback(() => {
    return windowType === "utility" || ws.focused;
}, [ws.focused, windowType]);
```

That one flag does two unrelated jobs — "always show active chrome" **and**
"top z-band (300)". So a HyperCard palette sits at `z-index: 300` even when
HyperCard is backgrounded and Finder is focused. That is the bug.

`windowType` is a **component prop only** — it is not on the persisted
`ClassicyStoreSystemAppWindow` state. But the class list that needs to change is
computed inside `ClassicyWindow.tsx`, which already has both `windowType` and
`currentApp?.focused` in scope. So the fix needs **no store/schema change** and
no change to `ClassicyWindowOpen` or the reducer.

In-repo consumers of `windowType="utility"`: `HyperCard.tsx:674` and `:688`,
plus the Storybook example. Blast radius is small.

## Requirements

- **R1** — When a utility window's owning app is focused, the palette renders
  **above** that app's active document window.
- **R2** — When a utility window's owning app is **not** focused, the palette
  renders **behind** the windows of the currently focused app (including Finder
  file-browser windows).
- **R3** — Utility chrome is unchanged: the palette never dims, keeps its
  half-height crosshatch title bar and functional controls, regardless of z-band.
- **R4** — Document (non-utility) windows are unaffected.
- **R5** — No change to persisted state, the window event reducer, or
  `ClassicyWindowOpen`.

## Design

### 1. Component (`ClassicyWindow.tsx`)

Keep the existing class logic that gives a utility window `.classicyWindowActive`
(this preserves the never-dim active chrome). Add **one** computed modifier token
to the `classNames(...)` list that overrides only the z-index, based on app
focus:

```tsx
windowType === "utility"
    ? (currentApp?.focused ? "classicyWindowFloating" : "classicyWindowBackgrounded")
    : "",
```

- `currentApp?.focused` is already used one line below (for
  `classicyWindowActiveApp`), so no new data is threaded in.
- A document window emits neither token.

### 2. Styles (`ClassicyWindow.scss`)

Add two classes **after** the `.classicyWindowActive` block. `.classicyWindowActive`
sets `z-index: 300 !important` at single-class specificity `(0,1,0)`; these two
new single-class `!important` rules have equal specificity, so declaring them
later in the source makes them win the cascade deterministically — no
specificity-hacking needed.

```scss
.classicyWindowFloating {
    z-index: 350 !important; // palette floats above its own app's active document (300)
}

.classicyWindowBackgrounded {
    z-index: 20 !important; // palette drops behind the focused app (its windows at 150 / 300)
}
```

`350` sits above the active document band (`300`) but below the modal/error
bands (scrim `290` is for a different scenario; error modals use `99998/99999`),
so error modals and their scrims are unaffected.

### Resulting bands

| Scenario | Finder window | HyperCard card (document) | HyperCard palette (utility) |
|---|---|---|---|
| **HyperCard focused** | inactive `20` | active `300` | floating **`350`** (top) |
| **Finder focused** | active `300` (top) | inactive `20` | backgrounded **`20`** |

Only one app is focused at a time, so the `Floating` (`350`) and `Active` (`300`)
bands never collide across apps.

### 3. Tests (`ClassicyWindow.utility.test.tsx`)

Keep the 3 existing dimming tests green. Add:

- Utility window whose owning app **is focused** → rendered window has class
  `classicyWindowFloating` and **not** `classicyWindowBackgrounded`.
- Utility window whose owning app is **not focused** → has
  `classicyWindowBackgrounded` and **not** `classicyWindowFloating`.
- Regression: a `windowType="document"` window has **neither** class.

The test harness (`renderWindow`) will need to control `currentApp.focused` for
the rendered window's app — assert against the class list on the
`.classicyWindow` element.

### 4. In-browser verification (verify skill)

1. Open HyperCard → its tool palette floats above the HyperCard card window.
2. Open a Finder file-browser window and click it → the Finder window covers the
   HyperCard palette (previously the palette stayed on top).
3. Click back into HyperCard → the palette returns above the card window.

## Out of scope (YAGNI)

- Ordering among multiple simultaneous palettes of the same app — they tie at
  `350` and resolve by DOM (render) order.
- Hiding or dimming backgrounded palettes. Real Mac OS hides a background app's
  floating palettes; Classicy deliberately chose "utility never dims"
  (see `2026-07-22-utility-window-mode-design.md`). We keep that — only the
  z-band moves. A backgrounded palette shows active chrome while sitting behind
  the focused app; this is intentional and consistent with the existing decision.
- Deriving CSS `z-index` from the `zOrder` recency stamp in general.
- Any change to persisted window state or the window event reducer.

## Acceptance criteria

- With HyperCard focused, its utility palette renders above its own document
  window.
- Opening and focusing a Finder window puts that Finder window above the
  HyperCard palette.
- Re-focusing HyperCard returns its palette to the top of its own windows.
- The palette never dims in any of these states.
- All existing `ClassicyWindow` tests pass; the new layering tests pass.
