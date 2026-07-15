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

### Theming

Themes are JSON-based (`src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`) and control:
- Typography (body, ui, header fonts)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- `pnpm build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from `assets/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
- Consumers must import the CSS separately: `import 'classicy/dist/classicy.css'`
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation

@.claude/wiz-claude.md
