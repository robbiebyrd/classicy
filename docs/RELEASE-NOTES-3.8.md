# Release notes: 3.8

A third Appearance Package, Windows 98, ships beside Platinum and System 7.
These notes list every change a host can see, measured from 3.7.x, with the
step each change needs. The API is described in
[`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) (§8 "Theming" and its "Windows 98"
section); the audit the package was built against is
[`plans/windows-guidelines-audit.md`](plans/windows-guidelines-audit.md).

## Summary

`@classicy/appearance-windows98` is Windows 95 and 98 on Classicy: not only
the look (gradient title bars with Minimize, Maximize and Close at the right,
two-pixel bevels from the system colors, checkered scroll-bar tracks, raised
menus and rectangular controls, in the thirty-four color schemes of Windows 98
Second Edition's Display control panel) but the shell and its behavior: a
taskbar with the Start menu, task buttons and the status area, a menu bar in
each window, Minimize to the taskbar and Maximize to the work area, access keys
and Windows' keyboard, Explorer's selection, commands, property sheets and
drags, Notepad's documents, WinHelp, What's This? and ToolTips. It ships
Windows 98 SE's own icons, art, cursors, sounds, wallpapers, patterns and
screen savers, and a recreation of MS Sans Serif.

Every behavior is an optional layout key that only the Windows 98 package
declares, an optional prop or a class only it reads, so a host that does not
load the package sees nothing new, with the few exceptions listed under "The
changes every package sees": chief among them, Help is now one menu in every
package, as the Mac OS 8 and System 7 guidelines have it.

## New: the Windows 98 Appearance Package

Install it with the core, at the same version, alone or beside the others:

```sh
pnpm add @classicy/classicy @classicy/appearance-windows98
# or, with every look:
pnpm add @classicy/classicy @classicy/appearance-platinum @classicy/appearance-system7 @classicy/appearance-windows98
```

Import it once, at your app's entry:

```tsx
import '@classicy/appearance-windows98'
```

It registers thirty-four themes, every one read from the scheme Windows 98
Second Edition itself writes (its `SHELL2.INF`) and named as Windows 98 names
it: **Windows Standard** (id `windows98`, the package's defaults: navy title
bars shading to light blue over the `#C0C0C0` face and the teal desktop), in
(large) and (extra large) sizes too; **Windows 95** (id `windows95`: the same
palette with flat title bars and Windows 95's raised toolbar buttons); the
classic schemes Brick, Desert, Eggplant, Lilac and Lilac (large), Maple, Marine
(high color), Plum (high color), Pumpkin (large), Rainy Day, Red, White, and
Blue (VGA), Rose and Rose (large), Slate, Spruce, Storm (VGA), Teal (VGA) and
Wheat (ids `windows98Brick` and so on); and High Contrast #1, #2, Black and
White, each in three sizes. Every id 3.7's preview shipped is kept. The
title-bar colors, the selected text's, the ToolTip's, the desktop labels', the
Start menu's and Help's text jumps are the package's own color families,
editable in the Appearance Manager's Colors tab; the title-bar buttons' size,
the taskbar's metrics, the progress bar's blocks and the toolbar's raised
buttons are its knobs, in the Options tab.

- **The shell.** The taskbar, a menu bar in each window, Minimize, Maximize,
  frame sizing, the window pop-up menu and titled dialogs, all declared in the
  package's `layout` (below, "The Windows 98 shell").
- **Fonts.** `"Pixelated MS Sans Serif"` in regular and bold, the family every
  theme names first: 98.css's woff2 files of lou's FontStruct recreation of MS
  Sans Serif (CC BY-SA 3.0; its readme and license ship in
  `src/assets/fonts/`). Each scheme's caption, small caption, menu, message
  box and icon fonts follow it (Times New Roman in Eggplant, Rose, and Red,
  White, and Blue; Arial in Brick's caption and Lilac's), with Fixedsys, Lucida
  Console or Courier New for monospaced text.
- **Art.** Windows 98 SE's own icons, system art, cursors, wallpapers, desktop
  patterns and seven screen savers, from its CD (below, "Windows 98 SE's art").
  Classicy uses Microsoft's Windows 95 and 98 assets, like Apple's Mac OS
  assets, under the fair use doctrine; the package README lists every file's
  source.
- **Sound.** One pack, `windows98`, of Windows 98 SE's own sounds, played where
  its default sound scheme played them.
- **Strict CSP.** Link `@classicy/appearance-windows98/classicy-windows98.css`
  after the core's stylesheet, then
  `@classicy/appearance-windows98/classicy-windows98.fonts.css`.
- **Vite.** Add `@classicy/appearance-windows98` to `optimizeDeps.exclude`
  when you load it, as for the other packages.

The package's README, `packages/appearance/windows98/README.md`, has its
exports (`WINDOWS98_APPEARANCE_PACKAGE_ID`, `windows98Json`,
`windows98SoundPack`, `windows98AppearanceHooks`, `WINDOWS98_APPS`,
`WINDOWS98_DESKTOP_ICONS`, `WINDOWS98_CURSORS`, `WINDOWS98_SYSTEM_ART`,
`WINDOWS98_WALLPAPERS`, `WINDOWS98_DESKTOP_PATTERNS`, the screen savers' parts
with `WINDOWS98_SCREEN_SAVER_IDS` and `WINDOWS98_DEFAULT_SCREEN_SAVER`, and
`readWindows98ThemeFile`) and its SCSS (`@classicy/appearance-windows98/scss/*`).
It depends on zod, as the Platinum package does.

## The Windows 98 shell

Under the Windows 98 package Classicy works as the Windows 95/98 shell does
(plan 0020-w98). Every piece is behind an optional layout key that only
Windows 98 declares (`menuBar.placement: "window"`, `taskbar`,
`window.collapse: "minimize"`, `window.zoom: "maximize"`,
`window.titleDoubleClick: "zoom"`, `window.frameEdges: "resize"`,
`window.systemMenu`, `window.captionTooltips`, `window.utilityTitle`,
`dialog.caption: "titled"`), so Platinum and System 7 are unchanged.

- **Taskbar**, in the Control Strip's place (WIG Ch.3). A 28-pixel ButtonFace
  bar with Windows' raised edge facing the desktop. The Start button is a
  raised push button with a bold label (tooltip "Click here to begin."),
  pushed in while the Start menu is open. Each open primary window has a
  button, in the order the windows opened, at most 160 pixels wide and sharing
  the bar evenly when it fills, each with its icon and its title cut with an
  ellipsis: a click activates the window, minimizes it if it is already
  active, or restores it if it is minimized; a right-click opens the window's
  pop-up menu; a cut-short title shows whole in a tooltip; a file drag resting
  500 ms on a button brings that window up for the drop. The active window's
  button is pushed in over the checkered face with its title in bold. When too
  many windows are open, the buttons shrink to their icons and show one row at
  a time behind small up and down arrows, the active window's row coming into
  view on its own.
- **The status area**: a sunken pane holding the Control Strip's modules as
  16-pixel notification icons (Sound, Screen Saver, Appearance and any a host
  registers), the menu bar extensions as status indicators, and the clock
  (`4:37 PM`, or `16:37`; the long date in its tooltip, Date/Time on a
  double-click, Adjust Date/Time on a right-click). A click opens a module's
  control (Sound's volume slider) or its menu above the taskbar, a right-click
  its menu at the pointer, a double-click its default item, and each icon
  names its module in a tooltip after 500 ms, whatever Balloon Help says.
- **The Start menu** (Figure 3.1), one raised frame holding Windows 98's
  navy-to-blue banner and its items: About This Computer; Programs (the apps in
  Applications, by display name), Documents (the documents opened this
  session) and Settings (Control Panel, Taskbar & Start Menu, the balloon
  toggle); Help, which opens Help Topics; Run...; the Recycle Bin's Empty and
  Reset PRAM; Log Off <name>... (with `ClassicyDesktop`'s new `userName`); Shut
  Down... . First-level items use 32-pixel icons. CTRL+ESC opens and closes it
  where the browser passes the key, nothing opens it while a modal dialog is
  open, and it follows Windows' menu loop: Down and Up select the first and
  last item, Escape returns focus to the Start button.
- **The taskbar's menu** (right-click the taskbar): Toolbars ▸ Quick Launch;
  Cascade Windows, Tile Windows Horizontally and Tile Windows Vertically (front
  window last and active, maximized windows restored first, minimum sizes
  kept); Minimize All Windows; one Undo for whichever of those was last (Undo
  Cascade, Undo Tile, Undo Minimize All); Properties. **Quick Launch**, beside
  the Start button and on by default, holds the Finder (Windows Explorer), Show
  Desktop (a second click brings the windows back) and any app marked with
  `ClassicyApp`'s new `showInQuickLaunch`.
- **Taskbar Properties and docking.** Drag an empty part of the taskbar to any
  edge of the screen; at a side its buttons stack, and windows, maximized
  windows, desktop icons and menus keep clear of it wherever it sits, the
  Start menu and the status area's pop-ups opening toward the desktop. Under
  the shell the Control Strip control panel becomes Taskbar Properties: Always
  on top, Auto hide (the taskbar slides off its edge to a thin strip and
  returns when the pointer reaches it), Show small icons in Start menu and
  Show Clock, applied on OK or Apply, and Clear, which empties Start ▸
  Documents and the Run history. All of it persists with the desktop.
- **Shut Down, Run and Log Off**, after Windows 98 SE's own dialogs. Shut Down
  Windows dims the screen and offers Stand by (a dark screen until a key or
  click), Shut down ("It's now safe to turn off your computer.") and Restart
  (a fresh session with the startup screen), remembering the last choice;
  settings and files are kept. Run opens a program by name, a file or folder
  by path, or a web address, with a 26-entry history, Browse... and Windows'
  "Cannot find the file" message. Log Off asks first, then calls the new
  `onLogOff` desktop prop, or starts a fresh session. Find and Favorites are
  left out: Classicy has no search or favorites.
- **Attention.** An application in the background that puts up a message no
  longer jumps in front: its message waits, and its task button flashes in the
  highlight color three times, then stays highlighted until you switch to it,
  as Windows 98's FlashWindow did (WIG Ch.10 "Message Notification"). Apps can
  raise the signal themselves with the new `ClassicyAppRequestAttention { app:
  { id }, window? }` action, which does nothing under Platinum and System 7.
- **Windows.** Minimize sends a window to its task button (the same stored
  `collapsed` flag, so a window minimized under Windows 98 is shaded under
  Platinum or System 7); an app's palettes leave with its last window, and
  focus passes to the next window on screen. Maximize takes the work area with
  the frame pushed off the screen, turns into Restore, and allows no move,
  size or grip; Restore puts the window back as it was, even after a reload
  (the record's persisted `restoreRect`). Double-clicking a title bar
  maximizes or restores. A resizable window sizes from any edge and from
  within a caption's height of a corner, with the resize pointers; a fixed
  frame does nothing. A palette's small caption carries its title.
- **The window pop-up (system) menu**, from a right-click anywhere in a title
  bar, a press on its icon, ALT+SPACE or a task button's right-click: Restore,
  Move, Size, Minimize, Maximize and Close on a document window, Move and
  Close on a dialog, Move, Size and Close on a palette, dimmed as Windows dims
  them, Close bold with ALT+F4. Move and Size work from the keyboard: the
  arrows move the window, or the edge or corner being sized, 8 px at a time,
  the mouse moves it too, ENTER or a click ends it and ESC puts it back.
  Double-clicking the icon or pressing ALT+F4 closes the window (a window's
  `onBeforeClose` veto still applies). On a Mac the keys are Option+Space and
  Option+F4; a browser on Windows keeps ALT+SPACE and ALT+F4 for itself.
- **Dialogs and message boxes** are captioned as Windows captions them (WIG
  Ch.8): every one has a title (its application's name when it has none, so
  the desktop's alerts read "Windows Explorer"; an About box reads "About
  <name>") and a Close button that does what Cancel does, or what OK does on a
  box with only OK; on a Yes/No question the Close button is dimmed and ALT+F4
  leaves the box open. Every dialog moves by its title bar. Each title-bar
  button names itself in a tooltip after half a second.
- **Window menu bars.** No menu bar crosses the top of the screen: each window
  has its own, a flat ButtonFace band under the title bar whose height, font
  and colors follow the scheme (SM_CYMENU, the menu font, MenuText); a title
  is sunken by one ring while its menu is open or the keyboard is on it, an
  unavailable title is embossed, and each menu hangs from its title's
  bottom-left corner. It ends with one Help menu: Help Topics and What's This?
  (Shift+F1) under Windows 98, Classicy's help items, the app's, then "About
  <app>" last.
- **Each scheme's chrome.** The caption takes the scheme's caption font (a
  tool window's, the small caption font), its marks are inked in ButtonText
  and drawn twice the size in buttons 24 px or taller (the new
  `titleBar.markUnit` knob), the sizable frame is the scheme's border width
  with its ActiveBorder or InactiveBorder band, and one row of ButtonFace sits
  under the caption, so the large and extra-large schemes draw their own
  chrome.
- **For developers.** `ClassicyWindowTitleBar` gains `labels`,
  `onIconMouseDown`, `onIconDoubleClick`, `closeDisabled`, `zoomDisabled`,
  `collapseDisabled`, `buttonTooltips`, `onHelp` (Windows' "?" caption box,
  which starts What's This?) and `utilityTitle`; `ClassicyWindow` gains
  `onCaptionClose`; `ClassicyApp` gains `showInQuickLaunch`; `ClassicyDesktop`
  gains `userName` and `onLogOff`. `showContextMenu` takes optional
  `ClassicyContextualMenuOptions` (`helpItem`, `placement`, `focusFirstItem`,
  `keyboard`, `anchor`); `ClassicyBevelButtonPopup` takes `aside` and
  `menuScrollMargin`; `useClassicyBalloonHelp` takes a third argument, `{
  force }`, which shows the balloon as a tooltip even while Balloon Help is
  off. New exports: `classicyMaximizedWindowRect`,
  `classicyWindowChromeEdges`, `isClassicyWindowRestoreRect`,
  `computeClassicyWindowEdgeResize`, `classicyWindowSystemMenuItems`, the
  `ClassicyAppHelpers` succession helpers (`classicyVisibleSuccession`,
  `classicyWindowsMinimize`, `isClassicyPrimaryWindow`,
  `isClassicyWindowMinimized`, `isClassicyWindowShown`,
  `classicyAppPalettesHidden`), `isClassicyApplicationsEntry`, and from
  `ClassicyFileDrag.ts` `CLASSICY_DROP_ACTIVATE_ATTRIBUTE`,
  `CLASSICY_DROP_ACTIVATE_EVENT`, `CLASSICY_DROP_ACTIVATE_DELAY_MS` and
  `findClassicyFileDropActivator`. `resolveSize`, `resolvePosition` and
  `clampWindowPositionToViewport` take an optional last `bottomBand`, and
  `computeClassicyWindowResize` an optional last `ceiling`; both default to
  today's behavior. A window's root carries `classicyWindowMaximized`,
  `classicyWindowMinimized` and `classicyWindowSizingBorder` under their keys.
- **Recorded deviation.** A dialog blocks the taskbar along with the rest of
  the desktop; Windows leaves the taskbar usable.
- **Storybook**: Appearance/Windows 98/Shell draws every scene, under the
  Windows Standard, Windows 95 and Rainy Day schemes; `parameters.classicy.userName`
  gives the desktop a signed-in user. **Example app**: Demo has a Quick Launch
  button, Demo Extension shows a menu bar extension (a status indicator under
  Windows 98), and the desktop passes `userName="Guest"`.

## Menus, keyboard and access keys

- **Windows 98's menus take the keyboard** (`menu.keys: "windows"`; WIG Ch.7
  "The Menu Bar and Drop-down Menus", "Pop-up Menu Interaction"). Up and Down
  move through a menu, wrapping and passing over dividers; on a closed title
  they open its menu on the first item. Right opens a submenu, or moves to the
  next title, opening its menu if one was open; Left closes a submenu or moves
  to the previous title. Home and End go to a menu's ends, Return and Space
  choose an item, and a typed letter jumps to the next item that starts with
  it. Escape closes one level at a time, a contextual menu included; F10 takes
  the keyboard to the menu bar's first title and back (a window's bar answers
  only while its window is active). While the keyboard last moved the
  highlight the menu's root list carries `focused`, and the item under a
  resting pointer drops its highlight, so only the keyboard's item is
  tracked. Under `menu.disabledItems: "browse"` the keyboard stops on dimmed
  items too.
- **Shift+F10 and the Application key** (`keyboard.contextMenuKey`) open the
  menu of what is selected: the selected item in a folder window or the
  selected icon on the desktop, dropped from its lower left, wherever focus is
  in the folder window or with the desktop itself focused; else the focused
  element's menu at its center.
- **Menus stay open and cascade as Windows' do.** `menuBar.idleTimeoutMs` (0
  under Windows 98: a menu opened by clicking stays until the next click;
  absent, 15 s, as before) and `menu.submenuDelayMs` (400: a cascade opens
  and closes after Windows' time-out, and pop-up menus open their submenus on
  hover). A menu command runs the moment it is chosen, with no flash and no
  400 ms wait.
- **Access keys** (`menu.accessKeys: "auto"`). Every menu title and item, every
  label of a focusable control, push buttons, check boxes, option buttons and
  tabs underline an access key (WIG Ch.7 "Menu Titles", "Menu Item Labels";
  Ch.8 "Navigation in Secondary Windows"). Alt and a title's letter opens its
  menu, and Alt alone or F10 takes the menu bar; in an open menu a letter
  chooses its item, stepping through items that share it; Alt and a label's or
  control's letter focuses the control and clicks, toggles or chooses it, the
  letter alone doing the same from a button. A button with no key given takes
  the first free letter of its text, except OK and Cancel, which Enter and Esc
  reach; a tab takes only a key it is given. The bundled apps' menus and
  message boxes carry Windows 98 SE's own letters (&File, &Edit, &View, &Help,
  Cu&t, &Copy, &Paste, C&lear, Select &All, Save &As, &Yes, &No, &Retry), and
  Alt with an access key wins over an item's Option shortcut. In development
  builds two items of one menu, or two controls of one window, sharing a key
  log a warning. An empty submenu shows a dimmed "(Empty)"
  (`menu.emptySubmenus: "placeholder"`).
- **Shortcuts spelled and keyed as Windows' are.** Under
  `menu.shortcutSpelling: "names"` shortcuts read Ctrl+Backspace, Alt+Shift+F,
  Ctrl+Del, and the Edit menu Ctrl+X, Ctrl+C, Ctrl+V and Del for Clear. Under
  `keyboard.command: "ctrl"` a Command shortcut answers to Ctrl alone, so the
  Windows key with a letter or a period does nothing. Items that only ask
  before they act (the Recycle Bin's Empty, Reset PRAM) read without an
  ellipsis (`menu.confirmEllipsis: false`, `ClassicyMenuItem.confirms`).
- **Shortcuts you can change** (`keyboard.editableShortcuts`). A new Keyboard
  control panel lists each running application's commands with their keys, a
  Change… button for each, and Reset; the new keys work everywhere the menu
  does, the desktop's Move To Trash included.
- **For developers.** `ClassicyMenuItem` and `ClassicyControlLabel` take
  `accessKey` (one character; `""` for none), wrapped in the new
  `data-classicy-part="access-key"` part, with `aria-keyshortcuts` on an item;
  ClassicyButton, ClassicyCheckbox, ClassicyRadioInput's inputs and
  ClassicyTabs' tabs take `accessKey` too. `ClassicyMenu` takes `orientation`;
  new are `useClassicyMenuIdleTimeout()`, `CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS`
  (15000), `useClassicyBundledAccessKeys()`, `formatKeyboardShortcutNames`,
  `classicyKeycapName`, `CLASSICY_MODIFIER_KEY_NAMES`,
  `System.Manager.Desktop.shortcutOverrides` with
  `ClassicyDesktopSetShortcutOverride` and
  `ClassicyDesktopResetShortcutOverrides`, `useClassicyMenuItemShortcut`,
  `useClassicyMenuItemShortcuts`, `ClassicyKeyboardManager` and
  `CLASSICY_BUNDLED_MENU_SHORTCUTS`. The layout keys are `menu.keys`,
  `menu.disabledItems`, `menu.submenuDelayMs`, `menuBar.idleTimeoutMs`,
  `menu.accessKeys`, `menu.shortcutSpelling`, `menu.emptySubmenus`,
  `menu.confirmEllipsis`, `keyboard.contextMenuKey`, `keyboard.command`
  (`"metaOrCtrl"` | `"ctrl"`) and `keyboard.editableShortcuts`. Platinum and
  System 7 declare none: their menus take Return alone, as before, with no
  access keys, glyph shortcuts, and Command answering to Command or Control.

## Selection

Windows 98 selects as Windows does; each rule is an optional layout key only
it declares (`selection.secondaryButton`, `selection.selectOn`,
`selection.dragRange`, `selection.modifiers`, `selection.pageKeys`,
`selection.keyboard`, `selection.iconNavigation`, `contextMenu.openOn`,
`mouse`, `input.escapeCancels`, `fileBrowser.iconSelection`,
`fileBrowser.regionSelect`), so Platinum and System 7 keep Mac OS 8's.

- **The mouse.** A right-click selects what it lands on, or keeps a selection
  it lands in, so the menu acts on everything chosen; pop-up menus open when
  the right button comes up. A tab is chosen as the button goes down. An icon
  dragged by itself moves only once the pointer is 4 px from where it was
  pressed. Only the left button drags windows, dividers, column edges and
  icons; the middle button does nothing there. Escape takes back a drag in
  progress: a window's move or resize, a split view's divider, a slider, an
  icon, a column edge, the selection rectangle or the Control Strip's drags.
- **Lists.** List boxes, tables, the Finder's list view and trees select a row
  as the left button goes down, so a file dragged before it was selected is
  already drawn selected; a click on a selected item keeps the selection until
  the release. Dragging across rows selects them, scrolling past the list's
  ends; Ctrl+Shift-click extends from the anchor without dropping the rest. A
  double-click opens every selected item. Page Up and Page Down move the
  keyboard row to the last or first row wholly shown, then a page further.
  Space is a table's Select key (Control or ⌘ toggles, Shift extends); in a
  multiple-selection list, Control, ⌘ or Option with a navigation key moves
  only the keyboard row, and Shift+F8 toggles Add mode
  (`data-classicy-selection-mode="add"`). A tree's Control chords scroll it
  without moving its row, and a table's tree rows expand and collapse on the
  bare Right and Left Arrows.
- **Folder windows** select as Explorer does: at the press; Shift-click by the
  rectangle between the anchor and the clicked icon, Ctrl+Shift-click adding
  or removing it; a drag of any selected icon carrying them all, each
  outlined; a double-click or Enter opening every selected item; Space and
  Ctrl+Space; one Tab stop per view. The list view takes a selection rectangle
  too, dragged from below its last row; either view's adds with Shift, toggles
  with Ctrl, scrolls the window past its edge, and is drawn dotted and inverted
  over what lies beneath. The dotted focus rectangle marks only the focused
  icon's label.
- **The desktop** selects the same way: Ctrl-click, Shift-click and
  Ctrl+Shift-click; a drag of any selected icon carries the whole selection; a
  rectangle drawn with Shift adds and with Ctrl toggles, nothing drawn until
  the pointer moves; button 2 on the empty desktop may start the rectangle,
  its menu opening at the release; Space, Ctrl+Space and Shift+Space; Enter
  opens; the arrows, Home and End move among the icons; one Tab stop, the icon
  last clicked or moved to.
- **For developers.** `ClassicyTable` and `ClassicyListBox` take
  `onActivateSelection`, `ClassicyTable` `rowsDrag`, `ClassicyFileBrowser`
  `openItemsFunc`; `useListNavigation(rows, { pageRows })` gives a host's own
  list the page rule; `ClassicyIcon` takes a controlled `selected` and
  `onSelectClick`.

## Finder and files

Under `finder.commands: "windows"` (Windows 98 only) the Finder's menus are
Windows 98 SE Explorer's, each item with its access key; Platinum and System 7
keep the Mac Finder's menus exactly as they were.

- **Explorer's commands.** A folder window's File menu: Open (Ctrl+O), New ▸,
  Create Shortcut, Delete (Del), Rename, Properties, Close; its Edit menu: Cut,
  Copy, Paste, Paste Shortcut, Select All; its View menu: Large Icons, Details,
  Arrange Icons ▸ (by Name, Type, Size or Date), Line Up Icons. An item's menu
  leads with Open, in bold, the command a double-click runs (Open With… for a
  type nothing opens), then the handler's verbs, Cut, Copy, Create Shortcut,
  Delete, Rename and Properties; an app's and a drive's desktop icons lead with
  Open too; an extension's menu leads with Properties, which opens its control
  panel, as its double-click does. A right-click on a folder's or the
  desktop's empty space offers View ▸, Arrange Icons ▸, Line Up Icons, Paste,
  Paste Shortcut, New ▸ and Properties. The desktop's own File, Edit and View
  menus carry the same commands.
- **New, Rename and Delete.** New ▸ makes a "New Folder" ("New Folder (2)" on a
  clash), or a document an app declares with `registerApp`'s new `creates`
  field (SimpleText's "New Text Document.txt"), where the menu was opened,
  selected, its name ready to type. F2 renames in both views and on the
  desktop. Every Delete asks Windows 98's Confirm File Delete question first,
  from the menus, the Delete key, Ctrl+Backspace or a drop on the Recycle Bin.
  Names refuse `\ / : * ? " < > |` in Windows 98's own words
  (`files.names: "windows"`), and the file dialog's New Folder suggests the
  first free name.
- **Shortcuts.** Create Shortcut makes "Shortcut to Plan.txt" ("Shortcut (2) to
  Plan.txt" when that name is taken) beside each selected item, or, for a
  drive, the Recycle Bin or an item of a folder that cannot hold a new file,
  asks to place it on the desktop. A shortcut opens what it points to with the
  same permissions as any other open; a missing original gets Windows 98's
  "Problem with Shortcut" box (Classicy's own message under Platinum or System
  7, where shortcuts keep working). Shortcuts carry the shortcut arrow in both
  views as on the desktop (`icon.aliasBadge: "everywhere"`). Apps add their own
  commands to their files' menus with `registerApp`'s new `verbs`; no bundled
  app adds one yet.
- **Cut, Copy and Paste of files**, through a page-level file clipboard. A cut
  item is drawn dithered until it is pasted, something else is cut or copied,
  or Escape is pressed; a Paste moves cut items, and copies copied ones as
  "Copy of Plan.txt" ("Copy (2) of Plan.txt"), so nothing is ever replaced;
  the pasted items are selected. Paste Shortcut makes a shortcut for each
  copied item. An item in the Recycle Bin can be cut, and pasting it takes it
  out. The keys work in a folder window and on the desktop, but not while a
  name is being edited.
- **Properties**, the last command on every file's, folder's, drive's,
  application's and the Recycle Bin's menu, and Alt+Enter or an Alt
  double-click: Windows 98's General page (the icon and the name, renamable
  there; Type, Location, Size, and for a folder what it Contains; Created and
  Modified; Read-only and Hidden), with OK, Cancel and Apply. Choosing it again
  brings the sheet forward; a multiple selection reads "2 Files, 1 Folders",
  "All of type Text Document"; Properties on the empty desktop opens Display on
  its Desktop tab.
- **Open With.** A file that no program opens asks Open With (shell32's text)
  over the installed programs that open files (`files.unregisteredOpen:
  "openWith"`); with "Always use this program to open this type of file"
  checked, the program chosen opens that type from then on.
- **Windows' type names and hidden extensions.** The Type column and the sheet
  read "File Folder", "Text Document", "Local Disk", "Shortcut", "PDF
  Document" (the package's new `fileTypeNames`), and a file a program opens is
  shown without its extension in both views, on the desktop and on its sheet
  (`files.extensions: "hideRegistered"`; renaming keeps the extension; Finder
  Preferences' "Hide file extensions for known file types" turns it off).
- **Drags, as Explorer's.** A right-button drag ends in Move Here, Copy Here,
  Create Shortcut(s) Here and Cancel (over the Recycle Bin, Move Here and
  Cancel); Ctrl at the release copies and Ctrl+Shift makes shortcuts; a window
  scrolls under a drag only when the pointer slows near its edge, at Windows
  98's own speed; application, drive and Recycle Bin icons on the desktop drag
  as a dotted outline; the pointer shows whether a drop will move, copy or
  link, or is refused, and a list row under a drag is highlighted. A drop into
  an inactive folder window, or onto a desktop folder, activates its window
  (`transfer.activateDropWindow`). The layout keys are `transfer.secondaryButton`,
  `copyModifier`, `autoScroll` and `desktopIconDrag`.
- **Lists and dialogs.** Folders sort first in both views
  (`fileList.foldersFirst`, through `ClassicyTable`'s new `sortGroup`; a
  descending sort puts them last, as Explorer's does), the Open dialog's list
  flows in columns and scrolls sideways (`fileDialog.listFlow: "columns"`,
  WIG Figure 8.6), and the icon view takes Explorer's keys
  (`fileBrowser.keys: "windows"`: Shift ranges, Ctrl toggles, Home, End, Page
  Up, Page Down, a repeated letter stepping on, F2).
- **The Recycle Bin's name** reaches every surface, not only the desktop: its
  window's title, its Properties, Empty Recycle Bin (B), Delete's question and
  the move alerts; emptying it asks Windows 98's own question. The path and
  saved data keep "Trash".
- **For developers.** `ClassicyFileSystem` has a new `copy(path, toFolder, {
  name? })`, journaled to sync adapters as a new `"copy"` op (replay it as a
  deep copy of `path` at `to`, giving every entry `metadata._createdOn` and
  dropping `unsetMetadata` from the copy itself), with the Finder-style
  `copyClassicyFileSystemItems`; `File/ClassicyFileClipboard.ts`;
  `createClassicyFileShortcut` and `classicyFileShortcutPath`
  (`File/ClassicyFileShortcut.ts`, the new `file_shortcut` type);
  `isClassicyValidFileName` and `classicyFirstFreeName`
  (`ClassicyFileNames.ts`); `fileTypeDisplayName` and
  `useClassicyFileTypeDisplayName`; `classicyDisplayFileName` and
  `useClassicyDisplayFileName`. `ClassicyFileBrowser` takes
  `backgroundContextMenu`, `onClipboardCommand` and an extended `commandsRef`
  (select, rename, place, arrange, lineUp), and its `onMoveItems` receives the
  drop target as a fourth argument; `ClassicyIcon` takes `cut` and `alias`;
  `ClassicyTableSelectionApi` takes an optional `select` and `sortBy`;
  `ClassicyInputDialog` takes a function `prompt`.

## Documents and text

- **Notepad's documents** (`document.confirmUnsavedClose`). SimpleText asks
  before a changed document closes, with Notepad's message box ("The text in
  the Letter.txt file has changed." over "Do you want to save the changes?",
  Yes, No and Cancel); the close box, File ▸ Close and Quit all ask, Quit once
  for each changed document, and a Cancel stops it.
- **Reopening activates the object's window** (`document.reopenActivates`):
  opening a document or folder that is already open, from Finder, a viewer's
  OpenFile or a desktop icon, brings its own window to the front.
- **View state kept** (`window.restoreViewState`): a plain-text document comes
  back with the caret and scroll position it was closed with, and a folder
  window at its scroll offset.
- **Ctrl+O and Ctrl+S** (`menu.standardShortcuts: "windows"`) answer File ▸
  Open… and Save instead of the browser's Open and Save Page.
- **Editing as Windows did.** A double-click selects the word and the spaces
  after it, never the punctuation or the line break that follows
  (`text.wordSelect: "trailingSpace"`). The Edit commands act only on a field
  in the active window, so Delete chosen in one window no longer deletes a
  word selected in another (`edit.scope: "window"`). The Edit menu is
  Notepad's, in every window's own bar (`edit.menu: "windows"`): Undo (dimmed
  when there is nothing to undo), Cut, Copy, Paste, Delete (Del) in place of
  Clear, Select All, with Cut, Copy and Delete dimmed while nothing is
  selected. Right-clicking any text field (a plain field, a text editor, the
  rich-text editor, a combo box or a spinner) shows Windows 98's own edit menu
  at the pointer, dimmed as Windows dims it (`textField.contextMenu: "edit"`).
- **For developers.** `ClassicyWindowSetScroll { app, window, scroll?, caret?
  }` and the optional `scroll` and `caret` fields on a window record, written
  only under `window.restoreViewState`; `ClassicyScrollArea`'s
  `initialScroll` and `onScrollSettled`; `ClassicyTextEditor`'s
  `initialCaret`, `onCaretSettled`, `initialScroll` and `onScrollSettled`;
  `classicyReopenActivates` and `focusClassicyReopenedWindow`
  (`ClassicyDocumentReopen`); a second argument on `ClassicyRichTextEditor`'s
  `onChangeFunc` (MDXEditor's `initialMarkdownNormalize`, which it always
  passed); `showContextMenu`'s `{ helpItem: false }`.

## Help and ToolTips

- **ToolTips** (WIG Ch.12 "Tooltips"). Help shown on hover opens as a ToolTip
  20 px under the pointer (`balloonHelp.placement: "pointer"`, the
  `tooltip.pointerOffset` knob), after half a second, gone after five seconds
  or on a press, and a tenth of a second after the pointer moves straight to
  the next control (`delayMs`, `autoPopMs`, `reshowMs`, `hideOnPress`); no
  window but the active one shows any (`activeWindowOnly`). An icon-only
  `ClassicyBevelButton`, a toolbar button, is named by a ToolTip of its
  `aria-label`, else `iconAlt` (`unlabeledTips`). A desktop icon's ToolTip
  gives its name and description in one weight, with no gap (Figure 12.5).
- **Menu help in the status bar** (`menu.itemHelp: "statusBar"`). A
  highlighted item's help is the window's status-bar message (Figure 12.7),
  shown by a `ClassicyPlacard` given the new `menuStatus` prop, not a balloon;
  the new `balloon.disabledContent` says why an unavailable item is
  unavailable.
- **What's This? and F1** (`balloonHelp.contextHelp: "whatsThis"`). The help a
  ToolTip shows is also each control's context-sensitive Help: What's This?
  (a window bar's Help item, a dialog's "?" caption box, or Shift+F1) turns
  the pointer over the active window into the help pointer, and a click on a
  control shows its help in WinHelp's pop-up (the ToolTip's box with Figure
  12.3's dithered shadow, the new `tooltip.shadow` knob); a click on
  something with no help keeps the mode, Escape or a click outside leaves it.
  F1 shows the focused control's help, or opens Help Topics. A right-click on a
  control with help and no menu of its own offers "What's This?".
- **WinHelp's windows** (`help.topicWindow: "winhelp"`). Apple Guide's topic
  window is WinHelp's: sizable (down to 320 × 200), captioned with the help
  application's name, with Help Topics, Back and Options (Copy) above the
  topic; the title and topic on InfoWindow in the system font, a line under
  the title, and green text jumps (the new Help ▸ Jump text color). Help
  Topics, Start ▸ Help and a window bar's Help Topics open WinHelp's Help
  Topics dialog (`ClassicyHelpTopics`, through the new
  `APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT`), whose Contents tab lists the topics in
  books. Windows 98's Help menu topic is "Using Help"; Platinum and System 7
  keep "About Help".
- **Wizards** (`assistant.navigation: "buttons"`). An assistant's page arrows
  and page number give way to "< Back" and "Next >" (Alt+B, Alt+N), dimmed at
  the ends and standing before Finish and Cancel, on a ButtonFace page with
  etched lines.
- **Tips worded as Windows 98's.** A disk's tip reads "Shows the files and
  folders on this disk." (`desktopIcons.drive`), the Recycle Bin's is Windows
  98's own, and the PDF viewer, HyperCard and Drive Setup get tips that start
  with a verb.
- **For developers.** `registerAppleGuideTopic` takes `packages` and `book`;
  `getAppleGuideTopic(id, packageId?)`, `listAppleGuideTopics`,
  `isAppleGuideTopicRegistered`, `subscribeAppleGuideTopics`,
  `useAppleGuideTopic` and `useAppleGuideTopics` are new; `ClassicyTree`
  takes `openIds`. Fixed: Apple Guide no longer loses its open topics when a
  stale topic id is pruned.

## Controls, scrolling and dialogs

- **Tree keys** (`tree.keys: "windows"`): a `ClassicyTree` takes the bare arrows
  as Windows' tree view does, Right expanding a folder or moving into it, Left
  collapsing it or moving up to its parent; the ⌘/Ctrl chords still work.
- **Check lists.** `ClassicyListBox` takes `checkboxes`: a multi-selection list
  can show a check box before each row (`data-classicy-part="list-check"`, the
  root `classicyListBoxCheckboxes`); a click or Space toggles one row, and the
  arrow keys move without choosing. The base stylesheet hides the box, so
  under Platinum and System 7 chosen rows highlight as before; Windows 98 draws
  Windows' flat check box.
- **Spin boxes.** `ClassicySpinner`'s Up and Down Arrow step the value through
  the same clamp as the little arrows (before, the browser's number field
  stepped past the clamp), and the new `wrap` prop cycles past `maxValue` back
  to `minValue` and the other way.
- **Inactive selections.** `ClassicyTree`, a `ClassicyTable` with
  `scrollable={false}` and `ClassicyIcon` carry `inactive` while their window
  is not the active one, as scroll areas already did; Windows 98 draws those
  selections in the button face color with plain text, as Explorer did, and a
  list box keeps its highlight. A meter's warning zones are patterned (a
  stipple, then a checker) so they read without their color.
- **A scroll box that snaps back** (`scrollBar.liveSnapBack: true`,
  `snapBackScale: { across: 8, along: 2 }` under Windows 98): while the pointer
  is farther from the bar than the snap-back distance a live thumb drag puts
  the content back where it started, and a release out there leaves it there
  (WIG Ch.6 "Scroll Box"). `snapBackScale` applies to on-release drags too,
  for a theme that sets no `--scroll-bar-snap-back`.
- **Splits the user can close and reopen.** `ClassicySplitView` takes
  `splittable` (two panes): dragging the divider to either end, or
  double-clicking it, closes a pane, which stays mounted with `collapsed`; the
  other pane shows a split box (`classicySplitViewSplitBox`) at that end of
  its scroll bar, to drag out or double-click. `defaultClosed` and
  `onSplitChange(closed)` persist the choice, and `commandsRef` gives a
  window's menu the Split command (`split()`, `removeSplit()`, `isSplit()`):
  the arrows move the divider, Enter sets it and Escape puts it back (WIG Ch.6
  "Splitting Windows"). A moving divider carries `dragging`. Windows 98 draws
  the split box raised and a moving split bar in the halftone; Platinum gives
  the box its divider's border; System 7 draws the HIG's black split bar. A
  view that is not `splittable` behaves as before. `ClassicyScrollArea` takes
  `barAccessories`, controls drawn inside a bar beyond its arrows, in the new
  parts `scroll-accessory-start` and `scroll-accessory-end`.
- **Message boxes.** A Return held down from the command that raised a message
  box no longer closes it (`dialog.flushInput`). A message box's Help button is
  a push button reading "Help", as wide as OK and Cancel, last in the row. The
  startup screen shows no row of extensions.
- **Last folder and tab.** The Appearance Manager and Finder Preferences reopen
  on the tab they were left on, and the Open and Save dialogs at their app's
  last folder, for the session (in every package; below). New:
  `ClassicyTabs`' `defaultTab` and `onTabChange`, `useClassicySessionTab`, and
  `apps[id].session` (never persisted) through
  `ClassicyAppRememberFileDialogFolder` and `ClassicyAppRememberTab`.

## Color schemes

- **Windows 98 SE's own schemes.** Every Windows 98 theme is read from
  `SHELL2.INF`, all thirty-three schemes of the Display control panel plus
  Windows 95: each brings its 29 system colors, its border, scroll bar,
  caption, small caption and menu sizes, and its caption, small caption, menu,
  message box and icon fonts. New are High Contrast #1, #2, Black and White in
  three sizes each, Windows Standard (large) and (extra large), Lilac (large)
  and Rose (large); every id 3.7 shipped is kept.
- **The sixteen classic schemes look as Windows 98 drew them.** 3.7's came
  from a third-party Windows 8 pack: captions are now flat (Windows Standard
  keeps its gradient), Maple's, Pumpkin's, Rainy Day's and Wheat's palettes and
  six Hilight colors are corrected, fonts follow the scheme, ToolTips use each
  scheme's colors, a solid scroll track is drawn where Windows drew one, and
  desktop icons are spaced 75 px apart. Each scheme's caption font, frame
  width, borders and menu height reach the windows and menu bars (above).
- **Windows 95's raised toolbar buttons** in its preset, Windows 98's flat ones
  in every other scheme, switched by a new Options knob, "Raised buttons"
  (`toolbar.restBevel`). A disabled toolbar button's image is embossed.
- **High Contrast.** When the browser forces colors (Windows' own High
  Contrast setting) the look keeps its bevels and glyphs: every control is
  drawn in the user's system colors, and the wallpaper is hidden.
- **Windows' color names.** The Colors tab names the colors as Windows'
  Display Properties does: 3D Objects, Selected Items, Window, Desktop, Button
  Highlight, Button Light, Button Shadow, Button Dark Shadow and Window Text
  (the package's new `colorLabels`).
- **Windows theme files.** Load Theme… reads Windows `.theme` files (Plus! for
  Windows 95, Windows 98's Desktop Themes) while Windows 98 is the active
  package.
- **For package authors**, four additive core capabilities, each absent unless
  a package declares it: `typography.families` (a package's own fonts, emitted
  as `--package-font-<name>`, `-size` and `-weight`, labeled by `fontFamilies`,
  edited in the Fonts tab, set with `ClassicyDesktopChangeFont { family, font
  }` and `ClassicyDesktopChangeFontSize { family, fontSize }`);
  `iconDimming.disabledControl` (a disabled bevel or toolbar button's image,
  which may be an `emboss` of two theme colors); `themeFileImporter` (another
  system's theme files for Load Theme…, validated like a Classicy theme file);
  and the `desktopIconGrid.columnGap` knob, beside `rowGap`. No step is needed:
  a host that switches nothing sees the corrected schemes.

## Windows 98 SE's art, cursors, fonts, sounds, wallpapers, patterns and screen savers

Everything here is from the Windows 98 Second Edition CD, used, like Apple's
Mac OS assets, under the fair use doctrine; the package README lists every
file's source. Nothing changes under Platinum or System 7.

- **Icons and system art.** Files, folders, drives, control panels and
  programs show Windows' 32 px images, with Windows' own 16 px images at the
  small size; text files, pictures, movies and sounds show Windows 98's
  document icons (a new optional icon family, `system.files.byType.<type>`,
  read by `iconImageByType` before the generic page). Internet Explorer 5's
  toolbar buttons replace the browser's toolbar icons. The Recycle Bin is the
  Trash's image, and Windows' shortcut overlay is drawn over a shortcut's whole
  icon. The About box's Windows logo is the startup and About logo, and Web
  View's sky is behind About This Computer. Glyphs Windows drew in the
  scheme's colors are still drawn from theme tokens.
- **Names.** The bundled apps show Windows 98's names and descriptions:
  Windows Explorer, Notepad, Display, Sounds, Date/Time, Taskbar & Start Menu,
  Windows Help, Media Player, Imaging and Internet Explorer; on the desktop the
  Trash is the Recycle Bin and the startup disk My Computer. These are display
  only: app ids, records, saved state and analytics keep their own names. New,
  additive: a package may declare `desktopIcons`
  (`ClassicyDesktopIconOverrides`, `ClassicyDesktopIconOverridesSchema`, read
  with `useClassicyDesktopIconIdentity` or
  `resolveClassicyDesktopIconIdentity`), and `ClassicyDesktopIcon` takes an
  optional `startupDisk`, which `ClassicyDesktop` sets on the first drive's
  icon.
- **The crash screen.** A crash under Windows 98 shows its fatal-exception
  screen instead of the Sad Mac: light gray text on blue, " Windows ", "A fatal
  exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. The
  current application will be terminated.", its two bullets and "Press any
  key to continue _"; a click or any key restarts, as before
  (`layout.crashScreen: "fatalException"`).
- **Cursors.** USER.EXE's system cursors, each at its own hotspot: the arrow,
  the hourglass, Working in Background, the pointing hand, the I-beam, the
  cross, the size arrows, Unavailable and Help Select (`WINDOWS98_CURSORS`; the
  new cursor roles `notAllowed`, `appStarting` and `help`). The I-beam and the
  cross inverted the screen in Windows, which a CSS cursor cannot do, so they
  are drawn black. The pointer follows Windows: the arrow over list and tree
  rows, sliders, tab and pager arrows and swatches and throughout a drag, the
  diagonal size arrow over the size grip, the two-headed one over a split
  view's divider also while it is dragged, Unavailable where a dragged file
  cannot go, the hourglass while Windows starts and Working in Background
  while a PDF loads.
- **The font.** `"Pixelated MS Sans Serif"` in regular and bold (above), and
  desktop text drawn unsmoothed, as Windows drew its bitmap font.
- **Sounds.** One pack, `windows98`, of the CD's `C:\WINDOWS\MEDIA` WAVs,
  encoded as ogg and m4a and played where Windows 98's default sound scheme
  played them: The Microsoft Sound at startup (`ClassicyBoot`, so Platinum's
  chime no longer plays under Windows 98), Ding for the beep and for a click
  outside a modal window, Chord when an alert box opens, Notify for new mail,
  and Recycle when the Recycle Bin is emptied. The Sound tab offers Chimes,
  Chord, Ding (the default), Logoff, Notify, Recycle, Start and Tada; once the
  user picks one, every alert plays it. Opening, closing, maximizing or
  minimizing a window and using a menu play no sound, as in Windows. A user who
  had picked "Exclamation" now hears Ding, or Chord for an alert box. Core,
  additive: `ClassicySoundPack.alertTypeSounds` (`{ note?, caution?, stop? }`)
  gives each alert type its own sprite while the user has picked no alert the
  pack offers (`ClassicyAlert` now sends its `alertType` with
  `ClassicySoundPlayError`), and `CLASSICY_OPTIONAL_SOUND_SPRITES` lists sprites
  a pack may leave out, played only by a pack that defines them; the first is
  `ClassicyTrashEmpty`, played after Special ▸ Empty Trash removes something.
- **Wallpapers and patterns.** The Desktop tab offers Windows 98 SE's 19
  wallpapers and its 19 desktop patterns (Bricks, Buttons, Cargo Net,
  Circuits, Cobblestones, Colosseum, Daisies, Dizzy, Field Effect, Key, Live
  Wire, Plaid, Rounder, Scales, Stone, Thatches, Tile, Triangles, Waffle's
  Revenge), a pattern drawn in the scheme's desktop color and black, as
  Windows drew it; Windows Standard keeps its plain teal desktop.
- **Screen savers.** Windows 98's own, ported from the CD with the options and
  defaults of their Settings dialogs: Flying Through Space, Flying Windows,
  Mystify Your Mind, Curves and Colors, Scrolling Marquee, 3D Pipes (WebGL) and
  Blank Screen, the default, since Windows 98 set none. They run at Windows
  98's 18 frames a second, show a single still frame under reduced motion, and
  stop while the page is hidden.

## The changes every package sees

- **One Help menu** (HIGOS8 Ch.4 "Help menus", p.92, Figure 4-2; HIG7 "The
  Help Menu", p.125). An application's own Help menu is merged into the Help
  menu, after the system's items (About Balloon Help…, Show/Hide Balloons) and
  the items it registers with `useClassicyHelpMenu`, each group after a
  divider; an app item that repeats the balloon toggle is dropped. So a Finder
  window no longer adds a second Help title: under Platinum and System 7 the
  menu bar shows one Help menu, holding the same two items with a Finder
  window focused as with the desktop. Keyboard equivalents keep their scopes,
  so the Keyboard Equivalent dialog names the same owners. Finder's Hide/Show
  Balloon Help item is now an event item (`ClassicyDesktopSetBalloonHelp`) with
  the same id and title.

Behaviors Mac OS 8's and System 7's Finders and menus had too, now in every
package:

- **Press-drag-release menus** (HIGOS8 "Sticky Menus", p.92). A press on a
  title opens its menu at once; releasing over an item chooses it, releasing
  over the title leaves the menu open as a click always did, and releasing off
  every menu closes it. A press inside an open menu released over another item
  chooses that item; before, this closed the menu with nothing chosen. A host
  test that presses a title (`mousedown`) and expects its menu still closed
  must now expect it open.
- **Automatic scrolling under a file drag** (HIG7 p.274; WIG Ch.6 "Automatic
  Scrolling"). While a dragged Finder item rests within a line of the edge of a
  scroll area that holds drop targets, the area scrolls toward that edge one
  line every 120 ms, re-highlighting the folder under the pointer
  (`findClassicyFileDragAutoScroll(x, y)` reports where it would scroll). An
  icon dropped back in its own folder lands where its outline was released even
  when the window scrolled during the drag. Windows 98 replaces it with
  Explorer's velocity scroll (`transfer.autoScroll`).
- **One selection in the icon view** (HIG7 pp.288–291). A click selects one
  icon, a click in empty space deselects, Shift-, ⌘- or Control-click adds or
  removes one; the arrows go to the nearest icon and typing selects by name;
  dragging across empty space draws the selection rectangle; a slow second
  click on a selected icon's name renames it in place (`onRenameItem`,
  `renameClassicyFileSystemItem`); Select All works there. `ClassicyIcon` takes a
  `renaming` field.
- **Names without case**, as HFS and FAT had them. `ClassicyFileSystem`
  compares names without regard to case and keeps them as typed: `plan.txt`
  finds `Plan.txt`, a move or rename onto another item's name in any case is
  refused, a change of case alone renames, and trees saved with case-only twins
  keep both reachable by their exact spelling. New: `fs.storedPath`,
  `classicyFileSystemEntryKey`.
- **The file dialogs' last folder and the control panels' last tab** for the
  session (HIG7 p.146; WIG Ch.8 p.146), a folder gone since falling back as far
  up as still exists.
- **The rich text editor's toolbar tips** (Undo, Redo, Bold, Italic, Underline,
  Code, Rule) were unstyled 16 px text in the page's body. They now open in the
  desktop, above its windows: Platinum and System 7 draw them as their help
  balloon's rounded white box, Windows 98 as a ToolTip. A host that styled
  `.mdxeditor-popup-container` in `document.body` should know that the
  container now sits inside `.classicyDesktop`, in a
  `classicyRichTextEditorPopups` element.
- **Fixes.** A `ClassicyBevelButtonPopup`'s arrow keys pass over the items of a
  closed submenu, and `ClassicySpinner`'s Up and Down Arrow keep to its clamp
  (above).

## New in the core: the first audit pass

Additive hooks the Windows 98 look needed in the audit's first pass; none changes what Platinum or
System 7 draw, and a package that reads none of them sees nothing new.

- **The paged side of a scroll-bar track.** While a `ClassicyScrollArea`
  track is held and paging, the track carries `--classicy-scroll-page-start`
  and `--classicy-scroll-page-length`: the stretch between the thumb and the
  arrow on the pointer's side, from the track's start, following the thumb
  as it pages and removed when the thumb reaches the pointer or the button
  comes up. Windows 98 inverts that side alone (Windows' `PatBlt` inversion
  while paging); Mac OS inverts nothing, so Platinum and System 7 read it
  not at all.
- **Three states for the browser floor.** `ClassicyComboBox`'s root carries
  `open` while its list is shown (its input's `aria-expanded` said so
  already); `ClassicyDatePicker`'s and `ClassicyTimePicker`'s frames carry
  `disabled` with their inputs; and a `ClassicySlider`'s stack carries its
  indicator's direction (`classicySliderStackIndicatorUp`, `-Down`, `-Left`,
  `-Right`, `-Nondirectional`) beside the input's own class. Each lets a
  package key a rule on a class where it would otherwise need `:has()`,
  which Firefox before 121 lacks; Platinum and System 7 read none of them.
- **The table's focus row, and the framed contents' holder.** One row of a
  `ClassicyTable` (the Finder's list included) carries `focused`: its
  keyboard cursor, the row last clicked or arrowed to, else the first
  selected row, else the first, whether or not the list has focus, so a
  package can ring Windows' focus item under the list's `:focus` without
  `:has()`. And a window's `classicyWindowContents` carries
  `classicyWindowContentsWithFrame` while it holds the modeless-dialog
  frame (`contentFrame`), beside `classicyWindowContentsWithHeader`, so a
  package can restyle the holder the same way. Platinum and System 7 read
  neither.
- **The Finder list's icon as a mask.** Each row of `ClassicyFileBrowser`'s
  list view (`classicyFileBrowserViewTableRowContainer`) carries
  `--classicy-icon-mask`, `url("…")` of the row's icon, as `ClassicyIcon`
  and the desktop icons already publish theirs, so a package can draw a
  selected icon through its own shape (Windows 98's 50% highlight dither).
  The `<img>` itself is unchanged.
- **A menu's option items and its default item.** A `ClassicyMenuItem` with
  `mark: "bullet"` is one choice of an interdependent group, an option
  button: `role="menuitemradio"` with `aria-checked` true or false, its
  gutter span carrying `classicyMenuItemBullet` beside
  `classicyMenuItemCheck`; one with `isDefault: true`, the command a
  double-click runs, carries the `default` state on its `<li>`. Finder's
  View menu marks the current view as such a group (as Mac OS 8's View menu
  checks it), and the Trash icon's Open is its menu's default item. Windows
  98 draws the chosen option's round bullet and the default item in bold
  (WIG Ch.7 "Types of Menu Items"); Platinum and System 7 key on
  `.classicyMenuItemCheck.checked` alone, so they draw their check mark at
  a chosen option, and read `default` not at all.
- **A zoomed window, and one that cannot be sized.** A `ClassicyWindow`'s
  root carries `expanded` while the window is zoomed (the store's `zoomed`,
  beside `collapsed`, `active`, `inactive` and `dragging`; the zoom's
  geometry stays inline, as before), and `classicyWindowNoResize` while it
  is `resizable={false}` (no grow box), named like `classicyWindowNoScroll`.
  Windows 98 shows Restore in place of Maximize on a zoomed window and gives
  a window that cannot be sized the dialog's three-ring fixed frame, with no
  sizing border (WIG Ch.6 "Maximizing Windows", "Window Frames"); Platinum
  and System 7 read neither.
- **A scroll arrow at the end of its travel.** Each arrow of a
  `ClassicyScrollArea` bar carries `disabled` while the content cannot
  scroll further its way: the start arrow while the axis is scrolled to 0,
  the end arrow while it is at its maximum (within a pixel, for the
  fractional offsets a zoomed page reports), both while the axis fits
  (beside the bar's `fits`), set from the same measurement that moves the
  thumb, so on every scroll. A press there scrolls nothing, as before.
  Windows 98 embosses that arrow as it embosses a fitting bar's, the rule
  the Windows Interface Guidelines leave to the application (WIG Ch.6
  "Scroll Arrows"); Platinum and System 7 read it not at all.

## Upgrade

1. Upgrading from 3.7.x, bump every Classicy package you load together to
   3.8.0. To use Windows 98, add `@classicy/appearance-windows98` at 3.8.0 and
   import it at your entry; keep every Classicy package at one version.
2. With a Vite dev server, add `@classicy/appearance-windows98` to
   `optimizeDeps.exclude` when you load it. Under a strict CSP, link its two
   stylesheets after the core's: `classicy-windows98.css`, then
   `classicy-windows98.fonts.css`.
3. A sync adapter that replays the file system's journal must handle the new
   `"copy"` op (Finder's Copy and Paste under Windows 98).
4. A host test that presses a menu title and expects the menu still closed
   must now expect it open; one that styled the rich text editor's pop-ups in
   `document.body` must look inside `.classicyDesktop`.
5. Nothing else changes: under Platinum and System 7 the core draws and
   behaves as 3.7 did, apart from the changes every package sees, above.
