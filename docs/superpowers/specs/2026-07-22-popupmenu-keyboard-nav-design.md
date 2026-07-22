# ClassicyPopUpMenu — Keyboard Navigation, Accessibility & Unclipped Dropdown

**Date:** 2026-07-22
**Component:** `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx`

## Problem

`ClassicyPopUpMenu` was refactored from a native `<select>` into a custom
`<button>` + `role="listbox"`/`role="option"` structure (commit `6621ef1`). The
refactor reimplemented some arrow-key handling but left the keyboard/AT
experience incomplete. Concretely:

1. **Arrow keys don't work when the menu is opened by mouse.** The keydown
   handler lives on the `<button>` and assumes the button keeps DOM focus while
   the menu is open. Firefox and Safari do **not** focus a `<button>` on click
   (only Chromium does), so after a mouse-open the button has no focus and
   keystrokes go nowhere. The existing vitest tests hide this because they call
   `.focus()` explicitly before pressing keys.
2. **No screen-reader support.** The button never exposes `aria-controls` or
   `aria-activedescendant`, and the listbox has no id or accessible name, so
   assistive tech cannot announce which option is highlighted.
3. **No type-ahead.** A native `<select>` jumps to an option when you type its
   leading character(s); this behavior was not reimplemented.
4. **Focus not guaranteed.** Because focus is never explicitly managed on open,
   Tab-in / mouse-open / close-and-return behavior is inconsistent.
5. **Dropdown is clipped by the containing object.** The open list is
   `position: absolute` inside the control, so it lives in the containing
   `ClassicyWindow`'s overflow/stacking context. Any `overflow: hidden/auto`
   ancestor cuts it off, and `z-index: 1000` cannot escape a clipping container.
   The menu must render above any other item and show in full even when the
   container would clip it.

## Approach

**`aria-activedescendant` pattern (focus stays on the button)** for keyboard/AT,
plus a **React portal** for the dropdown (matching the established
`ClassicyBalloonHelp` / contextual-menu pattern). Chosen over a
roving-`tabIndex` rewrite because it is the smallest change, keeps the existing
single-keydown-handler structure (and its passing tests), and most closely
matches native `<select>` semantics — where focus never visibly leaves the
control. DOM focus stays on the `<button>` the entire time the menu is open; the
*visually* highlighted option is communicated to AT via `aria-activedescendant`.

## Design

### Focus management (fixes bug #1 and #4)

- In `openMenu()`, explicitly call `buttonRef.current?.focus()` so the button
  holds DOM focus regardless of how the menu was opened (mouse or keyboard).
  This makes the existing `onButtonKeyDown` handler receive keystrokes in every
  browser.
- `commitIndex()` / `closeMenu()` already restore focus to the button on
  keyboard commit; keep that. Ensure Escape and outside-click paths leave focus
  in a sensible place (button retains focus on Escape; outside-click does not
  force focus).

### ARIA wiring (fixes bug #2)

- Give the listbox a stable id (derived from `reactId`, e.g. `${reactId}-list`)
  and `aria-label` (the control's `label` if present, else the current value).
- On the `<button>`, when `open`:
  - `aria-controls={listId}`
  - `aria-activedescendant={highlight >= 0 ? optionId(highlight) : undefined}`
- Options already have stable ids via `optionId(index)`, `role="option"`, and
  `aria-selected`. No change needed there beyond ensuring the highlighted id
  matches what `aria-activedescendant` points at.

### Type-ahead (fixes bug #3)

- Maintain a short-lived typed-buffer in a `useRef` (the accumulated string).
  Use a `window.setTimeout` (tracked in a ref, cleared on each keystroke) to
  reset the buffer after 250ms of inactivity.
- In `onButtonKeyDown`, when the key is a single printable character
  (`e.key.length === 1` and not a modifier combo):
  - Append to the buffer.
  - Find the first option whose `label` starts with the buffer
    (case-insensitive). If none, fall back to the first option starting with the
    latest character (lets repeated presses cycle through same-initial items).
  - If the menu is **closed**, open it first (`openMenu()`), then move the
    `highlight` to the matching index — typing surfaces the menu rather than
    silently changing the value.
  - Once open (including immediately after the open above), move the `highlight`
    to that option's index. Commit stays an explicit Enter/click.
- Do not preventDefault for keys that aren't matched, so existing shortcuts are
  unaffected.

### Unclipped dropdown via portal (fixes bug #5)

Mirror the `ClassicyBalloonHelp` pattern so the open list is never clipped by an
ancestor's `overflow` and always stacks above other items.

- **Render via `createPortal`** into
  `document.getElementById("classicyDesktop") ?? document.body`. Only the open
  `role="listbox"` block is portaled; the wrapper/button stay in place.
- **Position from the button's rect.** On open, capture
  `buttonRef.current.getBoundingClientRect()` into state. Style the portaled list
  `position: fixed`, anchored at the control's top-left (`top: rect.top`,
  `left: rect.left`) with `min-width: rect.width` supplied inline — the SCSS
  `min-width: 100%` no longer applies once the list is a child of the desktop.
- **z-index.** Bump the list from `1000` to `5000`, matching `ClassicyMenu`
  (menu-bar pulldowns) — the consistent "menu" tier, above windows (≤999).
- **Outside-click fix.** Because the portaled list is no longer a DOM descendant
  of `wrapperRef`, add a `listRef` on the portaled container. The mousedown-close
  handler treats a click as inside when it is contained by the wrapper **or** the
  list; only clicks outside both close the menu.
- **Close on scroll/resize.** While open, add `scroll` (capture: true, to catch
  scrolls in any ancestor) and `resize` listeners that call `closeMenu()`. This
  keeps the fixed-position list from drifting away from its button. Return focus
  to the button on this close path, consistent with Escape.
- **SCSS.** `.classicyPopUpMenuList` drops `position: absolute; top/left/0` and
  `min-width: 100%` (now provided inline); its border/shadow/color styling is
  unchanged. The `z-index` moves to the inline portal style (or a bumped value in
  SCSS) so it reads `5000`.

### Out of scope

- No roving-`tabIndex` rewrite.
- No change to the visual *appearance*, size variants, or the
  `onChangeFunc`/`selected`/`placeholder` public API. (SCSS changes are limited
  to the portal-positioning adjustments on `.classicyPopUpMenuList` above — no
  restyle.)
- No PageUp/PageDown paging (native `<select>` pages, but the menus here are
  short; YAGNI).

## Testing

Extend `ClassicyPopUpMenu.test.tsx` (all via `@/__tests__/test-utils`):

1. **Mouse-open then keyboard** — click to open, then `{ArrowDown}`/`{Enter}`
   commits the expected option **without** an explicit `.focus()` call. This is
   the regression test for bug #1; assert the button is the active element after
   open.
2. **`aria-activedescendant` tracks highlight** — open, arrow down, assert the
   button's `aria-activedescendant` equals the highlighted option's id and that
   `aria-controls` points at the listbox id.
3. **Type-ahead while open** — open, type `b`, assert Banana is highlighted
   (`aria-activedescendant`); `{Enter}` commits Banana.
4. **Type-ahead while closed** — focus button (closed), type `c`, assert the
   menu opens (listbox present) with Cherry highlighted via
   `aria-activedescendant`; `{Enter}` then commits `cherry`.
5. **Type-ahead buffer** — type `ba` selects Banana over a hypothetical
   `Blueberry`-style prefix collision (use options that share an initial).
6. **Portaled + unclipped** — render the menu inside a wrapper with
   `overflow: hidden`; open it and assert the `role="listbox"` is rendered
   outside that wrapper (portaled to `#classicyDesktop` / `document.body`), not as
   a descendant of the clipping wrapper.
7. **Option click still commits after portaling** — open, click an option, assert
   `onChangeFunc` fires (guards against the outside-click handler closing the menu
   before the portaled option's click lands).
8. **Closes on scroll** — open, dispatch a `scroll` event, assert the listbox is
   removed.

Note: jsdom has no layout, so `getBoundingClientRect()` returns zeros — position
assertions are not meaningful in unit tests. Tests verify *where in the DOM* the
list renders and its dismissal behavior, not pixel coordinates. Real positioning
is verified manually in-browser (see Risks).

Keep all existing tests green. Run `pnpm lint` (Biome, scoped to the touched
files per repo convention) and the full vitest suite.

## Risks

- **Explicit `focus()` on open** could momentarily fight an outside focus owner;
  mitigated by only focusing the already-in-DOM button we own.
- **Type-ahead vs. Space** — Space is already bound to open/commit. A literal
  space character must not be treated as type-ahead; guard `e.key === " "` stays
  in the existing Space branch and is excluded from the printable-character path.
- **Portal positioning is layout-dependent** and unverifiable in jsdom. Verify
  in-browser (per the cross-browser testing setup) that: the dropdown renders in
  full over a clipping `ClassicyWindow`; it anchors to the button; it stacks above
  windows; and it dismisses on scroll/resize/outside-click.
- **Portal target timing** — `#classicyDesktop` must exist when the menu opens.
  It reliably does (mounted by `ClassicyDesktop` above all apps); the
  `?? document.body` fallback covers isolated renders (Storybook/tests).
