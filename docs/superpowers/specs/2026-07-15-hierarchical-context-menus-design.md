# Hierarchical Contextual Menus — Design

**Date**: 2026-07-15
**Status**: Approved

## Problem

Right-clicking anywhere on the desktop shows the same `ClassicyContextualMenu`
(`defaultMenuItems` from `ClassicyDesktop.tsx`). The guard in
`toggleDesktopContextMenu` checks `e.currentTarget.id === 'classicyDesktop'`,
which is always true because the handler is attached to the desktop div, so the
desktop menu appears regardless of the actual right-click target.

`ClassicyWindow` has half-built context-menu plumbing (a `contextMenu` prop, a
`ClassicyWindowContextMenu` dispatch) whose reducer case is commented out —
it is dead code.

## Goals

1. The desktop `defaultMenuItems` menu appears **only** when right-clicking an
   open area of the desktop (not a `ClassicyDesktopIcon`, not a window).
2. Each app and each window can define its own contextual menu. A focused
   window's menu takes precedence over its app's menu.
3. Any Classicy control item can declare its own contextual menu.
4. Desktop icons can declare a per-icon contextual menu.
5. Components that need right-click interaction **without** a menu can opt out
   of the whole system.
6. Menus effectively load/unload with focus: right-clicking a window focuses it
   first, and resolution reads live focus/app state at click time.

## Decisions (from brainstorming)

- **Resolution**: target-based + focus. The DOM target of the right-click
  determines the menu; right-clicking a window focuses it first.
- **Fallback**: if no menu applies, nothing appears; the native browser menu
  stays suppressed inside the desktop.
- **Control API**: a wrapper component (`ClassicyContextualMenuTarget`), not a
  prop on every control. Pattern mirrors `ClassicyBalloonHelp`.
- **Icons**: per-icon menu if defined, else nothing.
- **Architecture**: event bubbling + a single shared menu host (Approach A).
  "Which menu is active" is derived at click time from (DOM target, focus
  state), never stored.

## Architecture

### New: `ClassicyContextualMenuProvider`

Location: `src/SystemFolder/SystemResources/ContextualMenu/`.

- Mounted once inside `ClassicyDesktopInner`, wrapping the desktop's children.
- Holds transient React state (not the persisted Zustand store):
  `{ items: ClassicyMenuItem[]; position: [number, number] } | null`.
- Context API: `showContextMenu(items, position)` and `hideContextMenu()`.
- Renders the existing `ClassicyContextualMenu` through a React portal into
  `#classicyDesktop` (same pattern as `ClassicyBalloonHelp`), guaranteeing at
  most one open menu, never clipped by parent overflow.
- A new `showContextMenu` call replaces any open menu. Click-outside and item
  selection call `hideContextMenu` (existing `onClose` behavior).

### New: `ClassicyContextualMenuTarget`

- Props: `menuItems: ClassicyMenuItem[]`, `children`.
- Renders a minimal wrapper element with an `onContextMenu` handler:
  - if `e.defaultPrevented` → do nothing;
  - else `preventDefault()`, `stopPropagation()`,
    `showContextMenu(menuItems, clickPosition - clickOffset)`.
- This is how any control (Button, Input, Slider, list rows, …) gets a menu —
  no changes to the controls themselves.

### Modified components

**`ClassicyApp`** — new prop `contextMenu?: ClassicyMenuItem[]`, dispatched
with the existing `ClassicyAppLoad` event and stored on app state, mirroring
`appMenu`. Windows read it from the store via their existing `currentApp`
subscription.

**`ClassicyWindow`** — `onContextMenu` handler (replaces dead
`showContextMenu`):

1. If `e.defaultPrevented` → return.
2. `preventDefault()` + `stopPropagation()` — always, so neither the desktop
   menu nor the native menu can appear over a window.
3. `setActive()` — right-click focuses the window (and its app).
4. Resolve: window `contextMenu` prop → else app `contextMenu` from store →
   else `null`.
5. If resolved, `showContextMenu(items, position)`; else nothing.

The `contextMenu` prop is no longer copied into window registration state.

**`ClassicyDesktopIcon`** — optional `contextMenu` prop, flowing through
`ClassicyDesktopIconAdd` into the icon's existing (currently unused) store
field. Right-click: claim the event, select/focus the icon, show its menu if
defined, else nothing.

**`ClassicyDesktop`** — `toggleDesktopContextMenu` keeps its unconditional
`preventDefault()` (suppresses native menus over the whole desktop) but shows
the default menu only when `e.target` (not `currentTarget`) is the desktop div
and the event was not already default-prevented. Local
`contextMenu`/`contextMenuLocation` `useState` is replaced by the provider.

### Deleted dead code

- Commented `ClassicyWindowContextMenu` reducer case
  (`ClassicyDesktopWindowManagerContext.tsx`).
- `ClassicyWindow`'s `setContextMenu`, `closeContextMenuHandler`,
  `onMouseOutHandler` dispatch plumbing and inline
  `ClassicyContextualMenu` rendering.
- Unused window-state fields `contextMenu`/`showContextMenu`/
  `contextMenuLocation` (`ClassicyWindowContext.ts`,
  `ClassicyAppManager.ts` window interface) and desktop-state fields
  `contextMenu`/`showContextMenu` (`ClassicyDesktopManager.tsx`), including
  the `ClassicyDesktopContextMenu` reducer case if nothing else uses it.
- The icon-state `contextMenu` field **stays** — it becomes live.

## Precedence

Innermost wins, resolved via DOM event bubbling:

```
custom right-click component (preventDefault, no menu)
  > ClassicyContextualMenuTarget (control-level menu)
    > ClassicyWindow contextMenu prop (window-level)
      > ClassicyApp contextMenu prop (app-level)
        > desktop defaultMenuItems (empty desktop only)
```

Desktop icons are siblings of windows in this tree: icon menu or nothing.

## Edge cases

- **Right-click interaction without a menu**: the component calls
  `e.preventDefault()` in its own `onContextMenu`; every layer above checks
  `defaultPrevented` and stays silent. This is the documented opt-out.
- **Nested wrappers**: the inner wrapper's `stopPropagation` wins.
- **Right-click while a menu is open**: the provider replaces the open menu.
- **Modal dialogs**: they are `ClassicyWindow`s — same resolution; the overlay
  blocks the desktop.
- **Persistence**: no open-menu state touches the persisted store. App
  `contextMenu` follows the existing `appMenu` persistence pattern
  (re-dispatched by `ClassicyAppLoad` on mount).

## Testing

Vitest, following existing test patterns:

- `ClassicyWindow` resolution precedence: window prop / app fallback / neither
  (nothing shown, event claimed).
- Desktop guard: right-click on a child element shows nothing; on the desktop
  div shows `defaultMenuItems`.
- `ClassicyContextualMenuTarget`: shows its menu, claims the event.
- Desktop icon: shows per-icon menu when defined, nothing otherwise, icon gets
  selected.
- `defaultPrevented` opt-out honored at every layer.
- Provider: second `showContextMenu` replaces the first; `hideContextMenu` on
  outside click.
- Update/remove existing tests referencing deleted state fields.

Storybook: a story for `ClassicyContextualMenuTarget` and a demo showing
window-level vs app-level menus.
