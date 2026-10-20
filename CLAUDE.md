# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8 (Platinum) interface. It's distributed as an npm package with ES and UMD module formats.

## Common Commands

This project uses **pnpm** (enable via `corepack enable`). The repo is a pnpm workspace: the root is the `classicy` library and `example/` is a member that consumes it via a `workspace:*` dependency — no `npm link` needed.

```bash
pnpm install              # Install dependencies (root + example workspace)
pnpm build:source         # TypeScript + Vite build only (fastest iteration)
pnpm build                # Full build (audio sprites + source)
pnpm build:audio          # Generate audio sprites from assets/sounds/
pnpm build:watch          # Watch mode: rebuilds source + audio on file changes
pnpm lint                 # Run Biome (`biome check .`); lint:fix writes changes
pnpm preview              # Full build → run example app
pnpm storybook            # Run the component showcase (Storybook) dev server
pnpm build:storybook      # Build static Storybook to storybook/storybook-static/
```

**CI** (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm exec tsc --noEmit -p .` and `pnpm test` on every pull request and push to `main`; run the same three locally before pushing.

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

- **Zustand store** (`src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`) - Global store created with `create<ClassicyStoreWithActions>()`
- **`useAppManager(selector)`** - Zustand hook to read state. Use selectors for performance.
- **`useAppManagerDispatch()`** - Returns the dispatch function from the Zustand store
- **classicyDesktopStateEventReducer** (`ClassicyAppManager.ts`) - Still routes events by prefix to domain-specific handlers (called inside Zustand's `set()`)
- **App windows** — `apps[id].windows` is a `Record<windowId, ClassicyStoreSystemAppWindow>` (1.0; an array in 0.x). Read/write it only through `getAppWindow`, `listAppWindows`, `hasAppWindow`, `countAppWindows`, `setAppWindow`, `removeAppWindow`, `updateAppWindow` (`ClassicyAppWindows.ts`); never branch on key order. `migrateClassicyState` (`ClassicyStateMigrations.ts`) converts 0.x arrays on load (after the merge over defaults) and on every `mergeClassicyState` result; it is shape-detecting and idempotent — there is no state version number
- **SoundManager** still uses React Context/useReducer (not migrated to Zustand). Its `volume` (0–100, `ClassicyVolumeSet`) is the Howl player's gain, applied by `ClassicySoundManagerProvider` and re-applied when a sound theme loads; it is per-mount, like the mute flag (`"*"` in `disabled`); alerts (`ClassicyAlertSound`/`ClassicySoundPlayError`) play at that gain × the persisted `Appearance.alertVolume` (0–100, `ClassicyDesktopChangeAlertVolume`)

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
- `desktopIconBalloonHelp` — `string` (titled with the app name) or
  `{ title?, content, position?, delay? }`. When omitted, the app's registered
  manifest description (`registerApp`) is the balloon, so every registered app
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
your own `system.alias` entry via `registerClassicyIcons`.

### Window Order & Focus Succession

Windows stack and refocus by recency (`zOrder` = last open/focus time;
`lastAccessedWindowId` = last focused):

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
- The Screen Saver control panel
  (`ControlPanels/ScreenSaverManager/`) is part of `ClassicyControlPanels`.
- Overlay z-index is 100001 (above dialog overlay 99999 and startup 100000);
  reduced-motion users get a paused (static) saver.

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
  `onResizeCommit` fires once per gesture (mouse release / arrow-key
  release) — persist there and feed the saved sizes back as `defaultSizes`.
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
  edges / tops aligned) or `"center"`; `popupAnchorInset` shifts the edges the
  surface is placed against (the Control Strip overlaps the strip by 3 px).
- Both surfaces share the Platinum menu frame (below).
- `popupTrigger="click"` (default in `popup` mode): a quick click leaves the
  menu open (sticky); a press held past `popupHoldDelayMs` (500) is a standard
  menu — a document `mouseup` over an item `click()`s it.
- `popupTrigger="hold"` (default in other modes): the click keeps the mode's
  behaviour and only a long press opens the surface; the click ending that
  press is swallowed (`suppressClickRef`).
- Keyboard: a click with `detail === 0` (Enter/Space) toggles a click-trigger
  surface; Down Arrow opens either kind with the first item focused.

### Menu Frame

Every menu — menu bar dropdowns, contextual menus, submenus, pop-up bevel
menus — draws the Platinum frame from the `platinumMenuFrame` mixin
(`appearance.scss`). HIGOS8 Ch.4 (p.91) describes it only in words ("beveled
edges", "etched" dividers); the pixels are matched to the open Control Strip
menu in Figure 6-15 (p.126), so the same figure is cited here and for the
Control Strip. The frame: 1 px black border, white/system-04 inner bevel with
face-coloured corners, and a 1 px `system-07` shadow on the right and bottom
starting 2 px in, drawn by `::before`/`::after` (so the menu list must be
positioned). Dividers (`platinumMenuDivider`) are system-05 over white across
the full inner width. Bevel-button panels (`popupContent`) reuse the frame.

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

The strip is pixel-matched to HIGOS8 Figure 6-15: bevels are `px-rect`
background layers (`appearance.scss`), and the tab, arrows and slider are
`ClassicyPixelArt` (rows of theme tokens rendered as SVG runs), so every pixel
follows the theme. Widths snap to whole modules (31 px with the separator).

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
Escape cancels). Targets are hit-tested with `elementsFromPoint` against
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
  state and reload". `Desktop.systemDialog` is stripped from persistence.
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
} from 'classicy/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust'

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

### Theming

Themes are JSON-based (`src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`) and control:
- Typography (body, ui, header fonts)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

Built-in themes are never mutated: the first colour/font/desktop edit on one (`ClassicyDesktopChangeColor { colorKey, index?, color }`, `ChangeFont*`, `ChangeBackground*`) forks it into the single "Custom" theme (`id: "custom"`) in `Appearance.customThemes` and activates it; later edits modify the active custom theme (`editActiveClassicyTheme`, `ClassicyCustomTheme.ts`). `ChangeTheme` searches built-ins, then customs. Customs live outside `availableThemes` because persisted arrays replace defaults on load.
The 28 editable colours are defined once in `CLASSICY_THEME_COLOR_TARGETS` (`ClassicyThemeColorTargets.ts`), which drives the reducer's validation and the Appearance Manager's Colors tab. Details: `docs/AGENT-REFERENCE.md` §8.
Theme files (`ClassicyThemeFile.ts`, Themes tab "Save Theme…"/"Load Theme…") are `{ format: "classicy-theme", version: 1, theme }`, validated by the zod `ClassicyThemeSchema` (strips unknown keys; `backgroundImage` must be a bundled wallpaper or a plain http(s) URL because it lands unquoted in `url(…)`). Export writes wallpapers by filename. `ClassicyDesktopImportTheme { theme }` re-validates, always appends a new custom theme (`custom-<slug>` id, de-duplicated name, never `"custom"`) and activates it.

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- ffmpeg is **built from source** on macOS and Linux (prebuilt binaries were inconsistent and missing codecs). `mise install` runs `bin/ffmpeg-deps.sh` via a `preinstall` hook, which installs the required development libraries with `brew` or `apt-get` — on Linux that means an **automatic `sudo` prompt** the first time. The script is a fast no-op once the libraries are present. Run `bin/ffmpeg-deps.sh --check` to see what's missing without installing. Its package lists must stay in sync with `ASDF_FFMPEG_ENABLE` in `mise.toml`; it must stay executable (mise runs hooks via `sh`, so the `#!/bin/bash` shebang is what provides bash semantics). Non-apt Linux distros are reported, not automated. CI deliberately still uses the distro `ffmpeg` package.
- `pnpm build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from `assets/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
- **Styles ship inside the JS** (#303): `injectCssPlugin` (`vite.config.ts`, after the font split) appends `bin/classicyStyleInjector.ts`'s code to both entry bundles, which inserts `classicy.css` as `<style id="classicy-styles">` at the top of `<head>` on first import (once; skipped without a `document`). `dist/classicy.css` is still emitted for strict-CSP hosts; `verify:dist` fails the build if a bundle stops injecting or injects base64 fonts.
- **Breaking change**: bundled `@font-face` rules (base64-embedded fonts) no longer ship inside `classicy.css` — they're extracted at build time (see the `splitFontFacesPlugin` in `vite.config.ts`) into a separate, opt-in stylesheet. Consumers who want the bundled fonts must additionally `import 'classicy/dist/fonts.css'`; consumers who supply their own fonts, or don't need the bundled ones, can skip it and avoid the payload entirely. Both stylesheets are exposed via `package.json`'s `exports` map.
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation

@.claude/wiz-claude.md
