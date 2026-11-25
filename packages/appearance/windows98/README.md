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
  the file name selected, and dialogs and alerts centered on whole pixels,
  so their one-pixel bevels and glyphs stay sharp.
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
    list, a shortcut's arrow overlay drawn over the whole icon with its
    label upright, ToolTips in place of balloon help, and the Appearance
    Manager and Control Strip under the same bevels;
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
  their desktop ToolTips; the Trash shows as the Recycle Bin and the
  startup disk as My Computer. Display only: their ids, records and saved
  state keep their own names.
- **Windows 98's cursors**, `USER.EXE`'s own, at their own hotspots: the
  arrow, the hourglass (Busy), the pointing hand (Link Select, the PDF
  viewer's pan tool), the I-beam and the cross (drawn black: every pixel of
  theirs inverted the screen, which a CSS cursor cannot), and the four
  two-way size arrows, which also stand in for the one-way ones Windows
  never had. The size grip shows the diagonal one, as Windows' did.
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
  knobs and color families, deep-frozen and typed with the core's types, as
  `Windows98Json`),
  `windows98SoundPack`, `WINDOWS98_SYSTEM_ART` (the system art it
  registers), `WINDOWS98_CURSORS` (its cursors by role, each with its
  hotspot), `WINDOWS98_APPS` and `WINDOWS98_DESKTOP_ICONS` (its `apps` and
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

- **Mac structure, Windows dress.** Classicy's behavior is shared by every
  package: the menu bar stays at the top of the screen, the collapse box
  window-shades (it is drawn as Minimize), the zoom box is drawn as Maximize
  (Restore while the window is zoomed), and the desktop keeps its icons. There is no taskbar and no Start menu.
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
  bevels, the title-bar buttons' marks and the controls, and the woff2
  files of the `"Pixelated MS Sans Serif"` face the package ships (lou's
  FontStruct recreation of MS Sans Serif, under "Asset sources").
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
