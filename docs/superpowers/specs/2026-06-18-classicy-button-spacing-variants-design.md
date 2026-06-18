# ClassicyButton Spacing Variants — Design

**Date:** 2026-06-18
**Component:** `src/SystemFolder/SystemResources/Button/ClassicyButton.{tsx,scss}`

## Problem

`ClassicyButton` hardcodes its `margin` and `padding` in SCSS (derived from
`--window-padding-size`), regardless of the chosen `buttonShape` / `buttonSize`.
Consumers cannot tune a button's spacing. We want an optional, theme-aware way to
set margin and padding using a `sm | md | lg | xl` scale built on top of the
existing CSS size variable.

## Goals

- Let consumers optionally set a button's `padding` and `margin` via a
  `sm | md | lg | xl` scale.
- Base the scale on the existing `--window-padding-size` CSS custom property so it
  tracks the active theme automatically.
- Keep existing buttons visually identical (no regression) when the new props are
  not supplied.

## Non-Goals

- Reworking the existing `buttonSize` prop (which only affects font-size /
  border-radius today). It stays as-is.
- Allowing arbitrary numeric/string spacing values — only the four named variants.
- Changing square (icon) button geometry.

## API

Two new optional props on `ClassicyButtonProps`, both defaulting to `"md"`:

```ts
padding?: "sm" | "md" | "lg" | "xl"; // default "md"
margin?:  "sm" | "md" | "lg" | "xl"; // default "md"
```

Defaulting to `"md"` (rather than `undefined`) lets the scale be the single source
of truth for spacing — the hardcoded values are removed from `.classicyButton` and
`.classicyButtonDefault`, and `"md"` reproduces them exactly.

## Scale

Let `p = var(--window-padding-size)`. Padding is asymmetric (`vertical horizontal`)
to match today's `calc(p/2) p`. Margin is uniform.

| variant | multiplier | padding (`vert horiz`)      | margin    |
|---------|-----------|------------------------------|-----------|
| sm      | 0.5×      | `calc(p/4)  calc(p/2)`        | `calc(p*0.5)` |
| **md**  | **1×**    | `calc(p/2)  p`               | `p`       |
| lg      | 1.5×      | `calc(p*0.75)  calc(p*1.5)`  | `calc(p*1.5)` |
| xl      | 2×        | `p  calc(p*2)`               | `calc(p*2)`   |

The `md` row is exactly the current hardcoded spacing.

## SCSS Structure

- Remove the duplicated hardcoded `margin` / `padding` declarations from
  `.classicyButton` and `.classicyButtonDefault`.
- Generate the variant classes with a single `@each` loop over a
  `(name: multiplier)` map so the scale lives in one place:
  - `.classicyButtonPaddingSm|Md|Lg|Xl`
  - `.classicyButtonMarginSm|Md|Lg|Xl`
- Leave `.classicyButtonShapeSquare { padding: 0 }` and the
  `.classicyButtonShapeSquare.classicyButtonSmall` padding override untouched.

## Square (icon button) Interaction

When `buttonShape === "square"`, the TSX does **not** emit a `classicyButtonPadding*`
class at all, so the existing `padding: 0` / aspect-ratio rules remain authoritative.
The `classicyButtonMargin*` class is still emitted for square buttons. This keeps the
cascade flat — no `:not()` selectors or specificity tie-breaking required.

## TSX Changes

- Add `padding = "md"` and `margin = "md"` to the destructured props (with the new
  type entries).
- In the `classNames(...)` call, append:
  - `classicyButtonMargin${capitalize(margin)}` always.
  - `classicyButtonPadding${capitalize(padding)}` only when
    `buttonShape !== "square"`.
- Map variant → class via a small lookup object (avoids dynamic class string
  fragility and keeps it readable).

## Backward Compatibility

Existing call sites pass neither prop → both default to `"md"` → identical rendered
spacing. Square buttons get `margin "md"` (today's effective margin) and keep
`padding: 0`. No visual regression expected.

## Testing

Extend `ClassicyButton.test.tsx`:
- Renders default button → has `classicyButtonPaddingMd` and `classicyButtonMarginMd`.
- `padding="lg"` → has `classicyButtonPaddingLg`, not `...Md`.
- `margin="xl"` → has `classicyButtonMarginXl`.
- `buttonShape="square"` with `padding="lg"` → does **not** have any
  `classicyButtonPadding*` class; still has the margin class.
