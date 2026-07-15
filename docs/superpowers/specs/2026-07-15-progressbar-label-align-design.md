# ClassicyProgressBar `labelAlign` — Design

**Date:** 2026-07-15
**Status:** Approved

## Goal

Let consumers align the `ClassicyProgressBar` label text `left`, `center`, or `right` relative to the bar, via a new `labelAlign` prop. Default is `left`, which matches today's rendering exactly.

## API

```tsx
<ClassicyProgressBar
    label="Loading…"
    labelPosition="above"      // existing
    labelAlign="center"        // NEW: 'left' | 'center' | 'right', default 'left'
/>
```

## Architecture

The alignment vocabulary lives in the shared `ClassicyControlLabel` module, mirroring the existing `labelPositionClass` pattern, so other labeled components can adopt it later with one line each. Only `ClassicyProgressBar` exposes the prop in this change.

### `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.tsx`

```tsx
export type ClassicyLabelAlign = 'left' | 'center' | 'right'

export function labelAlignClass(align: ClassicyLabelAlign): string {
    // 'left'   → 'classicyLabelAlignLeft'
    // 'center' → 'classicyLabelAlignCenter'
    // 'right'  → 'classicyLabelAlignRight'
}
```

### `src/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss`

The `above`/`below` wrapper layouts are flex columns, so the label holder
(`.classicyControlLabelHolder`, itself a flex row) stretches to full width.
Alignment is therefore done with `justify-content` on the holder:

```scss
.classicyLabelAlignCenter > .classicyControlLabelHolder { justify-content: center; }
.classicyLabelAlignRight  > .classicyControlLabelHolder { justify-content: flex-end; }
```

- `left` emits a class name but no CSS rule — `flex-start` is the flexbox
  default, guaranteeing zero visual regression for existing consumers.
- `justify-content` (not `text-align`) is used so an icon + text label moves
  as one unit.
- For `labelPosition="left"/"right"` (row layouts) the holder is
  content-sized, so `labelAlign` is a documented no-op there.

### `src/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.tsx`

- Add `labelAlign?: ClassicyLabelAlign` prop, default `'left'`.
- Compose the wrapper class:
  `classNames(labelPositionClass(labelPosition), labelAlignClass(labelAlign))`.
- When there is no label, the bar renders without a wrapper (unchanged) and
  `labelAlign` has no effect.

## Testing

In `ClassicyProgressBar.test.tsx`:

- Default (no `labelAlign`) applies `classicyLabelAlignLeft` — and no CSS rule
  changes rendering.
- `labelAlign="center"` / `"right"` apply the corresponding class on the same
  wrapper element as the position class.
- No `label` → no wrapper, `labelAlign` ignored.

## Consumer update

`src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx` passes
`labelAlign="center"` to its `ClassicyProgressBar` so the startup screen's
label is centered over the bar.

## Showcase

`ClassicyProgressBar.stories.tsx` gains a `labelAlign` arg (select control)
and a story demonstrating center alignment.

## Out of scope

- Wiring `labelAlign` into other `labelPositionClass` consumers (Slider,
  Checkbox, DatePicker, …) — they can adopt the shared helper later.
- RTL-aware logical alignment (start/end).
