# Smaller published packages

Status: draft, 2026-11-18 (worker decided 2026-11-23). Owner's approach: **B**.

## Intent

The owner asked for every PNG and JPG asset to become WebP, to save space,
"we can apply some lossy compression, but the goal is to keep visual
fidelity nearly identical", and then for any other way to shrink the
published packages if images turned out not to be the main cost. The source
maps stay, since Classicy is a library for developers, but only Classicy's own
code needs to be in them: "Classicy's own code is enough; drop the
third-party sources."

Measured from the npm tarballs (`npm pack --dry-run --json`; the core at
3.4.3, Platinum and System 7 at 3.5.0), the three packages unpack to
44.5 MB. Images are about 3% of that. Most of the rest is:

- the source maps' copies of third-party code;
- two audio formats no supported browser plays;
- the PDF viewer's worker, embedded as text in both core bundles.

| Package | Unpacked today | Tarball today |
|---|---|---|
| `@classicy/classicy` | 32.04 MB | 10.63 MB |
| `@classicy/appearance-platinum` | 8.18 MB | 2.50 MB |
| `@classicy/appearance-system7` | 4.28 MB | 1.27 MB |

## Goals

1. **Source maps keep Classicy's own code only.** In every published map,
   third-party code and embedded images lose their source text. Classicy's
   own sources keep theirs.
2. **The pdf.js worker stays embedded, compressed.** Both core bundles carry
   it deflated instead of as a base64 `data:` URI. When the first PDF opens,
   it is rebuilt into the same `data:` URI, so every host that opens PDFs
   today still does.
3. **Sounds ship as ogg and m4a only.** mp3 and ac3 go.
4. **No declaration maps** in any package's `dist/types`.
5. **WebP for the Appearance Packages' art and the core's Earth picture.**
   - Lossless by default.
   - Lossy only for photographs, and only where it stays visually identical
     (the floor is below).
6. **Every gate proves its part.** Each package's `verify:dist` fails if any
   of goals 1 to 5 regresses.

Expected result, unpacked (tarball sizes are measured and reported too):

| Package | Today | After | Main levers |
|---|---|---|---|
| core | 32.0 MB | ≈ 18.2 MB | maps −10.5, worker −2.4, Earth −0.7, d.ts maps −0.3 |
| Platinum | 8.2 MB | ≈ 4.6 MB | mp3 + ac3 −2.6, maps (zod) −0.7, images −0.3 |
| System 7 | 4.3 MB | ≈ 3.1 MB | maps (zod) −0.7, mp3 + ac3 −0.4, images −0.03 |
| **Total** | **44.5 MB** | **≈ 25.9 MB** | |

## Non-goals

- **The core's other 283 icons.** This was option C, declined:
  - saved desktops and file system entries record an icon by its `data:` URI;
  - converting would leave old saves with icons that no longer follow an
    Appearance Package switch, unless a legacy lookup were added;
  - all of that for about 0.4 MB.
- **The core's Picture Viewer and Movie Player samples**
  (`assets/img/apps/quicktime/sample-picture.jpg`,
  `assets/vid/quicktime/sample.mp4`).
- **Minifying the ES bundles.** Vite leaves whitespace in lib-mode ES output
  on purpose, to keep tree-shaking annotations; the UMD bundles are already
  minified.
- **Shipping the CSS only once.** `dist/classicy.css` is for hosts with a
  strict Content Security Policy, and the injected string is for everyone
  else; both stay.
- **Externalizing zod** from the Appearance Packages: they carry it on
  purpose.
- **Repository and git-history size.** That includes
  `packages/appearance/platinum/resources/` and System 7's reference
  screenshots, none of which are published.

## Anti-goals (a failure even if the numbers drop)

- A pixel that draws differently, beyond the photo floor below, or a sound
  that plays differently, in a supported browser (Chrome/Edge 120+, Safari
  16.2+, Firefox 113+).
- A saved desktop, saved theme, theme file or 2.x save that stops finding
  its wallpaper.
- A supported host setup whose PDFs stop opening without a documented step.
- Any of Classicy's own source text missing from a map.
- Asset bytes that depend on the machine that built them.

## Constraints

- **Pixel parity.** Platinum must render pixel-identical, and System 7's
  pixel-parity checks (`bin/parity/README.md`) must stay where they are today.
- **CLAUDE.md rules hold**, among them:
  - one build and one dist check per package;
  - Appearance Package assets ship as files, byte-identical to their
    sources;
  - System 7's inlined masks are the only inlined images besides Platinum's
    halftone;
  - wallpapers persist by filename;
  - `build:audio` never rewrites committed sprite bytes for an unchanged
    pack.
- **CI's five checks pass**, and so does `pnpm verify:host-types`.

## Approaches

Measured options, as the owner saw them:

- **A: parts 1 to 4 below, images untouched.** About 27 MB. No pixel
  changes and no saved data touched.
- **B: A plus WebP for the Appearance Packages' art and the core's Earth
  picture.** About 26 MB. Wallpapers keep their stored names as their
  identity, so nothing migrates. **Chosen by the owner.**
- **C: B plus the core's 284 icons.** About 0.4 MB more, but icons in saved
  desktops would stop following an Appearance Package switch without a
  legacy-URI lookup. The most work and risk for the smallest gain.

## Design

### Part 1: source maps without third-party text

Every published `.js.map` is in scope:
- the core's `classicy.es.js.map`, `classicy.umd.js.map` and the ES build's
  `pdf-*.js.map` chunk;
- Platinum's and System 7's `appearance-*.{es,umd}.js.map`.

In each of them, `sourcesContent[i]` becomes `null` when `sources[i]` is
either:
- a third-party module, a path through `node_modules/`; or
- an asset module Vite embedded as a `data:` URI: an image, sound or media
  file, recognizable by its extension or by text starting
  `export default "data:`; or
- the module holding the compressed pdf.js worker (Part 2), which is
  third-party bytes.

Everything else keeps its text: `src/`, `packages/appearance/*/src/`, and
whatever Classicy's own build code appends.

Unchanged: `sources`, `names` and `mappings`. So stack traces and DevTools
still name the vendor file and line, and only the source text is gone.
Vendor entries stay on (or are added to) the map's `x_google_ignoreList`, so
DevTools steps over them.

Measured per map (MB):

| Map | Own text | Vendor text | Embedded assets | `mappings` |
|---|---|---|---|---|
| core ES | 2.07 | 3.53 | 0.90 | 1.80 |
| core UMD | 2.07 | 4.34 | 0.90 | 2.15 |
| core `pdf-*` | — | 0.81 | — | 0.59 |
| Platinum, each | 0.07 | 0.35 (zod) | — | 0.16 |
| System 7, each | 0.08 | 0.35 (zod) | 0.02 | 0.16 |

**Mechanism:** one shared plugin in `bin/`, registered by the three library
builds only, not by Storybook or the example's dev server. It runs after
every plugin that changes emitted code or maps (the core's `injectCssPlugin`
appends code to the entry bundles).

**Gate**, in each package's `verify:dist`:
- no map holds source text for a `node_modules/` path, an asset module or
  the compressed worker's module;
- every source under the package's own tree has non-null text.

### Part 2: the pdf.js worker, embedded compressed

**Today.** `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx` imports
`pdfjs-dist/build/pdf.worker.min.mjs?url`, and lib mode inlines it as a
`data:text/javascript;base64,…` URI:
- 1.68 MB in each of the two core bundles, for a 1.26 MB file
  (pdfjs-dist 6.2.108);
- in the ES build, the URI sits in the entry bundle (`classicy.es.js`), not
  in the lazily loaded `pdf-*.js` chunk, because the import is at the
  module's top.

pdf.js treats a `data:` worker as cross-origin (`PDFWorker._isSameOrigin`).
It starts the worker through a `blob:` module wrapper that `import()`s the
URI, and if that fails it imports the URI on the main thread. Since nothing
is fetched, PDFs open on every host, including the ones
`docs/AGENT-REFERENCE.md` promises:
- `file:` apps such as Electron;
- CDN-served files;
- custom schemes.

**Options weighed.** The owner chose to keep that portability:
- **The worker as a file** was rejected: it saves 2.1 MB, but `file:` hosts
  would likely lose PDFs, and CDNs would need CORS and a JavaScript MIME
  type.
- **Other engines** were rejected, measured from their npm packages:
  - PDFium through EmbedPDF (MIT): a 4.6 MB `.wasm` plus its own worker file,
    so it is bigger and has the same fetch problem.
  - MuPDF: AGPL-3.0, with a 10.4 MB `.wasm`.
  - react-pdf and unpdf: both are pdf.js inside.
  - The browser's built-in viewer: it draws the browser's own chrome, not the
    Appearance Package, and Android Chrome shows no PDF inline.

**Change:**
- **Build time:** the worker's bytes are compressed with raw deflate at
  level 9 and embedded as base64: 375 KB, or 501 KB as base64, per bundle
  (measured with Node's zlib).
- **Runtime:** when the PDF engine first loads, Classicy inflates the bytes
  and builds the same `data:text/javascript;base64,…` URI pdf.js receives
  today, set as `GlobalWorkerOptions.workerSrc`. pdf.js then takes today's
  code path, its fallback included.
- **The inflater:** fflate's `inflateSync` (MIT, 3.8 KB minified), a
  devDependency bundled the way pdfjs-dist is, so the published manifest
  gains nothing. `DecompressionStream` is not used: Safari has it from 16.4,
  and the floor is 16.2.
- **Where it lives:** the compressed worker and the inflater move into the
  lazily loaded PDF chunk with pdf.js, so an ES host that never opens a PDF
  never loads them. The UMD bundle has no chunks and carries them inline.
- **Cost:** inflating takes 55 ms in Node from a cold start (measured), once
  per page. It is timed in Chromium during verification.
- pdfjs-dist stays bundled. The reason in `vite.config.ts` stands: the worker
  and the API must come from one place.
- Storybook and the example keep working.

**What hosts see:** nothing to do. A strict CSP is unaffected: the worker
starts exactly as today (a `blob:` module worker importing a `data:` URI), so
a policy that admits today's PDF viewer admits this one.

**Gates:**
- In the core's `verify:dist`:
  - no bundle or chunk holds a `data:text/javascript` URI;
  - the compressed worker, inflated, equals the installed pdfjs-dist worker
    byte for byte, in the UMD bundle and in the ES build;
  - the ES entry bundle does not carry it.
- A vitest test pins that the URI built at runtime equals
  `data:text/javascript;base64,` followed by the base64 of the installed
  worker.

### Part 3: sounds in ogg and m4a

Howler plays the first file in a pack's `src` that the browser can play:
- Chrome, Edge and Firefox take ogg, which is first;
- Safari cannot play ogg Vorbis and takes m4a, as it does today.

No supported browser ever reaches mp3 or ac3, so removing them changes no
browser's choice.

**Changes:**
- the format list in `bin/make_audio_sprites.sh` (default `ogg,m4a,mp3,ac3`)
  and in `package.json`'s `build:audio` call for System 7;
- `packages/appearance/platinum/src/assets/sounds/platinum.ts` and
  `packages/appearance/system7/src/assets/sounds/system7.ts`: the glob, the
  file-name list and the check against the sprite JSON's `src`;
- the two sprite JSONs' `src`;
- each package's `verify:dist` (four sprites become two);
- tests and docs: the CLAUDE.md audio and build notes, and
  `docs/AGENT-REFERENCE.md`.

**Byte constraint.**
- The committed `.ogg` and `.m4a` files, and the sprite offsets, stay
  byte-identical. Prove it with sha256 before and after.
- Each pack's `<name>.sprites.sha256` stamp must be recomputed for the new
  format list and the edited script. Then `build:audio` sees the packs as up
  to date rather than re-encoding them with whatever ffmpeg the machine has.

A host that loaded `platinum.mp3` or `.ac3` directly loses it (release note).
Platinum's `exports` do not expose `dist/assets/`, so no bundler import breaks.

### Part 4: no declaration maps

`tsconfig.json` sets `declarationMap: true`, so `dist/types` ships 337
`.d.ts.map` files in the core (0.28 MB), and the Appearance Packages ship
theirs. The `.ts` files they point at are not published, except
`src/Appearance/`, which the core ships for its SCSS export.

**Change:** the three declaration builds (`vite-plugin-dts`) emit no
declaration maps. The root `tsconfig.json` may keep the setting for the
editor.

**Cost:** "Go to Source Definition" from a host into the core's
`src/Appearance` `.ts` files is lost; elsewhere it already led nowhere.

**Gate:** each `verify:dist` fails on any `.d.ts.map` in `dist/types`.

### Part 5: WebP images

**In scope:**
- **Platinum** (`packages/appearance/platinum/src/assets/`): `art/` (8 PNG)
  and `wallpapers/` (47 PNG and `default.jpg`).
- **System 7** (`packages/appearance/system7/src/assets/`): `art/**` (25 PNG,
  including the six inlined masks), `icons/**` (348 PNG: color, bw and
  selected, at 16 and 32) and `wallpapers/` (2 PNG).
- **Core:** `assets/img/ui/earth.png` only. It is icon key `classicy.bg`,
  read at render by About This Computer (`FinderAboutThisComputer.tsx`) and
  stored nowhere.

**Out of scope:**
- cursors (both packages; CSS `cursor` images stay PNG, the format every
  supported browser takes);
- SVGs, including `dither-checker.svg` and Platinum's halftone;
- the core's other icons and the samples (Non-goals);
- favicons and home-screen icons, which no package publishes.

**Encoding:**
- **Default: lossless WebP with `exact`**, so the color under fully
  transparent pixels is kept too. Measured with ImageMagick and libwebp
  1.2.4, 430 of the 431 in-scope images decode pixel-identical to their
  source.
- **The exception is `earth.png`, a 16-bit RGBA PNG.** WebP holds 8 bits per
  channel, so the largest difference is half of one 8-bit step (PAE 128 of
  65535). Browsers draw 16-bit PNGs at 8 bits anyway. Accepted.
- **Photographs** (`default.jpg`, `earth.png`) may be lossy, under two
  conditions:
  - the result scores at least **45 dB PSNR** against its source,
    composited over both white and black when it has alpha;
  - it is smaller than the lossless encoding.

  Otherwise they are lossless. Measured:

  | Photo | Source | Lossless WebP | Lossy WebP | Result |
  |---|---|---|---|---|
  | `default.jpg` | 21.4 KB | 26.7 KB | 4.4 KB at q90, 52 dB | lossy |
  | `earth.png` | 322 KB | 56.6 KB | 13.5 KB at q90, 38 dB | fails the floor; lossless |
- **Color data.** 47 in-scope PNGs carry an `sRGB` chunk, and three carry
  `cHRM` chromaticity: `earth.png`, Platinum's `art/help-button.png` and
  `art/sad-mac.png`. `earth.png` and `sad-mac.png` also carry `gAMA` 1/2.2
  and no `sRGB` chunk, so Chromium and Firefox color-manage them, while a
  WebP with no ICC profile draws as plain sRGB. So each converted image is
  checked as the browser draws it (Verification), not only by decoding.
  - **Reference:** each browser against itself. The WebP drawn in Chromium
    is compared with the original drawn in Chromium, and likewise in
    Firefox.
  - **A non-photo that fails AE 0 in either browser** gets an embedded ICC
    profile equivalent to its chunks, when that makes it match. Otherwise
    it stays in its original format, listed by name as an exception in its
    package's `verify:dist`. Its glob accepts both extensions.
  - **The Earth picture** is a photo: the photo floor (≥ 45 dB) applies to
    its browser rendering, any color-management shift included.
- **One converter** in `bin/`, with a pinned encoder that writes
  byte-identical output on any machine. That means a pinned WebAssembly
  build of libwebp, not a native one: `sharp`'s per-platform libvips
  binaries do not guarantee identical bytes across operating systems and
  CPUs, while System 7's exporter today writes the same PNG bytes anywhere
  (its pure-JS `bin/png.mjs`).
  - It does the one-time conversion.
  - System 7's exporter (`packages/appearance/system7/bin/export-assets.mjs`,
    a dev tool the owner runs by hand on a System 7.5.5 install) calls it to
    write WebP instead of PNG, staying deterministic. Its header comment and
    `docs/system7-asset-inventory.md` say so.
- **Uniform per folder** (my call): every in-scope file converts, even a tiny
  icon whose WebP is a few bytes larger. That keeps one extension per glob,
  allowlist and exporter path. System 7's set still shrinks overall
  (84 KB → 59 KB).

**Persistence: nothing migrates.**
- **Wallpapers keep their identity filenames.** Each wallpaper's `file`
  (Platinum's `PLATINUM_WALLPAPERS`, the `platinum.json` presets, System 7's
  two) keeps its current name, such as `"azul_dark.png"`, and only its `src`
  points at the `.webp`. So these all resolve as before:
  - saved themes;
  - theme files;
  - 2.x `data:` digests (`legacyDigests`, unchanged);
  - old hashed-URL basenames.
- **Index the new file name too.** The wallpaper index must also map the
  emitted file's basename (`azul_dark.webp`, hashed or not) back to that
  identity, so a URL of the new file stores as `"azul_dark.png"`.
- **The Trash folder is the one exception, and it gets fixed.**
  `ensureClassicyTrash` (`src/SystemFolder/SystemResources/File/ClassicyTrash.ts`)
  writes `_icon: resolveClassicyAsset("systemArt", "trashEmpty")`, the
  *active package's* art URL, into the saved file system once and never
  refreshes it. So today the folder keeps the first package's trash art
  after a package switch, and after the conversion an old save would point
  at a `.png` that no longer ships.
  - **The fix** (my call): the Trash folder's icon draws the active
    package's trash art at render, like the Trash desktop icon Finder
    re-adds on mount.
  - **Heal:** `ensureClassicyTrash` rewrites a stored `_icon` that differs
    from the current art, through `fs.setMetadata`, journaled only when it
    changes. Old saves heal on the next Finder mount.
  - This is the only persisted value the change rewrites.
- **Nothing else is stored.** Every other stored `_icon` is a core icon
  (`classicyCoreIcon`) or a derived entry stripped from persistence. System
  art, package icons and System 7's selected-icon images are keyed by their
  emitted URLs at runtime.

**Gates and references to update:**
- Platinum's and System 7's `verify:dist`: the asset kinds allowed (`.webp`
  as art, icons and wallpapers), System 7's seven masks by their new names,
  and "byte-identical to its source" now meaning the WebP source.
- The core's image plugin (`VitePluginImageTools`, `quality: 100`,
  `enableWebp`) must not re-encode `earth.webp`. The bytes embedded in both
  bundles must equal the source file (a test or a `verify:dist` invariant).
- Every glob, import and test that names a `.png` or `.jpg` in scope; the
  CLAUDE.md lines naming the masks (`art/{color,bw}/window-stripes.png`, …)
  and Platinum's `platinum.png`.

## Verification

1. **Sizes.** `npm pack --dry-run --json` for each package before and after,
   unpacked and tarball, reported in the PR. They should land near the
   Goals table.
2. **Pixels.**
   - Every converted image, drawn by the browser from its WebP, matches the
     same image drawn from its original PNG or JPG: AE 0 in Chromium and
     Firefox, except the lossy photo (≥ 45 dB) and Earth's half-step.
   - The existing pixel-parity checks for Platinum and System 7 stay at
     today's values.
3. **PDF.** A PDF opens in the PDF viewer, with the worker rebuilt from its
   compressed copy:
   - in the example's production build (`pnpm preview`, against the built
     dist), in Chromium and Firefox;
   - from a `file:` page that loads the UMD bundle, in Chromium;
   - in Storybook.

   The one-time inflate is timed in Chromium and reported.
4. **Sound.**
   - Alert and feedback sounds play in Chromium and Firefox (ogg).
   - WebKit cannot be launched on this machine. Safari's choice of m4a is
     unchanged from today, since it already skips ogg and stops at m4a.
5. **Maps.**
   - DevTools, or a script over the map, shows Classicy's own sources with
     their text.
   - A thrown error inside pdf.js still names the pdf.js file and line.
6. **CI and `verify:host-types`.** All pass; each `verify:dist` holds the new
   invariants.

## Docs

- **CLAUDE.md:** the audio formats, the masks' names, the compressed worker
  and its gate, and the declaration and source map rules.
- **`docs/AGENT-REFERENCE.md` §1 and the README:** add `dist/sample.mp4` to
  the copy instructions for non-URL bundlers. They omit it today, though
  `MoviePlayer.tsx` already ships it as a file.
- **Release notes** for the next minor: what a host may notice. That is
  mp3 and ac3 gone and maps without third-party text. The worker needs
  nothing from hosts.

## Decisions

Owner's:
- **Approach B.**
- **Maps:** "Classicy's own code is enough; drop the third-party sources."
- **Lossy compression** is acceptable where fidelity stays "nearly
  identical".
- **The pdf.js worker stays embedded, compressed** (2026-11-23), over
  shipping it as a file, so PDFs keep opening on `file:`, CDN and
  custom-scheme hosts.

My calls (each correctable):
- mp3 and ac3 both go: no supported browser reaches either.
- The photo floor is 45 dB PSNR.
- `exact` lossless.
- Uniform WebP per folder, except an image the browser check keeps in its
  original format.
- A pinned WebAssembly libwebp as the converter, for byte-identical output
  on any machine.
- Each browser is its own reference for the pixel check; ICC embedding, or
  keeping the original, for a non-photo that fails it.
- The Trash folder's icon resolves at render, and a stale stored `_icon` is
  healed on Finder mount.
- The worker is compressed with raw deflate and inflated by fflate.
  - Not `DecompressionStream`, which Safari lacks before 16.4.
  - Not brotli: a JavaScript brotli decoder's dictionary alone is 123 KB per
    bundle, more than the ~90 KB per bundle brotli would save.
- The compressed worker moves into the lazy PDF chunk.
- The work ships as a `feat:` (minor) release: no export changes, and the
  host-visible changes are documented.
- Declaration maps are dropped for all three packages.

## Left to the builder

- The plugin hooks for part 1 (`generateBundle` over map assets).
- For part 2:
  - how the compressed worker is produced at build time (for example a
    virtual module from a small plugin in `bin/`);
  - how the runtime builds the base64 (`FileReader.readAsDataURL` or
    chunked `btoa`);
  - how `verify:dist` finds the embedded copy.
- How to recompute the sprite stamps without re-encoding.
- The quality chosen for `default.jpg` above the floor, recorded with its
  PSNR.
- The order of the parts, test names and file names for new `bin/` helpers.
- The name clash between Platinum's `wallpapers/default.png` and
  `default.jpg`, which would both become `default.webp`. Their identity
  names stay as they are.
- `platinumLegacyWallpapers.test.ts`, which derives digests from the PNG
  bytes: the 2.x digests stay fixed constants of the original bytes.
- System 7's exporter copying Platinum's `sad-mac.png`.
