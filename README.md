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
    - Menu
        - Contextual Menu
        - Submenu
    - Gallery Picker (Slider)
    - Color Picker

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
