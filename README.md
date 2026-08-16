# [Classicy](https://classicy.ing)

##### Previously Platinum

A UI framework using native CSS/JS replications of the Mac OS 8 interface components.

[Just curious? Visit our website to learn more.](https://classicy.ing)

## Demo

### [See a demo here!](https://robbiebyrd.github.io/classicy/)

## UI Components

### [See our Storybook collection here!](https://demo.classicy.ing/storybook/)

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
    - Multi-select menu
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
| `ClassicyPopUpMenu` | Drop-down selector. Props: `label`, `options` (array of `{ label, value }`), `value` | `<select>` / `<option>` |
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
| `ClassicyDesktopMenuWidgetSound` | Volume widget for the menu bar | — |

---

## Architecture
### Component Organization

* `<ClassicyDesktopProvider>`
    * `<ClassicyDesktop>`
        * `<ClassicyDesktopMenuBar>`
        * `<ClassicyDesktopIcon?>`
        * `<YourClassicyApp>`
            * `<ClassicyAppContext>`
                * `<ClassicyApp>`
                    * `<ClassicyWindow?>`
                        * `<ClassicyUIControls?>`
                        * `<OtherReactNodes?>`

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

### Default apps

`ClassicyDesktop` automatically mounts four built-in apps — `SimpleText`,
`PDFViewer`, `MoviePlayer`, and `PictureViewer` — the same way it always
mounts `Finder`. Each can be disabled individually via a prop on
`ClassicyAppManagerProvider`:

```tsx
<ClassicyAppManagerProvider
  disableSimpleText={false}    // default: false (loads)
  disablePDFViewer={false}     // default: false (loads)
  disableMoviePlayer={true}    // opt out of Movie Player
  disablePictureViewer={true}  // opt out of Picture Viewer
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
