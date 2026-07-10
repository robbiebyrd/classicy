# Crash Screen (Sad Mac) — Design

**Date:** 2026-07-10
**Status:** Approved

## Summary

A `ClassicyCrashScreen` React error boundary built into Classicy. When any
descendant component throws during render, the entire desktop is replaced by a
full-viewport black screen showing the classic Sad Mac image (with hex error
codes). Any click or keypress reloads the page — the modern equivalent of
hitting the reset switch.

## Scope decisions

- **Trigger:** React render errors only (a classic `ErrorBoundary`). Global
  `window.onerror` / `unhandledrejection` handlers are explicitly out of scope.
- **Image source:** the Sad Mac PNG is committed into Classicy's bundled assets
  (`assets/img/ui/`), not referenced from a remote URL. No coupling to any
  consumer's CDN; works offline.
- **Recovery:** any click or keydown calls `window.location.reload()`. No
  auto-reload (crash-loop risk), no dead end.
- **Integration:** built into `ClassicyDesktop` (zero config for consumers),
  and also exported standalone so consumers can wrap higher in their tree.

## Components

All new files live in `src/SystemFolder/SystemResources/CrashScreen/`.

### `ClassicyCrashScreen.tsx`

- A **class component** — error boundaries must be classes; this will be
  Classicy's only one.
- `static getDerivedStateFromError()` sets `crashed: true`.
- `componentDidCatch(error, info)` logs via `console.error`.
- When crashed: renders `<div className="classicyCrashScreen"><img …/></div>`.
  When not crashed: renders `children`.
- A window `keydown` listener is attached only while crashed (and removed on
  unmount); both it and the overlay's `onClick` call `window.location.reload()`.
- The fallback render is deliberately dumb: one div, one img, **no** hooks into
  Classicy state/theme/sound managers — those providers may be the very thing
  that crashed, and a fallback that depends on them would throw again and
  escape the boundary (React then unmounts the whole tree).

### `ClassicyCrashScreen.scss`

Mirrors `ClassicyBoot.scss`:

- `position: absolute; top/left 0; width: 100vw; height: 100vh`
- `background: black`, `z-index: 2000` (above Boot's 1000)
- `cursor: pointer`
- Image centered via flexbox, `image-rendering: pixelated`,
  `max-width: 100%` so it scales cleanly at any viewport size.

### Asset

The source PNG (1456×680, mostly black padding) is cropped down to the Sad Mac
icon + hex-code region before committing to `assets/img/ui/` — the padding is
redundant against the black background, and cropping centers the content
predictably at any viewport size. Imported directly in the component (Vite
handles PNG imports; `src/custom.d.ts` already declares the module type).

## Integration

`ClassicyDesktop`'s current body becomes an inner component; the exported
`ClassicyDesktop` renders:

```tsx
<ClassicyCrashScreen>
    <ClassicyDesktopInner>{children}</ClassicyDesktopInner>
</ClassicyCrashScreen>
```

This catches errors thrown by the desktop's own hooks/render **and** by
consumer apps rendered as children. `ClassicyCrashScreen` is also exported
from `index.ts` for consumers who want to wrap providers above
`ClassicyDesktop` (out of scope here).

## Error handling

- Fallback UI cannot itself crash the boundary: no state manager, theme, or
  sound dependencies.
- If the bundled image somehow fails to load, the user still gets the black
  screen and click-to-reload.

## Testing

`ClassicyCrashScreen.test.tsx` co-located with the component:

1. Renders children when nothing throws.
2. A throwing child renders the overlay with the Sad Mac image.
3. Click on the overlay calls a mocked `window.location.reload`.
4. Keydown calls the mocked reload.
5. The error is logged via `console.error`.

## Release

Normal Classicy flow: land on `main` → CI auto-bumps + publishes to npm →
rt911's `"latest"` pin picks it up on the next commit (husky pre-commit runs
`pnpm update classicy --latest`).
