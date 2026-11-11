# System 7.5 reference screenshots

Reference captures of real System 7.5 for the System 7 Appearance Package
(plan 0018-dbd, section 3.1). They settle what the HIG figures do not show,
chiefly the 1-bit look and the pressed states. The images are not committed:
they live in the gitignored folder
`.playwright-mcp/parity/system7/reference/`, and this index says what each one
shows and how to make them again.

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

Region values are approximate (to a few pixels); measure from the file before
pinning a value. "Q" names the open question a capture answers: **MWD n** is
question n in the Open questions of
`docs/superpowers/specs/2026-11-11-system7-hig-menus-windows-dialogs.md`;
**CIC "…"** names a bullet in the Open questions of
`docs/superpowers/specs/2026-11-11-system7-hig-controls-icons-color.md`.

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
| `bw-disclosure-expanded.png` | Same | 1-bit | Finder list | same | same |
| `color-controlpanel-monitors-256.png` | Monitors: depth list (scrollable), radio buttons, buttons | color | Monitors | 100,42,234,280 | CIC "4-bit color variant" |
| `color-controlpanel-monitors-opened-icon.png` | Same, with the opened Monitors icon in the Finder window behind | color | Monitors | same | CIC "opened-icon pattern" |
| `bw-controlpanel-monitors-bw.png` | Monitors after switching to Black & White | 1-bit | Monitors | same | — |

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
- **MWD 4, color values (256 colors, this install's window tinge):** title
  bar `#EEEEEE` with stripes `#777777` (six stripes on every other row), top
  highlight `#CCCCFF`, bottom shade `#9999CC`, box frame `#333366`, inner
  shade `#666699`; scroll track `#DDDDDD`; dimmed menu text `#888888`;
  desktop `#666666`/`#AAAAAA` checkerboard. The Color control panel's window
  color was not opened, so these are the Infinite Mac image's setting
  (lavender-gray), assumed to be the default; verify before freezing tokens.
- **MWD 5, scroll box:** the 7.5 color box has horizontal grip ridges. The
  1-bit box is a plain white box with a black frame, no ridges.
- **MWD 6, utility (floating) window:** the close box is 9x9 px including its
  frame (the document window's is 11x11); the drag area is two rows of single
  dots (`#333333` on `#EEEEEE` in color, black on white in 1-bit), not
  stripes.
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
  and Thousands; only Black & White and 256 were captured.

## Not captured

- A note alert (no reliable trigger was found in the stock 7.5 install).
- A slider being dragged; only the resting Sound slider.
- A size box on a window without scroll bars (MWD 7).
- Menu blinking (MWD 10) and other animation; captures are still frames.
- Window tints from the Color control panel (MWD 12).
- 4-bit and 16-bit depths, and grays.
- Title clipping and truncation (MWD 9); the title gap can be measured from
  the window captures.

## How to reproduce

1. Run a small Node script that launches the repo's Playwright Chromium
   headless (`--disable-gpu`), viewport 700x620, `deviceScaleFactor: 1`, and
   adds an init script that stores the latest `emulator_screen` message
   (`window.addEventListener("message", e => { if (e.data?.type ===
   "emulator_screen") window.__last = e.data; })`) before navigating to the
   URL above.
2. Drive the mouse with `page.mouse` at emulator coordinates plus the
   canvas's `getBoundingClientRect()` origin (the canvas is not at 0,0), and
   the keyboard with `page.keyboard` (Command is `Meta`).
3. To save a frame, in the page: `new ImageData(new
   Uint8ClampedArray(f.data), f.width, f.height)`, `putImageData` onto an
   `OffscreenCanvas`, `convertToBlob({ type: "image/png" })`, and write the
   bytes from Node.
4. After boot, click a sticky note and press Command-Q to quit Stickies
   (Infinite Mac's welcome notes), then follow the Source column. For 1-bit,
   open Apple menu > Control Panels > Monitors and choose Black & White.

Caveat: the emulator crashed (`do_get_mem_* out of bounds`, then the tab died)
three times, each shortly after a control panel window was closed (Monitors
twice, after a depth change; Date & Time once, after its little arrows
changed the clock). Leaving Monitors open, dragged almost off screen, avoided
it. A restart starts from a fresh disk state, so window positions are
deterministic and the regions above repeat.
