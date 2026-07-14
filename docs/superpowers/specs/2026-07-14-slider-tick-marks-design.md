# ClassicySlider Tick Marks — Design

**Date:** 2026-07-14
**Component:** `src/SystemFolder/SystemResources/Slider/ClassicySlider.tsx`

## Overview

Add optional Mac OS 8-style tick marks below the slider track. Ticks are off by
default and appear only when explicitly requested via a new `tickInterval`
prop. An optional `snapToTicks` prop constrains the thumb to tick positions.

## API

Two new props on `ClassicySliderProps`:

```tsx
/**
 * Draws tick marks under the track. `"center"` renders a single tick at the
 * midpoint. A number renders a tick every `tickInterval` value-units starting
 * at `min`. Omit for no ticks (default).
 */
tickInterval?: number | "center";

/**
 * When true and `tickInterval` is a number, the thumb snaps to tick
 * positions: the input's `step` becomes the effective tick interval,
 * overriding any `step` prop. Ignored when `tickInterval` is absent or
 * `"center"`. Default false.
 */
snapToTicks?: boolean;
```

## Behavior

- **Default:** `tickInterval` undefined → no tick rail in the DOM; rendering is
  byte-identical to the current component. No existing consumer changes.
- **`"center"`:** one tick at the 50% position.
- **Numeric interval:** ticks at `min`, `min + i`, `min + 2i`, … while
  `≤ max + i × 1e-6` (tolerance absorbs float accumulation). `max` gets a tick
  only when it lands on the grid — interval 30 on 0–100 → ticks at 0, 30, 60,
  90.
- **Density clamp:** the effective interval is
  `max(tickInterval, (max − min) / 50)` — never more than one tick per 2% of
  the range. 0–100 with any tiny interval clamps to interval 2 → 51 ticks
  (endpoint-inclusive; each tick marks a real value).
- **Invalid values:** `tickInterval ≤ 0`, `NaN`, or non-finite → treated as
  absent (no ticks, no snapping).
- **Snapping:** with `snapToTicks` and a numeric interval, the rendered
  `<input>` uses `step = effectiveInterval`. Ticks and native stepping both
  originate at `min`, so they align by construction. Keyboard arrows move one
  tick per press. The consumer's `step` prop is ignored while snapping.
- **Purely visual otherwise:** without `snapToTicks`, ticks are decorative and
  the existing `step` prop governs movement.

## Structure

Inside the existing `classicySliderTrackGroup` row, the `<input>` is wrapped in
a new column stack; the value label stays to the right of the stack:

```
classicySliderTrackGroup            (row, unchanged)
├── classicySliderStack             (column, new)
│   ├── input.classicySlider        (unchanged)
│   └── classicySliderTicks         (new rail, aria-hidden, only when ticks on)
│       └── span.classicySliderTick × n
└── classicySliderValue             (unchanged)
```

- The rail has `padding: 0 calc($thumb-w / 2)` — a native range thumb's center
  travels from `thumbWidth/2` to `width − thumbWidth/2`, so ticks positioned at
  percentage offsets of the padded inner width sit exactly where the thumb's
  point aims.
- Each tick is absolutely positioned at `left: (pos%)` with
  `transform: translateX(-50%)`; the `"center"` tick sits at 50%.
- The rail is `aria-hidden="true"`; the input remains the accessible control.

## Appearance

- Tick: vertical line, `var(--window-border-size)` wide,
  `calc(var(--window-padding-size) * 0.75)` tall (¾ of track height),
  `var(--color-black)`, with a `var(--window-border-size)` gap below the
  track. All geometry and color via theme variables so ticks
  re-skin with everything else.
- Disabled sliders apply the same `contrast(0.5)` dim to the rail as the
  input.

## Testing

Unit tests (`ClassicySlider.test.tsx`):
1. No `tickInterval` → no `.classicySliderTicks` element.
2. `tickInterval="center"` → exactly one tick at `left: 50%`.
3. `tickInterval={25}`, 0–100 → 5 ticks at 0/25/50/75/100%.
4. `tickInterval={30}`, 0–100 → 4 ticks (max off-grid).
5. Density clamp: `tickInterval={0.5}`, 0–100 → 51 ticks (interval clamps to 2).
6. `tickInterval={0}` / negative → no ticks.
7. `snapToTicks` + `tickInterval={25}` → input `step` attribute is 25.
8. `snapToTicks` with `"center"` or without `tickInterval` → `step` unchanged.
9. Disabled → rail carries the disabled class.

Browser verification: example app slider with ticks on, visual alignment of
ticks to thumb positions at min/mid/max.

## Out of scope

- Tick labels (numbers under ticks).
- Ticks above the track or on vertical sliders (component is horizontal-only).
- Changes to `QuickTimeVolumeControl`, ColorPicker sliders, or other existing
  consumers — they pass no `tickInterval` and are unaffected.
