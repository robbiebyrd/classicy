# ClassicyControlGroup Legend Background — Design

**Date:** 2026-07-16
**Status:** Approved

## Problem

`ClassicyControlGroup` renders its label as an absolutely-positioned `<legend>`
overlapping the fieldset's groove border (a deliberate choice to avoid
engine-specific native legend layout — see the comments in
`ClassicyControlGroup.scss`). Because the legend is no longer a native
"rendered legend", the browser does not notch the border behind it, so the
groove line shows through underneath the label text.

## Solution

Add a `backgroundColor?: string` prop to `ClassicyControlGroupProps`, applied
to the `<legend>` via `style={{ backgroundColor }}`. The legend paints over
the border with the same color as the surface behind it.

### API

```tsx
type ClassicyControlGroupProps = {
    label: string;
    columns?: boolean;
    layout?: "default" | "form";
    backgroundColor?: string; // any CSS color value
    children: ReactNode;
};
```

- **Default:** `"var(--color-system-03)"` — the standard `ClassicyWindow`
  content background. Every existing usage is fixed with no call-site
  changes, and the color tracks all themes automatically.
- **Override:** consumers on a non-standard surface pass their surface color,
  e.g. `backgroundColor="#fff"`.
- When `label` is empty no legend renders, so the prop has no effect.

### SCSS

`.classicyControlGroupLegend` gains horizontal padding
(`padding: 0 calc(var(--window-padding-size) / 2)`) so the painted background
extends slightly past the text and cleanly masks the border on both sides.
The `left` offset is reduced by the same amount so the text keeps its
current alignment with the fieldset's horizontal padding.

## Testing

- Unit tests in `ClassicyControlGroup.test.tsx`:
  - legend has `background-color: var(--color-system-03)` when the prop is
    omitted;
  - legend has the custom value when the prop is provided.
- Storybook: add a story variant demonstrating a custom `backgroundColor`.

## Out of Scope

- No changes to fieldset border rendering or legend positioning strategy.
- No CSS-custom-property override channel (the prop is the override
  mechanism).
