# @classicy/appearance-windows98

Windows 95 and 98, the classic Windows look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). It draws Windows 98's
chrome on Classicy's Mac OS structure, the way a Kaleidoscope scheme once
dressed a Mac as a PC: gradient title bars with Minimize, Maximize and Close
at the right, two-pixel bevels from the system colors, dithered scroll-bar
tracks with an arrow at each end, raised menus and rectangular controls, in
Windows 98's own color scheme and the sixteen classic schemes of its Display
control panel.

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
  stylesheet: the title-bar colors, the selected text's, the ToolTip's and
  the desktop labels' are the package's own color families, editable in the
  Colors tab beside the palette.
- **Its layout.** The grow box at the bottom right, the menu bar on the
  screen, desktop icons from the top left, as Windows laid them, a
  window's scroll bars kept where its content fits, and the Open and Save
  boxes as titled, movable dialogs showing one folder at a time under a
  pop-up that runs the path upward (Windows' Look in), Save As opening with
  the file name selected, dialogs and alerts centered on whole pixels,
  so their one-pixel bevels and glyphs stay sharp, and windows that
  maximize: the Maximize button fills the screen below the menu bar with
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
  its pop-up (system) menu: right-click anywhere in its title bar, press its
  icon or press ALT+SPACE for Restore, Move, Size, Minimize, Maximize and
  Close (Move and Close on a dialog, Move, Size and Close on a palette),
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
  - menus: the flat menu bar, raised pull-down and contextual menus with an
    inverted highlight and embossed dimmed items, etched separators, the
    default item (the command a double-click runs: the Trash icon's Open) in
    bold and a round bullet at the chosen item of an option group (the
    Finder's View as Icons and View as List), where the Mac packages draw a
    check;
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
    and Control Strip under the same bevels;
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
