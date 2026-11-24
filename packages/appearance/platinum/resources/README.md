# About this directory

Files in the "Resources" folder are additional sources that may be used as part of a build process, or added for optional use by other developers.

## `screenshots/mac-os-8.1/`

Mac OS 8.1 as Infinite Mac runs it (its "Mac OS 8.1" disk, 640 x 480),
captured from the emulator's own framebuffer with
`packages/appearance/system7/bin/capture-references.mjs serve` (story
0225-ci7). They are the references for Platinum's menu marks and checkbox
check (`src/styles/_marks.scss`) and for the Notification Manager's menu
bar (`docs/AGENT-REFERENCE.md` §4.11). The emulator shows #DDDDDD as
#E7E7E7, #888888 as #A5A5A5, #AAAAAA as #C0C0C0, #999999 as #B3B3B3,
#777777 as #969696, #555555 as #777777 and #444444 as #666666.

| File | Shows |
| --- | --- |
| `platinum-81-appmenu-notification.png` | A background Script Editor's notification (`display dialog` after `tell application "Finder" to activate`): the Application menu's ◆ beside Script Editor and ✓ beside the Finder (Charcoal 12's diamond and check) |
| `platinum-81-appmenu-notification-open.png` | The same menu open: the title shows the front application's (the Finder's) own icon |
| `platinum-81-blink-appmenu-open-sheet.png` | Twelve crops of the open Application menu, at six phases of the blink, twice each: the title always the Finder's icon |
| `platinum-81-blink-filemenu-open-sheet.png` | Twelve crops of the Application title with the Finder's File menu open, at six phases (rows), twice each (columns): the blink frozen on the frame it showed |
| `platinum-81-finder-view-menu.png` | The Finder's View menu: the check in a text-only menu |
| `platinum-81-popup-font.png` | Finder Preferences' "Font for views" pop-up, open: the check in a pop-up menu |
| `platinum-81-finder-preferences.png` | Finder Preferences: "Simple Finder" empty (the box at 154,84) and "Spring-loaded folders" checked (154,128), the Appearance Manager's checkbox and check, each HIGOS8 Figure 2-8's box pixel for pixel |
| `platinum-81-finder-preferences-pressed-empty.png` | The same, the mouse held down on "Simple Finder"'s label (so the pointer is off the box): the pressed empty box, Figure 2-8's pixel for pixel (#999999 shows as #B3B3B3, #444444 as #666666) |
| `platinum-81-finder-preferences-pressed-checked.png` | The mouse held down on "Spring-loaded folders"' label: the pressed checked box, Figure 2-8's pixel for pixel, the check reaching past the box |

## `screenshots/mac-os-8.5/`

Mac OS 8.5 as Infinite Mac runs it (its "Mac OS 8.5" disk on the Power
Macintosh 9500, 640 x 480), captured from the emulator's framebuffer with a
copy of `packages/appearance/system7/bin/capture-references.mjs serve` whose
embed URL names that machine (story 0231-8c6). This emulator shows #DDDDDD
as #DDDDDD. They are the references for the Application Switcher
(`docs/AGENT-REFERENCE.md` §4.12).

| File | Shows |
| --- | --- |
| `platinum-85-appmenu-order.png` | The Application menu with Calculator, Finder, Note Pad and Stickies open: alphabetical |
| `platinum-85-tearoff-outline.png`, `…-outline-2.png` | Dragging past the menu's bottom: a dotted outline of the menu, centered on the pointer, its bottom at the pointer, the menu still drawn |
| `platinum-85-tearoff-palette.png` | Let go: the palette where the outline was |
| `platinum-85-switcher-palette.png` | The palette: a utility window titled "Applications", close box, zoom and collapse boxes, a bevel button per application with its small icon and name, the front application's held down |
| `platinum-85-switcher-click.png` | A click on Stickies: Stickies in front, its button held down |
| `platinum-85-switcher-no-names.png` | Zoom box: names hidden, no title and no collapse box |
| `platinum-85-switcher-large-icons.png` | Option-click on the zoom box: large icons |
| `platinum-85-switcher-horizontal.png` | Option-Shift-click on the zoom box: buttons across, the drag bar down the left side |
| `platinum-85-switcher-hidden-app.png`, `platinum-85-appmenu-hidden-app.png` | Stickies hidden (Option-click on Finder's button): its icon dimmed in the palette and in the menu |
| `platinum-85-command-tab.png` | Command-Tab with Stickies hidden: Stickies in front and shown at once, Command still held, no overlay |
| `platinum-85-switcher-notification.png` | A background Script Editor's notification: the menu's ◆, and no mark in the palette |
| `platinum-85-switcher-collapsed.png` | The collapse box: the palette collapsed to its title bar |
| `platinum-85-tearoff-reopened.png` | Torn off again after its close box: the options kept |
| `platinum-85-appmenu-modal.png` | A modal dialog up in Script Editor (`display dialog`): the Application menu's title dimmed, and a press on it opens nothing to tear off |
| `platinum-85-command-tab-modal.png` | The same dialog: Command-Tab switches nothing |
| `platinum-85-switcher-modal.png` | The same dialog with the palette torn off: the palette drawn above the dialog, every button dimmed, and a click on Finder's switches nothing |
| `platinum-85-help-switcher.png`, `platinum-85-help-switching.png` | Mac OS Help, "Switching between open programs": the zoom box's options, Command-Tab and Command-Shift-Tab, "You can use AppleScript scripts to change the keyboard shortcuts" |
| `platinum-85-help-shortcut-on.png`, `…-modifier.png`, `…-key.png` | Its "Help me modify the keyboard shortcuts" script: use a shortcut at all, then the modifier (Command, Control or Option), then any single key; the palette drawn over the script's dialog |
