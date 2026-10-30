# [Classicy](https://classicy.ing)

##### Previously Platinum

A UI framework using native CSS/JS replications of the Mac OS 8 interface components.

[Just curious? Visit our website to learn more.](https://classicy.ing)

## Demo

### [See a demo here!](https://robbiebyrd.github.io/classicy/)

## UI Components

### [See our Storybook collection here!](https://demo.classicy.ing/storybook/)

## Using Classicy in a Vite app

**Browser support:** Chrome/Edge 120+, Safari 16.2+, Firefox 113+. Theme
colors are mixed in CSS with `color-mix()` (Safari 16.2, Firefox 113), and
icons are drawn with unprefixed `mask-image` and mask compositing (Chrome
120); in an older browser those declarations are dropped, so tints, overlays
and icon art go missing.

Importing `classicy` injects its stylesheet; its fonts and art are files in
`dist/assets/`. **Breaking change for Vite consumers:** Vite's dev server
pre-bundles dependencies into `node_modules/.vite/deps/`, which breaks those
file URLs (fonts and art return the SPA fallback page). Exclude classicy from
the pre-bundle:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ["classicy"] },
})
```

Any CommonJS dependency classicy pulls in may then need to go in
`optimizeDeps.include`. Bundlers that handle `new URL(…, import.meta.url)`
(a Vite production build, webpack 5, Rollup with a URL plugin) need no
setting; with any other (plain esbuild, Rollup without such a plugin), copy
`dist/assets/` next to your bundle.
`import "classicy/fonts"` is now a deprecated no-op (the Platinum package
registers its fonts), and `classicy/dist/fonts.css` is gone.

**Breaking change: system art and cursors are no longer icons.** The
`ClassicyIcons` constant is now only the Platinum icon tree as shipped: it does
not reflect later `registerClassicyIcons` calls (`ClassicyIcons.myApp.icon` is
`undefined` at runtime), so read icons through `useClassicyAsset` (in a
component) or `resolveClassicyAsset` (elsewhere), never the constant. And
Platinum copies these icon paths into system art and cursors when it loads, so
registering them under `registerClassicyIcons` no longer changes what is drawn.
Register the replacement instead:

| Icon path you used to register | Register now |
|---|---|
| `system.alias` | `registerClassicySystemArt("platinum", { aliasBadge })` |
| `system.apple` | `registerClassicySystemArt("platinum", { appleMenu })` |
| `system.desktop.trashEmpty` | `registerClassicySystemArt("platinum", { trashEmpty })` |
| `system.desktop.trashFull` | `registerClassicySystemArt("platinum", { trashFull })` |
| `ui.helpButton` | `registerClassicySystemArt("platinum", { helpButton })` |
| `classicy.logo` | `registerClassicySystemArt("platinum", { aboutLogo })` |
| `system.macosSvg` | `registerClassicySystemArt("platinum", { startupLogo })` |
| `ui.cursors.watch`, `.hand`, `.resizeLr`, `.resizeUd`, `.resizeU`, `.resizeD`, `.resizeL`, `.resizeR` | `registerClassicyCursors("platinum", { watch, hand, resizeLr, resizeUd, resizeU, resizeD, resizeL, resizeR })` |

`docs/AGENT-REFERENCE.md` §5 has the full asset-registry reference.

**Breaking change: shared state classes and cascade layers.** A component's
state is now a bare class beside its root class, so the classes that folded a
state into their name are gone, and `data-state` is no longer set anywhere.
Update host CSS and tests that select them:

| Old class | Now |
|---|---|
| `classicyWindowActive`, `classicyWindowInactive` | `.classicyWindow.active`, `.classicyWindow.inactive` |
| `classicyWindowCollapsed`, `classicyWindowDragging` | `.classicyWindow.collapsed`, `.classicyWindow.dragging` |
| `classicyButtonDefault`, `classicyButtonDepressed` | `.classicyButton.default`, `.classicyButton.pressed` |
| `classicyMenuItemDisabled`, `classicyMenuItemOpen` | `.classicyMenuItem.disabled`, `.classicyMenuItem.open` |
| `classicyTabButtonActive` | `.classicyTabButton.selected` |
| `classicyDesktopIconActive`, `classicyDesktopIconOpen`, `classicyDesktopIconActiveAndOpen` | `.classicyDesktopIcon.selected`, `.open`, `.selected.open` |
| `classicyIconActive` | `.classicyIcon.selected` |
| `classicyListBoxOptionSelected`, `classicyTableRowSelected` | `.classicyListBoxOption.selected`, `.classicyTableRow.selected` |
| `classicyDesktopMenuAppleMenu` | `classicyDesktopMenuApple` |
| `[data-state="…"]` on BevelButton, Placard, ImageWell | `.checked`, `.pressed`, `.mixed`, `.disabled`, `.selected`, `.open` |

The exported type `ClassicyBevelButtonState` is deleted. `classicy/scss/*` now
resolves to the vocabulary (`@use "classicy/scss/vocabulary"`); the old theme
partials are Platinum's, at `classicy/appearance/platinum/scss/*` (see
Appearance Packages below). The global `.hidden`
utility and `classicyWindowZoomed` are gone, and a `zIndex` passed in `style`
to `ClassicyWindow`, `ClassicyIcon` or `ClassicyDesktopIcon` is dropped.

Classicy's stylesheet is now in cascade layers
(`@layer classicy.base, classicy.package, classicy.user`), so **unlayered host
CSS and every host layer beat Classicy whatever the specificity**: a host
`button { … }` or Tailwind v4's Preflight now restyles Classicy's controls.
Keep resets in the reserved `classicy.base.host` sublayer (for Tailwind v4,
replace `@import "tailwindcss";` with the granular form in
`docs/AGENT-REFERENCE.md` §1). Because the state classes are bare generic
names (`active`, `open`, `error`, `selected`, …), a host's global
`.active { … }` now matches Classicy elements too: scope such rules to your
own markup. The screen saver's hidden cursor no longer beats an unlayered host
`* { cursor: … }`.

The full old → new table (every renamed class) is in `docs/AGENT-REFERENCE.md`
§5, "Migrating to the shared vocabulary".

**Breaking change: the look is an Appearance Package.** Classicy's stylesheet
now holds structure only; the Platinum look (every bevel, border, gradient
and piece of art) is the Platinum Appearance Package's own stylesheet, in
`@layer classicy.package` and scoped under
`.classicyDesktop[data-classicy-appearance="platinum"]`. Importing `classicy`
registers it, and everything inside `ClassicyDesktop` looks as before.

- **Components outside a desktop are unstyled.** Wrap a standalone component
  in an element carrying `class="classicyDesktop"` and
  `data-classicy-appearance="platinum"`, with the theme and asset variables
  on it (`getThemeVars(getTheme("default"))` and `useClassicyAssetVars()`);
  give it `id="classicyDesktop"` so portals (menus, balloons) render inside it
  rather than falling back, unstyled, to `document.body`.
- **Strict-CSP hosts link a second file**: `classicy/dist/classicy.css`, then
  `classicy/dist/classicy-platinum.css`, first in `<head>`.
- **The theme partials moved.** `classicy/scss/appearance`,
  `classicy/scss/scrollbars` and `classicy/scss/assets` (2.1.x; pre-release
  builds called them `classicy/scss-platinum/*`) are now
  `classicy/appearance/platinum/scss/mixins`, `…/scrollbars` and `…/assets`.
  The mixins are renamed to kebab-case with a `platinum-` prefix
  (`appearance.platinumWindowControlBoxBorder` →
  `mixins.platinum-window-control-box-border`; `scrollbars.scrollbars` →
  `scrollbars.platinum-scrollbars`), and `px-rect`/`no-select` moved to the
  vocabulary as `classicy-px-rect`/`classicy-no-select`
  (`classicy/scss/layout`). `classicy/scss/themes.json` is gone: call
  `getAllThemes()`. `classicy/appearance/platinum` is kept for compatibility
  and registers nothing (importing `classicy` registers Platinum).
- **`platinum-halftone` takes a token name.** The mixin now takes a color
  token NAME (`@include mixins.platinum-halftone("--color-black")`, not a
  color) and paints the dither on a `::before` child, which sets
  `position: relative` and `isolation: isolate` on the element it is
  included in.
  `platinum-encode-color` is removed.
- **Platinum's art is registered system art** (`--classicy-art-<key>`,
  published by `ClassicyDesktop`): the `assets.$…` art variables are gone,
  and a standalone component needs `useClassicyAssetVars()` on its wrapper
  (above) or its art is missing. `ClassicyWindowFrame` now draws the window's
  title bar (`ClassicyWindowTitleBar`): target
  `.classicyWindowFrame .classicyWindowTitleBar` instead of the removed
  `classicyWindowFrameTitleBar`/`classicyWindowFrameTitleText`. The Control
  Strip and pop-up slider row constants (`controlStripTab`,
  `popUpSliderTrack`, …) are no longer exported: read them with
  `useClassicyPixelArtRows(key)` or draw `<ClassicyPixelArt art={key} />`.
  The published `platinum-window-control-box` and
  `platinum-window-control-box-depressable` mixins draw their dither from
  `--classicy-art-window-dither`, so a host using them outside a desktop must
  define it (or accept no dither).
- **Text glyphs are package CSS.** The menu check and dash, the pop-up and
  combo-box check, the bevel button's ▸ ▾, the placard's ▾, the file input's
  ✕ and the HyperCard tools palette's ✓ are now empty `aria-hidden` spans the
  package fills with `::before`/`::after` content: their `textContent` is
  `""`, and `getByText("✓")` finds nothing.
- **Checkable roles.** A menu item with `checked` set is
  `role="menuitemcheckbox"` with `aria-checked`, so
  `getByRole("menuitem", { name })` misses it; a HyperCard tools-palette entry
  is `role="button"` with `aria-pressed`.
- **Caption colors are custom properties.** A `captionStyle` reaches the cue
  as `--classicy-caption-*` properties, not inline `color` and
  `background-color` (`style.color` reads `""`), so it no longer carries
  inline precedence: host CSS in `classicy.user`, or unlayered, overrides it.
  Theme captions through
  `.quickTimePlayerCaptions:not(.quickTimePlayerCaptionsCustomStyle)` to keep
  the viewer's choice.
- **`ClassicyKbd` wraps each modifier** in its own
  `<span class="classicyKbdModifier" data-classicy-part="modifier-<name>">`.
  The text is unchanged; snapshots of its children change.
- **Fixed:** Firefox no longer shows a scroll bar under tab strips in the
  built library (the desktop's scroll-bar fallback used to beat the tab
  scroller's `scrollbar-width: none`).

The full mixin table and the package API are in `docs/AGENT-REFERENCE.md`
§5, "Migrating to Appearance Packages", and §8, "Appearance Packages".

**Changed: sizes and colors derive from the theme.**

- **Overriding an input no longer rescales the derived sizes.** Stylesheets
  read named sizes that `getThemeVars` computes from the theme
  (`--menu-min-width`, `--popup-height`, `--ui-font-size-small`, …) instead
  of `calc(var(--window-control-size) * N)`. A host that overrides an input
  such as `--window-control-size` on the desktop now changes only that
  variable. Change the theme's measurement instead, or override the derived
  variable itself (`docs/AGENT-REFERENCE.md` §8, "Overriding sizes from a
  host").
- **Error title bars are `#ffcccc`**, `classicy-tint("--color-error", 80%)`,
  instead of `#f7cecd`, so they follow a theme's error color. New SCSS
  helpers `classicy-tint`, `classicy-shade` and `classicy-alpha` are at
  `classicy/scss/color`.
- **`ClassicyWindowOpen` no longer treats `[0, 0]` as "no position".** A new
  window opens where its `position` says, `[0, 0]` included. To have it
  cascaded (`30 + 10·n`), omit `position` or pass `autoPosition: true`.
  `ClassicyWindow` always supplies a position, so its windows are unaffected
  (default `[110, 110]`).
- **A package knob that would make a variable Classicy sets itself**
  (`menu.minWidth` → `--menu-min-width`) is skipped with a warning and left
  out of the Options tab.

## Building and running on localhost

This project uses [pnpm](https://pnpm.io/) (enable it with `corepack enable`). First install dependencies:

```sh
pnpm install
```

To create a production build:

```sh
pnpm build
```

To create a development build:

```sh
pnpm dev
```

## Running

To run the example site locally (builds the package and starts the example dev server):

```sh
pnpm preview
```

Then visit the site in your browser at http://localhost:3000.

(For iterative package development you can also use `pnpm dev`, which builds the source. The `example/` app consumes it directly through the pnpm workspace — no linking step required.)

### Browser app — TimeMachine Proxy

The Browser app requires the [TimeMachine Web Proxy](https://hub.docker.com/r/robbiebyrd/time-machine-proxy) to fetch archived web pages. A Docker Compose setup is included in `example/timemachine/`:

```sh
cd example/timemachine
cp .env.example .env   # adjust if needed
docker compose up -d
```

The proxy runs on `http://localhost:8765` by default. Enable it in the Browser app under **File → Settings → Enable TimeMachine Proxy**.

## Acknowledgements

- New Dawn by [`Nathanael Gentry`](https://github.com/npjg)
- Scrollbars of the Classic Mac OS by [`Jessica Stokes (@ticky)`](https://github.com/ticky)
- `after-dark-css`, for the basic System 7.1.1 interface
- [`flyer`](https://www.masswerk.at/flyer/), for further inspiration
- Robin Casady, for releasing ChicagoFLF into the public domain
- Apple, who maintains the copyright on the background patterns, icons and interface components

## Features

*Legend*

|          |                     |                     |
|:--------:|:-------------------:|:-------------------:|
|    ✅     |         ℹ️          |         ⚠️          |
| Complete | Partially complete. |    Experimental     |
|          |                     | *Subject to change* |

- Desktop
    - ✅ The ubiquitous Finder
    - Menubar
        - ✅ System Menu
        - ✅ App Switcher
        - ✅ Widgets
            - ✅ Date/Time
            - ✅ Sound
    - Icons
        - ✅ App Shortcuts
        - ✅ Cleanup
        - Arrange By…
- Sounds
    - ✅ Sound Provider
    - ✅ Load sound theme from JSON
    - ✅ Audio Sprites support
    - ✅ Sound Manager Control Panel
        - ✅ Sound Event Handler
            - ✅ Event dispatcher/player
            - ✅ Automatic event intercept and play for known events (map audio sprites to events)
- Logging & Diagnostics
    - ✅ `registerClassicyLogSink` — host apps receive Classicy logs, errors, and crash reports (production builds included)
- Screen Saver
    - ✅ Idle-activated full-screen screensavers (After Dark CSS ports: Flying Toasters, Fish, Warp, and 9 more)
    - ✅ Screen Saver Control Panel (pick saver, timeout, per-saver options)
    - ✅ `registerClassicyScreenSaver` API with custom or schema-derived options UI
- Appearance Manager Control Panel (Theme Manager)
    - ✅ Appearance Manager Control Panel
    - ✅ System
        - ✅ Load theme from JSON
        - ✅ System events for modifying theme
    - UI
        - ✅ Typography settings
        - ✅ Measurement settings
        - ✅ Desktop settings
        - ✅ System colors
        - ✅ Configurable color variables
    - ✅ Color Theme-able components
- App Template
    - ✅ App Context/Event Handler
    - ✅ App Switcher
- Window
    - Controls
        - ✅ Zoom
        - ✅ Resize
        - ✅ Collapse
        - ✅ Close
        - ✅ Placard
        - ✅ Header
    - Dialog
        - Modal
            - Dialog
                - ✅ Movable
                - ✅ Non-movable
            - Alert
                - ✅ Movable
                - ✅ Non-movable
        - ✅ Modeless
    - ✅ Standard
- System
    - ✅ File System
        - ✅ Integrated into Finder.app
- UI Components
    - ✅ Text Input
    - ✅ Text Area
    - ✅ Button
    - ✅ Tabs
    - ✅ Radio Button
    - ✅ Drop-down menu
    - ✅ Drop-down menu groups (optgroup)
    - ✅ Form (dialog layout, safe submit)
    - ✅ Multi-select menu (List Box)
    - ✅ Combo box (autocomplete)
    - ✅ Table (Platinum list view)
    - ✅ Checkbox
    - ✅ Bevel Button
    - ✅ Slider
    - ✅ Spinner
    - ✅ Date Picker
    - ✅ Time Picker
    - ✅ Expandable (Disclosure)
    - ✅ Fieldset
    - ✅ Separator
    - ✅ Progress
    - ✅ Balloon Help (tooltip)
    - ✅ Link (desktop-routed hyperlink)
    - ✅ Meter (gauge with zones)
    - ✅ Output (read-only result)
    - ✅ Keyboard shortcut display (kbd)
    - ✅ Menu
        - ✅ Desktop Menu
        - ✅ Contextual Menu
        - ✅ Submenu
    - Gallery Picker (Slider)
    - ✅ Color Picker

## Component Reference

All components are exported from the `classicy` package. Import them by name:

```tsx
import { ClassicyWindow, ClassicyButton, ClassicyBalloonHelp } from 'classicy';
```

> **Building an app?** [`docs/BUILDING-APPS.md`](docs/BUILDING-APPS.md) is the step-by-step guide: `ClassicyApp` and `ClassicyWindow` prop-by-prop, manifests, reducers, menus, icons, files, dialogs, balloon help, sound, analytics, extensions, persistence, and testing — plus the traps that cost the most time. It ships with the package at `node_modules/classicy/docs/BUILDING-APPS.md`.
>
> **Using an AI coding agent?** A complete machine-oriented reference to the public API — every component's props, app/event/icon registration, theming, analytics, sound, and the untrusted-action rules — ships with the package at [`docs/AGENT-REFERENCE.md`](docs/AGENT-REFERENCE.md) (`node_modules/classicy/docs/AGENT-REFERENCE.md`). Point your agent at it.

Each table below lists the raw HTML element the component replaces — inside a
Classicy desktop, prefer the component over the raw tag (e.g. `ClassicyButton`
instead of `<button>`) to get theming, sounds, and balloon help for free. The
full two-way map, including HTML elements that have **no** Classicy equivalent,
is in [`docs/AGENT-REFERENCE.md` §4.0](docs/AGENT-REFERENCE.md).

### Application Shell

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyDesktop` | Root desktop surface — icons, menu bar, wallpaper, drag-select | — (desktop metaphor) |
| `ClassicyDesktopMenuBar` | Top menu bar with system menu, app menu, and widget tray | `<nav>` |
| `ClassicyApp` | Application container. Props: `id`, `name`, `icon`, `defaultWindow` | — |
| `ClassicyWindow` | Window chrome with title bar and controls. Props: `id`, `appId`, `title`, `closable`, `zoomable`, `collapsable`, `resizable`, `modal`, `initialSize`, `initialPosition`, `minimumSize` | `<dialog>` (non-modal; `modal` prop for modal) |
| `ClassicyBoot` | Boot screen shown on first load | — |
| `ClassicyScreenSaver` | Idle-activated screensaver extension (auto-mounted by `ClassicyDesktop`); register your own savers with `registerClassicyScreenSaver` | — |
| `ClassicyAboutWindow` | Standard "About This App" dialog. Props: `appId`, `appName`, `appIcon` | `<dialog>` |

### Inputs

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyButton` | Push button. Accepts children as label | `<button>` |
| `ClassicyCheckbox` | Checkbox with optional label. Props: `checked`, `label`, `onChangeFunc` | `<input type="checkbox">` |
| `ClassicyRadioInput` | Radio button group. Props: `label`, `options` (array of `{ label, value }`) | `<input type="radio">` group |
| `ClassicyInput` | Single-line text field. Props: `placeholder`, `value`, `onChangeFunc` | `<input type="text">` (any text-like `type`) |
| `ClassicySpinner` | Numeric stepper (up/down arrows). Props: `value`, `min`, `max`, `step` | `<input type="number">` |
| `ClassicyPopUpMenu` | Drop-down selector. Props: `label`, `options` (`{ label, value }` items or `{ groupLabel, options }` groups), `value` | `<select>` / `<option>` / `<optgroup>` |
| `ClassicyListBox` | Scrolling list with single or multi selection (⌘-toggle, Shift-range). Props: `options`, `selectionMode`, `selected`, `onChangeFunc`, `visibleRows` | `<select multiple>` |
| `ClassicyComboBox` | Editable field with filtering suggestions and a pop-up arrow. Props: `options`, `filter`, `freeText`, `onSelectFunc` | `<datalist>` |
| `ClassicyDatePicker` | Date input with calendar picker. Props: `value`, `placeholder`, `onChangeFunc` | `<input type="date">` |
| `ClassicyTimePicker` | Time input with clock picker. Props: `value`, `placeholder`, `onChangeFunc` | `<input type="time">` |

### Text Editing

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyTextEditor` | Plain-text editor area. Props: `content`, `onChangeFunc` | `<textarea>` |
| `ClassicyRichTextEditor` | Rich-text editor (bold, italic, lists). Props: `content`, `onChangeFunc` | `contenteditable` region |

### Layout & Structure

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyTabs` | Tabbed container. Children must be `ClassicyTab` items with a `title` prop | — (ARIA `role="tablist"` pattern) |
| `ClassicyDisclosure` | Collapsible section (expand/collapse). Props: `label`, `open` | `<details>` / `<summary>` |
| `ClassicyControlGroup` | Labeled fieldset grouping form controls. Props: `label` | `<fieldset>` / `<legend>` |
| `ClassicyControlLabel` | Inline label for a control. Props: `label` | `<label>` |
| `ClassicySplitView` | Resizable two- or three-pane container with a draggable, keyboard-accessible divider. Props: `direction`, `defaultSizes`, `minPaneSize`, `onResize`, `onResizeCommit` | — (nearest: obsolete `<frameset>`) |
| `ClassicyForm` | Form wrapper with HIG row/dialog spacing; submit never navigates. Props: `onSubmitFunc`, `layout`. Pair with `ClassicyFormButtonRow` for the Cancel/OK row | `<form>` |
| `ClassicyTable` | Platinum list view over arbitrary data: sortable/resizable columns, Mac row selection, keyboard navigation. Props: `columns`, `rows`, `getRowId`, `selectionMode`, `onActivateRow` | `<table>` |

### Menus

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyMenu` | Drop-down menu used in the menu bar. Props: `id`, `title`, `menuChildren` | `<menu>` |
| `ClassicyContextualMenu` | Right-click context menu. Renders at pointer position | `<menu>` (the old `contextmenu` attribute) |

### Feedback & Display

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyProgressBar` | Determinate progress bar. Props: `value`, `max`, `label` | `<progress>` |
| `ClassicyMeter` | Gauge with native meter zone semantics (theme accent / alert / error). Props: `value`, `low`, `high`, `optimum`, `segments` | `<meter>` |
| `ClassicyOutput` | Read-only calculation result — static text or inset well. Props: `value`, `htmlFor`, `variant` | `<output>` |
| `ClassicyKbd` | Keyboard shortcut display in Platinum glyph order (⇧⌘S), inline or as key caps. Props: `shortcut`, `variant` | `<kbd>` |
| `ClassicyLink` | Themed hyperlink routed through the desktop URL opener (WebViewer, browser, or new tab). Props: `href`, `disposition`, `event` | `<a>` |
| `ClassicyBalloonHelp` | Mac OS 8-style speech-bubble tooltip. Wraps any element. Props: `content`, `title`, `position`, `delay` | `title` attribute (tooltip) |
| `ClassicyIcon` | System icon image with optional label. Props: `src`, `label` | `<img>` + caption |

### File System

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyFileBrowser` | File browser with icon and list views. Props: `path`, `onSelect` | — |

### Media

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `QuickTimeMovieEmbed` | Embedded QuickTime-style video player. Props: `url` | `<video>` / `<audio>` |

### Menu Bar Widgets

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyDesktopMenuWidgetTime` | Clock widget for the menu bar | — |
| `ClassicyDesktopMenuWidgetSound` | **Deprecated.** Mute toggle for the menu bar, no longer mounted by default. Use the Control Strip's built-in Sound module instead (`classicy-sound`; turn it off with `ClassicyDesktop`'s `controlStrip={{ disabledModules }}`). Still exported; logs a one-time dev warning when mounted | — |

### Control Strip

| Component | Description | HTML equivalent |
|-----------|-------------|-----------------|
| `ClassicyControlStrip` | Mac OS 8 Control Strip at the desktop's lower left, showing every registered module — the built-in Sound and Screen Saver modules plus any an app or extension registers. Mounted by `ClassicyDesktop`; configure with its `controlStrip` prop (`disabledModules`, `defaultCollapsed`, `defaultWidth`), or pass `false` to hide it. Its collapsed state, width, and the user's module choices persist | `role="toolbar"` |
| `registerClassicyControlStripModule` | Adds a module (`id`, `label`, 16 px `icon`, `menuItems` or `content`, optional owning `appId` and `order`). Call at module scope; the strip updates live. Each module is also listed in `System Folder:Control Strip Modules` | — |
| `ClassicyControlStripManager` | The Control Strip control panel: show or hide the strip, and show, hide or reorder its modules | — |
| `ClassicyPopUpSlider` | Compact vertical slider for a pop-up bevel button (the Control Strip volume slider). Props: `value`, `onChange`, `ariaLabel` | `<input type="range">` |

---

## Architecture
### Component Organization

* `<ClassicyAppManagerProvider>`
    * `<ClassicyDesktop>`
        * `<ClassicyDesktopMenuBar>`
        * `<ClassicyDesktopIcon?>`
        * `<YourClassicyApp>`
            * `<ClassicyApp>`
                * `<ClassicyWindow?>`
                    * `<ClassicyUIControls?>`
                    * `<OtherReactNodes?>`

`ClassicyDesktop` must be imported **eagerly**. Mounting it lazily, a tick after
`ClassicyAppManagerProvider`, corrupts manager state: early dispatches reach a
reducer whose state the desktop has not seeded yet, and every dispatch after
that throws.

Writing an app? Start with
[`docs/BUILDING-APPS.md`](docs/BUILDING-APPS.md) — a step-by-step guide covering
`ClassicyApp`, `ClassicyWindow`, manifests, reducers, menus, files, dialogs,
sound, analytics, persistence, and testing.

### Seeding default state

`ClassicyAppManagerProvider` accepts an optional `defaultState` — a deep-partial
`ClassicyStore` merged over the built-in defaults **on first load only** (when no
saved state exists in `localStorage`). Returning visitors keep their persisted
state.

```tsx
<ClassicyAppManagerProvider
  defaultState={{
    System: { Manager: { DateAndTime: {
      dateTime: "2001-09-11T12:40:00.000Z", // 8:40 AM US Eastern (EDT, UTC-4)
      timeZoneOffset: "-4",
    } } },
  }}
>
  {/* ... */}
</ClassicyAppManagerProvider>
```

Arrays in `defaultState` replace their default counterparts wholesale (they are
not concatenated). To force a value on every load regardless of saved state,
clear `localStorage["classicyDesktopState"]` or dispatch the change at runtime.

### Seeding the default filesystem

`ClassicyAppManagerProvider` accepts optional `defaultFileSystem` and
`defaultFileSystemMode` props to seed the virtual filesystem used by Finder
and other file-aware apps **on first load only** (when no saved filesystem
exists in `localStorage["classicyStorage"]`). Returning visitors keep their
persisted filesystem.

```tsx
<ClassicyAppManagerProvider
  defaultFileSystem={{
    "Macintosh HD": {
      _type: "drive",
      _icon: ClassicyIcons.system.drives.disk,
      Documents: {
        _type: "directory",
        _icon: ClassicyIcons.system.folders.directory,
        "My Document.txt": {
          _type: "text_file",
          _mimeType: "text/plain",
          _data: "Hello, Classicy!",
        },
      },
    },
  }}
  defaultFileSystemMode="merge"
>
  {/* ... */}
</ClassicyAppManagerProvider>
```

`defaultFileSystemMode` controls how the filesystem is constructed:
- `"merge"` (default) deep-merges your tree onto the library's `DefaultFSContent`
- `"exclusive"` uses your tree as the entire filesystem, ignoring `DefaultFSContent`

Like `defaultState`, filesystem trees are seed-only. To force a filesystem
value on every load regardless of saved state, clear `localStorage["classicyStorage"]`
or rebuild the filesystem at runtime.

To correct a **returning** visitor's already-persisted tree — renaming a seeded
file, fixing a bad URL — pass `defaultFileSystemSeedMigrations`, a list of
one-time corrections applied against stored state (see
`ClassicyFileSystemSeedMigrations.ts`).

### Default apps

`ClassicyDesktop` automatically mounts six built-in apps — `SimpleText`,
`PDFViewer`, `MoviePlayer`, `PictureViewer`, `HyperCard`, and `WebViewer` — the
same way it always mounts `Finder`. Each can be disabled individually via a prop
on `ClassicyAppManagerProvider`:

```tsx
<ClassicyAppManagerProvider
  disableSimpleText={false}    // default: false (loads)
  disablePDFViewer={false}     // default: false (loads)
  disableMoviePlayer={true}    // opt out of Movie Player
  disablePictureViewer={true}  // opt out of Picture Viewer
  disableHyperCard={true}      // opt out of HyperCard
  disableWebViewer={true}      // opt out of Web Viewer
>
  <ClassicyDesktop />
</ClassicyAppManagerProvider>
```

Disabling an app only stops it from auto-mounting — it remains available to
import and render yourself (e.g. `import { PDFViewer } from "classicy"`) if
you want custom placement.

### Events

* `ClassicyDesktop`
    * `ClassicyDesktopClick`
    * `ClassicyDesktopDrag`
    * `ClassicyDesktopSetBalloonHelp`

* `ClassicySoundPlay`
    * `ClassicyAlertSosumi`
    * `ClassicyAlertWildEep`
    * `ClassicyAlertIndigo`
    * `ClassicyBeep`
    * `ClassicyBoot`
    * `ClassicyButtonClickDown`
    * `ClassicyButtonClickUp`
    * `ClassicyInputRadioClickDown`
    * `ClassicyInputRadioClickUp`
    * `ClassicyMenuClose`
    * `ClassicyMenuItemClick`
    * `ClassicyMenuItemHover`
    * `ClassicyMenuOpen`
    * `ClassicyWindowClose`
    * `ClassicyWindowCollapse`
    * `ClassicyWindowControlClickDown`
    * `ClassicyWindowControlClickUp`
    * `ClassicyWindowExpand`
    * `ClassicyWindowFocus`
    * `ClassicyWindowMoveIdle`
    * `ClassicyWindowMoveMoving`
    * `ClassicyWindowMoveStop`
    * `ClassicyWindowOpen`
    * `ClassicyWindowResizeIdle`
    * `ClassicyWindowResizeResizing`
    * `ClassicyWindowResizeStop`
    * `ClassicyWindowZoomMaximize`
    * `ClassicyWindowZoomMinimize`

* `ClassicyDesktopIcon`
    * `ClassicyDesktopClick`
    * `ClassicyDesktopAltClick`
    * `ClassicyDesktopDoubleClick`
    * `ClassicyDesktopDrag`

* `ClassicyApp`
    * `ClassicyAppOpen`
    * `ClassicyAppClose`
    * `ClassicyAppHide`
    * `ClassicyAppFocus`

* `ClassicyWindow`
    * `ClassicyWindowOpen`
    * `ClassicyWindowClose`
    * `ClassicyWindowZoom`
    * `ClassicyWindowCollapse`
    * `ClassicyWindowResize`
    * `ClassicyWindowDrag`
    * `ClassicyWindowFocus`
    * `ClassicyWindowContentScroll`
    * `ClassicyWindowContentClick`

* `ClassicyMenu`
    * `ClassicyMenuHover`
    * `ClassicyMenuClick`
    * `ClassicyMenuChange`

# License
This software is provided free and in the public domain under [The Unlicense](https://unlicense.org/).
