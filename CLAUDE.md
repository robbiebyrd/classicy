# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8 (Platinum) interface. It's distributed as an npm package with ES and UMD module formats.

## Common Commands

```bash
npm install              # Install dependencies
npm run build:source     # TypeScript + Vite build only (fastest iteration)
npm run build            # Full build (audio sprites + source)
npm run build:audio      # Generate audio sprites from assets/sounds/
npm run build:watch      # Watch mode: rebuilds source + audio on file changes
npm run lint             # Run ESLint
npm run preview          # Full build → npm link → run example app
```

**Local dev workflow**: `npm run build:source && npm link`, then in `example/`: `npm link classicy && npm run dev`. The `npm run dev` script in the root does exactly this (build + link). The `example/` directory is a standalone Vite app that consumes the built package.

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

State persists to localStorage (key: `classicyDesktopState`) via Zustand's `subscribe()` with 500ms debounce.

### Directory Structure

- `src/SystemFolder/ControlPanels/` - System-level managers (AppManager, SoundManager, AppearanceManager, DateAndTimeManager)
- `src/SystemFolder/SystemResources/` - Reusable UI components (Window, Button, Input, Menu, etc.)
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

### Theming

Themes are JSON-based (`src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`) and control:
- Typography (body, ui, header fonts)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

## Build Notes

- Uses **mise** for tool version management (`mise.toml`) — Node 24, ffmpeg 8.0.1
- `npm run build:source` runs `generate-barrels` first — barrelsby auto-generates all `index.ts` barrel files. Don't manually edit barrel files.
- Audio sprites generated via audiosprite from `assets/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
- Consumers must import the CSS separately: `import 'classicy/dist/classicy.css'`
- All styling uses SCSS files co-located with components — no Tailwind or inline styles for layout/presentation

@.claude/wiz-claude.md
