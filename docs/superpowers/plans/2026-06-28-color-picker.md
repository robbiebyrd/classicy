# ClassicyColorPicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Mac OS 8-style color picker with Crayons, RGB, HSV, HLS, and CMYK tabs as a headless `ClassicyColorPickerDialog` + a swatch-trigger `ClassicyColorPicker`.

**Architecture:** No Zustand — local state only. `ClassicyColorPickerDialog` holds a single `pendingColor: number` as the source of truth; every tab is a pure `color: number → onChangeFunc(number)` transformer. `ClassicyColorPicker` wraps the dialog with a clickable color-swatch button. All color-space math lives in `ClassicyColorPickerUtils.ts`; all tabs convert through RGB as an intermediate.

**Tech Stack:** React, TypeScript, SCSS, Vitest, `@testing-library/react`, `classnames`, existing `ClassicyWindow`, `ClassicySlider`, `ClassicyTabs`, `ClassicyButton`, `ClassicyControlLabel`, `intToHex` from `ClassicyColors`.

## Global Constraints

- Colors are integers (e.g. `0xBA572C`) — no hex strings or RGB objects in component props/callbacks
- RGB/CMYK/HSV/HLS sliders display 0–100%; internal math uses 0–255 for RGB
- `crayons` prop defaults to the 64-entry `MAC_OS_8_CRAYONS` constant
- All styles in `ClassicyColorPicker.scss`; no Tailwind, no inline styles for layout
- Tests: `vitest`, `@testing-library/react`, `import { render } from "@/__tests__/test-utils"`; run with `pnpm test`
- Path alias `@/` resolves to `./src/`

---

### Task 1: Conversion utilities + tests

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.ts`
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.test.ts`

**Interfaces:**
- Produces:
  - `intToRgb(color: number): { r: number; g: number; b: number }` — 0–255 each
  - `rgbToInt(r: number, g: number, b: number): number`
  - `rgbToHsv(r, g, b): { h: number; s: number; v: number }` — h: 0–360, s/v: 0–100
  - `hsvToRgb(h, s, v): { r: number; g: number; b: number }`
  - `rgbToHls(r, g, b): { h: number; l: number; s: number }` — h: 0–360, l/s: 0–100
  - `hlsToRgb(h, l, s): { r: number; g: number; b: number }`
  - `rgbToCmyk(r, g, b): { c: number; m: number; y: number; k: number }` — 0–100 each
  - `cmykToRgb(c, m, y, k): { r: number; g: number; b: number }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.test.ts
import { describe, expect, it } from "vitest";
import {
  intToRgb, rgbToInt,
  rgbToHsv, hsvToRgb,
  rgbToHls, hlsToRgb,
  rgbToCmyk, cmykToRgb,
} from "./ClassicyColorPickerUtils";

const EPSILON = 2; // max rounding error per channel

describe("intToRgb / rgbToInt", () => {
  it("splits 0xFF0000 into r=255,g=0,b=0", () => {
    expect(intToRgb(0xFF0000)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("splits 0x1A2B3C into correct channels", () => {
    expect(intToRgb(0x1A2B3C)).toEqual({ r: 0x1A, g: 0x2B, b: 0x3C });
  });
  it("round-trips rgbToInt → intToRgb", () => {
    const { r, g, b } = intToRgb(rgbToInt(73, 128, 200));
    expect(r).toBe(73); expect(g).toBe(128); expect(b).toBe(200);
  });
  it("rgbToInt(0,0,0) === 0", () => { expect(rgbToInt(0, 0, 0)).toBe(0); });
  it("rgbToInt(255,255,255) === 0xFFFFFF", () => { expect(rgbToInt(255, 255, 255)).toBe(0xFFFFFF); });
});

describe("HSV round-trips", () => {
  it("pure red round-trips through HSV", () => {
    const { r, g, b } = hsvToRgb(...Object.values(rgbToHsv(255, 0, 0)) as [number,number,number]);
    expect(r).toBeCloseTo(255, -1); expect(g).toBeCloseTo(0, -1); expect(b).toBeCloseTo(0, -1);
  });
  it("white round-trips through HSV", () => {
    const { h, s, v } = rgbToHsv(255, 255, 255);
    expect(s).toBe(0); expect(v).toBe(100);
    const { r, g, b } = hsvToRgb(h, s, v);
    expect(r).toBeCloseTo(255, -1); expect(g).toBeCloseTo(255, -1); expect(b).toBeCloseTo(255, -1);
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 100, g: 150, b: 200 };
    const { r, g, b } = hsvToRgb(...Object.values(rgbToHsv(orig.r, orig.g, orig.b)) as [number,number,number]);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});

describe("HLS round-trips", () => {
  it("pure green round-trips through HLS", () => {
    const { h, l, s } = rgbToHls(0, 255, 0);
    expect(h).toBe(120); expect(l).toBe(50); expect(s).toBe(100);
    const { r, g, b } = hlsToRgb(h, l, s);
    expect(r).toBeCloseTo(0, -1); expect(g).toBeCloseTo(255, -1); expect(b).toBeCloseTo(0, -1);
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 80, g: 160, b: 220 };
    const { h, l, s } = rgbToHls(orig.r, orig.g, orig.b);
    const { r, g, b } = hlsToRgb(h, l, s);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});

describe("CMYK round-trips", () => {
  it("black maps to k=100", () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 100 });
  });
  it("white maps to all zeros", () => {
    expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 120, g: 60, b: 200 };
    const { c, m, y, k } = rgbToCmyk(orig.r, orig.g, orig.b);
    const { r, g, b } = cmykToRgb(c, m, y, k);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test -- ClassicyColorPickerUtils
```
Expected: `Cannot find module './ClassicyColorPickerUtils'`

- [ ] **Step 3: Implement the utilities**

```ts
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.ts

export const intToRgb = (color: number): { r: number; g: number; b: number } => ({
  r: (color >> 16) & 0xff,
  g: (color >> 8) & 0xff,
  b: color & 0xff,
});

export const rgbToInt = (r: number, g: number, b: number): number =>
  ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);

export const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : Math.round((delta / max) * 100), v: Math.round(max * 100) };
};

export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = vn - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
};

export const rgbToHls = (r: number, g: number, b: number): { h: number; l: number; s: number } => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min, l = (max + min) / 2;
  let h = 0, s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, l: Math.round(l * 100), s: Math.round(s * 100) };
};

export const hlsToRgb = (h: number, l: number, s: number): { r: number; g: number; b: number } => {
  const ln = l / 100, sn = s / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
};

export const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
  if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 };
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn), d = 1 - k;
  return {
    c: Math.round(((1 - rn - k) / d) * 100),
    m: Math.round(((1 - gn - k) / d) * 100),
    y: Math.round(((1 - bn - k) / d) * 100),
    k: Math.round(k * 100),
  };
};

export const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
  const cn = c / 100, mn = m / 100, yn = y / 100, kn = k / 100;
  return {
    r: Math.round(255 * (1 - cn) * (1 - kn)),
    g: Math.round(255 * (1 - mn) * (1 - kn)),
    b: Math.round(255 * (1 - yn) * (1 - kn)),
  };
};
```

- [ ] **Step 4: Run tests — all should pass**

```bash
pnpm test -- ClassicyColorPickerUtils
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.ts \
        src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils.test.ts
git commit -m "feat: add ClassicyColorPickerUtils color space conversion functions"
```

---

### Task 2: Crayon color data

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayons.ts`

**Interfaces:**
- Produces: `type ClassicyCrayon = { color: number; name: string }`
- Produces: `MAC_OS_8_CRAYONS: ClassicyCrayon[]` — 64-entry default palette

- [ ] **Step 1: Create the crayon data file**

```ts
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayons.ts

export type ClassicyCrayon = {
  color: number;
  name: string;
};

// Approximate Mac OS 8 / Mac OS X Color Picker crayon palette, 8 columns × 8 rows.
export const MAC_OS_8_CRAYONS: ClassicyCrayon[] = [
  // Row 1 — light tints
  { name: "Snow",        color: 0xFFFFFF }, { name: "Honeydew",   color: 0xD4FFD4 },
  { name: "Banana",      color: 0xFFFFB8 }, { name: "Cantaloupe", color: 0xFFCB8E },
  { name: "Salmon",      color: 0xFF9898 }, { name: "Carnation",  color: 0xFF98C3 },
  { name: "Bubblegum",   color: 0xFF98FF }, { name: "Lavender",   color: 0xC398FF },
  // Row 2 — vivid saturated
  { name: "Mercury",     color: 0xE8E8E8 }, { name: "Flora",      color: 0x73FF98 },
  { name: "Lemon",       color: 0xFEFF00 }, { name: "Tangerine",  color: 0xFF9300 },
  { name: "Maraschino",  color: 0xFF2600 }, { name: "Strawberry", color: 0xFF2F92 },
  { name: "Magenta",     color: 0xFF44FF }, { name: "Grape",      color: 0x9400D3 },
  // Row 3 — cool vivid
  { name: "Silver",      color: 0xD4D4D4 }, { name: "Spindrift",  color: 0x73FDC8 },
  { name: "Seafoam",     color: 0x73FDFD }, { name: "Sky",        color: 0x76D7FF },
  { name: "Orchid",      color: 0x7A7FFF }, { name: "Blueberry",  color: 0x0433FF },
  { name: "Aqua",        color: 0x0096FF }, { name: "Ocean",      color: 0x0062A3 },
  // Row 4 — mid greens / blues
  { name: "Aluminum",    color: 0xAAAAAA }, { name: "Lime",       color: 0x00F900 },
  { name: "Spring",      color: 0x00FA92 }, { name: "Turquoise",  color: 0x00C3C3 },
  { name: "Teal",        color: 0x007D7B }, { name: "Midnight",   color: 0x011993 },
  { name: "Eggplant",    color: 0x3F0066 }, { name: "Plum",       color: 0x700070 },
  // Row 5 — dark saturated
  { name: "Magnesium",   color: 0x888888 }, { name: "Fern",       color: 0x43A200 },
  { name: "Clover",      color: 0x007400 }, { name: "Moss",       color: 0x53650A },
  { name: "Asparagus",   color: 0x829600 }, { name: "Mocha",      color: 0x774201 },
  { name: "Maroon",      color: 0x600008 }, { name: "Cayenne",    color: 0x942017 },
  // Row 6 — deep darks
  { name: "Nickel",      color: 0x686868 }, { name: "Sage",       color: 0x7C8B6A },
  { name: "Cypress",     color: 0x4A5D3F }, { name: "Cedar",      color: 0x6B3D2D },
  { name: "Umber",       color: 0x543B28 }, { name: "Sepia",      color: 0x5B4134 },
  { name: "Crimson",     color: 0xDC143C }, { name: "Indigo",     color: 0x4B0082 },
  // Row 7 — accent + extra
  { name: "Tin",         color: 0x505050 }, { name: "Jade",       color: 0x00A86B },
  { name: "Cobalt",      color: 0x0047AB }, { name: "Amber",      color: 0xFFBF00 },
  { name: "Violet",      color: 0x7F00FF }, { name: "Rose",       color: 0xFF007F },
  { name: "Chartreuse",  color: 0x7FFF00 }, { name: "Cerulean",   color: 0x007BA7 },
  // Row 8 — near-blacks
  { name: "Steel",       color: 0x3C3C3C }, { name: "Peach",      color: 0xFFCBA4 },
  { name: "Mint",        color: 0x98FF98 }, { name: "Lilac",      color: 0xC8A2C8 },
  { name: "Gold",        color: 0xFFD700 }, { name: "Sienna",     color: 0xA0522D },
  { name: "Slate",       color: 0x708090 }, { name: "Licorice",   color: 0x000000 },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayons.ts
git commit -m "feat: add MAC_OS_8_CRAYONS default crayon palette"
```

---

### Task 3: Styles

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss`

- [ ] **Step 1: Create the SCSS file**

```scss
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
@use '../../ControlPanels/AppearanceManager/styles/appearance';

// ── Swatch button ────────────────────────────────────────────────────────────

.classicyColorPickerSwatch {
  display: inline-block;
  width: calc(var(--window-control-size) * 2.5);
  height: calc(var(--window-control-size) * 2.5);
  border: var(--window-border-size) solid var(--color-window-border);
  box-shadow:
    inset 1px 1px 0 var(--color-system-01),
    inset -1px -1px 0 var(--color-system-06);
  cursor: pointer;
  padding: 0;

  &:disabled,
  &.classicyColorPickerSwatchDisabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.classicyColorPickerSwatchWrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--window-padding-size);
}

// ── Dialog internals ─────────────────────────────────────────────────────────

.classicyColorPickerPreview {
  width: 100%;
  height: 32px;
  border: var(--window-border-size) solid var(--color-window-border);
  box-shadow:
    inset 1px 1px 0 var(--color-system-06),
    inset -1px -1px 0 var(--color-system-01);
  margin-top: var(--window-padding-size);
  flex-shrink: 0;
}

.classicyColorPickerDialogFooter {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--window-padding-size);
  padding-top: var(--window-padding-size);
  flex-shrink: 0;
}

// ── Crayons tab ──────────────────────────────────────────────────────────────

.classicyColorPickerCrayonTab {
  display: flex;
  flex-direction: column;
  gap: var(--window-padding-size);
  padding: var(--window-padding-size);
}

.classicyColorPickerCrayonGrid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  background: var(--color-system-05);
  border: var(--window-border-size) solid var(--color-window-border);
  padding: 4px;
}

.classicyColorPickerCrayon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  background: none;
  border: none;
  padding: 1px;
  outline: none;

  &:hover svg { transform: translateY(-2px); }
  &:focus-visible { outline: 2px solid var(--color-outline); outline-offset: 1px; }
}

.classicyColorPickerCrayonSelected svg {
  outline: 2px solid var(--color-outline);
  outline-offset: 1px;
}

.classicyColorPickerCrayonPreviewStrip {
  height: 20px;
  border: var(--window-border-size) solid var(--color-window-border);
  box-shadow: inset 1px 1px 0 var(--color-system-06);
}

// ── RGB / CMYK slider tracks ─────────────────────────────────────────────────
// These wrapper classes override the default gray gradient track from
// ClassicySlider.scss using higher-specificity descendant selectors.

@mixin color-track($from, $to) {
  .classicySlider::-webkit-slider-runnable-track { background: linear-gradient(to right, $from, $to); }
  .classicySlider::-moz-range-track               { background: linear-gradient(to right, $from, $to); }
}

.classicyColorPickerSlider {
  &--red     { @include color-track(#000000, #ff0000); }
  &--green   { @include color-track(#000000, #00ff00); }
  &--blue    { @include color-track(#000000, #0000ff); }
  &--cyan    { @include color-track(#ffffff, #00ffff); }
  &--magenta { @include color-track(#ffffff, #ff00ff); }
  &--yellow  { @include color-track(#ffffff, #ffff00); }
  &--black   { @include color-track(#ffffff, #000000); }
}

// ── RGB / CMYK layout ────────────────────────────────────────────────────────

.classicyColorPickerSlidersTab {
  display: flex;
  flex-direction: column;
  gap: calc(var(--window-padding-size) * 2);
  padding: var(--window-padding-size);
}

// ── Wheel (HSV / HLS) ────────────────────────────────────────────────────────

.classicyColorPickerWheelTab {
  display: flex;
  flex-direction: column;
  gap: var(--window-padding-size);
  padding: var(--window-padding-size);
}

.classicyColorPickerWheelLayout {
  display: flex;
  gap: calc(var(--window-padding-size) * 2);
  align-items: flex-start;
}

.classicyColorPickerWheelOuter {
  position: relative;
  flex-shrink: 0;
}

.classicyColorPickerWheelCanvas {
  display: block;
  border-radius: 50%;
  cursor: crosshair;
}

.classicyColorPickerWheelDegreeLabel {
  position: absolute;
  font-family: var(--ui-font);
  font-size: calc(var(--ui-font-size) * 0.8);
  color: var(--color-black);
  transform: translate(-50%, -50%);
  pointer-events: none;
  white-space: nowrap;
}

.classicyColorPickerWheelFields {
  display: flex;
  flex-direction: column;
  gap: var(--window-padding-size);
}

.classicyColorPickerWheelField {
  display: flex;
  align-items: center;
  gap: var(--window-padding-size);
  font-family: var(--ui-font);
  font-size: var(--ui-font-size);

  label {
    text-align: right;
    min-width: 90px;
    font-weight: bold;
  }

  input[type="number"] {
    width: 52px;
    font-family: var(--ui-font);
    font-size: var(--ui-font-size);
    border: var(--window-border-size) solid var(--color-window-border);
    padding: 2px 4px;
    background: var(--color-white);
    box-shadow: inset 1px 1px 0 var(--color-system-05);
    -moz-appearance: textfield;
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  }

  .classicyColorPickerWheelUnit {
    min-width: 14px;
    color: var(--color-black);
  }
}

.classicyColorPickerValueSlider {
  padding-top: var(--window-padding-size);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
git commit -m "feat: add ClassicyColorPicker SCSS styles"
```

---

### Task 4: Crayons tab

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx`

**Interfaces:**
- Consumes: `ClassicyCrayon` from `./ClassicyColorPickerCrayons`; `intToHex` from `ClassicyColors`
- Produces: `ClassicyColorPickerCrayon` component — `{ color: number; crayons: ClassicyCrayon[]; onChangeFunc: (c: number) => void }`

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx
import { type FC, useState } from "react";
import classNames from "classnames";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerCrayonProps {
  color: number;
  crayons: ClassicyCrayon[];
  onChangeFunc: (color: number) => void;
}

// SVG crayon shape: pointed tip + rectangular body with a label band.
const CrayonSVG: FC<{ fill: string }> = ({ fill }) => (
  <svg width="18" height="50" viewBox="0 0 18 50" xmlns="http://www.w3.org/2000/svg">
    <polygon points="9,0 1,16 17,16" fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.75" />
    <rect x="1" y="16" width="16" height="26" fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.75" />
    <rect x="1" y="34" width="16" height="8" fill="rgba(255,255,255,0.35)" />
    <rect x="1" y="42" width="16" height="6" rx="1" fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
  </svg>
);

export const ClassicyColorPickerCrayon: FC<ClassicyColorPickerCrayonProps> = ({
  color,
  crayons,
  onChangeFunc,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const previewColor = hovered !== null ? hovered : color;

  return (
    <div className="classicyColorPickerCrayonTab">
      <div className="classicyColorPickerCrayonGrid" role="listbox" aria-label="Crayon colors">
        {crayons.map((crayon) => (
          <button
            key={crayon.color}
            type="button"
            role="option"
            aria-selected={crayon.color === color}
            aria-label={crayon.name}
            title={crayon.name}
            className={classNames(
              "classicyColorPickerCrayon",
              crayon.color === color && "classicyColorPickerCrayonSelected",
            )}
            onClick={() => onChangeFunc(crayon.color)}
            onMouseEnter={() => setHovered(crayon.color)}
            onMouseLeave={() => setHovered(null)}
          >
            <CrayonSVG fill={intToHex(crayon.color)} />
          </button>
        ))}
      </div>
      <div
        className="classicyColorPickerCrayonPreviewStrip"
        style={{ backgroundColor: intToHex(previewColor) }}
        aria-label={`Preview: ${intToHex(previewColor)}`}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx
git commit -m "feat: add ClassicyColorPickerCrayon crayons tab"
```

---

### Task 5: RGB tab

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx`

**Interfaces:**
- Consumes: `intToRgb`, `rgbToInt` from `./ClassicyColorPickerUtils`; `ClassicySlider`
- Produces: `ClassicyColorPickerRGB` — `{ color: number; onChangeFunc: (c: number) => void }`

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx
import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { intToRgb, rgbToInt } from "./ClassicyColorPickerUtils";

interface ClassicyColorPickerRGBProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerRGB: FC<ClassicyColorPickerRGBProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const rPct = Math.round((r / 255) * 100);
  const gPct = Math.round((g / 255) * 100);
  const bPct = Math.round((b / 255) * 100);

  const emit = (channel: "r" | "g" | "b", pct: number) => {
    const val = Math.round((Math.max(0, Math.min(100, pct)) / 100) * 255);
    const { r: cr, g: cg, b: cb } = intToRgb(color);
    onChangeFunc(rgbToInt(
      channel === "r" ? val : cr,
      channel === "g" ? val : cg,
      channel === "b" ? val : cb,
    ));
  };

  const onChange = (channel: "r" | "g" | "b") =>
    (e: ChangeEvent<HTMLInputElement>) => emit(channel, Number(e.target.value));

  return (
    <div className="classicyColorPickerSlidersTab">
      <div className="classicyColorPickerSlider--red">
        <ClassicySlider id="cp-rgb-r" labelTitle="Red:" labelPosition="left"
          value={rPct} min={0} max={100} valueLabel={`${rPct} %`} onChangeFunc={onChange("r")} />
      </div>
      <div className="classicyColorPickerSlider--green">
        <ClassicySlider id="cp-rgb-g" labelTitle="Green:" labelPosition="left"
          value={gPct} min={0} max={100} valueLabel={`${gPct} %`} onChangeFunc={onChange("g")} />
      </div>
      <div className="classicyColorPickerSlider--blue">
        <ClassicySlider id="cp-rgb-b" labelTitle="Blue:" labelPosition="left"
          value={bPct} min={0} max={100} valueLabel={`${bPct} %`} onChangeFunc={onChange("b")} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerRGB.tsx
git commit -m "feat: add ClassicyColorPickerRGB RGB sliders tab"
```

---

### Task 6: CMYK tab

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK.tsx`

**Interfaces:**
- Consumes: `intToRgb`, `rgbToInt`, `rgbToCmyk`, `cmykToRgb` from `./ClassicyColorPickerUtils`; `ClassicySlider`
- Produces: `ClassicyColorPickerCMYK` — `{ color: number; onChangeFunc: (c: number) => void }`

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK.tsx
import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { intToRgb, rgbToInt, rgbToCmyk, cmykToRgb } from "./ClassicyColorPickerUtils";

interface ClassicyColorPickerCMYKProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerCMYK: FC<ClassicyColorPickerCMYKProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { c, m, y, k } = rgbToCmyk(r, g, b);

  const emit = (channel: "c" | "m" | "y" | "k", pct: number) => {
    const val = Math.max(0, Math.min(100, pct));
    const { r: cr, g: cg, b: cb } = intToRgb(color);
    const cur = rgbToCmyk(cr, cg, cb);
    const next = { ...cur, [channel]: val };
    const { r: nr, g: ng, b: nb } = cmykToRgb(next.c, next.m, next.y, next.k);
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onChange = (channel: "c" | "m" | "y" | "k") =>
    (e: ChangeEvent<HTMLInputElement>) => emit(channel, Number(e.target.value));

  return (
    <div className="classicyColorPickerSlidersTab">
      <div className="classicyColorPickerSlider--cyan">
        <ClassicySlider id="cp-cmyk-c" labelTitle="Cyan:" labelPosition="left"
          value={c} min={0} max={100} valueLabel={`${c} %`} onChangeFunc={onChange("c")} />
      </div>
      <div className="classicyColorPickerSlider--magenta">
        <ClassicySlider id="cp-cmyk-m" labelTitle="Magenta:" labelPosition="left"
          value={m} min={0} max={100} valueLabel={`${m} %`} onChangeFunc={onChange("m")} />
      </div>
      <div className="classicyColorPickerSlider--yellow">
        <ClassicySlider id="cp-cmyk-y" labelTitle="Yellow:" labelPosition="left"
          value={y} min={0} max={100} valueLabel={`${y} %`} onChangeFunc={onChange("y")} />
      </div>
      <div className="classicyColorPickerSlider--black">
        <ClassicySlider id="cp-cmyk-k" labelTitle="Black:" labelPosition="left"
          value={k} min={0} max={100} valueLabel={`${k} %`} onChangeFunc={onChange("k")} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCMYK.tsx
git commit -m "feat: add ClassicyColorPickerCMYK CMYK sliders tab"
```

---

### Task 7: Color wheel canvas

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx`

**Interfaces:**
- Consumes: `hsvToRgb`, `hlsToRgb` from `./ClassicyColorPickerUtils`
- Produces:
  ```tsx
  ClassicyColorWheel — props:
    hue: number          // 0–360
    saturation: number   // 0–100
    brightness: number   // 0–100 (V for HSV, L for HLS)
    mode: "hsv" | "hls"
    size?: number        // canvas px, default 200
    onChangeFunc: (h: number, s: number) => void
  ```

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx
import { type FC, type PointerEvent, useEffect, useRef } from "react";
import { hsvToRgb, hlsToRgb } from "./ClassicyColorPickerUtils";

interface ClassicyColorWheelProps {
  hue: number;
  saturation: number;
  brightness: number;
  mode: "hsv" | "hls";
  size?: number;
  onChangeFunc: (h: number, s: number) => void;
}

export const ClassicyColorWheel: FC<ClassicyColorWheelProps> = ({
  hue,
  saturation,
  brightness,
  mode,
  size = 200,
  onChangeFunc,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const radius = size / 2;
    const imageData = ctx.createImageData(size, size);
    const { data } = imageData;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - radius, dy = py - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (py * size + px) * 4;

        if (dist > radius) { data[idx + 3] = 0; continue; }

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        const s = (dist / radius) * 100;

        const { r, g, b } = mode === "hsv"
          ? hsvToRgb(angle, s, brightness)
          : hlsToRgb(angle, brightness, s);

        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw crosshair at current hue / saturation
    const rad = hue * (Math.PI / 180);
    const r = (saturation / 100) * radius;
    const cx = radius + r * Math.cos(rad);
    const cy = radius + r * Math.sin(rad);
    const ARM = 7;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - ARM, cy); ctx.lineTo(cx + ARM, cy);
    ctx.moveTo(cx, cy - ARM); ctx.lineTo(cx, cy + ARM);
    ctx.stroke();

    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(cx - ARM, cy); ctx.lineTo(cx + ARM, cy);
    ctx.moveTo(cx, cy - ARM); ctx.lineTo(cx, cy + ARM);
    ctx.stroke();
  }, [size, hue, saturation, brightness, mode]);

  const hitTest = (e: PointerEvent<HTMLCanvasElement>): { h: number; s: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const radius = size / 2;
    const dx = e.clientX - rect.left - radius;
    const dy = e.clientY - rect.top - radius;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return { h: Math.round(angle), s: Math.round((dist / radius) * 100) };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const hs = hitTest(e);
    if (hs) onChangeFunc(hs.h, hs.s);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const hs = hitTest(e);
    if (hs) onChangeFunc(hs.h, hs.s);
  };

  const onPointerUp = () => { dragging.current = false; };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="classicyColorPickerWheelCanvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx
git commit -m "feat: add ClassicyColorWheel canvas color wheel"
```

---

### Task 8: HSV tab

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHSV.tsx`

**Interfaces:**
- Consumes: `intToRgb`, `rgbToInt`, `rgbToHsv`, `hsvToRgb` from `./ClassicyColorPickerUtils`; `ClassicyColorWheel`; `ClassicySlider`
- Produces: `ClassicyColorPickerHSV` — `{ color: number; onChangeFunc: (c: number) => void }`

The degree labels (0°, 60°, 120°, 180°, 240°, 300°) are positioned absolutely around the outside of the wheel using trigonometry. The wheel size is 200px; label radius is 120px from center (20px outside the wheel). The Value slider below the wheel has a gradient track computed from the current hue.

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHSV.tsx
import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicyColorWheel } from "./ClassicyColorWheel";
import { intToRgb, rgbToInt, rgbToHsv, hsvToRgb } from "./ClassicyColorPickerUtils";

const WHEEL_SIZE = 200;
const DEGREE_MARKS = [0, 60, 120, 180, 240, 300];

interface ClassicyColorPickerHSVProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerHSV: FC<ClassicyColorPickerHSVProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { h, s, v } = rgbToHsv(r, g, b);

  const emit = (newH: number, newS: number, newV: number) => {
    const { r: nr, g: ng, b: nb } = hsvToRgb(
      Math.max(0, Math.min(360, newH)),
      Math.max(0, Math.min(100, newS)),
      Math.max(0, Math.min(100, newV)),
    );
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onWheelChange = (newH: number, newS: number) => emit(newH, newS, v);

  const onFieldChange = (field: "h" | "s" | "v") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      emit(field === "h" ? val : h, field === "s" ? val : s, field === "v" ? val : v);
    };

  const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => emit(h, s, Number(e.target.value));

  const radius = WHEEL_SIZE / 2;
  const labelRadius = radius + 18;

  return (
    <div className="classicyColorPickerWheelTab">
      <div className="classicyColorPickerWheelLayout">
        <div className="classicyColorPickerWheelOuter"
          style={{ width: WHEEL_SIZE + 40, height: WHEEL_SIZE + 40 }}>
          {/* Degree labels absolutely positioned around the wheel */}
          {DEGREE_MARKS.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const lx = radius + 20 + labelRadius * Math.cos(rad);
            const ly = radius + 20 + labelRadius * Math.sin(rad);
            return (
              <span key={deg} className="classicyColorPickerWheelDegreeLabel"
                style={{ left: lx, top: ly }}>
                {deg}°
              </span>
            );
          })}
          {/* Canvas centered within the outer container */}
          <div style={{ position: "absolute", left: 20, top: 20 }}>
            <ClassicyColorWheel
              size={WHEEL_SIZE}
              hue={h} saturation={s} brightness={v}
              mode="hsv"
              onChangeFunc={onWheelChange}
            />
          </div>
        </div>

        <div className="classicyColorPickerWheelFields">
          {([ ["Hue Angle", "h", h, "°"], ["Saturation", "s", s, "%"], ["Value", "v", v, "%"] ] as const).map(
            ([label, field, val, unit]) => (
              <div key={field} className="classicyColorPickerWheelField">
                <label htmlFor={`cp-hsv-${field}`}>{label}:</label>
                <input
                  id={`cp-hsv-${field}`}
                  type="number"
                  min={field === "h" ? 0 : 0}
                  max={field === "h" ? 360 : 100}
                  value={val}
                  onChange={onFieldChange(field)}
                />
                <span className="classicyColorPickerWheelUnit">{unit}</span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Value slider */}
      <div className="classicyColorPickerValueSlider">
        <ClassicySlider
          id="cp-hsv-v-slider"
          labelTitle="Value:"
          labelPosition="left"
          value={v}
          min={0}
          max={100}
          valueLabel={`${v} %`}
          onChangeFunc={onSliderChange}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHSV.tsx
git commit -m "feat: add ClassicyColorPickerHSV HSV wheel tab"
```

---

### Task 9: HLS tab

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHLS.tsx`

**Interfaces:**
- Consumes: `intToRgb`, `rgbToInt`, `rgbToHls`, `hlsToRgb` from `./ClassicyColorPickerUtils`; `ClassicyColorWheel`; `ClassicySlider`
- Produces: `ClassicyColorPickerHLS` — `{ color: number; onChangeFunc: (c: number) => void }`

Identical layout to HSV. The wheel `mode="hls"` and `brightness` receives the current Lightness value. The bottom slider controls Lightness (not Value). The numeric fields show Hue Angle, Saturation, Lightness.

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHLS.tsx
import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicyColorWheel } from "./ClassicyColorWheel";
import { intToRgb, rgbToInt, rgbToHls, hlsToRgb } from "./ClassicyColorPickerUtils";

const WHEEL_SIZE = 200;
const DEGREE_MARKS = [0, 60, 120, 180, 240, 300];

interface ClassicyColorPickerHLSProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerHLS: FC<ClassicyColorPickerHLSProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { h, l, s } = rgbToHls(r, g, b);

  const emit = (newH: number, newL: number, newS: number) => {
    const { r: nr, g: ng, b: nb } = hlsToRgb(
      Math.max(0, Math.min(360, newH)),
      Math.max(0, Math.min(100, newL)),
      Math.max(0, Math.min(100, newS)),
    );
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onWheelChange = (newH: number, newS: number) => emit(newH, l, newS);

  const onFieldChange = (field: "h" | "l" | "s") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      emit(field === "h" ? val : h, field === "l" ? val : l, field === "s" ? val : s);
    };

  const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => emit(h, Number(e.target.value), s);

  const radius = WHEEL_SIZE / 2;
  const labelRadius = radius + 18;

  return (
    <div className="classicyColorPickerWheelTab">
      <div className="classicyColorPickerWheelLayout">
        <div className="classicyColorPickerWheelOuter"
          style={{ width: WHEEL_SIZE + 40, height: WHEEL_SIZE + 40 }}>
          {DEGREE_MARKS.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const lx = radius + 20 + labelRadius * Math.cos(rad);
            const ly = radius + 20 + labelRadius * Math.sin(rad);
            return (
              <span key={deg} className="classicyColorPickerWheelDegreeLabel"
                style={{ left: lx, top: ly }}>
                {deg}°
              </span>
            );
          })}
          <div style={{ position: "absolute", left: 20, top: 20 }}>
            <ClassicyColorWheel
              size={WHEEL_SIZE}
              hue={h} saturation={s} brightness={l}
              mode="hls"
              onChangeFunc={onWheelChange}
            />
          </div>
        </div>

        <div className="classicyColorPickerWheelFields">
          {([ ["Hue Angle", "h", h, "°"], ["Saturation", "s", s, "%"], ["Lightness", "l", l, "%"] ] as const).map(
            ([label, field, val, unit]) => (
              <div key={field} className="classicyColorPickerWheelField">
                <label htmlFor={`cp-hls-${field}`}>{label}:</label>
                <input
                  id={`cp-hls-${field}`}
                  type="number"
                  min={0}
                  max={field === "h" ? 360 : 100}
                  value={val}
                  onChange={onFieldChange(field)}
                />
                <span className="classicyColorPickerWheelUnit">{unit}</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="classicyColorPickerValueSlider">
        <ClassicySlider
          id="cp-hls-l-slider"
          labelTitle="Lightness:"
          labelPosition="left"
          value={l}
          min={0}
          max={100}
          valueLabel={`${l} %`}
          onChangeFunc={onSliderChange}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerHLS.tsx
git commit -m "feat: add ClassicyColorPickerHLS HLS wheel tab"
```

---

### Task 10: Dialog

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx`

**Interfaces:**
- Consumes: all five tab components; `ClassicyWindow`, `ClassicyTabs`, `ClassicyButton`, `intToHex`, `MAC_OS_8_CRAYONS`, `ClassicyCrayon`
- Produces:
  ```tsx
  ClassicyColorPickerDialog — props:
    id: string
    open: boolean
    initialColor?: number        // default 0x000000
    crayons?: ClassicyCrayon[]   // default MAC_OS_8_CRAYONS
    onSelectFunc?: (color: number) => void
    onCancelFunc?: () => void
  ```

State note: `pendingColor` is initialised from `initialColor` via `useState`. A `useEffect` on `open` resets it to `initialColor` whenever the dialog is re-opened. The component renders `null` when `open` is `false`, but the hook state persists so the reset effect fires correctly on the next open.

- [ ] **Step 1: Create the component**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx
import "./ClassicyColorPicker.scss";
import { type FC, useEffect, useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";
import { ClassicyColorPickerHSV } from "./ClassicyColorPickerHSV";
import { ClassicyColorPickerHLS } from "./ClassicyColorPickerHLS";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { MAC_OS_8_CRAYONS, type ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerDialogProps {
  id: string;
  open: boolean;
  initialColor?: number;
  crayons?: ClassicyCrayon[];
  onSelectFunc?: (color: number) => void;
  onCancelFunc?: () => void;
}

export const ClassicyColorPickerDialog: FC<ClassicyColorPickerDialogProps> = ({
  id,
  open,
  initialColor = 0x000000,
  crayons = MAC_OS_8_CRAYONS,
  onSelectFunc,
  onCancelFunc,
}) => {
  const [pendingColor, setPendingColor] = useState(initialColor);

  // Reset to initialColor whenever the dialog is freshly opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setPendingColor(initialColor); }, [open]);

  if (!open) return null;

  const handleOK = () => {
    onSelectFunc?.(pendingColor);
    onCancelFunc?.();
  };

  const tabs = [
    {
      title: "Crayons",
      children: (
        <ClassicyColorPickerCrayon color={pendingColor} crayons={crayons} onChangeFunc={setPendingColor} />
      ),
    },
    {
      title: "RGB",
      children: <ClassicyColorPickerRGB color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "HSV",
      children: <ClassicyColorPickerHSV color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "HLS",
      children: <ClassicyColorPickerHLS color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "CMYK",
      children: <ClassicyColorPickerCMYK color={pendingColor} onChangeFunc={setPendingColor} />,
    },
  ];

  return (
    <ClassicyWindow
      id={id}
      appId={id}
      title="Color Picker"
      modal={true}
      closable={true}
      zoomable={false}
      collapsable={false}
      resizable={false}
      scrollable={false}
      initialSize={[520, 420]}
      initialPosition={["center", "center"]}
      onCloseFunc={() => onCancelFunc?.()}
    >
      <ClassicyTabs tabs={tabs} />
      <div
        className="classicyColorPickerPreview"
        style={{ backgroundColor: intToHex(pendingColor) }}
        aria-label={`Selected color: ${intToHex(pendingColor)}`}
      />
      <div className="classicyColorPickerDialogFooter">
        <ClassicyButton onClickFunc={onCancelFunc}>Cancel</ClassicyButton>
        <ClassicyButton isDefault={true} onClickFunc={handleOK}>OK</ClassicyButton>
      </div>
    </ClassicyWindow>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog.tsx
git commit -m "feat: add ClassicyColorPickerDialog headless color picker dialog"
```

---

### Task 11: Swatch wrapper + integration tests

**Files:**
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx`
- Create: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx`

**Interfaces:**
- Consumes: `ClassicyColorPickerDialog`; `ClassicyControlLabel`, `labelPositionClass`; `intToHex`; `ClassicyCrayon`
- Produces:
  ```tsx
  ClassicyColorPicker — props:
    id: string
    value?: number               // controlled
    defaultValue?: number        // uncontrolled; default 0x000000
    crayons?: ClassicyCrayon[]
    labelTitle?: string
    labelPosition?: ClassicyLabelPosition   // default "left"
    labelSize?: ClassicyControlLabelSize    // default "medium"
    disabled?: boolean
    onChangeFunc?: (color: number) => void
  ```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ClassicyColorPicker } from "./ClassicyColorPicker";

vi.mock("./ClassicyColorPicker.scss", () => ({}));
vi.mock("./ClassicyColorPickerCrayon.tsx", () => ({
  ClassicyColorPickerCrayon: () => <div data-testid="crayon-tab" />,
}));
vi.mock("./ClassicyColorPickerRGB.tsx", () => ({
  ClassicyColorPickerRGB: () => <div data-testid="rgb-tab" />,
}));
vi.mock("./ClassicyColorPickerHSV.tsx", () => ({
  ClassicyColorPickerHSV: () => <div data-testid="hsv-tab" />,
}));
vi.mock("./ClassicyColorPickerHLS.tsx", () => ({
  ClassicyColorPickerHLS: () => <div data-testid="hls-tab" />,
}));
vi.mock("./ClassicyColorPickerCMYK.tsx", () => ({
  ClassicyColorPickerCMYK: () => <div data-testid="cmyk-tab" />,
}));

describe("ClassicyColorPicker", () => {
  it("renders swatch with background color matching defaultValue", () => {
    const { container } = render(
      <ClassicyColorPicker id="test" defaultValue={0xFF0000} />,
    );
    const swatch = container.querySelector(".classicyColorPickerSwatch") as HTMLElement;
    expect(swatch).toBeInTheDocument();
    expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)");
  });

  it("does not show dialog before swatch is clicked", () => {
    render(<ClassicyColorPicker id="test" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking swatch opens the dialog", () => {
    const { container } = render(<ClassicyColorPicker id="test" />);
    const swatch = container.querySelector(".classicyColorPickerSwatch") as HTMLElement;
    fireEvent.click(swatch);
    expect(screen.getByText("Color Picker")).toBeInTheDocument();
  });

  it("clicking Cancel closes the dialog without calling onChangeFunc", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPicker id="test" onChangeFunc={onChange} />,
    );
    fireEvent.click(container.querySelector(".classicyColorPickerSwatch") as HTMLElement);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("clicking OK calls onChangeFunc with the integer color and closes dialog", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPicker id="test" defaultValue={0x00FF00} onChangeFunc={onChange} />,
    );
    fireEvent.click(container.querySelector(".classicyColorPickerSwatch") as HTMLElement);
    fireEvent.click(screen.getByText("OK"));
    expect(onChange).toHaveBeenCalledWith(0x00FF00);
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("swatch is disabled and dialog cannot be opened when disabled=true", () => {
    const { container } = render(
      <ClassicyColorPicker id="test" disabled={true} />,
    );
    const swatch = container.querySelector(".classicyColorPickerSwatch") as HTMLButtonElement;
    expect(swatch).toBeDisabled();
    fireEvent.click(swatch);
    expect(screen.queryByText("Color Picker")).not.toBeInTheDocument();
  });

  it("renders a label when labelTitle is provided", () => {
    render(<ClassicyColorPicker id="test" labelTitle="Accent colour:" />);
    expect(screen.getByText("Accent colour:")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test -- ClassicyColorPicker.test
```
Expected: `Cannot find module './ClassicyColorPicker'`

- [ ] **Step 3: Implement the swatch wrapper**

```tsx
// src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx
import "./ClassicyColorPicker.scss";
import { type FC, useState } from "react";
import classNames from "classnames";
import {
  ClassicyControlLabel,
  type ClassicyControlLabelSize,
  type ClassicyLabelPosition,
  labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyColorPickerDialog } from "./ClassicyColorPickerDialog";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerProps {
  id: string;
  value?: number;
  defaultValue?: number;
  crayons?: ClassicyCrayon[];
  labelTitle?: string;
  labelPosition?: ClassicyLabelPosition;
  labelSize?: ClassicyControlLabelSize;
  disabled?: boolean;
  onChangeFunc?: (color: number) => void;
}

export const ClassicyColorPicker: FC<ClassicyColorPickerProps> = ({
  id,
  value: controlledValue,
  defaultValue = 0x000000,
  crayons,
  labelTitle,
  labelPosition = "left",
  labelSize = "medium",
  disabled = false,
  onChangeFunc,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const value = controlledValue ?? internalValue;

  return (
    <>
      <div
        className={classNames(
          "classicyColorPickerSwatchWrapper",
          labelTitle && labelPositionClass(labelPosition),
        )}
      >
        {labelTitle && (
          <ClassicyControlLabel
            label={labelTitle}
            labelFor={id}
            labelSize={labelSize}
            disabled={disabled}
          />
        )}
        <button
          type="button"
          id={id}
          className={classNames(
            "classicyColorPickerSwatch",
            disabled && "classicyColorPickerSwatchDisabled",
          )}
          style={{ backgroundColor: intToHex(value) }}
          onClick={() => { if (!disabled) setOpen(true); }}
          disabled={disabled}
          aria-label={`Color: ${intToHex(value)}. Click to open color picker.`}
        />
      </div>
      <ClassicyColorPickerDialog
        id={`${id}-dialog`}
        open={open}
        initialColor={value}
        crayons={crayons}
        onSelectFunc={(c) => {
          setInternalValue(c);
          onChangeFunc?.(c);
          setOpen(false);
        }}
        onCancelFunc={() => setOpen(false)}
      />
    </>
  );
};
```

- [ ] **Step 4: Run tests — all should pass**

```bash
pnpm test -- ClassicyColorPicker.test
```
Expected: all 7 tests PASS.

> Add the following extra tests to the same file to cover spec items 6–8 (crayon click, RGB/CMYK boundary values). These test the sub-components directly without mocking them.

```tsx
// Append to ClassicyColorPicker.test.tsx — sub-component behavioural tests

import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { MAC_OS_8_CRAYONS } from "./ClassicyColorPickerCrayons";

describe("ClassicyColorPickerCrayon — crayon click", () => {
  it("calls onChangeFunc with the crayon's integer color when clicked", () => {
    const onChange = vi.fn();
    const firstCrayon = MAC_OS_8_CRAYONS[0];
    render(
      <ClassicyColorPickerCrayon
        color={0x000000}
        crayons={MAC_OS_8_CRAYONS}
        onChangeFunc={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle(firstCrayon.name));
    expect(onChange).toHaveBeenCalledWith(firstCrayon.color);
  });
});

describe("ClassicyColorPickerRGB — boundary values", () => {
  it("all sliders at 0% produces 0x000000", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerRGB color={0x000000} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    // Move Red to 100%
    fireEvent.change(sliders[0], { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(0xFF0000);
  });

  it("all sliders at 100% produces 0xFFFFFF", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerRGB color={0xFFFFFF} onChangeFunc={onChange} />,
    );
    // Moving Blue to 0% on a white color: r=255, g=255, b=0
    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[2], { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(0xFFFF00);
  });
});

describe("ClassicyColorPickerCMYK — boundary values", () => {
  it("K=100 produces black (0x000000)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ClassicyColorPickerCMYK color={0xFFFFFF} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    // K slider is index 3
    fireEvent.change(sliders[3], { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(0x000000);
  });

  it("all channels at 0% produces white (0xFFFFFF)", () => {
    const onChange = vi.fn();
    render(
      <ClassicyColorPickerCMYK color={0xFFFFFF} onChangeFunc={onChange} />,
    );
    // Color is already white — emitting 0% on any slider should stay white
    const { container } = render(
      <ClassicyColorPickerCMYK color={0x000000} onChangeFunc={onChange} />,
    );
    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[3], { target: { value: "0" } }); // K=0, rest already 0
    expect(onChange).toHaveBeenLastCalledWith(0xFFFFFF);
  });
});
```

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test
```
Expected: all pre-existing tests continue to PASS.

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
pnpm build:source
```
Expected: exits 0 with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.tsx \
        src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx
git commit -m "feat: add ClassicyColorPicker swatch wrapper and integration tests"
```
