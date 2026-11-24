# Windows Interface Guidelines — Windows 98 Appearance Package Compliance Audit

_Last updated: 2026-11-24_

## About this document

This is the compliance audit of `@classicy/appearance-windows98`, the Windows 98
Appearance Package (`packages/appearance/windows98`), against Microsoft's
**Windows Interface Guidelines** of 1995, the design authority for the look of
Windows 95 that Windows 98 kept. It records, per chapter group, the normative
rules that apply to Classicy, the current state of each, the fixes applied in
this pass and the changes proposed for the core. It is the Windows counterpart
of [`hig-audit.md`](hig-audit.md), the Platinum audit against Apple's Mac OS 8
Human Interface Guidelines, and follows its shape.

### Sources

| Short name | Document | Role |
| --- | --- | --- |
| **WIG** | _The Windows Interface Guidelines — A Guide for Designing Software_, Microsoft, February 13, 1995 (the pre-release of the Microsoft Press book; `packages/appearance/windows98/resources/Microsoft_WindowsInterfaceGuidelines_1995.pdf`, 372 PDF pages) | **Authoritative** for the look: colors, border styles, control states, sizes in pixels and dialog base units, layout, fonts, and the behavior Windows 95 attached to them. |
| Windows 98 as shipped | The operating system's own drawing (`user32`/`comctl32`, documented pixel for pixel by Wine's `uitools.c`, `button.c`, `scroll.c`, `menu.c`, `trackbar.c`, `progress.c`, and by 98.css and os-gui) | Fills in what the 1995 text leaves to figures (pixel offsets, the title-bar gradient, flat toolbar buttons). **Where the text of 1995 and the OS as shipped differ, the OS wins**, and the choice is recorded. |

### Citation scheme

Findings cite **WIG by chapter, topic heading and printed page**, e.g.
`WIG Ch.6 "Title Bars" (p.76)`, with the figure or table where one carries the
rule (`Figure 6.1`, `Table 7.4`). The printed page is **derived from each
chapter's opening page**: in this pre-release PDF every running head carries
one placeholder number per chapter (every Ch.6 page reads "95", every Ch.7 page
"143", every Ch.13 page "325"), so only the chapter openers, which print their
true folio, anchor the numbering. The offsets used throughout this document:

| Chapter | Opener | Printed page = | Covered here |
| --- | --- | --- | --- |
| Ch.3 The Windows Environment | PDF 31 = p.15 | PDF − 16 | pp.15–19 (PDF 31–35) |
| Ch.6 Windows | PDF 85 = p.75 | PDF − 10 | pp.75–96 (PDF 85–106) |
| Ch.7 Menus, Controls, and Toolbars | PDF 107 = p.97 | PDF − 10 | Menus pp.97–110, Controls pp.110–138, Toolbars and Status Bars pp.139–143 (PDF 107–153) |
| Ch.8 Secondary Windows | PDF 151 = p.145 | PDF − 6 | pp.145–170 (PDF 151–176) |
| Ch.13 Visual Design | PDF 283 = p.295 | PDF + 12 | pp.295–321 (PDF 283–309) |
| Ch.14 Special Design Considerations | PDF 310 = p.327 | PDF + 17 | pp.327–344 (PDF 310–327) |
| Appendix C Guidelines Summary | PDF 341 = p.361 | PDF + 20 | pp.361–366 (PDF 341–346) |

The code comments this pass wrote into the Ch.13 and Ch.14 partials used two
other derivations (Ch.13 at PDF + 14, Ch.14 and App. C from the running head), so
`_Button.scss`'s "Font and Size (p.312)" is this document's p.310, its
"Button Border Styles (p.303)" p.301, "Option-Set Appearance (p.306)" p.304,
"Mixed-Value Appearance (p.308)" p.306, "Unavailable Appearance (p.309)"
pp.306–307, `_ProgressBar.scss`'s "Animation (p.325)" p.321, and
`_TextField.scss`'s and `_Table.scss`'s "Scalability (p.327)" and "The User's
Point of Focus (p.327)" pp.334 and 333. Realigning them is on the Next pass
list; the topic headings, which do not move, are the stable half of every
citation.

### What is auditable

The package owns the **look**: every color, bevel, border, glyph, size, font and
spacing, through its themes (`src/windows98.json`: 18 presets, the knob families
and color families) and its stylesheet partials
(`src/styles/components/_<Name>.scss`, the bevel helpers `_bevels.scss` and the
pixel-art helpers `_pixel.scss`). The core owns **behavior and structure**: what
parts exist, keyboard handling, focus, how menus open, dialog flow, window
management. A WIG rule about behavior the core already provides is ✅; one it
lacks is ⚠️ Deferred with a note, since a package cannot add behavior, unless it
is a small additive core hook of the kind this branch already added (a state
class, a custom property, a layout flag), which is **proposed, not applied**.
Theme data (`windows98.json`) is package scope.

### Mac-structure and web-platform adaptations (intentional, NOT findings)

Classicy is a Mac OS structure wearing Windows dress. These are deliberate and
must be preserved:

- **One menu bar across the top of the screen, drawn taskbar-style.** Its
  styling is judged (as the taskbar, WIG Ch.3 Figure 3.1); its existence, the
  single front-application button and the absence of per-window buttons are
  not.
- **No taskbar, no Start menu, no MDI.** Minimize is drawn on the core's
  collapse (WindowShade) box, which collapses the window to its caption; a
  Windows-faithful minimize needs a taskbar in the core.
- **Desktop icons as the Mac lays them**, the Apple and Application menus, the
  Mac's menu content (About in the Apple menu, Quit not Exit, ellipses before
  confirmation alerts).
- **Mac keyboard equivalents, browser-safe**: Control (⌃) and Option (⌥)
  chords, since the browser keeps ⌘W/⌘Q and Alt+Space, Alt+letter and F10 on
  some platforms; chords are written as glyphs (`⌃⌫`), not `Ctrl+`.
- **No OLE, no pen input, no Windows help system** (no What's This? button,
  no Help Topics).
- **Icons, cursors and system art are the default package's (Platinum's)**:
  the package registers no art (no Microsoft artwork may be copied). Geometry
  and color are judged, not the pictures. Fonts: MS Sans Serif is named first
  in a stack but not shipped (`"Pixelated MS Sans Serif"`, then Microsoft Sans
  Serif, Tahoma, Arial, at 11 px).
- **The desktop labels' drop shadow** is a knob (`desktopLabel.shadow`, 1;
  0 = none, stock Windows 98 without the Active Desktop).

### Status legend

- ✅ **Compliant** — already conforms, no change needed.
- 🔧 **Fixed** — deviation found and corrected in this pass (file named; the
  changes are uncommitted edits on branch `claude/macos-ui-components-audit-li9fxm`).
- ⚠️ **Deferred** — real deviation, but out of scope for a package fix (needs
  a core change, art, a product decision or more than this pass); tracked in
  "Deferred and proposed core changes".
- ➖ **N/A** — WIG rule with no Classicy surface, or an intentional adaptation.

Severities: **HIGH** (a visible contradiction of the Windows look a user
notices at once), **MEDIUM** (a visible gap in a common surface), **LOW** (a
pixel, a state or an uncommon surface).

---

## Chapter 3 — The Windows Environment; Chapter 6 — Windows

Pages read: PDF 31–35 (Ch.3) and 85–106 (Ch.6). Chapters 3 and 6 give almost no
numbers; the pixel values the findings compare against (16 × 14 caption buttons
in an 18-px caption, the 4-px sizing frame against the 3-px fixed frame, the
16-px scroll bar, 2 px before Close) are Windows 95's system metrics as the
figures show them. Windows 98's title-bar gradient is not in the 1995 text; the
package's gradient colors are Windows 98's defaults.

Normative checklist (WIG Ch.3 and Ch.6) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Ch.3 "The Desktop" (p.15) | The desktop fills the screen as the background of all operations and holds file-system objects. | `_Desktop.scss`; `windows98.json` `defaults.desktop` (backgroundColor 32896 = #008080, Windows' Background teal, no image); the core's Desktop Folder (Finder) | ✅ |
| Ch.3 "The Taskbar" / "The Start Button" (p.15, Figure 3.1) | A raised ButtonFace bar along a screen edge, the raised edge facing the desktop; the Start button a raised button with a bold label; one raised button per open window, the active window's drawn pressed over the ButtonHilight/ButtonFace checker; the status area (clock) in a sunken pane at the other end. No pixel sizes given. | `_MenuBar.scss` (the screen menu bar drawn as the taskbar: Apple title = Start, Application menu = the front application's button, extensions = tray, clock pane) | 🔧 see 3.1, 3.2 |
| Ch.3 "Window Buttons" (pp.15–16) | A button per primary window, sized to fit, abbreviated with a tooltip; buttons activate their window and take drops. | none (no taskbar) | ➖ |
| Ch.3 "The Status Area" (p.16) | Opposite the Start menu, a status area for indicators an application may show even when not active. | `_MenuBar.scss`: the menu bar extensions and Sound widget as 16-px flat tray icons before the clock pane | ✅ |
| Ch.3 "Icons" (pp.17–18, Table 3.1) | A picture with its label centered beneath it; a shortcut carries the arrow badge at its lower left; register icons for the application and its document types. | `_Desktop.scss`, `_Icon.scss`; `defaults.desktop.iconSize` 32, `iconFontSize` 11; the core's alias badge; the pictures are Platinum's | ✅ geometry; ➖ pictures |
| Ch.3 "Windows" (p.19, Figure 3.2) | Icons open into windows; windows also present dialogs, palettes and messages. | core window types (document, modal, utility) | ✅ structure |
| Ch.6 "Primary Window Components" (pp.75–76, Figure 6.1) | Frame, title bar (icon at the left, bold white title, Minimize and Maximize side by side then Close after a gap at the right), scroll bars when needed, optional menu bar, toolbars and status bar with the size grip at its right end; two-pixel raised edge around a ButtonFace border; sunken client area. | `_Window.scss` (title bar, caption boxes, frame, client edge, resizer) | ✅ |
| Ch.6 "Window Frames" (p.76) | A sizable window has a distinct sizing border; a window that cannot be resized has none: its border coincides with its edge (Windows: the 2-px edge + 1 px of ButtonFace, SM_CXDLGFRAME 3, against SM_CXFRAME 4). | `_Window.scss` `.classicyWindow` (`b.window-frame` over the core's `--window-frame-inset` 4 ring), `.classicyWindow.classicyWindowModal`; `measurements.window.borderSize` 1 | ✅ sizable; 🔧 modal, see 6.1; ⚠️ non-resizable documents, see 6.1 |
| Ch.6 "Title Bars" (p.76) | Across the window's width inside the border; identifies the content; moves the window; shows the window's pop-up menu on button 2 and ALT+SPACEBAR. | `_Window.scss` title-bar mixin (`--window-title-bar-height` 18, `--title-bar-end-inset` 2, `--title-bar-icon-inset` 2); core `startMoveWindow` | ✅ look and move; ⚠️ pop-up menu, see 6.2 |
| Ch.6 "Title Bar Icons" (pp.76–77, Figures 6.2–6.4) | A small (16 px) icon at the upper left: a tool's own icon, a document window's data-type icon. | `_Window.scss` caption-icon mixin (16 × 16, `--icon-small-size`); core `icon`/`hideIcon` props | ✅ (which icon is the app's content) |
| Ch.6 "Title Bar Icons" (p.78) | Button 2 on the icon shows the object's pop-up menu with Close as default; double-clicking the icon closes. | core ClassicyWindow (the icon is inert) | ⚠️ see 6.3 |
| Ch.6 "Title Text" (pp.78–79, Figure 6.6) | "Document - Application Name"; a tool shows its name; names as in the file system, no extension or path. | core `title` (each app's content; Finder titles by folder, the container convention) | ➖ |
| Ch.6 "Title Text" (p.80) | Abbreviate a title too wide for the window; draw nothing else into the title area. | base ellipsis kept by `_Window.scss` `.classicyWindowTitleText`; the package adds nothing to the title area | ✅ |
| Ch.6 "Title Bar Buttons" (p.80; Figure 6.1) | Close (X), Minimize (a bar at the bottom left of center), Maximize (a box with a thick top), Restore (two overlapping boxes), each a small raised ButtonFace button (16 × 14 in the 18-px caption; Minimize and Maximize adjacent, Close 2 px apart, 2 px in from the end); button 1 invokes, button 2 shows the window menu; no button for an unsupported command. | `_Window.scss` caption-boxes/caption-button, the marks `$close` 8 × 7, `$maximize` 9 × 9, `$minimize` 6 × 2; `measurements.titleBar` buttonWidth 16, buttonHeight 14, buttonGap 0, closeGap 2, endInset 2; core `zoomable`/`collapsible`/`closable` | ✅; ⚠️ Restore, see 6.7 |
| Ch.6 "Activating and Deactivating Windows" (pp.80–81) | The active title bar in COLOR_ACTIVECAPTION (navy 0,0,128, white text), every other in COLOR_INACTIVECAPTION (gray 128,128,128 with 192,192,192 text); nothing else changes; a click anywhere in a window activates it. | `_Window.scss` title-bar/title-bar-inactive mixins, `.classicyWindow.inactive`; `color.families.titleBar` active 128, activeGradient 1082576, inactive 8421504, inactiveGradient 11908533, text #ffffff, inactiveText 12632256; core `setActive` | ✅ |
| Ch.6 "Activating and Deactivating Windows" (p.81) | Hide a selection's feedback in an inactive window. | core ListBox/Table/Tree selection (no window-active state published) | ⚠️ see 6.4 |
| Ch.6 "Activating and Deactivating Windows" (p.81) | Reactivating a primary window raises it with its secondaries, positions kept. | core z-order bands (app 150, focused window 300, palettes 350, modals 370) and `focusApp` | ✅ |
| Ch.6 "Opening and Closing Windows" (pp.81–82) | Restore a reopened window's last size and position; a first open uses a default; opening activates; keep a stored rectangle on the display. | core persisted window records, `ClassicyWindowOpen` focus and cascade, `clampWindowPositionToViewport` | ✅ |
| Ch.6 "Opening and Closing Windows" (p.83) | Close by the Close button or the window menu; prompt for pending changes; closing a primary closes its secondaries. | core Close box, `ClassicyWindowClose`, `closeApp` (the save prompt is each app's) | ✅ |
| Ch.6 "Moving Windows" (p.83) | Drag the title bar; an outline moves with the pointer, the window redraws on release; never where it cannot be reached; moving activates. | `_Window.scss` drag-band (the frame ring as a 2-px 50% WindowText checker) on `.dragging`; core `startMoveWindow`, the release clamp, `setActive` | ✅ |
| Ch.6 "Resizing Windows" / "Sizing Borders" (p.83) | Resize by dragging the sizing border at any edge (sizing cursors); an outline follows; the window takes its size on release and becomes active. | core frame-edge handles (they move the window, Mac OS 8's drag-from-the-frame), the grow box; `_Window.scss` drag-band on `.classicyWindowResizing` | ✅ outline and activation; ⚠️ edges, see 6.5 |
| Ch.6 "Resizing Windows" (p.84) | Clip the content when smaller; a window may define minimum and maximum sizes. | core `minimumSize`; the contents a ClassicyScrollArea | ✅ |
| Ch.6 "Maximizing Windows" (pp.84–85) | Maximize fills the display less the taskbar; replace the Maximize button with Restore while maximized. | core zoom (`computeStandardRect`, `--window-zoom-margin` 7, the `zoomed` flag with no state class); `_Window.scss` `.classicyWindowZoomBox` | ⚠️ see 6.6, 6.7 |
| Ch.6 "Minimizing Windows" / "Restoring Windows" (p.85) | Minimize reduces the window to its taskbar entry; restore from the taskbar or ALT+TAB. | core collapse (WindowShade) box under the package's Minimize mark; no taskbar | ➖ |
| Ch.6 "Size Grip" (p.85; Figure 6.1) | A sizable window's size grip at its lower right: at the scroll bars' junction, or at the far end of the status bar, never both; three diagonal ridges, ButtonHilight over ButtonShadow, in a ButtonFace square. | `_Window.scss` `.classicyWindowResizer` (the 16-px corner cell, the 14 × 14 `$grip`, `--grow-box-inset` 2); core resizer (resizable windows only), the placard bar | ✅ |
| Ch.6 "Scrolling Windows" (p.86, Figure 6.7) | Scroll bars: raised ButtonFace arrow buttons with black triangles at each end, a halftone (ButtonFace/ButtonHilight checker) shaft, a raised ButtonFace scroll box; 16 px across; a bar per scrolling axis, aligned with its window edge. | `_ScrollBar.scss` (`.classicyScrollBar`, `-Arrow`, `-Track`, `-Thumb`, `.classicyScrollAreaCorner`); `measurements.window.scrollbarSize` 16; core per-axis policies | ✅ |
| Ch.6 "Scrolling Windows" (p.87) | Keep the bars displayed when the window is inactive or when its content stops needing them. | `layout.scrollBar.fitsBars: "shown"`; core `fitsScrollBars`; `_ScrollBar.scss` `.fits` (embossed arrows, no thumb), nothing on `inactive` | ✅ |
| Ch.6 "Scroll Arrows" (p.87) | Arrows point away from the center; a click scrolls one line; disable the arrow at the end of travel (the system does not by default); hold auto-repeats, pausing while the pointer is off the button. | core `useClassicyPressRepeat` (120 ms), `lineStep`; `_ScrollBar.scss` arrow glyphs, `.fits` emboss | ✅ repeat; ⚠️ per-arrow disabling, see 6.8 |
| Ch.6 "Scroll Box" (pp.87–88, Figure 6.8) | Position and size proportional to the view; when everything is visible the box fills the bar and the arrows are disabled; minimum box no smaller than the sizing border; dragging updates the view continuously. | core `computeClassicyScrollThumb`, live `pressThumb`; `_ScrollBar.scss` `$thumb-min` 8 px (over the 4-px sizing border), `.fits` | ✅ proportion, minimum, live drag; ⚠️ full-length box, see 6.9 |
| Ch.6 "Scroll Box" (p.89) | Dragging the box off the bar past a distance proportional to its width returns it to its start and cancels; dragging back resumes. | core `pressThumb` (snap-back only in `thumbDrag: "onRelease"`, System 7's) | ⚠️ see 6.10 |
| Ch.6 "Scroll Bar Shaft" (pp.89–90, Figure 6.9) | A click in the shaft pages by the visible area with a line of overlap; hold repeats; leaving the shaft pauses. | core `pressTrack` (page = visible − lineStep; stops when the thumb reaches the pointer); `_ScrollBar.scss` inverts the paged side (`--classicy-scroll-page-start`/`-length`) | ✅ |
| Ch.6 "Automatic Scrolling" (p.91) | Scroll when a selection or a dragged object nears the edge, when typing at the edge, when an operation moves the cursor out of view. | core file drag (no auto-scroll), native caret scrolling | ⚠️ see 6.11 |
| Ch.6 "Keyboard Scrolling" (p.92) | Arrow keys scroll at the edge; PAGE UP/DOWN are shaft clicks. | core ClassicyScrollArea keys on a focusable root | ✅ |
| Ch.6 "Placing Adjacent Controls" (p.92) | Controls or status bars may shorten a scroll bar, not so much that scrolling gets hard. | core placard bar on the horizontal bar's line, `--window-placard-end-reserve`; `_Window.scss` placard inset | ✅ |
| Ch.6 "Splitting Windows" (pp.92–94, Figures 6.10–6.11) | A split box at the end of a scroll bar, the sizing border's size; the pointer changes over it; the split bar runs side to side, at least as wide as the sizing border. | core ClassicySplitView (divider, no split box, live resize); `_ScrollBar.scss` divider rules (flat ButtonFace, `--window-padding-size` 5 ≥ the 4-px border, full length) | ✅ bar; ⚠️ split box, see 6.12 |
| Ch.6 "Splitting Windows" (p.95, Figure 6.12) | Dragging to the end of the bar closes the split; optional double-click; a Split command with arrow keys, ENTER and ESC. | core ClassicySplitView (arrow keys nudge 1 %, `minPaneSize` 48 floor) | ⚠️ see 6.13 |
| Ch.6 "Splitting Windows" (p.96) | Panes get their own bars as needed; view state per pane; the split saved with the view. | core ClassicySplitView (each pane a ClassicyScrollArea, `onResizeCommit`, `defaultSizes`) | ✅ |

### Findings — Chapters 3 and 6

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 3.1 | LOW | The front application's taskbar button was raised at rest and pressed over the checker only while its menu was open; Figure 3.1 draws the active window's button pressed and checkered at all times, its label bold. | `_MenuBar.scss` (`.classicyDesktopMenuAppSwitcher`) | 🔧 Fixed |
| 3.2 | LOW | The screen bar was flat on every edge (`box-shadow: none`); the taskbar's edge toward the desktop is raised. Docked at the top, that is its bottom: ButtonShadow inside ButtonDkShadow. | `_MenuBar.scss` (`.classicyDesktopMenu`) | 🔧 Fixed |
| 6.1 | LOW | A modal dialog wore the sizable window's 4-px frame (`--window-frame-inset`); a window that cannot be resized has no sizing border (3 rings). A non-resizable **document** window still wears the sizable frame: the core publishes no state for `resizable={false}`. | `_Window.scss` (`.classicyWindow.classicyWindowModal`) | 🔧 Fixed (modal); ⚠️ core state for documents |
| 6.2 | LOW | Mouse button 2 on a title bar shows only an app-supplied `contextMenu`; the core has no window system menu (Restore, Move, Size, Minimize, Maximize, Close) and no ALT+SPACEBAR. | core ClassicyWindow | ⚠️ Deferred (core) |
| 6.3 | LOW | The title-bar icon is inert: no pop-up menu on button 2, no double-click close. | core ClassicyWindow | ⚠️ Deferred (core) |
| 6.4 | LOW | A selection in an inactive window stays Hilight/HilightText: only ClassicyScrollArea reads `ClassicyWindowActiveContext`; list boxes, tables and trees carry no window-active state the package could key on. | core ListBox/Table/Tree; `_ListBox.scss`, `_Table.scss` | ⚠️ Deferred (core hook) |
| 6.5 | MEDIUM | The four `.classicyWindowFrameEdge-*` handles over the sizing border **move** the window (Mac OS 8's drag-from-the-frame); only the grow box resizes. Windows resizes by dragging any edge. | core ClassicyWindow | ⚠️ Deferred (core layout flag) |
| 6.6 | LOW | A full zoom is Mac OS 8's: the content's ideal size less a 7-px `--window-zoom-margin`, not the display less the taskbar. | core `computeStandardRect` | ⚠️ Deferred (core layout flag) |
| 6.7 | MEDIUM | The core keeps `zoomed` in the window record and emits the `zoom` hook event but publishes no state class, so a maximized window still shows the Maximize mark; Windows replaces it with Restore. | core ClassicyWindow; `_Window.scss` `.classicyWindowZoomBox` | ⚠️ Deferred (core hook `expanded`) |
| 6.8 | LOW | `fits` is published per bar only; at the top of a scrolling document the up arrow stays enabled (as Windows' default bars do; the WIG still asks applications to disable it). | core ClassicyScrollArea; `_ScrollBar.scss` | ⚠️ Deferred (core hook) |
| 6.9 | LOW | When everything is visible the core draws no thumb and the package keeps the bare checker with embossed arrows (how Windows 95/98 draws a disabled bar, ESB_DISABLE_BOTH); the WIG's text has the scroll box fill the bar. | `_ScrollBar.scss` `.fits` | ⚠️ Deferred (product decision: the OS as shipped kept) |
| 6.10 | LOW | A live thumb drag follows the pointer anywhere and never snaps back (`snapBack` is infinite unless `thumbDrag === "onRelease"`). | core `pressThumb` | ⚠️ Deferred (core) |
| 6.11 | LOW | No auto-scroll of a scroll area while a file drag nears its edge. | core `startClassicyFileDrag` | ⚠️ Deferred (core) |
| 6.12 | LOW | ClassicySplitView has no split box for user-splittable windows; the divider's drag resizes live rather than moving a representation (a stronger form of the same feedback); its cursor is Platinum's. | core ClassicySplitView | ⚠️ Deferred (core; cursors by design) |
| 6.13 | LOW | A divider drag stops at `minPaneSize` (48 px) rather than closing the split at the end of the bar; no double-click, no Split command. | core ClassicySplitView | ⚠️ Deferred (core) |

**Details & fixes**

- **3.1** 🔧 (`packages/appearance/windows98/src/styles/components/_MenuBar.scss`):
  `.classicyDesktopMenuAppSwitcher` now includes the renamed mixin
  `taskbar-button-pressed` (the pressed bevel over the 2-px
  ButtonHilight/ButtonFace checker, formerly `taskbar-button-open`) at rest, with
  `> p { font-weight: bold }` on the text alone so the menu's items stay plain;
  the mixin carries its own `:hover` guard so the title's hover rule never lifts
  it, and the redundant `&.open` include is gone (the rest state already is the
  pressed one). The Start button keeps `taskbar-button-pressed` while open only.
  _WIG Ch.3 "The Taskbar" (p.15), Figure 3.1: the front "Document" button sunken,
  the others raised._
- **3.2** 🔧 (`_MenuBar.scss`): `.classicyDesktopMenu` gets
  `box-shadow: inset 0 b.$neg-b b.$dkshadow, inset 0 b.$neg-b2 b.$shadow` (two
  rings along the bottom edge only, DrawEdge EDGE_RAISED BF_BOTTOM's dark side)
  in place of `box-shadow: none`; the titles' 2-px bottom margin keeps them above
  the rings and the pull-downs already hang from `top: calc(100% + $edge)`.
  Product decision, recorded: the porting brief's "no bottom bevel" described a
  window's own menu bar, which Windows 98 draws flat (`_Window.scss` still does);
  this bar is styled as the taskbar, whose top-docked edge Windows 98 draws
  raised, so the taskbar reading was taken. _WIG Ch.3 "The Taskbar" (p.15),
  Figure 3.1._
- ✅ Ch.3 "The Status Area" (p.16): `_MenuBar.scss` orders the switcher and the
  extensions into the bar's right group (`order: 35; margin-left: auto`), draws
  the extensions as flat 16-px tray icons (`--icon-small-size`) and the clock
  in a sunken one-ring pane (ButtonShadow top-left over ButtonHilight
  bottom-right) 2 px in from the bar's edges.
- ✅ Ch.3 "Icons" (pp.17–18): `_Desktop.scss` draws the 32-px image over an
  11-px UI-font label (desktop text white with the 1-px black shadow knob), the
  base centering both; selected, Hilight under HilightText with the dotted focus
  rectangle on the label's outer ring and the 50 % Hilight dither over the
  image's opaque pixels (ImageList_Draw ILD_SELECTED); a shortcut keeps the
  arrow badge at its lower left and an upright label (Windows never italicized
  one). `_Icon.scss` does the same in windows on Window white.
- **6.1** 🔧 (`_Window.scss`): `$fixed-frame: calc(#{b.$b2} + #{b.$b})` (the
  two-pixel edge plus one pixel of ButtonFace, SM_CXDLGFRAME 3);
  `.classicyWindow.classicyWindowModal { padding: $fixed-frame }` in place of
  `var(--window-frame-inset)`, and the drag band follows
  (`.classicyWindowModal.dragging::after`, `.classicyWindowResizing::after`
  `{ padding: $fixed-frame }`) so a moved dialog's checkered outline is its
  three-ring frame. Every bundled modal (Alert, FileDialog, InputDialog,
  ColorPicker, KeyboardEquivalentDialog) passes `resizable={false}`, so no
  sizable dialog loses its border; a resizable modal (none is bundled) would
  keep the core's grip measured from the 4-px `--window-frame-inset` inside a
  3-px frame, one pixel off (noted in the partial). ⚠️ A non-resizable document
  window needs a core state: proposed below. _WIG Ch.6 "Window Frames" (p.76)._
- ✅ Ch.6 "Window Frames" (p.76), sizable: `.classicyWindow { @include
  b.window-frame }` draws the two-pixel raised edge (ButtonLight then
  ButtonHilight at the top and left, ButtonDkShadow then ButtonShadow at the
  bottom and right) inside the core's 4-px ButtonFace ring, leaving two pixels
  of sizing border: SM_CXFRAME 4.
- ✅ Ch.6 "Primary Window Components" (pp.75–76), Figure 6.1: Minimize order
  20, Maximize order 30 with `--title-bar-button-gap` 0, Close order 40 after
  `--title-bar-close-gap` 2 and `--title-bar-end-inset` 2; the 16-px icon
  `--title-bar-icon-inset` 2 from the left; the title left-aligned, bold,
  TitleText; the client area sunken (`b.sunken`, two rings of padding); the
  grip in the scroll bars' corner.
- ✅ Ch.6 "Title Bar Buttons" (p.80): the marks on the pixel grid in WindowText,
  Close 8 × 7 two-pixel diagonals at (4,3), Maximize 9 × 9 with a two-row top at
  (3,2), Minimize 6 × 2 at (4,9); `caption-button` raised ButtonFace, pressed
  the bevel turns and the mark steps one pixel down and right; `opacity: 1` on
  inactive windows; the core draws a box only for a command the window has.
- ✅ Ch.6 "Activating and Deactivating Windows" (pp.80–81): the title-bar color
  family holds Windows 95's ActiveTitle, InactiveTitle, TitleText and
  InactiveTitleText defaults with Windows 98's gradient ends; the active bar's
  left-to-right gradient (`b.title-bar-gradient`; a preset whose two colors are
  equal, Windows 95's, draws a flat bar); `.classicyWindow.inactive` swaps the
  pair and sets `filter: none`, undimming contents, header and placard bar, so
  nothing but the caption changes; any click on the root dispatches
  `ClassicyWindowFocus`.
- ✅ Ch.6 "Moving Windows" (p.83): the base hides a dragged window's children
  and the `drag-band` mixin draws the frame ring as a 2-px 50 % WindowText
  checker masked to the ring (Windows' halftone drag frame, Show Window Contents
  While Dragging off); the release clamp keeps the window above the menu bar's
  floor; the root's mouseup activates it.
- ✅ Ch.6 "Size Grip" (p.85): `.classicyWindowResizer` is the 16-px corner cell
  inside the client edge, ButtonFace, the grip a 14 × 14 picture of three
  diagonal ridges (one ButtonHilight line over two ButtonShadow lines)
  `--grow-box-inset` 2 from the corner; one grip only, on resizable windows,
  the placard (status) bar sharing the same scroll-bar line.
- ✅ Ch.6 "Scrolling Windows" (p.86), Figure 6.7: `_ScrollBar.scss` draws
  raised ButtonFace arrow buttons with 7 × 4 (or 4 × 7) WindowText triangles
  one pixel off center as Windows sets them (Marlett at 16 px), pressed flat
  (one ring of ButtonShadow) with the triangle a pixel down-right; the track the
  50 % ButtonHilight/ButtonFace checker on the pixel grid
  (`repeating-conic-gradient`); the thumb raised ButtonFace with no grip, never
  under 8 px; the corner plain ButtonFace; `--window-scrollbar-size` 16.
- ✅ Ch.6 "Scrolling Windows" (p.87): `layout.scrollBar.fitsBars: "shown"`
  keeps a resizable, non-utility window's bars drawn, disabled, when its content
  fits (`fits`: embossed arrows), and an inactive window changes nothing.
- ✅ Ch.6 "Scroll Arrows" (p.87) and "Scroll Bar Shaft" (pp.89–90): the core's
  `hold` repeats every 120 ms, stops on `mouseleave`, resumes on `mouseenter`;
  a track press pages by `max(visible − lineStep, lineStep)` toward the pointer
  until the thumb reaches it; the package inverts the paged side of the checker
  (`PatBlt DSTINVERT`) from `--classicy-scroll-page-start`/`-length`.
- **6.2, 6.3** ⚠️ core: a default window pop-up menu (Close, Collapse/Expand,
  Zoom, Move to Front) when neither the window's nor the app's `contextMenu` is
  set, shown on the title bar's and the icon's contextmenu; `onDoubleClick` on
  `.classicyWindowIcon` closes a `closable` window (stopping propagation so the
  title's double-click collapse does not also fire). ALT+SPACEBAR is browser
  reserved. _WIG Ch.6 "Title Bars" (p.76), "Title Bar Icons" (p.78)._
- **6.4** ⚠️ core hook (additive): ClassicyListBox, ClassicyTable, ClassicyTree
  (and ClassicyTextEditor's selection surface) read `ClassicyWindowActiveContext`
  and emit the vocabulary state `inactive` on their roots as ClassicyScrollArea
  does; the package then hides the selection (the WIG) or draws it in
  ButtonFace/WindowText (Windows' own list views) in `_ListBox.scss` and
  `_Table.scss`. _WIG Ch.6 (p.81); Ch.13 "Highlighting" (p.318)._
- **6.5** ⚠️ core: a layout flag `layout.window.frameEdges: "move" | "resize"`
  (default `"move"`) read through `useClassicyAppearanceLayout()`; under
  `"resize"` the frame-edge handles call `startResizeWindow` anchored at the
  opposite edge (corners at the opposite corner), honoring `resizable` and
  `minimumSize`, with the resize cursors from `--classicy-cursor-resize-lr`/`-ud`
  (Platinum's art, by the brief). `windows98.json` would declare
  `window: { growBoxCorner: "bottom-right", frameEdges: "resize" }`. _WIG Ch.6
  "Sizing Borders" (p.83)._
- **6.6** ⚠️ core: `layout.window.zoom: "standard" | "maximize"` (default
  `"standard"`); under `"maximize"` `computeStandardRect` ignores the content's
  `idealSize` and `--window-zoom-margin` and fills the desktop under the menu
  bar. _WIG Ch.6 "Maximizing Windows" (p.84)._
- **6.7** ⚠️ core hook (additive): emit the existing vocabulary state `expanded`
  on `.classicyWindow` while `ws.zoomed` (beside collapsed/active/inactive/
  dragging; `ClassicyWindow.scss`'s "zoom has no class" note updated). Package
  follow-up ready: a `$restore` picture, two overlapping 6-wide boxes with
  two-row tops, the back one up and to the right (rows `..xxxxxx`, `..xxxxxx`,
  `..x....x`, `xxxxxx.x`, `xxxxxx.x`, `x....xxx`, `x....x..`, `x....x..`,
  `xxxxxx..`), and `.classicyWindow.expanded .classicyWindowTitleBar
  .classicyWindowZoomBox { @include caption-button($restore, 3, 2); }`.
  _WIG Ch.6 "Maximizing Windows" (pp.84–85), "Title Bar Buttons" (p.80)._
- **6.8** ⚠️ core hook (additive): from `update()`'s measurement, `disabled` on
  the `scroll-arrow-start` part while the scroll position is 0 and on
  `scroll-arrow-end` at its maximum (per bar, independent of `fits`); the
  package adds `.classicyScrollBarVertical .classicyScrollBarArrowStart.disabled
  { @include arrow-glyph-disabled($arrow-up); }` and its three siblings beside
  the `.fits` rules. _WIG Ch.6 "Scroll Arrows" (p.87); Ch.7 "List Boxes"
  (p.122), "Scroll Bars" (p.134)._
- **6.9** ⚠️ product decision, the OS as shipped kept: Windows 95/98 hides the
  scroll box of a disabled bar (ESB_DISABLE_BOTH) and leaves the halftone shaft
  with embossed arrows, which `_ScrollBar.scss` draws. If the 1995 text's
  reading is wanted, the package fix is
  `.classicyScrollBar.fits .classicyScrollBarTrack { background: b.$face;
  @include b.raised; }`. _WIG Ch.6 "Scroll Box" (p.88)._
- **6.10** ⚠️ core: in live-drag mode read the snap-back distance too
  (`--scroll-bar-snap-back`, else the bar's thickness); while the pointer is
  outside the track grown by it, scroll back to `startPosition`, resuming when
  it returns; a release outside leaves the view at `startPosition`. _WIG Ch.6
  "Scroll Box" (p.89)._
- **6.11** ⚠️ core: while a file drag's ghost is within a line step of a
  ClassicyScrollArea viewport's edge under the pointer, scroll it by `lineStep`
  on `useClassicyPressRepeat`'s interval. _WIG Ch.6 "Automatic Scrolling"
  (p.91)._
- **6.12, 6.13** ⚠️ core: an optional split box at the end of a pane's scroll
  bar (the sizing border's size, drawn by the package as a raised ButtonFace
  box) that starts a divider drag; a divider drag past `minPaneSize` to the end
  of the bar closes the split (`onSplitClose`), an optional double-click resets
  to `defaultSizes`, and a `splitViewSplitCommand` helper opens the split in the
  middle and moves it with the arrow keys until ENTER or ESC. _WIG Ch.6
  "Splitting Windows" (pp.92–95)._
- ✅ Ch.6 "Splitting Windows" (p.94): `.classicySplitViewDivider` is the flat
  ButtonFace splitter bar of Explorer's panes, `margin: 0` so it runs from one
  side of the view to the other, `--window-padding-size` 5 thick (≥ the 4-px
  sizing border), with the dotted WindowText focus rectangle for the keyboard.

---

## Chapter 7 — Menus

Pages read: PDF 106–124 (pp.96–114). Ch.7 gives no pixel numbers for menus (item
height, frame, gutter, overlap); the frame's pixel colors are Ch.13's, so the
frame, the separator and the submenu overlap are judged against the figures and
Windows 9x's known rendering. `_PopUpMenu.scss`'s open list is a Windows list
box (the drop-down list), judged under Controls; only its bevel-button pop-up
panel and arrows belong here.

Normative checklist (WIG Ch.7, Menus) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "The Menu Bar and Drop-down Menus" (p.97, Figure 7.1) | A flat ButtonFace strip under the title bar, titles in plain ButtonText, no bevel (the screen bar's styling is judged, not its placement). | `_MenuBar.scss` (`.classicyDesktopMenuBar`, `.classicyDesktopMenu`, the titles) | ✅ |
| "Drop-down Menu Interaction" (p.97) | Pressing or clicking a title highlights it and opens its menu; the title stays highlighted while open; with a menu open, moving to another title tracks it; no hot-tracking of a title under the pointer alone. | `_MenuBar.scss` `.open`, `:focus-visible` (Hilight band, HilightText, no outline), `:hover` plain; core ClassicyMenu/ClassicyDesktopMenuBar | ✅ |
| "Drop-down Menu Interaction" (p.97) | A menu opened by pressing can be dragged: items highlight under the pointer, release over an item chooses, release off the menu cancels. | core ClassicyMenu (click and Enter only) | ⚠️ see 7.5 |
| "Drop-down Menu Interaction" (p.97) | A menu opened by clicking stays until the next click; nothing else removes it. | core ClassicyMenuProvider (`DEFAULT_IDLE_TIMEOUT_MS` 15000) | ⚠️ see 7.6 |
| "The Menu Bar and Drop-down Menus" (p.98) | Keyboard: ALT activates the bar; ALT+access key opens a menu; LEFT/RIGHT move between titles with wrap-around; ENTER, UP or DOWN open; UP/DOWN move with wrap-around; ALT cancels; ESC closes one level and leaves the title highlighted. | core ClassicyMenu (items `tabIndex={-1}`, Enter only) | ⚠️ see 7.7 |
| "The Menu Bar and Drop-down Menus" (p.98) | A shortcut key carries the command out at once; the drop-down is not displayed. | core ClassicyShortcutDispatcher | ✅ |
| "Common Drop-down Menus" (pp.98–99) | File (Open, Save, Send To, Print, Exit after a separator), Edit (Cut, Copy, Paste, Undo, Repeat, Find and Replace, Delete, Duplicate), View, Window (MDI), Help (Help Topics, About with no ellipsis). | core bundled apps' `appMenu` (Mac structure) | ➖ |
| "Pop-up Menus" (pp.99–100, Figure 7.2) | A pop-up menu looks like a drop-down: the same ButtonFace panel, raised edge, items, separators, cascade arrows and band, at the pointer. | `_Menu.scss` `$menus` (`.classicyMenu`, `.classicySubMenu`, `.classicyContextMenu`, `.classicyContextSubMenu`) | ✅ |
| "Pop-up Menus" (p.100) | Order: primary commands (Open, Play, Print), then Cut, Copy, Paste, other commands, What's This?, Properties last; keep it small. | core contextual menus (ClassicyContextualMenuProvider, Finder, desktop) | ➖ |
| "Pop-up Menu Interaction" (p.101) | Button 2 down selects; on the up transition display the menu right of and below the hot spot, never clipped by the screen edge. | core ClassicyContextualMenuProvider (`clickOffset [1, 1]`), ClassicyContextualMenu (flips left and up, pinned to the desktop) | ✅ |
| "Pop-up Menu Interaction" (p.101) | Dismiss on an outside button-1 click, a second button-2 click in the same selection, or ESC. | core `useClassicyMenuCloseOnOutsideMouseDown` (no Escape handling) | ⚠️ see 7.8 |
| "Pop-up Menu Interaction" (p.101) | SHIFT+F10 and the Application key display the selection's pop-up menu. | core (no `ContextMenu`/`F10` handling) | ⚠️ see 7.9 |
| "Pop-up Menu Interaction" (p.101); "Shortcut Keys in Menu Items" (p.110) | Avoid shortcut keys in pop-up menus. | core bundled contextual menus (Finder `itemContextMenu`, desktop menu: none carry `keyboardShortcut`) | ✅ |
| "The Window Pop-up Menu" (p.102) | A primary window's pop-up menu (button 2 on the title bar, ALT+SPACEBAR): Close, Restore, Move, Size, Minimize, Maximize, plus window commands; a secondary window's holds Move and Close; palettes may add Always on Top. | core ClassicyWindow (`contextMenu` prop, no system menu) | ⚠️ see 7.10 (= 6.2) |
| "Icon Pop-up Menus" (pp.102–103, Tables 7.1–7.2) | An application icon's menu: Open, Send To, Cut, Copy, Paste, Create Shortcut, Delete, Rename, Properties; a document icon's: Open, Print, Send To, Cut, Copy, Delete, Rename, Properties. | core Finder `itemContextMenu` / desktop icon menus (Open, Restore, Move To Trash) | ⚠️ see 7.11 |
| "Cascading Menus" (p.104, Figure 7.5) | A triangular arrow at the item's right edge pointing right, in the item's ink (HilightText on the band, grayed when unavailable). | `_Menu.scss` `.classicyMenuItemChildMenuIndicator::after` (4 × 7 triangle at `--menu-item-padding-x` 6 from the right, embossed when disabled) | ✅ |
| "Cascading Menus" (pp.104–105) | A cascade opens after a short time-out and, once open, is removed after a time-out when the pointer rests on another item of the parent, so a diagonal drag into it works. | core ClassicyMenu `handleMouseEnter` (opens at once, never closes on a leaf sibling) | ⚠️ see 7.12 |
| "Cascading Menus" (p.104), Figures 7.5/7.8 | The cascade opens beside its parent, its first item level with the parent item, its frame overlapping the parent's; flips left where there is no room. | `_Menu.scss` (`left: 100%; margin: $neg-frame 0 0`, 3 px: the two rings and the ring of face; `classicySubMenuFlipLeft` at `right: 100%`) | ✅ |
| "Menu Titles" (p.105) | Single-word menu bar titles. | core bundled titles (File, Edit, View, Special, Help) | ✅ |
| "Menu Titles" (p.106, Figure 7.4); "Menu Item Labels" (p.109) | One character of every title and item is its access key, unique in its menu, shown underlined. | core ClassicyMenuItem (no access-key field); `_Menu.scss`/`_MenuBar.scss` | ⚠️ see 7.1 |
| "Menu Items" (p.106, Figure 7.5) | Items may be words, graphics or both. | `_Menu.scss` (`img` 16 px, `--layout-item-gap` 4 after it); core image/icon before the title | ✅ |
| "Menu Items" (p.106, Figure 7.5 "Selected Item") | The tracked item is a band across the menu's interior, HilightText on Hilight, following pointer or keyboard; no focus rectangle. | `_Menu.scss` `:hover`, `.open`, `:focus-visible` (`b.$highlight-text` on `b.$highlight`, `outline: none`) | ✅ |
| "Menu Items" (p.106, Figure 7.6) | Separator: a single line spanning the menu (ButtonShadow over ButtonHilight, 2 px); never an item as a separator. | `_Menu.scss` `.classicySeparatorHorizontal` (`b.$b2` tall, shadow over hilight, `margin: px(3) 0 px(4)`: a 9-px slot); core `{ id: "spacer" }` renders ClassicySeparator | ✅ |
| "Menu Items" (p.107) | Disable rather than remove; disabling does not prevent browsing or choosing (it does nothing); the standard unavailable appearance (GrayText embossed by a ButtonHilight pixel below right). | `_Menu.scss` `.classicyMenuItem.disabled` (`b.disabled-text`, tracked as the band with plain GrayText), `_MenuBar.scss` disabled title; core ignores a disabled item's click and chord | ✅ |
| "Types of Menu Items" (pp.107–108) | An ellipsis after a command needing more information; none for Properties, About or a message box. | core bundled menu data (Mac structure: Empty Trash…, Reset PRAM… precede confirmation alerts) | ➖ |
| "Types of Menu Items" (p.108, Figure 7.5 "Check Box") | An independent setting shows a check mark at the left when set; a mixed selection shows the menu without the check mark. | `_Menu.scss` `.classicyMenuItemCheck.checked` (7 × 6 check in the item's ink), `.mixed` | 🔧 see 7.2 |
| "Types of Menu Items" (p.108, Figure 7.5 "Option Button") | An interdependent setting shows a round bullet at the left of the chosen item. | core ClassicyMenuItem (`checked?: boolean \| "mixed"` only) | ⚠️ see 7.13 |
| "Types of Menu Items" (pp.108–109, Figure 7.5 "Default Item") | The default item (the double-click's command) is bold. | core ClassicyMenuItem (no default flag) | ⚠️ see 7.14 |
| "Menu Item Labels" (pp.109–110) | Unique, brief, book-title capitalization; no per-item bold, italic or underline. | `_Menu.scss` (one weight, the UI face, `line-height: 1`); bundled item names | ✅ |
| "Shortcut Keys in Menu Items" (p.110) | Shortcuts left-aligned at the first tab position after the longest item in the menu that has one. | `_Menu.scss` `.classicyMenuItemKeyboardShortcut` | 🔧 see 7.3 |
| "Shortcut Keys in Menu Items" (p.110) | Spell shortcuts as inscribed on the keycap: Ctrl+key, Shift+key, Fn. | core ClassicyKbd / ClassicyKeyboardShortcut (glyphs ⌃ ⌥ ⇧ ⌘, the Mac adaptation) | ⚠️ see 7.15 |
| "Command Buttons" (p.114, Figure 7.8 "A menu button") | A menu button is a command button whose label includes the down-pointing cascade arrow; its menu hangs below, left edges aligned. | `_PopUpMenu.scss` (`.classicyBevelButtonArrow*`, 7 × 4 down / 4 × 7 right triangle; the pop-up panel in the menu frame), `_Placard.scss` (`.classicyPlacardArrow`, the placard's menu) | ✅ |
| "Menu Items" (p.107), Figure 7.5 | A disabled item in a button's menu is browsed like any item: the band tracks it, its text GrayText, choosing does nothing. | `_Placard.scss` `.classicyPlacardMenuItem:disabled` | 🔧 see 7.4 |
| Figures 7.2, 7.5 (pp.100, 106); colors Ch.13 | A menu is a ButtonFace panel in the raised window edge (ButtonLight then ButtonHilight top-left, ButtonDkShadow then ButtonShadow bottom-right), no drop shadow, sized to its items. | `_Menu.scss` `menu-frame` (`b.window-frame`, padding 3 px, `min-width: 0` against the core's 180-px floor); `windows98.json` `menuFrame.shadowWidth` 0 | ✅ |

### Findings — Chapter 7, Menus

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 7.1 | MEDIUM | No access-key underlines: ClassicyMenuItem has no access-key field and titles render as plain text. Every Windows menu figure (7.1, 7.2, 7.4, 7.5, 7.8) shows the underline. | core ClassicyMenu; `_Menu.scss`, `_MenuBar.scss` | ⚠️ Deferred (core hook) |
| 7.2 | LOW | A mixed setting (`checked: "mixed"`) drew the Mac's 7 × 2 dash in the check gutter; the WIG shows a mixed state with no mark. | `_Menu.scss` (`.classicyMenuItemCheck.mixed`) | 🔧 Fixed |
| 7.3 | LOW | Shortcuts were right-aligned (Mac OS 8's column); Windows left-aligns them at one tab position after the longest item. | `_Menu.scss` (`.classicyMenuItemKeyboardShortcut`) | 🔧 Fixed |
| 7.4 | LOW | A disabled placard-menu item was not tracked under the pointer (`:hover:not(:disabled)`), unlike the pull-downs' disabled items. | `_Placard.scss` (`.classicyPlacardMenuItem`) | 🔧 Fixed |
| 7.5 | LOW | No press-drag-release: a menu title opens on click, items are chosen on click or Enter; no mouseup handling in the menu code. | core ClassicyMenu / ClassicyDesktopMenuBar | ⚠️ Deferred (core) |
| 7.6 | LOW | An untouched open menu closes itself after 15 s (`DEFAULT_IDLE_TIMEOUT_MS`); Windows keeps it until the next click. | core ClassicyMenuProvider | ⚠️ Deferred (core layout flag) |
| 7.7 | LOW | No menu keyboard navigation (Left/Right between titles, Up/Down within a menu, Escape by levels); items are `tabIndex={-1}` and only Enter is handled. The package already draws the keyboard-tracked item and title as the band. | core ClassicyMenu | ⚠️ Deferred (core) |
| 7.8 | LOW | Escape does not close an open contextual menu. | core ClassicyContextualMenu | ⚠️ Deferred (core) |
| 7.9 | LOW | Shift+F10 and the ContextMenu key open nothing; contextual menus open from the `contextmenu` event alone. | core ClassicyContextualMenuTarget / ClassicyDesktop | ⚠️ Deferred (core) |
| 7.10 | LOW | No window pop-up (system) menu; a title bar's button 2 shows the window's or app's `contextMenu` only. Same as 6.2. | core ClassicyWindow | ⚠️ Deferred (core/product) |
| 7.11 | LOW | Finder's icon menus are the Mac's (Open, Restore, Move To Trash): no Rename, Create Shortcut or Properties (Get Info), Properties last. | core Finder | ⚠️ Deferred (core/product) |
| 7.12 | LOW | A hover-opened submenu opens at once and stays open when the pointer rests on a leaf sibling of its parent (nothing calls `onClose`); Windows uses a show and a hide time-out (SPI_GETMENUSHOWDELAY, 400 ms). | core ClassicyMenu | ⚠️ Deferred (core layout flag) |
| 7.13 | LOW | No option-button (radio) mark: `checked?: boolean \| "mixed"` is the only mark kind, `role=menuitemcheckbox`. | core ClassicyMenuItem; `_Menu.scss` | ⚠️ Deferred (core hook) |
| 7.14 | LOW | No default-item flag, so no item can be drawn bold; the vocabulary's `default` state is emitted by buttons only. | core ClassicyMenuItem; `_Menu.scss` | ⚠️ Deferred (core hook) |
| 7.15 | LOW | Chords are written as glyphs (`⌃⌫`, `⌘A`); the WIG spells `Ctrl+`, `Shift+`, `Fn`. A package can style the modifier parts but cannot substitute text. | core ClassicyKbd / ClassicyKeyboardShortcut | ⚠️ Deferred (core layout flag; Mac keyboard adaptation) |

**Details & fixes**

- **7.2** 🔧 (`packages/appearance/windows98/src/styles/components/_Menu.scss`):
  `.classicyMenuItemCheck.mixed::before { background: none }`; the `$dash` art
  and its disabled and tracked rules are gone, the check's rules flattened to
  `.checked` alone; the gutter (`--icon-small-size` wide, `--layout-item-gap`
  after it) stays so titles keep their alignment. Product note: the core's
  `checked: "mixed"` state is now invisible under Windows dress (its
  `aria-checked="mixed"` still reaches assistive technology), which is what
  Windows did. _WIG Ch.7 "Types of Menu Items" (p.108): "you also display the
  menu without the check mark"._
- **7.3** 🔧 (`_Menu.scss`): the exact rule, not an approximation. Each menu list
  (`$menus`) is a two-column grid, `grid-template-columns: 1fr max-content`
  (titles, shortcuts: the first takes the slack so the band spans a stretched
  list, the second is empty with no gutter in a menu with no shortcuts); every
  `.classicyMenuItem` is `display: grid; grid-template-columns: subgrid;
  grid-column: 1 / -1` with `> p { grid-column: 1 }` and the shortcut
  `grid-column: 2; justify-content: flex-start; margin-left: $tab-space`
  (`px(8)`, Windows' MENU_TAB_SPACE as Wine and ReactOS carry it; the WIG gives
  no number); balloon-wrapped rows (`> .classicyMenuItemBalloonAnchor`) are
  subgrids too and separators span `1 / -1`; `display: grid` is set exactly
  where the base shows a list (`.classicyMenu`, `.classicyContextMenu`, and
  `.classicyMenuItem.open > .classicyMenuWrapper > :is(.classicySubMenu,
  .classicyContextSubMenu)`), so a closed submenu stays `display: none`; the
  child-menu indicator's clearance moved from the item's padding to the title's
  `margin-right`. Verified in headless Chromium against a mock of
  ClassicyMenu's DOM: every shortcut starts at one x, 8 px after the longest
  title; the band spans the list's inner width; rows are 17 px; a menu with no
  shortcuts keeps its 6-px right padding; the open submenu sits 3 px above its
  item over the parent's frame; the arrow stays 6 px in. Subgrid is inside the
  browser floor (Chrome 117, Safari 16, Firefox 71 against the floor's
  120/16.2/113). _WIG Ch.7 "Shortcut Keys in Menu Items" (p.110)._
- **7.4** 🔧 (`_Placard.scss`): `&:hover, &:focus` give every item the Hilight
  band with HilightText and `outline: none`; `&:disabled` keeps the embossed
  GrayText; `&:disabled:is(:hover, :focus)` draws GrayText on the band with no
  text-shadow, as `_Menu.scss` draws the pull-downs' disabled items and as
  Windows 9x drew a selected disabled item. _WIG Ch.7 "Menu Items" (p.107)._
- ✅ "The Menu Bar and Drop-down Menus" (p.97): `_MenuBar.scss` clears the base's
  Platinum bevel and rounded corners (`background: b.$face`, `border-radius: 0`),
  titles plain `b.$text` on transparent, hover plain; `.open` and
  `:focus-visible` the band (`--color-highlight` #000080 in Windows Standard,
  `--package-color-selection-text`); the pull-down hangs from the bar's bottom
  under its title's left edge.
- ✅ "Pop-up Menus" (p.100), Figure 7.2: `$menus` covers contextual and
  bevel-button pop-up menus, so the frame, item, disabled, separator and arrow
  rules are one set; ClassicyContextualMenu and ClassicyBevelButtonPopup render
  with `classicyContextMenu`.
- ✅ "Cascading Menus" (p.104): the submenu wrapper is pinned over its item; the
  submenu at `left: 100%` with `margin: $neg-frame 0 0` (−3 px), so its first
  item is level with the parent item and, the item box being 3 px inside the
  menu's edge, its frame overlaps the parent's exactly, as os-gui and 98.css
  reproduce Windows 9x; `classicySubMenuFlipLeft` hangs it at `right: 100%`.
- ✅ "Menu Items" (p.107): `.classicyMenuItem.disabled` is `b.disabled-text`
  (GrayText with the 1-px ButtonHilight shadow), still browsed as the band with
  plain GrayText (specificity (0,4,0) beating the base's transparent rule), the
  mark and arrow embossed alike; a disabled title is embossed too. Caveat: a
  disabled title never takes the band, which only keyboard title tracking
  (absent, 7.7) could show.
- ✅ Figures 7.2, 7.5: `menu-frame` is `b.$face`, padding 3 px (two rings and a
  ring of face), `b.window-frame` (outer ButtonLight/ButtonDkShadow, inner
  ButtonHilight/ButtonShadow), inset shadows only so no drop shadow
  (`menuFrame.shadowWidth` 0); `min-width: 0` so the menu sizes to its items; a
  scrolling list redraws the frame on `.classicyMenuScrollShadow`. Nit (not a
  WIG rule): `menuFrame.borderWidth` and `bevelWidth` (1/1 in all presets) are
  emitted as `--menu-frame-border-width`/`-bevel-width` but never read, the frame
  being built from `--window-border-size`; see Next pass.
- ✅ "Command Buttons" (p.114), Figure 7.8: `_PopUpMenu.scss`
  `.classicyBevelButtonArrowVertical::before` is the 7 × 4 down triangle in the
  label's ink (Horizontal the 4 × 7 right one); `_Placard.scss`
  `.classicyPlacardArrow` the same triangle, embossed when disabled, the content
  stepping a pixel down-right while pressed or open; the placard's menu is a
  Windows menu (`b.window-frame` around ButtonFace with 3-px padding, items 6 px
  in, the tracked item HilightText on Hilight); bevel pop-ups open below,
  start-aligned, in the same frame.
- **7.1** ⚠️ core hook: `accessKey?: string` on ClassicyMenuItem (one character;
  or an `&` marker in `title`), rendered by ClassicyMenuItemComponent as
  `<span data-classicy-part="access-key">` around the title's first
  case-insensitive match, in pull-down items and menu-bar titles alike (the
  part name added to the vocabulary and the ClassicyVocabulary test's
  allowlist). Package follow-up ready: `_Menu.scss` and `_MenuBar.scss`
  `[data-classicy-part="access-key"] { text-decoration: underline;
  text-underline-offset: 0; }` (Windows 95/98 always showed the underline;
  hiding it until ALT came with Windows 2000). ALT+key activation stays with
  the Mac keyboard adaptation. _WIG Ch.7 "Menu Titles" (p.106), Figure 7.4;
  Ch.8 "Navigation in Secondary Windows" (pp.148–149)._
- **7.5** ⚠️ core: a mousedown on a title opens its menu and, while the button
  is held, a document `mouseup` over an item `click()`s it (the idiom
  ClassicyBevelButton's hold trigger uses) and a `mouseup` off every menu
  closes all; a quick click keeps today's sticky behavior. Mac OS 8 wants the
  same gesture. _WIG Ch.7 "Drop-down Menu Interaction" (p.97)._
- **7.6** ⚠️ core: `layout.menuBar.idleTimeoutMs?: number` (0 = never close)
  passed by ClassicyDesktopMenuBar and ClassicyWindowMenuBar as the
  `idleTimeoutMs` prop of the ClassicyMenuProvider they mount (the prop exists;
  15000 stays the default for Platinum and System 7); Windows 98's layout sets
  0. _WIG Ch.7 (p.97); Ch.14 "Timing and Navigational Interfaces" (p.333)._
- **7.7, 7.8, 7.9** ⚠️ core: roving focus on the `<li>`s (so the package's
  `:focus-visible` band shows): ArrowLeft/ArrowRight between titles with
  wrap-around (opening the new title's menu when one was open), ArrowUp/ArrowDown
  within a menu skipping separators, ArrowRight opening a submenu on its first
  item, ArrowLeft closing it, Enter choosing, Escape closing one level and
  leaving the title highlighted, a second Escape deactivating the bar; Escape
  closing an open contextual menu through the provider's `onClose`; Shift+F10
  and `e.key === "ContextMenu"` on ClassicyContextualMenuTarget, the window root
  and ClassicyDesktopIcon opening the target's menu at its bottom-left corner,
  placed as a pointer-opened one. _WIG Ch.7 (p.98), "Pop-up Menu Interaction"
  (p.101)._
- **7.10** ⚠️ core/product: `layout.window.systemMenu?: boolean` set by the
  package; when true ClassicyWindow prepends Restore/Zoom, Move, Size,
  Minimize/Collapse, Maximize, a separator and Close to the title bar's
  contextual menu (Move and Close alone for utility and modal windows).
  _WIG Ch.7 "The Window Pop-up Menu" (p.102)._
- **7.11** ⚠️ core/product: Finder's `itemContextMenu` and the desktop icons'
  menus gain Rename (begins the label edit), Create Shortcut (an alias) and a
  Properties analogue (Get Info) placed last, Open first and Move To Trash
  before them; package-agnostic, since menu content is the core's. _WIG Ch.7
  "Icon Pop-up Menus" (pp.102–103)._
- **7.12** ⚠️ core: `layout.menu.submenuDelayMs` (Platinum and System 7 0,
  Windows 98 400 = SPI_GETMENUSHOWDELAY's default): ClassicyMenuItemComponent's
  `handleMouseEnter` arms a timer before `onOpen(id, "pointer")`, cleared on
  mouseleave; ClassicyMenu's `handleMouseEnter` on a leaf sibling arms the same
  delay before `setOpenChildId(null)`, cleared when the pointer enters the open
  submenu's wrapper, so a diagonal drag survives; click and Enter stay
  immediate. _WIG Ch.7 "Cascading Menus" (pp.104–105)._
- **7.13** ⚠️ core hook: `mark?: "check" | "bullet"` on ClassicyMenuItem
  (default `"check"`); with `"bullet"` the role is `menuitemradio` and the gutter
  span carries `classicyMenuItemBullet` beside `classicyMenuItemCheck`. Package
  follow-up ready: `.classicyMenuItemBullet.checked::before { width: px(6);
  height: px(6); background: pixel-art(currentColor, runs(("..xx..", ".xxxx.",
  "xxxxxx", "xxxxxx", ".xxxx.", "..xx.."), "x")); }`, embossed when disabled.
  _WIG Ch.7 "Types of Menu Items" (p.108), Figure 7.5 "Option Button"._
- **7.14** ⚠️ core hook: `isDefault?: boolean` on ClassicyMenuItem emitted
  through `classicyStateClasses({ default })` on the item's `<li>`; package
  follow-up ready: `:is(#{$menus}) .classicyMenuItem.default > p { font-weight:
  bold; }` (harmless ahead of the core); Finder's Open would pass it. _WIG Ch.7
  (pp.108–109), Figure 7.5 "Default Item"; Ch.13 "Font and Size" (p.311)._
- **7.15** ⚠️ core: `layout.menu.shortcutSpelling?: "glyphs" | "names"` read by
  ClassicyKbd's inline variant: `"names"` writes `Ctrl+`, `Alt+`, `Shift+` and
  `Fn` with `+` separators (Classicy's Control chord reads Ctrl+, Option Alt+;
  Command has no Windows name, a product decision: keep its glyph or spell it
  Win+); Windows 98 sets `"names"`, Platinum and System 7 keep glyphs. The
  brief lists Mac keyboard equivalents as an intentional adaptation, hence LOW.
  _WIG Ch.7 "Shortcut Keys in Menu Items" (p.110)._

---

## Chapter 7 — Controls, Toolbars and Status Bars

Pages read: PDF 120–153 (Controls pp.110–138, Toolbars and Status Bars
pp.139–143). Where the text gives no number (the focus rectangle's row, Table
7.4), Windows' own `DrawFrameControl`/`DrawFocusRect` geometry decides, and
where the 1995 figure and Windows 98 differ (raised toolbar buttons against
TBSTYLE_FLAT), Windows 98 as shipped wins and the choice is recorded.

Normative checklist (WIG Ch.7, Controls, Toolbars and Status Bars) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Command Buttons" (p.114, Figure 7.7) | A rectangular control with a text or graphic label; mouse down shows the pressed look and moves the focus, dragging off restores it, the command runs on release over the button; the default button ringed in black outside its bevel. | `_Button.scss` `.classicyButton` (ButtonFace, `b.raised`, `--push-button-height` 23, `--button-min-width` 75, `--button-text-padding` 12; pressed `b.pressed` with the label +1,+1; `.default` ringed in WindowFrame, pressed flat); core ClassicyButton (native `<button>`) | ✅ |
| "Command Buttons" (p.114) | SPACEBAR activates the focused button; TAB and arrows move between buttons. | core ClassicyButton (Enter/Space click and flash) | ✅ |
| "Command Buttons" (p.114) | An unavailable button's label is displayed as unavailable (Table 7.4: embossed gray on the raised face). | `_Button.scss` `.classicyButton:disabled`, `.classicyBevelButton.disabled` (`b.disabled-text`) | ✅ |
| "Command Buttons" (p.114) | Ellipsis for a command needing more information; `>>` on an unfold button. | host copy | ➖ |
| "Command Buttons", Table 7.4 (p.115) | Seven appearances: normal, pressed, option-set (ButtonHilight checkerboard over the face), unavailable, option-set unavailable, mixed-value, input focus (a dotted rectangle inside the bevel). | `_Button.scss` `$checker` (`repeating-conic-gradient` of `--color-system-01` and `-03` on a 2 × 2 `--pixel-unit` tile), `.classicyBevelButton` `.checked`/`.mixed`/`.disabled`/`:focus-visible` | ✅ (the mixed and disabled-set refinements are 13.4, 13.5) |
| "Command Buttons", Table 7.4 (p.115) | The focus rectangle lies inside the bevel with a pixel of face between (Windows: the client rectangle less the 2-px edge, deflated once more: the 4th pixel row, the 5th on a default button). | `_Button.scss` `focus-line(var(--push-button-focus-inset))`; `windows98.json` `pushButton.focusInset` | 🔧 see 7.16 |
| "Command Buttons" (p.116, Figure 7.8) | A menu button is a command button with the cascade arrow; pressed it is pressed; while its menu shows it takes the option-set look; unavailable the unavailable look. | `_Button.scss` `.classicyBevelButton.open`; `_PopUpMenu.scss` arrows; `_ControlStrip.scss` module `.open` | 🔧 see 7.17 |
| "Option Buttons" (p.117, Figure 7.9) | Small circles, a dot in the middle when set, empty when not; groups of two to seven; a text label in sentence capitalization. | `_RadioInput.scss` (the 12 × 12 circle as four arcs, ButtonShadow/ButtonDkShadow upper left, ButtonLight/ButtonHilight lower right, over Window white; the 4 × 4 dot, corners off, at (4,4) on `.checked`); `radio.size` 12 | ✅ |
| "Option Buttons" (p.117, Figure 7.10) | Mixed value: every button without a setting dot. | `_RadioInput.scss` `.classicyRadioInput.mixed` | 🔧 see 7.18 |
| "Option Buttons" (pp.117–118) | The label shows unavailability; clicking circle or label chooses; pressed look on mouse down, the setting changes on release; TAB and arrows navigate. | `_RadioInput.scss` (`:active` inside ButtonFace, `.disabled` inside ButtonFace with a GrayText dot, label embossed); core native radio + label | ✅ |
| "Check Boxes" (p.119, Figure 7.11) | A square box with a label; a check mark when set; click box or label toggles; pressed on mouse down, toggled on release; SPACEBAR toggles; the label shows unavailability. | `_Checkbox.scss` (`--checkbox-size` 13 in a `--checkbox-margin` 2, Window white in `b.sunken`; the 7 × 7 WindowText check three pixels in; pressed ButtonFace with the mark kept; disabled ButtonFace with a GrayText mark; label embossed) | ✅ |
| "Check Boxes" (pp.119–120, Figure 7.12) | Mixed value: a checkerboard inside the box; set, clear, mixed on successive clicks. | `_Checkbox.scss` `.classicyCheckbox.mixed` (the 50 % checker face with the mark in GrayText, Wine's DFCS_BUTTON3STATE; pressed or disabled ButtonFace); core `mixed` prop | ✅ |
| "List Boxes" (pp.120–121) | Choices in a bordered box; no label of its own (a static text label); disabled: the label unavailable and, if possible, every entry. | `_ListBox.scss` (`client-edge`: Window white in `b.sunken`, the rows and scroll bar inside the rings; disabled rows GrayText on white, the selection kept, as user32 paints it); core label `disabled` | ✅ |
| "List Boxes" (p.121) | Wide enough for the average entry; else ellipsis or a horizontal bar. | host sizing; base `white-space: nowrap` | ➖ |
| "List Boxes" (p.121) | Click selects; scroll bars when the items exceed the area; arrows and text keys select. | core ClassicyListBox (`useListNavigation`), ClassicyScrollArea | ✅ |
| "List Boxes" (p.122); "Scroll Bars" (p.134) | Disable the arrow at the beginning or end; both when everything fits (and, per Ch.6, enlarge the box to fill the shaft); the system does not disable arrows by default. | `_ScrollBar.scss` `.fits`; core ClassicyScrollArea states | ⚠️ see 7.24 (= 6.8); full-length box 6.9 |
| "Single Selection List Boxes" (p.122, Figure 7.13) | Three to eight rows tall, always a vertical bar, the selected row Hilight under HilightText across the row; 8-pt MS Sans Serif rows (13 px). | `_ListBox.scss` (`--classicy-listbox-row-height`, the 8-row cap, `.selected`); `layout.scrollBar.fitsBars` | 🔧 see 7.19 |
| "Single Selection List Boxes" (pp.122–123) | Arrows, HOME, END, PAGE UP/DOWN and text keys navigate; a mixed-value list shows no selection. | core ClassicyListBox | ✅ |
| "Drop-down List Boxes" (p.123, Figure 7.14) | Closed: the value in a sunken field with a menu button at the right; open: a white list in a black line below, the current item highlighted; press on either part opens, choosing closes. | `_PopUpMenu.scss` (`field` Window white in `b.sunken`, `--pop-up-height` 21, the value `--pop-up-text-inset` 4 in; the raised ButtonFace button `--pop-up-button-width` 16 with the 7 × 4 triangle, pressed flat while open; the list Window white in a 1-px ButtonDkShadow line, 13-px rows, the tracked row a Hilight band; disabled ButtonFace with GrayText and an embossed triangle) | ✅ |
| "Drop-down List Boxes" (p.123) | The closed field a few spaces wider than the average item; the open list three to eight items tall. | core `--menu-pop-up-max-height` (`menu.popUpMaxHeight`, core floor 300) | 🔧 see 7.20 |
| "Drop-down List Boxes" (p.123) | UP/DOWN or ALT+UP/DOWN open; arrows and text keys select; leaving the control closes; a mixed drop-down shows no value. | core ClassicyPopUpMenu (`onButtonKeyDown`, placeholder) | ✅ |
| "Extended and Multiple Selection List Boxes" (pp.124–125, Figure 7.15) | The single-selection height and width; a flat-style check box before each item of a multiple selection list. | core ClassicyListBox `selection="multiple"` (highlighted rows, no check part) | ⚠️ see 7.25 |
| "List View Controls" (p.125) | Icon, small icon, list and report views; sorting, label editing, drag and drop, pop-up menus, region selection. | core Finder / ClassicyFileBrowser, ClassicyTable; `_Table.scss`, `_Icon.scss` | ✅ structure (label editing is the core's content) |
| "Tree View Controls" (pp.125–126, Figure 7.16) | An indented outline with expand/collapse buttons and lines (best both); UP/DOWN between items, LEFT/RIGHT along a branch, RIGHT expands; ENTER or double-click runs the default. | `_Button.scss` `.classicyTriangle` (the 9 × 9 tree button: a ButtonShadow line on Window white with a black + or −); `_ListBox.scss` tree rules; core ClassicyTree keys | 🔧 lines, see 7.21; ⚠️ bare Right Arrow, see 7.21 |
| "Text Fields" (pp.127–128) | No label of its own (a static text label shows unavailability); TAB reaches them; read-only fields show text that can be selected but not edited. | `_TextField.scss` (`.classicyControlLabel.disabled` embossed, disabled fields ButtonFace with plain GrayText, the read-only well) | ✅ |
| "Text Boxes" (p.128, Figure 7.17) | A rectangular control for one or more lines; the border typical in dialogs (a white field in the sunken two-ring edge); scroll bars for multi-line boxes. | `_TextField.scss` (`client-edge`: Window white in `b.sunken`, `field.height` 21, `field.paddingX` 4, `field.paddingY` 3, caret WindowText, selection HilightText on Hilight, no focus ring; the multiline editor's bars inside the rings) | ✅ |
| "Rich-Text Boxes" (pp.128–129, Figure 7.18) | A text box with character and paragraph formatting, in the same bordered box. | `_TextField.scss` `.classicyRichTextEditor` (the toolbar a ButtonFace band, the prose in the body face) | ✅ |
| "Combo Boxes" (p.129, Figure 7.19) | A text box with an always-visible list below it. | none (Classicy has no always-open combo box) | ➖ |
| "Drop-down Combo Boxes" (pp.129–130, Figure 7.20) | A drop-down list whose text box is editable; the menu button opens and closes the list. | `_PopUpMenu.scss` (`.classicyComboBox`, `-Input`, `-Indicator`); core ClassicyComboBox | ✅ |
| "Spin Boxes" (p.131, Figure 7.21) | A text box with a pair of small up-down buttons flush at its right; the top increases, the bottom decreases by one unit; clicking either focuses the text box. | `_LittleArrows.scss` (the pair `--window-scrollbar-size` 16 wide, each a raised ButtonFace button with a 5 × 3 WindowText triangle one pixel left of center, pressed flat, disabled embossed; flush to the field, stretched to its height); `_TextField.scss` `.classicySpinner` | ✅ look |
| "Spin Boxes" (p.131) | Typically wrap at either end; with the focus, UP/DOWN ARROW change the value. | core ClassicySpinner (clamps; arrow keys not bound) | ⚠️ see 7.26 |
| "Static Text Fields" (p.131, Figure 7.22) | Read-only text on the dialog face; a label's access key moves the focus to its control. | `_TextField.scss` `.classicyControlLabel` (WindowText; disabled GrayText embossed), `.classicyOutput` | ✅ |
| "Shortcut Key Input Controls" (pp.131–132) | A special text box accepting a key combination and displaying it with its modifiers; labeled by a static text field. | `_Dialog.scss` `output.classicyOutput.classicyKeyboardEquivalentDisplay` (an edit control: Window white in `b.sunken`, the field's height and inset, left-aligned; disabled ButtonFace with plain GrayText); core ClassicyKeyboardEquivalentField | ✅ |
| "Group Boxes" (p.133, Figure 7.23) | An etched rectangular frame with an optional label breaking the top line at the upper left (sentence capitalization); processes no input. | `_ControlGroup.scss` (`.classicyControlGroupFieldsetPrimary::before` `b.etched`, two rings; the legend WindowText in the UI font on a ButtonFace strip, its ink 7 px from the frame's outer edge, GB_Paint's deflate-by-7) | ✅ |
| "Column Headings" (pp.133–134, Figure 7.24) | Header parts over the columns acting as command buttons (sort on click); labels text and/or image, aligned left, right or center; draggable divisions. | `_Table.scss` (`.classicyTableColumnHeader` raised ButtonFace, pressed while the mouse is down, raised again sorted or not; no sort arrow or stripe, Windows 98's; `aria-sort` carries the order); core ClassicyTable (align, resizable) | ✅ |
| "Tabs" (p.134, Figure 7.25) | One row of tabs by default; a tab sized to its label; the system font; raised tabs on the raised page, the chosen tab forward and joined to the page. | `_Tabs.scss` (raised ButtonFace tabs open at the bottom, `tabControl.radius` 3, `paddingX` 10, `height` 21; the chosen tab `lift` 2 higher and two rings wider, its face running over the panel's edge; the panel `b.raised`, content `padding` 12 in; scroll arrows 16 wide; one tab size: the small tabs keep the UI font) | ✅ |
| "Tabs" (p.134) | Clicking a tab switches; LEFT/RIGHT move between tabs; CTRL+TAB switches. | core ClassicyTabs (roving tablist) | ✅ |
| "Property Sheet Controls" (p.134) | Tabbed property pages (details Ch.8). | Ch.8 | see Ch.8 |
| "Scroll Bars" (pp.134–135) | Scroll bar controls only for scrolling; disable an arrow at the end; no input focus on bars. | core ClassicyScrollArea (bars `aria-hidden`, never focusable) | ✅ focus; ⚠️ arrows 7.24 |
| "Sliders" (p.135, Figure 7.26) | A bar defining the range and an indicator; drag or click in the bar's hot zone moves it; TAB reaches it, arrows move it; orientation, lengths, increments and ticks optional; a sunken channel, a pointed thumb pointing down, ticks below. | `_Slider.scss` (`slider.channel` 4 in `b.sunken`, the pointed raised thumb `thumbAlong` 11 × `thumbAcross` 21 with a 5-row point, `thumbRise` 5; dragged, highlighted or disabled the 55AA dithered face; ticks `tickWidth` 1 × `tickHeight` 4 WindowText on the pointed side, centered on the tip; the focus rectangle around the control); core ClassicySlider | ✅ |
| "Progress Indicators" (p.135, Figure 7.27) | A bar filling left to right in highlight-colored blocks in a sunken bar; noninteractive. | `_ProgressBar.scss` (`progressBar.height` 16 in the one-ring sunken edge, `blockWidth` 8, `blockGap` 2, `inset` 2; Hilight blocks) | ✅ |
| "Tooltip Controls" (p.136, Figure 7.28) | A small pop-up of descriptive text: a cream box in a 1-px black line, no tail. | `_BalloonHelp.scss` (`--package-color-tooltip-face` #ffffe1 and `-text`, a 1-px `--color-window-border` line, `tooltip.paddingX` 4, `paddingY` 2, square corners, the tail hidden) | ✅ |
| "Tooltip Controls" (p.136) | Appears after a time-out, removed on click or when the pointer leaves; shown at the lower right of the pointer, adjusted at the screen edge. | core `useClassicyBalloonHelp` (600 ms; placed by the anchor; hides on mouse leave, not on click) | ⚠️ see 7.27 |
| "Wells" (p.136, Figure 7.29) | A field for graphic values with the check box's or text box's sunken border; the set value marked by a special selection border around the control's edge; grouped and labeled. | `_Icon.scss` `.classicyImageWell` (`b.sunken` around Window white; `.selected` a dotted WindowText rectangle two rings in; drag-over dashed; disabled ButtonFace); `_AppearanceManager.scss` swatches (`b.sunken` wells) | ✅ border; ⚠️ set-value border, see 13.7 |
| "Pen-Specific Controls" (pp.136–138, Figures 7.30–7.33) | Boxed edit, ink edit, writing tool and eraser controls. | none | ➖ |
| "Toolbars and Status Bars" (p.139, Figure 7.34) | A toolbar is a panel of controls for quick access; Figure 7.34 shows raised 3-D buttons on the face. | `_Button.scss` `.classicyButtonToolbar .classicyBevelButton` (flat, TBSTYLE_FLAT); `_ControlStrip.scss` cells (`b.raised-thin`) | ⚠️ see 7.23 (product: Windows 98's flat buttons kept) |
| "Toolbars and Status Bars" (p.139, Figure 7.35) | A status bar at the window's bottom with panes of read-only text, each a one-ring sunken field, the size grip at the right end. | `_Placard.scss` `.classicyPlacard` (ButtonFace in the one-ring sunken edge, BDR_SUNKENOUTER, text 3 px in); the grip `_Window.scss` | ✅ |
| "Interaction with Controls in Toolbars and Status Bars" (p.140) | Property controls apply directly to the selection; always a tooltip for a control without a text label. | core ClassicyControlStrip (`aria-label` only); ClassicyBalloonHelp for host toolbars | ⚠️ see 7.28 |
| "Support for User Options" (p.140) | Toolbar buttons in two sizes, 24 × 22 and 32 × 30, images no larger than 16 × 16 and 24 × 24; let the user switch sizes and show or hide bars. | `_Button.scss` toolbar sizes; `windows98.json` `toolbar` family | 🔧 see 7.22 |
| "Support for User Options" (pp.140–141) | Toolbars docked by default and movable, a dotted outline as drag feedback; position, size and state preserved. | core ClassicyControlStrip (Control-drag docks left or right, position persisted) | ✅ (for the one toolbar Classicy has) |
| "Support for User Options" (p.141) | With a status bar's size grip shown, hide the grip at the scroll bars' junction. | one grip, in the scroll bars' corner (Ch.6 "Size Grip") | ✅ |
| "Common Toolbar Buttons", Table 7.5 (pp.142–143) | The standard 16 × 16 and 24 × 24 images for New, Open, Save, Print, Cut, Copy, Paste, Undo, the views and the rest, only for those functions. | none (the package registers no art) | ➖ |

### Findings — Chapter 7, Controls

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 7.16 | LOW | The push button's focus rectangle lay on the 5th pixel row (`pushButton.focusInset` 4: two of bevel, two of face), the default button's on the 6th; Windows paints it on the 4th (the client rectangle less the 2-px edge, deflated once more; 98.css's `outline-offset: -4px`), the 5th on a default button. | `windows98.json`, `_Button.scss` | 🔧 Fixed |
| 7.17 | LOW | A bevel button whose pop-up menu was open took the pressed rings on a plain face; the WIG gives a displayed menu button the option-set checkerboard. | `_Button.scss` (`.classicyBevelButton.open`) | 🔧 Fixed |
| 7.18 | LOW | A mixed radio button drew a 6 × 2 dash inside the circle; Figure 7.10 draws every button of a mixed group with no dot at all. | `_RadioInput.scss` (`.classicyRadioInput.mixed`) | 🔧 Fixed |
| 7.19 | LOW | List rows were 16 px (`--control-static-text-height`, the nearest knob); Figure 7.13's 8-pt MS Sans Serif rows are 13 px, the package's own drop-down rows. | `_ListBox.scss`, `windows98.json` (`listBox.rowHeight`) | 🔧 Fixed |
| 7.20 | LOW | An open drop-down list could show up to the core's 300-px floor (`--menu-pop-up-max-height`), about 23 rows; the WIG shows three to eight. | `windows98.json` (`menu.popUpMaxHeight`), `_PopUpMenu.scss` | 🔧 Fixed |
| 7.21 | LOW | The tree view drew its +/− buttons but no hierarchy lines (TVS_HASLINES); the WIG says it is best to include both. A bare Right Arrow does not expand a branch (the Mac's modifier+arrow does). | `_ListBox.scss`; core ClassicyTree | 🔧 Fixed (lines); ⚠️ Deferred (keys, core) |
| 7.22 | LOW | Toolbar bevel buttons took the base's Platinum sizes (square widths 24/36/48, height by content); the WIG names 24 × 22 and 32 × 30 with 16 × 16 and 24 × 24 images. | `_Button.scss`, `windows98.json` (`toolbar` family) | 🔧 Fixed |
| 7.23 | LOW | Toolbar buttons are flat at rest (TBSTYLE_FLAT: one raised ring under the pointer, one sunken ring pressed or latched), the Windows 98 shell's and IE4's; Figure 7.34 (1995) shows raised 3-D buttons. | `_Button.scss` (`.classicyButtonToolbar .classicyBevelButton`) | ⚠️ Deferred (product: Windows 98 as shipped kept) |
| 7.24 | LOW | A list box's or scroll area's arrow at the start or end of its travel stays enabled (the core publishes `fits` per bar only). Same mechanism as 6.8. | core ClassicyScrollArea; `_ScrollBar.scss` | ⚠️ Deferred (core hook) |
| 7.25 | LOW | A multiple-selection list box highlights rows and renders no check-box part before each item. | core ClassicyListBox; `_ListBox.scss` | ⚠️ Deferred (core hook) |
| 7.26 | LOW | The spin box ignores Up/Down Arrow and clamps at its limits rather than wrapping. | core ClassicySpinner | ⚠️ Deferred (core) |
| 7.27 | LOW | The tooltip is placed by its anchor (the balloon's positions) rather than below-right of the pointer, and a click on the control does not hide it. | core `useClassicyBalloonHelp` | ⚠️ Deferred (core layout flag) |
| 7.28 | LOW | The Control Strip's unlabeled cells (modules, collapse box, scroll arrows) carry `aria-label`s but no tooltip. | core ClassicyControlStrip | ⚠️ Deferred (core) |

**Details & fixes**

- **7.16** 🔧 (`packages/appearance/windows98/src/windows98.json`,
  `.../_Button.scss`): `pushButton.focusInset` 4 → 3 in `defaults` and all 18
  presets, so `focus-line(var(--push-button-focus-inset))` lays the dotted line
  on the 4th pixel row (two rings of bevel, one of face) and the default button's
  `focus-line(inset + 1)` on the 5th; the partial's header says so and cites the
  rule. The WIG gives no number (Table 7.4's tile cannot be counted); Windows'
  DrawFrameControl/PB_Paint/DrawFocusRect geometry and 98.css agree on the row.
  _WIG Ch.7 "Command Buttons", Table 7.4 (p.115)._
- **7.17** 🔧 (`_Button.scss`): `.classicyBevelButton:not(.disabled):is(.checked,
  .mixed, .open) { background: $checker; }` (was `.checked`/`.mixed` only), so an
  open pop-up bevel button shows the option-set face while its menu is up; the
  flat toolbar rule (one sunken ring while open) is unchanged. _WIG Ch.7
  "Command Buttons" (p.116), Figure 7.8._
- **7.18** 🔧 (`_RadioInput.scss`): `.classicyRadioInput.mixed { opacity: 1;
  background: well(); }` draws the empty inside in the state's face over the
  wrapper's dot (so a checked-and-mixed button shows no dot and a pressed mixed
  button still shows the ButtonFace inside); the `$dash` art is removed. _WIG
  Ch.7 "Option Buttons" (p.117), Figure 7.10._
- **7.19** 🔧 (`windows98.json`, `_ListBox.scss`): new family `listBox {
  rowHeight: 13 }` in `defaults` and all presets (emitted as
  `--list-box-row-height`, the name System 7 already uses); `.classicyListBox {
  --classicy-listbox-row-height: var(--list-box-row-height) }`, so rows are
  13 px and the eight-row cap (`max-height: 8 rows + the two rings each way`)
  follows. Not an editable knob (a fixed Windows metric, like `pushButton`), so
  no `knobs` entry; `docs/AGENT-REFERENCE.md`'s Windows 98 family list names
  it. _WIG Ch.7 "Single Selection List Boxes" (p.122), Figure 7.13._
- **7.20** 🔧 (`windows98.json`, `_PopUpMenu.scss`): new family `menu {
  popUpMaxHeight: 106 }` in `defaults` and all presets, the package's own value
  of the core's structural knob (`--menu-pop-up-max-height`, core floor 300):
  8 rows × 13 px + the list's two 1-px lines (the list is border-box), read by
  `ClassicyPopUpMenu.scss` and the core's placement for the pop-up and combo
  box lists; the partial's header notes the cap. _WIG Ch.7 "Drop-down List
  Boxes" (p.123)._
- **7.21** 🔧 (`_ListBox.scss`): Explorer's lines (TVS_HASLINES + TVS_LINESATROOT)
  as dotted ButtonShadow (`repeating-linear-gradient` on the `--pixel-unit`
  grid, 1 on / 1 off) drawn as each `.classicyTreeNodeRow`'s background from its
  content box (`background-origin: content-box`, since rows indent by inline
  padding): a vertical line down the middle of the 12-px button column (`px(6)`)
  and an 8-px stub at the row's middle (`px(8)`, the 17-px row's tree-button
  bar) toward the icon; a group's last item ends its line at the stub, the
  root's first item begins there (alone at the root: stub only); a parent with
  siblings below carries its line on beside its open children
  (`.classicyTreeNode:not(:last-child) > .classicyTreeGroup`, at the parent's
  column, which each group learns a level at a time through
  `--windows98-tree-column` / `--windows98-tree-parent-column`, no
  self-reference, no multiplier). Standard File's well (a list view) is
  excluded like the label rules; the tree button, drawn over it, hides the
  line. The geometry assumes the package's 17-px rows (`window.controlSize` 12
  + `paddingSize` 5), fixed by every preset. ⚠️ core (keys): ClassicyTree
  expands a closed branch on a bare ArrowRight (and collapses on ArrowLeft,
  moving to the parent when closed) when the active package's layout declares
  `tree: { keys: "windows" }`. _WIG Ch.7 "Tree View Controls" (pp.125–126),
  Figure 7.16._
- **7.22** 🔧 (`windows98.json`, `_Button.scss`): new family `toolbar {
  buttonWidth: 24, buttonHeight: 22, largeButtonWidth: 32, largeButtonHeight:
  30 }` in `defaults` and all presets; every ClassicyButtonToolbar bevel button
  is `box-sizing: border-box` at the row height (32 × 30 for the base's default
  large toolbar, 24 × 22 under `.classicyButtonToolbarSizeMedium`/`-Small`), an
  icon-only (`.classicyBevelButtonSquare`) button takes the width and `padding:
  px(3) px(4)` so its image is 24 × 24 or 16 × 16, a labeled button keeps its
  width at the row height, and the help button (its "?" placed on a 20 × 21 box)
  keeps its own size via `:not(.classicyHelpButton)` and a height restatement.
  comctl32's own 16-px-image buttons measured 23 × 22, one pixel narrower than
  the WIG's 24; the WIG's figure is applied. _WIG Ch.7 "Support for User
  Options" (p.140); Ch.13 "Font and Size" (p.311)._
- ✅ "Command Buttons" (p.114): `.classicyButton` is ButtonFace in `b.raised`
  (ButtonHilight and ButtonLight at the top and left, ButtonDkShadow and
  ButtonShadow at the bottom and right), 23 tall and 75 wide at least, the label
  12 px from each end; `:active`, `.pressed` and the keyboard flash turn the
  rings (`b.pressed`) and step the label +1,+1; `.default` is ringed in
  WindowFrame one ring outside the bevel and, pressed, drawn flat (the ring and
  one ring of ButtonShadow, Wine's DFCS_FLAT for a pushed BS_DEFPUSHBUTTON);
  disabled, raised with the label embossed. The browser's `:active` drops when
  the pointer leaves a pressed `<button>` and returns over it; the click fires
  on release over it.
- ✅ "Check Boxes" (pp.119–120): the 13-px box in a 2-px margin, Window white
  in `b.sunken`; the 7 × 7 check three pixels in (two of bevel, one of face);
  the "x" mark kept as the HIG's localization opt-in; pressed ButtonFace with
  the mark; disabled ButtonFace with a GrayText mark (Windows embosses no check
  mark); mixed the 50 % checker with the mark in GrayText, on or off; the label
  6 px after the box (98.css's 19-px inset less the box), embossed when
  disabled, carrying the dotted focus rectangle.
- ✅ "Drop-down List Boxes" (p.123), Figure 7.14: `_PopUpMenu.scss`'s field is
  Window white in `b.sunken`, 21 tall, the value 4 px in; the drop-down button a
  raised ButtonFace box 16 wide inside the frame at the right with the 7 × 4
  triangle, pressed flat while the list is open; while focused (however it got
  the focus: Windows 98 hid none) a Hilight band over the value with HilightText
  and the dotted rectangle on its edge; the open list Window white in a 1-px
  ButtonDkShadow line, 13-px rows, the tracked row a band, no check against the
  current item (Windows drew none).
- ✅ "Spin Boxes" (p.131), Figure 7.21: `_LittleArrows.scss` draws the pair
  16 wide, each button raised ButtonFace with a 5 × 3 WindowText triangle one
  pixel left of center, four pixels from the pair's outer edge (so both center
  in an 11-px button at any height), pressed flat with the triangle +1,+1,
  disabled embossed; the stepper's and the pickers' arrows stand flush to the
  field and stretch to its height (the up-down control on its buddy edit).
- ✅ "Group Boxes" (p.133): `.classicyControlGroupFieldsetPrimary::before` is
  `b.etched` over the fieldset's transparent two-ring border (an inset shadow
  stops at the padding box, so the pseudo-element lies in the border); the
  legend's ink 7 px from the frame's outer edge on a ButtonFace strip a pixel
  wider each side (GB_Paint), its line box the font and a pixel (14.1).
- ✅ "Column Headings" (pp.133–134): `_Table.scss`'s header is a row of raised
  ButtonFace buttons, titles `--field-padding-y` × `--field-padding-x` inside,
  pressed (`b.pressed`, the title +1,+1) while the mouse is down and raised
  again at once; Windows 98 marked the sorted column with no stripe, no pressed
  header and no arrow (the arrow came with Windows XP), so the base's arrow is
  not drawn and `aria-sort` carries the order; the WIG's "may include an image
  such as the sort direction" is permissive.
- ✅ "Tabs" (p.134), Figure 7.25: `_Tabs.scss`'s tabs are raised ButtonFace
  boxes open at the bottom, the two top corners rounded by `--tab-control-radius`
  3 (Windows' two-pixel diagonal), labels 10 px from each side; the chosen tab
  stands `--tab-control-lift` 2 higher and two rings wider (TAB_DrawItem's
  SELECTED_TAB_OFFSET), its face running two rings down over the panel's
  ButtonHilight line; the panel `b.raised` with 12 px of padding; the overflow
  arrows raised 16-px boxes with 3 × 5 triangles, pressed flat, disabled
  embossed; `.classicyTabsSizeSmall` keeps the UI font (Windows has no smaller
  tab).
- ✅ "Sliders" (p.135), Figure 7.26: the 4-px channel in `b.sunken` lying
  `--slider-thumb-rise` 5 from the thumb's flat side (comctl32's quarter of the
  thumb's length); the pointed raised thumb 11 along × 21 across with the point
  five rows deep, its diagonals continuing the raised bevel's rings, the tip
  dark; TBS_BOTTOM/TOP/LEFT/RIGHT each drawn as seen, TBS_BOTH a raised box 14
  across; dragged, highlighted or disabled the 55AA checker face; 1 × 4
  WindowText ticks centered on the tip column; the Control Strip's pop-up
  slider the taskbar volume pop-up's vertical trackbar.
- ✅ "Progress Indicators" (p.135), Figure 7.27: the 16-px ButtonFace track in
  the one-ring sunken edge comctl32 draws (`DrawEdge(BDR_SUNKENOUTER)`, not the
  two-ring client edge), the Hilight blocks 8 wide with a 2-px gap starting
  `--progress-bar-inset` 2 inside (the ring and one pixel of face, where comctl32
  starts its blocks); the browser cuts the last block where the value ends,
  where Windows drew whole blocks.
- ✅ "Tooltip Controls" (p.136), Figure 7.28: `_BalloonHelp.scss` draws the
  balloon as a ToolTip: InfoWindow (`--package-color-tooltip-face`, #ffffe1 in
  Windows Standard) in a 1-px WindowFrame line, square corners, InfoText in the
  UI font 4 px from the sides and 2 px from the top and bottom, as wide as its
  text, no tail; a title the same text in bold (TTM_SETTITLE).
- ✅ "Toolbars and Status Bars" (p.139), Figure 7.35: `.classicyPlacard` is a
  status-bar pane, ButtonFace in the one-ring sunken edge (BDR_SUNKENOUTER:
  ButtonShadow top-left, ButtonHilight bottom-right), its text 3 px in; a
  placard with a menu shows the combo box's 7 × 4 triangle, pressed or open its
  content steps +1,+1, disabled embossed.
- **7.23** ⚠️ product decision, Windows 98 as shipped kept: the flat toolbar
  button is the 98 shell's and IE4's; a per-preset look (raised for the Windows
  95 preset) cannot be switched by a numeric knob and would need a core variant
  hook (`assetVariant`-style). _WIG Ch.7 "Toolbars and Status Bars" (p.139),
  Figure 7.34._
- **7.24** ⚠️ core hook: see 6.8 (`at-start`/`at-end` or `disabled` per arrow
  from `update()`'s measurement; added to `ClassicyVocabulary.json` and CLAUDE.md's
  Scroll Bars note; the package embosses the one arrow). _WIG Ch.7 "List
  Boxes" (p.122), "Scroll Bars" (p.134)._
- **7.25** ⚠️ core hook: ClassicyListBox takes an opt-in `checkboxes` prop for
  `selection="multiple"` rendering `data-classicy-part="list-check"` (a span,
  `aria-hidden`, the row's `aria-selected` carrying the state) before each row's
  label; the package draws it in `_ListBox.scss` as the 13-px Window-white box in
  a one-ring ButtonShadow line (the flat appearance style, Ch.13 "Flat
  Appearance" (p.309)) with the 7 × 7 check while the row is selected. _WIG Ch.7
  "Extended and Multiple Selection List Boxes" (pp.124–125), Figure 7.15._
- **7.26** ⚠️ core: ClassicySpinner's `handleOnKeyDown` steps the value on
  ArrowUp/ArrowDown (`preventDefault`, the OS key repeat covering a held key) and
  a `wrap?: boolean` prop (default false) cycles past `minValue`/`maxValue`
  instead of clamping. _WIG Ch.7 "Spin Boxes" (p.131)._
- **7.27** ⚠️ core layout flag: `balloonHelp: { placement: "anchor" | "pointer"
  }` (default `"anchor"`; Windows 98 `"pointer"`) read by `useClassicyBalloonHelp`:
  with `"pointer"` the box is placed below-right of the pointer's last position
  (tracked on mousemove while hovering), flipped at the desktop's edges, and a
  pointerdown on the anchor hides it. `_BalloonHelp.scss` already draws the
  ToolTip box. _WIG Ch.7 "Tooltip Controls" (p.136)._
- **7.28** ⚠️ core: ClassicyControlStrip wraps each cell in `useClassicyBalloonHelp`
  with the module's label (`classicyControlStripModuleLabel`) or the cell's
  `aria-label` as the content, so every unlabeled toolbar control carries a
  tooltip. _WIG Ch.7 "Interaction with Controls in Toolbars and Status Bars"
  (p.140); App. C "User Assistance" (p.364)._

---

## Chapter 8 — Secondary Windows

Pages read: PDF 151–176 (pp.145–170). Ch.8 gives no pixel numbers; its look rules
are the secondary window's caption (Figure 8.1), the common dialogs' layouts
(Figures 8.6–8.8, 8.13) and the palette window's title bar (Figure 8.15). Dialog
flow, modality, navigation and message wording are the core's and the apps'.

Normative checklist (WIG Ch.8) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Appearance and Behavior" (p.145, Figure 8.1) | A secondary window has a title bar and frame and is movable; it has no Maximize or Minimize button, optionally a Close button; the title describes the window's purpose; the title bar has no icon. | `_Window.scss` modal caption (`.classicyWindowTitleBarModal`) | 🔧 see 8.1 |
| "Appearance and Behavior" (p.145) | A secondary window has a pop-up menu with the window's commands (button 2 on the title bar). | core ClassicyWindow (no system menu) | ⚠️ see 8.7 (= 6.2) |
| "Appearance and Behavior" (p.145) | A What's This? button may sit in the title bar. | none (no Windows help system) | ➖ |
| "Interaction with Other Windows" (pp.145–146) | Secondaries depend on their primary: closed or hidden with it, restored with it; ALT+F6 switches; activating a primary brings its secondaries with it; a dependent secondary always lies above its primary and its peers. | core: `closeApp` closes an app's windows, a hidden app's modals are `display: none`, z-order bands (palettes 350, modals 370 above the focused window's 300) | ✅ |
| "Interaction with Other Windows" (p.146) | Always On Top for palette windows, user-configurable. | core utility band (always above the app's documents; no setting) | ➖ |
| "Interaction with Other Windows" (p.146) | Persistence of state: show a secondary window as last accessed (the Open dialog's current directory, the last tabbed page). | core ClassicyFileDialog (`currentPath` reset on open), control panel tabs | ⚠️ see 8.11 |
| "Unfolding Secondary Windows" (p.146) | An unfold button labeled with `>>` expands to a second fixed size. | host content | ➖ |
| "Cascading Secondary Windows" (pp.146–147) | A dependent window opens offset right and below its parent; one level only. | no bundled dialog opens another | ➖ |
| "Window Placement" (p.147) | Where it last appeared; else where it displays fully; else centered in the primary window below its title bar, menu bar and toolbars. | core: alerts and dialogs open at `initialPosition ["center", "center"]` on the desktop (the Mac's); `layout.window.centering` `"exact"` unless the package says `"wholePixel"` | ⚠️ see 8.8 |
| "Modeless vs. Modal" (p.147) | Modeless where the user repeats an action; modal sparingly; system modal only for severe conditions. | core `modal` prop; modeless windows | ✅ |
| "Default Buttons" (pp.147–148) | ENTER activates the default button, shown with a bold outline; never a destructive default; the default follows focus to another button and returns. | `_Button.scss` `.default` (WindowFrame ring); core dialogs (native `<button>` activation) | ✅ |
| "Default Buttons" (p.148) | Double-clicking a single-selection item may carry out the default. | core FileDialog (double-click opens) | ✅ |
| "Navigation in Secondary Windows" (p.148) | TAB and SHIFT+TAB move between controls left to right, top to bottom; option buttons one tab stop with arrows inside; combination controls one stop. | core (native tab order, native radio groups) | ✅ |
| "Navigation in Secondary Windows" (pp.148–149) | ALT+access key (and a bare letter outside text fields) moves to and activates a control; unique access keys. | core (no access keys) | ⚠️ see 8.9 (= 7.1) |
| "Navigation in Secondary Windows" (p.149) | OK and Cancel take no access keys: ENTER and ESC reach them; ENTER always invokes the default button. | core dialogs (Enter opens in the file dialog, Enter/Escape in the keyboard-equivalent dialog, alerts' default button) | ✅ |
| "Validation of Input" (p.149) | Validate at the point of input; else when leaving the control or on commit, leaving the window open. | apps' content | ➖ |
| "Property Sheet Interface" (pp.149–151, Figures 8.2–8.3) | Title "<name> Properties"; properties grouped on tabbed pages; a drop-down to switch groups of pages. | core control panels (the Appearance Manager's eight tabs); `_Tabs.scss` | ✅ structure (titles are the Mac's) |
| "Property Sheet Commands" (pp.151–152) | OK, Apply, Cancel outside the pages, applying to the window; closing with pending changes prompts Yes/No/Cancel. | core control panels apply at once (the inspector model, "Property Inspectors", pp.152–153) | ✅ (inspector model) |
| "Properties of a Multiple Selection" (p.153) | Differing values shown with the mixed-value appearance. | Ch.13 "Mixed-Value Appearance" | see Ch.13 |
| "Dialog Boxes" (p.154) | A dialog's title is its command's name, without ellipsis or menu title. | apps' content | ➖ |
| "Dialog Box Commands" (p.154) | OK applies and closes, Cancel discards and closes; OK the default; a Help button possible. | core InputDialog, FileDialog, Alert (default and cancel roles) | ✅ |
| "Layout" (p.154) | Controls left to right, top to bottom; buttons stacked at the upper right or in a row across the bottom; the default first; OK and Cancel together; Help last. | `_Dialog.scss` `button-row` (order: default, others, Cancel; the alert's Help after Cancel); `--layout-dialog-edge` 11 | ✅ |
| "Common Dialog Box Interfaces" (p.155) | Use the system's dialogs; preserve the user's latest settings between openings. | core dialogs (see 8.11) | ⚠️ see 8.11 |
| "Open Dialog Box" (pp.155–156, Figure 8.6) | Look in (the path upward, then the drives), a list of small icons and names with the selected name alone highlighted, File name, Files of type, Open and Cancel; shortcuts open their targets. | `windows98.json` `layout.fileDialog`, `_Dialog.scss` file-dialog rules | 🔧 see 8.4, 8.6 |
| "Save As Dialog Box" (pp.156–157, Figure 8.7) | The Open dialog's layout with Save in; a default name in the File name box (the current name, or one from the short type name). | `layout.fileDialog.saveName`; core FileDialog | 🔧 see 8.5 |
| "Find and Replace Dialog Boxes" (p.158, Figure 8.8) | Plain ButtonFace dialogs of fields, drop-downs and check boxes, no inner frame. | `_Window.scss` `.classicyWindowContentsFramed` (the core's modeless-dialog frame) | 🔧 see 8.3 |
| "Print", "Print Setup", "Page Setup", "Font" (pp.159–161) | The system's dialogs. | none | ➖ |
| "Color Dialog Box" (pp.162–163, Figures 8.13–8.14) | Basic and Custom color wells, Hue/Sat/Lum and Red/Green/Blue fields, expandable. | core ClassicyColorPicker (its structure); `_AppearanceManager.scss` (swatches as sunken wells, field labels plain) | ✅ look (structure is the core's) |
| "Palette Windows" (pp.163–164, Figure 8.15) | A modeless window of controls with a shorter title bar holding a Close button only; title = the command's or toolbar's name; sizable palettes show the size pointer and a Size command; pop-up menu Close, Move, Size, Always On Top, Properties. | `_Window.scss` `.classicyWindow.classicyWindowUtility` (`--window-utility-title-bar-height` 13, `utilityTitleBar.buttonWidth` 12 × `buttonHeight` 11) | 🔧 see 8.2; ⚠️ pop-up menu 8.7 |
| "Message Boxes" (pp.164–165) | The title identifies the context (the document's or application's name), never "warning", "caution" or "error". | apps' content (the Mac's alerts) | ➖ |
| "Message Box Types" (pp.165–167, Table 8.1, Figure 8.17) | Information, Warning and Critical symbols. | core ClassicyAlert `alertType` note, caution, stop (Platinum's art) | ✅ types; ➖ pictures |
| "Message Box Types" (p.167) | Display a message box only while the application is active; a progress or start-up box needs no symbol. | core; the startup screen (`_Desktop.scss` draws it as a dialog) | ✅ |
| "Command Buttons in Message Boxes" (pp.167–168, Figure 8.19) | The most frequent or least destructive option as the default; OK alone (plus Help) for an acknowledgement; Yes/No or named actions; Cancel (or Stop) to abandon. | core alerts (default buttons generated by type); `_Alert.scss` (buttons centered, Windows' order, Help last) | ✅ look; ➖ wording |
| "Message Box Text" (p.169) | Clear, specific, two or three lines, no jargon, never "error". | apps' content | ➖ |
| "Pop-up Windows" (p.170, Figure 8.20) | Tooltips as contextual help with system time-outs; a pointing-hand cursor for click pop-ups; a second click dismisses. | core `useClassicyBalloonHelp` (600 ms); cursors Platinum's | ✅ tooltips; ➖ hand cursor |

### Findings — Chapter 8

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 8.1 | LOW | A dialog's caption drew the collapse (Minimize) box the core gives a `collapsable` modal and the icon it draws unless `hideIcon`; a secondary window has neither. | `_Window.scss` (`.classicyWindowTitleBarModal`) | 🔧 Fixed |
| 8.2 | LOW | A palette (utility) window drew small Minimize and Maximize boxes beside Close; a palette's title bar holds Close alone. | `_Window.scss` (`.classicyWindow.classicyWindowUtility`) | 🔧 Fixed |
| 8.3 | LOW | A modeless dialog's `contentFrame` (HIGOS8's two-pixel modeless frame) was drawn as a sunken white box inside the client area; Find and Replace are plain ButtonFace boxes with no inner frame. | `_Window.scss` (`.classicyWindowContentsFramed`) | 🔧 Fixed |
| 8.4 | MEDIUM | The Open and Save dialogs browsed the Mac's expanding tree (`fileDialog.navigation: "tree"`, the default); Windows' common dialogs show one folder at a time under Look in. | `windows98.json` (`layout.fileDialog`) | 🔧 Fixed |
| 8.5 | LOW | Save As opened with its default name unselected; the WIG's default name is there to be overtyped. | `windows98.json` (`layout.fileDialog.saveName`) | 🔧 Fixed |
| 8.6 | LOW | The file dialogs' list drew a disclosure cell before each row and ran the selection across the whole row; Figure 8.6's list view has small icons and names, the name alone highlighted, the icon untouched. | `_Dialog.scss` (`.classicyFileOpenDialogWell`) | 🔧 Fixed |
| 8.7 | LOW | No pop-up menu for a secondary window (Move, Close; a palette's Close, Move, Size, Always On Top). Same mechanism as 6.2 and 7.10. | core ClassicyWindow | ⚠️ Deferred (core) |
| 8.8 | LOW | Dialogs and alerts center on the desktop with `layout.window.centering` unset, so they sit on a half pixel when the free space is odd, which blurs every pixel-grid bevel and glyph; System 7 declares `"wholePixel"`. (Centering on the desktop rather than in the primary window is the Mac's and stays.) | `windows98.json` (`layout.window`) | ⚠️ Deferred (package, next pass) |
| 8.9 | LOW | No access keys in dialogs (ALT+letter, a bare letter outside text fields). Same as 7.1; ALT+letter is browser-reserved on some platforms. | core | ⚠️ Deferred (core hook; keyboard adaptation) |
| 8.10 | LOW | The recommended maximum secondary-window size is 234 × 263 dialog base units, 415 × 452 px; the core's alert and input dialogs cap their width at 460 px (`--dialog-alert-max-width`, `--dialog-input-max-width`, the core `dialog` family). | `windows98.json` (`measurements.dialog`) | ⚠️ Deferred (package theme data, next pass) |
| 8.11 | LOW | The Open and Save dialogs reset `currentPath` on every open rather than preserving the last directory for the session; the control panels do not reopen on their last tab. | core ClassicyFileDialog, control panels | ⚠️ Deferred (core) |

**Details & fixes**

- **8.1** 🔧 (`packages/appearance/windows98/src/styles/components/_Window.scss`):
  `.classicyWindow .classicyWindowTitleBarModal [data-classicy-control="collapse"]`
  and `.classicyWindow .classicyWindowTitleBarModal .classicyWindowIcon` are
  `display: none` (the core draws no zoom box on a modal bar); the title keeps
  `--title-bar-text-inset` 3 from the caption's left, where the icon stood.
  Product consequence recorded: under this package a dialog has no WindowShade
  box (the title's double-click still collapses it where the desktop preference
  is on). _WIG Ch.8 "Appearance and Behavior" (p.145), Figure 8.1._
- **8.2** 🔧 (`_Window.scss`): in `.classicyWindow.classicyWindowUtility
  .classicyWindowTitleBar`, `[data-classicy-control="zoom"]` and
  `[data-classicy-control="collapse"]` are `display: none`; the small
  `$maximize-small` and `$minimize-small` art is removed, `$close-small` (6 × 5
  at (3,3) on the 12 × 11 box) stays; the header comment records that a palette
  has no WindowShade box under this package. _WIG Ch.8 "Palette Windows" (p.163),
  Figure 8.15._
- **8.3** 🔧 (`_Window.scss`): `.classicyWindowContentsFramed { padding: 0;
  border: none; box-shadow: none }` (the frame draws nothing, active or not) and
  `.classicyWindow .classicyWindowContents:has(.classicyWindowContentsFramed) {
  padding: 0; box-shadow: none; background-color:
  var(--classicy-window-contents-bg, b.$face) }`, so the client area around it
  gives up its client edge and Window white for ButtonFace (a host's
  `--classicy-window-contents-bg` first, as the modal body takes it); keyed on
  `:has()` as the base keys its own menu-bar rule, so a browser without it
  (Firefox 113–120) keeps a sunken white client area around a flat inner box.
  _WIG Ch.8 "Find and Replace Dialog Boxes" (p.158), Figure 8.8._
- **8.4, 8.5** 🔧 (`packages/appearance/windows98/src/windows98.json`,
  `src/ClassicyWindows98.test.ts`, `README.md`, `docs/AGENT-REFERENCE.md`):
  `layout.fileDialog: { frame: "movable", navigation: "flat", saveName:
  "selected" }`. `frame` is the default, stated (the Open and Save boxes are
  titled, movable dialogs, as Windows' are); `navigation: "flat"` shows one
  folder's contents at a time, a folder entered by opening it, the pop-up over
  the list running the path upward and then the volumes, as Look in / Save in
  do; `saveName: "selected"` makes the dialog manager select the default name on
  first focus ("include a default name in the File Name text box", p.157). The
  package test's exact `layout` expectation lists the block; the README's "Its
  layout" bullet and the agent reference's Windows 98 entry describe it. _WIG
  Ch.8 "Open Dialog Box" (pp.155–156), "Save As Dialog Box" (pp.156–157),
  Figures 8.6 and 8.7._
- **8.6** 🔧 (`_Dialog.scss`): in `.classicyFileOpenDialogWell` the
  `.classicyTreeNodeDisclosure` is `display: none` (under flat navigation every
  row is a small icon and a name, so the cell is empty; the tree view outside the
  well keeps its buttons, `_ListBox.scss`); the name alone takes the selection
  (`.selected .classicyTreeNodeLabel` HilightText on Hilight, a ring high and
  half an item gap wide around the text, `padding: b.$b var(--layout-item-gap-half)`),
  the icon untouched; the dotted focus rectangle sits on the name of the row
  that has the keyboard whenever the list has focus (`:focus`, a click's
  included), one ring inside, in HilightText over a selected name
  (`.classicyTreeNodeLabelHolder.selected:focus .classicyTreeNodeLabel {
  outline-color }`, the state class outside `:where()` so it outranks the focus
  rule); a disabled row's name GrayText. _WIG Ch.8 "Open Dialog Box" (pp.155–156),
  Figure 8.6 (which highlights "Letter to Nancy", not its icon)._
- ✅ "Interaction with Other Windows" (pp.145–146): `ClassicyWindow.scss`'s
  bands put the focused app's palettes at 350 and modals at 370 above its
  focused window (300) and every other app (20); `closeApp` closes an app's
  windows with it and a hidden app's container and modals are `display: none`
  (CLAUDE.md "Window Order & Focus Succession").
- ✅ "Default Buttons" (pp.147–148): `.classicyButton.default` is the raised
  bevel one ring inside a WindowFrame ring ("a bold outline that appears around
  the button"), pressed drawn flat; the core's dialogs make OK the default and
  a native `<button>` with focus takes ENTER itself, so the default follows the
  focus and returns.
- ✅ "Layout" (p.154), "Dialog Box Commands" (p.154): `_Dialog.scss`'s
  `button-row` orders the default button first, any other next and Cancel last
  by `order` on the vocabulary's `[data-classicy-role]` parts (the alert's) and
  the `default` state class (the input, keyboard and form rows), rows
  right-aligned (98.css's dialogs, the base's `justify-content: flex-end`); a
  dialog's items start `--layout-dialog-edge` 11 px in (7 dialog units in MS Sans
  Serif 8, the core's HIG inset by coincidence the same figure).
- ✅ "Command Buttons in Message Boxes" (pp.167–168): `_Alert.scss` (committed
  before this pass) sets label and message as one text in the UI font at one
  size and weight (MS Sans Serif 8 on 13-px lines), centers the button row as
  MessageBox does (Wine's `MSGBOX_OnInit`; Microsoft's own "On pop-up error
  messages, center command buttons"), orders [OK] [Cancel], [Yes] [No] [Cancel]
  through `button-row`, and places a Help button after Cancel at the row's right
  (`order: 40`, the base's auto margin removed); the windows' caption gradient
  covers the base's red alert caption, since Windows has no alert caption of its
  own.
- ✅ "Message Box Types" (pp.165–166): `ClassicyAlertType` is `"note" |
  "caution" | "stop"`, Table 8.1's Information, Warning and Critical, selecting
  the icon and the generated default buttons; the symbols are Platinum's art
  (by design).
- ✅ "Color Dialog Box" (pp.162–163): the picker's swatches are sunken two-ring
  wells with the dotted focus rectangle inside the rings (`_AppearanceManager.scss`
  `.classicyColorPickerSwatch`), the Packages tab's 16-px swatches one-ring
  wells, and the wheel fields' labels (Red, Green, Blue and the rest) plain
  (13.2).
- **8.7** ⚠️ core: the window pop-up menu of 6.2/7.10, with Move and Close alone
  for modal and utility windows (a sizable palette adding Size). _WIG Ch.8
  "Appearance and Behavior" (p.145), "Palette Windows" (p.164), Figure 8.16._
- **8.8** ⚠️ package, next pass (`windows98.json`): `layout.window.centering:
  "wholePixel"` beside `growBoxCorner` (the core's `resolvePosition` then rounds
  a `"center"` axis to a whole pixel, as System 7's layout asks), with the
  package test's exact `layout` expectation and the README's layout bullet
  updated. Not applied in this pass: found while writing this document, after
  the Ch.8 fix group had closed. _WIG Ch.8 "Window Placement" (p.147); Ch.13
  "Design of Graphic Images" (p.313): pixel art must land on the grid._
- **8.9** ⚠️ core hook: 7.1's `accessKey` on menu items extended to control
  labels (`ClassicyControlLabel` underlining one character and, on ALT+letter
  where the browser lets it through, focusing its control). _WIG Ch.8
  "Navigation in Secondary Windows" (pp.148–149)._
- **8.10** ⚠️ package theme data, next pass: the core's `dialog` family is a
  structural knob family every package may set (as `menu.popUpMaxHeight` was set
  in 7.20); `measurements.dialog: { alertMaxWidth: 415, inputMaxWidth: 415 }`
  (the keys as `src/Appearance/ClassicyCoreTheme.ts` names them) in `defaults`
  and the presets would cap the alert and input dialogs at the WIG's width; the
  452-px height is not exceeded by any bundled dialog.
  _WIG Ch.13 "Font and Size" (p.311)._
- **8.11** ⚠️ core: ClassicyFileDialog keeps the last `currentPath` (and
  volume) per app for the session instead of `setCurrentPath([])` on open, and
  the control panels remember their last tab in session state. _WIG Ch.8
  "Interaction with Other Windows" (p.146), "Common Dialog Box Interfaces"
  (p.155)._

---

## Chapter 13 — Visual Design

Pages read: PDF 283–309 (pp.295–321). This is the chapter the look is built
from: the four basic border styles and the five composite styles, the control
states, the fonts and sizes, the layout units, the selection and transfer
appearances. The Windows 95 text names "button face" for the raised outer
border's light side; Windows 98's Windows Standard scheme separates that role
into ButtonLight (223,223,223), which the package's `--color-system-02` holds,
so every "button face" of Figure 13.2's outer light edge reads ButtonLight here
and the OS as shipped is matched.

Normative checklist (WIG Ch.13) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Composition and Organization" (pp.295–296) | Hierarchy, focus at the upper left, structure and balance, relationship of elements, readability, unity with the system. | core layouts; the package's unity with Windows is this audit's subject | ➖ principles |
| "Color" (pp.296–298) | Color as a secondary form of information; a limited set; base elements on the system colors and schemes so they follow a user's change. | `windows98.json` (every color a palette token or a package color family; the 18 presets are Windows' own schemes); every partial reads tokens only (`bin/classicyLiteralColorSweep.ts` gate) | ✅ |
| "Fonts" (pp.298–299, Figure 13.1) | Avoid italic and serif fonts; limit the fonts and styles; use the standard system font for common elements. | `typography` (one 11-px sans stack for ui, header and body); `_Desktop.scss` (shortcut labels upright), `_Dialog.scss` (the About box without serif), `_Alert.scss` (one text) | ✅ |
| "Dimensionality" (p.299) | Highlighting and shading from a light source at the upper left; no 3-D on a non-interactive element. | `_bevels.scss` (every ring light at the top and left, dark at the bottom and right); the placard pane and progress track sunken as Windows' own status fields are | ✅ |
| "Basic Border Styles" (pp.299–300, Figure 13.2) | Raised outer: button face (Windows 98: ButtonLight) top-left, window frame (ButtonDkShadow) bottom-right. Raised inner: ButtonHilight top-left, ButtonShadow bottom-right. Sunken outer: ButtonShadow top-left, ButtonHilight bottom-right. Sunken inner: window frame (ButtonDkShadow) top-left, button face (ButtonLight) bottom-right. One pixel each. | `_bevels.scss` (`$hilight` system-01, `$light` system-02, `$face` system-03, `$shadow` system-05, `$dkshadow` system-07; one ring = `--window-border-size` 1) | ✅ |
| "Window Border Style" (p.301, Figure 13.3) | Raised outer + raised inner: primary and secondary windows, menus, scroll arrow buttons and other variable-background cases. | `b.window-frame` (windows, the standalone frame, menus, the placard's menu, the startup panel); scroll arrows use the button style | ✅ windows and menus; scroll arrows per Windows 98 (below) |
| "Button Border Styles" (p.301, Figures 13.4–13.5) | The outer and inner top-left colors swapped (ButtonHilight outside, ButtonLight inside); up = raised, down = sunken; the button-down style also for read-only areas (read-only text boxes). | `b.raised`, `b.pressed`; `_TextField.scss` `.classicyOutputInset` (the read-only edit) | ✅; 🔧 read-only well, see 13.3 |
| "Field Border Style" (p.302, Figure 13.6) | Sunken outer + sunken inner for editable text boxes, check boxes, drop-down combo and list boxes, spin boxes, list boxes and wells; the interior button highlight (white). | `b.sunken` in `_TextField.scss`, `_Checkbox.scss`, `_PopUpMenu.scss`, `_ListBox.scss`, `_Icon.scss`, `_Table.scss`, `_Slider.scss` (channel), the client area; interiors `--color-window-document` (Window, Windows' own choice; white in Windows Standard) | ✅ |
| "Status Field Border Style" (p.303, Figure 13.7) | Sunken outer only. | `_Placard.scss` `.classicyPlacard`, `_ProgressBar.scss` track (`DrawEdge(BDR_SUNKENOUTER)`), `_MenuBar.scss` clock pane | ✅ |
| "Grouping Border Style" (p.303, Figure 13.8) | Sunken outer + raised inner (etched) for group boxes and menu separators. | `b.etched` (`_ControlGroup.scss`), `_Separator.scss`, `_Menu.scss` separators (ButtonShadow over ButtonHilight) | ✅ |
| "Pressed Appearance" (pp.303–304, Figures 13.9–13.10) | Feedback on the down transition: a check box's or option button's field turns button face; a command button takes the button-down border and its label moves one pixel down and right. | `_Checkbox.scss`/`_RadioInput.scss` `:active` (ButtonFace inside); `_Button.scss` pressed (`b.pressed`, label +1,+1); caption buttons, scroll arrows, tabs, pager | ✅ |
| "Option-Set Appearance" (pp.304–305, Figures 13.11–13.13) | On the up transition: a check mark, a dot; a command button keeps the button-down border with a ButtonFace/ButtonHilight checkerboard, the glyph as when pressed; a well gets a border in the text color and the button highlight. | `_Checkbox.scss`, `_RadioInput.scss`; `_Button.scss` `.checked` (`$checker`, content +1,+1), `_ControlStrip.scss` module `.open`, `_MenuBar.scss` pressed taskbar buttons; `_Icon.scss` `.classicyImageWell.selected` | ✅ marks and buttons; ⚠️ wells, see 13.7 |
| "Mixed-Value Appearance" (pp.305–306, Figures 13.14–13.15) | Leave the field blank for a mixed value; a check box draws its special mark; a graphical button draws the checkerboard on its face (raised); clicks cycle set, clear, mixed. | `_Checkbox.scss` `.mixed` (the checker face with a GrayText mark), `_RadioInput.scss` `.mixed` (7.18), `_Menu.scss` `.mixed` (7.2), core pop-up placeholder; `_Button.scss` `.classicyBevelButton.mixed` | ✅; 🔧 bevel buttons, see 13.4 |
| "Unavailable Appearance" (pp.306–307, Figures 13.16–13.19) | An engraved label: the label in button highlight overlaid at a small offset by the label in button shadow; a set but unavailable check box or option button shows its mark in button shadow; a set and unavailable graphical button omits the checkerboard. | `b.disabled-text` (GrayText with a 1-px ButtonHilight shadow) on every label, title and glyph (`embossed()` pixel art); checkbox and radio marks GrayText when disabled; `_Button.scss` `.classicyBevelButton.disabled.checked` | ✅; 🔧 disabled-set buttons, see 13.5 |
| "Input Focus Appearance" (p.308, Figure 13.20) | A blinking insertion point in text boxes; elsewhere a dotted outline around the control or its label, at least one pixel of space around the control. | `_TextField.scss` (caret WindowText, no ring); `b.focus-rect` on buttons (7.16), tabs, sliders, wells, swatches, list rows, the Control Strip; around the label on check boxes and radio buttons; the pop-up's band plus rectangle | ✅ |
| "Flat Appearance" (p.309, Figure 13.21) | Controls nested in a scrollable region use the flat style (`DFCS_FLAT`, `BF_FLAT`). | no bundled nested controls (the multiple-selection list's check boxes, 7.25, would be) | ➖ |
| "Layout" (p.309) | Left to right, top to bottom, the most important information at the upper left. | core dialog layouts; `_Dialog.scss` (button order) | ✅ |
| "Font and Size" (p.310, Figure 13.22) | MS Sans Serif 8-point for menu titles, items, control labels and all interface text; the title bar's text 8-point bold; check the system font setting. | `typography` (11 px, the stack `"Pixelated MS Sans Serif"`, `"MS Sans Serif"`, `"Microsoft Sans Serif"`, Tahoma, Arial); `_Window.scss` title bold; every partial `font-size: var(--ui-font-size)`; the size variants | ✅; 🔧 pop-up variants, see 13.1 |
| "Font and Size" (p.310) | The system's settings for title bar height, menu bar height, border width, title bar button height, icon title text, scroll bar height and width size the interface; use them for custom elements. | `measurements.window` (titleBarHeight 18, borderSize 1, scrollbarSize 16), `titleBar.buttonHeight` 14, `desktop.iconFontSize` 11, the knob families; the Fonts tab (14.1) | ✅ |
| "Font and Size" (pp.310–311, Figure 13.23) | A single-line control is 14 dialog base units (DBU) tall; 1 horizontal DBU = a quarter of the average character width, 1 vertical DBU = an eighth of the average character height (MS Sans Serif 8: 1.5 px and 1.625 px); Figure 13.23's spacing. | `pushButton.height` 23 (14 × 1.625 = 22.75), `button.minWidth` 75 (50 DBU), `field.height` 21, `popUp.height` 21, `tabControl.height` 21 (Windows' own 21-px edit, combo and tab) | ✅ |
| "Font and Size" (p.311) | A default menu item in bold; a default button with a bold outline; otherwise nonbold text, bold only to call attention or make a hierarchy. | `_Button.scss` `.default`; `_AppearanceManager.scss`, `_Placard.scss`, `_Alert.scss` (plain weights); core ClassicyMenuItem (no default flag) | ✅ button; 🔧 residual bold, see 13.2; ⚠️ menu item 7.14 |
| "Font and Size" (p.311) | Secondary windows at most 234 × 263 DBU, 415 × 452 px. | core `dialog` family (`alertMaxWidth` 460, `inputMaxWidth` 460, `keyboardEquivalentMaxWidth` 420) | ⚠️ see 8.10 |
| "Font and Size" (p.311) | Toolbar buttons 24 × 22 px including the border at VGA, the glyph 16 × 16 centered on the face; a tooltip names an unlabeled button. | `_Button.scss` toolbar sizes (7.22); tooltips 7.28 | ✅ sizes; ⚠️ tooltips 7.28 |
| "Capitalization" (p.312) | Title capitalization for commands and buttons; sentence-style for field labels (option buttons, check boxes, text boxes, group boxes, tabs). | the package's own strings: knob labels ("Button width", "Close button gap", "Label shadow"), color labels ("Active gradient", "Icon label text"), the theme names; app content is the core's | ✅ |
| "Grouping and Spacing" (p.312) | At least 3 DBU between controls; 7 DBU from the window's edge; a toolbar's controls a border width from its edges; buttons of an exclusive set adjacent. | `layout.itemGap` 4 (3 DBU horizontal, 4.5 px), `control.labelGap` 5 (3 DBU vertical, 4.9 px), `layout.dialogEdge` 11 (7 DBU: 10.5 and 11.4 px), `layout.groupGap` 12; `_ControlStrip.scss` cells abutting in one frame | ✅ |
| "Alignment" (p.312) | Align fields by their left edges; labels above or to the left, a left label aligned with the box's text. | core forms and dialogs; `_TextField.scss` labels | ✅ |
| "Button Placement" (pp.312–313, Figure 13.24) | Buttons stacked at the upper right or in a row along the bottom; the default first; OK and Cancel together; Help last; consistent lengths. | `_Dialog.scss` `button-row`, `_Alert.scss`; `button.minWidth` 75 | ✅ |
| "Design of Graphic Images" (pp.313–314, Figure 13.25) | Nouns; black and white first; light from the upper left; no anti-aliasing on an icon's outer edge; avoid letters. | the package's glyphs are one-pixel rectangles on the `--pixel-unit` grid (`_pixel.scss`), never anti-aliased; the only letter is the help button's "?", the caption glyph Windows itself drew | ✅ |
| "Icon Design" (pp.314–316, Figures 13.26–13.29) | Icons in 16, 32 and 48 px; document icons distinct from the application's; black outlines eliminated; small icons like their large ones. | `desktop.iconSize` 32, `--icon-small-size` 16; `_Desktop.scss` and `_Icon.scss` remove the base's black outline through the outer mask (Platinum's); the pictures Platinum's | ✅ geometry; ➖ pictures |
| "Pointer Design" (pp.316–317, Figure 13.30) | Pointer changes conservatively, hot spots, the I-beam for text, the hourglass only where the window is busy. | the asset registry's cursors (Platinum's) | ➖ |
| "Highlighting" (p.318, Figure 13.31) | The system highlight color for a selection, shown on mouse down; only in the active window or pane. | Hilight/HilightText everywhere (`--color-highlight`, `--package-color-selection-text`); the 50 % Hilight dither over a selected icon (ImageList's ILD_BLEND50); inactive windows 6.4 | ✅ color; ⚠️ inactive, see 13.8 (= 6.4) |
| "Highlighting" (p.319) | A secondary selection outlined in the highlight color; a list box's highlighted setting paired with a focus indication. | `_ListBox.scss`, `_Table.scss`, `_Dialog.scss` (the dotted rectangle in HilightText on the selected row or name; 14.2 on an unselected list) | ✅ |
| "Handles" (pp.319–320, Figure 13.32) | Solid square handles, HighlightText border with a Highlight fill (hollow: reversed), sized from the window border and edge metrics. | core HyperCard editor handles (`--hyper-card-handle-size` 6); the package has no rule for them | ⚠️ see 13.10 |
| "Transfer Appearance" (p.320, Figure 13.33) | A translucent or outline representation of the dragged object moves with the pointer; the destination defines the presentation. | core file drag (`drawClassicyDragOutline`: a dotted outline of the icon's shape and label box); drop targets drawn selected (`_Desktop.scss`, `_Icon.scss`) | ✅ |
| "Open Appearance" (pp.320–321, Figure 13.34) | An opened OLE object hatched every four pixels. | no OLE; `_Desktop.scss`/`_Icon.scss` mark no opened icon (Windows marked none; the base's inverted open icon is the Mac's) | ➖ (✅ no Mac open mark) |
| "Animation" (p.321) | Fluid at 16 fps or more; interruptible; avoid gratuitous use; offer a way to turn it off. | `_ProgressBar.scss` indeterminate slide (whole-pixel steps, one period a second; `prefers-reduced-motion`); the core pauses screen savers the same way | 🔧 see 13.6 |

### Findings — Chapter 13

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 13.1 | LOW | The pop-up menu's size variants used the base's smaller and larger faces (`--ui-font-size-small`, `--ui-font-size-xlarge`); interface text is one size, the 8-point system font the pixel face is cut for. | `_PopUpMenu.scss` (`.classicyPopUpMenuSizeSmall`, `-Large`) | 🔧 Fixed |
| 13.2 | LOW | The color picker's field labels (Red, Green, Blue and the rest) and the pager's page number were bold (the base's); interface text is nonbold but to call attention or make a hierarchy. | `_AppearanceManager.scss`, `_Placard.scss` | 🔧 Fixed |
| 13.3 | LOW | The read-only output well was Window white inside its edge; Windows paints a read-only text box's interior ButtonFace (ES_READONLY, the button-down border style the WIG gives read-only areas). | `_TextField.scss` (`.classicyOutputInset`) | 🔧 Fixed |
| 13.4 | LOW | A mixed bevel button was drawn sunken with its content stepped, like a set one; Figure 13.15 draws the mixed button raised with the checkerboard on its face and only the set button sunken. | `_Button.scss` (`$down`, `.classicyBevelButton.mixed`) | 🔧 Fixed |
| 13.5 | LOW | A disabled latched bevel button kept the checkerboard; Figure 13.19 omits it and embosses the label. A disabled mixed button is the plain disabled one. | `_Button.scss` (`.classicyBevelButton.disabled.checked`) | 🔧 Fixed |
| 13.6 | LOW | Under `prefers-reduced-motion` the indeterminate progress bar only slowed its slide (3 s a period); the WIG asks for a way to turn animation off. | `_ProgressBar.scss` | 🔧 Fixed |
| 13.7 | LOW | A set image well shows a dotted WindowText rectangle two rings inside its edge (the focus rectangle's look); Figure 13.13's set-value border is solid, in the text color and the button highlight. | `_Icon.scss` (`.classicyImageWell.selected`) | ⚠️ Deferred (package, next pass) |
| 13.8 | LOW | Selections stay highlighted in inactive windows and panes. Same as 6.4. | core ListBox/Table/Tree | ⚠️ Deferred (core hook) |
| 13.9 | LOW | No menu item can be bold as the default command. Same as 7.14. | core ClassicyMenuItem | ⚠️ Deferred (core hook) |
| 13.10 | LOW | The HyperCard editor's selection handles draw as the core's base sheet draws them; the package has no rule making them HighlightText-bordered Highlight squares sized from `--window-border-size`. | `_<none>.scss` (no HyperCard partial) | ⚠️ Deferred (package, next pass) |

**Details & fixes**

- **13.1** 🔧 (`packages/appearance/windows98/src/styles/components/_PopUpMenu.scss`):
  `.classicyPopUpMenuSizeSmall`, `-Medium` and `-Large` all set `font-size:
  var(--ui-font-size)` (the large one still grows to its text, `min-height`
  the field's); the header records that every variant is one size, as the push
  button's small variant already gave way in `_Button.scss`. _WIG Ch.13 "Font and
  Size" (p.310)._
- **13.2** 🔧 (`_AppearanceManager.scss`, `_Placard.scss`):
  `.classicyColorPickerWheelField .classicyControlLabel { font-weight: normal }`
  (the Color dialog's Hue, Sat, Lum, Red, Green and Blue are plain) and
  `.classicyPagerPage { font-weight: normal }`; both headers cite the rule.
  _WIG Ch.13 "Font and Size" (p.311)._
- **13.3** 🔧 (`_TextField.scss`): the `client-edge` mixin takes a `$ground`
  (default `b.$window`) and `.classicyOutputInset` includes `client-edge(b.$face)`,
  so the inset result well is WindowText on ButtonFace inside the same sunken
  edge; the header's color table lists the read-only well under ButtonFace and
  notes that no input in the package passes `readOnly`. _WIG Ch.13 "Button Border
  Styles" (p.301); "Flat Appearance" (p.309), Figure 13.21's read-only text box._
- **13.4** 🔧 (`_Button.scss`): `$down` is `:is(:active, .pressed, .checked,
  .open)` (mixed removed), so a mixed bevel button keeps its raised rings (or a
  toolbar's flat face) and its content in place while
  `.classicyBevelButton:not(.disabled):is(.checked, .mixed, .open) { background:
  $checker }` draws the checkerboard; a toolbar's mixed button keeps the flat
  face under its checker. _WIG Ch.13 "Mixed-Value Appearance" (p.306), Figure
  13.15; "Option-Set Appearance" (pp.304–305), Figure 13.12._
- **13.5** 🔧 (`_Button.scss`): `.classicyBevelButton.disabled.checked { @include
  b.pressed }` with no checker (was `.disabled:is(.checked, .mixed)` with
  `$checker`), the label embossed by the `.disabled` rule; a toolbar's disabled
  latched button keeps its one sunken ring without the checker; a disabled mixed
  button is the plain disabled one. _WIG Ch.13 "Unavailable Appearance"
  (pp.306–307), Figure 13.19._
- **13.6** 🔧 (`_ProgressBar.scss`): `@media (prefers-reduced-motion: reduce)`
  sets `animation: none` on the indeterminate bar's value parts (was
  `animation-duration: 3s`), so the blocks stand still; the header cites the rule
  and the core's screen-saver pause as the precedent. _WIG Ch.13 "Animation"
  (p.321)._
- ✅ "Basic Border Styles" (pp.299–300): `_bevels.scss` builds every edge from
  inset box-shadows of five tokens, one ring each: `raised` (ButtonHilight,
  ButtonLight / ButtonDkShadow, ButtonShadow: the button style), `pressed` (the
  reverse), `pressed-flat` (one ring of ButtonShadow: a pushed scroll button),
  `sunken` (the field style: ButtonShadow, ButtonDkShadow / ButtonHilight,
  ButtonLight), `window-frame` (ButtonLight, ButtonHilight / ButtonDkShadow,
  ButtonShadow: the window style), `etched` (the grouping style), `raised-thin`
  (one ring, the status style reversed) and `disabled-text`; Windows 98's
  scroll-arrow buttons take the button style (`DrawFrameControl`'s `BF_SOFT`,
  which 98.css reproduces), where the 1995 text names the window style for them:
  the OS as shipped is matched.
- ✅ "Pressed", "Option-Set", "Unavailable", "Input Focus" (pp.303–308): the
  check box's and radio button's inside turns ButtonFace while pressed and shows
  its mark in GrayText when disabled; a latched bevel button, an open Control
  Strip module and the pressed taskbar buttons take the ButtonFace/ButtonHilight
  checker on the pixel grid; every disabled label, title, caption and glyph is
  GrayText over a ButtonHilight copy one pixel down and right (`disabled-text`,
  `embossed()`); the dotted rectangle is `focus-rect($inset)` (one ring,
  `--window-border-size`, dotted WindowText), around the label of a check box or
  radio button, inside the bevel of a button, tab, well, swatch or Control Strip
  cell, in HilightText on a selected list row.
- ✅ "Font and Size" (pp.310–311): the three typography sizes are 11 px (MS
  Sans Serif 8 at 96 dpi), the title bold; the single-line controls stand at
  Windows' own 21 px (edit, combo box, tab), the push button at 23 (14 DBU);
  `button.minWidth` 75 is the 50-DBU button of Figure 13.23's layout; the
  Fonts tab's larger sizes carry the controls with them (14.1).
- ✅ "Grouping and Spacing", "Button Placement" (pp.312–313): `layout.itemGap`
  4 and `control.labelGap` 5 are 3 DBU across and down, `layout.dialogEdge` 11
  is 7 DBU, `layout.groupGap` 12; `button-row` puts the default first, OK and
  Cancel together and Help last; buttons share `--button-min-width`.
- ✅ "Icon Design" (p.316): the desktop's and the icon view's mask pair is
  exactly the icon's box, with no fringe, so the base's black outline through
  the outer mask (Platinum's, the Windows 3.1 style the WIG retired) is gone;
  a selected icon is blended with the 50 % Hilight dither clipped by its own
  mask and a pre-rendered selected image (`registerClassicySelectedIconImages`)
  takes no layer.
- ✅ "Transfer Appearance" (p.320): `startClassicyFileDrag`'s ghost is the 1-px
  dotted outline of the icon's opaque shape and its label box, moving with the
  pointer; folder targets under the drag are drawn selected as the shell
  highlighted a drop target.
- **13.7** ⚠️ package, next pass (`_Icon.scss`): replace
  `:where(.classicyImageWell).selected { outline: b.$b dotted b.$text;
  outline-offset: b.$neg-b2 }` with a solid two-ring border inside the edge,
  `box-shadow` of `b.sunken`'s four rings followed by `inset` rings of `b.$text`
  and `b.$hilight` (the text color outside the button highlight, Figure 13.13),
  keeping the dotted rectangle for `:focus-visible` alone; the same on the
  Appearance Manager's selected swatch. Not applied: found while writing this
  document. _WIG Ch.7 "Wells" (p.136); Ch.13 "Option-Set Appearance" (p.305),
  Figure 13.13._
- **13.10** ⚠️ package, next pass: a `_HyperCard.scss` partial (or rules in
  `_Icon.scss`) drawing the editor's selection handles as `--window-border-size`
  bordered squares, HilightText outside a Hilight fill (hollow: Hilight outside
  HilightText), sized from `--hyper-card-handle-size`; to be checked against the
  base sheet's handles first. _WIG Ch.13 "Handles" (pp.319–320), Figure 13.32._

---

## Chapter 14 — Special Design Considerations; Appendix C — Guidelines Summary

Pages read: PDF 310–328 (pp.327–344) and 341–346 (pp.361–366). Ch.14 is mostly
behavior and process (sound, accessibility aids, internationalization, network,
records, telephony, Exchange); the rules a package can meet are scalability
with the user's font, system colors, visible keyboard focus, time-outs and
color as a secondary cue. Appendix C is the whole guide's checklist; its rows
are mapped to the sections above.

Normative checklist (WIG Ch.14) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Sound" (p.327) | Sound as a redundant cue; let the user customize it; support the system volume interface; ShowSounds captioning. | core Sound control (Control Strip), the Sound control panel; the package's pack is four alert tones and the beep, no interface feedback | ✅; ➖ ShowSounds |
| "Accessibility" / "Visual Disabilities" (p.328) | Support larger text and graphics through the system's scalable fonts and controls. | the Fonts tab; `_TextField.scss`, `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss` | 🔧 see 14.1 |
| "Visual Disabilities" (p.329) | Color as an additive property, never the only means. | disabled = GrayText and emboss; selected = Hilight and HilightText and the focus rectangle; a meter's zones | ✅; ⚠️ meter zones, see 14.5 |
| "Hearing Disabilities" (p.329) | No information by sound alone. | alerts carry their message; the package plays no feedback sounds | ✅ |
| "Physical Movement Disabilities" (p.329) | Good keyboard and mouse interfaces. | core (keyboard gaps: 7.7, 7.9, 7.26) | see Ch.7 |
| "Seizure Disorders" (p.329) | Base modulating interfaces on the cursor blink rate or make the rate configurable. | the browser's caret; the indeterminate progress slide (one period a second, off under reduced motion, 13.6) | ✅ |
| "Compatibility with Screen Review Utilities" / "Controls" (pp.330–331) | Standard controls; a label for every control, placed before it, ending in a colon; text for choices shown as colors or widths. | core (native controls, `ClassicyControlLabel`, the color picker's named fields) | ✅ structure |
| "Text Output" / "Graphics Output" (p.332) | Text as text, not bitmaps; separable graphic components. | the package's glyphs are CSS layers on real elements; titles and labels are text | ✅ |
| "Icons and Windows" (p.333) | Icons with a text label in the system font and color, placed as the system places it; every window titled. | `_Desktop.scss`, `_Icon.scss` (UI font, the desktop text and WindowText colors, centered below); core window titles | ✅ |
| "The User's Point of Focus" (p.333) | Accessibility aids follow the input focus; place it with standard functions and keep it indicated. | `_Table.scss` (the focus item), every `:focus-visible` rectangle | 🔧 see 14.2 |
| "Timing and Navigational Interfaces" (p.333) | No critical feedback removed on a timer; time-out interfaces configurable; nothing shown or hidden by pointer movement but standard tooltips; navigation never triggers actions. | core (the 15-s menu idle close, 7.6; the screen saver's 1–240 min; balloon delay 600 ms) | ⚠️ see 14.4 (= 7.6) |
| "Color" (pp.333–334) | Base colors on the system colors; pair foregrounds with their backgrounds (button text on button face). | every partial's color table pairs WindowText/Window, ButtonText/ButtonFace, HilightText/Hilight, InfoText/InfoWindow, TitleText/ActiveTitle | ✅ |
| "Color" (p.334) | Check High Contrast Mode and adjust colors; hide images behind text. | none (no `forced-colors` or `prefers-contrast` rule; no High Contrast preset) | ⚠️ see 14.3 |
| "Scalability" (p.334) | Scale elements from the system's font and size metrics; the system's own components scale. | `measurements` knobs and `typography`; the field heights (14.1) | 🔧 see 14.1 |
| "Keyboard and Mouse Interface" (pp.334–335) | Follow the keyboard conventions; basic functions by single click, not only by double-click, drag or modified clicks. | core | see Ch.7 |
| "Documentation, Packaging, and Support", "Usability Testing" (p.335) | Process. | none | ➖ |
| "Internationalization" / "Text" (pp.336–337) | Allow 30 % text expansion in dialogs, 100 % in message boxes; never rely on text position. | buttons grow from `button.minWidth` 75 with `textPadding` 12; alerts wrap within `--dialog-alert-max-width`; the menu's shortcut column is computed (7.3) | ✅ |
| "Graphics" (p.337) | Generic images and glyphs. | the package's glyphs: triangles, check, X, boxes, the "?" | ✅ |
| "Keyboards" (p.337) | No punctuation keys as shortcuts; no CTRL+ALT combinations. | core bundled chords (Control and Option with letters, Backspace, Delete) | ✅ |
| "Character Sets", "Formats" (pp.338–339) | System interfaces for character sets and locale formats. | core Date & Time manager (the browser's locale) | ✅ |
| "Layout" (p.340) | Reverse the presentation for right-to-left languages; room for diacritics; nothing in the title bar area. | the package lays everything out physically (left and right, `order`); the title bar carries nothing (Ch.6) | ➖ RTL (no RTL locale in Classicy); ✅ title bar |
| "Network Computing", "Records Processing", "Telephony", "Microsoft Exchange" (pp.340–344) | Platform integration. | none | ➖ |

Appendix C, "Guidelines Summary" (pp.361–366), mapped to this audit:

| App. C section (page) | Item | Where covered | Status |
| --- | --- | --- | --- |
| "Input and Interaction" (p.361) | Visual feedback for selected objects (highlighting, handles); keyboard interface for all basic operations; single-click access to common operations. | Ch.13 "Highlighting", 13.10; Ch.7 7.7, 7.9, 7.26 | ✅ highlighting; ⚠️ handles, keyboard |
| "Windows" (p.361) | Title text for all windows; saves and restores window state; adjusts size and position to the screen; uses common dialog boxes; modeless where possible; the appropriate message symbol; a brief statement of the problem in message boxes. | Ch.6 "Opening and Closing Windows"; Ch.8 8.4, 8.5, 8.11; message types | ✅; ⚠️ 8.11 |
| "Windows" (p.362) | Property pages for peer properties; buttons that apply to the page inside it, to the window outside it. | Ch.8 "Property Sheet Commands" (inspector model) | ✅ |
| "Controls" (p.362) | System-supplied controls; a pop-up menu for the title bar icon and for the window; the menu glyph (triangular arrow) for cascades, drop-down arrows and scroll arrows; pop-up menus by button 2 and SHIFT+F10, displayed on the button's release; the order of pop-up commands; toolbars user-configurable; custom controls consistent with the system's. | 6.2, 6.3, 7.9, 7.10; `_Menu.scss`, `_PopUpMenu.scss`, `_ScrollBar.scss` triangles; the Control Strip control panel | ✅ glyphs, toolbars; ⚠️ menus 6.2, 6.3, 7.9 |
| "Integrating with the System" (pp.362–363) | Registry, file types, icons in 16, 32 and 48 px, the taskbar for notification, OLE. | ➖ (no Windows registry, taskbar or OLE; icons Platinum's) | ➖ |
| "User Assistance" (p.364) | Context-sensitive Help; tooltips for all unlabeled controls, particularly in toolbars. | 7.28 | ⚠️ 7.28 |
| "Visual Design" (p.365) | Color only as an enhancing, secondary form of information; a limited set of colors; system metrics for all display elements; standard border styles; the appropriate appearance for every control state; a light source from the upper left; the layout and font guidelines; correct capitalization. | Ch.13 throughout; 13.1–13.6 fixed | ✅ |
| "Sound" (p.365) | Audio for secondary cues; the system volume interface; ShowSounds. | Ch.14 "Sound" | ✅; ➖ ShowSounds |
| "Accessibility" (p.365) | Labels for all controls, icons and windows; indicates keyboard focus; standard text functions; avoids time-out interaction or makes it configurable; avoids triggering actions on navigation; supports scaling; supports High Contrast Mode; tests with accessibility aids. | 14.1, 14.2, 14.3, 14.4 | 🔧 14.1, 14.2; ⚠️ 14.3, 14.4 |
| "International Users" (pp.365–366) | Space for expansion; no punctuation shortcut keys; local formats; layout per reading conventions; references to unsupported features adjusted. | Ch.14 "Text", "Keyboards", "Formats", "Layout" | ✅; ➖ RTL |
| "Network Users" (p.366) | System naming conventions; shared access. | ➖ | ➖ |

### Findings — Chapter 14 and Appendix C

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 14.1 | LOW | The single-line fields (edit control, stepper field, output well, the pickers), the hot-key box, the pop-up menu's field and the group box's legend line box were fixed at their knobs (21 px, 12 px); a larger UI font set in the Fonts tab clipped their text or broke the legend's strip, where Windows sizes every control from the system font. | `_TextField.scss`, `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss`, `windows98.json` | 🔧 Fixed |
| 14.2 | LOW | A focused list with nothing selected showed no focus item; Windows' list view keeps its focus rectangle on the first item until one is selected (the row Down Arrow and Home select). | `_Table.scss` | 🔧 Fixed |
| 14.3 | LOW | No High Contrast handling: no `forced-colors`/`prefers-contrast` rule and none of Windows 98's four High Contrast schemes among the presets. | `windows98.json`, `windows98.scss` | ⚠️ Deferred (product decision) |
| 14.4 | LOW | An open menu closes itself after 15 s, a time-out the user cannot configure. Same as 7.6. | core ClassicyMenuProvider | ⚠️ Deferred (core layout flag) |
| 14.5 | LOW | A meter tells its warning zones by block color alone (Hilight against `--color-alert`/`--color-error`), with no pattern or text. | `_ProgressBar.scss` (meter); core ClassicyMeter | ⚠️ Deferred (core/product) |

**Details & fixes**

- **14.1** 🔧 (`packages/appearance/windows98/src/styles/components/_TextField.scss`,
  `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss`;
  `packages/appearance/windows98/src/windows98.json`, `README.md`,
  `docs/AGENT-REFERENCE.md`): `_TextField.scss` defines `$field-height:
  max(var(--field-height), calc(var(--ui-font-size) + 2 × var(--field-padding-y)
  + 2 × b.$b2))` (11 + 3 + 3 + 2 + 2 = 21 at the default: the knob's own figure)
  and `$field-line` (the line left inside the inset, 15), used by the edit
  control, the stepper's field, the output well and the date and time pickers;
  `_Dialog.scss` repeats the pair for the hot-key box; `_PopUpMenu.scss` sets
  `$field-height: max(var(--pop-up-height), calc(var(--ui-font-size) + 2 × b.$b2
  + 2 × b.$b + 2 × b.$b2))` (the value's band in its two rings of padding, the
  pixel it stands inside the bevel, the bevel's two rings: 11 + 4 + 2 + 4 = 21)
  for the field and the large variant's `min-height`; `_ControlGroup.scss`'s
  legend is `line-height: calc(var(--ui-font-size) + #{$px})` (12 at the default,
  even, so the pixel font lands on whole pixels) instead of `px(12)`. The
  pop-up's height became an Options-tab knob, `knobs.popUp.height` (16–40,
  default 21), beside `field.height`; the README's knob bullet and the agent
  reference's knob list name it. The knob keeps the Windows metric at the stock
  font; only a font the knob no longer holds raises the control. _WIG Ch.14
  "Scalability" (p.334), "Visual Disabilities" (p.328); Ch.13 "Font and Size"
  (p.310)._
- **14.2** 🔧 (`_Table.scss`): `#{$list}:focus:not(:has(.classicyTableRow.selected))
  .classicyTableContent > .classicyTableRow:first-child { @include
  b.focus-rect(b.$b) }` rings the first row in WindowText on the white row, and
  the Finder's list rings the first row's name alone
  (`.classicyFileBrowserViewTableRowIconLabel`), as Explorer's details view keeps
  its focus item; `:has()` stands alone in its selector, so a browser without it
  (Firefox before 121) drops this rule only. _WIG Ch.14 "The User's Point of
  Focus" (p.333); App. C "Accessibility" (p.365)._
- ✅ "Color" (pp.333–334): every partial's header carries its Windows-color
  table, pairing each foreground with the background Windows pairs it with
  (WindowText on Window, ButtonText on ButtonFace, HilightText on Hilight,
  InfoText on InfoWindow, TitleText on ActiveTitle, GrayText with its
  ButtonHilight emboss), and the literal-color sweep and the varCoverage test
  keep every value a token, so a scheme change in the Colors tab recolors the
  whole look.
- ✅ "Icons and Windows" (p.333): desktop and window icon labels are the UI font
  (MS Sans Serif 8's stack at 11 px) in the desktop text color or WindowText,
  centered beneath the picture as the shell places them.
- ✅ "Text" (pp.336–337): a push button is `min-width` 75 with 12 px of text
  padding and grows with its label; an alert's message wraps within
  `--dialog-alert-max-width`; the menu's shortcut column is laid from the longest
  title (7.3), so no label position is assumed.
- **14.3** ⚠️ product decision: (a) a `@media (forced-colors: active)` block in
  `windows98.scss` mapping the package's tokens to the system colors
  (`CanvasText`, `Canvas`, `ButtonText`, `ButtonFace`, `Highlight`,
  `HighlightText`, `GrayText`) and hiding the images behind text (the Desktop
  tab's preview, the About box's banner), and/or (b) Windows 98's four High
  Contrast schemes (High Contrast #1, #2, Black, White) as presets, read from
  their `[Control Panel\Colors]` blocks like the sixteen classic schemes. The
  core has no contrast rule of its own either. _WIG Ch.14 "Color" (p.334); App. C
  "Accessibility" (p.365)._
- **14.4** ⚠️ core layout flag: 7.6's `layout.menuBar.idleTimeoutMs`, which also
  makes the time-out configurable per package. _WIG Ch.14 "Timing and
  Navigational Interfaces" (p.333)._
- **14.5** ⚠️ core/product: ClassicyMeter exposes its zone as a state class or
  part (`warning`, `critical`) so a package can add a pattern (a diagonal
  hatch of the zone color over the blocks) or the core adds an optional text
  readout; the Mac meter has the same gap. _WIG Ch.14 "Visual Disabilities"
  (p.329); Ch.13 "Color" (p.296)._

---

## Deferred and proposed core changes

The package-scope fixes of this pass are applied (3.1, 3.2, 6.1 modal, 7.2–7.4,
7.16–7.22, 8.1–8.6, 13.1–13.6, 14.1, 14.2); the gates were run after each group
(`node bin/check-pixel-literals.ts`, `node bin/classicyLiteralColorSweep.ts`,
`ClassicyAppearance.varCoverage.test.ts`, `pnpm --filter
@classicy/appearance-windows98 exec vitest run`, the whole sheet compiling to one
`@layer classicy.package` block with no `!important`). Everything below is open.

**Additive core hooks** (a state class, a part or a layout flag; the package rule
that uses each is written in its finding):

- **6.1** `data-classicy-resizable="false"` (or a vocabulary state) on a window
  root while `resizable === false`, so a non-resizable document window can wear
  the three-ring fixed frame.
- **6.4 / 13.8** `inactive` on ClassicyListBox, ClassicyTable, ClassicyTree and
  the text editor's selection surface from `ClassicyWindowActiveContext`, as
  ClassicyScrollArea emits it.
- **6.7** `expanded` on `.classicyWindow` while `ws.zoomed`; the package's
  `$restore` mark is ready.
- **6.8 / 7.24** `disabled` (or `at-start`/`at-end`) on a scroll bar's start and
  end arrows from the viewport's position, per bar.
- **7.1 / 8.9** `accessKey?: string` on ClassicyMenuItem (and on control labels)
  rendered as `data-classicy-part="access-key"`; the package underlines it.
- **7.13** `mark?: "check" | "bullet"` on ClassicyMenuItem (`menuitemradio`); the
  package's 6 × 6 bullet is ready.
- **7.14 / 13.9** `isDefault?: boolean` on ClassicyMenuItem emitting the
  `default` state; the package's bold rule is ready.
- **7.25** a `checkboxes` opt-in on a multiple-selection ClassicyListBox rendering
  `data-classicy-part="list-check"`.
- **14.5** a zone state or part on ClassicyMeter.

**Layout flags** (declared by `windows98.json`, read by the core):

- **6.5** `layout.window.frameEdges: "move" | "resize"` (frame-edge handles
  resize, with the resize cursors).
- **6.6** `layout.window.zoom: "standard" | "maximize"` (fill the desktop under
  the menu bar).
- **7.6 / 14.4** `layout.menuBar.idleTimeoutMs` (0 = never; the ClassicyMenuProvider
  prop exists).
- **7.10 / 6.2 / 8.7** `layout.window.systemMenu: boolean` (Restore, Move, Size,
  Minimize, Maximize, Close on the title bar's and icon's button 2; Move and
  Close for modal and utility windows).
- **7.12** `layout.menu.submenuDelayMs` (show and hide delay, 400 for Windows).
- **7.15** `layout.menu.shortcutSpelling: "glyphs" | "names"` (Ctrl+, Alt+,
  Shift+, Fn).
- **7.21** `layout.tree.keys: "windows"` (a bare Right Arrow expands, Left
  collapses).
- **7.27** `layout.balloonHelp.placement: "anchor" | "pointer"` (below-right of
  the pointer, hidden on click).

**Core behaviors** (no package surface):

- **6.3** the title-bar icon's pop-up menu and double-click close.
- **6.10** snap-back during a live thumb drag past the bar's thickness.
- **6.11** auto-scroll of a scroll area under a file drag near its edge.
- **6.12, 6.13** a split box, closing a split by dragging to the end, a Split
  command with arrow keys, ENTER and ESC.
- **7.5** press-drag-release on menu titles (Mac OS 8 wants it too).
- **7.7, 7.8, 7.9** menu keyboard navigation, Escape by levels, Escape on a
  contextual menu, Shift+F10 and the ContextMenu key.
- **7.11** Rename, Create Shortcut and a Properties analogue in Finder's icon
  menus, Properties last (product decision).
- **7.26** Up/Down Arrow and `wrap` on ClassicySpinner.
- **7.28** tooltips on the Control Strip's unlabeled cells.
- **8.11** the file dialogs' last directory and the control panels' last tab
  kept for the session.

**Product decisions recorded** (the OS as shipped kept, or a reading to choose):

- **3.2** the screen bar's bottom edge raised as the taskbar's (taken, against
  the porting brief's window-menu-bar reading).
- **6.9** no full-length scroll box on a fitting bar (Windows 95/98's disabled
  bar kept over the 1995 text; the one-line package fix is in 6.9).
- **7.23** flat toolbar buttons (Windows 98's TBSTYLE_FLAT kept over Figure
  7.34's raised buttons; a raised look for the Windows 95 preset would need a
  core variant hook).
- **14.3** High Contrast: a `forced-colors` block and/or the four High Contrast
  schemes as presets.

**Package scope, next pass** (found while writing this document, after the fix
groups closed):

- **8.8** `layout.window.centering: "wholePixel"` in `windows98.json`, so dialogs
  and alerts never center on a half pixel (the test's `layout` expectation and
  the README's layout bullet follow).
- **8.10** `measurements.dialog: { alertMaxWidth: 415, inputMaxWidth: 415 }`
  (the core's structural `dialog` family, settable like `menu.popUpMaxHeight`).
- **13.7** the image well's and the selected swatch's set-value border solid, in
  the text color and the button highlight, the dotted rectangle kept for
  `:focus-visible`.
- **13.10** the HyperCard editor's handles as HilightText-bordered Hilight
  squares sized from `--window-border-size`.

## Next pass

- Realign the page citations the fix groups wrote into the Ch.13 and Ch.14
  partials' comments to this document's opener-derived numbers (`_Button.scss`,
  `_PopUpMenu.scss`, `_AppearanceManager.scss`, `_Placard.scss`,
  `_TextField.scss`, `_ProgressBar.scss`, `_ControlGroup.scss`, `_Dialog.scss`,
  `_Table.scss`: Ch.13 "Font and Size" p.310, "Button Border Styles" p.301,
  "Option-Set Appearance" p.304, "Mixed-Value Appearance" p.306, "Unavailable
  Appearance" pp.306–307, "Animation" p.321; Ch.14 "Scalability" p.334, "The
  User's Point of Focus" p.333; App. C "Accessibility" p.365 is unchanged).
- Apply the four package-scope items above (8.8, 8.10, 13.7, 13.10) and run
  the gates.
- Wire or drop the dead `menuFrame.borderWidth`/`bevelWidth` knobs: the menu
  frame is built from `--window-border-size` through `b.window-frame`, so the
  two emitted variables (`--menu-frame-border-width`, `--menu-frame-bevel-width`)
  are read by nothing in this package.
- Chapters not yet audited: Ch.4 "Input Basics" (mouse, pen and keyboard
  conventions, access-key selection), Ch.5 "General Interaction Techniques"
  (selection, transfer, drag feedback, creation and property editing), Ch.10
  "Integrating with the System" (taskbar notification, the registry's icons),
  Ch.12 "User Assistance" (tooltips' and status-bar messages' wording, Help
  windows). Ch.5's transfer and selection feedback and Ch.12's tooltip rules
  are the ones with a package surface.
- Visual parity check of the applied fixes in the example app and Storybook
  (`pnpm parity:shoot` against the Windows 98 presets): the taskbar's new bottom
  edge under each scheme, the dialogs' three-ring frame, the menus' shortcut
  column in the Finder's menus, the tree lines in the Appearance Manager's and
  Drive Setup's trees, the toolbar sizes in the rich text editor.
- When the core ships any of the additive hooks above, land the package rules
  written in their findings (6.7's Restore mark, 7.1's underline, 7.13's bullet,
  7.14's bold, 6.8's per-arrow emboss, 7.25's list check boxes) in the same
  release, since each is one rule keyed on the new class or part.
