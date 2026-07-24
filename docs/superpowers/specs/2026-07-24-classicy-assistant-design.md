# ClassicyAssistant — Design Spec

**Date:** 2026-07-24
**Status:** Approved (brainstorming)

## Overview

`ClassicyAssistant` is a Mac OS 8 (Platinum) "wizard"/assistant component that
renders inside a `ClassicyWindow` and fills its content area. It pages through a
sequence of steps with previous/next navigation, a per-page header, a body
region for arbitrary content, and a footer bar carrying optional action buttons
and the page navigator.

Visual references: `1.png` (compact "About Help" style) and `2.png` ("Mac OS
Setup Assistant") in the repo root.

## Goals

- A self-contained component that occupies 100% of a window's content area.
- Works unchanged in every window mode (document, utility, zoomable,
  resizable). Window capabilities — including whether the window can collapse —
  remain the *consumer's* choice on `ClassicyWindow` (e.g. a utility window is
  mounted with `collapsable={false}`, as is already the norm).
- Linear page navigation (prev/next), with each page contributing its own header
  title + optional icon and its own body content.
- Optional footer action buttons (up to 3) on the left of the footer bar.

## Non-Goals

- No built-in "Finish/Done" affordance or `onFinish` prop. On the last page the
  next arrow simply disables; a consumer that needs completion adds a footer
  button to the last page (per-page buttons make this trivial). This keeps the
  component faithful to the reference screenshots.
- No controlled-page mode. State is uncontrolled (see below).
- The auto-generated barrel `index.ts` is not hand-edited.

## Composition

Mounted as the sole child of a `ClassicyWindow`:

```tsx
<ClassicyWindow
  id="setup"
  appId="setup"
  title="Mac OS Setup Assistant"
  resizable
  zoomable
>
  <ClassicyAssistant pages={pages} buttons={globalButtons} onPageChange={fn} />
</ClassicyWindow>
```

The component is a CSS flex column of three regions filling the content area:

```
┌ window title bar (ClassicyWindow) ────[▓▓]─┐  ← accessoryIcon (lg) hovers up
├────────────────────────────────────────────┤
│ header:  [i] Introduction        [accessory]│  fixed height
├────────────────────────────────────────────┤
│ body:    <page content>                     │  flex-grow, scrolls
│                                              │
├────────────────────────────────────────────┤
│ footer:  [b1][b2][b3]        ◀  1  ▶         │  fixed height
└─────────────────────────────────────────────┘
```

The Assistant draws its own header bar (it does **not** use the window's
`header` prop), so the whole assistant is a single self-contained child.

### Header icons

Each page can supply **two independent icons** in the header:

- **`labelIcon`** — small, rendered immediately to the left of the header title
  text (the `[i]` above). Sized to the header text height.
- **`accessoryIcon`** — large, rendered at the right edge of the header (the
  `[accessory]` above). Its size is a preset (`sm` / `md` / `lg`). It is
  **bottom-anchored** to the header, so at the `lg` size it grows tall enough to
  overflow the header's top edge and "hover" up over the title-bar area, as in
  screenshot 2 (the Finder-and-wrench badge). `sm`/`md` sit within the header
  bounds; `lg` overflows upward.

## API

```ts
interface ClassicyAssistantButton {
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ClassicyAssistantPage {
  /** Header-bar text, e.g. "Introduction". */
  title: string;
  /** Small icon shown immediately left of the header title text. */
  labelIcon?: string;
  /** Large icon shown at the right edge of the header. */
  accessoryIcon?: string;
  /**
   * Size preset for `accessoryIcon` (default "sm"). "lg" grows the icon tall
   * enough to overflow the header's top edge and hover over the title bar.
   */
  accessoryIconSize?: "sm" | "md" | "lg";
  /** Body content for this page. */
  content: ReactNode;
  /** Per-page footer buttons; when present, override the global `buttons`. Max 3. */
  buttons?: ClassicyAssistantButton[];
  /** Gate for advancing off this page. Returning false blocks "next" (beeps). */
  canAdvance?: () => boolean;
}

interface ClassicyAssistantProps {
  pages: ClassicyAssistantPage[];
  /** Global default footer buttons, shown when a page has no `buttons`. Max 3. */
  buttons?: ClassicyAssistantButton[];
  /** Initial page index (default 0). */
  initialPage?: number;
  /** Fired after the page changes, with the new index. */
  onPageChange?: (index: number) => void;
}
```

### State

- **Uncontrolled.** Internal `currentPage` state, seeded from `initialPage`
  (clamped to `[0, pages.length - 1]`).
- Advancing/retreating updates internal state and fires `onPageChange(index)`.

### Footer buttons

- Resolution per page: `page.buttons ?? props.buttons ?? []`.
- Rendered with the shared `ClassicyButton` primitive (inherits Platinum press
  states, sounds, spacing). `ClassicyButton` uses `onClickFunc` and `disabled`.
- **Max 3.** If more than 3 are supplied, the extras are dropped and a
  `console.warn` is emitted (no silent truncation).

### Navigation gate

- Pressing next calls the current page's `canAdvance?.()`.
  - `undefined` → always allowed.
  - `false` → play `ClassicySoundPlayError`; stay on the current page.
  - `true` → advance.
- Previous is never gated.

## Navigation & Footer Behavior

- **Page indicator:** shows the *current page number only* (1-based), matching
  the screenshots (e.g. "1", not "1 of 3").
- **Ends (no wrap):** the previous arrow is disabled + dimmed on the first page;
  the next arrow is disabled + dimmed on the last page.
- **Sound:** a page change plays a short click sound (reusing the closest
  existing tab/window UI sound; final choice made against the sound sprite
  manifest during implementation).

## Accessibility

- Prev/Next are real `<button>` elements with `aria-label` ("Previous page" /
  "Next page") and `disabled` at the ends.
- Left/Right arrow keys navigate pages when focus is within the assistant
  (respecting the same gate/ends rules as the buttons).
- The header region is `role="region"` with `aria-live="polite"` so the page
  title is announced on change without a focus jump.
- The body is wrapped in `role="group"` labelled by the header title.
- Both header icons (`labelIcon`, `accessoryIcon`) are decorative
  (`alt=""`, `aria-hidden`) — the header title text carries the meaning.

## Files

- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.tsx`
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss`
  (co-located Platinum SCSS using theme vars — no inline layout/presentation
  styles, per CLAUDE.md)
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.stories.tsx`
  (recreates both reference screenshots: compact "About Help" and full "Mac OS
  Setup Assistant")
- `src/SystemFolder/SystemResources/Assistant/ClassicyAssistant.test.tsx`

## Testing

- Renders `pages[0]` header title + content initially; `initialPage` seeds a
  different starting page (and is clamped).
- Header renders `labelIcon` beside the title text and `accessoryIcon` at the
  right; `accessoryIconSize="lg"` applies the overflow/hover treatment while
  `sm`/`md` stay within the header bounds. Both icons are optional and
  independent.
- Next advances and fires `onPageChange`; Previous retreats.
- Prev disabled on first page; Next disabled on last page (no wrap).
- `canAdvance` returning false blocks Next and plays the error sound; returning
  true (or being absent) allows it.
- Per-page `buttons` override global `buttons`; global shown when page has none.
- More than 3 buttons are capped to 3 and `console.warn` fires.
- Left/Right arrow keys navigate and honor gate + ends.
- Header exposes the current title to assistive tech (`aria-live`).

## Open Questions

None. All decisions resolved during brainstorming.
