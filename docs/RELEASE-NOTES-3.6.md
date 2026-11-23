# Release notes: 3.6

The three packages are smaller, PDFs render on every supported browser (no
release from 0.71.6 through 3.5.0, every 3.x release among them, drew a PDF
page on the browsers at Classicy's floor), and the Trash folder's icon
follows the active Appearance Package. These notes list every change a host
can see, measured from 3.5.x, with the step each change needs; a host on an
earlier 3.x reads each version's notes in turn, and the PDF fix applies to it
too. The API is described in [`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) (§1
"Installation & Setup", §5 "Asset registries", §10 "Sound").

## Summary

Most of what the packages shipped was never used by a browser: third-party
source text in the source maps, two audio formats no supported browser plays,
declaration maps pointing at files the tarballs do not hold, and the pdf.js
worker embedded uncompressed in both core bundles. 3.6 drops or compresses
each of them and stores the Appearance Packages' images as WebP. Nothing a
host imports changed: no export was added, removed or renamed, every saved
desktop, theme and theme file loads as before, and Platinum draws pixel for
pixel as it did. Two fixes ride along: pdf.js's modern build, which every
release from 0.71.6 through 3.5.0 bundled (every 1.x, 2.x and 3.x release
among them), drew no PDF page on the browsers at Classicy's floor, and the
Trash folder kept the art of whichever package was active when it was first
made.

## Sizes

> **To be measured** (plan 0019-fb7 §7.2): `npm pack --dry-run --json` for
> each package at 3.5.0 and at 3.6.0. No figure below is filled in yet.

| Package | Unpacked, 3.5.0 | Unpacked, 3.6.0 | Tarball, 3.5.0 | Tarball, 3.6.0 |
|---|---|---|---|---|
| `@classicy/classicy` | _7.2_ | _7.2_ | _7.2_ | _7.2_ |
| `@classicy/appearance-platinum` | _7.2_ | _7.2_ | _7.2_ | _7.2_ |
| `@classicy/appearance-system7` | _7.2_ | _7.2_ | _7.2_ | _7.2_ |
| **Total** | _7.2_ | _7.2_ | _7.2_ | _7.2_ |

By the design's measurements, most of the saving is, in the core, the
third-party text in its maps and the uncompressed worker; in Platinum, the
mp3 and ac3 sprites and zod's text in its maps; in System 7, zod's text in
its maps and its mp3 and ac3 sprites.

## Sound sprites ship as ogg and m4a only

Each sound pack's sprite sheet was four files, `ogg`, `m4a`, `mp3` and `ac3`,
in that order in the pack's `src`. Howler plays the first file the browser
can, and every supported browser plays the ogg or the m4a (ogg in Chrome,
Edge and Firefox, m4a in Safari), so none ever reached the mp3 or the ac3.
They are gone: Platinum ships `platinum.ogg` and `platinum.m4a`, System 7
`system7.ogg` and `system7.m4a`, each byte for byte the 3.5 file, with every
sprite's offset unchanged. No browser plays a different file or a different
sound.

`platinumSoundPack.src` and `system7SoundPack.src` now list two URLs, and
each pack's JSON (`platinum.json`, `system7.json`) its two files.

**Who must act:** a host that loaded `platinum.mp3`, `platinum.ac3`,
`system7.mp3` or `system7.ac3` from a package's `dist/assets/` by path loses
it; load the `.ogg` or `.m4a` beside it. Neither package's `exports` ever
exposed `dist/assets/`, so no bundler import breaks.

## Source maps carry Classicy's own text only

Every published map (the core's `classicy.es.js.map`, `classicy.umd.js.map`
and its lazy chunks' maps, and each Appearance Package's
`appearance-*.{es,umd}.js.map`) keeps the source text of Classicy's own
modules. A bundled third-party module (zod, pdf.js and the core's other
bundled dependencies) and an embedded image, sound or font now keep their
entry in `sources`, their names and their mappings, but no text
(`sourcesContent` is `null` for them), and each vendor source is listed in
the map's `x_google_ignoreList`.

What a host notices: a stack trace, an error reporter or DevTools still
names the vendor file and line, and DevTools steps over vendor frames, but
opening a vendor source in DevTools shows no text. Classicy's own sources
(`src/` in each package) show theirs as before. A host that needs a
dependency's text reads it from that dependency's own package.

## No declaration maps

`dist/types` in each package holds no `.d.ts.map`. They pointed at `.ts`
files no tarball holds, except the core's `src/Appearance` (shipped for its
SCSS export), so Go to Definition lands on the `.d.ts` as it did, and only
Go to Source Definition into those `src/Appearance` files is lost. The
declarations themselves are unchanged.

## WebP images, same wallpaper names

The Appearance Packages' raster images are WebP: Platinum's art and
wallpapers, and System 7's art, icons and wallpapers. So is the core's About
This Computer Earth picture (icon key `classicy.bg`), which both core bundles
embed. Every image is lossless (the color under fully transparent pixels
kept), with two exceptions: Platinum's photo wallpaper "Default Photo"
(`default.jpg`, already a JPEG) is lossy WebP at quality 90, kept above a
45 dB PSNR floor over white and over black; and the Earth picture, a 16-bit
PNG, is held at 8 bits a channel, as browsers drew it. The two PNGs browsers
color-managed (Platinum's Sad Mac and the Earth picture, which carried gamma
and chromaticity but no sRGB tag) became WebPs carrying the equivalent ICC
profile, so they draw as before. Measured in Chromium and Firefox, each
browser against its own drawing of the original, every other image draws
pixel-identical; Safari was not measured.

Unchanged: the cursors (PNG, the format every browser takes for a CSS
`cursor`), the SVG art, Platinum's alias badge (`art/alias.png`, whose
translucent pixels Chromium draws one level darker from a WebP), and the
core's other icons and samples.

**Wallpapers keep their names.** A wallpaper's identity is its registered
`file`, and none changed: a theme still stores `"azul_dark.png"`,
`"default.jpg"` or System 7's `"desktop-gray.png"`, though the files are now
`azul_dark.webp`, `default_photo.webp` and `desktop-gray.webp`. Saved themes,
theme files, 2.x saves (their inlined `data:` URIs, matched by
`legacyDigests`) and old hashed asset URLs all resolve as before; nothing
migrates. The wallpaper index also maps the new file's name back to its
identity: a bare `azul_dark.webp`, or a local path to it from any build,
hashed or not, renders the wallpaper and is stored as `"azul_dark.png"`. A
remote URL is stored that way only when its name carries a bundler hash; an
unhashed `https://…/azul_dark.webp` may be your own image and is kept as a
URL, which still renders.

Platinum's package icon (the Appearance Manager's Themes tab) is
`platinum.webp`, and System 7's is the WebP of its System suitcase icon.

**Who must act:** a host that referenced an Appearance Package's image by
its `dist/assets/` path (`trash-empty.png`, `azul_dark.png`, a System 7
icon) changes the extension to `.webp`. `exports` never exposed
`dist/assets/`, so no bundler import breaks, and asset lookups
(`useClassicyAsset`, `resolveClassicyAsset`) return the new URLs.

## The pdf.js worker ships compressed

The PDF viewer's pdf.js worker was a 1.68 MB base64 `data:` URI in each core
bundle, and in the ES build it sat in the entry bundle, so every host loaded
it. It now ships raw-deflated (about a third of that) and, when the first PDF
opens, is rebuilt into the same `data:text/javascript;base64,…` URI pdf.js
received before. pdf.js then starts it exactly as before (a `blob:` module
worker importing that URI, with its main-thread fallback), so the worker is
still never fetched: PDFs open on `file:` (Electron), CDN and custom-scheme
hosts as they did, and a Content-Security-Policy that admitted 3.5's PDF
worker admits this one.

In the ES build, pdf.js and the compressed worker are two lazily loaded
chunks (`pdf-*.js` and `ClassicyPdfWorkerSource.internal-*.js`), so a host
that never opens a PDF loads neither. The UMD bundle carries both inline.
Inflating takes place once per page, when the first PDF opens.

**Who must act:** nobody. A host that serves the core's ES build unbundled
already serves its `pdf-*.js` chunk beside `classicy.es.js`; the second
chunk sits beside it in the same `dist/`.

## Fixes

- **PDFs render on every supported browser.** Every release from 0.71.6
  through 3.5.0, every 3.x release among them (3.0.0 through 3.5.0), bundled
  pdfjs-dist 6.2.108's modern build, which calls
  `Map.prototype.getOrInsertComputed` natively, in its API and its worker. No
  browser on Classicy's floor (Chrome and Edge 120, Safari 16.2, Firefox 113)
  has it, so on those browsers, and on any other without it, every page
  showed "Couldn't render this page." (The releases before, 0.70.3 through
  0.71.5, bundled 6.1.200, whose modern build calls it natively too; before
  0.70.3 the host supplied pdf.js.) The PDF viewer now loads pdf.js's legacy
  build (`pdfjs-dist/legacy/build/pdf.mjs` and its worker), which carries the
  polyfills; the types still come from `pdfjs-dist`. A pdf.js chunk that
  fails to load (a dropped connection) is no longer remembered: the next
  document tries again.
- **The Trash folder's icon follows the active package.** The Trash folder
  stored, as its `_icon`, the art URL of the package active when it was
  first made, and every surface drew that, so after a package switch its
  window's title bar and its row in a file browser kept the old package's
  art. Every surface that draws the Trash folder (its window's title bar, a
  file browser's icon and list views) now draws the active package's art at
  render, full while anything is in it and empty otherwise, as the desktop's
  Trash icon already did. The stored `_icon` is now always the default
  package's (Platinum's) empty-Trash art, so a package or theme switch never
  changes the saved file system. When Finder mounts, it rewrites a stored
  `_icon` that differs from that art (one saved under another package, or by
  an older build), through `fs.setMetadata`, and journals nothing when it
  matches: the only persisted value this release rewrites. A host with a
  file-system adapter (`registerClassicyFileSystemAdapter`) sees one
  `setMetadata` journal entry for `Trash` when that happens. A host that
  loads only System 7 has no default package's art, so its stored icon is
  left as it is.

  `ensureClassicyTrash(fs, icon?)` takes the icon to store (default: the
  default package's empty-Trash art) and, for a Trash that exists already
  with another `_icon`, rewrites it (never to `""`); it still journals
  nothing when there is nothing to change.

## Other changes you may notice

- **`ClassicyControlLabel`'s `label` takes rich content** (any `ReactNode`,
  such as emphasized or linked words), not just a string. It still renders
  nothing when the label is empty, now also for `null`, `undefined` or
  `false`. An icon beside a rich label gets an empty `alt`, since the label
  next to it names the control. `ClassicyInputDialog`'s `prompt` is now a
  `ClassicyControlLabel` tied to its field, flush left, and kept on narrow
  screens.
- **The copy instructions for non-URL bundlers name `dist/sample.mp4`.** A
  host on plain esbuild, or Rollup without a URL plugin, copies each
  Appearance Package's `dist/assets/` next to its bundle (as before) and the
  core's `dist/sample.mp4` too: the Movie Player's sample movie, which the
  core already shipped as a file but the instructions left out.
- **Dist checks** (for contributors): the core's `verify:dist` gains
  invariant 16 (maps keep Classicy's own text only), 17 (the worker ships
  deflated, once in the UMD bundle and once among the ES chunks, never in
  `classicy.es.js`, and inflates to the installed legacy worker) and 18
  (both entry bundles embed `earth.webp` byte for byte, once), and its
  invariant 8 fails on a `.d.ts.map`. Each Appearance Package's check gains
  invariant 10 (maps) and its invariant 7 fails on a `.d.ts.map`; their
  asset checks expect WebP art, icons and wallpapers and two sprites.

## Tooling

- `bin/make_audio_sprites.sh` runs under `LC_ALL=C`, so a sprite stamp no
  longer depends on the machine's locale, and gains
  `CLASSICY_AUDIO_RESTAMP=1`, which rewrites each complete pack's stamp from
  the current inputs without encoding (and fails, naming it, on a pack
  missing an output).
- `bin/classicyWebp.ts` encodes WebP with a pinned WebAssembly libwebp
  (`@jsquash/webp` 1.5.0), so an image gives the same bytes on any machine.
  `bin/convert-images-to-webp.ts` did the one-time conversion,
  `bin/check-webp-in-browsers.ts` compares each WebP with its original as
  Chromium and Firefox draw them, and System 7's asset exporters write WebP
  (cursors PNG).
- Storybook gains a Package toolbar (Platinum, System 7); its Theme toolbar
  also lists System 7's themes.
- No published manifest gained a dependency: `fflate` (bundled into the core
  to inflate the worker), `@jsquash/webp`, `pngjs` and `jpeg-js` are
  devDependencies.

## Upgrade

1. Bump every Classicy package you load (`@classicy/classicy`,
   `@classicy/appearance-platinum`, `@classicy/appearance-system7`) together
   to 3.6.0. From any 3.x before 3.5, follow each version's notes in turn
   (3.1, 3.5); every 3.x release before 3.6 has the PDF bug above, so 3.6 is
   the first 3.x release whose PDF viewer draws pages on the browsers at
   Classicy's floor.
2. If you load a sound sprite or an image from a package's `dist/assets/` by
   path, use the `.ogg` or `.m4a` sprite, and the `.webp` name for an image.
3. On a bundler that does not handle `new URL(…, import.meta.url)`, copy the
   core's `dist/sample.mp4` next to your bundle with each package's
   `dist/assets/`.
4. Nothing else: no code, configuration or Content-Security-Policy change.
