# Pre-Boot "Power On" Screen

**Date:** 2026-07-21
**Status:** Approved design

## Problem

Consumers of Classicy (e.g. rt911) need to show a screen *before* the
`ClassicyStartupScreen` boot sequence begins — a Mac-style "power on" gate the
user must acknowledge before the machine "boots". See `2.png`: a framed window
titled "9/11 in Realtime" with an About blurb and a **POWER ON** button. The
screen must be supplied by the consumer as a prop and be fully composable with
Classicy components.

## Goals

- Let a consumer inject arbitrary pre-boot content via a `ClassicyDesktop` prop.
- The content owns a **POWER ON** action that, when triggered, proceeds to the
  existing startup sequence (chime + parade + progress bar).
- Shows **once per browser-tab session**, consistent with `ClassicyStartupScreen`.
- Fully backward-compatible: with no pre-boot prop, boot behavior is unchanged.
- Ship a lightweight, presentational window-frame component so consumers can
  reproduce the `2.png` look without touching the window manager.

## Non-Goals

- No changes to the parade / progress-bar mechanics of `ClassicyStartupScreen`.
- The pre-boot frame is **not** a managed window (no focus, drag, resize, close).
- No new persistence surface — reuses the existing session flag.

## Current State

`ClassicyDesktop` renders the startup screen as an overlay over the
already-mounted desktop:

```tsx
{startupScreen && <ClassicyStartupScreen duration={startupDuration} />}
```

`ClassicyStartupScreen` (`src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`)
self-gates on a `sessionStorage` flag via
`hasShownStartupScreenThisSession()` / `markStartupScreenShownThisSession()`
(`ClassicyStartupScreenSession.ts`). On mount it marks the flag, plays the
`ClassicyBoot` sound, reveals parade icons, and fills a progress bar over
`duration` ms, then unmounts itself. It is deliberately self-contained — no
window-manager, app-registration, or focus coupling.

`ClassicyWindow` and `ClassicyAboutWindow` are tightly coupled to the window
manager: they require an `appId`, read `state.System.Manager.Applications.apps[appId]`,
and dispatch focus/move events. They cannot render cleanly in a pre-boot phase
where no app exists yet.

## Design

### 1. Phase machine: `ClassicyBootSequence`

A small internal component (kept out of the already-large `ClassicyDesktop`
body) owns a two-phase state machine and replaces the inline startup-screen
render.

```
initial phase =
  (preBootScreen && !hasShownStartupScreenThisSession()) ? 'powerOn' : 'startup'
```

- **`'powerOn'`**: render a full-screen overlay containing
  `preBootScreen(powerOn)`. No chime is played in this phase. `powerOn` is a
  callback that sets phase to `'startup'`.
- **`'startup'`**: render `<ClassicyStartupScreen duration={startupDuration} />`
  **unchanged**. It self-gates: if the session flag is already set it renders
  `null`; otherwise it plays the chime, runs the parade, and marks the flag.

`ClassicyStartupScreen` is **not modified**. Because it only marks the session
flag when *it* mounts, a page reload while the power-on screen is still up
(before the user clicks POWER ON) simply replays the power-on screen. Only the
transition into `'startup'` (or a fresh load with no pre-boot prop) marks the
session as shown.

Flow (once per tab session):

```
First load  -> POWER ON -> chime + parade -> desktop
Reload      -> straight to desktop (both skipped, session flag set)
New tab     -> POWER ON again
```

Backward compatibility: when `preBootScreen` is undefined, the initial phase is
`'startup'` and behavior is byte-for-byte the current behavior.

`ClassicyBootSequence` also receives the existing `startupScreen` boolean
(default `true`). When `startupScreen` is `false`, the `'startup'` phase renders
nothing — matching today's `{startupScreen && <ClassicyStartupScreen/>}` guard.
A pre-boot screen combined with `startupScreen={false}` therefore shows the
power-on gate, then reveals the desktop directly on POWER ON (no chime/parade).

Audio note: gating the chime behind the POWER ON click also makes it reliable.
Browser autoplay policy blocks `Audio.play()` until a user gesture; the click is
that gesture, so the chime — which today can be silently dropped on first load —
now plays consistently.

### 2. New prop on `ClassicyDesktop`

```ts
preBootScreen?: (powerOn: () => void) => ReactNode;
```

A render-prop. Classicy owns the overlay, session gating, and audio unlock; the
consumer owns the content and wires `powerOn` to their button. The prop is
threaded `ClassicyDesktop -> ClassicyDesktopInner -> ClassicyBootSequence`
alongside the existing `startupScreen` / `startupDuration` props.

Consumer usage:

```tsx
<ClassicyDesktop
  preBootScreen={(powerOn) => (
    <ClassicyWindowFrame title="9/11 in Realtime">
      <h1>About 9/11 in Realtime</h1>
      <p>...</p>
      <ClassicyButton onClick={powerOn}>POWER ON</ClassicyButton>
    </ClassicyWindowFrame>
  )}
/>
```

### 3. New component: `ClassicyWindowFrame`

Location: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx`
(beside `ClassicyWindow`), with co-located `ClassicyWindowFrame.scss`.

A lightweight, **presentational** Platinum window: a title bar (centered title,
pinstripe styling) plus a body region. **Zero window-manager coupling** — no
`appId`, no store reads, no dispatches — so it renders standalone (in the
pre-boot overlay, in Storybook, anywhere).

Props:

```ts
interface ClassicyWindowFrameProps {
  title?: string;
  children: ReactNode;
  className?: string;
  width?: string | number; // optional max-width for the frame
}
```

Structure:

```tsx
<div className="classicyWindowFrame ...className">
  <div className="classicyWindowFrameTitleBar"><span>{title}</span></div>
  <div className="classicyWindowFrameBody">{children}</div>
</div>
```

Styling reuses existing window-chrome CSS variables/patterns from
`ClassicyWindow.scss` (pinstriped title bar, beveled Platinum borders) so it
matches the managed window visually without inheriting its behavior.

### 4. Overlay

New style block `.classicyPreBootScreen`:

- `position: fixed; inset: 0; z-index: 100000;` (same layer as the startup
  screen).
- **Transparent** background so the desktop pattern shows through, matching
  `2.png`.
- Flexbox-centered content.
- Captures pointer events so the desktop underneath is inert while the power-on
  screen is up.

Lives in a co-located SCSS file for the boot sequence (e.g.
`ClassicyBootSequence.scss`).

## Testing

- **`ClassicyWindowFrame`**: renders `title` and `children` **without any
  provider** — proves the decoupling. Applies `className` / `width`.
- **`ClassicyBootSequence`**:
  - Power-on overlay shows when `preBootScreen` is given and the session flag is
    unset.
  - Calling the injected `powerOn()` advances to the startup phase and the chime
    fires (sound dispatch called).
  - Power-on is skipped (goes straight to startup) when the session flag is
    already set.
  - No power-on overlay when `preBootScreen` is absent (current behavior).
- **Regression**: existing `ClassicyStartupScreen` tests remain green
  (component unchanged).

## Files

- **New**: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx` (+ `.scss`, `.test.tsx`, `.stories.tsx`)
- **New**: `src/SystemFolder/SystemResources/Boot/ClassicyBootSequence.tsx` (+ `.scss`, `.test.tsx`)
- **Modified**: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` — add `preBootScreen` prop, thread it, render `ClassicyBootSequence` in place of the inline `ClassicyStartupScreen`.
- Barrels regenerate automatically (`generate-barrels`); `ClassicyWindowFrame` is exported for consumers.
