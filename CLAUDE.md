# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8 (Platinum) interface. It's distributed as an npm package with ES and UMD module formats.

## Common Commands

This project uses **pnpm** (enable via `corepack enable`). The repo is a pnpm workspace: the root is the `@classicy/classicy` library, `example/` is a member that consumes it via a `workspace:*` dependency — no `npm link` needed — and `packages/appearance/platinum` is `@classicy/appearance-platinum`, the Platinum Appearance Package (peer-depends on the core; its own `vite.config.ts` and `vitest.config.ts`; the root `pnpm test` runs it as a second vitest project).

```bash
pnpm install              # Install dependencies (root + example workspace)
pnpm build:source         # TypeScript + Vite build only (fastest iteration)
pnpm build                # Full build (audio sprites + source)
pnpm build:audio          # Generate audio sprites from assets/sounds/
pnpm build:watch          # Watch mode: rebuilds source + audio on file changes
pnpm lint                 # Run Biome (`biome check .`), the only linter; lint:fix writes changes
pnpm storybook:typecheck  # Type-check the stories under storybook/tsconfig.json (strict)
pnpm preview              # Full build → run example app
pnpm storybook            # Run the component showcase (Storybook) dev server
pnpm build:storybook      # Build static Storybook to storybook/storybook-static/
pnpm parity:shoot / parity:app / parity:compare   # Visual parity (AE) checks: bin/parity/README.md
```

**CI** (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm storybook:typecheck` (the stories and `storybook/.storybook/`, under the strict `storybook/tsconfig.json`; the root tsconfig excludes stories), `pnpm test` and `pnpm build:source && pnpm --filter classicy-example build` (the example app's `tsc -b && vite build` against the freshly built library, so a broken consumer import or type error fails the PR) on every pull request and push to `main`; run the same five locally before pushing. Every workflow pins `runs-on: ubuntu-26.04` rather than `ubuntu-latest`, so the image, and with it the distro ffmpeg that builds the released audio sprites, cannot change without a commit.

**Local dev workflow**: `pnpm build:source` to (re)build the library; the `example/` app resolves it automatically through the workspace symlink. For live iteration use `pnpm build:watch` (or `pnpm preview`, which builds then runs the example dev server with the source watcher).

## Path Aliases

- `@/` → `./src/`
- `@snd/` → `./assets/sounds/`
- `@img/` → `./assets/img/`

## Architecture

### Component Hierarchy

```
ClassicyAppManagerProvider     # Thin wrapper - Analytics + SoundManager only
  └── AnalyticsProvider        # Google Analytics/GTM
       └── ClassicySoundManagerProvider  # Sound (still uses React Context)
            └── ClassicyDesktop          # Desktop surface with icons and menu bar
                 ├── ClassicyDesktopMenuBar
                 └── ClassicyApp         # Individual application container
                      └── ClassicyWindow # Window component with controls
                           └── UI Components (Button, Input, Tabs, etc.)
```

### State Management

Uses **Zustand** for app/desktop state with the existing event reducer for domain logic:

- **Zustand store** (`src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`) - Global store created with `create<ClassicyStore>()`; it holds state only, no actions (there is no `getState().dispatch`)
- **`useAppManager(selector)`** - Zustand hook to read state. Use selectors for performance.
- **`useAppManagerDispatch()`** - Returns `dispatch`, the module export of the same file (`dispatch(action, trust?)` runs the reducer inside `useAppManager.setState`)
- **classicyDesktopStateEventReducer** (`ClassicyAppManager.ts`) - Still routes events by prefix to domain-specific handlers (called inside Zustand's `set()`)
- **App windows** — `apps[id].windows` is a `Record<windowId, ClassicyStoreSystemAppWindow>` (1.0; an array in 0.x). Read/write it only through `getAppWindow`, `listAppWindows`, `hasAppWindow`, `countAppWindows`, `setAppWindow`, `removeAppWindow`, `updateAppWindow` (`ClassicyAppWindows.ts`); never branch on key order. `migrateClassicyState` (`ClassicyStateMigrations.ts`) converts 0.x arrays on load (after the merge over defaults) and on every `mergeClassicyState` result; it is shape-detecting and idempotent — there is no state version number
- **SoundManager** still uses React Context/useReducer (not migrated to Zustand). Its `volume` (0–100, `ClassicyVolumeSet`) is the Howl player's gain, applied by `ClassicySoundManagerProvider` and re-applied when a sound pack loads; it is per-mount, like the mute flag (`"*"` in `disabled`); alerts (`ClassicyAlertSound`/`ClassicySoundPlayError`) play at that gain × the persisted `Appearance.alertVolume` (0–100, `ClassicyDesktopChangeAlertVolume`). The Howl is loaded from the registered sound pack named by `activeTheme.sound.pack` (`ClassicySoundPacks.ts`), reloaded when that changes, with Platinum as the fallback for sprites the pack lacks when Platinum's pack is registered (the sound modules import no pack; with none registered, no Howl is built and sound is silent, logging each missing pack id once)

Event routing by prefix (unchanged):
- `ClassicyWindow*` → Window operations (focus, move, resize, collapse, zoom)
- `ClassicyDesktop*` → Desktop operations (menus, themes, backgrounds)
- `ClassicyDesktopIcon*` → Icon selection and interaction
- `ClassicyApp*` → App lifecycle (open, close, focus, activate)
- `ClassicyAppFinder*`, `ClassicyAppMoviePlayer*`, `ClassicyAppPictureViewer*` → App-specific handlers
- `ClassicyManagerDateTime*` → Date/time manager operations

State persists to localStorage (key: `classicyDesktopState`) via Zustand's `subscribe()` on every state change.

### Directory Structure

- `src/SystemFolder/ControlPanels/` - System-level managers (AppManager, SoundManager, AppearanceManager, DateAndTimeManager)
- `src/SystemFolder/SystemResources/` - Reusable UI components (Window, Button, Input, Menu, BalloonHelp, etc.)
- `src/SystemFolder/Finder/` - Finder app implementation
- `src/SystemFolder/QuickTime/` - Media player apps
- `example/` - Standalone Vite app that consumes the built package for local testing

### Creating Apps

Full narrative guide: [`docs/BUILDING-APPS.md`](docs/BUILDING-APPS.md). Flat API
dump: [`docs/AGENT-REFERENCE.md`](docs/AGENT-REFERENCE.md).

Apps follow this pattern:
1. Use `ClassicyApp` wrapper with id, name, icon props
2. Use `useAppManager(selector)` to read state with a selector for performance
3. Use `useAppManagerDispatch()` to get the dispatch function for events
4. Wrap content in `ClassicyWindow` components
5. Register a manifest with `registerApp` (`ClassicyAppManifest.ts`) — including a
   reducer, if the app needs custom state

The app slice is **`System.Manager.Applications`**, not `System.Manager.App`.

```tsx
// Reading state — always use a selector to avoid unnecessary re-renders
const appState = useAppManager(state => state.System.Manager.Applications.apps[id]);

// Dispatching actions
const dispatch = useAppManagerDispatch();
dispatch({ type: 'ClassicyAppOpen', app: { id, name, icon } });
```

`name` is the internal name: action types, Finder's OpenFile routing, records
and analytics use it, and an Appearance Package may display another. For text
that names your app, use `useClassicyAppIdentity(id, { name, icon }).name`.

#### App Manifests

Apps register through `registerApp` (`ClassicyAppManifest.ts`) — one call
declaring routing, actions, and state shape as zod schemas with `.describe()`
commentary:

- `actions`: per-type `{ description, params?, scriptable? }`. `scriptable:
  true` exposes the action to HyperCard stack scripts (delegates to the
  untrusted-action allowlist; the guarded-route floor still applies, and
  script-authored args are validated against `params` before dispatch).
- `state`: a `z.looseObject` describing `apps[id].data`. MUST be loose (the
  kernel writes undeclared keys like `openFiles` queues) with `.optional()`
  top-level fields. In dev builds the kernel warns (never rejects) when a
  routed app's data fails its schema.
- Re-registering an id merges additively (HyperCard.app spans two modules:
  player and editor prefixes); the same prefix twice is a no-op, actions
  merge first-wins, and the first `state` schema wins.
- Read side: `getAppManifest`, `listAppManifests`, `listScriptableActions`,
  `describeAppAction`/`describeAppState` (balloon-ready `{title, content}`),
  and `parseAppData` (typed guard replacing hand-rolled `isXData` functions).
- Declaring `<prefix>OpenFile` in `actions` makes Finder's open-with reduce
  the app's own case with `{ app: { id }, path }` (`routeClassicyAppOpenFile`,
  `ClassicyAppOpenFileRouting.ts`), under the trust Finder's action arrived
  with. Without the declaration, or when the kernel would route the type
  elsewhere (another app's earlier, shorter prefix, or a built-in route), the
  generic `ClassicyApp${name}OpenFile` queue (`data.openFiles`) is used. Apps
  on `registerAppEventHandler` alone stay generic.

`registerAppEventHandler` and `registerClassicyUntrustedActionAllowlist` are
deprecated in favor of `registerApp` but keep working unchanged.

#### App Icon Visibility

`ClassicyApp` controls its two icon surfaces independently. Both default to on;
`extension` apps get neither.

```tsx
<ClassicyApp
    id="TV.app" name="TV" icon={icon}
    showDesktopIcon={false}          // keep it off the desktop
    showInApplicationsFolder={true}  // but list it in Applications
    desktopIconBalloonHelp="Double-click to watch TV."
/>
```

- `showDesktopIcon` (default `true`) — draw an icon on the desktop.
- `showInApplicationsFolder` (default `true`) — list the app in the derived
  Applications folder. Independent of `showDesktopIcon`, so all four
  combinations are reachable; turning both off removes any icon record.
- `desktopIconBalloonHelp` — `string` (titled at render with the name the
  icon shows, the active package's display name included) or
  `{ title?, content, position?, delay? }`. When omitted, the balloon is the
  active package's `apps[id].description`, else the app's registered manifest
  description (`registerApp`), resolved at render, so every registered app
  — bundled apps included — carries purpose copy with no extra wiring. Every
  bundled app registers a described manifest; apps without a reducer use a
  description-only `*Manifest.ts` module (pinned by
  `ClassicyBundledAppManifests.test.ts`).

`noDesktopIcon` and `inApplicationsFolder` are deprecated aliases. Note the
behavior change: `noDesktopIcon` alone no longer keeps an app out of
Applications — pass `showInApplicationsFolder={false}` for that.

The Trash and drive icons carry stock balloon help automatically
(`ClassicyDesktopIconBalloons.ts`), resolved by icon kind at render time.

#### Alias Badging

Desktop icons whose `kind` is `app_shortcut` or `shortcut` — every icon
`ClassicyApp` registers — render the Mac OS 8 alias arrow over the icon's
bottom-left corner and italicize their label. System kinds (`drive`, `trash`,
`directory`, `file`, `icon`) get neither. The predicate lives in
`ClassicyDesktopIconKinds.ts`; the badge is a second mask pair reusing
`classicyDesktopIconMaskOuter`/`classicyDesktopIconMask`, so it inherits the
selected and open state styling automatically. Swap the artwork by registering
`registerClassicySystemArt("<package>", { aliasBadge })` — the badge reads the
system-art key `aliasBadge` at render time.

### Window Order & Focus Succession

Windows stack and refocus by recency (`zOrder` = last open/focus time;
`lastAccessedWindowId` = last focused):

- `ClassicyWindowOpen` places a brand-new window at the `position` it sends,
  `[0, 0]` included; only a dispatch with no `position` (or `autoPosition:
  true`) is cascaded to `30 + 10·n` (G18). `ClassicyWindow` always sends one.
- `ClassicyWindowOpen` focuses a brand-new window, and a window **reopened**
  after being closed this session (`closedThisSession`, set by
  `ClassicyWindowClose`, stripped in `sanitizeStateForPersistence`). A window
  re-registering after a reload never steals focus.
- A non-modal `ClassicyWindow` that unmounts while its record is open
  dispatches `ClassicyWindowClose` on the next tick, unless a window with the
  same app+id has mounted again by then (StrictMode's phantom remount, or a
  replacement instance). Modal windows are destroyed instead, as before.
- `ClassicyWindowClose` promotes the app's highest-`zOrder` open sibling.
- `ClassicyApp` (with `defaultWindow` set) refocuses the last-focused open
  window via `pickWindowToRestore` when the app is focused but no window is,
  reading the **live** store, not the render snapshot, so a window that
  registered or took focus in the same commit is never covered back up.

### Analytics

`useClassicyAnalytics()` returns `track(eventName, payload)` and
`page(path, title)`. Both are referentially stable, and both fall back to
silent no-ops when no `AnalyticsProvider` is mounted. Event names are prefixed
with `ClassicyAnalyticsPrefixContext` (default `classicy_`); **pageview paths
are not** — a path is a URL namespace, not an event name.

`ClassicyWindow` emits a pageview whenever a window becomes open (whether or
not it is focused) and whenever an open window gains focus — there is no
deduplication between the two. Emission waits until the window is actually
registered in the store: a brand-new window's first render has no store entry
yet, so nothing is emitted for that render; the first commit where the window
is present in the store is what counts as "just opened", even though that
commit already has the window focused (opening a window focuses it in the same
store update), so that's a single emit, not two. A window that opens unfocused
(e.g. several windows restored on reload) emits on open, then emits again when
it's later focused. Closing and blurring emit nothing.

```tsx
<ClassicyWindow analyticsPath="/editor/compose" />  // override the derived path
<ClassicyWindow analyticsExclude />                 // no pageview at all
```

Paths are derived by `ClassicyAnalyticsPath.ts` as `/<app>/<window>`: the
`appId` minus a trailing `.app`, plus the window id with any redundant app
prefix stripped. **A window id containing a filesystem separator (`:` or `/`)
is treated as user data** and collapses to `/file` or `/folder` — `ClassicyApp`
builds file-window ids as `` `${id}_file_${filePath}` `` and Finder keys its
windows by folder path, so slugifying either would leak user file names into GA
and make path cardinality unbounded.

That collapse is a *syntactic* rule — it can only catch user data that happens
to carry a separator. **If your app builds a window id from user or consumer
data, pass `analyticsPath` explicitly**; only the app knows that a segment is
user data. Movie Player and Picture Viewer do this, because their window ids
embed a document key that may be a bare relative URL (`clip.mp4`) with no
separator to catch. Build the override with
`classicyWindowPagePath(appId, "<safe-token>")` rather than hand-writing the
path, so the app segment stays in sync with `appId`.

The window *title* is sent to GA verbatim, including titles derived from user
file names. That is a deliberate trade-off for readable content reports; the
path is what stays free of user data.

### Balloon Help

`ClassicyBalloonHelp` is a Mac OS 8-style tooltip component. Wrap any element with it to show a speech-bubble tooltip after a delay:

```tsx
<ClassicyBalloonHelp content="Click to open" title="Open File" position="top-left">
  <ClassicyButton>Open</ClassicyButton>
</ClassicyBalloonHelp>
```

- `position`: one of `top-left | top-center | top-right | bottom-left | bottom-center | bottom-right` (default `top-left`)
- `delay`: hover delay in ms before balloon appears (default `600`)
- Rendered via a React portal into `#classicyDesktop` so it is never clipped by parent overflow
- The wrapper is `position: relative; display: inline-block`. If that would break your layout (e.g. an absolutely positioned element), use the `useClassicyBalloonHelp(ref, config)` hook instead — it returns `{ handlers, balloon }` to spread onto an element you already own, adding no DOM. `ClassicyDesktopIcon` does this.
- Globally disabled by `System.Manager.Desktop.disableBalloonHelp` (Zustand store). Toggle with event `ClassicyDesktopSetBalloonHelp` — e.g. `dispatch({ type: 'ClassicyDesktopSetBalloonHelp', disableBalloonHelp: true })`

### Schema-Driven Forms

`ClassicySchemaForm` (`SystemResources/SchemaForm/`) renders a nested zod object; the Screen Saver options and the Appearance Manager's Options tab both use it. The Appearance Manager has eight tabs (Themes, Packages, Options, Desktop, Colors, Fonts, Metrics, Sound); measurements write through `ClassicyDesktopChangeMetric` (`metricKey` or `{ family, key }`), everything else through `ClassicyDesktopChangeAppearanceOption { path, value }`.

### Logging & Diagnostics

All internal diagnostics go through `classicyLog(level, subsystem, message,
...details)` (`src/SystemFolder/SystemResources/Log/ClassicyLog.ts`) — never
call `console.warn/error` directly in library code (the only exceptions: the
`debug`-flag `console.group` state dumps, the crash boundary's own
`console.error`, and ClassicyLog's sink-failure report). Hosts subscribe via
`registerClassicyLogSink({ id, onLog?, onError?, onCrash? })`.

- Sinks get every entry **including in production**; the console mirror is
  dev-only for `debug/info/warn` and unconditional for `error`.
- Console format is `[Subsystem] message` — byte-identical to the pre-pipeline
  bracket prefixes, so tests asserting console output keep passing.
- `onCrash` is fed by `ClassicyCrashScreen.componentDidCatch` via
  `emitClassicyCrash`.
- Sink exceptions are isolated and reported straight to the console (never
  back through the pipeline — recursion).

### Screen Saver

`ScreenSaver.app` (`src/SystemFolder/Extensions/ScreenSaver/`) is an extension
mounted by `ClassicyDesktop` that idle-activates a full-viewport screensaver.
Idle detection is **wall-clock** (document-level activity listeners + refs;
independent of the Classicy virtual clock, and never writes the store per
event — only the activate/deactivate transitions dispatch). The waking
keystroke/click is swallowed in the capture phase.

- State in `apps["ScreenSaver.app"].data`: `enabled` (default true),
  `timeoutMinutes` (default 5, clamped 1–240), `selectedSaver` (default
  `bouncing-ball`), `saverConfigs` (per-saver options), and transient `active`
  (stripped in `sanitizeStateForPersistence`).
- Actions (prefix `ClassicyAppScreenSaver`): `Activate` (scriptable),
  `Deactivate`, `SetSaver { saverId }`, `SetTimeout { minutes }`,
  `SetEnabled { enabled }`, `SetConfig { saverId, config }` (validated against
  the saver's zod schema).
- Register savers at module scope:
  `registerClassicyScreenSaver({ id, name, component, configSchema?, defaultConfig?, configComponent?, transparentBackground? })`
  (`ClassicyScreenSaverRegistry.tsx`). Re-registering an id replaces it.
  Options UI is two-tier: a custom `configComponent`, else a form derived from
  `configSchema` (`ClassicyScreenSaverConfigForm`). `transparentBackground`
  savers (Fade Out, Spotlight) reveal the live desktop through the overlay.
- 12 built-ins ported from bryanbraun/after-dark-css (`savers/`; CSS is MIT,
  sprite art © Berkeley Systems). Keyframes/classes are prefixed
  `classicySaver*` to avoid bundle-level CSS collisions.
- The `logo` saver's image comes from its own live registry
  (`savers/Logo/ClassicyScreenSaverLogoRegistry.ts`, in `sideEffects`):
  `registerClassicyScreenSaverLogo({ id, name, src, width?, height? })` at
  module scope; built-ins `berkeley-systems` (default), `classicy`,
  `startup-screen` (`CLASSICY_SCREEN_SAVER_LOGO_IDS`). Config `{ logo: id }`
  is picked in a custom `configComponent` pop-up (a schema enum could not
  list logos registered later); an unregistered id draws the default. The
  bounce keyframes read the mark's size from CSS custom properties, declared
  or measured on load, so any image travels edge to edge.
- The Screen Saver control panel
  (`ControlPanels/ScreenSaverManager/`) is part of `ClassicyControlPanels`.
- Overlay z-index is 100001 (above dialog overlay 99999 and startup 100000);
  reduced-motion users get a paused (static) saver: a stylesheet rule keyed
  on the overlay's id (`#classicy-screen-saver-overlay`) sets
  `animation-play-state: paused`, and the overlay also pauses its subtree's
  animations from JS when the saver mounts or changes and, through a
  capture-phase `animationstart` listener, every CSS animation that starts
  later — so CSS animations (stylesheet or inline, whenever they start) are
  paused. It pauses only running animations and, when reduced motion is
  turned off, resumes only those, so an animation a saver paused itself stays
  paused. Web Animations API `element.animate()` animations are not caught:
  savers should use CSS animations.
- The pointer is hidden by a stylesheet rule too
  (`html.classicyScreenSaverActive:has(#classicy-screen-saver-overlay) *`, no
  `!important`), so savers must set `cursor` from stylesheets, never inline —
  an inline `cursor` on a saver element shows the pointer over it. Browsers
  without `:has()` (Firefox < 121, Safari < 15.4, Chrome < 105) drop that
  rule; a separate `#classicy-screen-saver-overlay, … *` rule hides the
  pointer over the full-viewport overlay there.

### Split Views

`ClassicySplitView` (`src/SystemFolder/SystemResources/SplitView/`) is a
resizable container splitting two or three content areas along one axis:

```tsx
<ClassicySplitView direction="horizontal" defaultSizes={[30, 70]} onResizeCommit={saveSizes}>
  <Sidebar />
  <Content />
</ClassicySplitView>
```

- `direction` (`"horizontal"` default = side-by-side), `minPaneSize` (px,
  default 48), `defaultSizes` (percentages, normalized to 100; equal split
  when the length doesn't match the pane count).
- Max **3 panes** per component (extras dropped with a dev warning) — nest a
  split view inside a pane to combine directions.
- Sizes are uncontrolled after mount. `onResize` fires per drag step;
  `onResizeCommit` fires once per gesture (mouse release, a lost pointer
  stream, or arrow-key release) — persist there and feed the saved sizes
  back as `defaultSizes`.
- The divider follows the ARIA window-splitter pattern (`role="separator"`,
  focusable, arrow keys nudge by 1%) and uses the same document-level drag
  listener idiom as `ClassicyWindow`. Pure resize math is exported as
  `computeSplitViewSizes` for tests.

### Pop-Up Bevel Buttons

`ClassicyBevelButton` opens a Platinum menu (`menuItems`) or any other surface
(`popupContent`, e.g. `ClassicyPopUpSlider`) in a fixed-position portal
(z-index 5000), built from the shared `ClassicyMenu`/`ClassicyMenuProvider`:

- Placement: `popupPlacement` `"below"` or `"right"`, defaulting to where
  `popupDirection`'s arrow points; flips to the other side when there is no
  room (`classicyBevelPopupPlacement`). `popupAlign` `"start"` (default: left
  edges / tops aligned) or `"center"`; `popupAnchorInset` (an object, or a
  function of the button called each time the surface opens) shifts the edges
  the surface is placed against (the Control Strip reads `--strip-menu-overlap`,
  3 px, and its border width that way).
- Both surfaces share the Platinum menu frame (below).
- `popupTrigger="click"` (default in `popup` mode): a quick click leaves the
  menu open (sticky); a press held past `popupHoldDelayMs` (500) is a standard
  menu — a document `mouseup` over an item `click()`s it.
- `popupTrigger="hold"` (default in other modes): the click keeps the mode's
  behavior and only a long press opens the surface; the click ending that
  press is swallowed (`suppressClickRef`).
- Keyboard: a click with `detail === 0` (Enter/Space) toggles a click-trigger
  surface; Down Arrow opens either kind with the first item focused.

### Menu Frame

Every menu — menu bar dropdowns, contextual menus, submenus, pop-up bevel
menus — draws the Platinum frame from the `platinum-menu-frame` mixin
(`packages/appearance/platinum/src/styles/_mixins.scss`). HIGOS8 Ch.4 (p.91)
describes it only in words ("beveled edges", "etched" dividers); the pixels are matched to the open Control Strip
menu in Figure 6-15 (p.126), so the same figure is cited here and for the
Control Strip. The frame: 1 px black border, white/system-04 inner bevel with
face-colored corners, and a 1 px `system-07` shadow on the right and bottom
starting 2 px in, drawn by `::before`/`::after` (so the menu list must be
positioned). Dividers are system-05 over white (`platinum-menu-divider`, the
look) across the full inner width (`ClassicyMenu.scss`, base structure, story
0088-sz9). Bevel-button panels (`popupContent`) reuse the frame.

### Keyboard Equivalents

`ClassicyKeyboardEquivalentField` (HIGOS8 pp.120–122) captures a new
combination in `ClassicyKeyboardEquivalentDialog`, which listens on `window`
in the **capture phase** and `preventDefault`s, so the menu-shortcut
dispatcher and dialog keyboard hooks (both skip `defaultPrevented`) never act
on a recorded key. Recorded shortcuts use the menu-item form (`"⌃⌘S"`, via
`keyboardShortcutFromEvent`) and round-trip through `shortcutMatchesEvent`.
Rules live in `checkKeyboardEquivalent` (needs ⌘ or a function key unless
`requireCommandKey={false}`; `inUse` conflicts name their owner).

### Control Strip

`ClassicyDesktop` mounts a `ClassicyControlStrip` at its lower left — the home
of the Sound control (the menu bar has no speaker widget). Its `controlStrip`
prop takes the strip's props (`disabledModules`, `defaultCollapsed`,
`defaultWidth`) or `false` to hide it; Storybook desktop stories opt out with
`parameters.classicy.controlStrip: false`.

Modules come only from `registerClassicyControlStripModule`
(`ClassicyControlStripRegistry.ts`) — `{ id, label, icon, appId?, order?,
menuItems?, content?, fileIcon? }`, called at module scope. There is no
`modules` prop. The registry is live (`useSyncExternalStore`), so the strip,
the control panel and the file system follow registrations made after mount.

- Function forms of `icon`/`menuItems` and the `content` component are hooks
  run inside the providers (each module is its own component, keyed by
  `id:revision`).
- `appId` ties a module to a mounted `ClassicyApp` — runtime presence via
  `ClassicyMountedApps.ts` (`ClassicyApp` marks itself on mount), never the
  persisted `apps[id]` record. Same `appId` re-registering replaces; another
  `appId` is ignored with a `classicyLog` warning.
- Built-ins register like any module: Sound (`classicy-sound`, order 10, no
  owner) from `ClassicySoundManagerProvider`'s import graph; Screen Saver
  (`classicy-screen-saver`, order 20, owner `ScreenSaver.app`) from the
  extension. Both files are in `package.json` `sideEffects`.
- System and registered modules **always show** unless the host lists them in
  `disabledModules` (not drawn, not offered in the control panel — published
  for it via `setClassicyControlStripDisabledModules`) or the user hides them.
- Persisted state: `System.Manager.Desktop.controlStrip` `{ visible, collapsed?,
  width?, hiddenModules, moduleOrder, edge?, bottom? }`, written by
  `ClassicyDesktopControlStrip{SetVisible,SetCollapsed,SetWidth,SetModuleHidden,SetModuleOrder,SetPosition}`.
  `defaultCollapsed`/`defaultWidth` apply only until the user changes them.
  Ids in `moduleOrder` lead; the rest follow in declared order. Settings for
  unregistered ids are kept.
- Moving it (#298, #299): Control-dragging the collapse box carries the strip
  up and down and docks it to the edge on the pointer's half of the desktop
  (`computeClassicyControlStripPosition`), between the desktop's bottom and
  the menu bar's underside; release stores `SetPosition { edge: "left" |
  "right", bottom }` (px above the desktop's bottom). The collapse box claims
  the Control-click's `contextmenu` and swallows the click, so it never
  collapses or raises the strip's menu. Docked right, the strip mirrors via
  CSS `order` (tab first, flipped; collapse box last), and the tab widens it
  when dragged — or arrowed — left. The offset is a CSS custom property
  (`--classicy-control-strip-bottom`), capped in SCSS so a shrunken desktop
  never pushes the strip off the top.
- The Control Strip control panel (`ControlPanels/ControlStripManager/`,
  `ControlStripManager.app`) edits all of it; the strip's contextual menu
  offers Hide Control Strip and Open Control Strip Control Panel.
- Each installed module is a read-only file (Extension type, so Finder won't
  open it) in the derived `Macintosh HD:System Folder:Control Strip Modules`
  (`ClassicyFileSystemControlStripModules.ts`), built like the Extensions
  folder and never persisted.

HIG p.125: a module for a control panel must include an "Open … Control Panel"
command (`classicyControlStripOpenControlPanelItem`).

The strip is pixel-matched to HIGOS8 Figure 6-15: bevels are background
layers drawn with the `classicy-px-rect` function
(`src/Appearance/vocabulary/_layout.scss`), and the tab, arrows and slider are
`ClassicyPixelArt` (rows of theme tokens rendered as SVG runs), so every pixel
follows the theme. Widths snap to whole modules (module width plus its
separator, `--control-strip-module-width` + `--control-strip-border-width`,
31 px under Platinum).

### Contextual Menus

Right-click menus resolve target-based, innermost wins: a `ClassicyContextualMenuTarget`-wrapped control > the window's `contextMenu` prop > the app's `contextMenu` prop (`ClassicyApp`) > the desktop default menu (empty desktop only). Desktop icons take an optional `contextMenu` prop. A single `ClassicyContextualMenuProvider` (mounted by `ClassicyDesktop`) renders the one open menu via portal.

```tsx
<ClassicyContextualMenuTarget menuItems={[{ id: "copy", title: "Copy" }]}>
  <ClassicyButton>Copy</ClassicyButton>
</ClassicyContextualMenuTarget>
```

- Components with custom right-click behavior and no menu call `e.preventDefault()` in their own `onContextMenu`; every menu layer checks `e.defaultPrevented` and stays silent.
- If neither a window nor its app defines a menu, right-click shows nothing (the native browser menu stays suppressed inside the desktop).
- Right-clicking a window focuses it first, so the active menu always tracks focus.

### File System: Shared Live Tree

Every `ClassicyFileSystem` for a storage key shares **one live tree**
(`sharedTrees` in `ClassicyFileSystem.ts`); `fs` is a getter onto it. Every
journaled mutation bumps a version and notifies
`subscribeClassicyFileSystem(storageKey, listener)`; `useClassicyFileSystem`
subscribes with `useSyncExternalStore`, so consumers get a fresh `fs` (and
re-render) on any change made through any instance — no store event needed.
`useClassicyFileSystemAccessor()` gives handlers a stable `() => fs` without
subscribing. `fsVersion` (`ClassicyDesktopFileSystemVersionBump`) is now only a
reload *epoch*: an instance constructed under a different epoch re-reads
localStorage into the shared record (adapter reconcile replace, Drive Setup).
A storage key's first instance (or an epoch reload with nothing stored) seeds
the live tree from a deep copy of the defaults (`copyClassicyFileSystemSeed`),
so `DefaultFSContent`, a host's `defaultFileSystem` and seed-migration entries
are never edited in place (0098).
Tests reset the trees in `src/__tests__/setup.ts`.

Derived overlays (Applications, Extensions, Control Strip Modules) mark their
entries `_derived: true`; each rebuild drops the previous build's entries
(`withoutDerivedEntries`) so removed apps/modules don't linger in the shared
tree. Because `fs` changes identity on every mutation, effects keyed on `fs`
must be idempotent — key non-idempotent ones on a derived value (Finder's
drive icons key on `drivesKey`).

### Finder Drag and Drop

Finder items (icon and list views) and the desktop's file icons drag as Mac OS
8 does: a 1-px dotted outline of the icon's opaque shape ∪ its label box
(`drawClassicyDragOutline`, canvas contour walk) follows the pointer in a
body-level ghost (`startClassicyFileDrag`, `ClassicyFileDrag.ts`; 4 px threshold,
Escape cancels, and so does losing the pointer stream: a window `blur`, a
`pointercancel` or the page turning hidden, watched by
`onClassicyPointerStreamLost` (`ClassicyPointerStreamLost.internal.ts`), which
the other pointer-following gestures use too; a window move or resize, a
split view's divider, a table's column resize (ended through
`@tanstack/react-table`'s own release, a position-less document `mouseup` or
`touchend`), the Control Strip's tab and Control-drag, sliders and icon drags
end where they are instead, as a release there would). Targets are hit-tested
with `elementsFromPoint` against
`data-classicy-drop-folder="<path>"` (folder/drive icons, list rows' name cells,
each file browser's root) and `data-classicy-drop-desktop` (the desktop root);
`.classicyWindow`, the menu bar, Control Strip and dialogs block. Folder targets
get `.classicyFileDropTarget` (darkened icon/row, framed window).

- `fs.move(path, toFolder)` does the move (refusals: `missing`, `not-a-folder`,
  `same-folder`, `into-itself`, `locked`, `exists`; journal op `"move"` with
  `to`). `moveClassicyFileSystemItems` (`ClassicyFileMove.ts`) wraps it:
  `ClassicyAppFinderPathsMoved { moves }` (Finder renames open paths, window
  records and folder views), desktop icon placement, and an alert for the first
  refusal.
- The desktop's files live in the invisible `Desktop Folder` on the startup disk
  (created on first drop). Finder windows pass `showInvisible={false}` to
  `ClassicyFileBrowser`, so it — like every `_invisible` entry — is hidden there
  (the header counts it as hidden); other browsers list invisibles dimmed. Finder mirrors it as desktop icons with appId
  `classicy-desktop-item:<path>`, `kind` `file`/`directory`, and `filePath`;
  `ClassicyDesktopIconAdd` with a `location` places the icon there without
  re-laying-out the desktop. `ClassicyDesktop` opens and moves them through the
  accessor.
- Dropped back in its own folder, an icon-view icon repositions by the pointer's
  travel (snapping when the arrangement is a grid).

### Trash

The Trash is a folder at the **root** of the tree (`CLASSICY_TRASH_PATH =
"Trash"`, beside the drives; `_system`, `_invisible`), created by
`ensureClassicyTrash` (Finder runs it on mount). `ClassicyTrash.ts` holds the
fs-only operations; `ClassicyFileMove.ts` the dispatching wrappers.

- **In:** `trashClassicyFileSystemItems` / `moveClassicyItemsToTrash` move items
  with `fs.move(path, "Trash", { name, metadata })`, recording `_trashed`,
  `_trashedFrom` (parent folder), `_trashedName` (when renumbered — clashes
  become "Plan 2.txt") and, for desktop items, `_trashedLocation` (icon spot).
  Locked items are refused with an alert. Routes: drag onto the Trash icon or
  a Trash window (`moveClassicyFileSystemItems` delegates for destination
  `"Trash"`), File ▸ Move To Trash **⌃⌫**, Delete/⌃⌫ in a file browser
  (`onDeleteItems`) or on the desktop (selected file/folder icons).
- **Out:** Restore (right-click an item in the Trash window via
  `ClassicyFileBrowser`'s `itemContextMenu`, or File ▸ Restore there) moves it
  back under its original name (`restoreClassicyTrashItems`; refuses
  `no-origin`/`exists`) and re-places desktop icons. Dragging an item out of
  the Trash clears its trash metadata.
- **Empty:** Special ▸ Empty Trash… (desktop and every Finder window, plus the
  Trash icon's contextual menu) → `ClassicyDesktopShowSystemDialog { dialog:
  "emptyTrash" }` → `ClassicyEmptyTrashAlert` warning → `emptyClassicyTrash`.
  Special ▸ **Reset PRAM…** (`dialog: "resetPram"`) is the old "clear saved
  state and reload". `Desktop.systemDialog` and the refusal alerts'
  `Desktop.errorDialog` are stripped from persistence.
- Finder owns the Trash desktop icon (`filePath: "Trash"`, full/empty art; a
  re-add refreshes `icon`). Finder's `ClassicyApp` passes
  `restoreWindowFocus={false}` so clicking the desktop doesn't raise a Finder
  window (the desktop is Finder's surface).

**Keyboard equivalents use Control (⌃) or Option (⌥), not Command** — the
browser keeps ⌘. `⌫`/`⌦` in a shortcut string mean Backspace/Delete.

### File System Sync Adapters

`ClassicyFileSystem` is browser-local (localStorage-primary), but consumers can
mirror it to a backend by registering an adapter at app entry
(`src/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter.ts`):

```ts
registerClassicyFileSystemAdapter({
    id: 'my-backend',
    onChange: (entry) => {},          // journal mode: every mutation, sequenced
    onSnapshot: (snapshot) => {},     // snapshot mode: debounced full tree + sha256 hash
    reconcile: async (local) => ({ action: 'useLocal' }),  // two-way boot sync
}, { snapshotDebounceMs: 500 })
```

All methods are optional (capability-based). Every mutation flows through
`writeFile`/`mkDir`/`rmDir`/`load`/`setMetadata` — never mutate `fs.fs` or
entries directly; use `fs.setMetadata(path, patch)` for metadata changes.
Snapshots carry a sha256 hash and a persisted monotonic `seq` for drift/gap
detection. At boot, `reconcile` may return
`{ action: 'replace', tree }` to adopt a remote tree (validated, persisted,
then rebuilt via the store's `fsVersion` bump); errors always degrade to
local-wins. Derived folders (Applications, Extensions) are applied via
`applyDerivedTree()` and never journal. Design spec:
`docs/superpowers/specs/2026-07-20-filesystem-adapter-design.md`.

### Untrusted Action Allowlist

`classicyDesktopStateEventReducer` takes an optional trust argument
(`ClassicyActionTrust`, default `"trusted"`). Dispatching an action with
`"untrusted"` — e.g. an effect produced by an interpreted HyperCard stack
script — makes it clear **two** checks in
`src/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust.ts` before any
handler, built-in or plugin, sees it:

1. **The guarded-route floor** (`isActionTrustGuarded`) — `ClassicyDesktop*`,
   `ClassicyWindow*`, `ClassicyAppFinderEmptyTrash`, `ClassicyAppHCEditSetScript`
   are unreachable to untrusted actions, unconditionally. Nothing can opt back in.
2. **The deny-by-default allowlist** — an untrusted action must *also* be an
   allowlisted type. Clearing the floor is necessary but not sufficient.

Both are enforced **in the kernel**, not only at call sites. That is deliberate:
the guarantee must not depend on every dispatch site remembering to check, so a
call site that forgets still cannot reach a non-allowlisted route. There is a
single definition of the rule — `isActionTrustPermitted("untrusted", …)`
delegates to `isUntrustedActionAllowed`, so a call-site check and the kernel's
own check can never disagree.

Call sites should still consult the gate explicitly, because for something like
a HyperCard effect the action `type` itself is script-authored data — checking
first lets the caller drop the effect quietly instead of dispatching a doomed
action and tripping the reducer's warning:

```ts
import {
    isUntrustedActionAllowed,
    registerClassicyUntrustedActionAllowlist,
} from '@classicy/classicy/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust'

registerClassicyUntrustedActionAllowlist('ClassicyAppMyCustomEffect')

// at the dispatch call site:
if (!isUntrustedActionAllowed(actionType)) return // drop the effect quietly
dispatch(action, 'untrusted') // the kernel re-checks the same rule anyway
```

The default allowlist holds exactly one entry, `ClassicyAppOpen` — HyperCard's
core function, so a stack opens apps with zero host configuration. Every other
type must be registered explicitly. Registering can never grant a type past the
floor: `isUntrustedActionAllowed` ANDs allowlist membership with
`!isActionTrustGuarded(...)`, so allowlisting e.g. `ClassicyDesktopSetTheme` has
no effect. Registering the same type twice is a no-op, matching
`registerAppEventHandler`.

Plugin handlers receive the kernel's trust as the third `AppEventHandler`
argument (always passed, normalized by `classicyActionTrustOf` so a garbage
value arrives as `"untrusted"`; a handler may still declare only `(ds,
action)`). Any reduction a handler performs on the action's behalf must
forward it, passing the value it received or `classicyActionTrustOf(trust)`
(`classicyDesktopStateEventReducer(ds, next, trust)`,
`routeClassicyAppOpenFile(…, trust)`, or `checkClassicyActionTrust(trust,
type)` before calling a handler directly), since the reducer's own `"trusted"`
default would upgrade a missing one. `routeClassicyAppOpenFile` and Finder's
handler take `trust` as a required argument, and a missing one counts as
untrusted: the router normalizes it with `classicyActionTrustOf`, and Finder's
handler refuses through `checkClassicyActionTrust`, which fails closed. `dispatchToPlugin` carries no trust
and is always trusted. A host that allowlists `ClassicyAppFinderOpenFile` must
also allowlist each target app's OpenFile type (and
`ClassicyAppMoviePlayerOpenDocument` for legacy QuickTime documents); a URL
shortcut never opens untrusted, since `ClassicyDesktopOpenUrl` is on the floor.

### Theming

Themes are JSON presets of an Appearance Package (`packages/appearance/platinum/src/platinum.json` for Platinum: its 21 `presets`, completed and registered by `packages/appearance/platinum/src/index.ts`; `getAllThemes`/`getTheme` read the registered packages' themes, and with none registered serve the core's own `CLASSICY_CORE_DEFAULT_THEME`, `src/Appearance/ClassicyCoreTheme.ts`) and control:
- Typography (body, ui, header fonts)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

Appearance Packages (`registerClassicyAppearancePackage`, registry in `src/Appearance/ClassicyAppearancePackageRegistry.ts`, hooks and resolution in `ClassicyAppearancePackage.ts`) own the look: base component SCSS is structure only, and every bevel, border, gradient and piece of art lives in the package's stylesheet, one `@layer classicy.package` block scoped under `.classicyDesktop[data-classicy-appearance="<id>"]` (written with `classicy-package($id)` from `src/Appearance/vocabulary/_package.scss`, imported `?inline`, injected as `<style id="classicy-appearance-<id>">`). The active package is the persisted `System.Manager.Appearance.packageId` (default `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `"platinum"`), switched by `ClassicyDesktopChangeAppearancePackage { packageId }` (unregistered id: logged no-op), resolved by `useActiveClassicyAppearancePackage` / `resolveClassicyAppearancePackage` (registered id → registered default package → first registered → `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`, for lone components only); the desktop root's `data-classicy-appearance` carries the **resolved** id, and the desktop warns once per page per unregistered stored id other than the default id (which the default state seeds). With no package registered `ClassicyDesktop` draws only `ClassicyNoAppearancePackage` (`Desktop/`; "No Appearance Package is loaded", the `import "@classicy/appearance-platinum";` line, one `classicyLog("error", "Appearance", …)` per page; styled from the core theme's variables it sets itself; not the Sad Mac) and mounts no children until one registers. A package's optional `icon` (an asset source; Platinum's `platinum.png` is in its art) is shown in the Themes tab, else the generic `system.extension` glyph. Every theme names its package (`theme.package`, missing → `"platinum"`). The `platinum-*` mixins (`_mixins.scss`, `_scrollbars.scss`, `_assets.scss`) live in the package, `packages/appearance/platinum/src/styles/` (one `components/_<Name>.scss` partial per component, included by `platinum.scss` in `dist/classicy.css` bundle order, except Tabs, which comes after Desktop so the tab scroller's hidden scroll bar beats the desktop's Firefox fallback); when a look declaration moves there, every base declaration that must still beat it moves with it, since anything in `classicy.package` beats all of `classicy.base`. `@classicy/classicy/scss/*` is the vocabulary (`vocabulary`, `layout`, `package`); `@classicy/classicy/appearance/platinum/scss/*` is Platinum's SCSS (`mixins`, `scrollbars`, `assets` for host `@use`; `platinum.scss` itself ships compiled and is not for host compilation); The core neither imports nor exports Platinum: nothing `src/index.ts` reaches lies under `packages/`, and it has none of Platinum's names (`ClassicyCoreImportGraph.test.ts`); Platinum is the workspace package `@classicy/appearance-platinum` (`packages/appearance/platinum`, plan 0015 §3.1), whose source imports the core only as `@classicy/classicy` (`PlatinumSourceImports.test.ts`) and whose own build leaves it external (`PlatinumOneRegistry.test.ts`). So a host imports a package at its entry; tests that draw Platinum import `@/__tests__/withPlatinum` (`setup.ts` registers no package); Storybook's preview imports it by path and builds its Theme toolbar from `listClassicyAppearancePackages()` presets. Until the two builds separate (plan 0015 §3.4), the library build's entry, `src/ClassicyLibraryBuild.internal.ts` (the barrel, then `@classicy/appearance-platinum`, aliased to the package's source with `@classicy/classicy` aliased to the barrel), still bundles and registers it, so `@classicy/classicy/appearance/platinum` stays a no-op shim in dist; the example imports that subpath, and its dev server aliases it to Platinum's source. Components rendered outside a `.classicyDesktop[data-classicy-appearance]` element get no look. Details: `docs/AGENT-REFERENCE.md` §8, "Appearance Packages".

Components call `useClassicyAppearance(component, state, ref)` (`src/Appearance/useClassicyAppearance.ts`) on their root: it returns `{ className, style, attrs, emit }`, where `className` is the state classes then the package's `decorate()` class then the last decoration a handler returned (a handler returning nothing keeps it, `{}` clears it), `attrs` holds only package `data-*` keys outside `data-classicy-*` and is spread before the component's own attributes, and `emit(event, detail)` runs the package's `hooks.on[component][event]`; `decorate` must be a pure function of `(component, state)` (memoized on the state classes). User gestures with both a pointer and a keyboard path carry `detail.input` (`ClassicyAppearanceInput`, `"pointer" | "keyboard"`), read from the last press or release (bare modifier keys ignored) unless a pointer-only handler passes it outright. Feedback sounds and the menu-item flash are Platinum hooks (`packages/appearance/platinum/src/hooks.ts`, deeply frozen: compose a new object to build on them; sounds played with `playClassicyAppearanceSound`, mapped per input exactly as the components played them), never component code; error beeps (`ClassicySoundPlayError`) and the boot sound stay in the components. So a component with no package hooks is silent, and a menu item with no package flash runs its action through the 400 ms fallback. The hook reads the active package without the store, so store-mocking tests need no `System.Manager.Appearance`; tests that assert a feedback sprite or the flash `import "@/Appearance/Platinum"`. Each wired component has an `AppearanceHooks` story under the `storybook-probe` package (`storybook/.storybook/ClassicyAppearanceProbe.tsx`), registered only while the probe is mounted (`unregisterClassicyAppearancePackage`). Details: `docs/AGENT-REFERENCE.md` §8, "Package hooks".

Arrangement (where parts go, not how they look) is CSS `order` on the parts carrying `data-classicy-control` (title-bar boxes; base 10/30/40, title 20), `data-classicy-role` (alert buttons) and `data-classicy-part` (menu-bar clusters 10–60; a balloon-wrapped title's anchor is ordered by `:has()`), plus the alert icon/body, tab strip and disclosure label classes, all set in base SCSS and overridden in a package's CSS; plus the package's `layout` block (`window.growBoxCorner`, `menuBar.placement`, `desktop.iconGridOrigin`), read by `useClassicyAppearanceLayout()` (components) or the store-free `getClassicyAppearanceLayout(packageId?)` (reducers), resolved from `Appearance.packageId`, and published on the desktop root as `data-classicy-grow-box` / `data-classicy-menu-bar` and `--classicy-layout-*` (by `ClassicyDesktop`, not `getThemeVars`). Placement `window` makes the screen bar headless (it still dispatches chords), zeroes `--menu-bar-height` on the desktop root (`classicyLayoutThemeVars`, spread after the theme's variables and before the host's `style`), so windows may use the full height, and gives each window with an `appMenu` a `ClassicyWindowMenuBar`; the grow-box corner drives the grip CSS and `computeClassicyWindowResize` (fed the live `--window-resize-inset` as its fudge and `[0, --menu-bar-height]` as its floor, the same floor the release clamp applies; the window reads both from its own element, so it follows the desktop it is in). Existence of parts stays behavioral: a package only reorders or hides. The Storybook-only `mirrored` package (`storybook/.storybook/MirroredPackage.ts`, `mirrored.scss`: Platinum's mixins rescoped, then the flips) is the proof, with six `Mirrored` stories (`mirroredParameters` from `storybook/.storybook/mirrored.ts`, which registers the package; only those story files import it, never `preview.tsx`, so other iframes' package lists stay clean), and the template for a new package. Details: `docs/AGENT-REFERENCE.md` §8, "Layout declarations".

Built-in themes are never mutated: the first color/font/desktop/metric edit on one (`ClassicyDesktopChangeColor { colorKey, index?, color }`, `ChangeFont*`, `ChangeBackground*`, `ChangeMetric`, `ChangeAppearanceOption`) forks it into its package's "Custom" theme (`classicyCustomThemeSlotId`: `"custom"` for Platinum, `custom-<packageId>` otherwise; a slot held by another package's theme moves that theme aside to `<slotId>-<n>`) in `Appearance.customThemes` and activates it; later edits modify the active custom theme (`editActiveClassicyTheme`, `ClassicyCustomTheme.ts`). `ChangeTheme` searches the active package's loaded built-ins, then its defaults and presets (completed like a package switch's defaults: a registered wallpaper held by its filename), then customs, then other packages' built-ins, so an id another package also uses resolves to the active package's theme; it never changes `packageId`. Built-ins are never persisted (`ClassicyBuiltInThemes.internal.ts`): `sanitizeStateForPersistence` drops `availableThemes` (the load path drops one saved by an older build; the default state lists none, and `ClassicyDesktop` loads `getAllThemes()` when it mounts with a package registered, else when the first one registers) and saves a built-in active theme as `{ id, package }`, plus `defaults: true` when it is its package's defaults theme. On load, an active theme whose id names a built-in of its package is replaced by the current preset (same completion as `ChangeTheme`), whatever data it held, in-place edits saved before custom themes (v0.83) included; for a package not registered yet that happens when it registers, Platinum included: a first session's active theme is the core's `CLASSICY_CORE_DEFAULT_THEME`, refreshed when the store is created (default package registered first) or when that package registers (store first, as a host's entry loads them); an active theme that is its own package's defaults (by id; the core stand-in's id for the unregistered default package; for another unregistered package, a pending reference saved with `defaults: true`, so a package the host dropped still heals) gives way to the drawn package's defaults whenever the drawn package differs, at store creation, on every registry change and on a drawn-package change through the store, without writing `packageId` (`drawnClassicyPackageDefaults`; customs, presets and an unregistered package's host-loaded themes are never replaced; another package's defaults chosen explicitly last until the next load); a provider `defaultState` seed's theme tweaks (data, not id) are forked into the Custom theme of the package the seed draws, so they persist, and that fork follows the drawn package while it stays untouched in the session (`withClassicyDefaultStateSeed`). A reference to a preset that is gone falls back to its package's defaults with one `classicyLog` warning. Customs, host-loaded themes and an unregistered package's themes (Platinum's too, before it registers: no load or persist helper treats a package as known until it registers, except that the default state's merge base is always stripped of default knobs, since it holds no user edits) are saved whole and never refreshed, except that a package's registration stores by filename the wallpaper of each of its themes that a `data:` URI or older URL saved before the index had it, in the same store write as the preset refresh. Themes hold and persist a registered wallpaper by its filename (`"azul_dark.png"`, the `file` given to `registerClassicyWallpapers`), never a build's URL for it: `ChangeBackground`, theme loading, `sanitizeStateForPersistence` and a `migrateClassicyState` step store `portableClassicyWallpaper(value, theme.package)` (a 2.x save's inlined `data:` URI matches by the `legacyDigests` Platinum registers, `platinumLegacyWallpapers.ts`; an old path or hashed asset URL by its basename, hash stripped), and `getThemeVars` resolves it at render (`resolveClassicyWallpaper`, `src/Appearance/ClassicyWallpaperIndex.ts`, store-free); an unmatched `data:` or http(s) URL is kept and still renders, any other unmatched value renders no image. A filename is unique within its package only (0143): a bare filename means the theme's own package's (then Platinum's, then the active one's), a theme stores a wallpaper bare when it is its own package's or Platinum's that its package has no file of that name for, and `<package>|<file>` otherwise (`"platinum|default.png"` in a theme of a package with its own `default.png`; neither half may hold `:` or `/`, so it never reads as a URL or `data:` URI), decided from the theme's package and Platinum only, never the active package, so a stored theme renders the same image whichever package is active; a reference resolves to that package's only, and a bare filename is never rewritten, so a Platinum-only host's saved bytes are unchanged; theme files write and import `classicyWallpaperReferenceFor`, which qualifies every other package's wallpaper (an import pins a bare filename its package lacks to the first of Platinum, the importing host's active package, then the other packages in registration order that registers it, so with two other packages sharing it the pick depends on the importing host). A host's `ClassicyDesktopLoadThemes` list is session state, dispatched on every boot.
The 28 editable colors are defined once in `CLASSICY_THEME_COLOR_TARGETS` (`ClassicyThemeColorTargets.ts`), which drives the reducer's validation and the Appearance Manager's Colors tab. Details: `docs/AGENT-REFERENCE.md` §8.
The 20 editable layout metrics are defined the same way in `CLASSICY_THEME_METRIC_TARGETS` (`ClassicyThemeMetricTargets.ts`, edited by `ClassicyDesktopChangeMetric { metricKey, value }`): layout constants are theme data under `measurements.<family>` (window, control, button, groupBox, layout; Platinum defaults in `CLASSICY_DEFAULT_THEME_METRICS`; an Appearance Package may add families of numbers, which the schema and `withDefaultThemeMetrics` keep), every numeric input is emitted as `--<family>-<key>` (kebab-case) by `classicyMeasurementVars` (`ClassicyThemeMetrics.ts`; names must be lowercase-first camelCase, and on a name collision core inputs win, then package families in key order, each collision logged once), derived sizes (frames, bevels, the edit-field height, …) are computed in `getThemeVars`, and there are no `--hig-*` variables. Themes persisted or saved before the groups existed are completed by `withDefaultThemeMetrics(theme, defaults?)` (on load via `migrateClassicyState`, in files via zod defaults); the migration fills only the core five, because it runs before a host registers its package (H-R17).
No bare `Npx` in `src/**/*.scss` or a workspace Appearance Package's `packages/appearance/<id>/src/**/*.scss` (`bin/check-pixel-literals.ts`, run by `pnpm lint`; it reads `#{…}px` too; the SCSS gates share these roots, `classicyScssSourceRoots` in `bin/classicyScssSource.ts`); pixel-matched surfaces read `measurements.<family>` knobs from `platinum.json`, emitted as `--<family>-<key>` by `getThemeVars`. Platinum's `defaults.measurements` holds 21 knob families (95 keys) beside the core five (only in `defaults`; Platinum's `index.ts` fills the 21 presets); `knobs` metadata, and so the Options tab, covers six of them (`controlStrip`, `menuFrame`, `pager`, `balloonHelp`, `popUpSlider`, `scrollbar`; 42 knobs, H-R4). A knob a base stylesheet or component reads is a structural knob (H-R13): every package's themes must emit it, which the core floor guarantees (`CLASSICY_CORE_MEASUREMENT_DEFAULTS`, `src/Appearance/ClassicyCoreTheme.ts`: the core five and the 84 structural knobs at Platinum's values, never read from `platinum.json`; the 11 look-only knobs are Platinum's alone). `getThemeVars` completes a theme key by key from `classicyThemeMeasurementDefaults(theme.package)` (the core floor, then the registered package's own values, the package winning; H-R2) before walking it, and `sanitizeStateForPersistence` stores each theme without the knob values equal to its package's defaults (`withoutDefaultThemeMeasurements`; a theme whose package is not registered yet is stored whole). The pixel gate has no allowlist (any literal in a scanned `.scss` fails), and `ClassicyAppearance.varCoverage.test.ts` (over the same roots, Platinum's scripts included) fails on a `var(--x, Npx)` fallback or on a read nothing emits, declares or sets. Full table and rules: `docs/AGENT-REFERENCE.md` §8, "Package knob families" and "Pixel literal gate".
Colors: never a literal — use a `--color-*` token or `classicy-tint`/`classicy-shade`/`classicy-alpha("--color-x", pct)` from `src/Appearance/vocabulary/_color.scss` (`@classicy/classicy/scss/color`; `color-mix` expansions). `node bin/classicyLiteralColorSweep.ts` (also run by a test) lists any literal left; it scans the same roots and exempts an Appearance Package's custom-property declarations (`--name: value`) under `src/Appearance/<Package>/` or `packages/appearance/<id>/src/`, `var(--classicy-*, …)` fallbacks and data URIs (the span only, not the rest of the line; a theme variable's literal fallback is dead and flagged), the screen savers' art under `savers/`, and the crash screen's and color picker's listed declarations. Proportions: `getThemeVars` emits 119 named derivations last (`CLASSICY_THEME_DERIVATIONS`, `ClassicyThemeDerivations.ts`), such as `--window-collapsed-height`, `--menu-bar-height`, `--popup-height` and `--ui-font-size-small`: rounded to three decimals except the font sizes, which are unrounded to match the `calc()`s they replaced. Stylesheets read the name, never a new `calc(var(--x) * N)`: `node bin/check-pixel-literals.ts` (in `pnpm lint`, and a test) also gates multipliers against `bin/multiplier-allowlist.json`, which holds only the 40 sites over 9 files kept on purpose (Part G's, the H-R7/H-R21 pixel-grid, crayon-art and centering geometry, and the button spacing scale; a file's Sass constants, in-block ones included, and numeric loop variables count as factors), each group with a one-line reason (`docs/AGENT-REFERENCE.md` §8); a multiplier of a user-editable metric becomes a derivation of it, never a fixed knob (H-R25). Every variable `getThemeVars` sets after the measurement inputs, every `--classicy-*` name and every `--color-*` name (H-R16) is reserved (`isReservedClassicyThemeVar`): a package measurement that would make one is skipped by the walker, and is never an editable knob (`isThemeMetricFamilyTarget`) — derivation names that sit in a knob family's namespace (`--balloon-help-font-size`) included (H-R28c). Derived sizes are computed from the theme, so a host overriding an input variable no longer rescales them; it overrides the derived variable instead. JS reads a size with `readClassicyThemeVar(name, fallback?, el?)` (`ClassicyThemeMetricReader.ts`), never a hard-coded number, and never from a reducer: reducers compute from `getThemeVars(theme)` (desktop icons: `classicyDesktopIconMetrics` in the reducer, `readClassicyDesktopIconMetrics` in render and handler code).
Theme files (`ClassicyThemeFile.ts`, Themes tab "Save Theme…"/"Load Theme…") are `{ format: "classicy-theme", version: 1, theme }`, validated by the zod `ClassicyThemeSchema` (strips unknown keys except measurement families; font sizes are 8–72 px (`ClassicyThemeFontSizes.ts`): the typography sizes, `desktop.iconFontSize` and, by key name, any measurement key `fontSize` or `…FontSize` in any family, which `ClassicyDesktopChangeMetric` and the Options tab also bound and `migrateClassicyState` clamps on load; `package` defaults to `"platinum"`; `backgroundImage` must be a registered wallpaper, a filename or `<package>|<file>` (a package's own themes, `ClassicyPackageThemeSchema`, may name any plain filename or `<package>|<file>`) or a plain http(s) URL because it lands in a CSS `url("…")`). Export writes wallpapers by filename, another package's than the theme's as `<package>|<file>`. A theme whose `package` is not registered, Platinum's included, is refused (`readClassicyTheme`): Load Theme… refuses it before any dispatch (`parseClassicyThemeFile`) and shows the error in the Appearance Manager's own alert, a raw `ClassicyDesktopImportTheme` for an uninstalled package sets `Desktop.errorDialog`, and a raw dispatch whose payload fails the schema is ignored silently. `ClassicyDesktopImportTheme { theme }` re-validates, always appends a new custom theme (`custom-<slug>` id, name de-duplicated against every theme and the active package's presets, never a registered package's Custom slot) and activates it; the Appearance Manager's Load Theme… switches to the file's installed package first.

Swappable assets (icons, cursors, wallpapers, fonts, system art) live in the per-package asset registry, `src/Appearance/ClassicyAssetRegistry.ts`: `registerClassicyAssets(kind, packageId, tree)` deep-merges (so `registerClassicyIcons({ system: { files: { document } } })` keeps every other `system` entry), reads resolve the active package then the default package (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, where `ClassicyIcons.ts` registers the core icon tree), and components read at render time with `useClassicyAsset`/`useClassicyAssetTree` (elsewhere `resolveClassicyAsset` at call time) — never a module-scope capture like `const x = ClassicyIcons.…`. `ClassicyDesktop` publishes registered cursors and system art as `--classicy-cursor-<role>` / `--classicy-art-<key>` on its root (`useClassicyAssetVars`); stylesheets use them with a fallback, since an undefined variable voids the whole `cursor` declaration. Everything Platinum registers is in `packages/appearance/platinum/src/assets/platinumAssets.ts` (cursors by `ClassicyCursorRole`, the `ClassicySystemArtKey` art, wallpapers, the thirteen `.woff2` faces) plus the core icon tree registered by `ClassicyIcons.ts` under `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`; each of Platinum's registrations is made under `const PLATINUM = "platinum"`. Full reference: `docs/AGENT-REFERENCE.md` §5.
Platinum's art lives in `packages/appearance/platinum/src/assets/` (`art/*.svg|png`, mapped to `ClassicySystemArtKey`s by `art/platinumArt.ts`; Control Strip and pop-up slider pixel art in `pixelart/`, read by `ClassicyPixelArt`'s `art` prop) and is read from package SCSS as `var(--classicy-art-<key>)` image layers (title-bar stripes and windoid texture, control-box glyphs and dither, grip, menu and pop-up arrows, slider thumbs, tab outline, QuickTime controller thumbs: images, not masks, because masks blend anti-aliased edges differently and Platinum must render pixel-identical) or as `::before`/`::after` glyph `content` in the component partials (menu check and dash, bevel ▸ ▾, placard ▾, file-input ✕, written as CSS escapes so the CSS stays ASCII). Never embed a `data:` URI or a text glyph in component code. Both chromes draw one title bar, `ClassicyWindowTitleBar` (structure mixins in `Window/ClassicyWindowTitleBar.scss`, stripes from Platinum's `platinum-title-bar-stripes`).

#### App display overrides (`apps` on a package)

A package's optional `apps: Record<appId, { name?, icon?, description? }>` (`ClassicyAppIdentityOverride`, validated by `ClassicyAppIdentityOverrideSchema`) shows any app, bundled or host, by another name, icon or desktop-icon balloon copy; the package beats the `ClassicyApp` `name`/`icon` props for display, the props stay the internal identity, and Platinum declares none. Display only: ids, action types (`ClassicyApp${name}OpenFile`/`CloseFile` keep the internal name; bundled apps use literal types), routing, records (`loadApp` refreshes `apps[id].name/icon` from code, though a host `defaultState` seed wins for a first session; parade entries carry a `followsAppIcon` flag, never the override), persisted state (pinned by `ClassicyAppIdentityPersistence.test.tsx`) and analytics (the pageview app segment, paths, the About box's and desktop icons' `track` payloads) never take it; Quit stays "Quit", but window titles reach GA verbatim and a window's `track` payload carries its `icon` prop. Read it with `useClassicyAppIdentity(appId, fallback)` / `useClassicyAppIdentityOverrides()` in components and `resolveClassicyAppIdentity(appId, fallback, packageId?)` / `classicyAppIdentityFrom` elsewhere (`src/Appearance/ClassicyAppIdentity.ts`): **store-free**, like `useClassicyAppearanceLayout.ts`, so reducers may import it; lookups use `Object.hasOwn`. Desktop icons resolve it only for `kind === "app_shortcut"` (drives share `Finder.app`); an app shortcut's balloon is the stored `desktopIconBalloonHelp`, else the package's `description`, else the manifest's, else the kind's stock copy, titled with the name shown. Menu helpers (`appSwitcherAppsFrom`, `withClassicyAppIdentityMenuItems`, `withClassicyAppIdentityAboutItem`) live in `ClassicyAppSwitcherUtils.ts`; stored About titles keep `About ${internal name}`, and the window menu bar retitles only the `${appId}_about` item titled that way. A Control Strip module with an `appId` takes the app's display name only when it is overridden (`classicyControlStripModuleLabel`). The derived Applications, Extensions and Control Strip Modules folders key entries by **display name** (`classicyDerivedAppEntryNames`, `ClassicyDerivedAppEntrySource`): static entries are never overwritten (only an untouched `_placeholder` gives way), and an app that cannot take its name falls back to its own name, then `"<own name> (<id>)"`, numbered `"… 2"`, warning once; `_derived` entries are stripped from every snapshot and the localStorage write, so a switch never changes persisted bytes; a display name holding `fs.separator` is never a key, in Control Strip Modules too. Display names are 1–64 chars with no surrounding spaces, leading `_`, `:`, control, bidi or invisible characters, checked by code point (tags, Hangul fillers and variation selectors refused, VS16 after an emoji allowed); registration stores a frozen copy of the validated `apps`. Every asset `url()` an emitter writes, in src or a workspace package's source, is quoted, `url("…")`, as `isClassicyAssetSource` assumes (`ClassicyQuotedUrl.repo.test.ts`). The Storybook-only `renamed` package (`storybook/.storybook/RenamedPackage.ts`, `RenamedByPackage` story) is the proof. Details: `docs/AGENT-REFERENCE.md` §8, "App display overrides".

### Vocabulary and cascade

- **State classes** are bare and sit beside the root: `.classicyButton.pressed`, `.classicyWindow.active`, never `classicyButtonPressed` and never `data-state` (none is emitted). The 15 states (`active inactive disabled selected pressed focused hover collapsed open dragging error default checked mixed expanded`) are generated from `src/Appearance/vocabulary/ClassicyVocabulary.json` by `node bin/generate-vocabulary.ts` (run by `generate-barrels`; CI runs `--check` for freshness) into `ClassicyVocabulary.ts` (`CLASSICY_STATE`, `classicyStateClasses`, `CLASSICY_COMPONENT`, `CLASSICY_PART_ATTRIBUTE`) and `_vocabulary.scss` (`$classicy-states`, `classicy-state()`, which errors at compile time on an unknown name). Emit states with `classicyStateClasses({ … })`; write single-state base rules as `:where(.root).state` so they keep the root rule's specificity. The generator rejects a state that collides with a root or part class; a coverage test (`ClassicyVocabulary.test.ts`) requires every `classicy[A-Z]…` token in the string/template literals and object-literal keys of src `.ts`/`.tsx` and each workspace package's `packages/appearance/<id>/src` (savers, tests and stories excepted) to be a declared root, part or extra class — non-class tokens go in its `NOT_CLASSES` allowlist with a reason, and a class built as `` `classicyX${…}` `` needs a `TEMPLATE_FAMILIES` entry, whose suffixes the test reads from the type union (or SCSS palette) the template interpolates, each declared.
- **Part attributes**: `data-classicy-control` (`close|zoom|collapse`, window control boxes), `data-classicy-role` (`default|cancel|other`, alert buttons), `data-classicy-part` (`apple|app|help|switcher|extensions|clock`, menu-bar clusters; `window-menu-bar`, the root of a window's own menu bar; `modifier-control|option|shift|command`, `ClassicyKbd`'s modifier glyph spans).
- **Passthrough**: every exported component with a DOM root merges `className` (appended after root and state classes) and `style` (spread after its own) onto its outermost element, so consumer `style` keys win over the component's own, component custom properties included — except window geometry and `zIndex`, which the window and icon states own (`ClassicyWindow` keeps its geometry and drops `zIndex`; `ClassicyIcon`/`ClassicyDesktopIcon` drop `zIndex`, and a `left`/`top` there overrides the drag position). Components with no root of their own (`ClassicyApp` and the bundled apps on it, the providers, controllers, and fragment renderers such as `QuickTimeSeekBar`) take neither — the full list is in `docs/AGENT-REFERENCE.md` §4.0.1; `ClassicyPassthrough.test.tsx` and `ClassicyPassthrough.more.test.tsx` hold one row per component that does.
- **Cascade**: component CSS compiles into `@layer classicy.base` (see the Cascade layers note under Build Notes for the plugin and host rules); there is no `!important` in src SCSS or a workspace package's (test-enforced by `ClassicyCascade.repo.test.ts`), so a state rule must follow the base rule it overrides. Public contract: `docs/AGENT-REFERENCE.md` §4.0.1.

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- ffmpeg is **built from source** on macOS and Linux (prebuilt binaries were inconsistent and missing codecs). `mise install` runs `bin/ffmpeg-deps.sh` via a `preinstall` hook, which installs the required development libraries with `brew` or `apt-get` — on Linux that means an **automatic `sudo` prompt** the first time. The script is a fast no-op once the libraries are present. Run `bin/ffmpeg-deps.sh --check` to see what's missing without installing. Its package lists must stay in sync with `ASDF_FFMPEG_ENABLE` in `mise.toml`; it must stay executable (mise runs hooks via `sh`, so the `#!/bin/bash` shebang is what provides bash semantics). Non-apt Linux distros are reported, not automated. CI deliberately still uses the distro `ffmpeg` package.
- `pnpm build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from `assets/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
- **Styles ship inside the JS** (#303): `injectCssPlugin` (`vite.config.ts`) appends `bin/classicyStyleInjector.ts`'s code to both entry bundles, which inserts `classicy.css` as `<style id="classicy-styles">` at the top of `<head>` on first import (once; skipped without a `document`). `dist/classicy.css` is still emitted for strict-CSP hosts. Fonts are not part of it: the Platinum fonts are `.woff2` files under `packages/appearance/platinum/src/assets/fonts/`, registered by `registerClassicyFonts` as `<style id="classicy-fonts-platinum">` pointing at the emitted `dist/assets/*.woff2`. A strict CSP blocks that element too, so `injectCssPlugin` also emits `dist/classicy-platinum.fonts.css`: the same `@font-face` rules, unlayered, from the same face list (`Platinum/assets/platinumFonts.internal.ts`) and rule writer (`ClassicyFontFaceCss.internal.ts`) the runtime uses, built by `bin/classicyFontStylesheet.ts` with each `url()` the font's emitted file relative to dist (`verify:dist` invariant 12 checks the faces and that every url is a file in `dist/assets/`). Strict-CSP hosts link `classicy.css`, `classicy-platinum.css` and `classicy-platinum.fonts.css`, in that order. The dotted name keeps it out of the `classicy-<name>.css` namespace, which belongs to package stylesheets (invariant 7 reads every such file as one). `dist/fonts.js` (+ `fonts.d.ts`, emitted by `injectCssPlugin`; not a Rollup input, since UMD allows one entry) is a deprecated no-op shim so existing `import "@classicy/classicy/fonts"` lines keep resolving (`exports` `./fonts`, listed in `sideEffects`); `dist/appearance-platinum.js` (+ `.d.ts`), the `@classicy/classicy/appearance/platinum` export, is the same kind of no-op, since the main bundle already registers Platinum. Package CSS is not in `classicy.css`: each package's `?inline` stylesheet ships as a string in the bundles, injected at runtime by the package registry, and `injectCssPlugin` also emits it, from the module's final code, as `dist/classicy-<name>.css` (Platinum: `dist/classicy-platinum.css`, starting with the layer order) for strict-CSP hosts, who link it right after `classicy.css`. `verify:dist` (invariant 7) requires both entry bundles to carry a non-empty scoped package block and `classicy-platinum.css` to be byte-identical to it. `verify:dist` invariant 9 (`bin/classicyDistCharset.ts`) requires every `dist/*.css` to be ASCII only or to open with `@charset "UTF-8";` (a linked stylesheet served without an HTTP charset otherwise takes a non-UTF-8 page's encoding); `vite.config.ts` keeps them ASCII with `esbuild.charset: "ascii"`, so package glyph `content` is written as escapes.
- **Cascade layers**: `classicyCssLayerPlugin` (`bin/`, registered in `vite.config.ts`, Storybook's `viteFinal` and the example's live-source dev server) wraps every compiled `<repo>/src/**/*.scss`, `?inline` included, in `@layer classicy.base { … }` (one block per file; on the dev server each is also preceded by `CLASSICY_LAYER_ORDER`, `@layer classicy.base, classicy.package, classicy.user;`), except a stylesheet that already is exactly one block of another declared layer: an Appearance Package's `?inline` sheet, one `@layer classicy.package { … }` block, which wrapped would sink to `classicy.base.classicy.package`, under every base rule; its `transformIndexHtml` prepends `<style id="classicy-layer-order">` to every HTML page Vite serves or builds (Storybook's iframe, the example dev server), and the injected stylesheet and `dist/classicy.css` (`prependLayerOrder`, after Vite's hoisted `@charset`) start with the statement. Because it comes first in `<head>`, unlayered host CSS **and every host layer** (Tailwind v4 preflight in `@layer base`, say) beat all of `classicy.*`, `classicy.user` included; hosts override in `classicy.user` or unlayered, and keep resets beneath Classicy in the reserved sublayer `classicy.base.host`, which Classicy never declares. For Tailwind v4 that means **replacing** `@import "tailwindcss";` with its granular form, `@layer theme, base, components, utilities;` plus `theme.css layer(theme)`, `preflight.css layer(classicy.base.host)` and `utilities.css layer(utilities)` (an extra preflight import beside the shorthand still loads a copy into `base`). Contract in `docs/AGENT-REFERENCE.md` §1. New Classicy styles must be `.scss` under `src/` (a plain `.css` would sit unlayered and beat them all), and a component SCSS must never contain a CSS `@import`: it is invalid inside the layer block. `verify:dist` fails if either artifact loses the order statement, holds anything but `@layer classicy.base` blocks after it (invariant 10, `bin/classicyBaseCss.ts`), or if a plain `.css` file under `src/` or a package's `packages/appearance/<id>/src/` holds a rule (invariant 11; the empty `src/index.css` passes). The runtime `@font-face` `<style>` that `registerClassicyFonts` writes stays unlayered (layers do not affect `@font-face`).
- **Package assets emit as files**: lib mode inlines every asset regardless of `assetsInlineLimit`, so `noInlineAppearanceAssetsPlugin` (`bin/classicyNoInlineAssets.ts`, used by both library builds) appends the per-import `?no-inline` opt-out to every asset import that resolves under `src/Appearance/` or `packages/appearance/`, and `assetFileNames` puts those files in `dist/assets/`. The one deliberate exception is the `halftone` art, imported `?inline` (`art/platinumArt.ts`, ruling E17): it is Platinum's only mask, and a `data:` mask needs no CORS fetch; `halftone.svg` is still emitted with the rest of the art. `verify:dist` fails the build if a bundle stops injecting the stylesheet, inlines a base64 font, `fonts.js` gains an import, or `dist/assets/` stops holding the 13 `.woff2` files and exactly the `.svg`/`.png` set in `packages/appearance/platinum/src/assets/art` (missing and extra names are reported; `bin/classicyDistAssets.ts`) (and the ES bundle its `new URL("assets/…")` references).
- **Breaking change for Vite consumers**: because package assets are files referenced by `new URL("assets/…", import.meta.url)`, a consumer's Vite dev server must not pre-bundle classicy (the pre-bundle in `node_modules/.vite/deps/` rewrites those URLs, so fonts and art return the SPA fallback). Consumers set `optimizeDeps: { exclude: ["@classicy/classicy"] }`; any CommonJS dependency classicy pulls in may then need to go in `optimizeDeps.include`. Bundlers that handle `new URL(…, import.meta.url)` (a Vite production build, webpack 5, Rollup with a URL plugin) need no setting; with any other (plain esbuild, Rollup without such a plugin) the consumer copies `dist/assets/` next to the bundle. Documented in `docs/AGENT-REFERENCE.md` §1 and the README, alongside `@classicy/classicy/fonts` becoming a no-op and `classicy/dist/fonts.css` being removed. Package assets also ship exactly as authored: `VitePluginImageTools` has `excludes: /src\/Appearance\//` so they get no WebP conversion or svgo, and `verify:dist` fails on any `.webp` in `dist/assets/` or a shipped SVG that differs from its source.
- **Published SCSS**: `files` ships `src/Appearance` for the `./scss/*` (vocabulary) export; `./appearance/platinum/scss/*` now points into the workspace package (`./packages/appearance/platinum/src/styles/*`), which `files` ships too (tests kept out by that folder's `.npmignore`), until plan 0015 §3.4 drops both for the package's own `./scss/*` (the package ships `src/styles`, its tests kept out by `src/styles/.npmignore`; `PlatinumPackageManifest.test.ts` packs it). Platinum's sheets reach the vocabulary as `pkg:@classicy/classicy/scss/*`, so every build and test that compiles them passes Sass's `NodePackageImporter`. The core's tests and `__tests__` helpers are kept out by `src/Appearance/.npmignore`, which npm and pnpm both honor. A `!` pattern in `files` would not do: npm 11 honors it, but pnpm 10 ignores it and packs every test. `ClassicyPackageExports.test.ts` asserts on what both packers really pack (`npm pack --dry-run --json`, `pnpm pack --dry-run --json`). The type declarations leave out tests, `__tests__` helpers and stories too: `vite-plugin-dts` takes `exclude: CLASSICY_DTS_EXCLUDE` (`bin/classicyDistTypes.ts`), and `verify:dist` fails if `dist/types` holds a declaration for one.
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation
- **Stale `index.lock`**: an empty `index.lock` (mode 600, no holder) in the main checkout or in `.git/worktrees/<name>/` is left by a `git status` that was SIGKILLed mid-scan: the clued plugin's hook relay runs `git status --porcelain --untracked-files=all` after every Bash call under a 2 s `exec.CommandContext` timeout (umask 077, hence mode 600). Clear it with `bin/git-clear-stale-lock.sh [--dry-run] [--min-age SECONDS] [DIR]`, never a bare `rm`: it removes the checkout's own lock only when it is a regular file, empty, at least 60 s old, held open by no process, and no git process runs in that git dir (exit 2 otherwise; Linux only, it reads `/proc`). Story 0094-h7m.

@.claude/wiz-claude.md
