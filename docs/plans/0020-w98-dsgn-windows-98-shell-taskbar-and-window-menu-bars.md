---
id: 0020-w98
title: 'Windows 98 shell: taskbar, Start menu, tray and window menu bars'
type: dsgn
status: ready
priority: "2"
effort: XL
created: "2026-11-25T02:47:00.000Z"
updated: "2026-11-25T03:15:00.000Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - docs/plans/windows-guidelines-audit.md
  stories:
    - ["0223-ck1", "depends"]
    - ["0225-m4q", "relates"]
---

# Windows 98 shell: taskbar, Start menu, tray and window menu bars

## Summary

**Goal:** Under the Windows 98 Appearance Package, and only there, Classicy
works as the Windows 95/98 shell does. Each window has its own menu bar and no
menu bar crosses the top of the screen. A taskbar runs along the bottom, with
the Start button at its left (the Start menu opens upward from it), one button
per open window in the middle and the status area at its right. The Control
Strip's modules show as tray icons beside the clock, and no Control Strip is
drawn. Windows minimize to their taskbar buttons, maximize to fill the screen
less the taskbar, resize from any edge, and have the window pop-up (system)
menu. Dialogs and message boxes have a title and a Close box.

**Problem:** The Windows 98 package dresses a Mac OS structure. Its one screen
menu bar is drawn taskbar-style at the top (audit 3.1, 3.2), WindowShade
stands in for Minimize, zoom is Mac OS 8's standard state, the frame's edges
move a window instead of sizing it, and there is no window pop-up menu. The
audit (`docs/plans/windows-guidelines-audit.md`) records these as
adaptations and deferred findings (6.2, 6.3, 6.5, 6.6, 7.10, 7.28, 8.7, Ch.3
"Window Buttons", Ch.6 "Minimizing Windows"). The owner has asked for the
shell itself. Separately, every package shows two "Help" titles on the screen
bar while a Finder window is focused.

**Approach:** Add optional layout flags that the Windows 98 package declares
and the core reads (`taskbar`, `window.collapse`, `window.zoom`,
`window.titleDoubleClick`, `window.frameEdges`, `window.systemMenu`,
`window.captionTooltips`, `dialog.caption`). With a flag absent, the core
behaves as it does today. Add a core `ClassicyTaskbar` component, mounted by
`ClassicyDesktop` only when the layout asks for one. It is built from what
Classicy already has: the window records, the Control Strip registry, the
Apple menu's entries, the Applications folder, the Help menu and the Special
menu. Every new class, part and state that it or a window flag emits is read
only by the Windows 98 package. Draw the look in new and rewritten Windows 98
partials. Fix the double Help menu in every package by merging an
application's Help menu into the system Help menu, as the Mac OS HIG and the
Windows guidelines both ask.

---

# Part 1 — Design

## Current State

- **Menu bar.** `ClassicyDesktopMenuBar`
  (`src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx`)
  shows the following:
  - the Apple menu: About plus every `system_menu_<appId>` entry, which
    `ClassicyDesktopAppMenuAdd` writes for each `addSystemMenu` app (the six
    control panels, Calculator and Drive Setup);
  - the focused window's `appMenu`, with the app's About item hoisted into the
    Apple menu (`findAppAboutItem`, `stripAboutItem`, `trimSpacers`);
  - Help (`help-menu`: About Balloon Help…, Show/Hide Balloons ⌥H, then
    `Desktop.helpMenu[appId]`);
  - the App Switcher (`appSwitcherAppsFrom`);
  - the clock (`ClassicyDesktopMenuWidgetTime`, which also advances the store's
    `DateAndTime.dateTime` each minute);
  - the extensions region `#classicyDesktopMenuExtensions`, into which
    `ClassicyMenuBarExtension` portals.

  The bar also runs `useClassicyShortcutDispatcher`.
- **Window placement.** With `menuBar.placement: "window"`, the screen bar
  renders nothing but stays mounted to dispatch keyboard equivalents.
  `ClassicyWindowMenuBar` draws a window's `appMenu` under its title bar.
  `classicyLayoutThemeVars` sets `--menu-bar-height: 0px`. The Apple, Help and
  App Switcher menus, the clock and the extensions have no home in this
  placement. Storybook's `mirrored` package uses it.
- **Double Help.** The bug comes from Finder's `appMenu`, whose `…_help` menu
  holds "Hide Balloon Help" (an `onClickFunc`) and About. The screen bar
  hoists About, but the toggle keeps Finder's Help menu alive beside the
  system `help-menu`, so the bar draws two "Help" titles in every package. The
  other bundled apps' Help menus hold only About, so `stripAboutItem` already
  drops them.
- **Control Strip.** `ClassicyControlStrip` draws the modules of the live
  registry (`ClassicyControlStripRegistry.ts`: `{ id, label, icon, appId?,
  order?, menuItems?, content?, fileIcon? }`), arranged by
  `arrangeClassicyControlStripModules` (host `disabledModules`, persisted
  `moduleOrder`, mounted owners), less the persisted `hiddenModules`. Each
  module is a `ClassicyBevelButton` in popup mode. The cells have no tooltip
  (audit 7.28).
- **Windows.** `ClassicyWindow.tsx`:
  - Collapse is WindowShade (`collapsed`), persisted in `apps[id].windows`.
  - Zoom is `computeStandardRect`, the content's ideal size less
    `--window-zoom-margin`. While zoomed, the root carries `expanded`, and
    Windows 98 draws Restore on it.
  - The four `classicyWindowFrameEdge-*` handles call `startMoveWindow`.
  - The title bar's double-click collapses the window when the desktop's
    `doubleClickTitleToCollapse` preference is on.
  - `setCollapse(true)` first clears `zoomed` (`setZoom(false, true,
    "collapse")`), and `setResize` writes nothing while `ws.collapsed`.
  - Clicks bubble: the root's `onClick={setActive}` and `onMouseUp`
    (`stopChangeWindow`, which calls `setActive`) run after any control's own
    click, and then `ClassicyApp`'s container dispatches
    `ClassicyAppActivate`, which `focusApp`s the app's last-accessed window
    (`pickWindowToRestore`).
  - A right-click anywhere on the window shows `contextMenu` or the app's
    `contextMenu`.
  - `resizable={false}` adds `classicyWindowNoResize`.
  - The title bar's icon is inert.
  - Close succession promotes the app's highest-`zOrder` open sibling
    (`ClassicyWindowClose` in `ClassicyDesktopWindowManagerContext.tsx`).
  - Focus helpers live in `ClassicyAppHelpers.ts` (`focusWindow`, `focusApp`,
    `pickWindowToRestore`, `markAppFocused`).
- **Geometry.** `windowViewportFloor(menuBarHeight)`, `resolveSize`,
  `resolvePosition` and `clampWindowPositionToViewport` keep a window below the
  menu bar's band. Nothing reserves a band at the bottom. The desktop icon grid
  (`createGrid` and `classicyDesktopIconGridPosition` in
  `ClassicyDesktopIconContext.tsx`) uses the whole viewport height, and so does
  every menu's placement box (`classicyMenuBounds`,
  `ClassicyMenuPlacement.internal.ts`). `.classicyWindow` caps its height at
  `calc(100% - var(--window-max-height-reserve))` (53 px under Windows 98:
  `window.controlSize * 4 + window.paddingSize`).
- **Stacking.** Windows sit at z-index 20 (active 300, the active app's 150,
  floating palettes 350), the Control Strip at 355, a modal's scrim at 360 and
  a non-error modal at 370, contextual menus at 900 and bevel pop-ups at 5000,
  all in `#classicyDesktop`'s stacking context. A window's own menu bar's
  pull-downs live inside the window's stacking context.
- **Dialogs.** Every bundled dialog except the color picker passes
  `closable={false}`. `ClassicyAlert` has no title unless it is given one, and
  a fixed alert (`type="error"`) cannot be moved. The Windows 98 package
  already hides a modal caption's collapse box and icon (audit 8.1).
- **Windows 98 package.** `windows98.json` `layout` is
  `{ window: { growBoxCorner: "bottom-right", centering: "wholePixel" },
  menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-left" },
  scrollBar: { fitsBars: "shown" }, fileDialog: { … } }`. `_MenuBar.scss` draws
  the screen bar as the taskbar: the Apple title as the Start button, the
  Application menu as the active window's pressed button, the extensions as
  tray icons and the clock in a sunken pane. `_Window.scss` draws a window's
  own menu bar as a flat ButtonFace strip. The package registers no art (no
  Microsoft artwork may be copied); every glyph is pixel art from theme
  tokens.

## Sources and citations

WIG is cited by chapter, topic heading and printed page, derived from each
chapter's opener as `windows-guidelines-audit.md` "Citation scheme" explains.
This plan reads three openers that table lacks:

| Chapter | Opener | Printed page = | Read here |
| --- | --- | --- | --- |
| Ch.9 Window Management | PDF 177 = p.175 | PDF − 2 | pp.175–185 |
| Ch.10 Integrating with the System | PDF 190 = p.189 | PDF − 1 | "Taskbar Integration" pp.211–212 (PDF 212–213) |
| App. A Mouse Interface Summary | PDF 329 = p.349 | PDF + 20 | Table A.1, pp.349–350 |
| App. B Keyboard Interface Summary | PDF 337 = p.357 | PDF + 20 | Tables B.2–B.3, pp.358–359 |

The pre-release's table of contents lists "Taskbar Integration" at p.214. The
derivation from the opener gives p.211, so this chapter's pagination drifts
three pages against its opener. This plan uses the derived numbers, as the
audit does. App. A's opener prints "261", a misprint: the table of contents
and App. B/C's offset agree on p.349. Ch.3, 6, 7 and 8 use the audit's
offsets.

The rules read:

- **Ch.3 "The Taskbar", "The Start Button", "Window Buttons" (p.15, Figure
  3.1).** The Start button is at the left. A button for each primary window
  sizes to fit, and an abbreviated title gets a tooltip.
- **Ch.3 (p.16).** A minimized window keeps its button, and a closed one loses
  it. A drag over a button activates its window. The status area is opposite
  the Start button.
- **Ch.6 "Title Bars" (p.76).** Button 2 and ALT+SPACEBAR show the window's
  pop-up menu.
- **Ch.6 "Title Bar Icons" (p.78).** Button 2 on the icon shows the object's
  menu with Close as its default. A double-click on the icon closes the
  window.
- **Ch.6 "Title Bar Buttons" (p.80).** Button 2 on a caption button shows the
  window's menu.
- **Ch.6 "Activating and Deactivating Windows" (p.81).** A minimized window is
  activated from its taskbar button, or with ALT+TAB.
- **Ch.6 "Opening and Closing Windows" (pp.81, 83).** Opening a window adds a
  taskbar entry. The Close button and the window menu close it, and so does a
  double-click on the icon.
- **Ch.6 "Moving Windows" and "Sizing Borders" (p.83).** The Move and Size
  commands are driven with the arrow keys and ENTER, and the sizing border
  works at any edge.
- **Ch.6 "Maximizing Windows", "Minimizing Windows", "Restoring Windows"
  (pp.84–85).** Maximize fills the display less the taskbar. While maximized,
  Restore replaces Maximize and the menu's Maximize is disabled. Minimize
  leaves only the taskbar entry and disables the menu's Minimize. The taskbar
  button, its menu's Restore and ALT+TAB restore the window.
- **Ch.7 "The Menu Bar and Drop-down Menus" (p.97, Figure 7.1).** A menu bar
  runs across the top of a window, directly below the title bar.
- **Ch.7 "The Help Menu" (p.99).** Help topics, then "About *application
  name*" with no ellipsis.
- **Ch.7 "The Window Pop-up Menu" (p.102).** Close, Restore, Move, Size,
  Minimize and Maximize. A secondary window has Move and Close. Button 2
  anywhere in the title bar shows it, "excluding the title bar icon", whose
  button 2 shows the icon's own menu; button 1 on the icon shows the window's
  menu for compatibility.
- **Ch.8 "Appearance and Behavior" (p.145, Figure 8.1).** A secondary window
  has no taskbar button and no Maximize or Minimize button. It may have a
  Close button and has a pop-up menu.
- **Ch.8 "Interaction with Other Windows" (p.145).** When a primary window is
  minimized, its dependent secondary windows are hidden, and they come back
  with it.
- **Ch.8 "Palette Windows" (p.164, Figure 8.16).** A palette's menu: Close,
  Move, Size.
- **Ch.8 "Message Boxes" (p.164).** The title names the context, usually the
  object's or application's name.
- **Ch.8 "Message Box Types" (p.166, Figure 8.17).** Every message box has a
  titled caption with a Close box.
- **Ch.9 "Single Document Window Interface" (p.175).** The desktop and the
  taskbar manage primary windows, and opening a window places an entry in the
  taskbar.
- **Ch.10 "Taskbar Window Buttons" (p.211).** The system adds and removes a
  window's button, and a drag over a button restores its window.
- **Ch.10 "Status Notification" (pp.211–212, Figure 10.2).**
  - Button 1 opens a pop-up window of information or controls, as the volume
    control does. "If there is no information or control that applies, do not
    display anything."
  - Button 2 opens a pop-up menu.
  - A double-click runs the menu's default command.
  - A tooltip names the indicator.
- **App. A Table A.1 (pp.349–350).** A button 2 click shows the pop-up menu,
  and a double-click runs the default operation.
- **App. B Table B.2 (p.358).** ALT+SPACEBAR shows the window's pop-up menu,
  ALT+F4 closes the active window, CTRL+ESC accesses the Start button, and
  ALT+TAB and ALT+ESC switch windows.
- **App. B Table B.3 (p.359).** The WINDOWS key shows the Start menu,
  WINDOWS+M minimizes all windows and SHIFT+WINDOWS+M is "Undo Minimize All".

Where the 1995 text says nothing, Windows 98 as shipped decides, read from
Wine 5.0's `user32` and `comctl32`, ReactOS's `explorer` and os-gui 0.7.3's
`windows-98.css`:

- **Caption double-click** (Wine `nonclient.c`, `NC_HandleNCLButtonDblClk`).
  On the caption, it maximizes or restores when the window has a Maximize box.
  On the system-menu icon, it closes.
- **Caption right-click** (`NC_HandleNCRButtonDown`). On the caption or the
  icon, it shows the window menu. This is the OS as shipped over p.102's icon
  menu: a window's icon in Classicy stands for no object with commands of its
  own, so the window menu is the only menu it could show.
- **System menu states** (Wine `menu.c`, `MENU_InitSysMenuPopup`):
  - Size is grayed unless the window is sizable and neither maximized nor
    minimized.
  - Move is grayed while maximized.
  - Minimize and Maximize are grayed when the window lacks the box or is
    already in that state.
  - Restore is grayed unless the window is maximized or minimized.
- **Close is the default item** (`menu.c`, `SetMenuDefaultItem(…, SC_CLOSE)`).
- **Keyboard Move and Size** (Wine `winpos.c`, `WINPOS_SysCommandSizeMove`).
  The arrows step 8 px. ENTER commits and ESC restores the original rect.
  For Size, the first arrow picks the edge.
- **Window menu bar** (Wine `menu.c`, `MENU_MenuBarCalcSize` and
  `DrawMenuBarTemp`; `nonclient.c`, `rect.top += MENU_DrawMenuBar(…) + 1`).
  The bar is a 1 px top row and 18 px titles (`SM_CYMENU` 19 = `iMenuHeight`
  18 + 1, from `sysparams.c`'s `MENUHEIGHT` of 270 twips = 18 px), then a 1 px
  ButtonFace line: 20 px in all. Each title is its text plus one average
  character width (6 px) on each side. Windows 98 draws an open title sunken
  (`BDR_SUNKENOUTER`) rather than in Hilight, and hot-tracks a title under
  the pointer raised (os-gui `.menu-button.highlight`, with its text a pixel
  down-right while sunken).
- **Task buttons** (ReactOS `taskswnd.cpp`, `UpdateButtonsSize`). Every button
  is `min(SM_CXMINIMIZED = 160, share)` wide, at least `SM_CXSIZE +
  2·SM_CXEDGE` = 22, with `3·SM_CXEDGE/2` = 3 px between buttons. A button is
  pressed (checked) for the active window.
- **Task button clicks** (`HandleTaskItemClick`). A click on the active,
  unminimized window's button minimizes it. Any other click switches to the
  window, restoring it if minimized. A right-click pops up the window's system
  menu at the pointer (`HandleTaskItemRightClick`).
- **Checked buttons** (Wine `toolbar.c`, `TOOLBAR_DrawPattern`). A checked
  button draws the ButtonHilight/ButtonFace dither inside its 2 px edge, and a
  pressed or checked button's content moves 1 px down-right.
- **Clock** (ReactOS `trayclock.cpp`). The time is the locale's time format
  with `TIME_NOSECONDS` and 5 px of padding each side
  (`TRAY_CLOCK_WND_SPACING_X`). The tooltip is `DATE_LONGDATE`.
- **Tooltips** (Wine `tooltips.c`, `TTDT_AUTOMATIC`). The initial delay is
  `GetDoubleClickTime()`, 500 ms by default.
- **The taskbar's own menu** (Windows 98 as shipped). Toolbars ▸, Cascade
  Windows, Tile Windows Horizontally, Tile Windows Vertically, Minimize All
  Windows, then Properties. After Minimize All Windows the item reads "Undo
  Minimize All" and restores what it minimized.
- **Owned windows** (Wine `nonclient.c`, `NC_HandleSysCommand`). `SC_MINIMIZE`
  calls `ShowOwnedPopups(hwnd, FALSE)` before minimizing the active window,
  and `SC_RESTORE` shows them again: a minimized window's palettes and dialogs
  go with it, as Ch.8 (p.145) asks.

## Decisions

- **Each window has its own menu bar and no menu bar crosses the top of the
  screen.** — Owner, 2026-11-25.
- **A taskbar runs along the bottom: the Start button at its left opening the
  Start menu upward, one button per open window, the status area at its
  right.** — Owner, 2026-11-25.
- **The Control Strip's modules are tray icons beside the clock, and no Control
  Strip is drawn under the shell.** — Owner, 2026-11-25.
- **No core change may affect another package. One that does is a bug fix
  needed everywhere, and the change is verified against that package's
  guidelines.** — Owner, 2026-11-25.
- **Minimize reuses the store's `collapsed` flag, drawn according to the new
  `window.collapse` flag.** — My call. `collapsed` already persists, is copied
  into `collapsable` for collapse-all, and is skipped by the focus code. A
  window minimized under Windows 98 then shows as a WindowShade title bar
  under Platinum, where it stays reachable. With a separate `minimized` field,
  a minimized window would be lost under a package with no taskbar, and the
  persisted window record would gain a key under every package. Under the
  flag a `utility` or `modal` record's `collapsed` is ignored (drawn
  expanded), since neither has a taskbar button to come back from: a palette
  shaded under Platinum is never lost under Windows 98.
- **A maximized window minimizes and restores maximized.** — Windows as
  shipped: `SC_MINIMIZE` keeps the window's maximized placement and
  `SC_RESTORE` from the taskbar brings it back maximized. So under
  `window.collapse: "minimize"`, `setCollapse(true)` does not clear `zoomed`
  (today it calls `setZoom(false, true, "collapse")`, which a WindowShade
  needs and a minimize must not do).
- **A minimized app's palettes go with it.** — WIG Ch.8 (p.145), Wine
  `NC_HandleSysCommand`. Classicy's palettes belong to an app, not a window,
  so under the flag a `utility` window is hidden while its app has at least
  one open document window and every one of them is minimized. An app with
  palettes only keeps them.
- **Maximize reuses `zoomed`. A `restoreRect` is persisted only when a window
  is maximized under `window.zoom: "maximize"`.** — My call. Restore must
  survive a reload, which the session-only `userStateRef` does not. Platinum
  never writes the field, so its stored bytes stay as they are.
- **The taskbar's band is its own measured height, published through a
  store-free source (`ClassicyTaskbarBand.internal.ts`). It is not a
  structural knob.** — My call. The core reads no knob for the taskbar. The
  height is the package's (`taskbar.height`, read only by its stylesheet).
  So no variable is added to the core floor
  (`CLASSICY_CORE_MEASUREMENT_DEFAULTS`, which `ClassicyCoreTheme.test.ts`
  pins to `platinum.json`), and Platinum's and System 7's desktop roots carry
  no new property.
- **A runtime window registry gives the taskbar each window's title, icon,
  capabilities and commands, so the persisted window record is not
  touched.** — My call. The store record holds neither title nor icon, and
  adding them would change what every package persists.
- **The Start menu is built from data Classicy already has.** — My call:
  - Programs is the derived Applications folder's apps (the app-shortcut icon
    records `buildApplicationsFolder` reads).
  - Settings ▸ Control Panel is the Apple menu's entries for apps not listed
    in Applications: every bundled control panel and no bundled app.
  - Help opens Apple Guide's help topic.
  - About This Computer comes from the Apple menu.
  - Empty Trash… and Reset PRAM… come from the Special menu
    (`classicySpecialMenuItems`).
- **The double Help menu is fixed in every package.** An app's top-level Help
  menu is merged into the system Help menu, after its items, and an app item
  that duplicates the system's balloon toggle is dropped. Platinum and System
  7 then draw one Help menu. — My call, a bug in every package. HIGOS8 Ch.4
  "Help menus" (pp.91–92, Figure 4-2) gives the order About Help, Show
  Balloons, then the current application's Help items. HIG7 "The Help Menu"
  (p.125, Figure 4-88) says "put the help commands that you provide in the
  Help menu".
- **Finder's balloon toggle becomes an `event` item
  (`ClassicyDesktopSetBalloonHelp`), so the merge can recognize it.** — My
  call. Its behavior is identical. The `mirrored` package's Finder window bar
  draws exactly as before, because the window bars merge Help only under a
  taskbar (below).
- **The Start button's glyph is the package's own 16 × 16 pixel art, not
  Microsoft's flag.** — My call (the package's rule: no Microsoft artwork).
  The core draws an empty part for it.
- **The Start menu's banner text comes from the layout (`"Windows"` bold and
  `"98"`) and is the same under every scheme.** — My call. Windows 98 drew its
  banner bitmap the same under every color scheme, and the "Windows 95" preset
  is a scheme of this package.
- **The taskbar sits in the Control Strip's z-band (355): above windows and
  palettes, below a modal's scrim.** — My call. Classicy's modals block the
  whole desktop, a Mac adaptation this plan keeps, so an open dialog blocks
  the taskbar as it blocks the desktop. Windows leaves the taskbar usable.
  The deviation is recorded.
- **Menus keep above the taskbar.** `classicyMenuBounds` takes the taskbar's
  band off the bottom of the box every menu, pop-up, combo box list,
  contextual menu and bevel pop-up keeps to. — My call. A window's pull-downs
  are inside the window's stacking context (z 300), under the taskbar's 355,
  so a menu that ran into the band would be hidden behind it. Windows may let
  a menu cover the taskbar; Classicy flips or caps it above the band instead.
  The band is 0 without a taskbar, so every other package's menus are placed
  exactly as today. The Start menu and the tray's pop-ups, anchored in the
  band, flip above it and sit on its top edge.
- **A maximized window is not capped by the window height reserve.** Under
  `window.zoom: "maximize"` a maximized window's root carries
  `classicyWindowMaximized`, whose one base rule sets `max-height: none`:
  `.classicyWindow`'s `calc(100% - var(--window-max-height-reserve))` (53 px
  under Windows 98) would stop it 25 px short of the taskbar. — My call. The
  existing `expanded` state cannot carry the rule, since every package emits
  it on a zoomed window.
- **The taskbar is fixed to the bottom edge, and the layout has no `edge`
  flag.** — My call. Moving the taskbar is a Taskbar Properties preference,
  which Classicy has no surface for, and no package asks for another edge.
- **Keyboard: CTRL+ESC, ALT+SPACE and ALT+F4 are bound where the browser lets
  them through.** — My call. ALT+TAB, ALT+ESC and the Windows key are not
  bound. Windows reserves ALT+TAB, ALT+ESC and the Windows key itself. The
  Windows key is Command on macOS, which Classicy leaves to the browser.
- **A file dragged over a task button activates that button's window after
  500 ms, as WIG Ch.3 (p.16) and Ch.10 (p.211) ask.** — My call. The delay is
  the double-click time Windows uses for its hover timers (Wine
  `tooltips.c`). The guidelines give no figure.
- **The Application menu's Hide, Hide Others and Show All have no home under
  the shell.** — My call. Windows has no application-level hide. The
  taskbar's Minimize All Windows and Undo Minimize All are its counterparts,
  and an app hidden earlier in the session (under another package) is shown
  by activating any of its task buttons (`markAppFocused` shows it). The App
  Switcher's list of open apps becomes the task buttons. An open app with no
  open window has no button, as in Windows; choosing it in Start ▸ Programs
  reopens its windows (`openApp` clears every window's `closed`), so nothing
  an app offers is stranded.
- **A tray icon whose module has only a menu opens that menu on button 1.**
  — Windows 98 as shipped over WIG p.211's "do not display anything": its own
  Display indicator (QuickRes) opened its menu of settings on a click.
  Classicy's Screen Saver and Appearance modules' menus are their controls.
  Button 2 opens the same menu, as the WIG asks.
- **The balloon toggle stays reachable with no window open.** Start ▸
  Settings holds "Show Balloons" / "Hide Balloons" (⌥H) beside Control Panel.
  — My call. The screen bar's Help menu held it at all times; under the shell
  only window bars have a Help menu. Settings is where Windows 98's Start
  menu kept system preferences.
- **No new action type.** Every shell command dispatches existing actions:
  `ClassicyWindowCollapse`/`Expand`/`Zoom`/`Focus`/`Move`/`Resize`/`Close`
  from the window's own paths, `ClassicyAppOpen` from the Start menu, the
  tray and the taskbar's menu, `ClassicyDesktopSetBalloonHelp` and
  `ClassicyDesktopShowSystemDialog` from the existing menu items. The one new
  payload field, `ClassicyWindowZoom`'s `restore`, is on the guarded floor
  (`ClassicyWindow*`), so no HyperCard script or other untrusted dispatch can
  minimize, maximize or move a window. The allowlist is unchanged.

### Rejected alternatives

- **A new `minimized` window field.** It leaves a minimized window
  unreachable under a package with no taskbar, and changes every package's
  persisted shape.
- **A structural `taskbar.height` knob in the core floor.** It adds a
  property to every package's desktop root, and the floor's values are pinned
  to `platinum.json`, which has no taskbar.
- **Merging Help into every window bar in window placement, with or without a
  taskbar.** It changes the `mirrored` package's window bars. The shell gives
  Help a home only where the taskbar has taken away the screen bar.
- **Keeping the screen bar styled as the taskbar.** The owner's request
  retires that adaptation (audit 3.1, 3.2, "Mac-structure adaptations").
- **The taskbar above modals.** A user could switch apps under an app-modal
  dialog, which the core's modal model does not support.
- **Lifting window menus above the taskbar** (portaling each window
  pull-down out of its window). It would change where every package's window
  menus live in the DOM, for a gain the menu bounds give with no DOM change.
- **A `minimized` state or `display: none` keyed on `collapsed`.** The 16
  states are fixed, and `collapsed` is drawn by every package as WindowShade.
- **Cascade Windows and Tile Windows in the taskbar's menu.** The guidelines
  do not require them, and they would be new window-arrangement behavior. The
  menu offers Minimize All Windows (WINDOWS+M's command), Undo Minimize All
  (SHIFT+WINDOWS+M's) and Properties. Toolbars ▸ goes with Quick Launch (out
  of scope).
- **Windows' flag on the Start button.** It is Microsoft artwork.

## Design

### 1. Layout flags

Each flag is optional in `ClassicyAppearanceLayoutSchema`
(`src/Appearance/ClassicyAppearancePackageSchema.ts`) and in the
`ClassicyAppearanceLayout` type (`src/Appearance/ClassicyAppearancePackage.ts`).
With a flag absent, the core does what it does today. Platinum and System 7
declare none of them, and neither does Storybook's `mirrored` package.
Components read the flags with `useClassicyAppearanceLayout()`, reducers with
`getClassicyAppearanceLayout(ds.System.Manager.Appearance.packageId)`.

| Key | Values (default first) | Windows 98 | Drives | Justification |
| --- | --- | --- | --- | --- |
| `taskbar` (group) | absent; `{ startLabel?, startBanner? }` | `{ "startLabel": "Start", "startBanner": { "title": "Windows", "edition": "98" } }` | `ClassicyDesktop` mounts `ClassicyTaskbar` in place of `ClassicyControlStrip`. The Control Strip's modules, the menu bar extensions and the clock become the tray. Each window's menu bar ends with the Help menu (§4). | WIG Ch.3 (pp.15–16), Ch.9 (p.175), Ch.10 (pp.211–212); owner |
| `taskbar.startLabel` | `"Start"`; 1–24 characters, trimmed, no control characters | `"Start"` | the Start button's label | Figure 3.1. A host can relabel it. |
| `taskbar.startBanner` | absent (no banner); `{ title, edition? }`, each 1–24 characters | `{ "title": "Windows", "edition": "98" }` | the Start menu's vertical banner, its title bold | Windows 98 shipped one. Text belongs in the layout because the theme has no text. |
| `window.collapse` | `"shade"`, `"minimize"` | `"minimize"` | `"minimize"`: the collapse box minimizes. The window leaves the screen and keeps its taskbar button. Focus passes on, and activating the window restores it (§5). | WIG Ch.6 (p.85) |
| `window.zoom` | `"standard"`, `"maximize"` | `"maximize"` | `"maximize"`: the zoom box fills the desktop less the taskbar, with the frame off-screen, and Restore returns the stored rect (§5). `zoomMode` and `idealSize` are ignored: Windows has one maximized state. | WIG Ch.6 (pp.84–85), audit 6.6 |
| `window.titleDoubleClick` | `"collapse"`, `"zoom"` | `"zoom"` | `"zoom"`: a caption double-click maximizes or restores a zoomable window, whatever the desktop's `doubleClickTitleToCollapse` says (the preference stays stored and still applies under other packages); on a window that cannot zoom it does nothing | Windows 98 as shipped (`NC_HandleNCLButtonDblClk`) |
| `window.frameEdges` | `"move"`, `"resize"` | `"resize"` | `"resize"`: the four edges size a resizable window. A non-resizable or maximized window's edges are inert. Eight corner arms size two edges at once (§5). | WIG Ch.6 (p.83), audit 6.5 |
| `window.systemMenu` | `false`, `true` | `true` | The window pop-up menu opens on the caption's right-click, the icon's click, the task button's right-click and ALT+SPACE. The icon's double-click and ALT+F4 close the window. The menu's Move and Size enter the keyboard modes (§5). | WIG Ch.6 (pp.76, 78, 80, 83), Ch.7 (p.102), Ch.8 (pp.145, 164); audit 6.2, 6.3, 7.10, 8.7 |
| `window.captionTooltips` | `false`, `true` | `true` | Each caption button shows its label ("Minimize", "Maximize" or "Restore", "Close") as a forced tooltip after 500 ms: `ClassicyWindowTitleBar`'s new `buttonTooltips?` mounts, per box, a small internal component that attaches `useClassicyBalloonHelp(ref, { content: label, delay: 500 }, { force: true })`; without the prop the title bar renders as today. | Windows 98 as shipped (Windows 95 had none; the 1995 text says nothing) |
| `dialog.caption` (group `dialog`) | `"plain"`, `"titled"` | `"titled"` | `"titled"`: every modal's caption has a title and a Close box, and every modal can be moved (§6) | WIG Ch.8 (pp.145, 164, 166; Figures 8.1, 8.17) |

**Refinements**, in the schema, each with a message that names the rule:

1. `taskbar` requires `menuBar.placement: "window"`. A screen bar beside a
   taskbar would duplicate its Apple, Help and App Switcher menus in the
   Start menu, window bars and task buttons.
2. `window.collapse: "minimize"` requires `taskbar`. A minimized window has
   no way back without a taskbar button.

`CLASSICY_DEFAULT_APPEARANCE_LAYOUT` and `classicyLayoutVars` stay as they
are, so no attribute or property is added to the desktop root.
`classicyLayoutThemeVars` stays as it is too: the taskbar's band is not a
theme variable (§2).

### 2. The taskbar

**Component.** `ClassicyTaskbar`
(`src/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar.tsx`, public), with
the internal modules `ClassicyTaskbarTasks.internal.tsx`,
`ClassicyTaskbarTray.internal.tsx`, `ClassicyTaskbarClock.internal.tsx`,
`ClassicyStartMenu.internal.tsx` and `ClassicyTaskbarBand.internal.ts`.

**Props.** `className?` and `style?` follow the passthrough contract on its
root `<nav>` (one row in `ClassicyPassthrough.more.test.tsx`).
`disabledModules?` and `hideModules?` let `ClassicyDesktop` forward its
`controlStrip` prop: its `disabledModules`, and `false` hiding every tray
module.

**Mounting.** `ClassicyDesktop` renders
`layout.taskbar ? <ClassicyTaskbar … /> : controlStrip !== false && <ClassicyControlStrip … />`
in the Control Strip's place in its JSX (after `<ClassicyControlPanels />`),
so the desktop's children keep their order and Platinum's DOM is unchanged.
Windows that register in the same commit as the taskbar register before its
band is measured (the band is published in a layout effect, and their
`ClassicyWindowOpen` runs with the first render's geometry); the `ws` memo
re-clamps every record against the band on each render, so they are drawn
above the taskbar at once and their stored position is corrected on their
next move. The root calls `useClassicyAppearance("Taskbar", {}, rootRef)` for
the package's class, attributes and style, and emits no events.

**Structure** (base `ClassicyTaskbar.scss`, structure only):

```
<nav class="classicyTaskbar" aria-label="Taskbar">           position: absolute; left 0; right 0; bottom 0; z-index 355; display: flex
  <button class="classicyTaskbarStart [open]" data-classicy-part="taskbar-start"
          aria-haspopup="menu" aria-expanded aria-controls="classicy-start-menu">
    <span class="classicyTaskbarStartIcon" aria-hidden="true"></span>
    <span class="classicyTaskbarStartLabel">Start</span>
  </button>
  <ul class="classicyTaskbarTasks" data-classicy-part="taskbar-tasks" aria-label="Running windows">
    <li><button class="classicyTaskbarTask [active] [collapsed] [pressed]" aria-pressed …>
      <img class="classicyTaskbarTaskIcon" alt=""/><span class="classicyTaskbarTaskLabel">Untitled - Notepad</span>
    </button></li> …
  </ul>
  <div class="classicyTaskbarTray" data-classicy-part="taskbar-tray" role="group" aria-label="Notification area">
    <ul class="classicyTaskbarTrayIcons"> <li><button class="classicyTaskbarTrayIcon [open]" aria-label=…><img alt=""/></button></li> … </ul>
    <ul id="classicyDesktopMenuExtensions" class="classicyDesktopMenuExtensions classicyTaskbarTrayExtensions"
        data-classicy-part="extensions"></ul>
    <time class="classicyTaskbarClock" data-classicy-part="clock" dateTime=…>4:37 PM</time>
  </div>
</nav>
```

**Base rules.**
- Order: `taskbar-start` 10, `taskbar-tasks` 20, `taskbar-tray` 30.
- `.classicyTaskbarTasks` is `flex: 1 1 auto; min-width: 0; display: flex`.
- `.classicyTaskbarTaskLabel` ellipsizes (`overflow: hidden; text-overflow:
  ellipsis; white-space: nowrap`).
- The base sets no heights, widths or colors: the package's stylesheet sizes
  every part.

The new class names are declared in
`src/Appearance/vocabulary/ClassicyVocabulary.json` (component `Taskbar`:
`Clock`, `Start`, `StartIcon`, `StartLabel`, `Task`, `TaskIcon`, `TaskLabel`,
`Tasks`, `Tray`, `TrayExtensions`, `TrayIcon`, `TrayIcons`, `TrayPopup`). So are the
`data-classicy-part` values `taskbar-start`, `taskbar-tasks` and
`taskbar-tray`. `clock` and `extensions` are already declared. The states are
the existing `active`, `collapsed`, `pressed` and `open`.

**The band.** In a layout effect, and again on each `ResizeObserver` change,
the taskbar publishes its root's `offsetHeight` with
`setClassicyTaskbarBand(px)`, and publishes 0 on unmount.
`ClassicyTaskbarBand.internal.ts` is a store-free source
(`getClassicyTaskbarBand()`, `subscribeClassicyTaskbarBand`,
`useClassicyTaskbarBand()`), read by:

- **Window geometry.** `clampWindowPositionToViewport(position, size,
  menuBarHeight?, bottomBand = 0)` caps `y` at `vh − band − h`.
  `resolvePosition(…, bottomBand = 0)` centers within the work area and puts
  `"bottom"` above the band. `resolveSize(…, bottomBand = 0)` takes the band
  off a percentage height. `computeStandardRect` takes it off the room, and
  the maximized rect (§5) leaves it out. `ClassicyWindow` passes
  `useClassicyTaskbarBand()`. Every default is 0, so a desktop with no
  taskbar computes what it computes today.
- **Sizing.** `computeClassicyWindowResize` gains an optional last argument
  `ceiling: [number, number] = [Infinity, Infinity]`, the largest right and
  bottom a moving far edge may reach, measured as the release clamp measures
  (left or top plus the content size); `ClassicyWindow` passes
  `[Infinity, vh − band]` only while the band is not 0 (the frame-edge
  sizing of §5 uses the same ceiling). A grow-box drag into the taskbar then
  stops at its top instead of being moved back up by the release clamp.
  Without a taskbar the argument is not passed and the numbers are today's.
- **The desktop icon grid.** `createGrid` in `ClassicyDesktopIconContext.tsx`
  counts rows in `window.innerHeight − getClassicyTaskbarBand()`, and
  `classicyDesktopIconGridPosition` measures a bottom origin's rows from the
  same height, so Clean Up, Arrange and a newly added icon stay above the
  taskbar whatever a package's grid origin. An icon dragged by hand may still
  be dropped anywhere, as today. The module value is read in the reducer, as
  `window.innerHeight` already is.
- **Menus.** `classicyMenuBounds` (`ClassicyMenuPlacement.internal.ts`) takes
  `getClassicyTaskbarBand()` off its box's bottom (Decisions, "Menus keep
  above the taskbar"), which every menu placement reads: pull-downs and
  submenus, contextual menus (the system menu and the task buttons' and
  tray's menus included), pop-up menus, combo boxes and bevel pop-ups (the
  Start menu and the tray's pop-ups).
- **The screen saver** needs nothing: its overlay is z-index 100001, the
  startup screen 100000 and the dialog overlay 99999.

**Start button.** A `<button>`.
- A mouse-down toggles the Start menu (§3), and so do Enter, Space and
  CTRL+ESC. The button carries `open` while the menu is open.
- Escape closes the menu and leaves focus on the button.
- The label is `layout.taskbar.startLabel`.
- `classicyTaskbarStartIcon` is an empty span the package draws (no core art
  key: a new `ClassicySystemArtKey` would break System 7's every-key coverage
  test).
- A right-click on the button shows nothing: the native menu is suppressed.

**Task buttons.**

- **Which windows.** Every entry in the window registry (§5, "Shared
  plumbing") that is not `modal` or a `utility` window, whose record is open
  (`!closed`) and whose app is open, extension apps included (Apple Guide's
  help windows, like Windows' help windows, have buttons). Modal dialogs and
  palettes get none: "secondary windows do not appear on the taskbar" (WIG
  Ch.8, p.145).
- **Order.** Session-only, held in the component: the windows open at mount
  sorted by ascending `zOrder`, then each window appended when it first
  appears open, removed when it closes and appended again on reopening.
  Minimizing and activating move nothing, matching Windows' creation order.
- **Label and icon.** The window's `title`, or the app's display name
  (`classicyAppIdentityFrom`) when the title is empty, and the window's
  `icon` at 16 px.
- **States.**
  - `active`: the record is `focused`, its app is focused, and the window is
    not minimized. While a modal or palette of that app holds focus, the
    app's highest-`zOrder` open, unminimized document window keeps the
    pressed button, as Windows keeps an owner's button pressed under its
    dialog. The button also gets `aria-pressed="true"`.
  - `collapsed`: the window is minimized.
  - `pressed`: between a mouse-down on the button and the release.
- **Click** (ReactOS `HandleTaskItemClick`):
  - A minimized window runs the `restore` command (expand, then activate).
  - The active window runs `minimize` when it can be minimized
    (`collapsable`).
  - Any other window runs `activate`.
- **Right-click.** Activates a window that is not minimized, then runs
  `systemMenu` at the pointer. A minimized window's menu opens without
  restoring it, and its Restore restores it. With `window.systemMenu` off,
  the command reports `false` and nothing opens (the native menu stays
  suppressed).
- **Size.** The package's stylesheet sizes the buttons to Windows' rule (§7).
  When a label is cut short (`scrollWidth > clientWidth`, measured at hover),
  the button shows the full title as a tooltip:
  `useClassicyBalloonHelp(ref, { content: title, delay: 500 }, { force: true })`.
- **Drops.** Every button carries `data-classicy-drop-activate`. While a
  Classicy file drag rests on it for 500 ms, `ClassicyFileDrag.ts` dispatches
  `classicy:dropactivate` on the element and the button runs `restore` or
  `activate`. `.classicyTaskbar` joins `BLOCKING_SELECTOR`, so the taskbar
  takes no drops. The drag's hover check looks for the topmost
  `[data-classicy-drop-activate]` under the pointer before the blocking
  check, which would otherwise stop at the taskbar first. Leaving the button
  or ending the drag clears the timer.

**The tray.**

- **Modules.**
  `arrangeClassicyControlStripModules(useClassicyControlStripRegistrations(), { disabledModules, moduleOrder, mountedApps })`,
  less the persisted `hiddenModules`, left to right. If the persisted
  `controlStrip.visible` is `false` (the Control Strip control panel's
  checkbox), or the host passed `controlStrip={false}`, the tray shows no
  modules. The clock stays. The strip's own settings (`collapsed`, `width`,
  `edge`, `bottom`) mean nothing to the tray: they stay stored, unchanged,
  and apply again under a package that draws the strip.
- **Publishing the host's choice.** The taskbar calls
  `setClassicyControlStripDisabledModules`, as the strip does, so the Control
  Strip control panel keeps offering what the tray shows.
- **Each module** renders as its own component, keyed `id:revision` as the
  strip keys it, because a module's function-form `icon` and `menuItems` and
  its `content` component are hooks. The component draws a plain
  `<button class="classicyTaskbarTrayIcon">` with the module's 16 px icon and
  `aria-label` = `classicyControlStripModuleLabel`, and opens its surface
  itself with `ClassicyBevelButtonPopup` (`anchor` the button's rect,
  `side="below"`, `align` `"start"` for a menu and `"center"` for content,
  `buttonRef`, `onClose`, `className="classicyTaskbarTrayPopup"`). The popup flips above the button, since the menu
  bounds end at the band. It is not a `ClassicyBevelButton`, whose
  press-and-hold menu and sticky-click rules a tray icon does not have. The
  button carries `open` while its surface is open.
- **Clicks on a module** (WIG Ch.10 pp.211–212):
  - Button 1 opens the `content` component (the Sound slider), else
    `menuItems` (Decisions), above the icon. When the menu holds an
    `isDefault` item, the popup opens only once the double-click time
    (500 ms) has passed without a second click, so a double-click runs the
    default alone, as Windows' indicators tell a click from a double-click.
  - Button 2 opens `menuItems` as a contextual menu at the pointer, or
    nothing for a content-only module.
  - A double-click runs the `menuItems` item marked `isDefault`, if any.
  - The tooltip (forced, 500 ms) is the module's label (audit 7.28).
- **The extensions region** keeps the id `classicyDesktopMenuExtensions`. The
  screen bar `ClassicyDesktop` mounts is headless under a taskbar
  (refinement 1), so the id is unique unless a host mounts a second
  `ClassicyDesktopMenuBar` of its own with `placement="screen"`, which it
  documents against. `ClassicyMenuBarExtension` looks the region up again
  when the placement *or* the taskbar's presence (`layout.taskbar !==
  undefined`) changes. Its menus open from the item's bottom and keep to the
  menu bounds, which end at the band, so they are pinned upward above the
  taskbar.

**The clock.**
- The tick that `ClassicyDesktopMenuWidgetTime` runs (the anchored virtual
  clock, and the minute dispatch of `ClassicyManagerDateTimeSet`) moves into
  `useClassicyClockTime.internal.ts`, which both clocks use. The widget's DOM
  is unchanged, pinned by a test written before the move.
- The taskbar clock shows the time in Windows' short format: `h:mm AM` with
  `militaryTime` off, `HH:mm` with it on. Seconds, the day and flashing
  separators are Mac menu-bar options it ignores.
- It is hidden while `DateAndTime.show` is false.
- Its forced tooltip is the long date: `Wednesday, November 25, 2026`
  (Windows 98's US `DATE_LONGDATE`).
- A double-click opens `DATE_AND_TIME_MANAGER_APP_ID`.
- A right-click shows the taskbar's menu with "Adjust Date/Time" first, bold
  (`isDefault`), as Windows 98's clock menu has it.

**The taskbar's own menu.** A right-click on the taskbar's background (the
root, the empty task list or the tray's padding) shows these items, and stops
the desktop's menu:

1. **Minimize All Windows.** Minimizes every open, unminimized,
   collapsable, non-modal, non-utility window, by dispatching
   `ClassicyWindowCollapse` for each from the one menu-item handler (one
   event, so React commits once and only the final focus emits a pageview).
   It is disabled when there is none. This is WINDOWS+M's command (App. B
   Table B.3, p.359). The taskbar remembers, for the session, which windows
   it minimized and which window was active. While that list holds a window
   that is still open and minimized, the item reads **Undo Minimize All**
   instead (SHIFT+WINDOWS+M's command): it dispatches `ClassicyWindowExpand`
   for each, then `ClassicyWindowFocus` for the window that was active, and
   forgets the list. Restoring or closing any listed window by other means
   also forgets it.
2. A separator.
3. **Properties.** Opens `CONTROL_STRIP_MANAGER_APP_ID`, whose settings now
   drive the tray.

**Keyboard.** A document `keydown` listener (`useClassicyTaskbarKeys.internal.ts`)
toggles the Start menu on CTRL+ESC (App. B Table B.2, p.358) and calls
`preventDefault`. On Windows hosts the OS takes CTRL+ESC and the page never
sees it. Elsewhere it reaches the page.

**Accessibility.**
- The root is a `<nav aria-label="Taskbar">`.
- The Start button has `aria-haspopup="menu"`, `aria-expanded` and
  `aria-controls`.
- Task buttons are `<button aria-pressed>` items of a labelled list.
- The tray is a labelled `group`, and its icons are labelled buttons.
- The clock is a `<time>` element whose `aria-label` is the long date and the
  time.

### 3. The Start menu

**Surface.** `ClassicyStartMenu.internal.tsx` renders `ClassicyBevelButtonPopup`
(`id="classicy-start-menu"`, `className="classicyStartMenu"`, `anchor` the
Start button's rect, `side="below"`, `align="start"`, `buttonRef` the Start
button, `focusFirstItem` when opened by the keyboard, `onClose` clearing the
button's `open`). That component already places a surface against an anchor with
`classicyBevelPopupPlacement` and `classicyMenuBounds`, flipping it above when
there is no room below (as at the foot of the desktop) and keeping it on
whole pixels inside the desktop. It also closes the surface on an outside
press, Escape, scroll, resize and a choice, and walks items with the arrow
keys.

It gains one optional prop, `aside?: ReactNode`, rendered as the surface
root's first child before the menu. The Start menu passes the banner there:

```
<div class="classicyStartMenuBanner" data-classicy-part="start-menu-banner" aria-hidden="true">
  <span class="classicyStartMenuBannerTitle">Windows</span><span class="classicyStartMenuBannerEdition">98</span>
</div>
```

With no `startBanner`, there is no aside. Base `ClassicyStartMenu.scss`
(structure): `.classicyStartMenu { display: flex; flex-direction: row }`, the
banner first. Vocabulary: component `StartMenu` (`Banner`, `BannerEdition`,
`BannerTitle`) and the part `start-menu-banner`.

**Items.** Built by the pure `classicyStartMenuItems(…)`
(`ClassicyStartMenuItems.internal.ts`), so tests can read the structure
without rendering:

1. **About This Computer.** The Apple menu's `about` item, with
   `image: system.macos`.
2. Separator.
3. **Programs ▸** (`image: system.folders.applications`). One item per app
   in the derived Applications folder: an app-shortcut icon record with
   `inApplications !== false` (the predicate becomes the exported
   `isClassicyApplicationsEntry` in `ClassicyFileSystemApplications.ts`)
   whose app is mounted (`useClassicyMountedApps`). Each item has the app's
   display name and 16 px icon, `event: "ClassicyAppOpen"` with the internal
   identity, and the list is sorted by display name. When the list is empty,
   a disabled "(Empty)" item stands in, as Windows shows an empty folder
   menu.
4. **Settings ▸ Control Panel ▸** (`image: system.folders.controlPanels`).
   The Apple menu's `system_menu_<appId>` entries whose app is not in the
   Applications folder. Among the bundled apps these are Appearance, Sound,
   Date & Time, Screen Saver and Control Strip (`showInApplicationsFolder=
   {false}`). Drive Setup and Calculator are listed in Applications, so they
   appear under Programs only. Each item has its display name
   (`withClassicyAppIdentityMenuItems`), and the list is sorted. After
   Control Panel, a separator, then **Show Balloons** / **Hide Balloons**
   (⌥H): the screen bar's toggle item, `event: "ClassicyDesktopSetBalloonHelp"`
   (Decisions). Its chord is already dispatched by the headless bar, so the
   item only shows it.
5. **Help** (`image: system.help`).
   `event: APPLE_GUIDE_SHOW_TOPIC_EVENT, eventData: { topicId: ABOUT_BALLOON_HELP_TOPIC_ID }`,
   Classicy's Help Topics.
6. Separator.
7. **Empty Trash…** (`image`: the Trash art from `useClassicyTrashIcon`).
8. **Reset PRAM…** (`image: system.bigSwitchOff`). Both come from
   `classicySpecialMenuItems(dispatch, "start")`, in Shut Down's place.

First-level items carry their icons through `image`. The package draws them
at 32 px and the submenus' at 16 px (§7). The first level has no keyboard
shortcuts, so no shortcut column; only Settings' balloon toggle shows one.
The hooks' values (the Trash art from `useClassicyTrashIcon`, the mounted
apps, the identity overrides, `disableBalloonHelp`) are passed in, so the
builder stays pure. Choosing an item closes the menu (the popup's
`ClassicyMenuProvider` `onClose`).

### 4. Window menu bars under the shell, and Help everywhere

**Shared helpers** (`src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal.ts`).
These are moved, unchanged, out of `ClassicyDesktopMenuBar.tsx`:

- `findClassicyAppAboutItem`, `stripClassicyAboutItem` and
  `trimClassicyMenuSpacers`, the former private `findAppAboutItem`,
  `stripAboutItem` and `trimSpacers`;
- `classicySystemHelpItems(disableBalloonHelp)`: About Balloon Help… and
  Show/Hide Balloons ⌥H, the items the screen bar builds today.

These are new:

- `isClassicyAppHelpMenu(item)`: a top-level item with `menuChildren` whose
  `part` is `"help"`, whose `id` ends with `_help`, or whose `title` is
  `"Help"`;
- `classicyHelpMenuChildren(system, registered, appHelpMenus)`. It returns
  the system items, then a divider and the app's registered items
  (`Desktop.helpMenu[appId]`) if any, then a divider and the items of the
  app's own Help menus if any. An app item whose `event` is
  `"ClassicyDesktopSetBalloonHelp"` is dropped, because the system Help
  already has the toggle.

**Screen bar (every package).** The bar removes the app's Help menus from the
menus it draws and passes them to `classicyHelpMenuChildren`, which
`help-menu` then uses. About is still hoisted to the Apple menu before the
merge, as today. Finder's `…_help_balloon` item becomes
`{ event: "ClassicyDesktopSetBalloonHelp", eventData: { disableBalloonHelp: !disableBalloonHelp } }`.
Its title and id are unchanged, so it still works in a window bar and the
merge recognizes it.

The chord registrations do not move with the items. `appChordsKey` is still
collected from the raw `appMenu`, so an app's Help chords stay app-scope, and
`systemChordsKey` is collected from the Apple menu and the system's own Help
items (`classicySystemHelpItems`), not the merged menu, so the system scope
claims exactly what it claims today and the Keyboard Equivalent dialog's
`inUse` owner names stay the same. The dispatcher resolves a chord in the
merged menu depth-first; an app Help item whose chord equals ⌥H would now
lose to the system toggle, which no bundled app has and which the dedupe
already removes for the balloon toggle.

What Platinum and System 7 draw afterwards: one Help menu, still the last
standard menu, still titled with System 7's art. With a Finder window
focused, it holds the same two items as with the desktop focused. Before the
fix, a second "Help" title held Finder's "Hide Balloon Help". An app whose
Help menu holds more than About finds those items in the system Help menu
after a divider, in the HIG's order. No other title moves. The parity shots
that differ are exactly those with a Finder window focused and the screen bar
in view.

**Window bars under a taskbar.** `ClassicyWindowMenuBar`, when
`layout.taskbar` is set, draws these items:

1. The window's `appMenu`, its About item stripped
   (`stripClassicyAboutItem`) and its Help menus removed.
2. A last menu,
   `{ id: \`${appId}_${windowId}_help-menu\`, title: "Help", part: "help" }`,
   whose children are `classicyHelpMenuChildren(…)`, then, if the app has an
   About item, a divider and "About *display name*". The item keeps its
   handler, and the title uses `classicyAppIdentityFrom`. These are WIG
   Ch.7's Help Topics and "About *application name*" (p.99).

Which windows get a bar is unchanged: a window with a non-empty `appMenu` that
is not a utility window, not modal and not WindowShaded. A minimized window's
bar stays mounted while the window is hidden. Without a taskbar, the window
bar draws the `appMenu` as today: `withClassicyAppIdentityAboutItem`, and no
Help of its own. So `mirrored` is unchanged.

**Keyboard equivalents.** The headless screen bar still runs
`useClassicyShortcutDispatcher` over the focused window's `appMenu` and the
system Help (⌥H). The window bars dispatch nothing, as today.

**No command lost with the desktop focused** (Finder focused, no window):

- The desktop's own File, Edit, View and Special menus stay on the empty
  desktop's contextual menu (`defaultMenuItems` in `ClassicyDesktop.tsx`, as
  today).
- Empty Trash… stays on the Trash icon's menu and in the Start menu.
- Reset PRAM… is in the Start menu and the desktop's menu.
- About This Computer and Help are in the Start menu, and the balloon toggle
  in Start ▸ Settings.
- Items an app registers for Finder (`Desktop.helpMenu["Finder.app"]`) are in
  every Finder window's Help; with no Finder window open, a double-click on
  the startup disk opens one.
- ⌃⌫ still dispatches through the headless bar.
- The desktop's effect that reinstalls its menus in `Desktop.appMenu`
  (`desktopOwnsBar`) counts only windows that are not minimized under
  `window.collapse: "minimize"`.

### 5. Minimize, maximize, restore, close; the system menu; sizing; the caption's double-click

**Shared plumbing** (`src/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal.ts`).
Each mounted `ClassicyWindow` registers, in an effect keyed on the values it
publishes, an entry:

```ts
{ appId, windowId, title, icon, modal, windowType, closable, zoomable,
  collapsable, resizable, movable,
  run(command: ClassicyWindowCommand): boolean }
// ClassicyWindowCommand:
//   { type: "activate" } | { type: "minimize" } | { type: "restore" }
// | { type: "maximize" } | { type: "close" }
// | { type: "systemMenu"; at?: [number, number] } | { type: "move" } | { type: "size" }
```

Each command runs the window's own path, so sounds, analytics, the
`onBeforeClose` veto and the zoom geometry stay where they live:

| Command | Path |
| --- | --- |
| `activate` | `setActive` |
| `minimize` | `setCollapse(true)` |
| `restore` | minimized: `setCollapse(false)` (a maximized window comes back maximized); else maximized: `applyZoom(false)`; then `setActive` |
| `maximize` | `applyZoom(true)` (which expands a minimized window first, as `setZoomFlag` already does), then `setActive` |
| `close` | the caption Close box's action: `close()` when `closable`, else, under `dialog.caption: "titled"`, `onCaptionClose`; else nothing (`false`) |
| `systemMenu` | the system menu (below) |
| `move`, `size` | the keyboard modes (below) |

`run` returns `false` for a command the window cannot carry out. The
registry offers `useClassicyWindowEntries()` (`useSyncExternalStore`) and
`runClassicyWindowCommand(appId, windowId, command)`. Registering changes no
DOM and no store, under every package. Modals register too, which the system
menu and ALT+F4 need.

- The entry's `run` calls the window through a ref updated every render, as
  `docMoveHandlerRef` is, so the registration effect re-runs only when a
  published value changes, never on every render.
- The registry keeps one immutable snapshot, replaced on each register,
  update and unregister, so `useSyncExternalStore` sees a stable value.
- Registering returns a token. Unregistering with a stale token (a
  StrictMode phantom cleanup after the remount registered again) removes
  nothing.

**Minimize** (`window.collapse: "minimize"`).
- **Rendering.** `ClassicyWindow` derives
  `minimized = ws.collapsed && collapse === "minimize" && !modal && windowType !== "utility"`
  and `shaded = ws.collapsed && collapse === "shade"` (`collapse` defaulting
  to `"shade"`, so `shaded === ws.collapsed` for every other package). Every
  render-only `ws.collapsed` decision uses `shaded`: the frame edges, header,
  placard, grow box, menu bar, the contents' `collapsed` state, the inline
  height and `minHeight`, and the root's `collapsed` state. The guards that
  must not measure or move a window that is not drawn at its size
  (`setResize`, the keyboard-focus effect, the resize minimum) read
  `shaded || minimized`, which is `ws.collapsed` except for a modal or
  palette under the flag, whose collapse is ignored (Decisions). A minimized
  window keeps its whole tree mounted, so its children keep their state. Its
  root carries `classicyWindowMinimized` (vocabulary: Window part
  `Minimized`), and `ClassicyWindow.scss` has the one base rule
  `.classicyWindow.classicyWindowMinimized { display: none; }`. No other
  package emits the class.
- **Palettes.** Under the flag a `utility` window also carries
  `classicyWindowMinimized` while its app has at least one open document
  window and every open document window is minimized (Decisions), read from
  the app record the window already subscribes to.
- **No bubbling restore.** Under the flag the collapse box's click handler
  calls `e.stopPropagation()`. Without it the click would reach the root's
  `setActive` (for a window that was not focused) and `ClassicyApp`'s
  container, whose `ClassicyAppActivate` would `focusApp` the app's
  last-accessed window, the one just minimized, and restore it at once.
  Without the flag the click bubbles as today.
- **Zoom kept.** Under the flag `setCollapse(true)` skips its
  `setZoom(false, true, "collapse")` (Decisions).
- **Labels.** `ClassicyWindowTitleBar` gains
  `labels?: { close?, zoom?, collapse? }` (defaults "Close", "Zoom",
  "Collapse"). Under the flag the collapse box is labelled "Minimize".
- **Reducer** (`ClassicyWindowCollapse`, under the flag).
  - The collapse is refused for a `modal` or `utility` record. Neither has a
    taskbar button, so collapse-all and a host dispatch skip them.
  - The record gets `collapsed: true` and `focused: false`.
  - If the window was focused and its app held focus, focus passes on through
    `classicyVisibleSuccession(ds, appId, windowId)`: the app's highest-
    `zOrder` open, unminimized, non-utility, non-modal window; else the
    highest-`zOrder` such window of any other open app, Finder and extensions
    included (an Apple Guide window has a task button, so it is a primary
    window here), which is Windows' next window in Z-order; else
    `markAppFocused(ds, "Finder.app")` with no window focused, which is the
    desktop. `zOrder` is a focus timestamp (`focusWindow` stamps
    `max(Date.now(), top + 1)`), so it orders windows across apps too.
  - Under the flag, `ClassicyWindowClose` and `ClassicyWindowDestroy` use the
    same succession, so closing a window never restores a minimized sibling
    and never leaves an app focused with no window to show its menus.
    Without the flag both are unchanged.
- **Activation restores.** `focusWindow` (`ClassicyAppHelpers.ts`) clears
  `collapsed` when it focuses a minimized document window under the flag.
  Activating a minimized window restores it, as ALT+TAB and the taskbar do
  (WIG Ch.6, p.85). So `focusApp` (Start ▸ Programs on an open app, whose
  `openApp` focuses it) brings back its last-accessed window.
  `pickWindowToRestore` is unchanged. Nothing but a deliberate activation
  reaches a minimized window: its own clicks cannot (it is not drawn), the
  minimize click does not bubble (above), and the succession never picks it.
  `ClassicyApp`'s refocus effect (`defaultWindow`) runs only while its app is
  focused with no focused window, which the succession never leaves an app
  in after a minimize.
- **Persistence.** `collapsed` persists as today. A package switch shows a
  minimized window as a WindowShade title bar under Platinum, and a shaded
  window as minimized under Windows 98 (a shaded palette or dialog is drawn
  expanded there, its flag kept).
- **Option-click collapse-all** minimizes every window that has a minimize
  box, under the reducer's guard (its click does not bubble either).
  Expand-all restores them.

**Maximize and restore** (`window.zoom: "maximize"`).
- **The maximized rect.** The pure
  `classicyMaximizedWindowRect({ width, height, top, bottomBand, chrome })`
  (`ClassicyWindowMaximize.ts`, exported like `computeClassicyWindowResize`)
  returns `position = [−chrome.left, top − chrome.top]` and
  `size = [width, height − top − bottomBand]`. The window's content box is
  the desktop less the menu-bar band (0 under the shell) and the taskbar's
  band. Its frame lies just outside the work area: clipped by the desktop's
  `overflow: hidden` on three sides, under the taskbar at the bottom. This is
  Windows 95/98 as shipped, whose maximized window rect is grown by
  `SM_CXFRAME` on each side, so the caption touches the screen's top and
  sides. `classicyWindowChromeEdges(el)` gives the per-side padding plus
  border.
- **`applyZoom(true)`** remembers the user rect (`userStateRef`) as today and,
  under the flag only, adds it to the dispatch:
  `ClassicyWindowZoom { zoomed: true, restore: { position, size } }`. The
  reducer stores `restoreRect` only when `restore` is given and both pairs
  are finite numbers (`hasWindowZoomed` is extended to check the optional
  field, as the other predicates check theirs), and deletes it on
  `zoomed: false`. The window then applies the maximized size and position.
- **`restoreRect` persistence.** It is a new optional field of
  `ClassicyStoreSystemAppWindow` (`ClassicyAppManager.ts`). It must survive a
  reload, so `sanitizeStateForPersistence` keeps it; no migration step is
  needed (absent means "none"), and the default state seeds none. Its reader,
  `applyZoom(false)`, uses it only when both pairs are finite numbers, so a
  hand-edited store cannot place a window at `NaN`. A Platinum or System 7
  session never writes it, so their persisted bytes are unchanged.
- **The root while maximized** carries `classicyWindowMaximized` (vocabulary:
  Window part `Maximized`), whose base rule in `ClassicyWindow.scss`,
  `.classicyWindow.classicyWindowMaximized { max-height: none; }`, lifts the
  height reserve (Decisions). Only `window.zoom: "maximize"` emits it.
- **`applyZoom(false)`** restores `userStateRef`, else the record's
  `restoreRect`, else, under the flag only, the window's initial rect
  (`resolvedSize` at `resolvedPosition`). The `restoreRect` fallback runs
  under every package, but only a window maximized under Windows 98 ever has
  one. Platinum un-zooming a window maximized under Windows 98 after a
  reload is restored, which before would have kept the maximized geometry.
- **While maximized:**
  - The `ws` memo skips its viewport clamp, so the negative position stands.
  - `startMoveWindow` refuses to move the window: dragging a maximized
    window's caption does nothing in Windows 95/98.
  - The frame edges, corner arms and grow box are not rendered.
  - The content-resize recentering is skipped.
  - A `ResizeObserver` on `#classicyDesktop` and the taskbar band re-apply
    the rect when either changes. So does mounting maximized, after a reload
    or a package switch.
- **Restore glyph and labels.** The root keeps `expanded`, which Windows 98
  already draws as Restore. The zoom box is labelled "Maximize", or
  "Restore" while maximized.

**The caption's double-click** (`window.titleDoubleClick: "zoom"`).
`onTitleDoubleClick` toggles the zoom when `zoomable`, whatever
`doubleClickTitleToCollapse` says; on a window that cannot zoom it does
nothing (it never falls back to a collapse). A modal's caption does nothing.
A double-click on the icon closes the window (below) and stops propagation,
so the caption's handler never also runs.

**The window pop-up (system) menu** (`window.systemMenu: true`).
- **Builder.** The pure `classicyWindowSystemMenuItems(state, handlers)`
  (`ClassicyWindowSystemMenu.ts`):

| Window | Items, in order (WIG Ch.7 p.102; Ch.8 pp.145, 164) | Enabled when (Wine `MENU_InitSysMenuPopup`) |
| --- | --- | --- |
| primary (document) | Restore, Move, Size, Minimize, Maximize, —, Close | Restore: minimized or maximized. Move: neither, and movable. Size: `resizable` and neither. Minimize: `collapsable` and not minimized. Maximize: `zoomable` and not maximized. Close: `closable` or a caption close (§6) |
| secondary (modal) | Move, —, Close | Move: movable. Close: as above |
| palette (utility) | Move, Size, —, Close | Size: `resizable` |

- **Item details.** Close is the default item (`isDefault`, bold) and shows
  `⌥F4`. ClassicyKbd's glyph spelling stays (audit 7.15, the Mac keyboard
  adaptation). Ids are `${appId}_${windowId}_system_<command>`. Move stays
  disabled while minimized: a hidden window has nothing to move, where
  Windows 3.1 moved an icon.
- **Where it opens.** Each place shows the menu with `showContextMenu(items,
  at)` (`ClassicyContextualMenuProvider`) after activating the window:
  - a right-click inside `.classicyWindowTitleBar`, its icon and boxes
    included, at the pointer (WIG pp.76, 80, 102). A right-click elsewhere
    in the window keeps today's `contextMenu` resolution.
  - a mouse-down on `.classicyWindowIcon` (`e.detail === 1`), at the icon's
    bottom-left, stopping propagation so `.classicyWindowTitle`'s
    `onTitleMouseDown` never arms a move. Windows 98 as shipped does this;
    WIG pp.78 and 102 note it.
  - ALT+SPACE on the focused window, at its icon's bottom-left, or, for a
    window that draws no icon (a modal, a palette, `hideIcon`), its title
    bar's bottom-left. The listener is
    `useClassicyWindowShellKeys(enabled)`
    (`src/SystemFolder/SystemResources/Window/useClassicyWindowShellKeys.internal.ts`),
    called by `ClassicyDesktop` with `enabled = layout.window.systemMenu ===
    true`; disabled, it binds nothing.
  - the `systemMenu` command, at the given point (the task button's
    right-click).
- **Closing from the icon and the keyboard.** The second press of a
  double-click on `.classicyWindowIcon` (`e.detail >= 2`) does not reopen the
  menu; its `dblclick` hides the open system menu (`hideContextMenu`) and runs
  the `close` command, as Windows closes on `WM_NCLBUTTONDBLCLK` over the
  system-menu icon. ALT+F4 runs the focused window's `close` command, so a
  dialog follows its caption Close box (§6): a non-closable alert with no
  cancel-role button stays open, as Windows ignores ALT+F4 when a message box
  grays its Close. With no window focused ALT+F4 does nothing (Windows 98's
  Shut Down dialog has no Classicy counterpart). Both keys are bound where
  the browser lets them through, and skip an event already
  `defaultPrevented`. Windows takes ALT+F4 and ALT+SPACE before the page,
  while macOS delivers both as Option chords. A text field's Option+Space (a
  non-breaking space) gives way to the menu, as ALT+SPACE does in Windows;
  this deliberately differs from the shortcut dispatcher's rule that
  Option-only chords never act in a text field, and only under the flag.
- **`ClassicyWindowTitleBar` props.** It gains `onIconMouseDown?` and
  `onIconDoubleClick?`. Without them the icon stays inert. (Its other new
  props: `labels?` §5 "Minimize", `closeDisabled?` §6, `buttonTooltips?` §1.)
- **Analytics.** The caption's right-click keeps the root's
  `track("contextMenu", …)` call, with `show: true`; the commands keep the
  window's own `track` calls (`collapse`, `expand`, `zoom`, `close`, `move`,
  `resize`). No pageview is added: the menu is no window.

**Frame-edge sizing** (`window.frameEdges: "resize"`).
- **The math.** The pure
  `computeClassicyWindowEdgeResize(edges, startRect, startPointer, pointer, chrome, minimum, floor, ceiling)`
  (`ClassicyWindowResize.ts`) moves the named edges by the pointer's travel.
  A left or top edge stops at the floor
  (`windowViewportFloor(menuBarHeight)`), a right or bottom edge at the
  ceiling (§2 "Sizing": the taskbar's top while one is mounted), and any
  moving edge stops where the content would pass `minimumSize`. It returns
  `{ size, position }`, as `computeClassicyWindowResize` does, so the release
  clamp never moves a window the user has just sized.
- **Which windows.** On a resizable window that is neither maximized nor
  shaded, the root carries `classicyWindowSizingBorder` and the four edge
  handles call `startEdgeResize`. On a non-resizable or maximized window the
  edges are inert: a fixed border neither moves nor sizes in Windows. The
  gesture reuses the grow box's machinery: `isResizingRef`,
  `pendingSizeRef`, the inline width and height, the release through
  `endResize` and `setMoving`, and the pointer-stream watch.
- **Corner arms.** Eight
  `<div class="classicyWindowFrameCorner classicyWindowFrameCorner-<corner>-<arm>">`
  elements: corners `top-left`, `top-right`, `bottom-left`, `bottom-right`;
  arms `h` (along the top or bottom edge) and `v` (along a side). Each is
  `--window-title-bar-height` long, 18 under Windows 98: Wine's
  `NC_HandleNCHitTest` makes a corner `SM_CXSIZE` along the top and bottom
  edges and `SM_CYSIZE` along the sides, both `iCaptionHeight`/`Width`, 18.
  Each is `--window-padding-size` thick, the edge handles' own thickness, so
  an arm covers its edge's end exactly. They sit above the edges (z-index 6,
  under the resizer's 999) and size both edges of their corner.
- **Cursors.** Base `ClassicyWindow.scss` gives the edges and arms their
  resize cursors in the registry's idiom, an image layer then a keyword (an
  undefined variable must not void the declaration), keyed on
  `classicyWindowSizingBorder`:
  `cursor: var(--classicy-cursor-resize-ud, url('data:,')) var(--classicy-cursor-resize-ud-hotspot, 8 8), ns-resize;`
  for the top and bottom edges, `resize-lr` with `ew-resize` for the sides,
  `resize-nwse` with `nwse-resize` and `resize-nesw` with `nesw-resize` for
  the corners. Windows 98 registers no cursors, so these resolve to the
  default package's (Platinum's) art, as the grow box's do today.
- **Vocabulary.** Window parts `SizingBorder` and `FrameCorner`. The
  hyphenated suffixes are outside the token scan, as `classicyWindowFrameEdge-`
  already is.

**Keyboard Move and Size** (the `move` and `size` commands, WIG Ch.6 p.83;
Wine `winpos.c`).
- **Move.** Allowed when the window is movable, not maximized and not
  minimized.
  - The store's `moving` is set, so the root shows the package's drag band.
  - The arrow keys move the window 8 px (`CLASSICY_WINDOW_KEYBOARD_STEP`).
  - A mouse move moves it by the pointer's travel since the first move.
  - ENTER, a click or a lost pointer stream commits through `setMoving` and
    the release clamp. ESC restores the start position.
- **Size.** Allowed when `resizable` and neither maximized nor minimized.
  - The first arrow picks the edge: Up the top, Down the bottom, Left the
    left, Right the right.
  - A perpendicular arrow adds the matching edge, making a corner.
  - Each arrow moves the chosen edges 8 px through
    `computeClassicyWindowEdgeResize`, and so does mouse travel.
  - The root carries `classicyWindowResizing` (the drag band). ENTER or a
    click commits; ESC restores the start rect.
- **Keys.** A capture-phase document listener on the window holds the keys
  while a mode lasts, so menu shortcuts and dialog keys never see them.

### 6. Dialog and message box captions

Under `dialog.caption: "titled"`, a `modal` `ClassicyWindow` changes as
follows. Every other window is unaffected.

- **Title.** A modal with an empty `title` is titled with its app's display
  name, as a message box's title names its context (WIG Ch.8 p.164). The
  desktop's alerts read "Finder". The `aria-label` follows the title.
- **Close box.** The caption always draws a Close box:
  - a `closable` modal closes, as today;
  - a non-closable one runs the new optional prop
    `onCaptionClose?: () => void` (read only under this flag);
  - with neither, the box is drawn unavailable. `ClassicyWindowTitleBar`'s new
    `closeDisabled?` emits `disabled` and `aria-disabled="true"` on
    `.classicyWindowCloseBox`, with no handler. Windows grays an unavailable
    Close.
- **Movable.** `fixedModal` is false. Every secondary window moves by its
  caption (WIG p.145), including an alert of `type="error"`. Its red band
  (`classicyWindowRed`) and beep are unchanged.
- **The bundled dialogs** pass `onCaptionClose`:

| Dialog | `onCaptionClose` |
| --- | --- |
| `ClassicyAlert` | its cancel-role button, else its only button, else none: Yes/No boxes draw a disabled Close, as `MessageBox` grays it |
| `ClassicyFileDialog` | `onCancelFunc` |
| `ClassicyInputDialog` | its Cancel |
| `ClassicyKeyboardEquivalentDialog` | its Cancel |
| `ClassicyAboutWindow` | a click on its own OK button (`.click()` on a ref), so `hideFunc`, typed `MouseEventHandler<HTMLButtonElement>`, still receives a real event |
| `HyperCardDialog` | its cancel button, else its only button |

  Each handler runs the same path its button runs.
- **Escape is unchanged.** Each dialog's own `useKeyboardEquivalents` handles
  Escape first and calls `preventDefault`, so the window's `onModalCancel`
  never doubles it. An OK-only alert with no cancel role keeps Escape's
  current behavior.

### 7. The Windows 98 package's look

Every value is a token, a ring (`b.$b`) or a knob. Every glyph is
`pixel-art()`. No `:has()`, no color literal, no `!important`, and the knob
families below are package-only: the core reads none of them.

| Partial | Change |
| --- | --- |
| `_MenuBar.scss` (rewritten) | The window menu bar: a 1 px ButtonFace row, 18 px titles (`menuBar.titleHeight` 18, a new package knob), and a 1 px ButtonFace line under them: 20 px in all (Wine `SM_CYMENU` + 1). Titles are plain ButtonText with `--menu-item-padding-x` (6) each side. A title under the pointer is hot-tracked raised (1 px ButtonHilight at the top and left, ButtonShadow at the bottom and right). An open or keyboard-tracked title is sunken (the reverse), its text 1 px down-right. There is no Hilight band and no hover band in an inactive window. A disabled title is embossed GrayText. The same title rules draw a screen bar a host forces with `placement="screen"`, as a flat ButtonFace strip. The taskbar-style rules (the Apple title as Start, the switcher as the pressed task button, the tray, the clock pane) are removed: the taskbar now owns that look. The unscoped extension rules (`.classicyDesktopMenuExtensions`, `.classicyDesktopMenuExtensionTrigger`) move to `_Taskbar.scss` under `.classicyTaskbarTray`; every rule left in the partial is scoped under `.classicyDesktopMenuBar` or `.classicyWindowMenuBar`, so none reaches the tray's `clock` and `extensions` parts. A `:has()` twin keeps its plain rule first, as the browser-floor test requires. |
| `_Window.scss` | `with-menu-bar` uses the 20 px band (`calc(var(--menu-bar-title-height) + #{b.$b2})`) instead of the derived 21. A disabled Close box (`.classicyWindowCloseBox.disabled`) draws the `$close` mark embossed (GrayText with a ButtonHilight pixel below and right, as the scroll arrows' `disabled` does), unpressable. A modal caption keeps the Close box (it hides the collapse box and icon as today). The header comment drops "Collapsed (WindowShade…)" for minimize. |
| `_Taskbar.scss` (new) | See below. |
| `windows98.json` | New knob families, in `defaults` and every preset: `taskbar` and `startMenu` (below), and `menuBar.titleHeight`. A color family `startMenu` (`banner`, `bannerGradient`, `bannerText`) with `colorFamilies` labels; every stylesheet read has a `--color-*` fallback. The `layout` block takes the flags of §1. |

`_Taskbar.scss` draws the following, with each surface's figure and source:

- **The bar.** `--taskbar-height` (28). ButtonFace, with the raised edge
  toward the desktop on its top: a ButtonLight row, then a ButtonHilight
  row (DrawEdge `EDGE_RAISED`, `BF_TOP`). The content sits 2 px under the
  edge and 2 px above the bottom (Figure 3.1).
- **The Start button.** 22 px tall (`taskbar.buttonHeight` 22), at least
  `taskbar.startButtonWidth` (54) wide, 2 px from the left. A raised button
  bevel (`b.raised`). The 16 px glyph `classicyTaskbarStartIcon` is an
  original pixel-art window (a navy caption row over a white body in a
  ButtonFace frame, from the title-bar and window tokens), then a 3 px gap,
  then the label bold. While `open`, the button is pressed (`b.pressed`)
  with its content 1 px down-right, and no dither: a pushed button, not a
  checked one. A keyboard focus draws the dotted focus rectangle inside the
  bevel.
- **Task buttons.**
  - Height 22, `flex: 0 1 var(--taskbar-button-max-width)` (160),
    `min-width: var(--taskbar-button-min-width)` (22), with
    `--taskbar-button-gap` (3) between buttons (ReactOS
    `UpdateButtonsSize`).
  - The 16 px icon is 3 px in, then a 3 px gap, then the label, cut with an
    ellipsis.
  - Raised at rest.
  - `active`: pressed, with the ButtonHilight/ButtonFace dither inside the
    2 px edge (`TOOLBAR_DrawPattern`), the label bold and the content 1 px
    down-right (Figure 3.1's "Document…" button).
  - `pressed`: pressed, with no dither.
  - `collapsed` changes nothing: a minimized window's button is an ordinary
    raised button.
- **The tray.** A sunken one-ring pane (ButtonShadow at the top and left,
  ButtonHilight at the bottom and right), 22 px tall, 2 px from the right.
  - The module icons and extensions are flat 16 px icons (`taskbar.trayIconSize`
    16) at a `taskbar.trayIconPitch` (20) step, starting
    `taskbar.trayPaddingX` (3) in. A held or open icon gets no bevel: the
    tray drew none.
  - The clock is right-aligned with 5 px each side (`taskbar.clockPaddingX`
    5, ReactOS `TRAY_CLOCK_WND_SPACING_X`), in the UI font at
    `--ui-font-size`.
  - Figure 10.2 is the reference.
- **Popups.** A module's `content` panel above its icon
  (`.classicyBevelButtonPopupPanel.classicyTaskbarTrayPopup`) keeps
  `_ControlStrip.scss`'s panel look, reused through a shared mixin. A
  module's menu (`.classicyBevelButtonPopup.classicyTaskbarTrayPopup`, and the
  button-2 contextual menu) is drawn by `_Menu.scss`.
- **Tray icons** draw no bevel at rest, pressed or `open`: Windows 98's tray
  drew none.

The Start menu is drawn as follows:

- **Frame.** The whole surface wears the window edge (`b.window-frame`) with
  1 px of ButtonFace inside. The inner menu list's own frame is cleared, so
  banner and items share one frame (Windows 98 draws one frame around both).
- **Banner.** `startMenu.bannerWidth` (21) wide, the full inner height. A
  vertical gradient: `startMenu.banner` at the bottom, `bannerGradient` at the
  top. The text is set bottom to top (`writing-mode: vertical-rl` turned
  180°), at `startMenu.bannerFontSize` (18), in `bannerText`: the title bold,
  the edition regular, flush with the bottom.
- **First-level items.** `startMenu.itemHeight` (32) tall, with 32 px icons
  (`startMenu.iconSize` 32) 2 px in, then a 4 px gap, then the label.
  Cascade arrows and the Hilight band come from `_Menu.scss`. Submenus are
  ordinary menus with 16 px icons.
- **Separators** are `_Menu.scss`'s.

The banner colors and the Start menu metrics (21, 18, 32) are Windows 98's
as remembered from its Start menu. The visual check in step 21 confirms them
against a Windows 98 SE capture. See Open Questions.

The `_ControlStrip.scss` partial stays: a host may still mount
`ClassicyControlStrip` itself (Storybook's Control Strip stories do), and the
tray reuses its panel mixin.

### 8. No effect on other packages

Every core change is gated on a flag, a prop or a mounted taskbar that
Platinum, System 7 and `mirrored` never have, except where the table says
otherwise. The Platinum and System 7 package test suites, the Storybook
`mirrored` stories and the parity shots (step 21) are the overall guard.

| Core file | What stays byte-identical for Platinum, System 7 and `mirrored` | Pinned by |
| --- | --- | --- |
| `ClassicyAppearancePackageSchema.ts`, `ClassicyAppearancePackage.ts` | Their layouts parse to the same objects. `CLASSICY_DEFAULT_APPEARANCE_LAYOUT` is unchanged. | `ClassicyAppearancePackageSchema.test.ts` (each flag absent → the parse equals the input; Platinum's and System 7's registered layouts deep-equal their JSON); `ClassicyAppearanceDefaults.test.ts` |
| `useClassicyAppearanceLayout.ts` | `classicyLayoutVars` and `classicyLayoutThemeVars` return the same keys | `useClassicyAppearanceLayout.test.ts` (key sets under Platinum's, System 7's and `mirrored`'s layouts) |
| `ClassicyDesktop.tsx` | No taskbar is mounted. `ClassicyControlStrip` is mounted with the same props. The root's attributes and style keys are the same. No shell-keys listener. `desktopOwnsBar` is unchanged under `collapse: "shade"`. | `ClassicyDesktop.layout.test.tsx` (Platinum: a `.classicyControlStrip`, no `.classicyTaskbar`, the root's attribute names listed exactly) |
| `ClassicyWindow.tsx`, `ClassicyWindowTitleBar.tsx` | The same DOM: no new class, part, state or attribute, the same aria-labels. The collapse box shades and the zoom is the standard state. The caption's double-click collapses per the preference. Frame edges move the window. A right-click shows `contextMenu`. The icon is inert. A non-closable modal has no Close box. Fixed modals stay fixed. The collapse box's click bubbles, and a collapse clears `zoomed`, as today. The registry entry adds no DOM. | `ClassicyWindow.collapse.test.tsx`, `.hig.test.tsx`, `.titlebar.test.tsx`, `.contextmenu.test.tsx`, `.modal.test.tsx`, `ClassicyWindowTitleBar.test.tsx`: an "under the default layout" case for each flag, plus a DOM snapshot of a document window's and a modal's root and title bar |
| `ClassicyWindowResize.ts`, `ClassicyWindowMaximize.ts` (new) | `computeClassicyWindowResize` gains only the optional `ceiling` (default `[Infinity, Infinity]`), which `ClassicyWindow` passes only while a band is published: its existing cases return the same numbers. The new functions are called only under their flags. | `ClassicyWindowResize.test.ts` (every existing case unchanged with no `ceiling`), `ClassicyWindow.resizer.test.ts` |
| `ClassicyDesktopWindowManagerContext.tsx`, `ClassicyAppHelpers.ts` | Collapse sets `collapsed` and keeps focus. Close and Destroy succession are as today. `focusWindow` never touches `collapsed`. `ClassicyWindowZoom` without `restore` writes only `zoomed`. | `ClassicyWindowEventHandler.test.ts`, `ClassicyAppHelpers.test.ts` (each with and without the flag) |
| `ClassicyAppManager.ts`, `ClassicyActionPredicates.ts` | `restoreRect?` is optional and never written without the flag; `hasWindowZoomed` accepts every payload it accepts today. The persisted bytes are unchanged. | `ClassicyStateMigrations.windowFlags.test.ts` (a Platinum session's persisted JSON has no `restoreRect`) |
| Window geometry (`resolveSize`, `resolvePosition`, `clampWindowPositionToViewport`, `computeStandardRect`), `ClassicyDesktopIconContext.tsx` (`createGrid`, `classicyDesktopIconGridPosition`) and `ClassicyMenuPlacement.internal.ts` (`classicyMenuBounds`) | The band is 0 with no taskbar, so the numbers, every icon's place and every menu's box are unchanged | `ClassicyWindow.geometry.test.ts`, `ClassicyDesktopIconEventHandler.test.ts`, `ClassicyMenuPlacement.test.ts` (band 0 equals today's numbers; a band of 28 moves only the bottom) |
| `ClassicyWindowMenuBar.tsx` | Without a taskbar it draws `appMenu` with `withClassicyAppIdentityAboutItem`, as today | `ClassicyWindowMenuBar.test.tsx` (the `mirrored` layout: Finder's bar lists File, Edit, View, Special, Help, and its Help holds the balloon toggle and About) |
| `ClassicyDesktopMenuBar.tsx`, `Finder.tsx` | **Changes by design** (the double-Help bug): with an app Help menu focused, one Help title. Every other title and item is the same. Finder's toggle behaves the same. The `system` and `app` chord registrations are byte-identical (`systemChordsKey` from the system's own items). | `ClassicyDesktopMenuBar.help.test.tsx` (one `help` part with a Finder window focused; its children; a host app's extra Help item merged after a divider), `ClassicyDesktopMenuBar.test.tsx` (the About strip), `ClassicyShortcutDispatcher.integration.test.tsx` (the registered chord lists with a Finder window focused, before and after), `Finder.menus.test.tsx` |
| `ClassicyMenuBarExtension.tsx` | It portals into the screen bar's region under screen placement and renders nothing under `mirrored` | `ClassicyMenuBarExtension.placement.test.tsx` |
| `ClassicyDesktopMenuWidgetTime.tsx` → `useClassicyClockTime.internal.ts` | The widget's DOM, its click toggle and the minute dispatch | a new `ClassicyDesktopMenuWidgetTime.test.tsx`, written before the move |
| `useClassicyBalloonHelp.tsx` | The third argument is optional, and without `force` the global toggle still hides the balloon | `useClassicyBalloonHelp.test.tsx` |
| `ClassicyBevelButtonPopup.tsx` | With no `aside`, the same DOM | `ClassicyBevelButton.popup.test.tsx` |
| `ClassicyFileDrag.ts` | `.classicyTaskbar` and `data-classicy-drop-activate` occur only under the shell. Folder and desktop targets are unchanged. | `ClassicyFileDrag.test.ts` |
| `ClassicyFileSystemApplications.ts` | Only an export is added | `ClassicyFileSystemApplications.test.ts` |
| Dialogs (`ClassicyAlert`, `ClassicyFileDialog`, `ClassicyInputDialog`, `ClassicyKeyboardEquivalentDialog`, `ClassicyAboutWindow`, `HyperCardDialog`) | `onCaptionClose` is read only under `dialog.caption: "titled"` | each dialog's test: no `.classicyWindowCloseBox` under the default layout |
| Base SCSS (`ClassicyWindow.scss`, `ClassicyTaskbar.scss`, `ClassicyStartMenu.scss`) | Every new rule is keyed on a class only the flags emit (`classicyWindowMinimized`, `classicyWindowMaximized`, `classicyWindowSizingBorder`, `classicyWindowFrameCorner`, `classicyTaskbar*`, `classicyStartMenu*`) | a grep of each new class across `packages/appearance/platinum/src`, `packages/appearance/system7/src`, `storybook/.storybook/*.scss` and `src/**/*.scss`, run before each commit; `ClassicyCascade.repo.test.ts`, `ClassicyBrowserFloor.repo.test.ts` |
| Vocabulary | Declarations only | `node bin/generate-vocabulary.ts --check`, `ClassicyVocabulary.test.ts` |

### Edge cases

- **A package switch with the shell's states.**
  - A minimized window shows as a WindowShade title bar, and a shaded
    document window as minimized. A shaded palette or dialog is drawn
    expanded under Windows 98, its flag kept for Platinum.
  - A maximized window is clamped back on screen under Platinum, keeps
    `zoomed` and un-zooms to its `restoreRect`.
  - The taskbar unmounts and the band becomes 0: icons stay where they are,
    and the next Clean Up uses the whole height.
- **The last window minimized.** Focus falls to the next app with a visible
  window, else to the desktop.
- **A host dispatching collapses.** `ClassicyWindowCollapse` on a utility or
  modal window under minimize is refused, so no window is ever lost.
- **Reload.** A maximized window re-applies the current work area on mount.
  A minimized window stays minimized, with its button.
- **Utility windows** (palettes) have no task button. They float as today,
  have the palette's system menu, and hide while every open document window
  of their app is minimized.
- **A maximized window minimized** comes back maximized from its task button,
  its menu's Restore or a Start ▸ Programs activation.
- **A minimize box clicked on an inactive window** minimizes it: the press's
  release activates it first (`stopChangeWindow`), the click minimizes it and
  passes focus on, and nothing after the click activates it again.
- **A window menu near the taskbar** flips or scrolls above the band rather
  than running under it; a menu opened from a window at the top of the screen
  is placed as today.
- **Hidden apps** (Hide commands, kept for hosts that dispatch them). Their
  windows keep their buttons. Activating one shows the app (`markAppFocused`).
- **CTRL+ESC with a modal open.** The menu does not open: the scrim covers the
  taskbar, and the key handler checks for an open modal (an open
  `.classicyWindowModalScrim` in the desktop).
- **An empty Programs submenu** shows "(Empty)" disabled.
- **The tray's extensions** keep the id `classicyDesktopMenuExtensions`.
  Refinement 1 keeps the desktop's own screen bar headless, so only a host's
  second, forced `placement="screen"` bar could add a region with that id.
- **A window wider than the work area** maximizes to the work area anyway: the
  content box is the work area, its `minimumSize` permitting.

## Testing

- **Unit tests** for every pure function: the schema and its refinements,
  `classicyMaximizedWindowRect`, `computeClassicyWindowEdgeResize`,
  `classicyWindowSystemMenuItems`, `classicyStartMenuItems`,
  `classicyHelpMenuChildren`, `isClassicyAppHelpMenu`, the clock formats, the
  task order, `classicyVisibleSuccession`, the band source, the window
  registry, `classicyMenuBounds` with a band and `computeClassicyWindowResize`
  with a `ceiling`.
- **Component tests** for `ClassicyTaskbar`, the Start menu, the tray, the
  clock and every window behavior. Each runs both under a Windows 98 layout
  (the registered package, or a test layout with the flag) and under the
  default layout (today's behavior).
- **Reducer tests** for minimize succession, restore on focus and
  `restoreRect` (written, validated, cleared, persisted).
- **Bubbling tests** for the minimize box: under the flag its click reaches
  neither `setActive` nor `ClassicyAppActivate`; under the default layout it
  reaches both, as today.
- **Package tests:** `ClassicyWindows98.test.ts` (the exact `layout`, the
  knobs in every theme, the color family) and `windows98.css.test.ts` (a pin
  for every new rule).
- **Platinum's and System 7's own suites**, unchanged, after every step.
- **Storybook stories** for the shell under Windows 98 (step 20), and the
  `mirrored` stories unchanged.
- **The visual check** (step 21):
  - Platinum's and System 7's parity shots against the branch point: AE 0,
    except the screen bar with a Finder window focused (one Help title).
  - Windows 98 shots of the taskbar, Start menu, tray, window menu bar,
    maximized and dialog captions, compared by eye with WIG Figures 3.1, 7.1,
    8.1, 8.17 and 10.2 and with a Windows 98 SE capture.
  - The example app driven under Windows 98.

## Scope

**In scope:**

- The layout flags of §1, read by the core and declared by `windows98.json`.
- `ClassicyTaskbar` with the Start button, the Start menu, task buttons, the
  tray (the Control Strip's modules, the menu bar extensions, the clock) and
  the taskbar's menu (Minimize All Windows, Undo Minimize All, Properties).
- The taskbar's band kept clear by window geometry, sizing, the icon grid and
  every menu's placement box.
- Minimize to the taskbar, maximize to the work area, restore, the window
  pop-up menu, frame-edge sizing, keyboard Move and Size, the caption's and
  the icon's double-clicks, ALT+SPACE, ALT+F4, CTRL+ESC; a minimized app's
  palettes hidden with it.
- Window menu bars ending with Help under the shell. The double-Help fix in
  every package.
- Titled dialog and message box captions with a Close box.
- The Windows 98 look for all of it, with new knobs and a color family.
- Docs: `docs/AGENT-REFERENCE.md` (§4 rows, §4.0.1 parts and states, §8 the
  layout table, the window menu bar paragraph, the Windows 98 section),
  the Windows 98 README, and CLAUDE.md's architecture notes (a "Windows
  shell" section; the Control Strip, Window Order & Focus Succession and
  menu bar notes).
- Storybook stories, the example app check and the visual check.

**Out of scope:**

- **ALT+TAB, ALT+ESC and the Windows key.** Windows reserves them; the Windows
  key is Command on macOS.
- **Message notification**, a flashing task button (WIG Ch.10 p.212).
  Classicy has no "message pending" signal.
- **Cascade and Tile; Quick Launch and the rebar grippers.** Not required.
  Figure 3.1 (Windows 95) draws no grippers.
- **Moving the taskbar to another edge, auto-hide, "always on top" off.**
  These are Taskbar Properties preferences, which Classicy has no surface
  for.
- **The Windows icon pop-up menus** (Rename, Create Shortcut, Properties),
  audit 7.11: menu content, package-agnostic.
- **Access keys and `Alt+` spelling** (audits 7.1, 7.15): a separate core
  hook.
- **Windows modality** (a dialog disabling only its owner). Classicy's modals
  stay desktop-modal.
- **Real Windows art** (the flag, Windows' tray icons): the package's art
  rule. Lane 3 may change the package's art. The Start glyph then changes in
  the package's stylesheet alone.

**Coordination:** story 0225-m4q (the WIG audit's core follow-ups) lists 6.3,
6.5, 6.6, 7.10/6.2/8.7 and 7.28. This plan takes them. The parallel lane that
closes the other audit items leaves them alone.

## Audit findings this plan resolves

The final step (21) returns these status changes. A later step writes them
into `docs/plans/windows-guidelines-audit.md`.

- **"Mac-structure and web-platform adaptations"**:
  - The bullets "One menu bar across the top of the screen, drawn
    taskbar-style" and "No taskbar, no Start menu, no MDI. Minimize is drawn
    on the core's collapse (WindowShade) box" become "No MDI".
  - "the Apple and Application menus" becomes: the Apple menu's commands live
    in the Start menu and the App Switcher's in the task buttons.
- **Ch.3 "The Taskbar" / "The Start Button"** → the taskbar itself
  (`_Taskbar.scss`). 3.1 and 3.2 are re-pointed to it: the active window's
  button pressed and checkered with a bold label; the raised edge on the
  side facing the desktop, now the top.
- **Ch.3 "Window Buttons" (pp.15–16)**: ➖ → 🔧 (task buttons, tooltips when
  abbreviated, drop activation).
- **Ch.3 "The Status Area" (p.16)** → the tray.
- **6.2, 7.10, 8.7**: ⚠️ → 🔧 (`window.systemMenu`). **6.3**: ⚠️ → 🔧 (the
  icon's menu and double-click).
- **6.5**: ⚠️ → 🔧 (`window.frameEdges`). **6.6**: ⚠️ → 🔧 (`window.zoom`).
- **Ch.6 "Minimizing Windows" / "Restoring Windows" (p.85)**: ➖ → 🔧
  (`window.collapse`).
- **Ch.6 "Moving Windows" / "Sizing Borders" (p.83)**: the keyboard Move and
  Size are ✅.
- **7.28**: ⚠️ → 🔧 (the tray's tooltips; the Control Strip is not drawn under
  the package).
- **Ch.7 "The Menu Bar and Drop-down Menus" (p.97)**: now a window's own bar.
  A new note records Windows 98's raised hot-tracking and sunken open title,
  the OS as shipped over the 1995 text's highlight (Wine `menu.c`, os-gui).
- **Ch.7 "The Help Menu" (p.99)**: ✅ (About *application* last in each
  window's Help).
- **8.1** is refined (a dialog's caption now has its title and Close box).
  **Ch.8 "Message Boxes" (p.164)** and **"Message Box Types" Figure 8.17**:
  ✅ (`dialog.caption`).
- **"Deferred and proposed core changes"** drops 6.5, 6.6 and 7.10/6.2/8.7
  from the layout flags and 6.3 and 7.28 from the core behaviors.

## Open Questions

- [ ] **The Start menu banner's colors** (navy at the bottom fading to black
  at the top, white text), **its width (21 px), its font size (18 px) and the
  first-level row height (32 px)**. These are Windows 98 SE's as remembered,
  not measured. Step 21 confirms each against a Windows 98 SE capture and
  corrects the knobs and the color family before the step closes. —
  implementer
- [ ] **The tray's icon pitch (20 px) and inner padding (3 px)**. These are
  read from Figure 10.2 at its printed scale. Step 21 confirms them against a
  capture, as above. — implementer

---

# Part 2 — Implementation Steps

These apply to every step:

- **Rules.** Each step follows `rules.md` (CLAUDE.md, the owner's three
  constraints, the code rules).
- **Gates.** Each step runs the gates: `pnpm lint`;
  `pnpm exec tsc --noEmit -p .`; `pnpm storybook:typecheck`;
  `pnpm exec vitest run src/Appearance/ClassicyBrowserFloor.repo.test.ts src/Appearance/vocabulary/ClassicyVocabulary.test.ts ClassicyAppearance.varCoverage ClassicyCascade.repo ClassicyPassthrough <the step's test dirs>`;
  the Windows 98, Platinum and System 7 package suites
  (`pnpm --filter @classicy/appearance-<id> exec vitest run`);
  `node bin/generate-vocabulary.ts --check`;
  `node bin/classicyLiteralColorSweep.ts`.
- **Isolation check.** Before committing, grep every new class, part, state
  and custom property across `packages/appearance/platinum/src`,
  `packages/appearance/system7/src`, `storybook/.storybook/*.scss` and
  `src/**/*.scss`, and state what was checked.
- **Commit.** One commit per step (two if a review fix follows).
- **Returns.** The step returns its release-note text and its audit status
  changes. It does not edit `docs/RELEASE-NOTES-3.8.md` or the audit.
- **The Windows 98 package** declares each flag in the step that makes the
  core read it. The taskbar, window placement and minimize come together in
  step 16, once nothing would be lost by them.
- **Size.** Each step is one session's work (about 20–40 minutes); the band,
  the registry, the tray and the clock are separate steps for that reason.

### Step 1: Layout flags

- **Files:** `src/Appearance/ClassicyAppearancePackageSchema.ts`,
  `src/Appearance/ClassicyAppearancePackage.ts`.
- **Change:**
  - Add the optional keys of §1 to the schema and the type, with their value
    sets: `taskbar { startLabel?, startBanner? { title, edition? } }`;
    `window.collapse`, `window.zoom`, `window.titleDoubleClick`,
    `window.frameEdges`, `window.systemMenu`, `window.captionTooltips`;
    `dialog { caption? }`.
  - Add the two refinements (taskbar ⇒ window placement; minimize ⇒
    taskbar), with messages.
  - Each key's TSDoc comment states its contract. No package declares a key
    and no code reads one yet, so AGENT-REFERENCE gains the rows in the steps
    that make them work.
- **Tests:** `src/Appearance/ClassicyAppearancePackageSchema.test.ts`:
  - each value accepted and each bad value refused;
  - the two refinements' messages;
  - the string bounds;
  - Platinum's, System 7's, Windows 98's and `mirrored`'s layouts parse to
    themselves.

  `src/Appearance/ClassicyAppearanceDefaults.test.ts`: the default layout is
  unchanged.
- **Returns:** no release note (internal).

### Step 2: The window registry

- **Files:**
  - new `src/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal.ts`;
  - `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`.
- **Change:**
  - First, before any edit to `ClassicyWindow.tsx`: the DOM snapshots that
    §8 names (a document window's and a modal's root and title bar under
    Platinum's layout), so every later step that touches the window is held
    to them.
  - The registry (§5, "Shared plumbing"): entries, the token, the one
    snapshot, `run` through a ref. `ClassicyWindow` registers its entry and
    its `activate`, `minimize`, `restore`, `maximize` and `close` commands
    over its existing functions (`close` is `close()` when `closable`; the
    caption close joins it in step 10). `systemMenu`, `move` and `size`
    return `false` until steps 8 and 9.
- **Tests:**
  - new `ClassicyWindowRegistry.test.ts` (register, update and unregister; a
    stale token removes nothing; the snapshot is stable between changes;
    commands reach the window; StrictMode remount);
  - the snapshots in `ClassicyWindow.titlebar.test.tsx` and
    `ClassicyWindow.modal.test.tsx`.
- **Returns:** no release note (internal).

### Step 3: The taskbar band and band-aware geometry

- **Files:**
  - new `src/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal.ts`;
  - `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` (the
    geometry functions, `computeStandardRect`, the `ws` memo's clamp, the
    resize ceiling);
  - `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.ts`
    (`ceiling`);
  - `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx`;
  - `src/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal.ts`.
- **Change:** §2 "The band": the band source; the optional `bottomBand`
  parameter on `resolveSize`, `resolvePosition` and
  `clampWindowPositionToViewport`; `computeStandardRect` reading the band;
  `ClassicyWindow` subscribing with `useClassicyTaskbarBand()`; the grow box's
  `ceiling`, passed only while the band is not 0; `createGrid` and
  `classicyDesktopIconGridPosition`'s bottom origins; `classicyMenuBounds`.
- **Tests:**
  - new `ClassicyTaskbarBand.test.ts`;
  - `ClassicyWindow.geometry.test.ts` (band 0 equals today; a band of 28 caps
    `y` and centers within the work area);
  - `ClassicyWindowResize.test.ts` (every existing case unchanged with no
    `ceiling`; a ceiling stops the bottom edge);
  - `ClassicyDesktopIconEventHandler.test.ts` (rows above the band for top
    and bottom origins; band 0 unchanged);
  - `ClassicyMenuPlacement.test.ts` (band 0 is today's box; a band of 28
    moves only the bottom).
- **Docs:** AGENT-REFERENCE §8's `computeClassicyWindowResize(corner, rect,
  pointer, chrome, fudge?, minimum?, floor?, ceiling?)` entry, and the
  `resolveSize`/`resolvePosition`/`clampWindowPositionToViewport` signatures
  where §8 names them (the exported functions gain an optional argument).
- **Returns:** no release note (internal).

### Step 4: Taskbar skeleton and task buttons

- **Files:**
  - new `src/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar.tsx`,
    `ClassicyTaskbar.scss`, `ClassicyTaskbarTasks.internal.tsx`;
  - `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`;
  - `src/Appearance/vocabulary/ClassicyVocabulary.json` and the generated
    files;
  - `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx`.
- **Change:**
  - `ClassicyTaskbar`, mounted in the Control Strip's place when
    `layout.taskbar` is set (§2 "Mounting"). It forwards `controlStrip`'s
    `disabledModules` and `false`.
  - The structure and base rules of §2.
  - The band published from the root's height.
  - The Start button: label and empty icon span, `open` toggled, no menu yet.
  - The task list: membership, order, labels, icons, states (the owner's
    button stays pressed under its dialog), clicks through the registry,
    right-click through `systemMenu` (inert until step 9), truncation
    tooltips.
  - The balloon hook's optional `{ force }` argument.
  - The vocabulary's `Taskbar` component and the parts `taskbar-start`,
    `taskbar-tasks` and `taskbar-tray`.
- **Tests:**
  - new `ClassicyTaskbar.test.tsx`, under a test package whose layout
    declares a taskbar: membership (no modal, no palette, no closed window),
    the order rules, the `active`/`collapsed`/`pressed` states (an open
    alert keeps its owner's button pressed), click →
    activate/minimize/restore through the registry, the tooltip only when
    truncated, the band;
  - `ClassicyDesktop.layout.test.tsx` (Platinum: Control Strip and no
    taskbar, the desktop's children in today's order; the taskbar layout: a
    taskbar in the strip's place and no Control Strip);
  - `useClassicyBalloonHelp.test.tsx` (`force`);
  - `ClassicyPassthrough.more.test.tsx` (a `ClassicyTaskbar` row).
- **Docs:** AGENT-REFERENCE §4 (`ClassicyTaskbar` row), §4.0.1 (Taskbar parts
  and states), §8 layout table (`taskbar`).
- **Returns:** a release note: "`ClassicyTaskbar`, the Windows taskbar, which
  `ClassicyDesktop` mounts when the Appearance Package's layout declares
  `taskbar`".

### Step 5: Minimize (`window.collapse: "minimize"`)

- **Files:**
  - `ClassicyWindow.tsx`, `ClassicyWindowTitleBar.tsx`, `ClassicyWindow.scss`;
  - `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx`;
  - `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`;
  - `ClassicyDesktop.tsx` (`desktopOwnsBar`);
  - the vocabulary (`Minimized`).
- **Change:** §5 "Minimize":
  - `minimized` and `shaded`, and the guards that read `shaded || minimized`;
  - the class and its base rule; the palettes hidden with their app;
  - the collapse box's click not bubbling, and `zoomed` kept, under the flag;
  - the title bar's `labels`;
  - the reducer guard and `classicyVisibleSuccession` (Collapse, Close and
    Destroy under the flag);
  - restore on `focusWindow`.
- **Tests:**
  - `ClassicyWindow.collapse.test.tsx` (the default layout is unchanged,
    the click still bubbling and a collapse still clearing `zoomed`; under
    the flag: hidden, mounted children kept, label "Minimize", a zoomed
    window keeps `zoomed`, a minimize box clicked on an inactive window
    leaves it minimized, a shaded palette record is drawn expanded, a
    palette hides while its app's document windows are all minimized);
  - `ClassicyWindow.collapseAll.test.tsx` (Option-click under the flag);
  - `ClassicyWindowEventHandler.test.ts` (succession within the app, across
    apps and to the desktop; a utility or modal collapse refused; Close
    skipping a minimized sibling);
  - `ClassicyAppHelpers.test.ts` (`focusWindow` restores only under the flag);
  - `ClassicyWindowTitleBar.test.tsx` (labels);
  - `ClassicyDesktop.menufallback.test.tsx` (the desktop's menus with only
    minimized Finder windows).
- **Docs:** §8 layout row. CLAUDE.md "Window Order & Focus Succession" (the
  minimize succession).
- **Returns:** a release note on minimize under a taskbar layout; audit:
  Ch.6 "Minimizing/Restoring Windows" → 🔧 once step 16 lands.

### Step 6: Maximize, restore and the caption's double-click

- **Files:**
  - new `src/SystemFolder/SystemResources/Window/ClassicyWindowMaximize.ts`;
  - `ClassicyWindow.tsx`, `ClassicyWindow.scss` (`classicyWindowMaximized`);
  - `ClassicyDesktopWindowManagerContext.tsx` (`restoreRect`);
  - `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (the
    type), `ClassicyActionPredicates.ts` (`hasWindowZoomed`);
  - the vocabulary (`Maximized`);
  - `packages/appearance/windows98/src/windows98.json`
    (`window.zoom: "maximize"`, `window.titleDoubleClick: "zoom"`);
  - `packages/appearance/windows98/src/ClassicyWindows98.test.ts`.
- **Change:** §5 "Maximize and restore" and "The caption's double-click":
  - the pure rect and `classicyWindowChromeEdges`;
  - `applyZoom` with `restore` under the flag, the validated `restoreRect`,
    and the restore fallbacks;
  - `classicyWindowMaximized` and its `max-height: none`;
  - the clamp skipped while maximized;
  - move, edges and grow box inert;
  - re-apply on a desktop resize, a band change or a mount;
  - `zoomMode` and `idealSize` ignored under the flag;
  - the labels Maximize and Restore;
  - `onTitleDoubleClick` under `"zoom"`.
- **Tests:**
  - new `ClassicyWindowMaximize.test.ts` (the rect with and without a band,
    the chrome offsets);
  - `ClassicyWindow.hig.test.tsx` (the default layout keeps the standard
    state and no `classicyWindowMaximized`; under the flag: the rect,
    `expanded` and `classicyWindowMaximized`, restore to `userStateRef`,
    then to `restoreRect` after a remount, a malformed `restoreRect`
    ignored);
  - `ClassicyWindowEventHandler.test.ts` (`restoreRect` written, refused when
    malformed, and cleared);
  - `ClassicyActionPredicates.test.ts` (`hasWindowZoomed` with and without
    `restore`);
  - `ClassicyStateMigrations.windowFlags.test.ts` (Platinum's persisted JSON
    has none; a Windows 98 session's survives `sanitizeStateForPersistence`);
  - `ClassicyWindow.titlebar.test.tsx` (double-click by flag; nothing on a
    window that cannot zoom);
  - `ClassicyWindows98.test.ts` (the exact layout).
- **Docs:** §8 rows. The Windows 98 README "Its layout" bullet. The
  AGENT-REFERENCE Windows 98 entry.
- **Returns:** a release note; audit 6.6 → 🔧.

### Step 7: Frame-edge sizing

- **Files:** `ClassicyWindowResize.ts` (`computeClassicyWindowEdgeResize`),
  `ClassicyWindow.tsx`, `ClassicyWindow.scss`, the vocabulary
  (`SizingBorder`, `FrameCorner`), `windows98.json`
  (`window.frameEdges: "resize"`), `ClassicyWindows98.test.ts`.
- **Change:** §5 "Frame-edge sizing": the edge math with its floor and
  ceiling, the root class, the edge handlers, the eight corner arms, the base
  cursors in the registry's idiom, the inert cases (non-resizable,
  maximized, shaded).
- **Tests:**
  - `ClassicyWindowResize.test.ts` (each edge, each corner, the minimum, the
    floor and the ceiling);
  - a new `ClassicyWindow.frameEdges.test.tsx` (the default layout moves the
    window; under the flag each handle sizes it, a non-resizable window's
    edges are inert, the arms are present only under the flag);
  - `ClassicyCascade.repo.test.ts` (the cursor rules follow
    `.classicyWindowFrameEdge`'s `cursor: default`);
  - `ClassicyWindows98.test.ts`.
- **Docs:** §8 row; §4.0.1 Window parts.
- **Returns:** a release note; audit 6.5 → 🔧.

### Step 8: Keyboard Move and Size

- **Files:** new `src/SystemFolder/SystemResources/Window/ClassicyWindowKeyboardMove.internal.ts`,
  `ClassicyWindow.tsx` (the `move` and `size` commands).
- **Change:** §5 "Keyboard Move and Size": 8 px steps, the edge selection,
  pointer travel, ENTER/click commit, ESC restore, the capture-phase key
  hold, the drag band and resizing classes, the release clamp.
- **Tests:** new `ClassicyWindow.keyboardMoveSize.test.tsx`:
  - the commands through `runClassicyWindowCommand`;
  - arrows, ENTER and ESC;
  - Size's first arrow picks the edge, and a perpendicular arrow adds one;
  - the minimum holds;
  - refused while maximized, minimized or fixed.
- **Docs:** AGENT-REFERENCE `ClassicyWindow` (the commands).
- **Returns:** none alone (it reaches users through step 9's menu).

### Step 9: The window pop-up (system) menu, ALT+SPACE and ALT+F4

- **Files:**
  - new `src/SystemFolder/SystemResources/Window/ClassicyWindowSystemMenu.ts`;
  - new `src/SystemFolder/SystemResources/Window/useClassicyWindowShellKeys.internal.ts`;
  - `ClassicyWindow.tsx`, `ClassicyWindowTitleBar.tsx` (`onIconMouseDown`,
    `onIconDoubleClick`);
  - `ClassicyDesktop.tsx` (calls `useClassicyWindowShellKeys(enabled)`);
  - `windows98.json` (`window.systemMenu: true`),
    `ClassicyWindows98.test.ts`.
- **Change:** §5 "The window pop-up (system) menu":
  - the builder and its states;
  - the caption's right-click, the icon's first press and its double-click
    (the second press not reopening the menu);
  - ALT+SPACE (at the icon, else the title bar) and ALT+F4 (the `close`
    command);
  - the `systemMenu` command (the task button's right-click now opens it);
  - Move and Size wired to step 8.
- **Tests:**
  - new `ClassicyWindowSystemMenu.test.ts` (each window kind's items and
    states, Close default);
  - `ClassicyWindow.contextmenu.test.tsx` (the default layout unchanged;
    under the flag the caption shows the system menu and the body keeps
    `contextMenu`);
  - new `ClassicyWindow.systemMenu.test.tsx` (icon press with no move armed,
    double-click closing with no menu left open, ALT+SPACE, ALT+F4, the veto
    honored, a `defaultPrevented` key ignored, no listener without the flag);
  - `ClassicyTaskbar.test.tsx` (right-click opens it).
- **Docs:** §8 row; §4.0.1. CLAUDE.md "Contextual Menus" (the caption's menu
  under the flag).
- **Returns:** a release note; audit 6.2, 6.3, 7.10, 8.7 → 🔧.

### Step 10: Titled dialog and message box captions

- **Files:** `ClassicyWindow.tsx` (`onCaptionClose`, the title fallback,
  movable, the `close` command's caption close),
  `ClassicyWindowTitleBar.tsx` (`closeDisabled`), `ClassicyAlert.tsx`,
  `ClassicyFileDialog.tsx`, `ClassicyInputDialog.tsx`,
  `ClassicyKeyboardEquivalentDialog.tsx`, `ClassicyAboutWindow.tsx`,
  `HyperCardDialog.tsx`, `windows98.json` (`dialog.caption: "titled"`),
  `ClassicyWindows98.test.ts`.
- **Change:** §6, and ALT+F4 and the system menu's Close following the
  caption's Close box; the caption buttons' tooltips
  (`window.captionTooltips`, `buttonTooltips`), declared by `windows98.json`
  in the same step.
- **Tests:**
  - `ClassicyWindow.modal.test.tsx` (the default layout: no Close box and
    fixed stays fixed; titled: the title fallback, the Close box runs
    `onCaptionClose`, disabled without one, an error alert moves, ALT+F4 on a
    Yes/No alert does nothing);
  - `ClassicyAlert.test.tsx` (cancel → sole → disabled);
  - each dialog's test (the Close box runs its Cancel; the About box's OK
    handler gets an event);
  - `ClassicyWindowTitleBar.test.tsx` (`closeDisabled`; `buttonTooltips`
    shows each label after 500 ms with balloon help off, and nothing without
    the prop).
- **Docs:** §8 rows; §4 `ClassicyWindow` (`onCaptionClose`);
  `ClassicyWindowTitleBar` props.
- **Returns:** a release note; audit 8.1 refined, Ch.8 message boxes ✅.

### Step 11: Help in one menu everywhere; Help in each window bar under the shell

- **Files:**
  - new `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal.ts`;
  - `ClassicyDesktopMenuBar.tsx`;
  - `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.tsx`;
  - `src/SystemFolder/Finder/Finder.tsx` (the toggle as an `event` item).
- **Change:** §4: the moved and new helpers; the screen bar's merge (every
  package), with `systemChordsKey` kept to the system's own items; the window
  bar's Help under `layout.taskbar`.
- **Tests:**
  - new `ClassicyHelpMenu.test.ts`;
  - `ClassicyDesktopMenuBar.help.test.tsx` (one Help with a Finder window
    focused, under Platinum's and System 7's layouts; a host's Help item
    merged; the dedupe);
  - `ClassicyDesktopMenuBar.test.tsx` (the About strip tests still pass);
  - `ClassicyShortcutDispatcher.integration.test.tsx` (the `system` and `app`
    chord lists unchanged with a Finder window and a host Help item with a
    chord);
  - `ClassicyWindowMenuBar.test.tsx` (`mirrored` unchanged; under a taskbar
    layout: Help last, system items, registered items, the app's items,
    "About Finder" last);
  - `Finder.menus.test.tsx`.
- **Docs:**
  - AGENT-REFERENCE `ClassicyDesktopMenuBar` row (the merge) and the window
    menu bar paragraph (Help under a taskbar);
  - `useClassicyHelpMenu` docs.
- **Returns:** a release note naming the fix in every package ("an
  application's Help menu is merged into the Help menu; a Finder window no
  longer adds a second Help title") and stating that Platinum and System 7
  change, checked against HIGOS8 Ch.4 "Help menus" (p.92, Figure 4-2) and
  HIG7 "The Help Menu" (p.125).

### Step 12: The Start menu and CTRL+ESC

- **Files:**
  - new `src/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal.tsx`,
    `ClassicyStartMenuItems.internal.ts`, `ClassicyStartMenu.scss`,
    `useClassicyTaskbarKeys.internal.ts`;
  - `ClassicyTaskbar.tsx`;
  - `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup.tsx`
    (`aside`);
  - `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts`
    (export `isClassicyApplicationsEntry`);
  - the vocabulary (`StartMenu`, `start-menu-banner`).
- **Change:** §3, with Settings' balloon toggle, and the Start button's menu
  from step 4.
- **Tests:**
  - new `ClassicyStartMenuItems.test.ts` (the structure, Programs from
    Applications and mounted apps, Control Panel from the Apple entries not
    in Applications, sorted by display name, "(Empty)", the balloon toggle's
    title following `disableBalloonHelp`);
  - new `ClassicyStartMenu.test.tsx` (opens upward on the band's top edge
    and inside bounds, banner from the layout and none without it, a choice
    closes it, Escape returns focus, CTRL+ESC toggles, blocked under a
    modal);
  - `ClassicyBevelButton.popup.test.tsx` (`aside`);
  - `ClassicyFileSystemApplications.test.ts` (the export).
- **Docs:** §4.0.1; the §8 `taskbar.startLabel` and `startBanner` rows.
- **Returns:** a release note.

### Step 13: The tray and the taskbar's own menu

- **Files:**
  - new `src/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTray.internal.tsx`;
  - `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension.tsx`;
  - `ClassicyTaskbar.tsx` (the taskbar's menu).
- **Change:** §2 "The tray" and "The taskbar's own menu":
  - the modules as tray icons, each its own component, with their
    arrangement, `ClassicyBevelButtonPopup` surfaces, clicks, the deferred
    first click beside an `isDefault` item, the double-click default and
    tooltips;
  - the extensions region and its re-query;
  - Minimize All Windows, Undo Minimize All and Properties.
- **Tests:**
  - new `ClassicyTaskbarTray.test.tsx` (order, hidden, disabled, `visible`
    and `controlStrip={false}`, a hook-form module, click/right-click/
    double-click, tooltip label, the popup above the band);
  - `ClassicyMenuBarExtension.placement.test.tsx` (portals into the tray;
    `mirrored` unchanged);
  - `ClassicyTaskbar.test.tsx` (Minimize All with one commit's focus, Undo
    Minimize All, the list forgotten when a window is restored by hand).
- **Docs:** CLAUDE.md "Control Strip" (the tray under a taskbar). The
  AGENT-REFERENCE `ClassicyControlStrip` and `ClassicyMenuBarExtension` rows.
- **Returns:** a release note; audit 7.28 → 🔧.

### Step 14: The clock

- **Files:**
  - new `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/useClassicyClockTime.internal.ts`;
  - `ClassicyDesktopMenuWidgetTime.tsx`;
  - new `src/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarClock.internal.tsx`;
  - `ClassicyTaskbarTray.internal.tsx` (mounts it).
- **Change:** §2 "The clock":
  - first, `ClassicyDesktopMenuWidgetTime.test.tsx`, green against today's
    widget;
  - then the shared clock hook, with the widget's DOM unchanged;
  - the taskbar clock's format, tooltip, `show`, double-click and right-click
    (Adjust Date/Time, then the taskbar's menu of step 13).
- **Tests:**
  - new `ClassicyDesktopMenuWidgetTime.test.tsx` (written and green before
    the move: its DOM, its click toggle, the minute dispatch);
  - new `ClassicyTaskbarClock.test.tsx` (12 h and 24 h, the long date,
    `show`, the double-click opens Date & Time, the menu).
- **Docs:** the AGENT-REFERENCE `ClassicyTaskbar` row (the clock).
- **Returns:** none beyond step 16's.

### Step 15: Drop activation on task buttons

- **Files:** `src/SystemFolder/SystemResources/File/ClassicyFileDrag.ts`,
  `ClassicyTaskbarTasks.internal.tsx`.
- **Change:** `.classicyTaskbar` in `BLOCKING_SELECTOR`. A
  `data-classicy-drop-activate` element under a resting drag for 500 ms,
  found before the blocking check, gets `classicy:dropactivate`, and the
  button restores or activates its window.
- **Tests:** `ClassicyFileDrag.test.ts` (the timer, reset on leaving, no drop
  target, folder and desktop targets unchanged), `ClassicyTaskbar.test.tsx`.
- **Returns:** audit Ch.3 "Window Buttons" (drops) → 🔧.

### Step 16: Windows 98 becomes the shell

- **Files:** `packages/appearance/windows98/src/windows98.json`
  (`menuBar.placement: "window"`, the `taskbar` block,
  `window.collapse: "minimize"`), `ClassicyWindows98.test.ts`,
  `packages/appearance/windows98/README.md`, `docs/AGENT-REFERENCE.md`
  (Windows 98 section).
- **Change:** the layout switch, with the exact `layout` expectation updated.
- **Tests:**
  - `ClassicyWindows98.test.ts`;
  - a `ClassicyDesktop.layout.test.tsx` case under the registered Windows 98
    package: a taskbar, no screen bar, the tray holding the three built-in
    modules, a window bar ending with Help, minimize to a button.
- **Returns:** a release note for the shell as a whole (the text the release
  notes take); audit: the Ch.3 rows and the "Mac-structure adaptations"
  rewrite.

### Step 17: Windows 98 look — window menu bars and captions

- **Files:**
  - `packages/appearance/windows98/src/styles/components/_MenuBar.scss`
    (rewritten), `_Window.scss`;
  - `windows98.json` (`menuBar.titleHeight` in `defaults` and every preset);
  - `src/styles/windows98.css.test.ts`, `src/ClassicyWindows98.test.ts`.
- **Change:** §7's first two rows: the 20 px bar, raised hot-tracking and the
  sunken open title, the screen bar's fallback, the embossed disabled Close,
  the comment updates. The taskbar-style screen-bar rules (3.1, 3.2) go;
  their look returns on the taskbar in step 18.
- **Tests:**
  - `windows98.css.test.ts` (a pin for every new rule: the band, hover
    raised, open sunken with offset, disabled Close);
  - `ClassicyWindows98.test.ts` (the knob in every theme).
- **Returns:** audit Ch.7 "The Menu Bar and Drop-down Menus" note.

### Step 18: Windows 98 look — taskbar, task buttons, tray, clock

- **Files:** new `packages/appearance/windows98/src/styles/components/_Taskbar.scss`,
  `windows98.scss` (include it), `windows98.json` (the `taskbar` knob family
  in `defaults` and every preset), `windows98.css.test.ts`,
  `ClassicyWindows98.test.ts`, `bin/multiplier-allowlist.json` (only if a
  multiplier is unavoidable, with its reason).
- **Change:** §7's taskbar bullets, the tray icons with no bevel, and the
  Start glyph's pixel art.
- **Tests:** CSS pins (the bar edge, the Start raised and pressed, task
  active/pressed/dither, the tray's sunken ring, the clock padding), the
  knobs in every theme.
- **Returns:** audit 3.1 and 3.2 re-pointed.

### Step 19: Windows 98 look — Start menu and tray popups

- **Files:** `_Taskbar.scss` (or a new `_StartMenu.scss` included after it),
  `_ControlStrip.scss` (the panel mixin shared), `windows98.json`
  (`startMenu` knobs and color family in `defaults`, every preset and
  `colorFamilies`), `windows98.css.test.ts`, `ClassicyWindows98.test.ts`.
- **Change:** §7's Start menu rules (frame, banner, large first-level icons)
  and the tray popups (`classicyTaskbarTrayPopup`).
- **Tests:**
  - CSS pins: one frame, the banner gradient from the family with `--color-*`
    fallbacks, 32 px first-level icons, 16 px in submenus, the tray panel;
  - the color family in every theme;
  - `ClassicyAppearance.varCoverage`.
- **Returns:** none beyond step 16's.

### Step 20: Storybook stories for the Windows 98 shell

- **Files:** new `packages/appearance/windows98/src/Windows98Shell.stories.tsx`,
  `storybook/.storybook/windows98.ts` (helpers),
  `storybook/.storybook/Windows98StoryHelpers.test.tsx`.
- **Change:** stories registered through `windows98.ts`
  (`windows98Parameters`, `inScheme`), each leaving
  `parameters.classicy.controlStrip` unset so the tray has its modules:
  - the taskbar with three windows (one active, one minimized);
  - the Start menu open (a play function), with Programs open;
  - a tray menu and the Sound panel open;
  - a window's menu bar with Help open;
  - a maximized window;
  - the system menu open;
  - a message box (Figure 8.17's three types);
  - the "Windows 95" and one classic scheme.

  The `mirrored` and Platinum stories are untouched.
- **Tests:** `pnpm storybook:typecheck`, `Windows98StoryHelpers.test.tsx`,
  `pnpm build:storybook`.
- **Returns:** none.

### Step 21: Example app, visual check and docs wrap-up

- **Files:** `CLAUDE.md` (a "Windows shell" architecture section, with the
  Control Strip, menu bar and window notes updated), `docs/AGENT-REFERENCE.md`
  (a cross-check of every row the steps added), and the knob and color
  family values in `windows98.json` if the capture corrects them.
- **Change:**
  - Run `pnpm build:source && pnpm --filter classicy-example build` and
    `pnpm preview`. Drive the example under Windows 98: open, minimize,
    restore and maximize windows (a maximized one minimized and restored);
    the Start menu; the tray's Sound, Screen Saver and Appearance modules;
    the demo extension in the tray; a window menu near the taskbar; a
    dialog's Close box; ALT+SPACE (macOS host); CTRL+ESC.
  - Shoot Windows 98 views and compare them by eye with WIG Figures 3.1,
    7.1, 8.1, 8.17, 10.2 and a Windows 98 SE capture. Settle the open
    questions' values.
  - Run `pnpm parity:shoot` for Platinum and System 7 against the branch
    point and `pnpm parity:compare`: AE 0 except the screen bar shots with a
    Finder window focused.
- **Tests:** the full CI set (`pnpm lint`, `tsc`, `storybook:typecheck`,
  `pnpm test`, the example build).
- **Returns:** the consolidated release-note text and the audit's status
  changes (Part 1, "Audit findings this plan resolves") for the docs step
  that writes `docs/RELEASE-NOTES-3.8.md` and
  `docs/plans/windows-guidelines-audit.md`.
