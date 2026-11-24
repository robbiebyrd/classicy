# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8 (Platinum) interface. It's distributed as three npm packages, each with ES and UMD module formats and its own type declarations: `@classicy/classicy`, the framework (it registers no look of its own), and two Appearance Packages, `@classicy/appearance-platinum`, the Platinum Appearance Package (`packages/appearance/platinum`), and `@classicy/appearance-system7`, the System 7 Appearance Package (`packages/appearance/system7`; System 7.5 in black and white and in color, design 0017-6me), each of which a host imports once at its entry and which peer-depend on the core. All three publish at one version, and a host installs and bumps the ones it uses together (mixing the two Appearance Packages' versions is unsupported: they share the savers' registration module and the Logo saver's registry). Platinum is not always present: with no package registered, the core draws only a stop screen (design plan 0014-ahm; it supersedes plan 0002's D14, "Platinum is always present").

## Common Commands

This project uses **pnpm** (enable via `corepack enable`). The repo is a pnpm workspace: the root is the `@classicy/classicy` library, `example/` is a member that consumes it via a `workspace:*` dependency — no `npm link` needed — and `packages/appearance/platinum` is `@classicy/appearance-platinum`, the Platinum Appearance Package (peer-depends on the core; its own `vite.config.ts` and `vitest.config.ts`; the root `pnpm test` runs it as a second vitest project). Root tests, Storybook and the example import it by name; vitest, both tsconfigs, Storybook and the example's live-source dev server alias `@classicy/appearance-platinum` to its `src/index.ts`, and `build:source` builds its `dist/` for the example's production build. `packages/appearance/system7` is `@classicy/appearance-system7`, the System 7 Appearance Package (plan 0018-dbd), wired the same way (a third vitest project; the same aliases, the example's live-source one included, and the example imports it); in Storybook only its own stories register it (`storybook/.storybook/system7.ts`, the `mirrored` pattern).

```bash
pnpm install              # Install dependencies (root + example workspace)
pnpm build:source         # TypeScript + Vite build only (fastest iteration)
pnpm build                # Full build (audio sprites + source)
pnpm build:audio          # Generate audio sprites from packages/appearance/platinum/src/assets/sounds/, then System 7's
pnpm build:watch          # Watch mode: rebuilds source + audio on file changes
pnpm --filter @classicy/appearance-platinum exec vitest run   # Platinum package tests only
pnpm --filter @classicy/appearance-platinum build             # Platinum's vite build + its verify:dist (build the core first: it needs the core's declarations)
pnpm --filter @classicy/appearance-system7 exec vitest run    # System 7 package tests only
pnpm --filter @classicy/appearance-system7 build              # System 7's vite build + its verify:dist (core first, likewise)
pnpm lint                 # Run Biome (`biome check .`), the only linter; lint:fix writes changes
pnpm storybook:typecheck  # Type-check the stories under storybook/tsconfig.json (strict)
pnpm preview              # Full build → run example app
pnpm storybook            # Run the component showcase (Storybook) dev server
pnpm build:storybook      # Build static Storybook to storybook/storybook-static/
pnpm parity:shoot / parity:app / parity:compare   # Visual parity (AE) checks: bin/parity/README.md
pnpm sync:versions        # Set every packages/appearance/*/package.json to the root's version (after merging a main that bumped it; --check only reports)
```

**CI** (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm storybook:typecheck` (the stories and `storybook/.storybook/`, under the strict `storybook/tsconfig.json`; the root tsconfig excludes stories), `pnpm test` and `pnpm build:source && pnpm --filter classicy-example build` (the example app's `tsc -b && vite build` against the freshly built library, so a broken consumer import or type error fails the PR) on every pull request and push to `main`; run the same five locally before pushing. Every workflow pins `runs-on: ubuntu-26.04` rather than `ubuntu-latest`, so the image, and with it the distro ffmpeg that builds the released audio sprites, cannot change without a commit.

**Local dev workflow**: `pnpm build:source` to (re)build the library; the `example/` app resolves it automatically through the workspace symlink. For live iteration use `pnpm build:watch` (or `pnpm preview`, which builds then runs the example dev server with the source watcher).

## Path Aliases

- `@/` → `./src/`
- `@img/` → `./assets/img/`

## Architecture

### Component Hierarchy

```
Classicy                       # One root tag: the provider with the desktop inside, both components' props
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
- **SoundManager** still uses React Context/useReducer (not migrated to Zustand). Its `volume` (0–100, `ClassicyVolumeSet`) is the Howl player's gain, applied by `ClassicySoundManagerProvider` and re-applied when a sound pack loads; it is per-mount, like the mute flag (`"*"` in `disabled`); alerts (`ClassicyAlertSound`/`ClassicySoundPlayError`) play at that gain × the persisted `Appearance.alertVolume` (0–100, `ClassicyDesktopChangeAlertVolume`). The Howl is loaded from the registered sound pack named by `activeTheme.sound.pack` (`ClassicySoundPacks.ts`), reloaded when that changes, with Platinum as the fallback for sprites the pack lacks when Platinum's pack is registered (the sound modules import no pack; with none registered, no Howl is built and sound is silent, logging each missing pack id once). The alert sounds a user may pick are the pack's: `alerts` (`{ value, label }[]`; absent, the default pack's, as for sprites; `[]`, none) and `defaultAlert` (`ClassicyAlertSounds.ts`: `classicyPackAlerts`, `classicyPackDefaultAlert`, `resolveClassicyAlertSound`). The alert played is the stored `Appearance.alertSound` when the pack offers it, else the pack's default; it is never rewritten, and the default state seeds none. `CLASSICY_ALERT_SOUNDS` and `DEFAULT_ALERT_SOUND` are deprecated (Platinum's values)

Event routing by prefix (unchanged):
- `ClassicyWindow*` → Window operations (focus, move, resize, collapse, zoom)
- `ClassicyDesktop*` → Desktop operations (menus, themes, backgrounds)
- `ClassicyDesktopIcon*` → Icon selection and interaction
- `ClassicyApp*` → App lifecycle (open, close, focus, activate)
- `ClassicyAppFinder*`, `ClassicyAppMoviePlayer*`, `ClassicyAppPictureViewer*` → App-specific handlers
- `ClassicyManagerDateTime*` → Date/time manager operations

State persists to localStorage (key: `classicyDesktopState`) via Zustand's `subscribe()` on every state change; a host may mirror it to a backend (Desktop State Sync Adapters, below).

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
- The Application menu's Hide <app>, Hide Others and Show All dispatch
  `ClassicyAppHide`, `ClassicyAppHideOthers` and `ClassicyAppShowAll`
  (HIG7 p.127). `apps[id].hidden` is **session state**: `sanitizeStateForPersistence`
  drops it, `closeApp` clears it, and any focus of the app (`focusApp`,
  `focusWindow`, a window opening) shows it again. A hidden app's container
  and modals are `display: none` with its windows still mounted; the next
  shown app takes the menu bar, and a hidden app's icon is dimmed in the
  Application menu (`iconDimming`, below).
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
The core holds the mechanism only (registry, overlay, reducer, control panel);
the savers themselves ship with an Appearance Package, Platinum's twelve in
`@classicy/appearance-platinum` (plan 0016-vbq).
Idle detection is **wall-clock** (document-level activity listeners + refs;
independent of the Classicy virtual clock, and never writes the store per
event — only the activate/deactivate transitions dispatch). The waking
keystroke/click is swallowed in the capture phase.

- State in `apps["ScreenSaver.app"].data`: `enabled` (default true),
  `timeoutMinutes` (default 5, clamped 1–240), `selectedSaver` (default
  unset: see Resolution below), `saverConfigs` (per-saver options), and transient `active`
  (stripped in `sanitizeStateForPersistence`).
- Actions (prefix `ClassicyAppScreenSaver`): `Activate` (scriptable),
  `Deactivate`, `SetSaver { saverId }`, `SetTimeout { minutes }`,
  `SetEnabled { enabled }`, `SetConfig { saverId, config }` (validated against
  the saver's zod schema).
- Register savers at module scope:
  `registerClassicyScreenSaver({ id, name, component, configSchema?, defaultConfig?, configComponent?, transparentBackground?, packages? })`
  (`ClassicyScreenSaverRegistry.tsx`). Re-registering an id replaces it,
  `packages` included (the Map keeps its original registration position).
  Options UI is two-tier: a custom `configComponent`, else a form derived from
  `configSchema` (`ClassicyScreenSaverConfigForm`, which identifies fields by
  zod's definition type, not `instanceof`, so a second copy of zod is
  tolerated). `transparentBackground` savers (Fade Out, Spotlight) reveal the
  live desktop through the overlay.
- Offer and resolution (`ClassicyScreenSaverOffer.ts`): `packages` names the
  Appearance Package ids a saver is offered under; absent or empty, every
  package. Only the active package's savers (`activeClassicyScreenSaverPackageId`,
  the id drawn) are listed (`listClassicyScreenSaversFor`) and run. The saver
  in effect (`resolveClassicyScreenSaverFor(packageId, selectedSaver)`) is the
  stored choice when offered, else the package's `defaultScreenSaver`
  (`ClassicyAppearancePackage`), else the first offered saver in registration
  order; the stored choice is never overwritten, so switching packages and
  back restores it. With none offered the panel reads "This appearance has no
  screen savers.", Test and the Control Strip's Sleep Now are disabled and
  the overlay never activates (no idle timer). `SetSaver`/`SetConfig` accept
  any registered saver, even one another package offers. Hooks and readers:
  `isClassicyScreenSaverOffered`, `subscribeClassicyScreenSavers`,
  `useClassicyScreenSavers`.
- The 12 built-ins ported from bryanbraun/after-dark-css live in Platinum
  (`packages/appearance/platinum/src/screenSavers/`; CSS is MIT, sprite art ©
  Berkeley Systems), registered at module load with `packages: ["platinum",
  "system7"]` by `screenSavers/platinumScreenSavers.ts` (imported by
  Platinum's `index.ts`, in its `sideEffects`, and bundled by System 7's
  `index.ts` by relative import, the one Platinum module System 7 imports,
  re-exporting none of it; `System7SourceImports.test.ts`) and exported from
  `@classicy/appearance-platinum` under their 3.0 names; both packages'
  `defaultScreenSaver` is `bouncing-ball`, and a host loading both registers
  the same ids twice, harmlessly.
  The core names no saver, art or Platinum saver id outside tests
  (`ClassicyCoreImportGraph.test.ts`). To offer one under another package,
  re-register it (`{ ...getClassicyScreenSaver(id), packages: [...] }`, or
  from Platinum's exported parts) with its id added to `packages`. Keyframes/classes are prefixed `classicySaver*`. Saver
  stylesheets are Sass partials (`screenSavers/<X>/_ClassicyScreenSaver<X>.scss`)
  listed once in the index `screenSavers/_platinumScreenSavers.scss`, which
  `styles/_screenSavers.scss` loads into Platinum's single package
  stylesheet, in `@layer classicy.package` at the root (`@at-root`), outside
  the `[data-classicy-appearance="platinum"]` scope, since the overlay is a
  portal; saver art ships as files in Platinum's `dist/assets`. System 7's
  sheet loads the same index the same way, from its own
  `styles/_screenSavers.scss` (the only Platinum stylesheet it loads), with
  its own pause rule, and its `dist/assets` ships the saver art too. The savers'
  ported art is exempt from the pixel and color gates by path.
- The `logo` saver's image comes from its own live registry
  (`screenSavers/Logo/ClassicyScreenSaverLogoRegistry.ts` in Platinum, in
  `sideEffects`; one registry per page, its state on `globalThis`, so the copy
  System 7's bundle carries joins Platinum's): `registerClassicyScreenSaverLogo({ id, name, src, width?, height? })`
  at module scope, exported from `@classicy/appearance-platinum`; `src` is a
  string or a `() => string` read when the logo draws (so a built-in logo
  follows the active package's `classicy.logo`/`system.macosSvg` icons);
  built-ins `berkeley-systems` (default), `classicy`, `startup-screen`
  (`CLASSICY_SCREEN_SAVER_LOGO_IDS`). Config `{ logo: id }` is picked in a
  custom `configComponent` pop-up (a schema enum could not list logos
  registered later); an unregistered id draws the default. The bounce
  keyframes read the mark's size from CSS custom properties, declared or
  measured on load, so any image travels edge to edge.
- The Screen Saver control panel
  (`ControlPanels/ScreenSaverManager/`) is part of `ClassicyControlPanels`.
- Overlay z-index is 100001 (above dialog overlay 99999 and startup 100000);
  reduced-motion users get a paused (static) saver: a stylesheet rule keyed
  on the overlay's id (`#classicy-screen-saver-overlay`) sets
  `animation-play-state: paused` (in the core's base sheet: it covers base-layer
  and host savers, but an `animation:` shorthand in a later layer resets the
  play state and beats it, so a package shipping savers in its own layer must
  carry its own reduced-motion pause rule: Platinum's `_screenSavers.scss`
  ends with one, after every saver, pinned by a test, and its saver styles set
  neither `animation-play-state` nor `cursor`), and the overlay also pauses its subtree's
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

### Scroll Bars

Classicy draws its own scroll bars: `ClassicyScrollArea`
(`src/SystemFolder/SystemResources/ScrollArea/`) keeps a native scroller (the
viewport, `overflow: auto`, its own bars hidden by `scrollbar-width: none` and
`::-webkit-scrollbar`) and draws each bar beside it as `data-classicy-part`
parts the package styles (`scrollbar` > `scroll-arrow-start`, `scroll-track`,
`scroll-arrow-end`, `scroll-thumb`; `scroll-corner`), so a package draws them
in every browser (Firefox now shows Platinum's full bars).

- States: `inactive` (root, bars, corner) from `ClassicyWindowActiveContext`
  (`ClassicyWindow` provides it) or the `inactive` prop; `fits` on a bar whose
  axis has nothing to scroll (no thumb); `pressed` on a held arrow or track;
  `dragging` on the thumb.
- Behavior: arrows scroll `lineStep` and repeat while held, the track pages
  toward the pointer until the thumb reaches it (both through
  `useClassicyPressRepeat`, `LittleArrows/useClassicyPressRepeat.internal.ts`,
  which the little arrows share), the thumb drags proportionally, live, or
  on release when the package's `layout.scrollBar.thumbDrag` is `"onRelease"`
  (System 7: the thumb stays put, a `scroll-drag-outline` part follows the
  pointer and snaps back past the theme's `--scroll-bar-snap-back`, else the
  bar's thickness; keys and wheel wait, Escape cancels); a lost pointer
  stream (`onClassicyPointerStreamLost`) ends each (an on-release drag
  scrolling nothing). Content changes are measured once a frame (rAF).
  Bars are
  `aria-hidden` and never focusable; a focusable root scrolls its viewport for
  the paging keys its own handler leaves.
- Geometry follows Chromium's (`computeClassicyScrollThumb`,
  `computeClassicyScrollBars` in `ClassicyScrollAreaMetrics.ts`; the thumb's
  `min-`/`max-height` or `-width` in the package's sheet, px lengths only,
  bound its length, so equal limits make a fixed box), and each bar is nudged
  onto the device-pixel grid (`--classicy-scroll-snap-x|y`), so Platinum's
  parts (`platinum-scroll-bar-parts`, `_scrollbars.scss`, sharing the native
  mixins' declarations) draw the old native bars pixel for pixel.
  The viewport inherits the root's background color (an opaque scroller, as
  the browser rasterizes text over); an inset bevel the old scroller drew
  moves to the viewport (`classicyListBoxViewport`, …).
- Policies `vertical`/`horizontal` (`auto`/`always`/`never`), `pairBars`,
  `scrollable={false}` (clips), `renderViewport` (a `<textarea>` as the
  viewport: `ClassicyTextEditor`). Windows pass `always`/`never` from the
  area's `onOverflowChange` (both bars or none), and `always` when their
  `fitsScrollBars` prop says so (default: the package's
  `layout.scrollBar.fitsBars` for a resizable, non-utility window; Movie
  Player, Picture Viewer and HyperCard's card pass `false`); list boxes and
  Standard File's list keep their vertical bar too
  (`useClassicyFitsBarPolicy`). Adopted
  by windows, list boxes, tables (`scrollable={false}` in the Finder list
  view, whose window scrolls), text editors, split-view panes, the Assistant,
  file dialogs, Drive Setup, the color picker, the PDF viewer, HyperCard
  locked fields and About This Computer. Menus have no bars: a long pop-up,
  combo box or pull-down list scrolls by indicators over its first and last
  rows (`useClassicyMenuScrollArrows`, `Menu/`, given each list's row
  selector and layer; parts `menu-scroll-up` and `menu-scroll-down`), as
  HIG7 p.78 has it. The geometry is measured on open, placement and new rows;
  a scroll reads only the extents.

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

Menus open where they show (`ClassicyMenuPlacement.internal.ts`,
`useClassicySubmenuPlacement.internal.ts`): measured in layout effects, frame
shadow included (border box, outer `box-shadow`, absolute
`::before`/`::after`), against the bounds, `.classicyDesktop`'s box where it
overlaps the viewport, on both axes. A pull-down (screen or window bar) or
submenu that would pass the right edge gets `classicySubMenuFlipLeft`, a
pull-down then hanging with its right side under its title's right side
(base `ClassicyDesktopMenuBar.scss`; a package that places pull-downs itself
places it too, as System 7 does); a submenu passing both sides keeps the side
it passes by less; one still outside is pinned by equal and opposite wrapper
margins, across and down. The scroll cap ends at the bounds' bottom; a
capped list's shadow sibling is rendered in the cap's own commit; a menu
whose 64 px floor still passes the bounds is pinned, top winning. Again on
reopen and on a desktop resize (the outermost open menu's `ResizeObserver` +
`flushSync`; submenus follow via `ClassicyMenuPlacementEpoch`). Contextual
menus (`flipLeftTo`), extension pull-downs, pop-up menus, combo box lists and
bevel pop-ups (`classicyBevelPopupPlacement`'s `bounds`) keep to the same
bounds on both axes, on whole pixels (`classicyMenuWholePixel`), at
`width: max-content`. `bin/check-menus-on-desktop.ts [--embed WxH+L+T]`
checks it in a browser.

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
  extension; Appearance (`classicy-appearance`, order 30, owner
  `AppearanceManager.app`; switches theme, and package when two or more are
  registered) from the Appearance control panel. All three files are in
  `package.json` `sideEffects`.
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
  never pushes the strip off the top. Docked right, a package that registers
  the `controlStripTabRight` system-art key draws it unflipped as the tab
  (`classicyControlStripTabRight`; System 7 does, from 7.5.5), else the left
  tab mirrors. `--classicy-control-strip-phase` (`1px` while the strip's
  origin is odd, else `0px`; the base sheet owns it, as it does `-bottom`)
  lets a package align a screen-fixed pattern to the strip (System 7's 1-bit
  checker).
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
- **Its icon** (plan 0019-fb7 Part 5): every surface that draws the Trash
  folder (its window's title bar, a file browser's icon and list views)
  draws the **active** package's `trashFull`/`trashEmpty` art at render
  (`useClassicyTrashIcon`, `isClassicyTrashFolder`,
  `ClassicyTrashIcon.internal.ts`), not the stored `_icon`; only while no
  package has Trash art does it fall back to the stored `_icon`, else
  `iconImageByType`, as every entry does (`Finder.trashIconNoArt.test.tsx`). The stored
  `_icon` is the **default** package's `trashEmpty` from its base tree
  (`classicyStoredTrashIcon`, `ClassicyTrashStoredIcon.internal.ts`), so a
  package or theme switch never changes the saved tree;
  `ensureClassicyTrash(fs, icon = classicyStoredTrashIcon())` writes it on
  creation and heals a stored `_icon` that differs (an older build's art, the
  first package's) through `fs.setMetadata`, journaled only on change, and
  never to `""` (no default art registered yet: the heal waits). Finder runs
  it on every tree change (it is idempotent) and again when the default
  package registers its art after mount (`useClassicyStoredTrashIcon`). It
  was the one persisted asset URL that named the active package's art.

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

### Desktop State Sync Adapters

The desktop state mirrors the same way (story 0229-ymq;
`ControlPanels/AppManager/ClassicyStateAdapter.ts`, the public re-exports
of `ClassicyStateSync.internal.ts`): `registerClassicyStateAdapter({ id,
onSnapshot?, reconcile?(local, { signal }) }, { snapshotDebounceMs?,
reconcileTimeoutMs? })`. A snapshot's `state` is `sanitizeStateForPersistence`'s
JSON, the bytes localStorage holds (no field list, so a new persisted field
travels; never built-in themes or session state), with its sha256 `hash`,
the building `version`, and a `seq`; whether to send and `seq` follow a key
that leaves `DateAndTime.dateTime` out plus the page's clock edits, so the
menu bar clock's minute tick (noted by the widget,
`DateAndTimeManager/ClassicyClockTick.internal.ts`) or a host clock running
at real speed is no change. One shared timer at the shortest debounce
(default 500 ms) sends it, one delivery per adapter at a time (the latest
after), skipping a key the adapter has; `pagehide` sends a waiting one and
makes the pending localStorage write. `ClassicyDesktop` runs the page's
first reconcile on its first client mount and draws its shell until it
settles (`useClassicyStateSyncGate`), each adapter bounded by
`reconcileTimeoutMs` (default 5000 ms, then its `signal` aborts and local
wins). An adapter that reconciles takes no snapshot until a reconcile with
it succeeds (retried after 10 s, doubling to 5 min), so a failed boot never
pushes a fresh or stale desktop over the account's copy. The context also
carries `reason` (`boot`, `retry`, `request`) and `userActed`: work the
adapter never took, a trusted `pointerdown`/`keydown` (one capture-phase
listener from the page's first reconcile on) since the desktop was drawn and
either since the last snapshot it took (or its adopted state) or with the
live state no longer that state (a change landing after its press's
snapshot), or an earlier session's, listed in
`localStorage["classicyDesktopState:unsent"]` (adapter ids that take
snapshots: added when a held adapter's snapshot comes due, a snapshot comes
due while a reconcile holds them, or a delivery fails while `userActed`, and
when the user is asked; removed when it takes a snapshot built after the
mark or its state is adopted, all by Reset PRAM). A
boot's or a retry's unmerged `replace` while `userActed` is not adopted
unasked: the adapter stays held (no timer) and the desktop shows the caution
alert `systemDialog: "syncChoice"` ("Use your saved settings on this
computer?"; Use Saved adopts, Keep Current sends this desktop;
`resolveClassicyStateChoice`), waiting for any other alert, with no default
button and the focus on the alert, not a button (`ClassicyAlert`
`defaultButtonId={null}`, HIG7 p.206); `merged: true` skips it, and a
`useLocal` while `userActed` sends this desktop. Adapters after a winning
`replace` are asked with the adopted state, and one that answers `replace`
too stays held until the host's next request; a host request during a retry
runs after it. A `replace` goes
through the localStorage load path itself (`adoptPersistedClassicyState` in
`ClassicyAppManagerUtils.tsx`: `readPersistedClassicyState` with its
container-kind check, then the active-theme refresh and drawn package's
defaults), is saved at once and applied in one synchronous step with the
desktop's remount (the gate closes, the store is replaced, the epoch key
moves), keeping the session's `availableThemes` and the browser's
`fsVersion`, and is not sent back to its source; a later
`reconcileClassicyState()` (a sign-in) is a restart. `flushClassicyState()`
saves now. Reset PRAM (`resetClassicyPersistedState`; its alert names the
other computers when an adapter takes snapshots, `useClassicyStateMirrored`)
shows the wristwatch, ignores a second click, stops saving, hands snapshot
adapters a first session's state with the provider's seed
(`rememberClassicyDefaultStateSeed`; bounded, 5000 ms), and marks the next
boot (`classicyDesktopState:reset`) to skip its reconcile. Nothing runs
without a `window`. Details: `docs/AGENT-REFERENCE.md` §7, "Mirroring the
desktop state"; the example's `?stateSync=<account>` mock.

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
- Typography (body, ui, header fonts; an optional `typography.uiSmall` family, emitted as `--ui-font-small` only when set, for small control labels and the slider's ticks and readout: System 7 sets Geneva, Platinum keeps the UI family; the name is reserved and the Fonts tab shows a "Small UI Font" row only for a theme that has it)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

Appearance Packages (`registerClassicyAppearancePackage`, registry in `src/Appearance/ClassicyAppearancePackageRegistry.ts`, hooks and resolution in `ClassicyAppearancePackage.ts`) own the look: base component SCSS is structure only, and every bevel, border, gradient and piece of art lives in the package's stylesheet, one `@layer classicy.package` block scoped under `.classicyDesktop[data-classicy-appearance="<id>"]` (written with `classicy-package($id)` from `src/Appearance/vocabulary/_package.scss`, imported `?inline`, injected as `<style id="classicy-appearance-<id>">`). The active package is the persisted `System.Manager.Appearance.packageId` (default `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `"platinum"`), switched by `ClassicyDesktopChangeAppearancePackage { packageId }` (unregistered id: logged no-op), resolved by `useActiveClassicyAppearancePackage` / `resolveClassicyAppearancePackage` (registered id → registered default package → first registered → `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`, for lone components only); the desktop root's `data-classicy-appearance` carries the **resolved** id, and the desktop warns once per page per unregistered stored id other than the default id (which the default state seeds). With no package registered `ClassicyDesktop` draws only `ClassicyNoAppearancePackage` (`Desktop/`; "No Appearance Package is loaded", the `import "@classicy/appearance-platinum";` line, one `classicyLog("error", "Appearance", …)` per page; styled from the core theme's variables it sets itself; not the Sad Mac) and mounts no children until one registers. A package's optional `icon` (an asset source; Platinum's `platinum.webp` is in its art) is shown in the Themes tab, else the generic `system.extension` glyph. Every theme names its package (`theme.package`, missing → `"platinum"`). The `platinum-*` mixins (`_mixins.scss`, `_scrollbars.scss`, `_assets.scss`) live in the package, `packages/appearance/platinum/src/styles/` (one `components/_<Name>.scss` partial per component, included by `platinum.scss` in `dist/classicy.css` bundle order, except Tabs and ScrollArea, which come after Desktop so the tab scroller's and the scroll areas' viewports' hidden native scroll bars beat the desktop's Firefox fallback); when a look declaration moves there, every base declaration that must still beat it moves with it, since anything in `classicy.package` beats all of `classicy.base`. `@classicy/classicy/scss/*` is the vocabulary (`vocabulary`, `layout`, `package`, `color`, `dither`: the 1-bit checker mixins, switched per theme by the `dither.tileSize` knob, 0 = plain ink); `@classicy/appearance-platinum/scss/*` is Platinum's SCSS (`mixins`, `scrollbars`, `assets` for host `@use`; `platinum.scss` itself ships compiled and is not for host compilation); The core neither imports nor exports Platinum: nothing `src/index.ts` reaches lies under `packages/`, and it has none of Platinum's names (`ClassicyCoreImportGraph.test.ts`); Platinum is the workspace package `@classicy/appearance-platinum` (`packages/appearance/platinum`), whose source imports the core only as `@classicy/classicy` (`PlatinumSourceImports.test.ts`) and whose own build leaves it external (`PlatinumOneRegistry.test.ts`). So a host imports a package at its entry; tests that draw Platinum import `@/__tests__/withPlatinum` (`setup.ts` registers no package); Storybook's preview imports it by name; its Package toolbar switches between the shipped packages (`storybook/.storybook/StorybookPackages.ts`: Platinum and System 7, the latter imported only once chosen), a story's own `parameters.classicy.appearancePackage` winning, and its Theme toolbar lists the registered packages' presets, then each unregistered switchable package's from its JSON, a theme of another package than the drawn one falling back to that package's defaults. The core's library build enters at `src/index.ts` and bundles no package (`verify:dist` invariants 5 and 7); Platinum has its own build (below); the example imports `@classicy/appearance-platinum` (its dev server aliases the name to Platinum's source, its production build uses the package's dist, which `build:source` builds). Components rendered outside a `.classicyDesktop[data-classicy-appearance]` element get no look. Details: `docs/AGENT-REFERENCE.md` §8, "Appearance Packages".

Components call `useClassicyAppearance(component, state, ref)` (`src/Appearance/useClassicyAppearance.ts`) on their root: it returns `{ className, style, attrs, emit }`, where `className` is the state classes then the package's `decorate()` class then the last decoration a handler returned (a handler returning nothing keeps it, `{}` clears it), `attrs` holds only package `data-*` keys outside `data-classicy-*` and is spread before the component's own attributes, and `emit(event, detail)` runs the package's `hooks.on[component][event]`; `decorate` must be a pure function of `(component, state)` (memoized on the state classes). User gestures with both a pointer and a keyboard path carry `detail.input` (`ClassicyAppearanceInput`, `"pointer" | "keyboard"`), read from the last press or release (bare modifier keys ignored) unless a pointer-only handler passes it outright. Feedback sounds and the menu-item flash are Platinum hooks (`packages/appearance/platinum/src/hooks.ts`, deeply frozen: compose a new object to build on them; sounds played with `playClassicyAppearanceSound`, mapped per input exactly as the components played them), never component code; error beeps (`ClassicySoundPlayError`) and the boot sound stay in the components. So a component with no package hooks is silent, and a menu item with no package flash runs its action through the 400 ms fallback. The hook reads the active package without the store, so store-mocking tests need no `System.Manager.Appearance`; tests that assert a feedback sprite or the flash `import "@classicy/appearance-platinum"`. Each wired component has an `AppearanceHooks` story under the `storybook-probe` package (`storybook/.storybook/ClassicyAppearanceProbe.tsx`), registered only while the probe is mounted (`unregisterClassicyAppearancePackage`). Details: `docs/AGENT-REFERENCE.md` §8, "Package hooks".

Arrangement (where parts go, not how they look) is CSS `order` on the parts carrying `data-classicy-control` (title-bar boxes; base 10/30/40, title 20), `data-classicy-role` (alert buttons) and `data-classicy-part` (menu-bar clusters 10–60; a balloon-wrapped title's anchor is ordered by `:has()`), plus the alert icon/body, tab strip and disclosure label classes, all set in base SCSS and overridden in a package's CSS; plus the package's `layout` block (`window.growBoxCorner`, `menuBar.placement`, `desktop.iconGridOrigin`, `fileDialog.frame` (`movable` | `fixed`: Mac OS 8's movable titled window, System 7's fixed Standard File box) and `fileDialog.navigation` (`tree` | `flat`: folders expand in place, or one folder at a time), and the optional behavior group `scrollBar` { `thumbDrag`, `fitsBars`, `patternOrigin` }, read by `ClassicyScrollArea`, `ClassicyWindow` and the lists, not published on the root; and the optional `patternOrigin` { `ControlGroup`, `PopUpMenu`, `Separator`, `Slider`: `element` | `window` | `desktop`; `elements`: `{ selector, origin }[]` }, where a component's (or a selected element's) patterns are laid from: the core publishes the window's content origin or the desktop's corner on them from the padding box as `--classicy-pattern-origin-x`/`-y` (`useClassicyPatternOrigin`, `useClassicyPatternOriginElements` in `ClassicyWindow` and `ClassicyDesktop`, `ClassicyPatternOrigin.internal.ts`, one watcher per window, scroll bars included), and the dither mixins take `($x, $y)` to place their tile; System 7 lays every dither from `window`), read by `useClassicyAppearanceLayout()` (components) or the store-free `getClassicyAppearanceLayout(packageId?)` (reducers), resolved from `Appearance.packageId`, and published on the desktop root as `data-classicy-grow-box` / `data-classicy-menu-bar` and `--classicy-layout-*` (by `ClassicyDesktop`, not `getThemeVars`). Placement `window` makes the screen bar headless (it still dispatches chords), zeroes `--menu-bar-height` on the desktop root (`classicyLayoutThemeVars`, spread after the theme's variables and before the host's `style`), so windows may use the full height, and gives each window with an `appMenu` a `ClassicyWindowMenuBar`; the grow-box corner drives the grip CSS and `computeClassicyWindowResize` (fed the live `--window-resize-inset` as its fudge and `[0, --menu-bar-height]` as its floor, the same floor the release clamp applies; the window reads both from its own element, so it follows the desktop it is in). Existence of parts stays behavioral: a package only reorders or hides, except that `scrollBar.fitsBars: "shown"` keeps scroll bars drawn (in the `fits` state) where the content fits, and `thumbDrag: "onRelease"` adds the drag outline while a thumb drag lasts. The Storybook-only `mirrored` package (`storybook/.storybook/MirroredPackage.ts`, `mirrored.scss`: Platinum's mixins rescoped, then the flips) is the proof, with six `Mirrored` stories (`mirroredParameters` from `storybook/.storybook/mirrored.ts`, which registers the package; only those story files import it, never `preview.tsx`, so other iframes' package lists stay clean), and the template for a new package. Details: `docs/AGENT-REFERENCE.md` §8, "Layout declarations".

Built-in themes are never mutated: the first color/font/desktop/metric edit on one (`ClassicyDesktopChangeColor { colorKey, index?, color }`, `ChangeFont*`, `ChangeBackground*`, `ChangeMetric`, `ChangeAppearanceOption`) forks it into its package's "Custom" theme (`classicyCustomThemeSlotId`: `"custom"` for Platinum, `custom-<packageId>` otherwise; a slot held by another package's theme moves that theme aside to `<slotId>-<n>`) in `Appearance.customThemes` and activates it; later edits modify the active custom theme (`editActiveClassicyTheme`, `ClassicyCustomTheme.ts`). `ChangeTheme` searches the active package's loaded built-ins, then its defaults and presets (completed like a package switch's defaults: a registered wallpaper held by its filename), then customs, then other packages' built-ins, so an id another package also uses resolves to the active package's theme; it never changes `packageId`. Built-ins are never persisted (`ClassicyBuiltInThemes.internal.ts`): `sanitizeStateForPersistence` drops `availableThemes` (the load path drops one saved by an older build; the default state lists none, and `ClassicyDesktop` loads `getAllThemes()` when it mounts with a package registered, else when the first one registers) and saves a built-in active theme as `{ id, package }`, plus `defaults: true` when it is its package's defaults theme. On load, an active theme whose id names a built-in of its package is replaced by the current preset (same completion as `ChangeTheme`), whatever data it held, in-place edits saved before custom themes (v0.83) included; for a package not registered yet that happens when it registers, Platinum included: a first session's active theme is the core's `CLASSICY_CORE_DEFAULT_THEME`, refreshed when the store is created (default package registered first) or when that package registers (store first, as a host's entry loads them); an active theme that is its own package's defaults (by id; the core stand-in's id for the unregistered default package; for another unregistered package, a pending reference saved with `defaults: true`, so a package the host dropped still heals) gives way to the drawn package's defaults whenever the drawn package differs, at store creation, on every registry change and on a drawn-package change through the store, without writing `packageId` (`drawnClassicyPackageDefaults`; customs, presets and an unregistered package's host-loaded themes are never replaced; another package's defaults chosen explicitly last until the next load); a provider `defaultState` seed's theme tweaks (data, not id) are forked into the Custom theme of the package the seed draws, so they persist, and that fork follows the drawn package while it stays untouched in the session (`withClassicyDefaultStateSeed`). A reference to a preset that is gone falls back to its package's defaults with one `classicyLog` warning. Customs, host-loaded themes and an unregistered package's themes (Platinum's too, before it registers: no load or persist helper treats a package as known until it registers, except that the default state's merge base is always stripped of default knobs, since it holds no user edits) are saved whole and never refreshed, except that a package's registration stores by filename the wallpaper of each of its themes that a `data:` URI or older URL saved before the index had it, in the same store write as the preset refresh. Themes hold and persist a registered wallpaper by its filename (`"azul_dark.png"`, the `file` given to `registerClassicyWallpapers`), never a build's URL for it; that identity is not the name of the file shipped (since plan 0019-fb7 the wallpapers are WebP: `azul_dark.png` ships as `azul_dark.webp`, Platinum's `default.jpg` as `default_photo.webp`, and no identity, `legacyDigests` entry or theme JSON changed), and the index also maps the emitted file's name back to it (`fileBySrcBasename`: a bare `azul_dark.webp`, or a local path to it, hashed or not, stores as `"azul_dark.png"`; a remote URL only when its name carries a bundler hash; an identity name always wins): `ChangeBackground`, theme loading, `sanitizeStateForPersistence` and a `migrateClassicyState` step store `portableClassicyWallpaper(value, theme.package)` (a 2.x save's inlined `data:` URI matches by the `legacyDigests` Platinum registers, `platinumLegacyWallpapers.ts`; an old path or hashed asset URL by its basename, hash stripped), and `getThemeVars` resolves it at render (`resolveClassicyWallpaper`, `src/Appearance/ClassicyWallpaperIndex.ts`, store-free); an unmatched `data:` or http(s) URL is kept and still renders, any other unmatched value renders no image. A filename is unique within its package only (0143): a bare filename means the theme's own package's (then Platinum's, then the active one's), a theme stores a wallpaper bare when it is its own package's or Platinum's that its package has no file of that name for, and `<package>|<file>` otherwise (`"platinum|default.png"` in a theme of a package with its own `default.png`; neither half may hold `:` or `/`, so it never reads as a URL or `data:` URI), decided from the theme's package and Platinum only, never the active package, so a stored theme renders the same image whichever package is active; a reference resolves to that package's only, and a bare filename is never rewritten, so a Platinum-only host's saved bytes are unchanged; theme files write and import `classicyWallpaperReferenceFor`, which qualifies every other package's wallpaper (an import pins a bare filename its package lacks to the first of Platinum, the importing host's active package, then the other packages in registration order that registers it, so with two other packages sharing it the pick depends on the importing host). A host's `ClassicyDesktopLoadThemes` list is session state, dispatched on every boot.
The 28 editable colors are defined once in `CLASSICY_THEME_COLOR_TARGETS` (`ClassicyThemeColorTargets.ts`), which drives the reducer's validation and the Appearance Manager's Colors tab. Details: `docs/AGENT-REFERENCE.md` §8. A package may declare more colors of its own (`colorFamilies` metadata, values under `color.families.<family>.<key>`, emitted as `--package-color-<family>-<key>`, a prefix reserved against measurements; completed from the package's defaults, edited in the Colors tab by `ClassicyDesktopChangeColor { family, key, color }` against the active theme's package's declarations, stored without the default values, every stylesheet read carrying a `--color-*` fallback for a theme of another package (`ClassicyAppearance.varCoverage.test.ts`); `ClassicyThemeColorFamilies.ts`, `docs/AGENT-REFERENCE.md` §8, "Package color families").
The 20 editable layout metrics are defined the same way in `CLASSICY_THEME_METRIC_TARGETS` (`ClassicyThemeMetricTargets.ts`, edited by `ClassicyDesktopChangeMetric { metricKey, value }`): layout constants are theme data under `measurements.<family>` (window, control, button, groupBox, layout; Platinum defaults in `CLASSICY_DEFAULT_THEME_METRICS`; an Appearance Package may add families of numbers, which the schema and `withDefaultThemeMetrics` keep), every numeric input is emitted as `--<family>-<key>` (kebab-case) by `classicyMeasurementVars` (`ClassicyThemeMetrics.ts`; names must be lowercase-first camelCase, and on a name collision core inputs win, then package families in key order, each collision logged once), derived sizes (frames, bevels, the edit-field height, …) are computed in `getThemeVars`, and there are no `--hig-*` variables. Themes persisted or saved before the groups existed are completed by `withDefaultThemeMetrics(theme, defaults?)` (on load via `migrateClassicyState`, in files via zod defaults); the migration fills only the core five, because it runs before a host registers its package (H-R17).
No bare `Npx` in `src/**/*.scss` or a workspace Appearance Package's `packages/appearance/<id>/src/**/*.scss` (`bin/check-pixel-literals.ts`, run by `pnpm lint`; it reads `#{…}px` too; the SCSS gates share these roots, `classicyScssSourceRoots` in `bin/classicyScssSource.ts`); pixel-matched surfaces read `measurements.<family>` knobs from `platinum.json`, emitted as `--<family>-<key>` by `getThemeVars`. Platinum's `defaults.measurements` holds 24 knob families (105 keys) beside the core five (only in `defaults`; Platinum's `index.ts` fills the 21 presets); `knobs` metadata, and so the Options tab, covers six of them (`controlStrip`, `menuFrame`, `pager`, `balloonHelp`, `popUpSlider`, `scrollbar`; 42 knobs, H-R4). A knob a base stylesheet or component reads is a structural knob (H-R13): every package's themes must emit it, which the core floor guarantees (`CLASSICY_CORE_MEASUREMENT_DEFAULTS`, `src/Appearance/ClassicyCoreTheme.ts`: the core five and the 85 structural knobs at Platinum's values, never read from `platinum.json`; the 18 look-only knobs are Platinum's alone, as are its two optional `fileBrowserList` knobs, the list view's HIGOS8 icon size and row padding, which the file browser reads with a fallback). `getThemeVars` completes a theme key by key from `classicyThemeMeasurementDefaults(theme.package)` (the core floor, then the registered package's own values, the package winning; H-R2) before walking it, and `sanitizeStateForPersistence` stores each theme without the knob values equal to its package's defaults (`withoutDefaultThemeMeasurements`; a theme whose package is not registered yet is stored whole). The pixel gate has no allowlist (any literal in a scanned `.scss` fails), and `ClassicyAppearance.varCoverage.test.ts` (over the same roots, Platinum's scripts included) fails on a `var(--x, Npx)` fallback or on a read nothing emits, declares or sets. Full table and rules: `docs/AGENT-REFERENCE.md` §8, "Package knob families" and "Pixel literal gate".
Colors: never a literal — use a `--color-*` token or `classicy-tint`/`classicy-shade`/`classicy-alpha("--color-x", pct)` from `src/Appearance/vocabulary/_color.scss` (`@classicy/classicy/scss/color`; `color-mix` expansions). `node bin/classicyLiteralColorSweep.ts` (also run by a test) lists any literal left; it scans the same roots and exempts an Appearance Package's custom-property declarations (`--name: value`) under `src/Appearance/<Package>/` or `packages/appearance/<id>/src/`, `var(--classicy-*, …)` fallbacks and data URIs (the span only, not the rest of the line; a theme variable's literal fallback is dead and flagged), the screen savers' art under `packages/appearance/platinum/src/screenSavers/`, and the crash screen's and color picker's listed declarations. Proportions: `getThemeVars` emits 119 named derivations last (`CLASSICY_THEME_DERIVATIONS`, `ClassicyThemeDerivations.ts`), such as `--window-collapsed-height`, `--menu-bar-height`, `--popup-height` and `--ui-font-size-small`: rounded to three decimals except the font sizes, which are unrounded to match the `calc()`s they replaced. Stylesheets read the name, never a new `calc(var(--x) * N)`: `node bin/check-pixel-literals.ts` (in `pnpm lint`, and a test) also gates multipliers against `bin/multiplier-allowlist.json`, which holds only the 43 sites over 11 files kept on purpose (Part G's, the H-R7/H-R21 pixel-grid (the Control Strip's bevels, System 7's pixel-grid art, Platinum's slider), crayon-art and centering geometry, and the button spacing scale; a file's Sass constants, in-block ones included, and numeric loop variables count as factors), each group with a one-line reason (`docs/AGENT-REFERENCE.md` §8); a multiplier of a user-editable metric becomes a derivation of it, never a fixed knob (H-R25). Every variable `getThemeVars` sets after the measurement inputs, every `--classicy-*` name and every `--color-*` name (H-R16) is reserved (`isReservedClassicyThemeVar`): a package measurement that would make one is skipped by the walker, and is never an editable knob (`isThemeMetricFamilyTarget`) — derivation names that sit in a knob family's namespace (`--balloon-help-font-size`) included (H-R28c). Derived sizes are computed from the theme, so a host overriding an input variable no longer rescales them; it overrides the derived variable instead. JS reads a size with `readClassicyThemeVar(name, fallback?, el?)` (`ClassicyThemeMetricReader.ts`), never a hard-coded number, and never from a reducer: reducers compute from `getThemeVars(theme)` (desktop icons: `classicyDesktopIconMetrics` in the reducer, `readClassicyDesktopIconMetrics` in render and handler code).
Theme files (`ClassicyThemeFile.ts`, Themes tab "Save Theme…"/"Load Theme…") are `{ format: "classicy-theme", version: 1, theme }`, validated by the zod `ClassicyThemeSchema` (strips unknown keys except measurement families and package color families, `color.families`, whose names may not be `constructor` or `prototype`; font sizes are 8–72 px (`ClassicyThemeFontSizes.ts`): the typography sizes, `desktop.iconFontSize` and, by key name, any measurement key `fontSize` or `…FontSize` in any family, which `ClassicyDesktopChangeMetric` and the Options tab also bound and `migrateClassicyState` clamps on load; `package` defaults to `"platinum"`; `backgroundImage` must be a registered wallpaper, a filename or `<package>|<file>` (a package's own themes, `ClassicyPackageThemeSchema`, may name any plain filename or `<package>|<file>`) or a plain http(s) URL because it lands in a CSS `url("…")`). Export writes wallpapers by filename, another package's than the theme's as `<package>|<file>`. A theme whose `package` is not registered, Platinum's included, is refused (`readClassicyTheme`): Load Theme… refuses it before any dispatch (`parseClassicyThemeFile`) and shows the error in the Appearance Manager's own alert, a raw `ClassicyDesktopImportTheme` for an uninstalled package sets `Desktop.errorDialog`, and a raw dispatch whose payload fails the schema is ignored silently. `ClassicyDesktopImportTheme { theme }` re-validates, always appends a new custom theme (`custom-<slug>` id, name de-duplicated against every theme and the active package's presets, never a registered package's Custom slot) and activates it; the Appearance Manager's Load Theme… switches to the file's installed package first.

Swappable assets (icons, cursors, wallpapers, fonts, system art) live in the per-package asset registry, `src/Appearance/ClassicyAssetRegistry.ts`: `registerClassicyAssets(kind, packageId, tree)` deep-merges (so `registerClassicyIcons({ system: { files: { document } } })` keeps every other `system` entry), reads resolve the active package then the default package (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, where `ClassicyIcons.ts` registers the core icon tree), with the active theme's `assetVariant` tree of the active package first when it names one (`registerClassicyAssets(…, { variant })`; an unregistered variant warns once and draws the base tree), and components read at render time with `useClassicyAsset`/`useClassicyAssetTree` (elsewhere `resolveClassicyAsset` at call time) — never a module-scope capture like `const x = ClassicyIcons.…`. A core icon URL stands for its key: every icon surface (`resolveClassicyIconImage`, via `ClassicyIconImage`/`ClassicyIcon`/desktop icons) draws a URL the default package registers as the active package's and variant's image for that key, so code that stores an icon stores the core's URL (`classicyCoreIcon`, `iconImageByType(type, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)`), never the active package's, and a host that wants an image drawn as is passes its own URL (story 0193-801). `ClassicyDesktop` publishes registered cursors and system art as `--classicy-cursor-<role>` / `--classicy-art-<key>` on its root (`useClassicyAssetVars`); stylesheets use them with a fallback, since an undefined variable voids the whole `cursor` declaration. Everything Platinum registers is in `packages/appearance/platinum/src/assets/platinumAssets.ts` (cursors by `ClassicyCursorRole`, the `ClassicySystemArtKey` art, wallpapers, the thirteen `.woff2` faces) plus the core icon tree registered by `ClassicyIcons.ts` under `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`; each of Platinum's registrations is made under `const PLATINUM = "platinum"`. Full reference: `docs/AGENT-REFERENCE.md` §5.
Platinum's art lives in `packages/appearance/platinum/src/assets/` (`art/*.svg|webp`, mapped to `ClassicySystemArtKey`s by `art/platinumArt.ts`, the alias badge alone kept as `art/alias.png`; beside it `cursors/` (PNG), `sounds/` and `wallpapers/` (WebP); Control Strip and pop-up slider pixel art in `pixelart/`, read by `ClassicyPixelArt`'s `art` prop) and is read from package SCSS as `var(--classicy-art-<key>)` image layers (title-bar stripes and windoid texture, control-box glyphs and dither, grip, menu and pop-up arrows, slider thumbs, tab outline, QuickTime controller thumbs: images, not masks, because masks blend anti-aliased edges differently and Platinum must render pixel-identical) or as `::before`/`::after` glyph `content` in the component partials (menu check and dash, bevel ▸ ▾, placard ▾, file-input ✕, written as CSS escapes so the CSS stays ASCII). Never embed a `data:` URI or a text glyph in component code. Both chromes draw one title bar, `ClassicyWindowTitleBar` (structure mixins in `Window/ClassicyWindowTitleBar.scss`, stripes from Platinum's `platinum-title-bar-stripes`).

Platinum's sorted-column stripe (HIGOS8 Figs. 2-24 and 2-43, `--color-system-02`, `_Table.scss`) draws in the Finder's list view and a `ClassicyFileBrowser` in list display only; a generic `ClassicyTable` keeps one face.

A package's optional `iconDimming` (`ClassicyIconDimming.ts`; `hiddenApp` is the one surface, a hidden application's icon in the Application menu) declares how it dims an icon per pixel (`blend`, `bits`, `palette`; `variants: { bw: { hiddenApp: null } }` for none under a variant), and the core draws the result on a canvas as a `data:` URL, the `<img>` carrying `classicyIconDimmedImage` so the stylesheet's dimming (written as `:not(.classicyIconDimmedImage)`) stands down. That stylesheet rule is the fallback: no rule, the image not ready, or an icon a canvas cannot read: a cross-origin icon served without CORS fails to load for the canvas (icons load with `crossOrigin = "anonymous"`; one that loads but taints it is refused alike), a browser limit, logged once per source at `warn`, and a failed load is drawn again on the next request. Platinum and System 7 declare the same rule. `docs/AGENT-REFERENCE.md` §8, "Icon dimming".

#### App display overrides (`apps` on a package)

A package's optional `apps: Record<appId, { name?, icon?, description? }>` (`ClassicyAppIdentityOverride`, validated by `ClassicyAppIdentityOverrideSchema`) shows any app, bundled or host, by another name, icon or desktop-icon balloon copy; the package beats the `ClassicyApp` `name`/`icon` props for display, the props stay the internal identity, and Platinum declares none. Display only: ids, action types (`ClassicyApp${name}OpenFile`/`CloseFile` keep the internal name; bundled apps use literal types), routing, records (`loadApp` refreshes `apps[id].name/icon` from code, though a host `defaultState` seed wins for a first session; parade entries carry a `followsAppIcon` flag, never the override), persisted state (pinned by `ClassicyAppIdentityPersistence.test.tsx`) and analytics (the pageview app segment, paths, the About box's and desktop icons' `track` payloads) never take it; Quit stays "Quit", but window titles reach GA verbatim and a window's `track` payload carries its `icon` prop. Read it with `useClassicyAppIdentity(appId, fallback)` / `useClassicyAppIdentityOverrides()` in components and `resolveClassicyAppIdentity(appId, fallback, packageId?)` / `classicyAppIdentityFrom` elsewhere (`src/Appearance/ClassicyAppIdentity.ts`): **store-free**, like `useClassicyAppearanceLayout.ts`, so reducers may import it; lookups use `Object.hasOwn`. Desktop icons resolve it only for `kind === "app_shortcut"` (drives share `Finder.app`); an app shortcut's balloon is the stored `desktopIconBalloonHelp`, else the package's `description`, else the manifest's, else the kind's stock copy, titled with the name shown. Menu helpers (`appSwitcherAppsFrom`, `withClassicyAppIdentityMenuItems`, `withClassicyAppIdentityAboutItem`) live in `ClassicyAppSwitcherUtils.ts`; stored About titles keep `About ${internal name}`, and the window menu bar retitles only the `${appId}_about` item titled that way. A Control Strip module with an `appId` takes the app's display name only when it is overridden (`classicyControlStripModuleLabel`). The derived Applications, Extensions and Control Strip Modules folders key entries by **display name** (`classicyDerivedAppEntryNames`, `ClassicyDerivedAppEntrySource`): static entries are never overwritten (only an untouched `_placeholder` gives way), and an app that cannot take its name falls back to its own name, then `"<own name> (<id>)"`, numbered `"… 2"`, warning once; `_derived` entries are stripped from every snapshot and the localStorage write, so a switch never changes persisted bytes; a display name holding `fs.separator` is never a key, in Control Strip Modules too. Display names are 1–64 chars with no surrounding spaces, leading `_`, `:`, control, bidi or invisible characters, checked by code point (tags, Hangul fillers and variation selectors refused, VS16 after an emoji allowed); registration stores a frozen copy of the validated `apps`. Every asset `url()` an emitter writes, in src or a workspace package's source, is quoted, `url("…")`, as `isClassicyAssetSource` assumes (`ClassicyQuotedUrl.repo.test.ts`). The Storybook-only `renamed` package (`storybook/.storybook/RenamedPackage.ts`, `RenamedByPackage` story) is the proof. Details: `docs/AGENT-REFERENCE.md` §8, "App display overrides".

### Vocabulary and cascade

- **State classes** are bare and sit beside the root: `.classicyButton.pressed`, `.classicyWindow.active`, never `classicyButtonPressed` and never `data-state` (none is emitted). The 16 states (`active inactive disabled selected pressed focused hover collapsed open dragging error default checked mixed expanded fits`) are generated from `src/Appearance/vocabulary/ClassicyVocabulary.json` by `node bin/generate-vocabulary.ts` (run by `generate-barrels`; CI runs `--check` for freshness) into `ClassicyVocabulary.ts` (`CLASSICY_STATE`, `classicyStateClasses`, `CLASSICY_COMPONENT`, `CLASSICY_PART_ATTRIBUTE`) and `_vocabulary.scss` (`$classicy-states`, `classicy-state()`, which errors at compile time on an unknown name). Emit states with `classicyStateClasses({ … })`; write single-state base rules as `:where(.root).state` so they keep the root rule's specificity. The generator rejects a state that collides with a root or part class; a coverage test (`ClassicyVocabulary.test.ts`) requires every `classicy[A-Z]…` token in the string/template literals and object-literal keys of src `.ts`/`.tsx` and each workspace package's `packages/appearance/<id>/src` (savers, tests and stories excepted) to be a declared root, part or extra class — non-class tokens go in its `NOT_CLASSES` allowlist with a reason, and a class built as `` `classicyX${…}` `` needs a `TEMPLATE_FAMILIES` entry, whose suffixes the test reads from the type union (or SCSS palette) the template interpolates, each declared.
- **Part attributes**: `data-classicy-control` (`close|zoom|collapse`, window control boxes), `data-classicy-role` (`default|cancel|other`, alert buttons), `data-classicy-part` (`apple|app|help|switcher|extensions|clock`, menu-bar clusters; `window-menu-bar`, the root of a window's own menu bar; `modifier-control|option|shift|command`, `ClassicyKbd`'s modifier glyph spans; `scrollbar`, `scroll-arrow-start|end`, `scroll-track`, `scroll-thumb`, `scroll-corner`, `ClassicyScrollArea`'s parts), `data-classicy-selection` (`all|tail`, on a `ClassicyInput`'s `<input>` while it is `selected`: the selection runs to the end of the text from its first character, or from a later one).
- **Passthrough**: every exported component with a DOM root merges `className` (appended after root and state classes) and `style` (spread after its own) onto its outermost element, so consumer `style` keys win over the component's own, component custom properties included — except window geometry and `zIndex`, which the window and icon states own (`ClassicyWindow` keeps its geometry and drops `zIndex`; `ClassicyIcon`/`ClassicyDesktopIcon` drop `zIndex`, and a `left`/`top` there overrides the drag position). Components with no root of their own (`ClassicyApp` and the bundled apps on it, the providers, controllers, and fragment renderers such as `QuickTimeSeekBar`) take neither — the full list is in `docs/AGENT-REFERENCE.md` §4.0.1; `ClassicyPassthrough.test.tsx` and `ClassicyPassthrough.more.test.tsx` hold one row per component that does.
- **Cascade**: component CSS compiles into `@layer classicy.base` (see the Cascade layers note under Build Notes for the plugin and host rules); there is no `!important` in src SCSS or a workspace package's (test-enforced by `ClassicyCascade.repo.test.ts`), so a state rule must follow the base rule it overrides. Public contract: `docs/AGENT-REFERENCE.md` §4.0.1.

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- ffmpeg is **built from source** on macOS and Linux (prebuilt binaries were inconsistent and missing codecs). `mise install` runs `bin/ffmpeg-deps.sh` via a `preinstall` hook, which installs the required development libraries with `brew` or `apt-get` — on Linux that means an **automatic `sudo` prompt** the first time. The script is a fast no-op once the libraries are present. Run `bin/ffmpeg-deps.sh --check` to see what's missing without installing. Its package lists must stay in sync with `ASDF_FFMPEG_ENABLE` in `mise.toml`; it must stay executable (mise runs hooks via `sh`, so the `#!/bin/bash` shebang is what provides bash semantics). Non-apt Linux distros are reported, not automated. CI deliberately still uses the distro `ffmpeg` package.
- `pnpm build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from the `packages/appearance/platinum/src/assets/sounds/` directories (`bin/make_audio_sprites.sh`'s default; the core ships no sprites), then, in a second run of the same script, from System 7's WAV sources in `packages/appearance/system7/src/assets/sounds/system7/sprites/`. Each pack is encoded as ogg and m4a only (the script's default format list, and System 7's `ogg,m4a` in `build:audio`): Howler plays the first file in `src` the browser can, ogg in Chrome, Edge and Firefox, m4a in Safari, so the mp3 and ac3 that 3.5 also shipped were never reached and went in plan 0019-fb7 (`platinum.ts`/`system7.ts` import exactly the two, and pin the JSON's `src` to them). audiosprite is a pinned devDependency run from `node_modules/.bin` (never `npx`, no network at build time). Rebuilding unchanged sources leaves the sprites byte-identical: an `ffmpeg` shim adds `-fflags +bitexact -map_metadata -1` to audiosprite's encode call (ffmpeg otherwise writes a random Ogg stream serial), and `<name>.sprites.sha256` (a hash of the pack's source files in `sprites/` (Platinum's mp3s, System 7's WAVs), the script, the audiosprite version and the encode formats and loops, not ffmpeg's) makes `build:audio` skip an up-to-date pack, so a distro ffmpeg and mise's never rewrite each other's committed bytes; `CLASSICY_AUDIO_FORCE=1` encodes anyway. The script exports `LC_ALL=C`, because the stamp hashes the sources in glob order and a glob lists them in the locale's collation order (en_US.UTF-8 put `ClassicyTabClickDown.mp3` before `ClassicyTabClick.mp3`), so a stamp is the same on every machine. `CLASSICY_AUDIO_RESTAMP=1` encodes nothing: it rewrites the stamp of each pack whose outputs all exist from the current inputs, for a change that leaves the sprites as they are but changes the hash (the script, the format list); a pack missing an output is named and left alone, and the run fails. It wins over `CLASSICY_AUDIO_FORCE`.
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`, beside it `classicy.umd.cjs`, the UMD bundle's CommonJS loader (each Appearance Package ships `<name>.umd.cjs` the same way)
- **Server rendering** (story 0223-a0y): every package's bundles load in Node with no DOM, on Node 20.19 and 22.12 through 26 (`import` from 20.18 too). The exports map's `"."` is `{ import: { types: <d.ts>, default: <es.js> }, require: { types: <d.cts>, node: <name>.umd.cjs, default: null } }` (null: a browser bundle that `require()`s fails at its build, in esbuild and webpack, instead of bundling the UMD bundle as an ES module that throws when it runs): in these `"type": "module"` packages Node reads a `.js` file as an ES module, so `classicyUmdLoaderPlugin(umdFile, packageName)` (`bin/classicyUmdLoader.ts`) emits a few-line loader that runs the unchanged UMD bundle as CommonJS with a strict direct `eval` (strict: a sloppy one with a top-level declaration in the bundle made every global lookup slow, `require()` 25–60% slower than `import`; in the caller's realm, Jest's sandbox included; `//# sourceURL` the bundle's file URL, since V8 drops a path holding a space, so stack traces keep its lines and columns and `--enable-source-maps` maps them), falling back to `vm.runInThisContext` under `--disallow-code-generation-from-strings`, and throwing a message naming the package when its bundle is missing (a Node-target bundler copied the loader alone) or when Node cannot run it: no `process.getBuiltinModule`, or a `require()` that loads no ES module (`process.features.require_module`, checked only when `module` is Node's own, never in Jest's sandbox, whose transform loads `react-player`), so `require()` needs Node 20.19, 22.12 or later (`CLASSICY_UMD_LOADER_NODE_FLOOR`; nodejs/node#55085), since the core requires the ES-only `react-player` (22.12.x and 23 before 23.5 print Node's own `ExperimentalWarning` for it, 22.12 only from a path outside `node_modules`, so the gate warns there); `main` and CDN script tags keep the `.umd.js`, and browser bundles `import`. `classicyUmdNodeUrlPlugin` (`bin/classicyUmdNodeUrl.ts`) rewrites Rollup's `require("url")` (import.meta.url and asset URLs in UMD output) into a same-length call of a function it declares inside the UMD factory, before its closing `}));` (`process.getBuiltinModule("node:url")`, Node 20.16/22.3+), so no UMD bundle requires a Node built-in (the packages' invariant 1 allows only the core and React) or declares anything at its top level (no global on a `<script>` page; `findClassicyUmdTopLevelDeclarations`, core invariant 19 and the packages' 11). dts's `afterBuild` writes each `.d.ts` again as a `.d.cts` twin, relative specifiers `.cjs` (`classicyCommonJsDeclarationsWriter`, `bin/classicyCommonJsDeclarations.ts`; core invariant 8 and the packages' 7 check every twin), the `require` types for CommonJS TypeScript hosts. `classicyNodeEntryPlugin` (`bin/classicyNodeEntry.ts`) resolves `decode-named-character-reference` (through `@mdxeditor/editor` → micromark) to its Node entry, not its `browser` one, which ran `document.createElement` at load (Storybook's `viteFinal` registers it too, so its static build decodes as hosts do; its dev server's esbuild pre-bundle is out of the plugin's reach; `ClassicyRichTextEditor.entities.test.tsx` and the `NamedCharacterReferences` story check the decoding). On the server (and while the client hydrates) `ClassicyDesktop` renders an empty `classicyDesktop` shell with the host's `className`/`style` (`useClassicyClientRender`, `Desktop/useClassicyClientRender.internal.ts`, a `useSyncExternalStore` whose server snapshot is `false`), and the desktop draws right after hydration; a `createRoot` render draws it at once; lone components render in full (`ClassicyLoneComponents.ssr.test.tsx`). Without a `window` the provider builds no analytics instance (its queue `setInterval` is never cleared), `seedSoundState` no Howl, and the store's persistence subscriber schedules no write: guard on `typeof window`, never `typeof localStorage`, which from Node 25 reads Node's own accessor (it throws on 25.2, returns an object without `setItem` on 25.5, warns on 26). Core invariant 19 and the packages' invariant 11 import each ES bundle and `require()` each loader in child Nodes (`bin/classicyNodeImport.ts`, `classicyNodeImportChild.mjs`, plain JS so Node 22 strips no types and warns), once with `window`, `document`, `navigator`, `localStorage` and the rest deleted and once with Node's own globals but `localStorage`/`sessionStorage` accessors that fail on any read, failing on a throw, a throwing load-time task, a process warning or any console output within 750 ms (`CLASSICY_NODE_IMPORT_SETTLE_MS`, which the packages' fixture tests set to 0, beside `bin/classicyNodeImportFixture.ts`'s stand-in modules), and check the loader is exactly the one the plugin writes, under 4 KB, beside its bundle, and that the UMD bundle requires no Node built-in. `verify:host-types` type-checks a CommonJS host too (`host.cts`: `node16-cjs`, `node16-cjs-lib-check`, `nodenext-cjs`) and runs the packed packages in Node (`CLASSICY_HOST_RUNTIME`: by `import`, by `require()`, and both in one process, which gets two libraries). `ClassicyDesktop.ssr.test.tsx` (node environment, a throwing `localStorage` accessor included) and `ClassicyDesktop.hydration.test.tsx` hold the render side. The core's ES entry starts with `"use client";` (story 0224-siu; `classicyUseClientPlugin`, `bin/classicyUseClient.ts`, a Rollup banner, which keeps the source map right; core invariant 20), so a Next.js App Router server component imports and renders Classicy's components with no wrapper; the UMD bundle and the lazy chunks carry none, and neither do the Appearance Packages (the packages' invariant 12, `findClassicyNoUseClientProblems`): a package registers itself when it runs, so a host imports it from a client module, and a server component's import of it fails the host's build, where a marked package would build and never run in the browser (Next.js 16.4.6, Turbopack and webpack). `classicyBundleSpecifiers` skips a leading directive prologue and comments before reading a bundle's static imports, and core invariant 1 fails when the scan reads no `react` import from `classicy.es.js` (static) or `classicy.umd.js` (`require`), so a head it cannot parse never passes unread. Bare Rollup hosts see one `MODULE_LEVEL_DIRECTIVE` warning for the directive (documented, with its `onwarn` filter); Vite, esbuild and webpack print none. Contract: `docs/AGENT-REFERENCE.md` §1, "Which format to use", "Server rendering" and "Next.js (App Router)".
- **One build and one dist check per package**: `build:source` builds the core (`vite.config.ts`, entry `src/index.ts`) and runs its `verify:dist` (`bin/check-dist-imports.mjs`), then runs `pnpm --filter @classicy/appearance-platinum build`: Platinum's own `vite build` (`packages/appearance/platinum/vite.config.ts`; ES and UMD bundles with `@classicy/classicy` and React external, `dist/types` from `vite-plugin-dts` over `tsconfig.build.json`, which resolves `@classicy/classicy` through the workspace link to the core's built declarations, so the core builds first) and its `verify:dist` (`packages/appearance/platinum/bin/verify-dist.mjs`). The core's check requires that its dist holds no workspace package's file, as a file or inlined (invariant 5: whole-file base64 match, `findClassicyCorePackageFiles` in `bin/classicyDistAssets.ts`, which now also covers the saver images under `src/screenSavers`), that no bundle carries a `@layer classicy.package` block (invariant 7), and that no `classicySaver*` keyframe or class is in the core's dist (invariant 14, `findClassicySaverMarkers`); its old invariant 12 moved to Platinum. It also holds the plan 0019-fb7 gates: `dist/types` has no `.d.ts.map` (part of invariant 8, below), every map keeps Classicy's own text only (invariant 16, below), the pdf.js worker ships deflated (invariant 17, below), and `classicy.es.js` and `classicy.umd.js` each embed `assets/img/ui/earth.webp` (the About box's Earth picture, icon key `classicy.bg`, the core's only WebP, lossless with the ICC profile its PNG's gAMA and cHRM stood for) as exactly one `data:image/webp` URI, byte for byte the file, so `VitePluginImageTools` never re-encoded it (invariant 18). Platinum's check holds the rest: the bundles import the core rather than carry it (React is external too; zod is carried on purpose, as the core carries it, and stays in `dependencies` for the declarations), `dist/assets` holds exactly its fonts, art (SVG and WebP), cursors (PNG), wallpapers (WebP), screen saver art (`src/screenSavers/*/*.webp`) and two sprites (ogg and m4a), each byte-identical to its source (a PNG or JPG art or wallpaper fails unless `PLATINUM_ORIGINAL_FORMAT_EXCEPTIONS` names it: only `art/alias.png`, whose translucent pixels Chromium draws one level darker from a WebP), nothing but the halftone mask is inlined (System 7's check allows its seven masks, below), every `new URL("assets/…")` names a file and every file is referenced, the package block and its byte-identical `classicy-platinum.css`, the charset rule, the font stylesheet, production JSX (invariant 8: the savers are its first JSX, so its build sets `NODE_ENV=production` like the core's), and `dist/types/index.d.ts` with no test, build-script or JSON declaration and every relative specifier carrying its `.js` (the package is `"type": "module"`, so a `node16`/`nodenext` host resolves no other; dts's `beforeWriteFile` adds them with `bin/classicyDeclarationSpecifiers.ts`) and no `.d.ts.map` (invariant 7), and maps that keep Classicy's own text only (invariant 10, the core's 16). `PlatinumOneRegistry.test.ts` builds Platinum with `--mode bundle-test`, which skips the declarations. System 7 then builds the same way (`pnpm --filter @classicy/appearance-system7 build`, `packages/appearance/system7/vite.config.ts`), and its `bin/verify-dist.mjs` holds Platinum's invariants for its own files (the saver art under Platinum's `src/screenSavers/` included; its art, icons and wallpapers WebP, its cursors PNG, with no format exception), except that nothing but its seven masks may be inlined: the dither checker (`art/dither-checker.svg`), the title bar's stripes and the windoid's drag-bar dots in both variants (`art/{color,bw}/window-stripes.webp` and `window-utility-texture.webp`), and the 1-bit open Apple and Help titles' inversion masks (`art/bw/apple-menu.webp`, `art/bw/help-button.webp`), the six WebPs typed `image/webp`, each byte for byte its file; and that `dist/types` may declare or reference nothing of Platinum's.
- **Styles ship inside the JS** (#303): `injectCssPlugin` (`vite.config.ts`) appends `bin/classicyStyleInjector.ts`'s code to both of the core's entry bundles, which inserts `classicy.css` as `<style id="classicy-styles">` at the top of `<head>` on first import (once; skipped without a `document`). `dist/classicy.css` is still emitted for strict-CSP hosts. A package's look and fonts are not part of it: each package's `?inline` stylesheet ships as a string in that package's bundles, injected at runtime by the package registry, and Platinum's fonts are `.woff2` files under `packages/appearance/platinum/src/assets/fonts/`, registered by `registerClassicyFonts` as `<style id="classicy-fonts-platinum">` pointing at Platinum's emitted `dist/assets/*.woff2`. A strict CSP blocks both elements, so the package's build emits them as files too, with `classicyPackageStylesheetsPlugin` (`bin/classicyPackageStylesheets.ts`): `dist/classicy-<name>.css` from the stylesheet module's final code (Platinum: `classicy-platinum.css`, starting with the layer order) and `dist/classicy-<id>.fonts.css`, the same `@font-face` rules, unlayered, from the same face list (`platinumFonts.internal.ts`) and rule writer (`ClassicyFontFaceCss.internal.ts`) the runtime uses (`bin/classicyFontStylesheet.ts`), each `url()` the font's emitted file relative to dist. Strict-CSP hosts link `@classicy/classicy/dist/classicy.css`, then `@classicy/appearance-platinum/classicy-platinum.css` and `@classicy/appearance-platinum/classicy-platinum.fonts.css` (both packages' `exports`), in that order; System 7 ships `classicy-system7.css` and `classicy-system7.fonts.css` the same way. The dotted name keeps the fonts file out of the `classicy-<name>.css` namespace, which belongs to package stylesheets. `dist/fonts.js` (+ `fonts.d.ts`, emitted by `injectCssPlugin`; not a Rollup input, since UMD allows one entry) is a deprecated no-op shim so existing `import "@classicy/classicy/fonts"` lines keep resolving (`exports` `./fonts`, listed in `sideEffects`); the 2.x `@classicy/classicy/appearance/platinum` shim and `./appearance/platinum/scss/*` export are gone (Platinum's package exports `.` and `./scss/*`). Every `dist/*.css` of each package must be ASCII only or open with `@charset "UTF-8";` (core invariant 9, Platinum's and System 7's invariant 5, `bin/classicyDistCharset.ts`; a linked stylesheet served without an HTTP charset otherwise takes a non-UTF-8 page's encoding); every package's Vite config keeps them ASCII with `esbuild.charset: "ascii"`, so package glyph `content` is written as escapes.
- **Cascade layers**: `classicyCssLayerPlugin` (`bin/`, registered in `vite.config.ts`, Storybook's `viteFinal` and the example's live-source dev server) wraps every compiled `<repo>/src/**/*.scss`, `?inline` included, in `@layer classicy.base { … }` (one block per file; on the dev server each is also preceded by `CLASSICY_LAYER_ORDER`, `@layer classicy.base, classicy.package, classicy.user;`), except a stylesheet that already is exactly one block of another declared layer: an Appearance Package's `?inline` sheet, one `@layer classicy.package { … }` block, which wrapped would sink to `classicy.base.classicy.package`, under every base rule; its `transformIndexHtml` prepends `<style id="classicy-layer-order">` to every HTML page Vite serves or builds (Storybook's iframe, the example dev server), and the injected stylesheet and `dist/classicy.css` (`prependLayerOrder`, after Vite's hoisted `@charset`) start with the statement. Because it comes first in `<head>`, unlayered host CSS **and every host layer** (Tailwind v4 preflight in `@layer base`, say) beat all of `classicy.*`, `classicy.user` included; hosts override in `classicy.user` or unlayered, and keep resets beneath Classicy in the reserved sublayer `classicy.base.host`, which Classicy never declares. For Tailwind v4 that means **replacing** `@import "tailwindcss";` with its granular form, `@layer theme, base, components, utilities;` plus `theme.css layer(theme)`, `preflight.css layer(classicy.base.host)` and `utilities.css layer(utilities)` (an extra preflight import beside the shorthand still loads a copy into `base`). Contract in `docs/AGENT-REFERENCE.md` §1. New Classicy styles must be `.scss` under `src/` (a plain `.css` would sit unlayered and beat them all), and a component SCSS must never contain a CSS `@import`: it is invalid inside the layer block. `verify:dist` fails if either artifact loses the order statement, holds anything but `@layer classicy.base` blocks after it (invariant 10, `bin/classicyBaseCss.ts`), or if a plain `.css` file under `src/` or a package's `packages/appearance/<id>/src/` holds a rule (invariant 11; the empty `src/index.css` passes). The runtime `@font-face` `<style>` that `registerClassicyFonts` writes stays unlayered (layers do not affect `@font-face`).
- **Package assets emit as files**: lib mode inlines every asset regardless of `assetsInlineLimit`, so `noInlineAppearanceAssetsPlugin` (`bin/classicyNoInlineAssets.ts`, used by every library build with its default rule) appends the per-import `?no-inline` opt-out to every asset import that resolves under `src/Appearance/` or `packages/appearance/`, and `assetFileNames` puts those files in `dist/assets/`. Platinum's sound sprites, wallpapers, and the art and cursors that left the core's icon tree live in `packages/appearance/platinum/src/assets/` (the core's `assets/` keeps only what the core reads, and its orphans); Platinum's build emits them, its art and its fonts as files in its own `dist/assets/`, and the core's build reaches none of them (its dist has no `assets/` folder). The one deliberate exception is the `halftone` art, imported `?inline` (`art/platinumArt.ts`, ruling E17): it is Platinum's only mask, and a `data:` mask needs no CORS fetch; `halftone.svg` is still emitted with the rest of the art. System 7's exceptions are likewise its masks, the seven above, imported `?inline` (`assets/system7Assets.ts`).
- **Breaking change for Vite consumers**: because package assets are files referenced by `new URL("assets/…", import.meta.url)`, a consumer's Vite dev server must not pre-bundle any of the packages (the pre-bundle in `node_modules/.vite/deps/` rewrites those URLs, so fonts, art, wallpapers and sprites return the SPA fallback). Consumers set `optimizeDeps: { exclude: ["@classicy/classicy", "@classicy/appearance-platinum"] }` (plus `@classicy/appearance-system7` when they load it), as `example/vite.config.ts` does (`ClassicyPackageExports.test.ts`); any CommonJS dependency classicy pulls in may then need to go in `optimizeDeps.include`. Bundlers that handle `new URL(…, import.meta.url)` (a Vite production build, webpack 5, Rollup with a URL plugin) need no setting; with any other (plain esbuild, Rollup without such a plugin) the consumer copies each package's `dist/assets/` (Platinum's, and System 7's when loaded) next to the bundle, and the core's `dist/sample.mp4` too (the Movie Player's sample movie, imported `?no-inline` by `MoviePlayer.tsx` and referenced as `new URL("sample.mp4", import.meta.url)`, the one asset the core emits as a file). The pdf.js worker asks nothing of a host (it is embedded, below). Documented in `docs/AGENT-REFERENCE.md` §1 and the README, alongside `@classicy/classicy/fonts` becoming a no-op and 2.x's `dist/fonts.css` being removed. Package assets also ship exactly as authored: neither package's build has an image plugin, and each `verify:dist` fails on any file in its `dist/assets/` that differs from its source or has none (an optimizer's re-encoded copy); the core's `VitePluginImageTools` takes `excludes: CLASSICY_IMAGE_TOOLS_EXCLUDES` (`bin/classicyImageTools.ts`: `src/Appearance/` and `packages/appearance/`).
- **Raster art is WebP** (plan 0019-fb7 Part 5): Platinum's art and wallpapers, System 7's art, icons and wallpapers, and the core's `assets/img/ui/earth.webp` are WebP, lossless with `exact` (the color under fully transparent pixels kept), written by `bin/classicyWebp.ts`: libwebp compiled to WebAssembly (`@jsquash/webp`, pinned exactly at `1.5.0`; sources decoded with `pngjs` and `jpeg-js`, all root devDependencies), so a source gives the same bytes on any machine. A PNG with gAMA and cHRM and no sRGB chunk, which browsers color-manage (Platinum's `art/sad-mac.png`, `earth.png`), got the ICC profile those chunks stand for (`classicyIccFromPngChunks`, muxed as VP8X plus ICCP). Only the photos (`CLASSICY_WEBP_PHOTOS`) may go lossy, at 45 dB PSNR or more over white and over black and only when smaller than lossless: Platinum's `default.jpg` did (`default_photo.webp`, quality 90), `earth` did not. Cursors stay PNG (the format every browser takes for a CSS `cursor`), and so does Platinum's `art/alias.png` (`CLASSICY_WEBP_KEEP_ORIGINAL`: Chromium draws its translucent pixels one level darker from a WebP). `bin/convert-images-to-webp.ts` did the one-time conversion; `bin/check-webp-in-browsers.ts --browser chromium|firefox` compares each WebP with its original as that browser draws them, each browser its own reference (Firefox launched with color management mode 2; a control exits 2 when management is off); System 7's exporters (`bin/export-assets.mjs`, `bin/export-pixel-art.mjs`) write WebP through `bin/classicyWebp.ts`, cursors as PNG. Nothing under `src/` imports these tools.
- **Source maps keep Classicy's own text** (plan 0019-fb7 Part 1): `classicySourceMapTextPlugin` (`bin/classicySourceMapText.ts`), the last plugin in the three library builds' configs (not Storybook's or the example's), sets `sourcesContent` to `null` for every third-party source (a path through `node_modules/`, the deflated pdf.js worker's module included) and every embedded asset (by extension, `CLASSICY_MAP_ASSET_EXTENSIONS`, or a module whose text starts `export default "data:`; a query alone makes nothing an asset, so a package's `.scss?inline` keeps its text) and lists each vendor source in `x_google_ignoreList`. `sources`, `names` and `mappings` stay, so stack traces and DevTools still name the vendor file and line, and every `src/` source (the core's, a package's, Platinum's savers as System 7 bundles them) keeps its text. The gate (`findClassicySourceMapTextProblems`, core invariant 16, the packages' invariant 10) classifies with the same rules, so a `src/` module that is an asset only by its text fails it loudly: add its extension to the list.
- **No declaration maps** (plan 0019-fb7 Part 4): each library build's `dts()` call passes `compilerOptions: { declarationMap: false }`; the root `tsconfig.json` keeps `declarationMap: true` for the editor. A `.d.ts.map` pointed at `.ts` files no tarball holds except the core's `src/Appearance`, so a host loses only Go to Source Definition into those. Core invariant 8 and the packages' invariant 7 fail on any `.d.ts.map` in `dist/types`.
- **The pdf.js worker ships deflated** (plan 0019-fb7 Part 2): the PDF viewer lazily loads pdfjs-dist's **legacy** build (`pdfjs-dist/legacy/build/pdf.mjs`, `PDFViewerDocument.tsx`; the modern build calls `Map.prototype.getOrInsertComputed` natively, which the oldest supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack, so every release from 0.71.6 through 3.5.0, every 3.x release among them, all bundling pdfjs-dist 6.2.108's modern build, drew "Couldn't render this page." for every page there (0.70.3 to 0.71.5 bundled 6.1.200, whose modern build calls it natively too; before 0.70.3 the host supplied pdf.js); the types still come from `pdfjs-dist`) beside `ClassicyPdfWorkerSource.internal.ts`, which imports the legacy worker (`legacy/build/pdf.worker.min.mjs`) as `?classicy-deflate` (`classicyDeflateAssetPlugin`, `bin/classicyDeflateAsset.ts`: the default export is `CLASSICY_DEFLATE_MARK` then the base64 of the file raw-deflated at level 9) and, when the first PDF opens, rebuilds the same `data:text/javascript;base64,` URI the old `?url` import inlined, with fflate's `inflateSync`, as `GlobalWorkerOptions.workerSrc`. pdf.js then takes its old path (a `blob:` module worker importing the `data:` URI, its main-thread fallback included) and fetches nothing, so PDFs still open on `file:`, CDN and custom-scheme hosts, and a CSP that admitted the viewer still does. In the ES build pdf.js and the worker source are two lazy chunks (`pdf-*.js`, `ClassicyPdfWorkerSource.internal-*.js`), so a host that never opens a PDF loads neither; the UMD bundle carries both inline. Neither chunk imports the entry: the worker source imports only fflate and the deflated worker and returns `{ ok, src }` or `{ ok: false, problem, error? }`, keeping only a rebuilt URI, and `PDFViewerDocument` logs (a chunk importing `classicyLog` would name the entry as `./classicy.es.js`, so a host serving it under another URL would load a second library, or none). The viewer logs each document-load, page-load and page-render failure through `classicyLog` (`PDFViewer`, the error as a detail), never a canceled render. pdf.js's legacy build installs core-js polyfills on the page's built-in prototypes (`Map`, `Set`, `WeakMap`, `Iterator`, `Uint8Array.prototype.toBase64` and others) where a method is missing or nonconforming, when the first PDF opens, in both builds: the UMD bundle carries pdf.js inline but deferred (`classicyDeferredModulePlugin`, `bin/classicyDeferredModule.ts`, moves its body into a `__classicyDeferred()` export that `classicyDeferredExports`, `PDFViewer/ClassicyDeferredExports.internal.ts`, calls on the first document; the plugin refuses a pdf.js whose shape it cannot wrap), since its top level (`new DOMMatrix()`) throws without a DOM. A failed chunk load is not kept (the next document imports again). The plugin is registered wherever `src/` compiles: the core's build, the three vitest configs (each also lists `CLASSICY_DEFLATE_ID_RE` in `test.server.deps.inline`: vitest runs a `node_modules` file in Node, past every plugin, unless inlined), Storybook's `viteFinal` and the example's live-source dev server. `fflate` and `pdfjs-dist` are devDependencies the core bundles (`MUST_BE_BUNDLED`, invariant 2). Invariant 17: no `dist/*.js` holds a `data:text/javascript` URI with a payload, `classicy.umd.js` carries exactly one deflated payload, the ES chunks other than `classicy.es.js` exactly one between them and `classicy.es.js` none, and each inflates to the installed legacy worker byte for byte (the modern worker is named when found); `classicy.umd.js` and each ES chunk carrying pdf.js's API (getDocument's argument-check text) carry its legacy build, known by core-js's `Map.prototype.getOrInsertComputed` polyfill call (`target: "Map"` … `getOrInsertComputed: function`, keys and a string no minifier renames), at least one ES chunk carrying it; and no `dist/*.js` but `classicy.es.js` imports `classicy.es.js` (static, re-export or `import()`).
- **Published SCSS**: the core's `files` ships `src/Appearance` for the `./scss/*` (vocabulary) export and nothing under `packages/`; Platinum's SCSS is its own package's `./scss/*` (it ships `src/styles`, its tests kept out by `src/styles/.npmignore`; `PlatinumPackageExports.test.ts` packs it with both packers and checks that pnpm's packed manifest peer-depends on `@classicy/classicy` at `^<version>`, with no `workspace:` range). System 7's SCSS is its package's `./scss/*` the same way (`src/styles`; `scss/system7` ships compiled and is not for host compilation, since it loads Platinum's saver stylesheet index, which neither tarball holds). Platinum's sheets reach the vocabulary as `pkg:@classicy/classicy/scss/*`, so every build and test that compiles them passes Sass's `NodePackageImporter`. The core's tests and `__tests__` helpers are kept out by `src/Appearance/.npmignore`, which npm and pnpm both honor. A `!` pattern in `files` would not do: npm 11 honors it, but pnpm 10 ignores it and packs every test. `ClassicyPackageExports.test.ts` asserts on what both packers really pack (`npm pack --dry-run --json`, `pnpm pack --dry-run --json`). The core's type declarations leave out tests, `__tests__` helpers and stories too: `vite-plugin-dts` takes `exclude: CLASSICY_DTS_EXCLUDE` (`bin/classicyDistTypes.ts`), and `verify:dist` fails if `dist/types` holds a declaration for one. Their relative specifiers carry `.js`, as Platinum's do (dts's `beforeWriteFile`, `bin/classicyDeclarationSpecifiers.ts`, which skips comments and other strings; `verify:dist` invariant 8 fails on one without), and `build:source` ends with `pnpm verify:host-types` (`bin/check-host-types.ts`): it packs the core, Platinum and System 7 with pnpm and type-checks a host file against them under `bundler`, `node16` and `nodenext` with `skipLibCheck` and under `bundler` without it, the host holding only the packed manifests' dependencies and peers (an `@types/…` package only when declared), and fails on any package a packed declaration imports that its manifest does not declare (0151-0cc, 0153-k0e).
- **`resources/` location**: the Apple Human Interface Guidelines and reference art live in `packages/appearance/platinum/resources/`, beside Platinum's source, because they are Platinum's references. It is never published (not in the package's `files`), and never scanned by the SCSS gates.
- **Lint gates' scan roots**: the pixel-literal gate, the literal-color sweep and `ClassicyAppearance.varCoverage.test.ts` share `classicyScssSourceRoots` (`bin/classicyScssSource.ts`): `src/` plus every workspace Appearance Package's `packages/appearance/<id>/src/`. A new package's source is scanned without any gate edit.
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation
- **Stale `index.lock`**: an empty `index.lock` (mode 600, no holder) in the main checkout or in `.git/worktrees/<name>/` is left by a `git status` that was SIGKILLed mid-scan: the clued plugin's hook relay runs `git status --porcelain --untracked-files=all` after every Bash call under a 2 s `exec.CommandContext` timeout (umask 077, hence mode 600). Clear it with `bin/git-clear-stale-lock.sh [--dry-run] [--min-age SECONDS] [DIR]`, never a bare `rm`: it removes the checkout's own lock only when it is a regular file, empty, at least 60 s old, held open by no process, and no git process runs in that git dir (exit 2 otherwise; Linux only, it reads `/proc`). Story 0094-h7m.

@.claude/wiz-claude.md
