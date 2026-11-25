# @classicy/appearance-windows98

Windows 95 and 98, the classic Windows look and shell, as an Appearance
Package for [Classicy](https://github.com/robbiebyrd/classicy). In place of
the Mac OS menu bar and Control Strip it gives the desktop Windows' own
shell: a taskbar along the bottom of the screen with the Start button, a
button for each open window and the clock, and a menu bar in each window.
It draws Windows 98's chrome: gradient title bars with Minimize, Maximize
and Close at the right, two-pixel bevels from the system colors, dithered
scroll-bar tracks with an arrow at each end, raised menus and rectangular
controls, in every color scheme of Windows 98's Display control panel,
High Contrast included.

The core, `@classicy/classicy`, registers no Appearance Package. Without one,
`ClassicyDesktop` shows a message telling you to load one instead of the
desktop. Import this package once, at your app's entry, to register Windows 98:

```ts
import "@classicy/appearance-windows98";
```

`@classicy/classicy` is a peer dependency. Install both, at the same version:

```sh
pnpm add @classicy/classicy @classicy/appearance-windows98
```

A host may load Windows 98 alone or beside Platinum
(`@classicy/appearance-platinum`) and System 7
(`@classicy/appearance-system7`); the Appearance Manager switches between
them. A host that loads several installs them all at one version and bumps
them together. The package ships its type declarations (`bundler`, `node16`
and `nodenext` resolution).

## What it ships

- **Thirty-four themes.** The thirty-three color schemes of Windows 98
  Second Edition's Display control panel, each read from the scheme Windows
  98 SE's own `SHELL2.INF` writes to the registry (its 29 system colors,
  its border, scroll bar, caption, small caption and menu sizes, and its
  caption, small caption, menu, message box and icon fonts), under Windows
  98's own names: **Windows Standard** (id `windows98`, the package's
  defaults: navy title bars shading to light blue, which a fresh Windows 98
  draws, the `#C0C0C0` face and the teal desktop), Windows Standard (large)
  and (extra large), Brick, Desert, Eggplant, High Contrast #1, #2, Black and
  White, each in its (large) and (extra large) sizes too, Lilac and Lilac
  (large), Maple, Marine (high color), Plum (high color), Pumpkin (large),
  Rainy Day, Red, White, and Blue (VGA), Rose and Rose (large), Slate,
  Spruce, Storm (VGA), Teal (VGA) and Wheat (ids `windows98Brick`,
  `windows98HighContrastBlackLarge` and so on; every id the package shipped
  before is kept). The named schemes' captions are flat, as Windows 98
  stores them. And **Windows 95** (id `windows95`): Windows Standard's
  palette with flat navy title bars and raised toolbar buttons, as Windows
  95 drew them. Every scheme is a recoloring of one stylesheet: the
  title-bar colors, the selected text's, the ToolTip's (each scheme's own:
  Brick's dark red on its pale face), the desktop labels', ButtonText,
  GrayText, the scroll bar's, the window borders' and the Start menu banner's
  are the package's own
  color families, editable in the Colors tab beside the palette (Help's
  green jumps among them, the same in every scheme), and its
  fonts the package's own font rows in the Fonts tab (Times New Roman in
  Eggplant's and Rose's captions and menus, Arial in Brick's caption and
  Lilac's, larger faces in the large schemes).
- **The Windows shell.** No menu bar crosses the top of the screen: each
  window has its own, under its title bar, ending with a Help menu that
  holds Classicy's help commands, the application's own and, last, "About"
  and the application's name. A taskbar runs along the bottom of the
  screen, and windows, cleaned-up desktop icons and menus stay above it:
  - **Start**, at its left, opens the Start menu (so does CTRL+ESC, where
    the browser lets the key through): About This Computer; Programs, the
    applications in the Applications folder; Documents, the documents you
    opened this session (the last 15, by name); Settings, holding Control
    Panel (the control panels), Taskbar & Start Menu... and Show Balloons
    or Hide Balloons; Help;
    Run...; Empty Trash… and Reset PRAM…; then Log Off <name>... (when the
    host passes `userName` to the desktop) and Shut Down.... Its banner
    reads "Windows 98" under every scheme. There is no Favorites or Find:
    Classicy keeps no favorites, and its Finder has no search.
  - **Shut Down...** asks what to do over a dimmed screen, as Windows 98
    did: **Stand by** darkens the screen until you press a key or click;
    **Shut down** closes your programs and shows "It's now safe to turn off
    your computer." until a key or a click starts a fresh session;
    **Restart** closes your programs and starts that session at once, the
    startup screen and all. Your settings and files are kept (Reset PRAM…
    is what clears them), and the dialog opens on your last choice.
  - **Run...** opens a program by its name, a file or folder by its path
    (`Macintosh HD:Documents:Read Me.txt`; `\` works too, and the case
    does not matter) or a web address in the browser, remembering what you
    ran in its drop-down; Browse... picks a file; a name it cannot find
    gets Windows' "Cannot find the file" message.
  - **Log Off <name>...** asks "Are you sure you want to log off?" over
    the dimmed screen; Yes closes your programs and hands over to the
    host's `onLogOff`, or starts a fresh session without one.
  - **Quick Launch**, beside the Start button, as Windows 98 installs it:
    small buttons for the Finder (a window on the startup disk), Show
    Desktop (it minimizes every window; a second click brings them back)
    and each app you mark with `showInQuickLaunch` on its `ClassicyApp`,
    each named in a tooltip. Toolbars ▸ Quick Launch in the taskbar's menu
    hides it and shows it again, and the choice is kept.
  - **A button for each open window** (not for dialogs or palettes), in
    the order the windows opened, the active window's pressed. The Start
    button says "Click here to begin." in a tooltip. Clicking a
    button activates its window, minimizes it when it is already active,
    and restores it when it is minimized; right-clicking it opens the
    window's pop-up menu; a title cut short shows whole in a tooltip; and
    a file dragged from a folder and held over a button brings its window
    up for the drop. When an application in the background puts up a
    message while you are working elsewhere, its message waits behind your
    window and its button flashes (three times, then it stays highlighted)
    until you switch to it, as Windows 98 did. When too many windows are open for the buttons to
    fit, they shrink to their icons and show a row at a time, with small
    up and down arrows at the right to move between the rows.
  - **The notification area**, at its right, holds the Control Strip's
    modules as icons (Sound, Screen Saver, Appearance, and any module your
    app registers): a click opens a module's control or its menu, a
    right-click its menu, and its name shows in a tooltip. The menu bar
    extensions an app adds sit beside them and answer the same clicks and
    show their names the same way, then the clock, in Windows'
    `4:37 PM` (or `16:37` with the 24-hour clock), the date in its
    tooltip; a double-click on it opens Date & Time. The Control Strip
    control panel chooses which modules show; Windows draws no Control
    Strip.
  - **Right-click the taskbar** for Toolbars ▸ Quick Launch, Cascade
    Windows, Tile Windows Horizontally (one above another) and Tile
    Windows Vertically (side by side), Minimize All Windows, then Undo
    Cascade, Undo Tile or Undo Minimize All to put the windows back, and
    Properties; right-click the clock for Adjust Date/Time first.
  - **Taskbar Properties** (the taskbar menu's Properties, or Start ▸
    Settings ▸ Taskbar & Start Menu, the Control Strip control panel under
    Windows' name) offers Always on top (off, windows cover the taskbar
    until you click it), Auto hide (it slides off its edge, leaving a thin
    strip, and slides back when the pointer reaches that edge), Show small
    icons in Start menu (small icons and no banner) and Show Clock, applied
    on OK or Apply; its Start Menu Programs page's Clear empties Start ▸
    Documents and the Run history. Like a file's Properties sheet, it
    starts on its selected tab (ENTER is OK, ESC Cancel) and carries the
    "?" caption box, whose What's This? describes each check box.
  - **Drag the taskbar** by an empty part of it to the top, left or right
    edge of the screen, or back to the bottom; at a side its buttons stack.
    Windows, maximized windows, desktop icons and menus keep clear of it
    wherever it is, and it stays where you leave it.

  The Minimize button sends a window to its taskbar button, and the next
  window on screen takes the focus; an application's palettes leave the
  screen with its last window and come back with it.
- **Its layout.** The grow box at the bottom right, menus that stay open until the next click, cascading menus that
  open and close on Windows' 400 ms time-out (a contextual menu's on hover
  too), Windows' menu keyboard (the arrow keys through the menus and across
  the menu bar, Home and End, Return and Space, a letter jumping to its
  item, Escape a level at a time, an open contextual menu included; the
  Mac packages' menus take Return alone), stopping on dimmed items as
  Windows' does, Shift+F10 and the Application key opening the focused
  item's contextual menu (in a folder window or on the desktop, the
  selected item's, opened at the center of its icon), Finder's item menus leading with Open, their
  default item, as Explorer's do (the Mac packages' keep the Mac Finder's),
  Explorer's commands in Finder's menus (a folder window's File menu Open,
  New, Create Shortcut, Delete, Rename and Close; its View menu Large Icons,
  Details, Arrange Icons by Name, Type, Size or Date and Line Up Icons; the
  same, with New, on a right-click in its white space; an item's menu Open,
  the commands its application adds, Create Shortcut, Delete and Rename;
  an extension's Properties, its control panel, which a double-click opens
  too; an app's and a drive's desktop icon leading with Open), Create
  Shortcut making a "Shortcut to Plan.txt" ("Shortcut (2) to Plan.txt" on a
  clash) beside each item, selected, with the arrow on the desktop, and
  asking Windows 98's "Windows cannot create a shortcut here. Do you want the
  shortcut to be placed on the desktop instead?" for a drive, the Trash or an
  item of a folder that takes none, a shortcut opening what it points at, or
  saying "Problem with Shortcut" when that is gone, New making a
  "New Folder" ("New Folder (2)" on a clash) or a "New Text Document.txt"
  (SimpleText's) where the menu was opened and its name edited at once, in
  either view and on the desktop, F2 renaming in both views and on the
  desktop, every Delete (the menus, the Delete key, Ctrl+Backspace, a drop on
  the Trash) asking Windows 98's "Confirm File Delete" first, names refusing
  \ / : * ? " < > | in Windows 98's words, and the file dialog's New Folder
  offering "New Folder" (or its first free number), Properties last on
  every item's, drive's, app's and the Trash's menu and in the File menus,
  and on Alt+Enter and an Alt double-click, opening Windows 98's property
  sheet (the General page: the icon and name, renamed there, Type, Location,
  Size, a folder's Contains, Created, Modified and the Read-only and Hidden
  attributes, with OK, Cancel and Apply; a drive's used space; a multiple
  selection's "2 Files, 1 Folders", "All of type …" and "All in …"), the
  empty desktop's Properties opening the Appearance control panel on its
  Desktop tab, a file no program opens asking Open With ("Click the program
  you want to use to open the file 'data.bin'.", the programs that open
  files, "Always use this program to open this type of file"; the item's
  first command then reads "Open With…"), the extension of a file a program
  opens hidden ("Read Me.txt" shown as "Read Me", in both views, on the
  desktop and in the sheet; a rename keeps it; Finder Preferences' "Hide
  file extensions for known file types" shows them again), and the Type
  column and the sheet naming types as Windows 98 does ("File Folder",
  "Text Document", "Local Disk", "Shortcut"), Cut, Copy, Paste and Paste
  Shortcut for files and folders (an item's menu Cut and Copy, an item in
  the Trash Cut alone; a folder window's Edit menu Cut Ctrl+X, Copy Ctrl+C,
  Paste Ctrl+V and Paste Shortcut; Paste and Paste Shortcut on a
  right-click in a folder's or the desktop's white space; the keys
  themselves in a folder window and on the desktop, a name being edited
  keeping its own), a cut item drawn dithered until it is pasted, cut or
  copied again or Escape cancels it, a Paste moving the cut items into the
  folder or copying the copied ones ("Copy of Plan.txt", "Copy (2) of
  Plan.txt" when the name is taken), the pasted items selected where the
  menu was opened, and Paste Shortcut making "Shortcut to Plan.txt", a drop
  into an inactive folder window activating it, a drag with the right
  button ending in Windows 98's menu (Move Here, in bold, Copy Here, Create
  Shortcut(s) Here and Cancel; Move Here and Cancel over the Recycle Bin),
  Ctrl held as the button comes up copying the dragged items and Ctrl with
  Shift making shortcuts to them (in their own folder too), the pointer
  during a drag the arrow over everything, the no-drop sign where nothing
  takes the drop and the arrow with a plus or the shortcut curl while a
  copy or shortcuts would be made, a folder window scrolling under a drag
  that rests near its edge (or over its scroll bar), a folder row under a
  drag drawn as a selected one, and an application's, drive's or the
  Recycle Bin's desktop icon dragged as an outline while it stays where it
  is, which only the desktop takes and Escape takes back,
  an access key on every menu title, menu item, label of a control and
  push button (the first free letter of its text, underlined, unless the
  app gives it one; OK and Cancel take none, as Enter and Esc reach them;
  a tab only one the app gives it), the bundled apps' menus and message
  boxes carrying Windows 98's own letters (&File, Cu&t, &Copy, &Paste,
  Select &All, &Yes, &No, &Retry): Alt and a title's letter opens its menu,
  a letter in an open menu chooses its item, Alt pressed alone (or F10)
  takes the menu bar, and Alt and a control's letter moves to it (clicking
  a check box, option button or button, choosing a tab), ahead of any
  Alt shortcut of a menu item, keyboard shortcuts spelled as Windows' menus
  spell them (Ctrl+Backspace, Alt+Shift+F, Ctrl+X, the Edit menu's Clear
  Del) and answering to Ctrl alone, so the Windows key with a letter or a
  period runs nothing, the bundled applications' shortcuts the user's to
  change in a Keyboard control panel (its Shortcuts tab lists each
  application's commands with their keys, a Change… button for each and
  Reset; the Mac packages list no such panel and keep every application's
  own keys), an empty submenu showing a dimmed
  "(Empty)", desktop icons from the top left, as Windows laid them, their
  labels wrapped within the 75-pixel icon spacing, two lines at most with
  an ellipsis unless the icon has the focus (so a large scheme's labels
  stay on the screen), a
  window's scroll bars kept where its content fits, a dragged scroll box
  that snaps back, the document with it, when the pointer strays well away
  from its bar (more than eight bar widths to the side or two past its
  ends) and follows again when the pointer returns, and the Open and Save
  boxes as titled, movable dialogs showing one folder at a time under a
  pop-up that runs the path upward (Windows' Look in), its items flowing in
  columns as Windows' list view does in List mode (scrolled sideways, Left
  and Right moving a column), Save As opening with the file name selected,
  folders listed before files in the Finder's windows (last when a list's
  sort runs down, as Explorer's did), the icon view's selection keys as
  Explorer's (Shift-click and Shift with an arrow selecting the icons in the
  rectangle between the anchor and the item, Ctrl-click adding or removing
  one item, Ctrl+Shift-click adding or removing that rectangle without
  losing the rest, Home, End, Page Up and Page Down selecting, a letter
  typed again stepping to the next item starting with it, F2 renaming,
  Space selecting the focused icon and Ctrl+Space adding or removing it,
  Enter alone opening, and Tab stopping at one icon of the view, the one
  last clicked or moved to), the icon view's mouse as Explorer's (an icon
  selected as the button goes down; a click on one icon of several selected
  leaving it alone selected; dragging any selected icon carrying them all,
  out to a folder or around the window; a right-click on an unselected icon
  selecting it, and on empty space clearing the selection), a selection
  rectangle in the list view too (dragged from below the last row, the rows
  it touches selected), either view's rectangle adding to the selection with
  Shift and toggling what it touches with Ctrl, scrolling the window when
  dragged past its edge, and taken back with Escape, the desktop's icons
  selected as Explorer's desktop selects them (Ctrl-click adding or removing
  one icon without losing the rest, Shift-click selecting the icons in the
  rectangle between the anchor and the icon, Ctrl+Shift-click adding or
  removing that rectangle, a drag of any selected icon, Ctrl held or not,
  carrying them all, a selection rectangle drawn with Shift adding to the
  selection and with Ctrl toggling what it touches, Space selecting the
  focused icon, Ctrl+Space adding or removing it, Shift+Space extending to
  it, Enter alone opening, and Tab stopping at one icon of the desktop, the
  one last clicked or moved to), dialogs and alerts centered on whole pixels,
  so their one-pixel bevels and glyphs stay sharp, trees driven by the bare
  arrow keys as Windows' tree view is (Right expands a folder or goes into
  it, Left collapses it or goes up to its parent, and Ctrl with an arrow,
  Home, End, Page Up or Page Down scrolls the tree without moving its
  selection; a list view's folders expand on Right and Left too), lists
  keyed as Windows' are (Page Up and Page Down moving the selection to the
  page's last or first row, then a page further; Space selecting a list
  view's row; in a list that takes several items, Ctrl with an arrow
  moving the focus rectangle alone, Ctrl+Space then adding or removing that
  item, and Shift+F8 entering Add mode, where the arrows move the focus
  alone, Space adds or removes an item and Shift with an arrow extends
  without losing the rest, until Shift+F8 again), and help shown as a
  ToolTip: once the pointer rests on a control, just below and right of the
  pointer (moved left at the screen's right edge, above the control at its
  bottom), gone when the control is clicked. The mouse follows Windows'
  conventions too: a right-click on an unselected desktop icon or list row
  selects it first, and one on a selected item keeps the whole selection,
  which its menu then acts on; a pop-up menu opens when the right button
  comes up, its top-left corner at the pointer, with no Help item at its
  head (Mac OS 8's contextual menus lead with one); a list, a table, the Finder's list view and a tree select a row
  as the left button goes down, so a file dragged before it was selected is
  drawn selected; dragging across a list's rows selects them (the list
  scrolls while the pointer is past its top or bottom); Ctrl+Shift-click
  extends from the anchor without losing the other selected items; a
  double-click, Ctrl- or Shift-double-click included, opens every selected
  item; a tab is chosen as the button goes down; an icon dragged by
  itself moves only once the pointer is 4 px from where it was pressed, and
  only the left button drags (the middle button does nothing); and Escape
  takes back a drag in progress: a split view's divider, a slider's thumb,
  an icon or a column edge goes back to where it was.
- **Its windows.** Windows maximize: the Maximize button fills the screen
  above the taskbar with the window's frame off the screen, the maximized
  window neither moves nor sizes and shows no size grip, Restore returns it
  to the size and place it had (after a reload too), and a double-click on
  the caption maximizes or restores it, as Windows 98 did (palettes, which
  have no Maximize button, do neither), a window that can be minimized but
  not maximized (the Calculator) shows its Maximize button dimmed beside its
  Minimize, as Windows 98 shows the two as a pair, and a window minimized
  while maximized offers Maximize as well as Restore in its pop-up menu.
  Windows size from their frame: dragging any edge of a resizable window's
  frame sizes it from that edge, and dragging near a corner (within a
  caption's height of it, along either edge) sizes it from both of the
  corner's edges, as Windows 98's sizing border does, while a dialog's or
  other fixed window's frame does nothing. Every window has its pop-up
  (system) menu: right-click anywhere in its title bar or its taskbar
  button, press its icon or press ALT+SPACE for Restore, Move, Size,
  Minimize, Maximize and Close (Move and Close on a dialog, Move, Size and
  Close on a palette), each dimmed when it cannot apply, Close in bold with
  ALT+F4; the arrow keys walk the menu and ESC closes it, Move and Size move
  and size the window with the arrow keys until ENTER (ESC puts it back),
  and a double-click on the icon or ALT+F4 closes the window. A browser on a
  Windows computer keeps ALT+F4 and ALT+SPACE for itself; on a Mac they are
  Option+F4 and Option+Space. Each caption button names itself (Minimize,
  Maximize or Restore, Close) in a tooltip when the pointer rests on it, as
  Windows 98 did. Every dialog and message box has a title (its
  application's name when it has none of its own; an About box reads "About"
  and the name) and a Close button, which cancels it (a message box with
  only an OK takes OK), and moves by its caption, error messages included; a
  Yes/No question, which has no Cancel, shows its Close dimmed, and ALT+F4
  leaves it open, as Windows' message boxes do. A window moves and sizes
  with the left mouse button only, and ESC during a move or a resize puts
  the window back where it was. A window opened again (a folder, a
  document) comes back scrolled where it was left. A dialog whose controls
  have help shows the "?" button beside Close, which starts What's This?.
- **Its desktop**, which works as Explorer's did. Right-clicking empty
  desktop shows Arrange Icons, Line Up Icons, Paste, Paste Shortcut, New and
  Properties, and Ctrl+X, Ctrl+C and Ctrl+V cut, copy and paste its icons'
  files. The right button draws a selection rectangle too, its menu
  appearing when the button comes up; Shift adds the icons the rectangle
  covers to the selection, Ctrl toggles them, and ESC takes the rectangle
  back. The arrow keys, Home and End move between the icons, Ctrl moves the
  focus without selecting, and Space selects. A file dragged from the
  desktop onto a folder is moved, copied with Ctrl, or made a shortcut with
  Ctrl+Shift (the right button's drag offers the three in a menu), and the
  folder's window comes forward.
- **Its Help menus.** Each window's Help menu leads with Help Topics,
  which opens the Help Topics browser, as Start ▸ Help does, then What's
  This? (Shift+F1).
- **Its documents**, kept as Notepad and Explorer kept them. SimpleText
  asks before a changed document closes, with Notepad's own message box
  ("The text in the Letter.txt file has changed." / "Do you want to save the
  changes?", or "the Untitled file" for a new one): Yes saves it (a new one
  through Save As) and closes, No closes without saving, Cancel keeps it
  open; its document windows are titled "Untitled - Notepad", the
  document then the program, as Notepad's are, and every program's File
  menu ends with Exit where Mac OS has Quit; its close box, File ▸ Close
  and Exit all ask, Exit once for each
  changed document. Opening a document or folder that is already open
  brings its own window to the front, from Finder or the desktop. A
  plain-text document comes back with the caret and the scroll position it
  was closed with. And File ▸ Open… and Save answer to Ctrl+O and Ctrl+S,
  instead of the browser's Open and Save Page. The Mac packages keep
  SimpleText as it was.
- **Its text**, edited as Windows 98 edited it. A double-click selects the
  word and the spaces after it, never the comma or the line break that
  follows. The Edit commands act on a field of the active window only, so
  Delete chosen in one window never deletes a word selected in another.
  The Edit menu is Notepad's: Undo (dimmed with nothing to undo), Cut,
  Copy, Paste, Delete (Del, in place of Clear) and Select All, Cut, Copy
  and Delete dimmed while nothing is selected. And a right-click on any
  text field, a combo box's or a spinner's included, shows its own menu,
  Undo, Cut, Copy, Paste, Delete and Select All, at the pointer, keeping
  the selection; Shift+F10 or the Application key opens it at the field's
  center. The Mac packages keep their text fields as they were.
- **Its wizards and Help.** An assistant is a wizard: "< Back" and
  "Next >" push buttons (Alt+B, Alt+N) in place of the page arrows and the
  page number, Back dimmed on the first page and Next on the last, standing
  together before the page's own Finish and Cancel, on a ButtonFace page
  ruled off by etched lines under its title and above its buttons, as
  Windows 98's wizards are. The Help topic window (a topic chosen in
  Help Topics, such as "Using Help") reads as a WinHelp topic: cream (InfoWindow) behind the title and
  the text, both in the system font at 8 point, a black line under the
  title, and green jumps (the Colors tab's Help ▸ Jump text). It is a
  window you can size, and Help Topics, Back and Options (Alt+T, Alt+O)
  stand in a row above the topic: Back shows the previous page, and
  Options ▸ Copy puts the page's text on the clipboard. Help Topics opens
  WinHelp's "Help Topics" dialog: its Contents tab lists the help topics in
  books, and Display (or a double-click, or Return) shows the chosen topic,
  Open and Close open and close a book, and Cancel or Escape closes the
  dialog. The Help menu's own topic is "Using Help": point to an item for
  its ToolTip, or use What's This?. What's This? (Shift+F1) turns the
  pointer over the active window into the arrow with a question mark; then
  a click on a control shows what it does in a cream pop-up with a shadow,
  and Escape, a click outside the window or Shift+F1 again leaves the mode.
  F1 shows the same pop-up for the control that has the focus, or opens
  Help Topics where there is none; right-clicking a control with help that
  has no menu of its own offers What's This? (Alt+W). In
  HyperCard's editor, an armed part tool shows as a latched toolbar button,
  and Escape disarms it before it deselects a part. The Mac packages keep
  their pager, their fixed Help window, their "About Help" topic and their
  tools as they were.
- **Its ToolTips and status bar.** ToolTips keep Windows' timing: half a
  second's rest shows one, it goes after five seconds or when the control
  is clicked, and moving straight on to the next control shows its ToolTip
  a tenth of a second later; a window that is not the active one shows
  none. A toolbar button that shows only a picture is named by its
  ToolTip, whether or not Balloon Help is on; a desktop icon's ToolTip gives
  its name and description in plain text, on two lines; the rich text
  editor's toolbar buttons (Bold, Italic, Undo…) show ToolTips too. A menu
  item's help goes to the window's status bar while the item is
  highlighted, as WordPad's does, never into a balloon beside the menu, and
  an unavailable item can say why it is unavailable. The Mac packages keep
  their balloons as they were; the rich text editor's toolbar buttons show
  them a help balloon now, where they showed unstyled text.
- **Its menus, message boxes, colors and pointers.** A menu command runs
  the moment you choose it, with no flash and no wait. Empty Trash and
  Reset PRAM read without an ellipsis, as Windows writes a command that
  only asks first. A Return held down from the command that raised a
  message box no longer closes the box: it waits for a new press. A message
  box's Help button is a push button reading "Help", as wide as OK and
  Cancel, last in the row. The startup screen shows no row of extensions.
  The Appearance Manager's Colors tab names the colors as Windows' Display
  Properties does: 3D Objects, Selected Items, Window and Desktop, and
  Button Highlight, Button Light, Button Shadow, Button Dark Shadow and
  Window Text for the colors Windows derived from them. Shortcuts in the
  Finder's windows, in either view, carry the shortcut arrow over their
  icon, as on the desktop. And the pointer is Windows' arrow over list and
  tree rows, sliders, the tab and pager arrows and the color swatches (the
  hand stays on links), the two-headed sizing pointer over a split view's
  divider, also while it is dragged, the hourglass while Windows starts and
  the arrow with the hourglass while a PDF loads. The Mac packages keep
  their menus, dialogs, labels and pointers as they were.
- **Its look**, one stylesheet in the package layer:
  - windows: the four-ring frame, the title bar's gradient with the window's
    icon and bold title at the left and the Minimize (Classicy's collapse),
    Maximize (zoom; Restore while the window is zoomed) and Close buttons at
    the right (the one of Minimize and Maximize a window lacks embossed
    beside the other), the gray inactive bar, the sunken client edge, the size grip,
    the three-ring fixed frame with no sizing border on dialogs and on any
    window that cannot be sized (the control panels, the About windows, the
    Calculator), dialogs on a flat face with the title and Close alone in
    their caption (no icon, no Minimize; an unavailable Close embossed),
    palette windows with their title in the small caption font and an
    11 x 11 Close alone, each scheme's caption font, caption height and
    caption buttons (their marks centered, and twice their size in the
    large schemes' buttons), each scheme's sizing border (wider, and High
    Contrast Black's yellow, in the large High Contrast schemes),
    a modeless dialog's frame flattened to a plain ButtonFace box;
  - the Finder's icon view: a label being renamed in the list view's edit
    box (WindowText on white in a one-pixel black border; a name renamed in
    the details view or on the desktop alike), a drag across
    empty space (in the list view too, and on the desktop, over its icons)
    drawing the dotted selection rectangle inverted over what lies under it,
    as Windows XORed it, nothing drawn until the pointer moves, and
    the dotted focus rectangle on the focused icon's label alone (in icon
    views and on the desktop), never around every selected label;
  - menus: each window's menu bar a flat band under its title bar, 19
    pixels in Windows Standard and taller in the large schemes, its titles
    in the scheme's menu font,
    as Windows 98 draws one, its titles plain under the pointer and sunken
    while their menu is open or the keyboard is on them, an unavailable
    title embossed; raised pull-down and contextual menus with an
    inverted highlight and embossed dimmed items (one item highlighted at a
    time: the keyboard's, while the arrow keys moved it last, the
    pointer's otherwise), etched separators, the access key's letter
    underlined in every title and item (in a control's label, a push
    button and a tab too), the
    default item (the command a double-click runs: Open, first in every
    Finder item's and desktop icon's menu) in
    bold and a round bullet at the chosen item of an option group (the
    Finder's View as Icons and View as List), where the Mac packages draw a
    check, and one Help menu, last, whatever is focused: an application's
    own Help items join it after a separator (WIG Ch.7 "The Help Menu",
    p.99), so a Finder window adds no second Help title;
  - the taskbar: a 28-pixel bar with Windows' raised edge along its top;
    the Start button raised, its label bold beside a small window drawn in
    the scheme's title-bar colors (the package's own art, not Windows'
    flag), pushed in while the Start menu is open; a button per window,
    160 pixels wide at most and sharing the bar evenly when it fills, the
    active window's pushed in over a checkered face with its title in bold,
    a flashing one in the scheme's highlight color;
    and the notification area in a sunken pane, its icons flat and the
    clock at its right end, as Windows 98 drew them;
  - the Start menu, sitting on the taskbar's top edge in one raised frame
    around its banner and its items: the banner a navy-to-blue strip down
    its left side, "Windows" in bold and "98" reading upward in white, as
    Windows 98's banner was in every color scheme (its colors are the Start
    menu color family in the Colors tab), the first level large 32-pixel
    icons on 32-pixel rows, and Programs, Settings and Control Panel
    ordinary menus with small icons; a notification icon's menu is an
    ordinary menu, and its panel (the Sound volume slider) sits in the same
    raised frame, both drawn whole on the taskbar's top edge;
  - controls: 23-pixel push buttons with the default button's dark ring and
    the dotted focus rectangle, 13-pixel checkboxes, 12-pixel radio buttons,
    sunken text fields and lists, pop-up menus with their drop-down button,
    rectangular tabs on a raised panel, the block progress bar, etched group
    boxes, trackbar sliders, raised placards and bevel buttons, flat
    toolbar buttons (raised in the Windows 95 scheme), image
    wells that mark their set value with a solid border, the text color
    outside the button highlight, inside the sunken edge, a list of check
    boxes (a list an app gives check boxes) with the flat check box nested
    controls take before each item, the checked items otherwise plain, and
    meters whose warning ranges carry a pattern as well as their color (a
    dotted stipple when the value leaves the ideal range, a checker when it
    is far from it), so they read in black and white too;
  - scroll bars: an arrow at each end on a checkered track (a solid one in
    the scheme's Scrollbar color in the schemes Windows fills so), a raised scroll
    box, the paged side of the track inverted while the mouse holds it, an
    arrow embossed (disabled) at the end of its travel (the up arrow at the
    top of a document, the down arrow at its bottom), the bars kept in an
    inactive window and drawn, disabled, where the content fits; a split
    view's split box (where an app lets a view be split) a raised box at
    the end of the scroll bar, and its split bar flat, drawn in the
    halftone while it moves;
  - the desktop: icons with plain labels that take the highlight when
    selected, a selected icon blended with a 50% dither of the highlight
    (as Explorer drew it) on the desktop, in icon views and in the Finder's
    list, a shortcut's arrow overlay drawn over the whole icon with its
    label upright, ToolTips in place of balloon help, and the Appearance
    Manager under the same bevels;
  - a window that is not the active one shows its selections as Explorer
    did: a tree's, a list's and the Finder's selected items in the button
    face color with plain text, their icons unblended and no focus
    rectangle (a list box keeps its highlight, as Windows' list box did);
  - message boxes and input dialogs no wider than 415 px, the largest
    secondary window the Windows Interface Guidelines allow, a message box's
    buttons centered, as Windows centers them (a dialog's OK and Cancel
    stay at the right);
  - the HyperCard editor's selection handles as squares of the highlight
    color ringed in the highlighted text color, as Windows drew handles.
- **Its knobs**, in the Appearance Manager's Options tab: the title-bar
  buttons' width and height, the gap before Close and the gap under the
  bar; the progress bar's block width and gap; the height of single-line
  fields and of pop-up menus (21 px each, Windows' edit and combo box
  height, which a larger UI font raises on its own) and of tabs; the
  desktop labels' text-shadow offset (1 px; 0 removes the shadow, which
  stock Windows 98 drew only with the Active Desktop); raised toolbar
  buttons (Windows 95's, 1; Windows 98's flat ones, 0); and a solid scroll
  track (1 where the scheme's ButtonHilight is not its Window color, as
  Windows fills the track with the Scrollbar color then; 0 the checker).
- **High Contrast.** The four High Contrast schemes, in three sizes, and,
  when the browser forces colors (Windows' own High Contrast setting), the
  whole look drawn in the user's system colors rather than lost: every
  bevel an outline, every glyph kept, the wallpaper hidden.
- **Windows theme files.** Load Theme… in the Appearance Manager reads a
  Windows `.theme` file (Plus! for Windows 95, Windows 98's Desktop
  Themes) while Windows 98 is the active package: its colors, metrics and
  fonts become a custom theme, a missing caption gradient taking its base
  color, its wallpaper kept by name when one of that name is installed.
- **Disabled toolbar images** embossed, as Windows draws them: the image's
  dark pixels in the scheme's ButtonShadow over a ButtonHilight copy one
  pixel down and right.
- **Windows 98's sounds**, `windows98`, Windows 98 Second Edition's own
  WAVs from its CD, played where Windows 98's default sound scheme played
  them: The Microsoft Sound at startup, Ding for the beep and for a click
  outside a modal window (the Default sound), Chord when an alert box opens
  (Asterisk, Exclamation and Critical Stop), Notify for new mail and Recycle
  when the Trash is emptied (Empty Recycle Bin). The Sound tab offers the
  eight short sounds of Windows' Media folder as the alert sound, Chimes,
  Chord, Ding (the default), Logoff, Notify, Recycle, Start and Tada; once
  the user picks one, every alert plays it. Like the scheme, the package
  plays nothing on opening, closing, maximizing or minimizing a window or on
  a menu (no interface feedback).
- **Its font**, `"Pixelated MS Sans Serif"`, regular and bold: the family
  every theme names first for its interface text, at 11 px. Windows 98 drew
  its interface in MS Sans Serif, a bitmap font (`sserife.fon`) no browser
  loads; this is 98.css's pixel-for-pixel recreation of it at 8 pt, lou's
  FontStruct "MS Sans Serif" and "MS Sans Serif Bold", licensed
  [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) (not the
  Unlicense: its readme and license files ship beside the faces, in
  `src/assets/fonts/`). The stylesheet draws it unsmoothed, as Windows drew
  its bitmap face. Microsoft Sans Serif, Tahoma and Arial follow it in the
  stack; monospaced text names Fixedsys, Lucida Console or Courier New, which
  the host supplies.
- **Windows 98's icons and system art**, Windows 98 Second Edition's own,
  read from its CD (every file's source is under "Asset sources" below, and
  `docs/windows98-asset-inventory.md` in the repository maps every key):
  the files, folders, drives, control panels and programs in their 32 px
  images with their own 16 px ones (shell32's folder, the hard disk, My
  Computer, Notepad, Display, the message box icons, …), Internet Explorer
  5's toolbar buttons, Web View's sky behind About This Computer, the Start
  button's flag as the Apple menu's title, the Recycle Bin as the Trash,
  the shortcut overlay as the alias badge, the About box's Windows logo as
  the startup and About logo, and the open and closed folders of the Open
  and Save boxes. Where Windows 98 had no icon for a thing it shows its
  generic (a system folder a plain folder, a DVD the CD-ROM drive);
  Classicy's own glyphs and brands keep the core's. The glyphs Windows drew
  in the scheme's colors (the caption buttons' marks, scroll arrows, check
  marks, radio dots, menu arrows) stay drawn from theme tokens, so every
  color scheme draws them in its own colors.
- **Windows 98's names.** The bundled apps show as Windows 98 called the
  same job: Windows Explorer (the Finder, with Explorer's icon), Notepad,
  Display, Sounds, Date/Time, Taskbar & Start Menu, Windows Help, Media
  Player, Imaging and Internet Explorer, with Windows 98's descriptions in
  their desktop ToolTips (the PDF viewer, HyperCard and Drive Setup keep
  their names, with tips that start with a verb); the Trash shows as the
  Recycle Bin and the startup disk as My Computer, each with Windows 98's
  own tip, and another disk's tip reads "Shows the files and folders on
  this disk." The Recycle Bin is named so everywhere: its window's title,
  Empty Recycle Bin (B) on its menu and the Special menu, Delete's
  question ("…to the Recycle Bin?") and its Properties. Emptying it asks
  Windows 98's own question ("Are you sure you want to delete these 3
  items?", Yes and No). Display only: their ids, records, paths and saved
  state keep their own names.
- **Windows 98's document icons.** A text file shows Windows' text
  document, a picture Imaging's document, a movie the video clip and a
  sound the sound clip; a type Windows 98 had no icon for keeps the generic
  page.
- **Windows 98's fatal-exception screen.** When Classicy crashes it shows
  the blue screen in place of the Sad Mac: " Windows ", "A fatal exception
  0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. The current
  application will be terminated.", its two bullets and "Press any key to
  continue _", in light gray on blue. A click or any key restarts.
- **Windows 98's cursors**, `USER.EXE`'s own, at their own hotspots: the
  arrow, the hourglass (Busy), the pointing hand (Link Select, the PDF
  viewer's pan tool), the I-beam and the cross (drawn black: every pixel of
  theirs inverted the screen, which a CSS cursor cannot), and the four
  two-way size arrows, which also stand in for the one-way ones Windows
  never had, Help Select, the arrow with a question mark, while What's
  This? is on, Unavailable, the slashed circle, over a place a dragged file
  cannot go, and Working in Background, the arrow with a small hourglass,
  while a PDF loads. The size grip shows the diagonal one, as Windows' did.
- **Windows 98's wallpapers and desktop patterns**, offered in the
  Appearance Manager's Desktop tab (its Patterns pop-up) while Windows 98 is
  active: the nineteen wallpaper bitmaps of Windows 98 Second Edition (Black
  Thatch to Waves, Clouds, Setup), every pixel kept, and the nineteen
  desktop patterns its `shell.inf` lists (Bricks to Waffle's Revenge, each
  labeled "… Pattern"), drawn as Windows drew them, black over the scheme's
  desktop color, so a pattern follows every scheme. The desktop draws its
  picture whole pixels, and the Desktop tab's preview shows it tiled over
  the desktop color. No theme names one: Windows Standard keeps its plain
  teal desktop.
- **Windows 98's screen savers**, offered under Windows 98 only: Flying
  Through Space, Flying Windows, Mystify Your Mind, Curves and Colors,
  Scrolling Marquee, 3D Pipes and Blank Screen, each a port of its `.scr` on
  the CD with the options its Settings dialog had and the defaults it read
  (Scrolling Marquee's "Where do you want to go today?" among them). They run
  on Windows 98's 55 ms timer tick, draw whole pixels on a canvas and erase
  by drawing in black, as GDI did (Mystify and Curves and Colors with Clear
  screen off draw over the desktop); Flying Windows draws Wingdings' own
  Windows logo; 3D Pipes is drawn with WebGL (black without it). Under
  reduced motion each draws one still frame, and each stops while the page
  is hidden. Blank Screen is the default, since Windows 98 set none.

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers Windows 98, its icons, system art, cursors, wallpapers, desktop
  patterns and fonts, its sound pack (Windows 98's sounds) and its screen
  savers. It also exports
  `WINDOWS98_APPEARANCE_PACKAGE_ID`, `windows98Json` (the themes, layout,
  knobs, color families and font labels, deep-frozen and typed with the
  core's types, as `Windows98Json`), `windows98SoundPack`,
  `windows98AppearanceHooks` (its one hook, a chosen menu item's, deeply
  frozen), `readWindows98ThemeFile` (the `.theme` reader Load Theme…
  uses), `WINDOWS98_SYSTEM_ART` (the system art it
  registers), `WINDOWS98_CURSORS` (its cursors by role, each with its
  hotspot) and `WINDOWS98_CURSOR_ADDITIONS` (the Unavailable and Working
  in Background pointers), `WINDOWS98_FILE_TYPE_ICON_FILES` (the document
  icon files it registers by file type), `WINDOWS98_APPS` and `WINDOWS98_DESKTOP_ICONS` (its `apps` and
  `desktopIcons`), `WINDOWS98_WALLPAPERS` and `WINDOWS98_DESKTOP_PATTERNS`
  (each wallpaper's and pattern's label and identity filename, and a
  wallpaper's CD bitmap and size or a pattern's eight bytes), and each
  screen saver's component and options schema
  (`ClassicyScreenSaverFlyingWindows` and `FlyingWindowsConfigSchema`, and
  so on), with `WINDOWS98_SCREEN_SAVER_IDS` and
  `WINDOWS98_DEFAULT_SCREEN_SAVER`, so a host can offer one under another
  package by registering it again with that package's id added.
- `./scss/*`: the package's SCSS: `bevels`, `pixel`, `screenSavers` and
  the `components/*` partials, and `windows98`, the whole sheet, which a
  host may compile through `pkg:@classicy/classicy/scss/*` (the package
  loads nothing of another package's; the screen savers' index,
  `src/screenSavers/_windows98ScreenSavers.scss`, ships beside the SCSS for
  it).
- `./classicy-windows98.css` and `./classicy-windows98.fonts.css`: the look
  and the fonts as stylesheets, for hosts whose Content-Security-Policy
  blocks inline `<style>` (below).

The fonts, the art, the icons, the cursors, the wallpapers, 3D Pipes'
texture and the sound sheet are files in `dist/assets/`, loaded as
`new URL("assets/…", import.meta.url)`. A Vite host keeps the packages out
of the dev server's dependency pre-bundle, which would break those URLs:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@classicy/classicy", "@classicy/appearance-windows98"],
  },
})
```

List `@classicy/appearance-platinum` and `@classicy/appearance-system7`
there too when the host loads them.

## Strict CSP

The package injects its look as `<style id="classicy-appearance-windows98">`
and its fonts as `<style id="classicy-fonts-windows98">`. Under a policy that
blocks inline `<style>`, link the stylesheets first in `<head>`, in this
order: the core's, then this package's look, then its fonts.

```html
<link rel="stylesheet" href="/node_modules/@classicy/classicy/dist/classicy.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-windows98/dist/classicy-windows98.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-windows98/dist/classicy-windows98.fonts.css">
```

Serve this package's `dist/assets/` beside them. Allow `data:` in `img-src`
as well: a dimmed icon (a hidden application's in the Application menu) is
drawn on a canvas and shown from a `data:` URL.

## Design notes

- **Windows structure, through the layout.** The package's layout asks
  Classicy for Windows' shell and window behavior: menu bars in windows,
  the taskbar and its Start menu, Minimize to the taskbar, Maximize, sizing
  from any edge, the window pop-up menu and titled dialogs. The rest is
  Classicy's, shared by every package: the desktop keeps its icons, the
  Trash and the startup disk; a dialog blocks the whole desktop, the
  taskbar included, where Windows leaves the taskbar usable under an
  application's dialog; and ALT+TAB, ALT+ESC and the Windows key belong to
  the browser and the computer, as does CTRL+ESC on a Windows computer.
  A window's state travels between packages: a window minimized here is
  collapsed (window-shaded) under Platinum and System 7, a shaded document
  window minimized here, and a maximized one zoomed there.
- **Windows' bitmaps where Windows drew bitmaps, tokens where it drew in
  the scheme's colors.** The icons, the Start flag, the Recycle Bin, the
  shortcut overlay, the Windows logo, the wallpapers and the cursors are
  Windows 98's own images, and the desktop patterns its own bytes. The
  title-bar buttons' marks, the scroll
  arrows, the checkmark, the radio ring, the pop-up and menu arrows and the
  slider's thumb, which Windows drew with Marlett in the scheme's colors,
  are one-pixel rectangles placed on a grid
  (`--pixel-unit`), inked in theme tokens, so each color scheme draws them
  in its own colors; the scroll track's checker is a two-color
  `repeating-conic-gradient` of the face and highlight tokens.
- **Where the schemes come from.** Windows 98 Second Edition's own
  `SHELL2.INF` (in `PRECOPY2.CAB` of the Windows 98 SE CD, "Copyright (c)
  1994-1998 Microsoft Corporation"): its `[schemes.reg]` section writes all
  thirty-three schemes under `HKCU\Control Panel\Appearance\Schemes`, each
  a 520-byte blob (a NONCLIENTMETRICS, the icon font and 29 COLORREFs),
  decoded and mapped onto Classicy's palette: ButtonHilight, ButtonLight,
  ButtonFace, ButtonShadow and ButtonDkShadow are `system` 1, 2, 3, 5 and 7
  (4 and 6 the grays between), Window the document color, WindowText the
  ink, WindowFrame the outline, Hilight the highlight, Background the
  desktop color, and the title-bar, HilightText, InfoWindow, ButtonText,
  GrayText, Scrollbar and border colors the package's color families; the
  sizes are knobs, the fonts the theme's font rows. Two departures, both
  Windows 98 as it runs: Windows Standard keeps USER's built-in caption
  gradients (the INF stores the scheme flat), and an MS Sans Serif size is
  the one GDI draws (MS Sans Serif is a bitmap face of 11, 13, 16, 18, 24
  and 32 px, a request between two drawn in the smaller, one below 11 in
  the 11 px face). The 3.7 schemes came from a third-party Windows 8 pack
  and differed in gradients, palettes, Hilight colors and every font.

## References and resources

The look was checked against these; keep them at hand for later work on the
package.

- [98.css](https://jdan.github.io/98.css/) (jdan): the CSS recipes for the
  bevels, the title-bar buttons' marks and the controls, and the woff2
  files of the `"Pixelated MS Sans Serif"` face the package ships (lou's
  FontStruct recreation of MS Sans Serif, under "Asset sources").
- [os-gui](https://os-gui.js.org) (1j01): Windows 98's menus and windows,
  and the `.theme` file format the importer reads.
- Windows 98 Second Edition's `SHELL2.INF`: the thirty-three color schemes,
  colors, sizes and fonts, which every scheme here is read from (Microsoft's
  data; decoded, not copied as a file).
- [React95](https://storybook.react95.io/) and
  [windows98-ui](https://windows98-ui.netlify.app): component galleries to
  compare states against.
- [Chicago95](https://github.com/grassmunk/Chicago95) (grassmunk and
  contributors): a Windows 95 desktop theme for Linux with a large body of
  Windows 9x-era imagery (icons, cursors, wallpapers, the boot and
  shutdown screens), fonts and sounds, and the metrics behind them. The
  theme is GPL-3.0, and its Windows-derived artwork remains Microsoft's, so
  it is a reference for shapes, sizes and palettes; nothing from it ships
  in this package.
- Wine's `user32` and `comctl32` (`msgbox.c`, `uitools.c`, `button.c`,
  `scroll.c`, `trackbar.c`, `progress.c`, `listbox.c`), whose drawing code
  documents Windows 95/98's pixel-level behavior: the centered message-box
  buttons, the pressed default button, the focus rectangle's inset, the
  indeterminate checkbox, the inverted page area of a held scroll bar.

## Asset sources

Every image (but the package's own icon, `windows98.svg`), cursor, sound
and screen saver the package ships is Windows 98 Second Edition's own, read
from the English Windows 98 SE CD (archive.org item
`windows-98-second-edition_202103`): its install cabinets (`WIN98_21.CAB` to
`WIN98_74.CAB`, `BASE4` to `BASE6`, `PRECOPY1` and `PRECOPY2`), unpacked
with `cabextract`, its sounds taken as they are and each binary's
`RT_GROUP_ICON`, `RT_GROUP_CURSOR` and `RT_BITMAP` resources written out
unchanged. An icon file is the group's 32 px or 16 px
image at the group's highest color depth (256 colors where the group has
one), its AND mask made alpha; every file is a lossless WebP of those pixels
(`bin/classicyWebp.ts`), with no color profile. The clones of
[98.js](https://github.com/1j01/98) (1j01), wieslawsoltes/win98 and
lolstring/window98-html-css-js, and alexh's vintage-icons set behind
win98icons.alexmeub.com, were read to find and cross-check them; where one
carries a re-encoded copy, the CD's bytes were taken.

`src/assets/icons/`:

| Files | Windows 98 SE resource | What Windows used it for |
| --- | --- | --- |
| `actmovie-0-32.webp`, `actmovie-0-16.webp` | `actmovie.exe` icon group 0 | ActiveMovie Control |
| `calc-SC-32.webp`, `calc-SC-16.webp` | `calc.exe` icon group SC | Calculator |
| `comctl32-20480-16.webp` | `comctl32.dll` icon group 20480 | Stop icon with its 16 px image (the message icons' small form) |
| `comctl32-20481-16.webp` | `comctl32.dll` icon group 20481 | Information icon with its 16 px image |
| `comctl32-20482-16.webp` | `comctl32.dll` icon group 20482 | Exclamation icon with its 16 px image |
| `deskcp16-40-32.webp`, `deskcp16-40-16.webp` | `deskcp16.dll` icon group 40 | Display (Control Panel) |
| `explorer-100-32.webp`, `explorer-100-16.webp` | `explorer.exe` icon group 100 | My Computer (CLSID DefaultIcon Explorer.exe,0) |
| `explorer-101-32.webp`, `explorer-101-16.webp` | `explorer.exe` icon group 101 | Windows Explorer (the program) |
| `explorer-103-32.webp`, `explorer-103-16.webp` | `explorer.exe` icon group 103 | Desktop (Show Desktop, desktop.scf) |
| `iesetup-102-32.webp`, `iesetup-102-16.webp` | `iesetup.dll` icon group 102 | Internet Options (Control Panel "Internet") |
| `iexplore-32528-32.webp`, `iexplore-32528-16.webp` | `iexplore.exe` icon group 32528 | Internet Explorer (the program, desktop icon) |
| `iexplore-32529-32.webp`, `iexplore-32529-16.webp` | `iexplore.exe` icon group 32529 | HTML document (htmlfile) |
| `iexplore-32540-32.webp`, `iexplore-32540-16.webp` | `iexplore.exe` icon group 32540 | JPEG image (jpegfile, IE 5) |
| `inetcpl-1323-32.webp`, `inetcpl-1323-16.webp` | `inetcpl.cpl` icon group 1323 | Users (Control Panel) |
| `intl-101-32.webp`, `intl-101-16.webp` | `intl.cpl` icon group 101 | Regional Settings (Control Panel) |
| `kodakimg-128-32.webp`, `kodakimg-128-16.webp` | `kodakimg.exe` icon group 128 | Imaging (Kodak Imaging for Windows) |
| `kodakimg-129-32.webp`, `kodakimg-129-16.webp` | `kodakimg.exe` icon group 129 | Imaging document (Imaging.Document DefaultIcon KodakImg.Exe,1): an image file's icon |
| `main-200-32.webp`, `main-200-16.webp` | `main.cpl` icon group 200 | Keyboard (Control Panel) |
| `mmsys-99-32.webp`, `mmsys-99-16.webp` | `mmsys.cpl` icon group 99 | Multimedia (Control Panel) |
| `mmsys-110-32.webp`, `mmsys-110-16.webp` | `mmsys.cpl` icon group 110 | Sounds (Control Panel); its 16 px image is the taskbar's volume icon |
| `modem-1000-32.webp`, `modem-1000-16.webp` | `modem.cpl` icon group 1000 | Modems (Control Panel) |
| `mplayer2-110-32.webp`, `mplayer2-110-16.webp` | `mplayer2.exe` icon group 110 | Media Player (Start > Programs > Accessories > Entertainment) |
| `mshtml-2664-32.webp`, `mshtml-2664-16.webp` | `mshtml.dll` icon group 2664 | Internet Shortcut (.url) |
| `msimn-2-32.webp`, `msimn-2-16.webp` | `msimn.exe` icon group 2 | Outlook Express |
| `msinfo32-128-32.webp`, `msinfo32-128-16.webp` | `msinfo32.exe` icon group 128 | System Information |
| `notepad-2-32.webp`, `notepad-2-16.webp` | `notepad.exe` icon group 2 | Notepad (the program) |
| `password-1000-32.webp`, `password-1000-16.webp` | `password.cpl` icon group 1000 | Passwords (Control Panel) |
| `pifmgr-1-32.webp` | `pifmgr.dll` icon group 1 | MS-DOS Prompt / MS-DOS program |
| `quartz-100-32.webp`, `quartz-100-16.webp` | `quartz.dll` icon group 100 | Video clip (.avi/.mov, ActiveMovie) |
| `quartz-200-32.webp`, `quartz-200-16.webp` | `quartz.dll` icon group 200 | Sound clip (.wav, the MediaType.Icon Media Player registered): an audio file's icon |
| `regwizc-117-32.webp`, `regwizc-117-16.webp` | `regwizc.dll` icon group 117 | Registration Wizard |
| `scrnsave-100-32.webp`, `scrnsave-100-16.webp` | `scrnsave.scr` icon group 100 | Screen saver (Blank Screen, the generic .scr icon) |
| `shell32-1-32.webp`, `shell32-1-16.webp` | `shell32.dll` icon group 1 | Unknown file type (Windows logo on a page); shell32.dll index 0 |
| `shell32-2-32.webp`, `shell32-2-16.webp` | `shell32.dll` icon group 2 | Document (a file of a registered type with no icon of its own) |
| `shell32-3-32.webp`, `shell32-3-16.webp` | `shell32.dll` icon group 3 | Application (an .exe with no icon); comfile |
| `shell32-4-32.webp`, `shell32-4-16.webp` | `shell32.dll` icon group 4 | Folder (Folder/Directory DefaultIcon shell32.dll,3) |
| `shell32-5-32.webp`, `shell32-5-16.webp` | `shell32.dll` icon group 5 | Open folder (Explorer tree, Look in list) |
| `shell32-7-32.webp`, `shell32-7-16.webp` | `shell32.dll` icon group 7 | 3.5" floppy drive |
| `shell32-8-32.webp`, `shell32-8-16.webp` | `shell32.dll` icon group 8 | Removable disk drive |
| `shell32-9-32.webp`, `shell32-9-16.webp` | `shell32.dll` icon group 9 | Hard disk drive (Drive DefaultIcon shell32.dll,8) |
| `shell32-10-32.webp`, `shell32-10-16.webp` | `shell32.dll` icon group 10 | Network drive |
| `shell32-12-32.webp`, `shell32-12-16.webp` | `shell32.dll` icon group 12 | CD-ROM drive |
| `shell32-14-32.webp`, `shell32-14-16.webp` | `shell32.dll` icon group 14 | Entire Network (globe) |
| `shell32-17-32.webp`, `shell32-17-16.webp` | `shell32.dll` icon group 17 | Printer |
| `shell32-18-32.webp`, `shell32-18-16.webp` | `shell32.dll` icon group 18 | Network Neighborhood (desktop icon, CLSID DefaultIcon shell32.dll,17) |
| `shell32-21-32.webp`, `shell32-21-16.webp` | `shell32.dll` icon group 21 | Documents (Start menu, recent documents) |
| `shell32-23-32.webp`, `shell32-23-16.webp` | `shell32.dll` icon group 23 | Find (Start menu); Find Files or Folders |
| `shell32-24-32.webp`, `shell32-24-16.webp` | `shell32.dll` icon group 24 | Help (Start menu, Windows Help) |
| `shell32-26-32.webp`, `shell32-26-16.webp` | `shell32.dll` icon group 26 | Suspend / Stand by (Start menu) |
| `shell32-30-32.webp` | `shell32.dll` icon group 30 | Shortcut overlay arrow (drawn over a shortcut's icon) |
| `shell32-32-32.webp`, `shell32-32-16.webp` | `shell32.dll` icon group 32 | Recycle Bin, empty (CLSID DefaultIcon Empty shell32.dll,31) |
| `shell32-33-32.webp`, `shell32-33-16.webp` | `shell32.dll` icon group 33 | Recycle Bin, full (CLSID DefaultIcon Full shell32.dll,32) |
| `shell32-37-32.webp`, `shell32-37-16.webp` | `shell32.dll` icon group 37 | Program group folder (Start menu folders) |
| `shell32-38-32.webp`, `shell32-38-16.webp` | `shell32.dll` icon group 38 | Printers folder |
| `shell32-39-32.webp`, `shell32-39-16.webp` | `shell32.dll` icon group 39 | Fonts folder |
| `shell32-40-32.webp`, `shell32-40-16.webp` | `shell32.dll` icon group 40 | Taskbar (Taskbar & Start Menu properties) |
| `shell32-44-32.webp`, `shell32-44-16.webp` | `shell32.dll` icon group 44 | Favorites folder |
| `shell32-137-32.webp`, `shell32-137-16.webp` | `shell32.dll` icon group 137 | Control Panel folder |
| `shell32-151-32.webp`, `shell32-151-16.webp` | `shell32.dll` icon group 151 | Configuration settings (.ini; inifile DefaultIcon shell32.dll,-151) |
| `shell32-152-32.webp`, `shell32-152-16.webp` | `shell32.dll` icon group 152 | Text document (.txt; txtfile DefaultIcon shell32.dll,-152) |
| `shell32-153-32.webp`, `shell32-153-16.webp` | `shell32.dll` icon group 153 | MS-DOS batch file (.bat; batfile DefaultIcon shell32.dll,-153) |
| `shell32-154-32.webp`, `shell32-154-16.webp` | `shell32.dll` icon group 154 | System file (.dll/.drv/.sys/.vxd; DefaultIcon shell32.dll,-154) |
| `shell32-156-32.webp`, `shell32-156-16.webp` | `shell32.dll` icon group 156 | Font file, TrueType (.ttf; shell32.dll,-156) |
| `sndrec32-15-32.webp`, `sndrec32-15-16.webp` | `sndrec32.exe` icon group 15 | Wave sound document (.wav; SoundRec DefaultIcon sndrec32.exe,1) |
| `sndvol32-303-16.webp` | `sndvol32.exe` icon group 303 | Volume, muted (the taskbar's volume icon while muted), 16 px |
| `themes-101-32.webp`, `themes-101-16.webp` | `themes.cpl` icon group 101 | Desktop Themes (Control Panel); .theme files |
| `timedate-200-32.webp`, `timedate-200-16.webp` | `timedate.cpl` icon group 200 | Date/Time (Control Panel) |
| `user-101-32.webp` | `user.exe` icon group 101 | Exclamation (MB_ICONEXCLAMATION), 32 px |
| `user-102-32.webp` | `user.exe` icon group 102 | Question (MB_ICONQUESTION), 32 px |
| `user-103-32.webp` | `user.exe` icon group 103 | Stop / hand (MB_ICONSTOP), 32 px |
| `user-104-32.webp` | `user.exe` icon group 104 | Information (MB_ICONINFORMATION), 32 px |
| `user-105-32.webp`, `user-105-16.webp` | `user.exe` icon group 105 | Windows logo (IDI_WINLOGO): 32, 22, 16, 14, 12 and 10 px |
| `wab32-IDI_ICON_ABOOK-32.webp`, `wab32-IDI_ICON_ABOOK-16.webp` | `wab32.dll` icon group IDI_ICON_ABOOK | Address Book |
| `welcome-102-32.webp`, `welcome-102-16.webp` | `welcome.exe` icon group 102 | Welcome to Windows 98 |
| `browseui-bitmap-265-cell-0.webp` | `browseui.dll` bitmap 265, 20 x 20 cell 0 | Internet Explorer 5's toolbar, Back (at rest, gray) |
| `browseui-bitmap-265-cell-1.webp` | `browseui.dll` bitmap 265, 20 x 20 cell 1 | Internet Explorer 5's toolbar, Forward (at rest, gray) |
| `browseui-bitmap-265-cell-3.webp` | `browseui.dll` bitmap 265, 20 x 20 cell 3 | Internet Explorer 5's toolbar, Refresh (at rest, gray) |
| `browseui-bitmap-266-cell-0.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 0 | Internet Explorer 5's toolbar, Back (under the pointer, in color) |
| `browseui-bitmap-266-cell-1.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 1 | Internet Explorer 5's toolbar, Forward (under the pointer, in color) |
| `browseui-bitmap-266-cell-3.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 3 | Internet Explorer 5's toolbar, Refresh (under the pointer, in color) |
| `browseui-bitmap-266-cell-4.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 4 | Internet Explorer 5's toolbar, Home (under the pointer, in color) |
| `browseui-bitmap-266-cell-5.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 5 | Internet Explorer 5's toolbar, Search (under the pointer, in color) |
| `browseui-bitmap-266-cell-6.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 6 | Internet Explorer 5's toolbar, Favorites (under the pointer, in color) |
| `browseui-bitmap-266-cell-7.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 7 | Internet Explorer 5's toolbar, Print (under the pointer, in color) |
| `browseui-bitmap-266-cell-9.webp` | `browseui.dll` bitmap 266, 20 x 20 cell 9 | Internet Explorer 5's toolbar, Edit (under the pointer, in color) |
| `wvlogo.webp` | `C:\WINDOWS\WEB\wvlogo.gif` | Web View's sky, the backdrop of a folder window's title (About This Computer's banner) |

`src/assets/art/`:

| File | Windows 98 SE resource | What it is |
| --- | --- | --- |
| `explorer-bitmap-143.webp` | `explorer.exe` bitmap 143 | the Start button's flag (the Apple menu's title); its `#C0C0C0` ground made clear |
| `shell32-bitmap-130.webp` | `shell32.dll` bitmap 130 | the About Windows box's "Microsoft Windows" logo (the startup and About logo); its `#C0C0C0` ground made clear |
| `windows98.svg` | drawn for the package | the package's own icon in the Appearance Manager: a window on the teal desktop |

`src/assets/cursors/`: `user.exe`'s `RT_GROUP_CURSOR` resources, each 32 x
32 and 1-bit, as an RGBA PNG with no ancillary chunk (black, white, clear;
a pixel that inverted the screen drawn black), registered at the hotspot the
resource declares:

| File | Windows 98 SE resource | Windows' name | Roles | Hotspot |
| --- | --- | --- | --- | --- |
| `user-cursor-100.png` | `user.exe` cursor 100 | Normal Select | `arrow` | 0, 0 |
| `user-cursor-101.png` | `user.exe` cursor 101 | Text Select | `ibeam` | 15, 16 |
| `user-cursor-102.png` | `user.exe` cursor 102 | Busy | `watch` | 16, 16 |
| `user-cursor-103.png` | `user.exe` cursor 103 | Precision Select | `crosshair` | 15, 16 |
| `user-cursor-105.png` | `user.exe` cursor 105 | Diagonal Resize 1 | `resizeNwse` | 16, 16 |
| `user-cursor-106.png` | `user.exe` cursor 106 | Diagonal Resize 2 | `resizeNesw` | 16, 16 |
| `user-cursor-107.png` | `user.exe` cursor 107 | Horizontal Resize | `resizeLr`, `resizeL`, `resizeR` | 16, 16 |
| `user-cursor-108.png` | `user.exe` cursor 108 | Vertical Resize | `resizeUd`, `resizeU`, `resizeD` | 15, 16 |
| `user-cursor-110.png` | `user.exe` cursor 110 | Unavailable | `notAllowed` | 15, 15 |
| `user-cursor-111.png` | `user.exe` cursor 111 | Working in Background | `appStarting` | 0, 0 |
| `user-cursor-112.png` | `user.exe` cursor 112 | Help Select | `help` | 5, 7 |
| `user-cursor-114.png` | `user.exe` cursor 114 | Link Select | `hand` | 5, 0 |

`src/assets/sounds/windows98/sprites/`: the CD's WAVs, unchanged, each
renamed to the sprite it plays (`pnpm build:audio` encodes them into
`windows98.ogg` and `windows98.m4a`). Every one installs to
`C:\WINDOWS\MEDIA`; the events are mapped as the CD's `MMOPT.INF` and
`MOTOWN.INF` map Windows 98's default scheme. Eight are byte for byte
98.js's `audio/` copies, and winhistory.de's `o98.wav` and
`win98logoff.wav` are The Microsoft Sound and `logoff.wav`; 98.js's
`START.WAV` is a re-encode, so the CD's original is used.

| Files | Windows 98 SE file | What Windows played it for |
| --- | --- | --- |
| `ClassicyBoot.wav` | `The Microsoft Sound.wav` (`logon.wav` in `WIN98_54.CAB`) | Start Windows |
| `ClassicyAlertDing.wav`, `ClassicyBeep.wav` | `ding.wav` (`WIN98_70.CAB`) | Default sound |
| `ClassicyAlertChord.wav`, `ClassicyAlertExclamation.wav` | `chord.wav` (`WIN98_70.CAB`) | Asterisk, Critical Stop, Exclamation, Question |
| `ClassicyAlertChimes.wav` | `chimes.wav` (`WIN98_70.CAB`) | (no event in the default scheme) |
| `ClassicyAlertLogoff.wav` | `logoff.wav` (`WIN98_71.CAB`, `WIN98_72.CAB`) | Exit Windows |
| `ClassicyAlertNotify.wav`, `ClassicyEmailNewMail.wav` | `notify.wav` (`WIN98_72.CAB`) | New Mail Notification |
| `ClassicyAlertRecycle.wav`, `ClassicyTrashEmpty.wav` | `recycle.wav` (`WIN98_72.CAB`) | Empty Recycle Bin |
| `ClassicyAlertStart.wav` | `start.wav` (`WIN98_55.CAB`, 4-bit ADPCM) | Internet Explorer's Start Navigation |
| `ClassicyAlertTada.wav` | `tada.wav` (`WIN98_73.CAB`) | (no event in the default scheme) |

`src/assets/wallpapers/`: the CD's wallpaper bitmaps (`WIN98_22.CAB`),
every pixel kept, each named for the long name Setup installed it under
(`shell.inf` installs the first eleven with Windows, `applets.inf`'s Desktop
Wallpaper component seven more, and `copy2.inf` copies `setup.bmp` to the
Windows folder):

| File | Label | Windows 98 SE file | Installed by |
| --- | --- | --- | --- |
| `black-thatch.webp` | Black Thatch | `thatch2.bmp` (`WIN98_22.CAB`), 31 x 30, 1-bit | Windows (`shell.inf`) |
| `blue-rivets.webp` | Blue Rivets | `rivets2.bmp` (`WIN98_22.CAB`), 16 x 16, 4-bit | Windows (`shell.inf`) |
| `bubbles.webp` | Bubbles | `bubbles.bmp` (`WIN98_22.CAB`), 64 x 64, 4-bit | Windows (`shell.inf`) |
| `carved-stone.webp` | Carved Stone | `egypt.bmp` (`WIN98_22.CAB`), 32 x 32, 4-bit | Windows (`shell.inf`) |
| `circles.webp` | Circles | `circles.bmp` (`WIN98_22.CAB`), 32 x 32, 1-bit | Windows (`shell.inf`) |
| `clouds.webp` | Clouds | `clouds.bmp` (`WIN98_22.CAB`), 640 x 480, 8-bit | Desktop Wallpaper |
| `forest.webp` | Forest | `forest.bmp` (`WIN98_22.CAB`), 256 x 256, 8-bit | Desktop Wallpaper |
| `gold-weave.webp` | Gold Weave | `gator.bmp` (`WIN98_22.CAB`), 256 x 256, 4-bit | Desktop Wallpaper |
| `houndstooth.webp` | Houndstooth | `hounds.bmp` (`WIN98_22.CAB`), 27 x 25, 4-bit | Windows (`shell.inf`) |
| `metal-links.webp` | Metal Links | `mesh.bmp` (`WIN98_22.CAB`), 200 x 180, 8-bit | Desktop Wallpaper |
| `pinstripe.webp` | Pinstripe | `pstripe.bmp` (`WIN98_22.CAB`), 30 x 32, 4-bit | Windows (`shell.inf`) |
| `red-blocks.webp` | Red Blocks | `3dblocks.bmp` (`WIN98_22.CAB`), 54 x 96, 4-bit | Desktop Wallpaper |
| `sandstone.webp` | Sandstone | `sand.bmp` (`WIN98_22.CAB`), 256 x 256, 4-bit | Desktop Wallpaper |
| `setup.webp` | Setup | `setup.bmp` (`WIN98_22.CAB`), 640 x 480, 8-bit | Windows folder (`copy2.inf`) |
| `stitches.webp` | Stitches | `weave2.bmp` (`WIN98_22.CAB`), 96 x 96, 4-bit | Desktop Wallpaper |
| `straw-mat.webp` | Straw Mat | `bamboo.bmp` (`WIN98_22.CAB`), 30 x 32, 4-bit | Windows (`shell.inf`) |
| `tiles.webp` | Tiles | `redtile.bmp` (`WIN98_22.CAB`), 32 x 32, 4-bit | Windows (`shell.inf`) |
| `triangles.webp` | Triangles | `pyramid2.bmp` (`WIN98_22.CAB`), 16 x 16, 4-bit | Windows (`shell.inf`) |
| `waves.webp` | Waves | `halftone.bmp` (`WIN98_22.CAB`), 32 x 32, 1-bit | Windows (`shell.inf`) |

and the desktop patterns, which are no files in Windows: `shell.inf`'s
`[patterns.inis]` writes each as eight bytes to `control.ini [Patterns]`,
drawn here as an 8 x 8 tile, a 1 bit black and a 0 bit clear:

| File | Label | Rows (decimal, top to bottom) |
| --- | --- | --- |
| `pattern-bricks.webp` | Bricks Pattern | 187 95 174 93 186 117 234 245 |
| `pattern-buttons.webp` | Buttons Pattern | 170 125 198 71 198 127 190 85 |
| `pattern-cargo-net.webp` | Cargo Net Pattern | 120 49 19 135 225 200 140 30 |
| `pattern-circuits.webp` | Circuits Pattern | 82 41 132 66 148 41 66 132 |
| `pattern-cobblestones.webp` | Cobblestones Pattern | 40 68 146 171 214 108 56 16 |
| `pattern-colosseum.webp` | Colosseum Pattern | 130 1 1 1 171 85 170 85 |
| `pattern-daisies.webp` | Daisies Pattern | 30 140 216 253 191 27 49 120 |
| `pattern-dizzy.webp` | Dizzy Pattern | 62 7 225 7 62 112 195 112 |
| `pattern-field-effect.webp` | Field Effect Pattern | 86 89 166 154 101 149 106 169 |
| `pattern-key.webp` | Key Pattern | 254 2 250 138 186 162 190 128 |
| `pattern-live-wire.webp` | Live Wire Pattern | 239 239 14 254 254 254 224 239 |
| `pattern-plaid.webp` | Plaid Pattern | 240 240 240 240 170 85 170 85 |
| `pattern-rounder.webp` | Rounder Pattern | 215 147 40 215 40 147 213 215 |
| `pattern-scales.webp` | Scales Pattern | 225 42 37 146 85 152 62 247 |
| `pattern-stone.webp` | Stone Pattern | 174 77 239 255 8 77 174 77 |
| `pattern-thatches.webp` | Thatches Pattern | 248 116 34 71 143 23 34 113 |
| `pattern-tile.webp` | Tile Pattern | 69 130 1 0 1 130 69 170 |
| `pattern-triangles.webp` | Triangles Pattern | 135 7 6 4 0 247 231 199 |
| `pattern-waffles-revenge.webp` | Waffle's Revenge Pattern | 77 154 8 85 239 154 77 154 |

`src/screenSavers/`: the savers are ports of the CD's `.scr` files
(`bezier.scr` and `scrnsave.scr` in `WIN98_51.CAB`; `ssflywin.scr`,
`ssmarque.scr`, `ssmyst.scr`, `sspipes.scr` and `ssstars.scr` in
`WIN98_52.CAB`), their options and defaults read from each file's dialog,
string table and `control.ini` reader, their drawing from its timer
handler. Two take data from the CD:

| File | Windows 98 SE source | What it is |
| --- | --- | --- |
| `Pipes/pipes-texture.webp` | `sspipes.scr` resource 100/99, a 100 x 100 24-bit bitmap | 3D Pipes' own texture, red and white stripes, for Textured pipes |
| `FlyingWindows/wingdingsFlag.ts` | `wingding.ttf` (`WIN98_53.CAB`), glyph 225 (character 0xFF) | the Windows logo Flying Windows drew, the font's TrueType outline written as an SVG path; Wingdings is Microsoft's, designed by Charles Bigelow and Kris Holmes |

`src/assets/fonts/`: not Microsoft's. Windows 98's MS Sans Serif
(`sserife.fon`) is a bitmap font no browser loads; these are
[98.css](https://github.com/jdan/98.css)'s woff2 conversions (`fonts/converted`)
of its recreation by FontStruct user "lou", as copied, unchanged, by
wieslawsoltes/win98's `assets/`, renamed only. They are licensed
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), and their
readme and license files, which must accompany them, ship beside them:

| File | Face | Original | Notices |
| --- | --- | --- | --- |
| `PixelatedMSSansSerif-normal-normal.woff2` | `"Pixelated MS Sans Serif"`, normal | ["MS Sans Serif"](https://fontstruct.com/fontstructions/show/1384746) by lou (98.css `ms_sans_serif.woff2`) | `font-readme.txt`, `font-license.txt` |
| `PixelatedMSSansSerif-bold-normal.woff2` | `"Pixelated MS Sans Serif"`, bold | ["MS Sans Serif Bold"](https://fontstruct.com/fontstructions/show/1384862) by lou (98.css `ms_sans_serif_bold.woff2`) | `font-bold-readme.txt`, `font-bold-license.txt` |

## Developing

This package lives in the Classicy repository, at
`packages/appearance/windows98`. Its tests run against the workspace core's
source. Its build needs the core's built declarations, so build the core
first (the root `pnpm build:source` builds the core, Platinum, System 7 and
Windows 98, in order); `build` runs the package's dist check,
`bin/verify-dist.mjs`, after `vite build`:

```sh
pnpm --filter @classicy/appearance-windows98 exec vitest run
pnpm --filter @classicy/appearance-windows98 build
```

`pnpm build:audio` rebuilds the sound pack's sprite sheet from
`src/assets/sounds/windows98/sprites/` (Windows 98's WAVs, one per sprite,
named by its id).

`pnpm storybook` shows the package under **Appearance/Windows 98**: its
schemes and controls, and **Shell**, the Windows shell on a desktop (the
taskbar, the Start menu, the status area, window menu bars, maximized and
minimized windows, the system menu, message boxes, Shut Down, Run, Taskbar
Properties and a docked taskbar), each opened as a user would open it.

`pnpm preview` runs the example app, which loads this package beside
Platinum and System 7: choose Windows 98 in the Appearance control panel's
Packages tab to drive the shell with real apps. Its Demo app has a Quick
Launch button (`showInQuickLaunch`), its Demo Extension a status indicator
in the notification area (a `ClassicyMenuBarExtension`), and its desktop a
`userName`, so the Start menu offers Log Off Guest....

## License

The package's code and stylesheets are provided free and in the public
domain under [The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE).
Microsoft maintains the copyright on the Windows 95 and 98 icons, bitmaps,
cursors, sounds, wallpapers, screen savers, the Wingdings outline and the
interface the package reproduces (under "Asset
sources" above), which Classicy uses under the fair use doctrine, as it uses
Apple's Mac OS art under Platinum and System 7; they are not covered by the
Unlicense. The two
font faces in `src/assets/fonts/` are lou's FontStruct recreations of MS Sans
Serif, licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
(their readme and license files ship with them), not the Unlicense.
