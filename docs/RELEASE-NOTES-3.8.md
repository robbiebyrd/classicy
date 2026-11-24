# Release notes: 3.8

A third Appearance Package, Windows 98, ships beside Platinum and System 7.
These notes list every change a host can see, measured from 3.7.x, with the
step each change needs. The API is described in
[`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) (§8 "Theming" and its "Windows 98"
section).

## Summary

`@classicy/appearance-windows98` draws Windows 95 and 98 on Classicy's
structure: gradient title bars with Minimize, Maximize and Close at the
right, two-pixel bevels from the system colors, checkered scroll-bar tracks
with an arrow at each end, raised menus and rectangular controls, in
"Windows Standard", "Windows 95" and the sixteen classic color schemes of
Windows 98's Display control panel. It is a stylesheet, themes and a sound
pack: it registers no fonts, art, icons, cursors, wallpapers or screen savers,
so it is also the worked example of an Appearance Package that draws every
glyph from theme tokens. The core is unchanged; a host that does not load the
package sees nothing new.

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

It registers eighteen themes: **Windows Standard** (id `windows98`, the
package's defaults: the Windows 98 scheme, navy title bars shading to light
blue over the `#C0C0C0` face and the teal desktop), **Windows 95** (id
`windows95`: the same palette with flat title bars) and the classic schemes
Brick, Desert, Eggplant, Lilac, Maple, Marine (high color), Plum (high
color), Pumpkin (large), Rainy Day, Red, White, and Blue (VGA), Rose, Slate,
Spruce, Storm (VGA), Teal (VGA) and Wheat (ids `windows98Brick` and so on),
each from the `[Control Panel\Colors]` block of its Windows theme file. The
title-bar colors, the selected text's, the ToolTip's and the desktop labels'
are the package's own color families, editable in the Appearance Manager's
Colors tab; the title-bar buttons' size and the progress bar's blocks are its
knobs, in the Options tab.

- **Layout.** The grow box at the bottom right, the menu bar on the screen,
  desktop icons from the top left.
- **Fonts.** None: MS Sans Serif is Microsoft's. The themes name a stack,
  `"Pixelated MS Sans Serif"` (the face 98.css ships, when a host loads it),
  then Microsoft Sans Serif, Tahoma and Arial, at 11 px; Fixedsys, Lucida
  Console or Courier New for monospaced text.
- **Art.** None of its own. Icons, cursors and system art resolve to the
  default package's (Platinum's when it is loaded, else the core's icon
  tree); the Screen Saver control panel reads "This appearance has no screen
  savers." Every glyph the look needs is drawn in the stylesheet.
- **Sound.** One pack, `windows98`: a beep and four alert tones (Chimes,
  Chord, Ding, the default, and Exclamation), synthesized for the package.
  No interface feedback sounds.
- **Strict CSP.** Link `@classicy/appearance-windows98/classicy-windows98.css`
  after the core's stylesheet. There is no fonts stylesheet.
- **Vite.** Add `@classicy/appearance-windows98` to `optimizeDeps.exclude`
  when you load it, as for the other packages.

The package's README, `packages/appearance/windows98/README.md`, has its
exports (`WINDOWS98_APPEARANCE_PACKAGE_ID`, `windows98Json`,
`windows98SoundPack`) and its SCSS (`@classicy/appearance-windows98/scss/*`).

## New in the core

Two additive hooks the Windows 98 look needed; neither changes what Platinum
or System 7 draw, and a package that reads neither sees nothing new.

- **The paged side of a scroll-bar track.** While a `ClassicyScrollArea`
  track is held and paging, the track carries `--classicy-scroll-page-start`
  and `--classicy-scroll-page-length`: the stretch between the thumb and the
  arrow on the pointer's side, from the track's start, following the thumb
  as it pages and removed when the thumb reaches the pointer or the button
  comes up. Windows 98 inverts that side alone (Windows' `PatBlt` inversion
  while paging); Mac OS inverts nothing, so Platinum and System 7 read it
  not at all.
- **The Finder list's icon as a mask.** Each row of `ClassicyFileBrowser`'s
  list view (`classicyFileBrowserViewTableRowContainer`) carries
  `--classicy-icon-mask`, `url("…")` of the row's icon, as `ClassicyIcon`
  and the desktop icons already publish theirs, so a package can draw a
  selected icon through its own shape (Windows 98's 50% highlight dither).
  The `<img>` itself is unchanged.

## Upgrade

1. Upgrading from 3.7.x, bump every Classicy package you load together to
   3.8.0. To use Windows 98, add `@classicy/appearance-windows98` at 3.8.0 and
   import it at your entry; keep every Classicy package at one version.
2. With a Vite dev server, add `@classicy/appearance-windows98` to
   `optimizeDeps.exclude` when you load it. Under a strict CSP, link its
   stylesheet after the core's.
3. Nothing else changes: the core, Platinum and System 7 draw as 3.7 did.
