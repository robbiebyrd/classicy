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
#777777 as #969696, #555555 as #777777 and #444444 as #666666; in the alert
boxes' red rings, the light red #FF9999 as #FFB3B3 (each channel as the
grays) and the dark red as #FF8787, which HIGOS8 Figures 3-6 and 3-8 print
#FF6666.

| File | Shows |
| --- | --- |
| `platinum-81-appmenu-notification.png` | A background Script Editor's notification (`display dialog` after `tell application "Finder" to activate`): the Application menu's ◆ beside Script Editor and ✓ beside the Finder (Charcoal 12's diamond and check) |
| `platinum-81-appmenu-notification-open.png` | The same menu open: the title shows the front application's (the Finder's) own icon |
| `platinum-81-blink-appmenu-open-sheet.png` | Twelve crops of the open Application menu, at six phases of the blink, twice each: the title always the Finder's icon |
| `platinum-81-blink-filemenu-open-sheet.png` | Twelve crops of the Application title with the Finder's File menu open, at six phases (rows), twice each (columns): the blink frozen on the frame it showed |
| `platinum-81-appmenu-order.png` | The Application menu after Scrapbook, Note Pad, Key Caps and Calculator were launched from the Apple menu, in that order, with the Finder and Stickies running from startup: Calculator, Finder, Key Caps, Note Pad, Scrapbook, Stickies, alphabetical as in 8.5, not in launch order (story 0231-8c6) |
| `platinum-81-finder-view-menu.png` | The Finder's View menu: the check in a text-only menu |
| `platinum-81-popup-font.png` | Finder Preferences' "Font for views" pop-up, open: the check in a pop-up menu |
| `platinum-81-finder-preferences.png` | Finder Preferences: "Simple Finder" empty (the box at 154,84) and "Spring-loaded folders" checked (154,128), the Appearance Manager's checkbox and check, each HIGOS8 Figure 2-8's box pixel for pixel |
| `platinum-81-finder-preferences-pressed-empty.png` | The same, the mouse held down on "Simple Finder"'s label (so the pointer is off the box): the pressed empty box, Figure 2-8's pixel for pixel (#999999 shows as #B3B3B3, #444444 as #666666) |
| `platinum-81-finder-preferences-pressed-checked.png` | The mouse held down on "Spring-loaded folders"' label: the pressed checked box, Figure 2-8's pixel for pixel, the check reaching past the box |
| `platinum-81-script-editor-syntax-error.png` | Script Editor's "Syntax Error" box (Apple Extras > AppleScript > Script Editor, a script that does not compile), a movable modal dialog box: its frame is two rings inside the black border, #DDDDDD (shown #E7E7E7) along the top and left and #555555 (shown #777777) along the bottom and right, then white and #999999 (shown #B3B3B3), the inner ring's two far corners #DDDDDD; the title bar white along its top and left, #999999 along its bottom and right (story 0236-2f8). No stock 8.1 application found shows a movable alert box (Figure 3-4's red frame): the Finder's alerts are fixed (Figure 3-5's), and this, the one other alert-like box looked at, is a dialog box |
| `platinum-81-finder-startup-disk-alert.png` | The Finder's fixed stop alert (select Macintosh HD, File > Put Away: "The startup disk cannot be removed from the desktop, because it contains the active system software."), the window's border box at x 133-506, y 87-190: no title bar; inside the black border a ring of #FF9999 (shown #FFB3B3) along the top and left, both far corners included, and #FF6666 (shown #FF8787) along the right and bottom; then white along the top and left and #999999 (shown #B3B3B3) along the right and bottom, that ring's two far corners #FF9999; the face #DDDDDD (shown #E7E7E7); the drop shadow from two pixels in. HIGOS8 p.62, Figure 3-5's frame, pixel for pixel; Platinum's fixed alert draws it (`src/styles/components/_Alert.scss`, `alertFrame.css.test.ts`; story 0236-2f8) |

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
| `platinum-85-startup-parade.png` | The last frame of the startup screen before the Finder's menu bar is drawn (the boot recorded every 100 ms, a frame kept whenever the parade's strip changed and the latest one before the bar): the progress bar full and the parade complete, twelve extension icons, none the Application Switcher's, so the switcher keeps out of Classicy's parade (story 0231-8c6) |
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

## `screenshots/higos8/`

Figures of the Mac OS 8 Human Interface Guidelines
(`Apple_HIGOS8_1997_Guidelines.pdf`, and its 1996 draft,
`Apple_HIGOS8_1996_Guidelines.pdf`) as the PDFs embed them: 1:1 screen
bitmaps, extracted with `pdfimages -png`. The 1997 PDF prints some figures in
the screen's own palette (Figures 3-6 and 3-8: the window's face #DDDDDD,
the colors Mac OS 8.1 draws) and others in a palette lifted from it, about
v^0.81 (Figures 3-4, 3-5 and 3-7: #DDDDDD printed #E3E4E4, #CCCCCC #D5D5D6,
#999999 #A9A9A9, #FF6666 #FC7D78); the draft prints its own lifted palette
(the face #E4E4E4). So a lifted figure gives the pixels' places, and a
screen figure their colors.

| File | Shows |
| --- | --- |
| `figure-3-4-movable-alert.png` | p.61, Figure 3-4, "A movable alert box" (a caution alert), in the lifted palette: 375 x 132, the window 374 x 131 with its drop shadow. Inside the black border, the title bar (rows 1-20) is beveled white along its top and left and light red (#FDABA9) along its bottom and right, its face (#FED6D5) at the two far corners; a black line (row 21); then two rings around the contents: light red along the top and left (both far corners included) and dark red (#FC7D78) along the right and bottom, then white along the top and left and gray (#A9A9A9) along the right and bottom, that ring's two far corners light red. Figure 3-7 (p.63) is the same image. Platinum's movable alert draws its frame pixel for pixel, in Figure 3-6's colors (`src/styles/components/_Alert.scss`, `alertFrame.css.test.ts`; story 0236-2f8) |
| `figure-3-5-alert.png` | p.62, Figure 3-5, "An alert box" (a fixed, non-movable alert), in the lifted palette: 375 x 111, the window 374 x 110. No title bar: right inside the black border, Figure 3-4's two rings around the contents, pixel for pixel ("a red border around the placard which forms the content region"), as Mac OS 8.1's Finder draws it (`../mac-os-8.1/platinum-81-finder-startup-disk-alert.png`). Platinum's fixed alert draws it (story 0236-2f8) |
| `figure-3-6-note-alert.png` | p.62, Figure 3-6, "A note alert box", a movable alert box in the screen's palette: 375 x 132, Figure 3-4's frame role for role, in the colors Mac OS 8.1 draws: the light red #FF9999, the dark red #FF6666, the inner ring's shadow #999999, the title bar's face #FFCCCC, its stripes six white rows (window rows 4, 6, ... 14, x 5 to the right border - 6) over six #FF6666 rows (5, 7, ... 15, x 6 to the right border - 5), and the window's face #DDDDDD. The reference for Platinum's alert frame and stripe colors (the error red mixed with white 60%, 40% and 80%, `--color-system-04` with black 10%; story 0236-2f8) |
| `figure-3-8-stop-alert.png` | p.64, Figure 3-8, "A stop alert box", in the screen's palette: 375 x 138, the window 374 x 137, Figure 3-6's frame and colors on a taller box |
| `draft-1996-figure-9-movable-alert.png` | The 1996 draft's p.13, Figure 9, "Movable alert box design": a stop alert, 378 x 136 (the window one pixel in from the image's edge). The same frame as Figure 3-4, pixel for pixel, in the draft's palette (#FFACAA, #FF7F7A, #FFD7D6) |
