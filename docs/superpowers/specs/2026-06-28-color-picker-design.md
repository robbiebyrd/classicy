# ClassicyColorPicker — Design Spec

**Date:** 2026-06-28  
**Status:** Approved

---

## Overview

A Mac OS 8-style color picker delivered as two composable React components:

- **`ClassicyColorPickerDialog`** — headless dialog (caller controls open/close)
- **`ClassicyColorPicker`** — convenience wrapper: color-swatch trigger button + dialog bundled

The picker supports five color selection modes exposed as tabs: Crayons, RGB, HSV, HLS, and CMYK. All modes operate on the same internal integer color representation used throughout the Classicy theme system (e.g. `0xBA572C`). Color changes in any tab are uncommitted until the user clicks OK.

---

## Files

```
src/SystemFolder/SystemResources/ColorPicker/
  ClassicyColorPicker.tsx            ← swatch trigger + dialog (convenience wrapper)
  ClassicyColorPickerDialog.tsx      ← headless dialog built on ClassicyWindow
  ClassicyColorPickerCrayon.tsx      ← Crayons tab content
  ClassicyColorPickerCrayons.ts      ← Mac OS 8 crayon color data + ClassicyCrayon type
  ClassicyColorPickerRGB.tsx         ← RGB sliders tab content
  ClassicyColorPickerHSV.tsx         ← HSV wheel + value slider tab content
  ClassicyColorPickerHLS.tsx         ← HLS wheel + lightness slider tab content
  ClassicyColorPickerCMYK.tsx        ← CMYK sliders tab content
  ClassicyColorWheel.tsx             ← shared interactive color wheel (HSV + HLS)
  ClassicyColorPickerUtils.ts        ← color space conversion utilities
  ClassicyColorPicker.scss           ← styles
  ClassicyColorPicker.test.tsx       ← tests
```

---

## Types & APIs

### `ClassicyCrayon`

```ts
type ClassicyCrayon = {
  color: number;   // integer, e.g. 0x922010
  name: string;    // e.g. "Cayenne"
};
```

### `ClassicyColorPickerDialog`

```tsx
interface ClassicyColorPickerDialogProps {
  id: string;
  open: boolean;
  initialColor?: number;           // integer; defaults to 0x000000
  crayons?: ClassicyCrayon[];      // defaults to Mac OS 8 authentic set
  onSelectFunc?: (color: number) => void;
  onCancelFunc?: () => void;
}
```

### `ClassicyColorPicker`

```tsx
interface ClassicyColorPickerProps {
  id: string;
  value?: number;                  // controlled color (integer)
  defaultValue?: number;           // uncontrolled fallback; defaults to 0x000000
  crayons?: ClassicyCrayon[];      // passed through to dialog
  labelTitle?: string;
  labelPosition?: ClassicyLabelPosition;
  labelSize?: ClassicyControlLabelSize;
  disabled?: boolean;
  onChangeFunc?: (color: number) => void;
}
```

---

## Color Format

All components accept and emit colors as **integers** (e.g. `0xBA572C`), matching the existing Classicy theme system. The existing `intToHex` / `hexToInt` utilities in `ClassicyColors.ts` handle CSS conversion for display.

---

## Data Flow

### Dialog state

`ClassicyColorPickerDialog` holds a single `pendingColor: number` in local `useState`. This is the only color state in the dialog. It is:
- Initialised from `initialColor` on mount and reset to `initialColor` each time `open` transitions from `false` to `true` (via `useEffect` on `open`).
- Updated by whichever tab is active via a shared `onChangeFunc={(c) => setPendingColor(c)}`.
- Committed on OK → `onSelectFunc(pendingColor)` then `onCancelFunc()` to close.
- Discarded on Cancel → `onCancelFunc()` only.

Each tab is a pure transformer: receives `color: number`, emits `number` via `onChangeFunc`. No tab holds its own color state.

### Swatch wrapper state

```
value (controlled) or useState(defaultValue)  ← internal value
        │
  [Swatch button]  background: intToHex(value)
  onClick → setOpen(true)
        │
  ClassicyColorPickerDialog
    open={open}
    initialColor={value}
    onSelectFunc={(c) => { setValue(c); onChangeFunc?.(c); setOpen(false) }}
    onCancelFunc={() => setOpen(false)}
```

### Conversion strategy

All tabs convert through RGB as the intermediate representation. No direct conversion between non-RGB spaces. All conversion functions live in `ClassicyColorPickerUtils.ts`:

```ts
intToRgb(color: number): { r: number; g: number; b: number }  // 0–255
rgbToInt(r: number, g: number, b: number): number

rgbToHsv(r, g, b): { h: number; s: number; v: number }   // h: 0–360, s/v: 0–100
hsvToRgb(h, s, v): { r: number; g: number; b: number }

rgbToHls(r, g, b): { h: number; l: number; s: number }   // h: 0–360, l/s: 0–100
hlsToRgb(h, l, s): { r: number; g: number; b: number }

rgbToCmyk(r, g, b): { c: number; m: number; y: number; k: number }  // 0–100
cmykToRgb(c, m, y, k): { r: number; g: number; b: number }
```

---

## Visual Layout

### Dialog window

`ClassicyWindow` with `modal={true}`, fixed size ~480×380px, title "Color Picker".

```
┌─ Color Picker ────────────────────────────[□][×]──┐
│ ┌────────────────────────────────────────────────┐ │
│ │ [Crayons] [RGB] [HSV] [HLS] [CMYK]            │ │  ← ClassicyTabs
│ │┌──────────────────────────────────────────────┐│ │
│ ││                                              ││ │
│ ││           [tab content]                      ││ │
│ ││                                              ││ │
│ │└──────────────────────────────────────────────┘│ │
│ └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────┐                    │
│  │  color preview swatch      │  ← live pendingColor│
│  └────────────────────────────┘                    │
│                          [Cancel]  [OK]            │
└────────────────────────────────────────────────────┘
```

### Crayons tab

Grid of SVG crayon shapes (pointed tip + cylindrical body), 8 columns, rows as needed for the full set. Selected crayon renders a highlight ring. A color strip at the bottom of the tab panel shows the currently hovered/selected color. Default crayon set is the authentic Mac OS 8 68-crayon palette. Custom sets accepted via `crayons` prop.

### RGB tab

Three `ClassicySlider` rows — Red, Green, Blue. Each slider:
- Range: 0–100 (displayed as %)
- Track: colored gradient (`#000000` → pure channel color)
- Value label shows `n %`

### HSV tab

Left: `ClassicyColorWheel` canvas (~200×200px) — hue by angle (0°–360°), saturation by distance from center. Degree labels at 0°, 60°, 120°, 180°, 240°, 300°. Crosshair marker at current H/S position.

Below wheel: `ClassicySlider` for Value (0–100%).

Right: three read/write numeric fields — "Hue Angle °", "Saturation %", "Value %".

### HLS tab

Identical layout to HSV. Slider label is "Lightness". Track gradient and conversion math differ. Numeric fields: "Hue Angle °", "Saturation %", "Lightness %".

### CMYK tab

Four `ClassicySlider` rows — Cyan, Magenta, Yellow, Black. Each 0–100% with a colored gradient track matching its channel.

---

## `ClassicyColorWheel` (shared)

- Renders a `<canvas>` element.
- On mount (and on resize), fills the disc pixel-by-pixel using `putImageData` — avoids CSS conic-gradient banding.
- The parent passes `hue` (0–360) and `saturation` (0–100); the wheel renders the crosshair accordingly.
- Pointer events (mousedown + mousemove) compute: `angle → hue`, `radius ratio → saturation`. Emits `onChangeFunc({ h, s })`.
- The wheel is unaware of value/lightness; the parent tab combines `{h, s}` from the wheel with the slider's `v`/`l`, converts to integer, and calls its own `onChangeFunc`.
- Props:
  ```tsx
  interface ClassicyColorWheelProps {
    hue: number;          // 0–360
    saturation: number;   // 0–100
    mode: "hsv" | "hls";  // affects how the disc is rendered
    onChangeFunc: (h: number, s: number) => void;
  }
  ```

---

## Swatch button

`ClassicyColorPicker` renders a small square `<button>` whose background is `intToHex(value)`. It has a thin inset border matching Mac OS 8 color-well style. When `labelTitle` is provided, it is preceded by a `ClassicyControlLabel`. When `disabled`, the swatch is greyed out and the dialog cannot be opened.

---

## Testing

`ClassicyColorPicker.test.tsx` covers:

1. Renders swatch with correct background color.
2. Clicking swatch opens the dialog.
3. OK with a selected color calls `onChangeFunc` with the correct integer and closes the dialog.
4. Cancel closes the dialog without calling `onChangeFunc`.
5. `ClassicyColorPickerUtils.ts` — round-trip tests for each color space: `int → X → int` should be lossless within rounding tolerance.
6. Crayon click selects the correct integer color.
7. RGB sliders at 0%/100% produce correct integer boundaries.
8. CMYK sliders at 0%/100% produce correct integer boundaries.
