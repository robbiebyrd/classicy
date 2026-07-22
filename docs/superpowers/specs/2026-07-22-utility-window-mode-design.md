# Utility (Tool-Palette) Window Mode

**Date:** 2026-07-22
**Component:** `ClassicyWindow`
**Status:** Approved — ready for implementation plan

## Summary

Complete the existing `windowType="utility"` feature so a utility window renders
as a compact Mac OS 8 tool palette ("windoid"): a **half-height** title bar with
**no title text and no icon** — just the crosshatch drag region and the window
control boxes. Reference appearance: `tool-1.png` (floating tool palette) and
`tool-2.png` ("About Help" windoid, where the title text is a *header below* the
bar, not inside it).

## Background — what already exists

`windowType?: "document" | "utility"` is already a prop on `ClassicyWindow`
(`ClassicyWindow.tsx:133`) and is ~70% wired up:

- Applies the `.classicyWindowUtility` CSS class (`ClassicyWindow.tsx:920`).
- Keeps the window **un-dimmed while unfocused** — a floating palette always
  shows active chrome (`isActive()` returns `true` for utility, `ClassicyWindow.tsx:604`).
  Covered by `ClassicyWindow.utility.test.tsx` (3 dimming tests).
- Paints a crosshatch/pinstripe top drag region instead of the document
  pinstripe (`ClassicyWindow.scss:486`).

**What is missing (this spec):**

1. The utility title bar is still full height — `min-height: var(--hig-titlebar-height)`
   (19px), the same as a document window (`ClassicyWindow.scss:488`).
2. Title text and icon are consumer-driven: any non-empty `title` prop paints
   text + icon in the bar (`ClassicyWindow.tsx:985`). Nothing enforces the
   title-less/icon-less windoid look.

## Requirements

- R1 — Utility title bar height is **half** the document title bar (~19px → ~10px).
- R2 — Utility windows render **no title text and no icon** in the title bar,
  regardless of the `title` / `icon` / `hideIcon` props a consumer passes.
- R3 — Control boxes (close / zoom / collapse) shrink to fit the shorter bar and
  keep their Platinum bevel and behavior.
- R4 — Existing utility behavior is preserved: never dims when unfocused; drag,
  collapse, and zoom still work.

## Design

### 1. Theme variable (`ClassicyAppearance.ts`)

Add a themeable HIG variable next to the existing document title-bar height
(`ClassicyAppearance.ts:193`):

```ts
"--hig-titlebar-height": intToPx(19),          // document window title bar
"--hig-titlebar-height-utility": intToPx(10),  // utility (tool-palette) title bar
```

Rationale: matches the codebase's HIG-var pattern and lets themes override the
windoid height independently.

### 2. Component (`ClassicyWindow.tsx`)

In the title-bar JSX (`ClassicyWindow.tsx:~985`), branch on `windowType`:

- When `windowType === "utility"`: always render the empty
  `classicyWindowTitleCenter` crosshatch variant. Do **not** render
  `classicyWindowTitleText` or `classicyWindowIcon`, even if `title` is
  non-empty and `hideIcon` is `false`.
- When `windowType === "document"` (default): unchanged — the existing
  `title !== ""` branch renders text + icon.

The `title` prop is still **accepted and used** for the window's accessible name
(`aria-label`) and analytics; it is simply never painted inside a utility bar.
Control boxes (close/zoom/collapse), edge-drag handles, and all event handlers
remain unchanged.

### 3. Styles (`ClassicyWindow.scss`, `.classicyWindowUtility` block ~486)

- Set `min-height: var(--hig-titlebar-height-utility)` on
  `.classicyWindowUtility .classicyWindowTitleBar` (replaces the current
  `var(--hig-titlebar-height)`).
- Shrink `.classicyWindowUtility .classicyWindowControlBox` height/width to fit
  the shorter bar — approximately
  `calc(var(--hig-titlebar-height-utility) - var(--window-border-size) * 2)` —
  preserving the Platinum bevel (`platinumBoxShadow` / depressable control mixins).
- Vertically center the crosshatch region within the shorter bar (adjust the
  `classicyWindowTitleCenter` height/margin used in the utility block).

The existing utility rules that blank out the pinstripe background image of
`classicyWindowTitleLeft/Right/Center` stay as-is.

### 4. Tests (`ClassicyWindow.utility.test.tsx`)

Keep the 3 existing dimming tests green. Add:

- Given `windowType="utility"` **with a non-empty `title` prop**, the rendered
  title bar contains **no** `.classicyWindowTitleText` and **no**
  `.classicyWindowIcon`.
- Given `windowType="utility"`, the title bar contains a
  `.classicyWindowTitleCenter` element.
- Regression: a `windowType="document"` window **with** a `title` prop still
  renders `.classicyWindowTitleText`.

### 5. Storybook (`ClassicyWindow.stories.tsx`)

Add a "Utility Palette" story: a `windowType="utility"` window whose body is a
2-column icon-button grid, echoing `tool-1.png`, to visually verify the compact
bar and title-less chrome.

## Out of scope (YAGNI)

- Drag-tabbing / docking of palettes together.
- A separate windoid z-order layer beyond the existing float/never-dim behavior.
- Any change to window resizing behavior.

## Acceptance criteria

- A `windowType="utility"` window shows a ~10px title bar (half the document
  bar), no title text, no icon, with functional close/zoom/collapse controls.
- Passing a `title` prop to a utility window does not paint text or an icon in
  the bar, but the title still feeds the accessible name.
- All existing `ClassicyWindow` tests pass; new utility tests pass.
