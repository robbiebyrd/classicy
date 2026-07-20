# ClassicyWindow `backgroundColor` Prop — Design

**Date:** 2026-07-20
**Status:** Approved

## Goal

Let consumers set the background color of a window's content area. The prop
accepts any CSS color value — hex (`#fff`), functional (`rgba(0,0,0,0.5)`),
or a CSS variable reference (`var(--color-system-01)`).

## API

New optional prop on `ClassicyWindowProps`:

```ts
/**
 * Background color for the window contents area. Accepts any CSS color
 * value (hex, rgb/rgba, or a `var(--…)` reference). When omitted, the
 * theme defaults apply (`--color-window-document` for standard windows,
 * `--color-window-frame` for modal windows).
 */
backgroundColor?: string;
```

Undefined preserves current behavior exactly.

## Mechanism

The window contents `<div>` — the element that receives
`classicyWindowContents`, `classicyWindowContentsWithHeader`, or
`classicyWindowContentsModal` — gets an inline CSS custom property when the
prop is set:

```tsx
style={backgroundColor ? { "--classicy-window-contents-bg": backgroundColor } : undefined}
```

The SCSS background declarations change to resolve that variable with the
existing defaults as fallback:

- `.classicyWindowContents` and `.classicyWindowContentsWithHeader`:
  `background-color: var(--classicy-window-contents-bg, var(--color-window-document));`
- `.classicyWindowContentsModal`:
  `background-color: var(--classicy-window-contents-bg, var(--color-window-frame)) !important;`

Because the custom property is resolved *inside* the `!important`
declaration, modal windows honor the prop too — a plain inline
`background-color` style would lose to that rule. The fallback argument
keeps today's exact theme defaults when the prop is absent.

## Testing

Component tests (Vitest + Testing Library) asserting:

1. No prop → no inline `--classicy-window-contents-bg` on the contents div.
2. Prop set on a standard window → variable present with the given value.
3. Prop set on a modal window → variable present on the modal contents div.
4. Value pass-through for hex, `rgba(...)`, and `var(...)` forms.

## Out of Scope

- Header, placard, and title-bar backgrounds.
- Per-theme configuration of the new variable.
