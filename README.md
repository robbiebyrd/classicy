# [Classicy](https://classicy.ing)

##### Previously Platinum

A UI framework using native CSS/JS replications of the Mac OS 8 interface components.

[Just curious? Visit our website to learn more.](https://classicy.ing)

## Demo

### [See a demo here!](https://robbiebyrd.github.io/classicy/)

## Building and running on localhost

First install dependencies:

```sh
npm install
```

To create a production build:

```sh
npm run build
```

To create a development build:

```sh
npm run dev
```

## Running

To run the example site locally (builds the package, links it into the example, and starts the example dev server):

```sh
npm run preview
```

Then visit the site in your browser at http://localhost:3000.

(For iterative package development you can also use `npm run dev`, which builds the source and links the package locally.)

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
    - ℹ️ The ubiquitous Finder
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
    - ℹ️ Sound Manager Control Panel
        - ℹ️ Sound Event Handler
            - ✅ Event dispatcher/player
            - ℹ️ Automatic event intercept and play for known events (map audio sprites to events)
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
    - ⚠️ App Context/Event Handler
    - App Switcher
- Window
    - Controls
        - ✅ Zoom
        - ✅ Resize
        - ✅ Collapse
        - ✅ Close
        - Placard
        - ✅ Header
    - Dialog
        - Modal
            - Dialog
                - ✅ Movable
                - ✅ Non-movable
            - Alert
                - ✅ Movable
                - Non-movable
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
    - Slider
    - Spinner
    - ✅ Date Picker
    - ✅ Time Picker
    - ✅ Expandable (Disclosure)
    - ✅ Fieldset
    - ✅ Separator
    - ✅ Progress
    - ✅ Balloon Help (tooltip)
    - Menu
        - Contextual Menu
        - Submenu
    - Gallery Picker (Slider)
    - Color Picker

## Component Reference

All components are exported from the `classicy` package. Import them by name:

```tsx
import { ClassicyWindow, ClassicyButton, ClassicyBalloonHelp } from 'classicy';
```

### Application Shell

| Component | Description |
|-----------|-------------|
| `ClassicyDesktop` | Root desktop surface — icons, menu bar, wallpaper, drag-select |
| `ClassicyDesktopMenuBar` | Top menu bar with system menu, app menu, and widget tray |
| `ClassicyApp` | Application container. Props: `id`, `name`, `icon`, `defaultWindow` |
| `ClassicyWindow` | Window chrome with title bar and controls. Props: `id`, `appId`, `title`, `closable`, `zoomable`, `collapsable`, `resizable`, `modal`, `initialSize`, `initialPosition`, `minimumSize` |
| `ClassicyBoot` | Boot screen shown on first load |
| `ClassicyAboutWindow` | Standard "About This App" dialog. Props: `appId`, `appName`, `appIcon` |

### Inputs

| Component | Description |
|-----------|-------------|
| `ClassicyButton` | Push button. Accepts children as label |
| `ClassicyCheckbox` | Checkbox with optional label. Props: `checked`, `label`, `onChangeFunc` |
| `ClassicyRadioInput` | Radio button group. Props: `label`, `options` (array of `{ label, value }`) |
| `ClassicyInput` | Single-line text field. Props: `placeholder`, `value`, `onChangeFunc` |
| `ClassicySpinner` | Numeric stepper (up/down arrows). Props: `value`, `min`, `max`, `step` |
| `ClassicyPopUpMenu` | Drop-down selector. Props: `label`, `options` (array of `{ label, value }`), `value` |
| `ClassicyDatePicker` | Date input with calendar picker. Props: `value`, `placeholder`, `onChangeFunc` |
| `ClassicyTimePicker` | Time input with clock picker. Props: `value`, `placeholder`, `onChangeFunc` |

### Text Editing

| Component | Description |
|-----------|-------------|
| `ClassicyTextEditor` | Plain-text editor area. Props: `content`, `onChangeFunc` |
| `ClassicyRichTextEditor` | Rich-text editor (bold, italic, lists). Props: `content`, `onChangeFunc` |

### Layout & Structure

| Component | Description |
|-----------|-------------|
| `ClassicyTabs` | Tabbed container. Children must be `ClassicyTab` items with a `title` prop |
| `ClassicyDisclosure` | Collapsible section (expand/collapse). Props: `label`, `open` |
| `ClassicyControlGroup` | Labeled fieldset grouping form controls. Props: `label` |
| `ClassicyControlLabel` | Inline label for a control. Props: `label` |

### Menus

| Component | Description |
|-----------|-------------|
| `ClassicyMenu` | Drop-down menu used in the menu bar. Props: `id`, `title`, `menuChildren` |
| `ClassicyContextualMenu` | Right-click context menu. Renders at pointer position |

### Feedback & Display

| Component | Description |
|-----------|-------------|
| `ClassicyProgressBar` | Determinate progress bar. Props: `value`, `max`, `label` |
| `ClassicyBalloonHelp` | Mac OS 8-style speech-bubble tooltip. Wraps any element. Props: `content`, `title`, `position`, `delay` |
| `ClassicyIcon` | System icon image with optional label. Props: `src`, `label` |

### File System

| Component | Description |
|-----------|-------------|
| `ClassicyFileBrowser` | File browser with icon and list views. Props: `path`, `onSelect` |

### Media

| Component | Description |
|-----------|-------------|
| `QuickTimeMovieEmbed` | Embedded QuickTime-style video player. Props: `url` |

### Menu Bar Widgets

| Component | Description |
|-----------|-------------|
| `ClassicyDesktopMenuWidgetTime` | Clock widget for the menu bar |
| `ClassicyDesktopMenuWidgetSound` | Volume widget for the menu bar |

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
