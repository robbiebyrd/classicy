# @classicy/appearance-windows98

Windows 95 and 98, the classic Windows look and shell, as an Appearance
Package for [Classicy](https://github.com/robbiebyrd/classicy). In place of
the Mac OS menu bar and Control Strip it gives the desktop Windows' own
shell: a taskbar along the bottom of the screen with the Start button, a
button for each open window and the clock, and a menu bar in each window.
It draws Windows 98's chrome: gradient title bars with Minimize, Maximize
and Close at the right, two-pixel bevels from the system colors, dithered
scroll-bar tracks with an arrow at each end, raised menus and rectangular
controls, in Windows 98's own color scheme and the sixteen classic schemes
of its Display control panel.

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

- **Eighteen themes.** **Windows Standard** (id `windows98`, the package's
  defaults): the Windows 98 scheme, navy title bars shading to light blue,
  the `#C0C0C0` face and the teal desktop. **Windows 95** (id `windows95`):
  the same palette with flat navy title bars, as Windows 95 drew them. And
  the classic schemes, each from the `[Control Panel\Colors]` block of its
  Windows theme file: Brick, Desert, Eggplant, Lilac, Maple, Marine (high
  color), Plum (high color), Pumpkin (large), Rainy Day, Red, White, and
  Blue (VGA), Rose, Slate, Spruce, Storm (VGA), Teal (VGA) and Wheat (ids
  `windows98Brick` and so on). Every scheme is a recoloring of one
  stylesheet: the title-bar colors, the selected text's, the ToolTip's, the
  desktop labels' and the Start menu banner's are the package's own color
  families, editable in the Colors tab beside the palette.
- **The Windows shell.** No menu bar crosses the top of the screen: each
  window has its own, under its title bar, ending with a Help menu that
  holds Classicy's help commands, the application's own and, last, "About"
  and the application's name. A taskbar runs along the bottom of the
  screen, and windows, cleaned-up desktop icons and menus stay above it:
  - **Start**, at its left, opens the Start menu (so does CTRL+ESC, where
    the browser lets the key through): About This Computer; Programs, the
    applications in the Applications folder; Settings, holding Control
    Panel (the control panels) and Show Balloons or Hide Balloons; Help;
    then Empty Trash… and Reset PRAM…, where Windows has Shut Down. Its
    banner reads "Windows 98" under every scheme.
  - **A button for each open window** (not for dialogs or palettes), in
    the order the windows opened, the active window's pressed. Clicking a
    button activates its window, minimizes it when it is already active,
    and restores it when it is minimized; right-clicking it opens the
    window's pop-up menu; a title cut short shows whole in a tooltip; and
    a file dragged from a folder and held over a button brings its window
    up for the drop.
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
  - **Right-click the taskbar** for Minimize All Windows (then Undo
    Minimize All) and Properties, which opens the Control Strip control
    panel; right-click the clock for Adjust Date/Time first.

  The Minimize button sends a window to its taskbar button, and the next
  window on screen takes the focus; an application's palettes leave the
  screen with its last window and come back with it.
- **Its layout.** The grow box at the bottom right, desktop icons from the
  top left, as Windows laid them, a window's scroll bars kept where its
  content fits, and the Open and Save
  boxes as titled, movable dialogs showing one folder at a time under a
  pop-up that runs the path upward (Windows' Look in), Save As opening with
  the file name selected, dialogs and alerts centered on whole pixels,
  so their one-pixel bevels and glyphs stay sharp, and windows that
  maximize: the Maximize button fills the screen above the taskbar with
  the window's frame off the screen, the maximized window neither moves nor
  sizes and shows no size grip, Restore returns it to the size and place it
  had (after a reload too), and a double-click on the caption maximizes or
  restores it, as Windows 98 did (palettes, which have no Maximize button,
  do neither), a window that can be minimized but not maximized (the
  Calculator) shows its Maximize button dimmed beside its Minimize, as
  Windows 98 shows the two as a pair, and a window minimized while
  maximized offers Maximize as well as Restore in its pop-up menu, and
  windows that size from their frame: dragging any edge of
  a resizable window's frame sizes it from that edge, and dragging near a
  corner (within a caption's height of it, along either edge) sizes it from
  both of the corner's edges, as Windows 98's sizing border does, while a
  dialog's or other fixed window's frame does nothing, and every window has
  its pop-up (system) menu: right-click anywhere in its title bar or its
  taskbar button, press its icon or press ALT+SPACE for Restore, Move,
  Size, Minimize, Maximize and Close (Move and Close on a dialog, Move, Size and Close on a palette),
  each dimmed when it cannot apply, Close in bold with ALT+F4; the arrow
  keys walk the menu and ESC closes it, Move and Size move and size the
  window with the arrow keys until ENTER (ESC puts it back), and a
  double-click on the icon or ALT+F4 closes the window. A browser on a
  Windows computer keeps ALT+F4 and ALT+SPACE for itself; on a Mac they are
  Option+F4 and Option+Space. Each caption button names itself (Minimize,
  Maximize or Restore, Close) in a tooltip when the pointer rests on it, as
  Windows 98 did. Every dialog and message box has a title (its
  application's name when it has none of its own; an About box reads
  "About" and the name) and a Close button, which cancels it (a message box
  with only an OK takes OK), and moves by its caption, error messages
  included; a Yes/No question, which has no Cancel, shows its Close dimmed,
  and ALT+F4 leaves it open, as Windows' message boxes do.
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
    palette windows with Close alone,
    a modeless dialog's frame flattened to a plain ButtonFace box;
  - menus: each window's menu bar a flat 20-pixel band under its title bar,
    as Windows 98 draws one, its titles plain under the pointer and sunken
    while their menu is open or the keyboard is on them, an unavailable
    title embossed; raised pull-down and contextual menus with an
    inverted highlight and embossed dimmed items, etched separators, the
    default item (the command a double-click runs: the Trash icon's Open) in
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
    active window's pushed in over a checkered face with its title in bold;
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
    boxes, trackbar sliders, raised placards and bevel buttons, and image
    wells that mark their set value with a solid border, the text color
    outside the button highlight, inside the sunken edge;
  - scroll bars: an arrow at each end on a checkered track, a raised scroll
    box, the paged side of the track inverted while the mouse holds it, an
    arrow embossed (disabled) at the end of its travel (the up arrow at the
    top of a document, the down arrow at its bottom), the bars kept in an
    inactive window and drawn, disabled, where the content fits;
  - the desktop: icons with plain labels that take the highlight when
    selected, a selected icon blended with a 50% dither of the highlight
    (as Explorer drew it) on the desktop, in icon views and in the Finder's
    list, ToolTips in place of balloon help, and the Appearance Manager
    under the same bevels;
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
  height, which a larger UI font raises on its own) and of tabs; and the
  desktop labels' text-shadow offset (1 px; 0 removes the shadow, which
  stock Windows 98 drew only with the Active Desktop).
- **A sound pack**, `windows98`: four alert tones, Chimes, Chord, Ding (the
  default) and Exclamation, named after the roles Windows gave its sounds
  but synthesized for the package (Windows' own sounds are Microsoft's), plus
  the beep. The package plays no interface feedback.
- **No fonts.** MS Sans Serif is Microsoft's, so the themes name a stack a
  host may satisfy: `"Pixelated MS Sans Serif"` first (the face 98.css
  ships, if the host loads it), then Microsoft Sans Serif, Tahoma and Arial,
  at 11 px; Fixedsys, Lucida Console or Courier New for monospaced text.
- **No art, icons, cursors, wallpapers or screen savers of its own.** Every
  glyph is drawn from theme tokens in the stylesheet. Icons, cursors and
  system art resolve to the default package's (Platinum's, when it is
  loaded, else the core's icon tree), and the Screen Saver control panel
  reads "This appearance has no screen savers."

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers Windows 98 and its sound pack. It also exports
  `WINDOWS98_APPEARANCE_PACKAGE_ID`, `windows98Json` (the themes, layout,
  knobs and color families, deep-frozen and typed with the core's types, as
  `Windows98Json`) and `windows98SoundPack`.
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
- **Every pixel from a token.** The title-bar buttons' marks, the scroll
  arrows, the checkmark, the radio ring, the pop-up and menu arrows and the
  slider's thumb are one-pixel rectangles placed on a grid
  (`--pixel-unit`), inked in theme tokens, so each color scheme draws them
  in its own colors; the scroll track's checker is a two-color
  `repeating-conic-gradient` of the face and highlight tokens.
- **Where the schemes come from.** The sixteen classic schemes' values are
  the `[Control Panel\Colors]` blocks of the classic Windows theme files
  (ButtonFace, ButtonShadow, ActiveTitle, GradientActiveTitle, Hilight, …),
  mapped onto Classicy's palette: ButtonHilight, ButtonLight, ButtonFace,
  ButtonShadow and ButtonDkShadow are `system` 1, 2, 3, 5 and 7, Window the
  document color, Hilight the highlight, Background the desktop color, and
  the title-bar, HilightText and InfoWindow colors the package's color
  families.

## References and resources

The look was checked against these; keep them at hand for later work on the
package.

- [98.css](https://jdan.github.io/98.css/) (jdan): the CSS recipes for the
  bevels, the title-bar buttons' marks and the controls, and the
  `"Pixelated MS Sans Serif"` face the themes name first.
- [os-gui](https://os-gui.js.org) (1j01): Windows 98's menus, windows and
  the classic color schemes' `.theme` files (`[Control Panel\Colors]`),
  which the sixteen schemes here are read from.
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
