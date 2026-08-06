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
pnpm lint                 # Run ESLint
pnpm preview              # Full build → run example app
pnpm storybook            # Run the component showcase (Storybook) dev server
pnpm build:storybook      # Build static Storybook to storybook/storybook-static/
```

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
- **SoundManager** still uses React Context/useReducer (not migrated to Zustand)

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

Apps follow this pattern:
1. Use `ClassicyApp` wrapper with id, name, icon props
2. Use `useAppManager(selector)` to read state with a selector for performance
3. Use `useAppManagerDispatch()` to get the dispatch function for events
4. Wrap content in `ClassicyWindow` components
5. Create an event handler in `ClassicyAppManager.ts` if the app needs custom state

```tsx
// Reading state — always use a selector to avoid unnecessary re-renders
const appState = useAppManager(state => state.System.Manager.App.apps[id]);

// Dispatching actions
const dispatch = useAppManagerDispatch();
dispatch({ type: 'ClassicyAppOpen', app: { id, name, icon } });
```

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
  `{ title?, content, position?, delay? }`.

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

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- ffmpeg is **built from source** on macOS and Linux (prebuilt binaries were inconsistent and missing codecs). `mise install` runs `bin/ffmpeg-deps.sh` via a `preinstall` hook, which installs the required development libraries with `brew` or `apt-get` — on Linux that means an **automatic `sudo` prompt** the first time. The script is a fast no-op once the libraries are present. Run `bin/ffmpeg-deps.sh --check` to see what's missing without installing. Its package lists must stay in sync with `ASDF_FFMPEG_ENABLE` in `mise.toml`; it must stay executable (mise runs hooks via `sh`, so the `#!/bin/bash` shebang is what provides bash semantics). Non-apt Linux distros are reported, not automated. CI deliberately still uses the distro `ffmpeg` package.
- `pnpm build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from `assets/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
- Consumers must import the CSS separately: `import 'classicy/dist/classicy.css'`
- **Breaking change**: bundled `@font-face` rules (base64-embedded fonts) no longer ship inside `classicy.css` — they're extracted at build time (see the `splitFontFacesPlugin` in `vite.config.ts`) into a separate, opt-in stylesheet. Consumers who want the bundled fonts must additionally `import 'classicy/dist/fonts.css'`; consumers who supply their own fonts, or don't need the bundled ones, can skip it and avoid the payload entirely. Both stylesheets are exposed via `package.json`'s `exports` map.
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation

@.claude/wiz-claude.md
