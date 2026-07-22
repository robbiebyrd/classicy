# ClassicyPopUpMenu — Keyboard Navigation & Accessibility

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

## Approach

**`aria-activedescendant` pattern (focus stays on the button).** Chosen over a
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
  reset the buffer after ~500ms of inactivity, matching native `<select>`.
- In `onButtonKeyDown`, when the key is a single printable character
  (`e.key.length === 1` and not a modifier combo):
  - Append to the buffer.
  - Find the first option whose `label` starts with the buffer
    (case-insensitive). If none, fall back to the first option starting with the
    latest character (lets repeated presses cycle through same-initial items).
  - If the menu is **open**, move the `highlight` to that option's index.
  - If the menu is **closed**, commit that option directly (native `<select>`
    changes value on type without opening) — via `commitIndex(matchIndex)`.
- Do not preventDefault for keys that aren't matched, so existing shortcuts are
  unaffected.

### Out of scope

- No roving-`tabIndex` rewrite.
- No change to the visual design, SCSS, size variants, or the
  `onChangeFunc`/`selected`/`placeholder` public API.
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
4. **Type-ahead while closed** — focus button (closed), type `c`, assert
   `onChangeFunc` fires with `cherry` and the button shows Cherry.
5. **Type-ahead buffer** — type `ba` selects Banana over a hypothetical
   `Blueberry`-style prefix collision (use options that share an initial).

Keep all existing tests green. Run `pnpm lint` (Biome, scoped to the touched
files per repo convention) and the full vitest suite.

## Risks

- **Explicit `focus()` on open** could momentarily fight an outside focus owner;
  mitigated by only focusing the already-in-DOM button we own.
- **Type-ahead vs. Space** — Space is already bound to open/commit. A literal
  space character must not be treated as type-ahead; guard `e.key === " "` stays
  in the existing Space branch and is excluded from the printable-character path.
