# Storybook Component Showcase — Design

**Date:** 2026-07-14
**Status:** Approved

## Purpose

A Storybook application that showcases all components in `src/SystemFolder/SystemResources`. Dual role, showcase-first: a polished, publicly deployable catalog documenting Classicy for npm-package consumers, that also serves as the day-to-day workbench for developing components in isolation.

## Decisions Made

| Decision | Choice |
|---|---|
| Purpose | Both showcase and dev workbench, showcase-first |
| Coverage | All ~33 SystemResources components in v1 |
| Architecture | New `storybook/` pnpm workspace member, Vite-aliased to `src/` |
| Story location | Co-located: `*.stories.tsx` next to each component |
| Features | Theme-switcher toolbar, autodocs, GitHub Pages deploy, Mac OS 8 manager chrome |
| Hosting strategy for complex components | Two-tier decorators (themed frame + opt-in real desktop) |

## Structure & Wiring

- New workspace member `storybook/`, added to `pnpm-workspace.yaml`. Storybook v10 with the `@storybook/react-vite` framework.
- `storybook/`'s Vite config (via `viteFinal` in `.storybook/main.ts`) reuses the root aliases — `@/` → `../src`, `@snd/` → `../assets/sounds`, `@img/` → `../assets/img` — and the same SCSS/SVG/image plugin setup as the root `vite.config.ts`, so stories compile library source directly with HMR. No library rebuild needed while iterating.
- Story files are co-located with components (e.g. `src/SystemFolder/SystemResources/Button/ClassicyButton.stories.tsx`). `.storybook/main.ts` globs `../src/**/*.stories.tsx` and `../src/**/*.mdx`.
- Library build hygiene:
  - Add `\.stories\.tsx?$` to the `exclude` list in `.ts-barrel.json` so barrelsby never pulls stories into barrels.
  - Exclude `**/*.stories.tsx` from the library `tsc` build and Vite entry so stories never reach `dist/`.
- Root `package.json` scripts: `storybook` (dev server) and `build:storybook` (static build), delegating to the workspace member via `pnpm --filter`.

## Decorators & Theming

Two tiers:

1. **Global "Platinum frame" decorator** (`.storybook/preview.tsx`), applied to every story:
   - Wraps in `ClassicySoundManagerProvider`.
   - Renders a `div.classicyDesktop` styled with the CSS-variable map from `getThemeVars(getTheme(selectedTheme))` (from `ClassicyAppearance.ts`), plus the theme's body/ui fonts and desktop-pattern background, so components sit on authentic chrome.
   - Serves as the portal target for `BalloonHelp`-style overlays. Because docs pages render several stories at once, the frame uses the class only there; in single-story iframe (canvas) mode it also sets `id="classicyDesktop"` so portal-based components work.
   - No analytics setup needed: `useClassicyAnalytics` already no-ops without a provider.
2. **Opt-in desktop decorator**: stories set `parameters: { classicy: { desktop: true } }` to render inside a real `ClassicyDesktop`, sized to the story viewport (not fullscreen). Store state is seeded per story via a `ClassicyStoreSeed` helper (e.g. a Window story seeds one app with one open window). The global Zustand store needs no provider; the decorator resets store state between stories so state doesn't bleed. Used by: Window, Menu/MenuBar, Desktop/DesktopIcon, App, AboutWindow, File browser, Boot/CrashScreen.

**Theme toolbar:** a `globalTypes` toolbar item listing every theme id read dynamically from `themes.json` (currently 21: default, azul, bondi, copper, …). Switching re-renders the frame with the new variable map; applies on docs pages too. If a theme fails to resolve, fall back to `default`.

## Story Coverage & Organization

Sidebar sections:

1. **Controls** — Button, Checkbox, RadioInput, Input, FileInput, Slider, PopUpMenu, DatePicker, TimePicker, ProgressBar, Spinner, Disclosure, Triangle, ControlGroup, ControlLabel, Tabs, Icon, ContextualMenu, BalloonHelp, ColorPicker, TextEditor, RichTextEditor, QuickTime embed.
2. **Desktop** — Window, Menu, MenuBar + widgets, Desktop, DesktopIcon, App, AboutWindow, File browser (icon + table views).
3. **System** — Boot, StartupScreen, CrashScreen, Cursor.

Each component gets a default story plus variant stories where props warrant (e.g. Button: default / square / small / depressed / padding-margin variants; ProgressBar: determinate / indeterminate). Autodocs enabled globally — prop tables derive from existing TypeScript types and JSDoc.

## Manager Chrome & Deployment

- **Mac OS 8 chrome:** `.storybook/manager.ts` theme via Storybook's theming `create()` — Platinum grays, the repo's shipped fonts, and a Classicy logo from `assets/img` if suitable. This skins sidebar/toolbar colors; it does not rebuild the manager UI.
- **CI:** GitHub Actions workflow building static Storybook on pushes to `main`, deploying via `actions/upload-pages-artifact` + `actions/deploy-pages`.

## Testing

No new test infrastructure in v1 — Storybook is itself the visual verification surface. Play-function interaction tests are a possible follow-up, out of scope here.

## Out of Scope

- Stories for ControlPanels, Finder, or QuickTime *apps* (only `SystemResources` components).
- Visual regression testing / Chromatic.
- Publishing the storybook app to npm (it is a private workspace member).
