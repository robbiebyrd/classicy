# @classicy/appearance-windows98

Windows 95 and 98, the classic Windows look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). It draws Windows 98's
chrome on Classicy's Mac OS structure, the way a Kaleidoscope scheme once
dressed a Mac as a PC: gradient title bars with Minimize, Maximize and Close
at the right, two-pixel bevels from the system colors, dithered scroll-bar
tracks with an arrow at each end, raised menus and rectangular controls, in
every color scheme of Windows 98's Display control panel, High Contrast
included.

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
  GrayText, the scroll bar's and the window borders' are the package's own
  color families, editable in the Colors tab beside the palette, and its
  fonts the package's own font rows in the Fonts tab (Times New Roman in
  Eggplant's and Rose's captions and menus, Arial in Brick's caption and
  Lilac's, larger faces in the large schemes).
- **Its layout.** The grow box at the bottom right, the menu bar on the
  screen, menus that stay open until the next click, cascading menus that
  open and close on Windows' 400 ms time-out (a contextual menu's on hover
  too), Windows' menu keyboard (the arrow keys through the menus and across
  the menu bar, Home and End, Return and Space, a letter jumping to its
  item, Escape a level at a time, an open contextual menu included; the
  Mac packages' menus take Return alone), stopping on dimmed items as
  Windows' does, Shift+F10 and the Application key opening the focused
  item's contextual menu, Finder's item menus leading with Open, their
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
  period runs nothing, an empty submenu showing a dimmed
  "(Empty)", desktop icons from the top left, as Windows laid them, a
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
  comes up; a list, a table, the Finder's list view and a tree select a row
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
- **Its look**, one stylesheet in the package layer:
  - windows: the four-ring frame, the title bar's gradient with the window's
    icon and bold title at the left and the Minimize (Classicy's collapse),
    Maximize (zoom; Restore while the window is zoomed) and Close buttons at
    the right, the gray inactive bar, the sunken client edge, the size grip,
    the three-ring fixed frame with no sizing border on dialogs and on any
    window that cannot be sized (the control panels, the About windows, the
    Calculator), dialogs on a flat face with the title and Close alone in
    their caption (no icon, no Minimize), palette windows with Close alone,
    a modeless dialog's frame flattened to a plain ButtonFace box;
  - the Finder's icon view: a label being renamed in the list view's edit
    box (WindowText on white in a one-pixel black border; a name renamed in
    the details view or on the desktop alike), a drag across
    empty space (in the list view too, and on the desktop, over its icons)
    drawing the dotted selection rectangle inverted over what lies under it,
    as Windows XORed it, nothing drawn until the pointer moves, and
    the dotted focus rectangle on the focused icon's label alone (in icon
    views and on the desktop), never around every selected label;
  - menus: the flat menu bar, raised pull-down and contextual menus with an
    inverted highlight and embossed dimmed items (one item highlighted at a
    time: the keyboard's, while the arrow keys moved it last, the
    pointer's otherwise), etched separators, the access key's letter
    underlined in every title and item (in a control's label, a push
    button and a tab too), the
    default item (the command a double-click runs: Open, first in every
    Finder item's and desktop icon's menu) in
    bold and a round bullet at the chosen item of an option group (the
    Finder's View as Icons and View as List), where the Mac packages draw a
    check;
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
    list, ToolTips in place of balloon help, and the Appearance Manager
    and Control Strip under the same bevels;
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
- **A sound pack**, `windows98`: four alert tones, Chimes, Chord, Ding (the
  default) and Exclamation, named after the roles Windows gave its sounds
  but synthesized for the package (Windows' own sounds are Microsoft's), plus
  the beep. The package plays no interface feedback.
- **No fonts.** MS Sans Serif is Microsoft's, so the themes name a stack a
  host may satisfy: `"Pixelated MS Sans Serif"` first (the face 98.css
  ships, if the host loads it, cut for 11 px and so named only there), then
  MS Sans Serif, Microsoft Sans Serif, Tahoma and Arial; Arial and Times New
  Roman where a scheme names them; Fixedsys, Lucida Console or Courier New
  for monospaced text.
- **No art, icons, cursors, wallpapers or screen savers of its own.** Every
  glyph is drawn from theme tokens in the stylesheet. Icons, cursors and
  system art resolve to the default package's (Platinum's, when it is
  loaded, else the core's icon tree), and the Screen Saver control panel
  reads "This appearance has no screen savers."

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers Windows 98 and its sound pack. It also exports
  `WINDOWS98_APPEARANCE_PACKAGE_ID`, `windows98Json` (the themes, layout,
  knobs, color families and font labels, deep-frozen and typed with the
  core's types, as `Windows98Json`), `windows98SoundPack` and
  `readWindows98ThemeFile` (the `.theme` reader Load Theme… uses).
- `./scss/*`: the package's SCSS: `bevels`, `pixel` and the `components/*`
  partials, and `windows98`, the whole sheet, which a host may compile
  through `pkg:@classicy/classicy/scss/*` (the package loads nothing of
  another package's).
- `./classicy-windows98.css`: the look as a stylesheet, for hosts whose
  Content-Security-Policy blocks inline `<style>` (below).

The art and the sound sheet are files in `dist/assets/`, loaded as
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

The package injects its look as `<style id="classicy-appearance-windows98">`.
Under a policy that blocks inline `<style>`, link the stylesheets first in
`<head>`, in this order: the core's, then this package's.

```html
<link rel="stylesheet" href="/node_modules/@classicy/classicy/dist/classicy.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-windows98/dist/classicy-windows98.css">
```

Serve this package's `dist/assets/` beside them. Allow `data:` in `img-src`
as well: a dimmed icon (a hidden application's in the Application menu) is
drawn on a canvas and shown from a `data:` URL.

## Design notes

- **Mac structure, Windows dress.** Classicy's behavior is shared by every
  package: the menu bar stays at the top of the screen, the collapse box
  window-shades (it is drawn as Minimize), the zoom box is drawn as Maximize
  (Restore while the window is zoomed), and the desktop keeps its icons. There is no taskbar and no Start menu.
- **Every pixel from a token.** The title-bar buttons' marks, the scroll
  arrows, the checkmark, the radio ring, the pop-up and menu arrows and the
  slider's thumb are one-pixel rectangles placed on a grid
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
  bevels, the title-bar buttons' marks and the controls, and the
  `"Pixelated MS Sans Serif"` face the themes name first.
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
`src/assets/sounds/windows98/sprites/`.

## License

This software is provided free and in the public domain under
[The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE). Microsoft
maintains the copyright on the interface Windows 95 and 98 drew; nothing of
Microsoft's (no font, icon, sound or image) is included.
