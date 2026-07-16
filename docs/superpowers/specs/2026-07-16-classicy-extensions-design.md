# Classicy Extensions Design

**Date:** 2026-07-16
**Status:** Approved

## Overview

Add an `extension` boolean prop to `ClassicyApp` that lets an app run in the
background. An Extension:

- Does **not** appear in the App Switcher menu, on the desktop, or in the
  derived Applications folder.
- **Does** get an icon in the virtual file system at
  `System Folder/Extensions`, derived automatically from mounted extension
  apps.
- Shows an error dialog when its Extensions-folder icon is double-clicked:
  title **"Library"**, message **"This file adds functionality to your
  computer. It cannot be opened."**
- Can hold state, listen and respond to events, and open windows. Windows
  remain associated with the extension itself (not Finder.app).
- Appears in the `ClassicyStartupScreen` extension icon parade (Mac OS 7
  style), icons revealed one at a time across the bottom of the boot screen,
  paced against the progress bar duration.

Library consumers register an extension simply by mounting
`<ClassicyApp extension id=... name=... icon=...>` inside `ClassicyDesktop` —
no additional registration API.

## 1. Component API (`ClassicyApp.tsx`)

`ClassicyAppProps` gains `extension?: boolean`. When true, the mount effect:

- Dispatches `ClassicyAppLoad` with `extension: true`.
- Skips `ClassicyDesktopIconAdd` (no desktop icon, regardless of
  `noDesktopIcon`). No desktop icon also means no derived
  Applications-folder entry, since that folder is built from `app_shortcut`
  desktop icons (`ClassicyFileSystemApplications.ts`).
- Skips `ClassicyDesktopAppMenuAdd` (no Apple-menu entry, regardless of
  `addSystemMenu`).

## 2. Store & lifecycle (`ClassicyAppManager.ts`, `ClassicyAppHelpers.ts`)

- `ClassicyStoreSystemApp` gains `extension?: boolean`.
- `loadApp` accepts the flag; for extensions it creates the entry with
  `open: true, focused: false` — the extension auto-runs in the background on
  mount without stealing focus. `ClassicyAppOpen`/`openApp` is never
  dispatched for it (that path focuses the app).
- Rationale: `ClassicyApp` only renders its children (windows) when
  `open === true`, so a window-capable extension must be open; the
  `extension` flag is what keeps it hidden, not closed-ness.

## 3. App Switcher (`ClassicyDesktopMenuBar.tsx`)

The `appSwitcherData` filter becomes
`(a.open || a.focused) && !a.extension`, so a running, window-owning,
even momentarily-focused extension never appears in the switcher.

## 4. Virtual file system

- `DefaultClassicyFileSystem.ts`: add an `Extensions` **Directory** under
  `System Folder`. The existing `Library/Extensions` text *file* is out of
  scope and stays untouched.
- `ClassicyFileSystemModel.ts`: new enum member
  `ClassicyFileSystemEntryFileType.Extension = "extension"`.
- New module mirroring `ClassicyFileSystemApplications.ts` (e.g.
  `ClassicyFileSystemExtensions.ts`): `buildExtensionsFolder(apps)` +
  `withExtensionsFolder(...)` create one read-only, name-locked entry per
  store app with `extension === true`, keyed by app name, carrying
  `_type: Extension`, `_icon: app.icon`, `_creator: app.id`.
- `ClassicyFileSystemContext.tsx` (`useClassicyFileSystem`): overlay the
  Extensions folder next to the Applications overlay, re-deriving only when
  the set of extension apps changes (memo key analogous to
  `appShortcutsKey`).

## 5. Double-click error (`FinderContext.tsx`)

In the `ClassicyAppFinderOpenFile` handler, before the AppShortcut routing:
if `file._type === ClassicyFileSystemEntryFileType.Extension`, set

```ts
ds.System.Manager.Desktop.errorDialog = {
	title: "Library",
	message: "This file adds functionality to your computer. It cannot be opened.",
};
```

The existing modal in `ClassicyDesktop.tsx` renders it; OK dismisses via
`ClassicyDesktopCloseErrorDialog`. "Library" is the dialog window title; the
sentence is the body — matching the Mac OS 8 alert layout.

## 6. Windows & events

No new mechanisms. Windows declared as children of the extension's
`ClassicyApp` carry `appId={extensionId}` and render because the app is
`open`. Focusing such a window sets `focused: true` on the extension, but the
App Switcher excludes it by flag. Event handling via
`registerAppEventHandler` works unchanged.

## 7. Startup icon parade (`ClassicyStartupScreen.tsx`)

- **Data source:** the splash covers the already-mounted desktop, so
  extension apps have dispatched `ClassicyAppLoad` before its first tick. It
  reads them read-only via `useAppManager` (apps where
  `extension === true`), using each app's `icon` and `name`.
- **Timing:** with `N` extensions and total `duration` ms, reveal interval is
  `duration / (N + 1)`; icon `i` becomes visible once elapsed time passes
  `(i + 1) × interval`. Derived from the existing 50 ms tick:
  `visibleCount = min(N, floor(elapsed / interval))`. `N = 0` renders no
  parade row.
- **Rendering:** an absolutely-positioned row anchored bottom-left of the
  full-screen `.classicyStartupScreen` overlay (outside the splash panel),
  icons accumulating left-to-right at 32 px, each popping in as its slot
  arrives; wraps upward if the row overflows. Pure SCSS in
  `ClassicyStartupScreen.scss`.

## 8. Testing

- `loadApp` extension behavior: entry created `open: true, focused: false`.
- App Switcher filter excludes extension apps.
- `buildExtensionsFolder` derivation: entries, metadata, empty-set case.
- Finder open-file Extension branch sets the "Library" error dialog.
- `ClassicyStartupScreen.test.tsx`: no extensions → no parade row; N
  extensions → icons appear progressively under fake timers, all N visible
  before completion.
- Storybook: StartupScreen variant with mock extensions; example/ app gains a
  demo extension for end-to-end verification.
