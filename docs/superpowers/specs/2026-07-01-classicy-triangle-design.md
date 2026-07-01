# ClassicyTriangle Extraction — Design

## Problem

The animated disclosure triangle (SVG + click/keyboard toggle + rotation state) is
implemented entirely inside `ClassicyDisclosure` (`src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx`).
There is no way to use the triangle's click-to-expand visual/interaction on its own —
any other feature that wants the same widget (e.g. a tree view, an accordion header,
a custom expandable panel) would have to copy the SVG markup and toggle logic.

## Goal

Extract the triangle into a standalone `ClassicyTriangle` component that:
- Works fully standalone (self-contained click/keyboard toggle) when dropped anywhere.
- Can still be used as a purely visual, externally-driven element inside `ClassicyDisclosure`,
  preserving Disclosure's existing single-click-target UX and passing its existing test suite
  unmodified.

## Component API

New folder: `src/SystemFolder/SystemResources/Triangle/`
- `ClassicyTriangle.tsx`
- `ClassicyTriangle.scss`
- `ClassicyTriangle.test.tsx`

```ts
type ClassicyTriangleDirection = "up" | "right" | "down" | "left";

type ClassicyTriangleProps = {
  direction?: ClassicyTriangleDirection; // default "right"
  open?: boolean;                        // controlled override
  defaultOpen?: boolean;                 // uncontrolled initial value, default false
  onToggle?: (open: boolean) => void;
  interactive?: boolean;                 // default true
  className?: string;
};
```

## Behavior

- **Controlled vs. uncontrolled**: `isControlled = open !== undefined`. The resolved
  open state is `open` when controlled, otherwise an internal `useState(defaultOpen)`.
  This lets a consumer either fully own the boolean (sync it with other UI) or just
  drop `<ClassicyTriangle />` and let it manage itself.
- **`interactive` (default `true`)**: renders a `role="button"` wrapper div around the
  SVG with `tabIndex={0}`, `aria-expanded={resolvedOpen}`, `onClick`, and an
  `onKeyDown` handler for Enter/Space (mirrors the existing Disclosure header
  handling, including the same biome a11y lint-disable comment for using a div
  instead of `<button>` since the SVG child is incompatible with `<button>`).
  On toggle it:
  1. Calls `useClassicyAnalytics().track("click", { expanded, type: "ClassicyTriangle", direction })`.
  2. Updates internal state if uncontrolled.
  3. Calls `onToggle?.(next)`.
- **`interactive={false}`**: renders only the rotated SVG with the direction/open
  classes — no wrapper element, no keyboard handling, no analytics call. Purely
  visual, driven entirely by the `open` prop from the parent.
- SVG markup (five `<polygon>` shapes) is unchanged from the current implementation,
  just moved verbatim into the new component.

## CSS

All `classicyDisclosureTriangle*` rules move out of `ClassicyDisclosure.scss` into
`ClassicyTriangle.scss`, renamed to `classicyTriangle*` (e.g.
`classicyDisclosureTriangleRightOpen` → `classicyTriangleRightOpen`).
`ClassicyDisclosure.scss` retains only the header/inner layout rules
(`.classicyDisclosure`, `.classicyDisclosureHeader`, `.classicyDisclosureInner*`).

## ClassicyDisclosure integration

`ClassicyDisclosure` keeps its existing header `div` with `role="button"`,
`tabIndex={0}`, `onClick`, and `onKeyDown` — this remains the single click/focus
target for the whole row (label + triangle), so there is no nested-interactive-element
or double-toggle problem. It drops its inline SVG block and the triangle-specific
`track()` call (the label-specific `track("click", { expanded, type: "ClassicyLabel", label })`
call in the header handler is unchanged), and instead renders:

```tsx
<ClassicyTriangle direction={direction} open={open} interactive={false} />
```

No changes to `ClassicyDisclosure`'s public props, behavior, or existing tests are
expected.

## Testing

New `ClassicyTriangle.test.tsx`:
- Uncontrolled: click toggles open/closed classes; Enter and Space keys toggle;
  `defaultOpen` sets initial state.
- Controlled: `open` prop drives rendered state; `onToggle` fires with the next
  value on click, without the component changing its own displayed state if the
  parent doesn't update `open` (classic controlled-component check).
- `interactive={false}`: no `role="button"`, no `tabIndex`, no keyboard handling;
  renders the SVG with classes matching the `open`/`direction` props only.
- Direction prop produces the corresponding `classicyTriangle<Direction><Open|Closed>` class.
- Analytics: `track` is called with `type: "ClassicyTriangle"` and the expected
  `expanded`/`direction` payload on toggle (interactive mode only).

`ClassicyDisclosure.test.tsx` is not expected to require changes — it exercises the
same header click/keyboard flows against the same rendered classes.

## Out of scope

- No change to `ClassicyDisclosure`'s public API or default behavior.
- No new consumers of `ClassicyTriangle` are wired up as part of this change (e.g. no
  tree view or accordion) — this is purely the extraction plus tests.
