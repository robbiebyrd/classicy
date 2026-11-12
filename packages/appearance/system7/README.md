# @classicy/appearance-system7

System 7, the classic Mac OS look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). It draws System 7.5 in
black and white and in color, with System 7.5's own icons, art, cursors,
desktop pattern and alert sounds.

The core, `@classicy/classicy`, registers no Appearance Package. Without one,
`ClassicyDesktop` shows a message telling you to load one instead of the
desktop. Import this package once, at your app's entry, to register System 7:

```ts
import "@classicy/appearance-system7";
```

`@classicy/classicy` is a peer dependency. Install both, at the same version:

```sh
pnpm add @classicy/classicy @classicy/appearance-system7
```

A host may load System 7 alone or beside Platinum
(`@classicy/appearance-platinum`); the Appearance Manager switches between
them. A host that loads both installs all three packages at
one version and bumps them together (see "Beside Platinum", below). The
package ships its type declarations (`bundler`, `node16` and `nodenext`
resolution).

## What it ships

- **Two themes.** **System 7** (id `system7`, the package's defaults): every
  color black or white, drawing the package's `bw` asset variant (the 1-bit
  icons and art), with dimmed text and controls dithered through a 50%
  checker. **System 7 Color** (id `system7-color`): the Standard window
  colors, lavender frames and true grays, read from System 7.5's `wctb` and
  `cctb` color tables, drawing the color assets, with dimmed text in plain
  gray.
- **Its layout.** The grow box at the bottom right, the menu bar on the
  screen (20 px high), desktop icons from the top right.
- **Its look**, one stylesheet in the package layer:
  - windows: the frame and drop shadow, the racing stripes, the close, zoom
    and size boxes (no collapse box: System 7 had none), inactive windows,
    the floating window's title bar, the Finder's window header and the
    standalone frame;
  - menus: the white menu bar under the screen's rounded corners, pull-down,
    hierarchical and pop-up menus with inverted highlights, dimmed items and
    dotted or gray dividers, checkmarks, and the blink of a chosen item;
  - dialogs: the modal double frame (no title bar on a fixed modal, the
    striped bar on a movable one), alerts on the HIG's grid, and push
    buttons with the default ring;
  - controls, black on white in both themes: checkboxes, radio buttons,
    little arrows, sliders, outline triangles, text fields, scrolling lists
    with an inverted selection, dotted group boxes and separators, the
    progress bar, and flat bevel buttons, placards and image wells;
  - scroll bars: arrows at both ends, the 25% dotted track, the fixed square
    scroll box (with grip ridges in color), hollow arrows when there is
    nothing to scroll, the outline alone in an inactive window, and the
    dotted outline a dragged box leaves in place, scrolling on release;
  - the desktop: icons with opaque Geneva labels that invert when selected,
    the desktop pattern, the startup screen, the Control Strip in the 7.5
    Control Strip panel's own art, and the Appearance Manager's panel.
- **Icons, system art and cursors** from System 7.5: 62 icons exported, in
  color and in 1-bit, at 32 and 16 px where System 7 had both, every system
  art key and every cursor role, so a host that loads System 7 alone draws no
  blank art. Where System 7 had no icon for something, the key reuses the
  System 7 generic it would have shown (the generic document, application,
  folder or extension); Classicy's own glyphs and brands keep the core's
  images.
- **Wallpapers.** System 7.5's default desktop pattern (System `ppat` 16, a
  50% checkerboard) as "Gray" (#666666 and #AAAAAA) and "Gray (Black &
  White)", each theme's desktop picture.
- **A sound pack**, `system7`: System 7.5's alert sounds, Droplet, Indigo,
  Quack, Simple Beep (the default), Sosumi and Wild Eep. System 7 had no
  interface feedback sounds, so the package's hooks play none.
- **The screen savers.** The twelve After Dark savers Platinum ships, offered
  under System 7 too, Bouncing Ball by default.
- **Fonts.** Chicago (ChicagoFLF), Geneva (regular, bold and italic) and
  Monaco: byte-identical copies of the vector faces Platinum ships.

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers System 7, its fonts, its assets, its sound pack and the screen
  savers. It also exports `SYSTEM7_APPEARANCE_PACKAGE_ID`, `system7Json`
  (the themes, layout and knobs, deep-frozen and typed with the core's types,
  as `System7Json`), `system7SoundPack` and `system7AppearanceHooks`. It
  exports no saver component and no logo registry: import those from
  `@classicy/appearance-platinum` if you need them.
- `./scss/*`: the package's SCSS. `system7.scss` ships compiled and is not
  for host compilation: it loads the savers' stylesheets from Platinum's
  source, which neither package's tarball holds.
- `./classicy-system7.css` and `./classicy-system7.fonts.css`: the look and
  the fonts as stylesheets, for hosts whose Content-Security-Policy blocks
  inline `<style>` (below).

The fonts, the art, the wallpapers, the saver art and the sound sheet are
files in `dist/assets/`, loaded as `new URL("assets/…", import.meta.url)`. A
Vite host keeps the packages out of the dev server's dependency pre-bundle,
which would break those URLs:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@classicy/classicy", "@classicy/appearance-system7"],
  },
})
```

List `@classicy/appearance-platinum` there too when the host loads it.

## Strict CSP

The package injects its look as `<style id="classicy-appearance-system7">`
and its fonts as `<style id="classicy-fonts-system7">`. Under a policy that
blocks inline `<style>`, link the three stylesheets first in `<head>`, in this
order: the core's, then this package's two.

```html
<link rel="stylesheet" href="/node_modules/@classicy/classicy/dist/classicy.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-system7/dist/classicy-system7.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-system7/dist/classicy-system7.fonts.css">
```

Serve this package's `dist/assets/` beside them, and allow it in `font-src`.
A host that loads Platinum too links Platinum's two stylesheets as well
(its README).

Link the files rather than importing `classicy-system7.fonts.css` through
your own bundler: Vite inlines the small Monaco font as a `data:` URL, which
`font-src 'self'` blocks. Linking (copied, or served from `node_modules`) is
recommended; otherwise set `build.assetsInlineLimit: 0` or allow
`font-src data:`.

## Beside Platinum

Both packages register the same twelve screen savers from one module, which
offers each under `platinum` and `system7`, and share one registry of Logo
saver images. Install the core and both packages at the same version.
**Mixing versions of the two Appearance Packages is unsupported**: with an
older Platinum the savers can end up offered under `platinum` only, or the
Logo saver's image registries diverge, so a logo registered through
Platinum's `registerClassicyScreenSaverLogo` may never show.

## Design notes

- **Tabs.** System 7.5 had no tab control (tabs came with Mac OS 8), so the
  package's tabs are invented from System 7's own vocabulary: 1 px black
  lines on a white face, in both themes, the chosen tab opening into the
  panel. No original exists to copy.
- **The Platinum boundary.** The package reaches the core only as
  `@classicy/classicy`. The saver source stays in Platinum, and System 7
  bundles exactly two of its files: the saver registration module
  (`screenSavers/platinumScreenSavers.ts`, from `src/index.ts`) and its
  stylesheet index (`screenSavers/_platinumScreenSavers.scss`, from
  `src/styles/_screenSavers.scss`). `System7SourceImports.test.ts` pins both.
  System 7's sheet ends with its own reduced-motion pause rule for the
  savers, as Platinum's does.

## Where the assets come from

Every icon, piece of art, cursor, the desktop pattern and the alert sounds
were extracted from a Mac OS 7.5.5 install, read straight from its resource
forks with no emulator: `bin/export-assets.mjs` and
`bin/export-pixel-art.mjs` decode the raw resources (exported by
resource_dasm) into the committed PNGs and WAVs, and rewrite the same bytes
on a rerun. Simple Beep, which System 7 plays from its square-wave
synthesizer, is rendered from the resource's own commands. The commands,
and each file's source resource, are in
[`docs/system7-asset-inventory.md`](../../../docs/system7-asset-inventory.md)
in the repository.

## Developing

This package lives in the Classicy repository, at
`packages/appearance/system7`. Its tests run against the workspace core's
source. Its build needs the core's built declarations, so build the core
first (the root `pnpm build:source` builds the core, Platinum and System 7,
in order); `build` runs the package's dist check, `bin/verify-dist.mjs`,
after `vite build`:

```sh
pnpm --filter @classicy/appearance-system7 exec vitest run
pnpm --filter @classicy/appearance-system7 build
```

`pnpm build:audio` rebuilds the sound pack's sprite sheet from
`src/assets/sounds/system7/sprites/`.

## License

This software is provided free and in the public domain under
[The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE). Apple
maintains the copyright on the icons, art, cursors, desktop pattern, sounds
and interface components System 7 reproduces.
