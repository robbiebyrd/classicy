# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8 (Platinum) interface. It's distributed as an npm package with ES and UMD module formats.

## Common Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Full build (audio sprites + source)
npm run build:source     # TypeScript + Vite build only
npm run build:audio      # Generate audio sprites from resources/sounds/
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

Use `npm run build:source` for faster iteration when not modifying sound files.

## Path Aliases

- `@/` → `./src/`
- `@snd/` → `./assets/sounds/`
- `@img/` → `./assets/img/`

## Architecture

### Component Hierarchy

```
ClassicyAppManagerProvider     # Root provider - wraps entire desktop
  └── ClassicyDesktop          # Desktop surface with icons and menu bar
       ├── ClassicyDesktopMenuBar
       └── ClassicyApp         # Individual application container
            └── ClassicyWindow # Window component with controls
                 └── UI Components (Button, Input, Tabs, etc.)
```

### State Management

Uses React Context + useReducer pattern with a centralized event reducer:

- **ClassicyAppManagerProvider** (`src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext.tsx`) - Root provider that wraps SoundManager and Analytics
- **ClassicyStore** - Central state object containing all system managers
- **classicyDesktopStateEventReducer** (`ClassicyAppManager.ts:264`) - Routes events by prefix to domain-specific handlers

Event routing by prefix:
- `ClassicyWindow*` → Window operations (focus, move, resize, collapse, zoom)
- `ClassicyDesktop*` → Desktop operations (menus, themes, backgrounds)
- `ClassicyDesktopIcon*` → Icon selection and interaction
- `ClassicyApp*` → App lifecycle (open, close, focus, activate)
- `ClassicyAppFinder*`, `ClassicyAppMoviePlayer*`, `ClassicyAppPictureViewer*` → App-specific handlers

### Directory Structure

- `src/SystemFolder/ControlPanels/` - System-level managers (AppManager, SoundManager, AppearanceManager, DateAndTimeManager)
- `src/SystemFolder/SystemResources/` - Reusable UI components (Window, Button, Input, Menu, etc.)
- `src/SystemFolder/Finder/` - Finder app implementation
- `src/SystemFolder/QuickTime/` - Media player apps

### Creating Apps

Apps follow this pattern:
1. Use `ClassicyApp` wrapper with id, name, icon props
2. Use `useAppManager()` to read state, `useAppManagerDispatch()` to dispatch events
3. Wrap content in `ClassicyWindow` components
4. Create a Context file with event handler if app needs custom state management

### Theming

Themes are JSON-based (`src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`) and control:
- Typography (body, ui, header fonts)
- Colors (system palette, theme accent colors)
- Desktop appearance (background, patterns)

State persists to localStorage under key `classicyDesktopState`.

## Build Notes

- Uses Volta for Node version management (Node 24.11.0)
- Audio sprites generated via audiosprite npm package from `resources/sounds/` directories
- Library outputs to `dist/` as `classicy.es.js` and `classicy.umd.js`
