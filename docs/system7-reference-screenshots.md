# System 7.5 reference screenshots

Reference captures of real System 7.5 and 7.5.5 for the System 7 Appearance
Package (plan 0018-dbd, section 3.1; story 0212-rce). They settle what the
HIG figures do not show, chiefly the 1-bit look and the pressed states. The
images are not committed: they live in the gitignored folder
`.playwright-mcp/parity/system7/reference/`, and this index says what each one
shows and how to make them again. The 7.5.5 set (every file with `755` in its
name) is made by a script, `packages/appearance/system7/bin/capture-references.mjs`
("How to reproduce", below).

## Source and method

- **Emulator:** Infinite Mac (https://infinitemac.org), embed mode, disk
  "System 7.5" (7.5, 1994) on its default machine, a Quadra 650 under
  Basilisk II, 640x480, RAM at the disk's default. URL:
  `https://infinitemac.org/embed?disk=System+7.5&machine=Quadra+650&infinite_hd=false&saved_hd=true&screen_update_messages=true&screen_update_interval=100&screenSize=640x480`
- **Pixels:** every file is the emulator's own framebuffer, not a browser
  screenshot. With `screen_update_messages=true` the embed posts
  `emulator_screen` messages (`{data, width, height}`, RGBA) to its parent; at
  top level the parent is the page itself, so a listener keeps the latest
  frame and writes it out through an `OffscreenCanvas` as PNG. So every file
  is 640x480 at 1x, with no browser scaling, smoothing or color management.
- **Depths:** the Monitors control panel (v7.5) set to "256" colors for the
  `color-` files and to "Black & White" for the `bw-` files. The 1-bit files
  hold only `#000000` and `#FFFFFF`. The panel also offers 4, 16 and
  Thousands; those depths were not captured.
- **Input:** Playwright (`playwright` 1.57 from the repo, headless Chromium
  1200, viewport 700x620, device scale factor 1) moves and presses the real
  mouse over the emulator canvas. The canvas sits at an offset in the page,
  so each coordinate is translated by the canvas's bounding rectangle. Menus
  in System 7 stay open only while the button is down, so menus and pressed
  states were shot with the button held (`mouse.down()`, shoot, then move off
  the control and release, so nothing fires).
- **Pointer:** the pointer is part of the framebuffer. It was parked in the
  bottom-right corner for still captures. In pressed-state captures it sits
  on the control; presses were made at a control's bottom-right pixel so the
  arrow, which extends down and right, covers as little as possible.
- **Crop:** none. Every file is the full 640x480 frame. The "Region" column
  gives the element's approximate bounding box in that frame (`x,y,w,h`), to
  crop with `convert <file> -crop WxH+X+Y +repage`.

## Index

"Region" is where the element lies in the 640 x 480 frame, as `x,y,w,h`
(the box to crop: `convert <file> -crop WxH+X+Y +repage`); the values are
approximate (to a few pixels), so measure from the file before pinning a
value. "Q" names the open question a capture answers: **MWD n** is
question n in the Open questions of
`docs/superpowers/specs/2026-11-11-system7-hig-menus-windows-dialogs.md`;
**CIC "…"** names a bullet in the Open questions of
`docs/superpowers/specs/2026-11-11-system7-hig-controls-icons-color.md`;
**HIG p.n** a page of the System 7 HIG whose figure the capture backs. A —
means the capture answers no open question: it is the reference for the
look its Element names.

### Desktop and menus

| File | Element | Depth | Source | Region | Q |
| --- | --- | --- | --- | --- | --- |
| `color-desktop-menubar-icons.png` | Menu bar, desktop pattern, desktop icons (Saved HD selected) | color | Finder | full frame; menu bar 0,0,640,20; icons 556,44,84,184 | MWD 11; CIC "default desktop pattern" |
| `bw-desktop-menubar-icons.png` | Same, unselected icons | 1-bit | Finder | same | MWD 11; CIC "default 1-bit desktop pattern" |
| `color-desktop-icon-selected-opened.png` | Macintosh HD icon selected and opened (dark fill) | color | Finder | 556,44,84,30 | CIC "opened-icon pattern" |
| `bw-desktop-icon-selected-opened.png` | Same | 1-bit | Finder | 556,44,84,30 | CIC "opened-icon pattern in B&W" |
| `color-menu-pulldown-edit.png` | Edit menu: dimmed items, separators, Command-key column | color | Finder | 69,19,128,146 | MWD 8 (pull-down shadow) |
| `bw-menu-pulldown-edit.png` | Same | 1-bit | Finder | 69,19,128,146 | MWD 8 |
| `color-menu-pulldown-edit-highlight.png` | Edit menu with Select All highlighted | color | Finder | 69,19,128,146 | — |
| `bw-menu-pulldown-edit-highlight.png` | Same | 1-bit | Finder | 69,19,128,146 | — |
| `bw-menu-pulldown-edit-cdev.png` | Edit menu while a control panel is frontmost (all enabled but Select All) | 1-bit | Monitors | 69,19,128,146 | — |
| `color-menu-pulldown-file.png` | File menu, nothing selected (dimmed and enabled items, three separators) | color | Finder | 33,19,142,258 | — |
| `bw-menu-pulldown-file.png` | Same | 1-bit | Finder | 33,19,142,258 | — |
| `bw-menu-pulldown-file-cdev.png` | File menu with a control panel frontmost | 1-bit | Monitors | 33,19,142,258 | — |
| `color-menu-pulldown-view.png` | View menu with the title and every item dimmed | color | Finder | 107,19,113,114 | — |
| `color-menu-pulldown-label.png` | Label menu: checkmark, color swatches | color | Finder | 152,19,126,147 | — |
| `bw-menu-pulldown-label.png` | Label menu, all items dimmed (nothing selected) | 1-bit | Finder | 152,19,101,111 | — |
| `bw-menu-pulldown-label-alldimmed.png` | Label menu and title dimmed (control panel frontmost) | 1-bit | Monitors | 152,19,101,111 | — |
| `color-menu-pulldown-special.png` | Special menu (dimmed Empty Trash, Eject Disk) | color | Finder | 201,19,139,131 | — |
| `bw-menu-pulldown-special.png` | Same | 1-bit | Finder | 201,19,139,131 | — |
| `color-menu-pulldown-checkmark-outline-sizes.png` | Size menu: checkmark, outlined sizes | color | SimpleText | 149,19,88,128 | — |
| `color-menu-simpletext-file.png` | SimpleText File menu over an active document | color | SimpleText | 33,19,124,196 | — |
| `bw-menu-simpletext-file.png` | Same | 1-bit | SimpleText | 33,19,124,196 | — |
| `color-menu-hierarchical-controlpanels.png` | Apple menu with Control Panels submenu open; submenu scroll arrow at the bottom | color | Apple menu | Apple menu 0,19,193,285; submenu 198,35,202,431 | MWD 8 (submenu shadow) |
| `bw-menu-hierarchical-controlpanels.png` | Same | 1-bit | Apple menu | same | MWD 8 |
| `color-menu-help-and-selected-icon.png` | Help (Apple Guide) menu; selected Sound icon in a window | color | Finder | menu 447,19,159,98; icon 280,124,32,40 | — |
| `bw-menu-help-and-selected-icon.png` | Same | 1-bit | Finder | same | — |

### Windows and scroll bars

| File | Element | Depth | Source | Region | Q |
| --- | --- | --- | --- | --- | --- |
| `color-finder-window-fits-active.png` | Active document window, both scroll bars in the "fits" state (no box, plain track) | color | Finder, Macintosh HD | 48,81,381,217 | MWD 4, 9; CIC "inactive scroll bars" |
| `bw-finder-window-fits-active.png` | Same | 1-bit | Finder | 48,81,381,217 | MWD 1; CIC "B&W scroll bar, window frame and title bar" |
| `color-finder-window-fits-iconview-over-inactive.png` | Active System Folder window over the inactive Macintosh HD window | color | Finder | 8,28,359,264 | MWD 1, 4 |
| `bw-finder-window-fits-iconview-over-inactive.png` | Same | 1-bit | Finder | 8,28,359,264 | MWD 1 |
| `color-finder-list-scrollable-active.png` | List view: disclosure triangles, active scroll bars with boxes (vertical and horizontal) | color | Finder, System Folder | window 8,28,359,264; v-bar 350,64,16,212 | MWD 5; CIC "outline triangle" |
| `color-finder-list-scrollable-active-2.png` | Same, scrolled | color | Finder | same | MWD 5 |
| `bw-finder-list-scrollable-active.png` | Same | 1-bit | Finder | same | MWD 5; CIC "B&W scroll bar" (track pattern, box, arrows) |
| `bw-finder-list-scrollable-active-2.png` | Same, scrolled | 1-bit | Finder | same | same |
| `color-finder-list-scrollable-inactive.png` | Inactive list window (Finder hides its scroll bars) under the active Macintosh HD window | color | Finder | 8,28,359,264 | MWD 1; CIC "inactive scroll bars" |
| `bw-finder-list-scrollable-inactive.png` | Same | 1-bit | Finder | same | MWD 1 |
| `color-two-inactive-windows-desktop-active.png` | Two inactive windows, desktop active | color | Finder | 8,28,421,270 | MWD 1, 4 |
| `bw-two-inactive-windows-desktop-active.png` | Same | 1-bit | Finder | same | MWD 1 |
| `color-finder-iconview-scrollable-both.png` | Icon view with both scroll bars active and scrollable | color | Finder, Control Panels | 8,28,406,208 | MWD 5 |
| `bw-finder-iconview-scrollable-both.png` | Same | 1-bit | Finder | same | same |
| `color-simpletext-document-active.png` | Full-size text document, vertical scroll bar, size box with no horizontal bar | color | SimpleText, "System 7.5 --Read Me" | 2,21,576,443 | MWD 7 (partly), 9 |
| `bw-simpletext-document-active.png` | Same | 1-bit | SimpleText | same | same |
| `color-scrapbook-active.png` | Active no-grow window with a horizontal scroll bar (box at the right end) and size box | color | Scrapbook | 18,42,392,306 | MWD 5 |
| `color-scrapbook-inactive.png` | Same window inactive: Scrapbook dims its scroll bar (hollow arrows, white track) instead of hiding it | color | Scrapbook | same | CIC "inactive scroll bars" |
| `color-scrapbook-closebox-pressed.png` | Close box pressed | color | Scrapbook | box 26,46,11,11 | MWD 2 |
| `color-scrapbook-zoombox-pressed.png` | Zoom box pressed | color | Scrapbook | box 389,46,11,11 | MWD 2 |
| `bw-closebox-pressed.png` | Close box pressed | 1-bit | Finder, Macintosh HD | box 56,86,11,11 | MWD 2 |
| `bw-zoombox-pressed.png` | Zoom box pressed | 1-bit | Finder, Macintosh HD | box 408,86,11,11 | MWD 2 |
| `bw-controlpanel-closebox-pressed.png` | Close box pressed on a control panel window | 1-bit | Monitors | box 109,46,11,11 | MWD 2 |
| `color-scrollarrow-up-pressed.png` | Up scroll arrow pressed | color | Finder list | 350,64,16,16 | CIC "B&W scroll bar" (arrow glyphs) |
| `color-scrollarrow-down-pressed.png` | Down scroll arrow pressed | color | Finder list | 350,259,16,16 | same |
| `bw-scrollarrow-up-pressed.png` | Up scroll arrow pressed | 1-bit | Finder list | 350,64,16,16 | same |
| `bw-scrollarrow-down-pressed.png` | Down scroll arrow pressed | 1-bit | Finder list | 350,259,16,16 | same |
| `color-scrollbox-dragging.png` | Scroll box dragged: dotted outline follows the pointer | color | Finder list | 350,64,16,212 | — |
| `bw-scrollbox-dragging.png` | Same | 1-bit | Finder list | same | — |
| `color-floating-appleguide.png` | Floating window (Apple Guide): small close box, dotted drag area, no title; the document window behind stays active | color | Macintosh Guide | 93,94,455,297; title bar 93,94,455,14 | MWD 6 |
| `bw-floating-appleguide.png` | Same | 1-bit | Macintosh Guide | same | MWD 6 |
| `color-floating-closebox-pressed.png` | Floating window close box pressed | color | Macintosh Guide | box 96,96,9,9 | MWD 2, 6 |
| `bw-floating-closebox-pressed.png` | Same | 1-bit | Macintosh Guide | box 96,96,9,9 | MWD 2, 6 |

### Dialogs and alerts

| File | Element | Depth | Source | Region | Q |
| --- | --- | --- | --- | --- | --- |
| `color-dialog-standardfile-open.png` | Fixed modal dialog (Standard File Open): pop-up menu closed, scrolling list, default button ring, dimmed buttons, checkbox, divider | color | SimpleText, File > Open… | 90,104,461,196 | CIC "dimmed button frame" |
| `bw-dialog-standardfile-open.png` | Same | 1-bit | SimpleText | same | CIC "dimmed button frame" |
| `color-dialog-standardfile-save.png` | Fixed modal dialog (Save): text field with selected text, radio buttons, dimmed list items | color | SimpleText, File > Save | 140,60,360,254 | — |
| `bw-dialog-standardfile-save.png` | Same | 1-bit | SimpleText | same | — |
| `color-dialog-movablemodal-copy-progress.png` | Movable modal dialog (Finder Copy): title bar, no close box, progress bar | color | Finder, Duplicate of System Folder | 172,72,296,106 | — |
| `color-dialog-movablemodal-copy-progress-2.png` | Same, later in the copy | color | Finder | same | — |
| `bw-dialog-movablemodal-copy-progress.png` | Same | 1-bit | Finder, Duplicate of 42 control panels | 172,72,296,106 | — |
| `bw-dialog-movablemodal-copy-progress-2.png` | Same, later | 1-bit | Finder | same | — |
| `color-alert-caution-savechanges.png` | Caution alert, three buttons, default ring | color | SimpleText, close with unsaved changes | 135,85,370,133 | — |
| `bw-alert-caution-savechanges.png` | Same | 1-bit | SimpleText | same | — |
| `color-alert-stop-pagesetup.png` | Stop alert, one default button | color | SimpleText, Page Setup… with no printer | 118,88,404,120 | — |
| `bw-alert-stop-pagesetup.png` | Same | 1-bit | SimpleText | same | — |
| `color-dialog-modeless-findfile.png` | Modeless dialog (Find File 7.5): close box, striped title, no size or zoom box, pop-up menus, edit field, default button | color | Find File (Apple menu > Find File) | 88,85,463,134 | HIG p.178–181 (figs 6-2 to 6-5) |
| `bw-dialog-modeless-findfile.png` | Same, over an inactive Finder window | 1-bit | Find File | same | HIG p.178–181 |
| `color-alert-findfile-noitems.png` | Alert with the application's own icon instead of note/caution/stop (Find File "No items were found."), over the dimmed modeless dialog | color | Find File, search for "zzqqx" | 150,86,338,148 | — (no stock note alert, see Not captured) |
| `bw-alert-findfile-noitems.png` | Same | 1-bit | Find File | same | — |
| `color-alert-stop-sharing.png` | Stop alert, one button (Sharing… with File Sharing not installed) | color | Finder, File > Sharing… on System Folder | 128,86,384,130 | — |
| `color-alert-caution-emptytrash.png` | Caution alert, Cancel and OK (Empty Trash); full Trash icon on the desktop | color | Finder, Special > Empty Trash… | 128,86,384,118 | — |
| `color-alert-caution-appletalk.png` | Caution alert, one button (over the Chooser) | color | Chooser, AppleTalk "Active on restart" | 143,113,354,174 | — |
| `color-alert-caution-printerchanged.png` | Caution alert, one button ("You have changed your current printer…") | color | Chooser, close after choosing StyleWriter II | 143,113,354,174 | — |
| `color-chooser-dimmed-default-button.png` | Dimmed default button (OK keeps its ring), icon list with selection | color | Chooser, AppleShare | 88,58,464,312 | CIC "dimmed button frame" |

### Controls

| File | Element | Depth | Source | Region | Q |
| --- | --- | --- | --- | --- | --- |
| `color-button-pressed-cancel.png` | Push button pressed (inverted) | color | Standard File Open | 450,216,82,20 | CIC "pressed buttons" (MWD 3) |
| `bw-button-pressed-cancel.png` | Same | 1-bit | Standard File Open | same | MWD 3 |
| `color-button-pressed-default.png` | Default button pressed, ring kept | color | Standard File Open | 447,246,88,26 | MWD 3 |
| `bw-button-pressed-default.png` | Same | 1-bit | Standard File Open | same | MWD 3 |
| `bw-button-pressed-dontsave-in-alert.png` | Push button pressed in an alert | 1-bit | SimpleText caution alert | 212,180,88,20 | MWD 3 |
| `color-button-pressed-stop-in-movablemodal.png` | Stop button pressed in the Copy dialog | color | Finder Copy | 420,150,60,20 | MWD 3 |
| `color-checkbox-pressed.png` | Checked checkbox, pressed (2 px outline) | color | Standard File Open | 216,278,12,12 | CIC "checkbox and radio pressed state" |
| `bw-checkbox-pressed.png` | Same | 1-bit | Standard File Open | same | same |
| `color-radio-pressed.png` | Unselected radio pressed (2 px ring), beside a selected radio | color | Save dialog | 384,275,66,12 | same |
| `bw-radio-pressed.png` | Same | 1-bit | Save dialog | same | same |
| `color-textfield-caret.png` | Text field with insertion point | color | Save dialog | 160,276,200,22 | — |
| `bw-textfield-caret.png` | Same | 1-bit | Save dialog | same | — |
| `color-popup-open.png` | Pop-up menu open over its button (pointer off the menu) | color | Standard File Open | 258,119,134,56 | MWD 8 (pop-up shadow) |
| `color-popup-open-highlight.png` | Same, current item highlighted | color | Standard File Open | same | MWD 8 |
| `bw-popup-open.png` | Same | 1-bit | Standard File Open | same | MWD 8 |
| `bw-popup-open-highlight.png` | Same, highlighted | 1-bit | Standard File Open | same | MWD 8 |
| `color-popup-open-views-font.png` | Pop-up menu open with checkmark, placed so the current item covers the button | color | Views control panel | 252,36,155,150 | MWD 8 |
| `bw-popup-open-views-font.png` | Same | 1-bit | Views | same | MWD 8 |
| `color-controlpanel-views.png` | Pop-up buttons (closed), group boxes, checkboxes, radio buttons | color | Views control panel | 152,36,337,258 | — |
| `bw-controlpanel-views.png` | Same | 1-bit | Views | same | — |
| `color-controlpanel-sound-slider.png` | Vertical slider (volume) with ticks, pop-up, list with "fits" scroll bar | color | Sound control panel | 100,43,330,250 | — |
| `bw-controlpanel-sound-slider.png` | Same | 1-bit | Sound | same | — |
| `color-controlpanel-datetime.png` | Edit-text fields, push buttons, radio buttons, checkbox | color | Date & Time control panel | 100,42,372,262 | — |
| `bw-controlpanel-datetime.png` | Same | 1-bit | Date & Time | same | — |
| `color-littlearrows.png` | Little arrows beside the selected hour field | color | Date & Time | 428,100,14,24 | — |
| `bw-littlearrows.png` | Same | 1-bit | Date & Time | same | — |
| `color-littlearrows-up-pressed.png` | Little arrows, up half pressed | color | Date & Time | same | — |
| `bw-littlearrows-up-pressed.png` | Same | 1-bit | Date & Time | same | — |
| `color-disclosure-pressed.png` | Disclosure triangle pressed | color | Finder list | 12,85,11,11 | CIC "outline triangle" |
| `bw-disclosure-pressed.png` | Same | 1-bit | Finder list | same | CIC "outline-triangle fill in B&W" |
| `color-disclosure-expanded.png` | Disclosure triangle expanded, nested rows | color | Finder list | 10,84,14,13 | same |
| `bw-disclosure-expanded.png` | Same | 1-bit | Finder list | same | same; see the note below the table |
| `color-controlpanel-color-standard.png` | Color control panel: Highlight color "Black & White", Window color "Standard" (the setting every color capture was shot with) | color | Color control panel | 100,42,292,128 | MWD 4, 12; CIC "highlight color" |
| `color-popup-open-window-color.png` | Window color pop-up open: Standard, Gold, Green, Turquoise, Red, Pink, Blue, Gray, Black & White, each with its swatch | color | Color control panel | 227,132,146,146 | MWD 12 |
| `color-controlpanel-monitors-256.png` | Monitors: depth list (scrollable), radio buttons, buttons | color | Monitors | 100,42,234,280 | CIC "4-bit color variant" |
| `color-controlpanel-monitors-opened-icon.png` | Same, with the opened Monitors icon in the Finder window behind | color | Monitors | same | CIC "opened-icon pattern" |
| `bw-controlpanel-monitors-bw.png` | Monitors after switching to Black & White | 1-bit | Monitors | same | — |

Disclosure triangles: the color triangle's checker fill is `#9999FF` in these
captures, which no palette slot holds (theme-03 is the Standard wctb's tinge,
`#9999CC`). The package draws it in its own color `outlineTriangle.checker`
(`--package-color-outline-triangle-checker`, `#9999FF` in color, white in
1-bit; plan 0018-dbd Batch F-b), so against the disclosure captures a
triangle is AE 0 at both depths (`_Triangle.scss`).

### System 7.5.5 (story 0212-rce)

Made by `packages/appearance/system7/bin/capture-references.mjs run` on
Infinite Mac's "System 7.5.5" disk (the release the package's assets were
exported from; its Control Strip runs on the Quadra 650, where 7.5's
refuses to), each scene at 256 colors (`color-755-*`) and Black & White
(`bw-755-*`), the depths switched from the Control Strip's Monitor module.
Every file is the full 640 x 480 frame.

| File | Element | Depth | Source | Region | Q |
| --- | --- | --- | --- | --- | --- |
| `*-755-appmenu-closed.png` | Application (App Switcher) menu title, closed: the front application's small icon alone | both | Finder | title 600,0,34,19 | — (App Switcher title) |
| `*-755-appmenu-open.png` | Same, open: Hide Finder, Hide Others, Show All (dimmed), a separator, each open application with its small icon, the current one checked | both | Finder | title 600,0,34,19; menu 532,19,108,85 | — (App Switcher title) |
| `*-755-controlstrip.png` | Control Strip at rest: collapse box, scroll arrows (left dimmed), Monitor depth, resolution and Sound modules, tab | both | Control Strip 1.3.1 | 0,456,160,24 | — (Control Strip) |
| `*-755-controlstrip-module-pressed.png` | Sound module pressed, its menu held open (pointer moved off) | both | Control Strip | cell 91,457,31,22; menu 92,333,44,124 | — (pressed strip cell, inferred before) |
| `*-755-controlstrip-collapse-pressed.png` | Collapse box pressed (pointer on its lower right corner) | both | Control Strip | 1,457,13,22 | — (pressed strip cell) |
| `*-755-icon-opened-unselected.png` | Macintosh HD opened and deselected (its window open, inactive, behind) | both | Finder | icon 584,36,32,32; window 191,172,251,159 | CIC "opened-icon pattern" (unselected, inferred before) |
| `*-755-menu-pulldown-view-checkmark.png` | View menu, a checkmark against "by Icon" | both | Finder | 107,19,115,114 | — (1-bit checkmark menu) |
| `*-755-finder-list-row-selected.png` | List view, Apple Extras selected: icon darkened (inverted in 1-bit), name inverted | both | Finder, Macintosh HD by Name | row 196,246,130,18 | — (Finder list selected row, inferred before) |
| `*-755-finder-closebox-pressed.png` | Close box pressed | both | Finder | 199,175,11,11 | MWD 2 (color Finder box) |
| `*-755-finder-zoombox-pressed.png` | Zoom box pressed | both | Finder | 422,175,11,11 | MWD 2 |
| `*-755-scrollbox-drag-24-below.png` | Horizontal scroll box dragged, pointer 24 px below the bar (y 354): the outline follows | both | Finder list | bar 191,315,236,16 | — (snap-back distance) |
| `*-755-scrollbox-drag-25-below.png` | Pointer 25 px below (y 355): the outline is back over the box | both | Finder list | same | — (snap-back distance) |
| `*-755-scrollbox-drag-24-above.png` | Pointer 24 px above the bar (y 291): follows | both | Finder list | same | — (snap-back distance) |
| `*-755-scrollbox-drag-25-above.png` | Pointer 25 px above (y 290): back over the box | both | Finder list | same | — (snap-back distance) |
| `*-755-dialog-clockoptions.png` | Clock Options: dimmed checkboxes, dimmed pop-ups and button, group boxes, default ring | both | Date & Time > Clock Options… | 64,46,513,311 | — (dimmed controls) |
| `*-755-controlpanel-memory.png` | Memory: a dimmed pop-up and a dimmed horizontal slider | both | Memory | 100,42,355,356 | — (dimmed pop-up and slider) |
| `*-755-slider-dragging.png` | The Memory panel's RAM Disk slider dragged (RAM Disk on) | both | Memory | 262,300,150,20 | — (slider mid-drag) |
| `*-755-alert-note-energysaver.png` | Note alert (the "talking face" icon), one default button | both | Energy Saver on a Quadra 650 | 128,90,385,116 | HIG p.194 (note alert) |
| `*-755-alert-stop-erasedisk.png` | Stop alert: the startup disk cannot be erased | both | Finder, Special > Erase Disk… on Macintosh HD | 128,86,385,120 | — |
| `*-755-stickies-notes.png` | Stickies' notes: size boxes on windows with no scroll bars | both | Stickies | full frame | MWD 7 |
| `*-755-menu-blink-1.png` … `-8.png` | Eight consecutive frames after choosing Clean Up Desktop (three blinks, General Controls' default) | both | Finder, Special menu | 225,0,95,90 | MWD 10 |
| `*-755-scrapbook-active.png` | Scrapbook, active | both | Scrapbook | 18,42,392,306 | MWD 5 (1-bit Scrapbook) |
| `*-755-scrapbook-closebox-pressed.png` | Its close box pressed | both | Scrapbook | box 26,47,11,11 | MWD 2 |
| `*-755-scrapbook-zoombox-pressed.png` | Its zoom box pressed | both | Scrapbook | box 389,47,11,11 | MWD 2 |
| `*-755-scrapbook-inactive.png` | Scrapbook inactive: its scroll bar dimmed | both | Scrapbook | 18,42,392,306 | CIC "inactive scroll bars" |
| `*-755-menu-pulldown-label-alldimmed.png` | Label menu with its title and items dimmed (General Controls in front) | both | General Controls | 157,0,100,130 | — (color dimmed Label menu) |
| `*-755-getinfo-locked-running-app.png` | Get Info on SimpleText, locked, while it runs: the Locked box checked and enabled, the Comments box dotted (locked), the memory sizes read-only | both | Finder, Apple Extras > SimpleText | 8,27,243,313 | — (dimmed checked checkbox: not dimmed here) |
| `*-755-getinfo-locked-in-trash.png` | Get Info on CPU Energy Saver, locked, in the Trash: the Locked box checked and enabled | both | Finder, Trash | 648,27,243,281 | — (dimmed checked checkbox: not dimmed here) |
| `*-755-dialog-standardfile-layout.png` | Standard File Open box: the folder pop-up over the list, the disk's name and icon at the top right, the button column Eject (dimmed), Desktop, a line, Cancel, Open (default ring); QuickTime's Show Preview checkbox and dimmed Create button | both | SimpleText > Open… | dialog 88,88,465,200 | — (Standard File layout) |
| `color-755-window-tint-<tint>.png` | An active document window and the Color control panel in each Window color: `gold`, `green`, `turquoise`, `red`, `pink`, `blue`, `gray`, `black-and-white` | color | Color control panel | window 191,172,251,159 | MWD 12 |
| `755-depth-<depth>.png` | An active Finder window at `4-grays`, `4-colors`, `16-grays`, `16-colors`, `256-grays`, `256-colors` and `thousands` (switched from Black & White; the palette of a return to 256 colors differs from a fresh boot's) | each | Finder | window 191,172,251,159 | CIC "4-bit color variant" |
| `755-simple-beep-recording.wav` | Simple Beep as the Sound Manager plays it, recorded from the page's audio (22,050 Hz, 16-bit, each 8-bit sample doubled) | — | SimpleSound | — | — (Simple Beep's waveform) |

## What the captures settle

Measured from the framebuffer files (exact pixels).

- **MWD 1, inactive windows in 1-bit:** the frame stays solid black (1 px),
  the title bar is white with no stripes and no boxes, and the title text is
  solid black, not dithered. The Finder hides an inactive window's scroll
  bars (blank area, no arrows). In color the inactive frame is `#555555`,
  the title bar white and the title text gray.
- **MWD 2, pressed close and zoom boxes:** both depths draw a "starburst"
  (eight short rays from the center) inside the box; in color the box fill
  turns dark. The floating window's small close box draws a smaller
  starburst.
- **MWD 4, color values, measured with the Color control panel's Window
  color set to "Standard"** (with Highlight color "Black & White", the
  7.5 defaults, `color-controlpanel-color-standard.png`). At 256 colors the
  7.5 Standard window colors are: title bar `#EEEEEE` with stripes `#777777`
  (six stripes on every other row), top highlight `#CCCCFF`, bottom shade
  `#9999CC`, box frame `#333366`, inner shade `#666699`; scroll track
  `#DDDDDD`; dimmed menu text `#888888`; desktop `#666666`/`#AAAAAA`
  checkerboard. The Standard tinge is this lavender-gray ramp, not a neutral
  gray (Gray is a separate choice in the pop-up).
- **MWD 12, window tints:** the Color control panel offers Standard, Gold,
  Green, Turquoise, Red, Pink, Blue, Gray and Black & White
  (`color-popup-open-window-color.png`); only Standard was captured.
- **CIC "highlight color":** the 7.5 default Highlight color is "Black &
  White" (black selection, white text).
- **MWD 5, scroll box:** the 7.5 color box has horizontal grip ridges. The
  1-bit box is a plain white box with a black frame, no ridges.
- **MWD 6, utility (floating) window:** the close box is 9x9 px including its
  frame (the document window's is 11x11); the drag area is three rows of
  single dots, one pixel in every 3x3 (rows 4, 7 and 10 counting the frame
  line as row 0), `#333333` on `#EEEEEE` in color and black on white in
  1-bit, not stripes. The bar has 13 rows between the frame line and the line
  under it (15 with both).
- **MWD 8, menu shadows:** pull-downs and hierarchical submenus are alike: the
  shadow column (right) starts 3 rows below the menu's top border and the
  shadow row (bottom) starts 3 px right of its left border. A window's shadow
  starts 1 row below its top. Pop-up menus are in the captures too but were
  not measured.
- **MWD 11, menu-bar corners:** the rounded screen corners are a 5 px radius
  (black runs of 5, 3, 2, 1, 1 px on the top five rows).
- **CIC "dimmed button frame":** in 1-bit the dimmed button's frame stays solid
  black and only the label is dithered (Eject, Create in Standard File). In
  color the label is gray.
- **CIC "B&W scroll bar":** the active track is a 25% pattern (one black pixel
  in four per row, alternate rows offset by two), not 50%. Arrows are hollow
  outlines; a pressed arrow fills black. The box is white.
- **CIC "default 1-bit desktop pattern":** 50% checkerboard.
- **CIC "checkbox and radio pressed state":** pressed checkboxes and radio
  buttons draw a 2 px outline (both depths).
- **CIC "outline-triangle fill in B&W":** the 1-bit triangle is a hollow
  outline, collapsed and expanded.
- **CIC "inactive scroll bars":** it depends on the application. The Finder
  hides the bars of an inactive window; Scrapbook shows them dimmed (hollow
  arrows, plain track, no box). An active window whose content fits shows
  the arrows and a plain track with no box.
- **CIC "4-bit color variant":** Monitors offers Black & White, 4, 16, 256
  and Thousands, color or gray; 7.5.5's Control Strip lists all of them, and
  each is captured (`755-depth-*.png`).
- **Note alert (HIG p.194):** Energy Saver on a machine it does not
  support puts up a note alert (`*-755-alert-note-energysaver.png`): the
  talking-face icon in the stop and caution alerts' frame and layout.
- **Pressed Control Strip cell** (`*-755-controlstrip-*-pressed.png`): two
  pixels of #444444 on the top and left, two of the face (#CCCCCC) on the
  bottom and right, a #888888 fill, the two off corners the fill; in 1-bit
  the dark edge is the 50% checker and the rest white. At rest, the 1-bit
  strip's shadows (#AAAAAA and #888888 in color) and a dimmed arrow's dark
  side are the checker too, its inner shadow starting a row higher than in
  color; the strip's outer lower corner is rounded off by three black
  pixels; and the collapse box's inner square is shaded #444444. The
  checker is in the screen's phase, black where the screen's x + y is even,
  not each cell's: the cells start at x 29, 60 and 91 (a pitch of 31), so
  every other cell starts on an odd x + y.
- **Opened icon, unselected** (`*-755-icon-opened-unselected.png`): the
  outline and the 25% pattern as selected, the fill #CCCCFF (the window
  color's light lavender) in color, white in 1-bit.
- **Finder list view, selected row** (`*-755-finder-list-row-selected.png`):
  the icon darkened in color (inverted in 1-bit) and only the name
  inverted, white on black at both depths.
- **Scroll-box snap-back** (`*-755-scrollbox-drag-*.png`): the outline
  follows the pointer up to 24 px past the bar's own pixels, on either side,
  and snaps back over the box at 25.
- **Simple Beep** (`755-simple-beep-recording.wav`): an 8-bit square, half
  of each cycle at 127 + amplitude / 8 and half at 127 - amplitude / 8,
  whatever the timbre; docs/system7-asset-inventory.md has the comparison.
- **Standard File layout** (`*-755-dialog-standardfile-layout.png`, 7.5's
  `*-dialog-standardfile-open.png`): the folder pop-up centered over the
  list, the disk's name with its small icon at the top right, then the
  button column at the right: Eject, Desktop, a line, Cancel and the
  default Open.
- **Application menu title** (`*-755-appmenu-*.png`): the front
  application's small icon alone, in a title 34 px wide whose right edge is
  6 px from the screen's.
- **MWD 7, size box without scroll bars:** Stickies' notes
  (`*-755-stickies-notes.png`).
- **MWD 12, window tints:** each of the Color control panel's Window colors
  on an active document window (`color-755-window-tint-*.png`).

## Not captured

- A dimmed checked checkbox. None of 7.5.5's panels tried shows one:
  Clock Options clears a dimmed sub-option's check (its "…same number of
  times as current hour" box, checked, reads unchecked once "Chime on the
  hour" is cleared); General Controls, Easy Access, Memory, Get Info (the
  System file's, the Finder's) and Energy Saver dim none that is checked.
  Nor does Get Info on a locked application while it runs (SimpleText) or
  on a locked item in the Trash (CPU Energy Saver): both draw the Locked box
  checked and enabled, in black, at both depths
  (`*-755-getinfo-locked-*.png`, the script's `lockedgetinfo` scene).
  The package's dotted dimmed X rests on the HIG's "dithered to 50 percent
  gray" (p.207).
- Menu blinking (MWD 10) at its own rate: the emulator posts a frame every
  100 ms, so the eight frames show the item on and off but not every phase.
- Title clipping and truncation (MWD 9); the title gap can be measured from
  the window captures.

## How to reproduce

The 7.5.5 set: from the repository root,

```sh
node packages/appearance/system7/bin/capture-references.mjs run .playwright-mcp/parity/system7/reference
node packages/appearance/system7/bin/capture-references.mjs beep .playwright-mcp/parity/system7/reference
```

`run` boots Infinite Mac's "System 7.5.5" disk in the repo's Playwright
Chromium (headless, 700 x 620, device scale factor 1), quits Stickies, and
plays the recipe (`SCENES` in the script: each scene starts and ends on the
bare desktop, so `--only <regex>` runs one, by `<depth>-<scene>` name) at
256 colors, then Black & White, then the other depths. `beep` records
Simple Beep from SimpleSound and compares it with the package's WAV.
`serve <port> <out>` boots the emulator and takes steps over HTTP (POST
`/do` a JSON list of steps, a `["record"]` step then GET `/audio`, GET
`/frame`, `/scene/<name>/<depth>` and `/quit`), to work out a new scene. How it
works:

1. An init script keeps the latest `emulator_screen` message (with
   `screen_update_messages=true` the embed posts its framebuffer, RGBA) and
   taps every node connected to the audio destination with a
   ScriptProcessor that keeps the samples while recording.
2. The mouse is driven with `page.mouse` at emulator coordinates plus the
   canvas's `getBoundingClientRect()` origin; the emulated pointer follows
   with a lag, so every move waits 400 ms before a press. Menus and pressed
   controls are shot with the button held, the pointer moved off where that
   keeps them held (a menu stays open), and released where nothing happens.
3. A capture waits for a frame drawn after the last input and writes it out
   through an `OffscreenCanvas` as PNG: the emulator's own 640 x 480 pixels.

The 7.5 set was made by hand the same way, on the "System 7.5" disk:
follow its Source column after quitting Stickies; for 1-bit, open Apple
menu > Control Panels > Monitors and choose Black & White.

Caveat (the 7.5 set): the emulator crashed (`do_get_mem_* out of bounds`, then the tab died)
three times, each shortly after a control panel window was closed (Monitors
twice, after a depth change; Date & Time once, after its little arrows
changed the clock). Leaving Monitors open, dragged almost off screen, avoided
it. A restart starts from a fresh disk state, so window positions are
deterministic and the regions above repeat.
