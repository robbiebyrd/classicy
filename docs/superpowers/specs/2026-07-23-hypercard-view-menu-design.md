# HyperCard View Menu — Show/Hide Utility Palettes

**Status:** Approved (design)
**Date:** 2026-07-23

## Goal

Give HyperCard.app a **View** menu that shows/hides its two utility (tool-palette)
windows — the **Tools** palette (`hypercard_tools`) and the **Info** inspector
(`hypercard_inspector`) — via checkmark menu items with ⌘-key equivalents.

## Background

HyperCard renders two `windowType="utility"` windows, both mounted only during
edit mode (`edit && activeStackId`):

- `hypercard_tools` — title `"Tools"` — the drawing/tool palette.
- `hypercard_inspector` — title `"Info"` — the part/card inspector.

Each already has a working title-bar **close box** that dispatches
`ClassicyWindowClose`, setting the window's store `closed` flag to `true` and
hiding it (the frame gets `classicyWindowInvisible`; the component stays mounted,
so position/size persist). There is currently **no way to bring a hidden palette
back** and no menu affordance to hide one deliberately.

The Script editor window (`hypercard_script`) is a `document` window, **not** a
utility palette, and is explicitly out of scope.

## Requirements

- **R1** — A top-level **View** menu, **always present** in HyperCard's menu bar,
  placed immediately **after `Go`**.
- **R2** — Two checkmark items: **Tools** (⌘T) and **Info** (⌘I).
- **R3** — Each item shows a **checkmark (✓)** when its palette is currently
  visible (mounted and not `closed`), and no checkmark when hidden.
- **R4** — Each item is **disabled (greyed)** when not in edit mode (the palettes
  don't exist then). Disabled items don't fire their ⌘-key equivalents (the
  existing `findMenuItemByShortcut` already skips `disabled` items).
- **R5** — Clicking an enabled item (or pressing its ⌘-key) **toggles** that
  palette's visibility:
  - visible → hide via `ClassicyWindowClose`.
  - hidden → show via `ClassicyWindowOpen` (existing-window branch → `closed:false`),
    which **preserves the window's stored geometry** so it reappears where the
    user left it.
- **R6** — The checkmark is **derived from the store's `closed` flag**, the single
  source of truth. Closing a palette by its own title-bar close box therefore
  un-checks its menu item automatically; visibility is never stored twice.
- **R7** — No new window-reducer events and no new store state. The feature is
  expressible with the existing `ClassicyWindowClose` / `ClassicyWindowOpen`
  events.

## Design

### 1. Reusable checkmark support in `ClassicyMenu`

**File:** `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` (+ `.scss`)

Add one optional field to the `ClassicyMenuItem` interface:

```ts
/** Renders a Mac OS 8 checkmark (✓) in the item's left gutter when true. */
checked?: boolean;
```

In `ClassicyMenuItemComponent`, render a checkmark element inside the item's `<p>`
ahead of the icon/title when `menuItem.checked` is true. It occupies the same
left gutter that item icons use, so checked and unchecked items in the same menu
stay text-aligned. Add a `.classicyMenuItemChecked` marker class (via the existing
`classNames(...)` call) for styling.

**SCSS:** add a `.classicyMenuItemCheck` rule giving the checkmark span a fixed
gutter width matching the icon column (`calc(var(--window-control-size) * 1.25)`
plus the icon's right margin) so titles line up whether or not an item is checked.

This is a generic menu capability — nothing HyperCard-specific.

### 2. View menu in HyperCard

**File:** `src/SystemFolder/HyperCard/HyperCard.tsx`

Read each palette's live `closed` flag with selectors:

```ts
const toolsClosed = useAppManager(
  (s) => s.System.Manager.Applications.apps[appId]?.windows
    .find((w) => w.id === "hypercard_tools")?.closed ?? false,
);
const infoClosed = useAppManager(
  (s) => s.System.Manager.Applications.apps[appId]?.windows
    .find((w) => w.id === "hypercard_inspector")?.closed ?? false,
);
```

Add a `View` menu object to the `appMenu` `useMemo`, inserted right after the
`go` menu (and before the edit-only `edit`/`objects` group). Each item:

- `checked: editingActive && !closed` (only meaningful, and only shown, while editing).
- `disabled: !editingActive`.
- `keyboardShortcut: "Cmd+T"` / `"Cmd+I"`.
- `onClickFunc`: guarded on `edit`; dispatches `ClassicyWindowClose` when visible,
  else `ClassicyWindowOpen` with the window's declared id/size/position/
  minimumSize/`windowType:"utility"` (geometry is ignored by the reducer's
  existing-window branch, which preserves the stored position).

Add `toolsClosed`, `infoClosed`, and `editingActive` to the `appMenu` `useMemo`
dependency array so the menu (and its checkmarks) rebuilds on every toggle; the
existing "push live menu to desktop when focused" effect then re-syncs the bar.

A small shared helper builds each item to avoid duplication, e.g.:

```ts
const paletteToggle = (
  windowId: string, title: string, shortcut: string,
  closed: boolean, size: [number, number], position: [number, number],
) => ({
  id: `view_${windowId}`,
  title,
  keyboardShortcut: shortcut,
  disabled: !editingActive,
  checked: editingActive && !closed,
  onClickFunc: () => {
    if (!edit) return;
    dispatch(
      closed
        ? {
            type: "ClassicyWindowOpen",
            app: { id: appId },
            window: {
              id: windowId,
              size,
              position,
              minimumSize: [0, 0] as [number, number],
              windowType: "utility" as const,
            },
          }
        : {
            type: "ClassicyWindowClose",
            app: { id: appId },
            window: { id: windowId },
          },
    );
  },
});
```

(The exact `size`/`position` passed mirror each window's `initialSize`/
`initialPosition` props; they only matter in the impossible case where the record
was destroyed, so any sane values are fine.)

### 3. Out of scope

- The Script editor window (`hypercard_script`) — a document window, not a palette.
- Any new window-reducer events or store fields.
- Persisting palette visibility across quit/relaunch beyond what the existing
  window store already does.

## Testing

**Menu component** (`ClassicyMenu` test):
- An item with `checked: true` renders the checkmark element; `checked: false`
  or omitted renders none.
- Checked and unchecked items keep title alignment (the gutter is reserved).

**HyperCard View menu** (HyperCard menu test):
- View menu is present in both browse and edit mode, placed after `Go`.
- Outside edit mode: both items `disabled`, no checkmark.
- In edit mode with both palettes open: both items enabled and `checked`.
- Clicking **Tools** while visible dispatches `ClassicyWindowClose` for
  `hypercard_tools`; clicking while hidden dispatches `ClassicyWindowOpen` for
  `hypercard_tools`. Same for **Info** / `hypercard_inspector`.
- After a palette's `closed` flips (simulating its close box), the corresponding
  item is no longer `checked`.
- ⌘T / ⌘I fire the toggles when editing, and are inert when not (disabled).

## Acceptance Criteria

1. View menu always visible, after Go, with Tools (⌘T) and Info (⌘I) items.
2. Checkmarks reflect live window `closed` state; close box and menu stay in sync.
3. Items greyed and shortcuts inert outside edit mode.
4. Toggling reopens a palette at its previous position.
5. No new window-reducer events or store state; Script window untouched.
6. Touched-file Biome clean; existing tests stay green.
