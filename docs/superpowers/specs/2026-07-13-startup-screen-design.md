# Startup Screen — Design

**Date:** 2026-07-13
**Status:** Approved
**Reference:** `startup1.png` (repo root) — Mac OS 8 boot splash: plain desktop-colored
background, centered platinum raised panel, white inset with the Mac OS face logo and
"Mac OS" wordmark, "Starting Up…" label above a progress bar.

## Problem

Classicy boots straight into the desktop. We want an authentic Mac OS 8 startup
splash shown for 4 seconds before the desktop is revealed.

## Requirements

1. A startup screen matching `startup1.png` displays for 4 seconds (configurable)
   before the desktop is visible.
2. The desktop mounts and hydrates **underneath** the splash (apps register during
   boot, like extensions loading); the reveal at the end is instant — no fade.
3. The splash plays the existing `ClassicyBoot` startup chime on mount.
4. Shows **once per browser-tab session** (`sessionStorage`); not skippable.
5. On by default for all `ClassicyDesktop` consumers; configurable via props.
6. Self-contained component — no window-manager, app-registration, or focus-system
   involvement.

## Component

`src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx` (+ `.scss`, `.test.tsx`),
co-located with the existing `ClassicyBoot`.

**Markup/visuals:**
- Fixed full-viewport overlay, solid theme desktop background color, z-index above the
  error-dialog layer (which uses 99999), rendered as the **last child** inside
  `#classicyDesktop` so it inherits theme CSS variables.
- Centered platinum raised panel (theme system colors, standard platinum bevel).
- White inset box (dark border) containing `macos.svg` (`ClassicyIcons.system.macosSvg`)
  above a "Mac OS" wordmark styled with the theme's header font.
- `ClassicyProgressBar` with `label="Starting Up…"`, `labelPosition="above"`,
  determinate `value` 0→100.
- `role="status"` on the overlay for accessibility.

**Behavior:**
- Visibility decided once in a lazy `useState` initializer:
  - `sessionStorage.getItem("classicyStartupScreenShown")` set → render nothing.
  - Storage read/write wrapped in try/catch; on failure (private browsing, SSR),
    degrade to **showing** the splash.
- When visible, on mount: write the session key, dispatch
  `{ type: "ClassicySoundPlay", sound: "ClassicyBoot" }` via `useSoundDispatch`.
- Progress driven by a 50 ms `setInterval` computing `elapsed/duration * 100`
  (interval, not rAF, so fake-timer tests are deterministic). At `elapsed >= duration`
  the component clears its timer and renders nothing (unmounts its subtree).
- Props: `duration?: number` (default `4000`).

## Desktop integration

- `ClassicyDesktopProps` gains `startupScreen?: boolean` (default `true`) and
  `startupDuration?: number` (default `4000`), threaded `ClassicyDesktop` →
  `ClassicyDesktopInner`.
- `ClassicyDesktopInner` renders `{startupScreen && <ClassicyStartupScreen duration={startupDuration} />}`
  as the last child of the root desktop div.
- Non-breaking API change (new optional props), but a behavior change by design:
  existing consumers see the splash once per session unless they pass
  `startupScreen={false}`.
- Component exported from the library (barrelsby picks it up automatically).

## Error handling

- Storage unavailable → splash always shows (never crashes).
- Autoplay-blocked audio → silent (existing SoundManager behavior).
- Unmount during the interval → timers cleaned up in the effect teardown.

## Testing

Component tests (fake timers, mocked sound dispatch, mocked scss):
- Renders overlay, panel, logo image, wordmark, and "Starting Up…" when the session
  key is absent.
- Dispatches the `ClassicyBoot` chime once on mount.
- Sets `classicyStartupScreenShown` in sessionStorage.
- Unmounts content after `duration` elapses (default and custom values).
- Renders nothing when the session key is already set.

Desktop tests:
- `ClassicyDesktop` renders the splash by default (with sessionStorage cleared).
- `startupScreen={false}` suppresses it.
- Existing desktop tests keep passing (clear sessionStorage or disable the prop in
  their setup as needed).

## Out of scope

- Skippability, fade transitions, multi-phase boot (black chime screen), per-item
  boot progress messages ("Loading extensions…"), showing on every load.
- Changes to the existing `ClassicyBoot` component (left as-is).
