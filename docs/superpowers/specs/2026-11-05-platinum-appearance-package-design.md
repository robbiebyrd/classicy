# Platinum as its own package: `@classicy/appearance-platinum`

Date: 2026-11-05. Status: design, awaiting the owner's approval. Lands on PR 333 (`feat/AppearancePackages`) before it merges.

## Intent

Platinum stays Classicy's default look, but it stops being bundled into `classicy`. It moves into its own workspace package at `packages/appearance/platinum`, published to npm as `@classicy/appearance-platinum`. A host that ships another Appearance Package (a future Windows 3.11 or IRIX look) then downloads none of Platinum's stylesheet, art, fonts, sounds or wallpapers.

The cost is one explicit line in every host:

```ts
import "classicy/…";                       // as before
import "@classicy/appearance-platinum";    // new: loads and registers Platinum
```

The owner chose that trade (2026-11-05): a smaller core in exchange for one line per host, as a breaking change in this release. One breaking upgrade is better than two.

## Goals

- `packages/appearance/platinum` is a pnpm workspace member, published as `@classicy/appearance-platinum`, versioned and released with `classicy`.
- Importing the package registers Platinum: its package object (CSS, defaults, presets, knobs, options, layout, hooks), its assets (art, pixel art, cursors, system art, fonts, wallpapers) and its sound pack. Nothing else is required.
- `classicy` holds no Platinum look, art, fonts, sound sprites or wallpapers, and none of its source imports Platinum.
- `classicy` alone still type-checks, builds, and lays out every component structurally; it just has no look.
- `ClassicyDesktop` with no Appearance Package registered stops and shows the developer a message saying they must load one, naming `@classicy/appearance-platinum` as the default. This is owner decision 2026-11-05; it replaces an unstyled desktop.
- Pixel parity for a host that adds the import: every Storybook parity story and the example app compare AE 0 against a `before/` baseline taken at the current tip.

## Non-goals

- A second shipped package. The Storybook-only `mirrored` and `renamed` packages stay the proof that other packages work.
- Lazy or dynamic loading of packages, or switching between packages that are not installed.
- Shrinking other parts of `classicy`: the PDF chunk, the screen savers' art, the HyperCard stacks.
- Splitting other modules (apps, control panels) into packages.

## Anti-goals (failure even if it technically works)

- **Two copies of the registries.** If the Platinum package bundles its own copy of Classicy's registries (package, asset, sound pack, log), registration lands in a copy nothing reads, and the desktop stops or renders bare. `classicy` must be a peer dependency of the Platinum package, and external in its build, in both the ES and UMD outputs.
- **Platinum still in the core bundle.** Any path that still pulls a Platinum file into `dist/classicy.*.js`, by import or by inlining, defeats the point. `verify:dist` must fail if it happens.
- **A host that adds the import sees any visual, audible or behavioral change.** Platinum renders pixel-identical, plays the same sounds and keeps its 21 presets, wallpapers and fonts.
- **Persisted state breaks.** A host upgrading with saved `classicyDesktopState` (a Platinum theme, `packageId: "platinum"`, wallpaper filenames) must load as before once it adds the import.

## Current state (measured at 713e98242)

**What `src/Appearance/Platinum/` holds:**
- `index.ts`, which registers the package, plus `hooks.ts` and `platinum.json` (defaults, 21 presets, knobs and layout).
- `styles/`: `platinum.scss`, the mixins and 26 component partials, compiled `?inline` into the package `css` string.
- `assets/`: `art/` (18 svg and png files, 92 KB), `pixelart/` (9 files), `fonts/` (13 woff2 files, 312 KB), `platinumAssets.ts` (all asset registration), `platinumFonts.internal.ts` and `sounds/platinum.ts` (the sound pack).

**What Platinum registers but which lives outside that folder:**
- The sound sprites, `assets/sounds/platinum/`: ogg, m4a, mp3 and ac3, about 3.1 MB, plus `platinum.json`. They are imported as `@snd/platinum/platinum.json` and inlined into the bundle as `data:` URIs (`sounds/platinum.ts:17-19`). They are probably the largest Platinum share of the bundle.
- The 47 wallpapers: `assets/img/wallpapers/*.{png,jpg}`, 584 KB, globbed eagerly by `ClassicyWallpapers.ts:3-6` and inlined in a library build.
  - `assets/img/wallpapers/photos/` (83 files, about 15 MB) is matched by no glob and read by nothing, so it never reaches the bundle.
- The icon tree: `ClassicyIcons.ts` with `assets/img/icons` (1.5 MB), whose eager glob (`ClassicyIcons.ts:11-14`) inlines every image under `assets/img`, unused ones included. Apps use it whatever package is active.
- The size numbers come from source files. A stale local `dist/classicy.es.js` is 10 MB; the builder measures fresh builds before and after.

**What Platinum imports from the library** (all exported through the barrel):
- `ClassicyAssetRegistry`, `ClassicyAssetSource`, `ClassicyPixelArtSource`;
- `ClassicyAppearancePackage`, `ClassicyAppearancePackageSchema`, `ClassicyAppearancePackageRegistry`, `ClassicyAppearanceSound`;
- `ClassicySoundPacks`, `ClassicyLog`, `ClassicyAppearance`, `ClassicyIcons` and `ClassicyWallpapers`.

Its SCSS uses the vocabulary modules (`color`, `layout`, `package`), which `classicy/scss/*` already publishes.

**What the library imports from Platinum (outside tests and stories):**
- `ClassicyDesktop.tsx` imports `@/Appearance/Platinum` for its side effect. This is program decision D14, which this design reverses.
- `platinum.json` is read by `ClassicyAppearance.ts` (presets, `getAllThemes`), `ClassicyThemeMetrics.ts` and `ClassicyThemeDerivations.ts` (the measurement floor), and `ClassicyPopUpMenuPlacement.ts` (constants).
- The Platinum sound pack is imported by `ClassicySoundManagerProvider.tsx`, `ClassicySoundManagerUtils.tsx` and `ClassicyThemeSchema.ts` (the `sound.pack` refine).
- **Platinum is in `classicy`'s public API:**
  - `src/index.ts:17` re-exports `./Appearance/Platinum/index`, so `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks` and `platinumSoundPack` are public. So are the wallpaper helpers `resolveWallpaper`, `ClassicyDefaultWallpaper`, `classicyWallpaperFilename` and `buildClassicyWallpaperIndex`, through the barrel.
  - Every one of them leaves `classicy`. The Platinum ones are exported from `@classicy/appearance-platinum`. The wallpaper helpers become either registry-based helpers in `classicy` or Platinum exports.
  - Each removal is a breaking change, so it goes in the release note.
- **Build and tooling outside `src/`:**
  - `vite.config.ts:19` and `bin/check-dist-imports.mjs:129` import `PLATINUM_FONT_FACES`.
  - `storybook/.storybook/preview.tsx:6` reads `platinum.json` presets for the theme toolbar.
  - `ClassicyThemeSchema.ts:14,116` reads the wallpaper index.
- **Tests:** 55 test and story files import Platinum. About 25 more compile or read Platinum files by filesystem path, for example `ClassicyWindow.art.test.ts:26`, `ClassicyTabs.art.test.ts:26`, `storybook/.storybook/MirroredPackage.test.ts:17` and `ClassicyPackageExports.test.ts:30,56`; those need path rewrites. Three tests `vi.mock("@/Appearance/Platinum/assets/sounds/platinum")`, for example `ClassicySoundManagerProvider.test.tsx:35`.
- `ClassicyAppearanceManager.Themes.tsx` imports `./resources/platinum.png` (a folder inside the Appearance Manager, not the top-level `resources/`) as Platinum's icon in the Themes tab.
  - **My call:** the package supplies its own icon through an optional `icon` field on `ClassicyAppearancePackage`, if it doesn't have one already. The image moves into the Platinum package, and the Themes tab shows a generic package glyph for a package without one.
- The resolution chain (`resolveClassicyAppearancePackage`) runs registered id → `"platinum"` → `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`, and the fallback is built from Platinum's defaults and layout.
- The measurement completion `classicyThemeMeasurementDefaults(pkg)` layers the core five families, then Platinum's 21 families, then the package's own. This is the H-R13 rule: every package's themes emit the structural knobs, guaranteed by "the Platinum floor".

**Elsewhere:**
- `storybook/.storybook/` (preview, plus the `mirrored` package that rescopes Platinum's mixins) and `example/` rely on Platinum being registered by `classicy`.
- Build and verify, all under `bin/` plus `vite.config.ts`, expect Platinum inside `classicy`:
  - `injectCssPlugin` emits `dist/classicy-platinum.css` and `dist/classicy-platinum.fonts.css`;
  - `verify:dist` invariant 7 requires both entry bundles to carry Platinum's package block, invariant 12 checks the fonts stylesheet, and `classicyDistAssets.ts` requires `dist/assets/` to hold exactly Platinum's art and 13 woff2 files;
  - the `./appearance/platinum` export is a no-op shim, and `./appearance/platinum/scss/*` points at Platinum's SCSS.
- Releases: `push.yml` bumps the version, then publishes the root with `JS-DevTools/npm-publish@v4` and the `NPM_TOKEN` secret, then waits for npm to list it.

## Design: decided

These come from the owner, or follow directly from the owner's decisions.

1. **Location and name.** The package lives at `packages/appearance/platinum` and publishes to npm as `@classicy/appearance-platinum`. Its `package.json` sets `"publishConfig": { "access": "public" }`. The owner creates the free npm organization `classicy` before the first publish (owner, 2026-11-05).
2. **Explicit load.** `classicy` no longer registers Platinum. A host imports `@classicy/appearance-platinum` once, at app entry (owner, 2026-11-05).
3. **No package, no desktop.** When `ClassicyDesktop` mounts and no Appearance Package is registered, it renders a plain message in place of the desktop and stops. The message says an Appearance Package must be loaded and shows `import "@classicy/appearance-platinum";` as the default. It is not the Sad Mac crash screen, because nothing crashed. It also logs once through `classicyLog("error", "Appearance", …)` (owner, 2026-11-05).
4. **The same release.** This lands on PR 333 before it merges, so hosts take one breaking upgrade (owner, 2026-11-05).
5. **3.0.0, with both downstream apps prepared first** (owner, 2026-11-05).
   - **Version:** both packages publish as 3.0.0, a major matching the release's breaking changes. `push.yml` must not take its `default: patch` path for this release. The bump step is made to produce 3.0.0, for example with the action's `major` keyword in the merge commit message or a one-off explicit version, and the builder proves which.
   - **The peer range:** the Platinum package's peer range is `classicy: ^3.0.0`.
   - **The downstream apps:** the release dispatches to `robbiebyrd/classicy-web` and `Keeping-History/rt911` (production 911realtime.org) stay. Before PR 333 merges, the controller opens a PR in each repo that adds `@classicy/appearance-platinum`, adds the import at the app entry, and handles any other 3.0 breaking change that app hits. Each PR is checked against a local build of both packages (a `pnpm pack` tarball, or a workspace link). The owner merges them. They must be ready to merge, or merged, before PR 333 is.
   - **Trigger paths:** the release trigger's `paths` filter (`src/**`, `assets/**`, `vite.config.ts`, `bin/**`) gains `packages/**`, so a change only under the new package still releases.
6. **Platinum's contents.** Everything under `src/Appearance/Platinum/` moves. So does every Platinum file in the top-level `assets/` folder (owner, 2026-11-05: "move Platinum's files in the assets/ folder into the new package"); the next section says which files those are. The icon tree (`ClassicyIcons`, `assets/img/icons`) stays in `classicy`, because every app uses it under any package. A package overrides individual icons through `registerClassicyIcons` (owner agreed to this split as proposed, 2026-11-05).

### Which `assets/` files are Platinum's

**The rule:** a file under `assets/` moves into `packages/appearance/platinum/assets/` when Platinum is its only consumer, meaning nothing outside Platinum imports it or reads it by path. A file the library also reads stays. A file nothing reads is listed in the report and left in place, not deleted; the owner decides about orphans.

**Known to move:**
- `assets/sounds/platinum/`: the compiled sprite files, `platinum.json` and `sprites/`. `bin/make_audio_sprites.sh` and `pnpm build:audio` move with them, or are pointed at the new path.
- `assets/img/wallpapers/` and the `ClassicyWallpapers` index. This includes `photos/` (about 15 MB). Nothing reads it, but it lives inside the wallpaper folder and goes with it (my call); the report flags it as unused for the owner. It is not published either way, since no glob reaches it.
- `assets/img/icons/control-panels/appearance-manager/platinum.png`. Nothing reads its icon-tree entry (`ClassicyIcons.ts:185`). It is byte-identical to `AppearanceManager/resources/platinum.png`, the Themes tab's Platinum package icon, which becomes the package's own icon (see the coupling list above). The icon-tree entry is removed, and the duplicate in `AppearanceManager/resources/` moves into the package.
- The files behind Platinum's system art and cursors, which `platinumAssets.ts` registers today through `ClassicyIcons` paths:
  - system art `appleMenu`, `startupLogo`, `trashEmpty`, `trashFull`, `aliasBadge`, `helpButton`, `aboutLogo` and `halftoneLarge`;
  - cursors `watch`, `hand`, `resizeLr`, `resizeUd`, `resizeU`, `resizeD`, `resizeL` and `resizeR`.

  Platinum imports these files directly instead of through `ClassicyIcons`. Each one moves only if the rule allows it; if an app or component also reads it from the icon tree, it stays.
**Orphans in `assets/img/ui/`, reported and not moved:** `stripe.svg`, `tab.svg`, `halftone-small.png`, `menu-dropdown-arrows.svg` and `sad-mac.png`. Platinum holds its own Sad Mac in `art/`. Nothing reads any of these files; the README (lines 69-80) lists their icon paths as removed. But `ClassicyIcons.ts`'s eager glob still inlines them into `classicy`. **My call:** the report lists them, and a follow-up story proposes deleting them or narrowing the glob. They are not Platinum's, so this design neither moves nor deletes them.

**Known to stay:**
- the site icons (`assets/img/android-icon-*`, `apple-touch-icon-*`, `ms-icon-*`, `icon-*`);
- `assets/img/ui/menu-dropdown-arrow-up.svg`, which the library reads (`ClassicyLittleArrows.tsx:81`, `ClassicyTable.tsx:203`);
- the app and control-panel icons under `assets/img/icons/`, except `platinum.png` above;
- `assets/img/apps/` and `assets/vid/`.

### `resources/` moves too, but is never published

**The owner's instruction (2026-11-05):** move the top-level `resources/` folder into the package folder, but do not export or publish its contents. It is 346 MB of reference material:
- the Mac OS 7 and 8 Human Interface Guidelines PDFs (1995, 1996, 1997), which the HIGOS8 page citations in CLAUDE.md and the code refer to;
- reference screenshots and images, `exports/` and `thumb/`;
- the `app-icons/` library, with its `index.json` and README.

The destination is `packages/appearance/platinum/resources/` (owner confirmed 2026-11-05, over a shared `packages/appearance/resources/`).

**Keeping it out of npm:**
- The Platinum package's `package.json` `files` is an allowlist (`dist`, `README.md`, `LICENSE` and the published SCSS). `resources/` is not on it, and no `exports` entry points into it.
- `pnpm pack --dry-run --json` and `npm pack --dry-run --json` must list no `resources/` path. Add a test like `ClassicyPackageExports.test.ts` for the new package.

**References to update:**
- `biome.json`, which includes `resources/**` and excludes `resources/app-icons/index.json`;
- the HIGOS8 path in `docs/hig-audit.md`, plus any other doc that names `resources/…`. `docs/hig-audit.md:16` already cites `resources/Apple_HIGOS8_Guidelines.pdf`, which does not exist. The real files are `Apple_HIGOS8_1996_Guidelines.pdf` and `Apple_HIGOS8_1997_Guidelines.pdf`, and the corrected path names the right one;
- `build:watchaudio`, whose stale watch path `resources/sounds/**` moves to the new sound-sprite source, or which is fixed or removed if it was already dead.

Move the folder with `git mv`, so history follows the files, and do not re-encode anything.

**To check:** `assets/img/PlatinumClickLaunch.png` and the unregistered cursors (`cursor-add`, `cursor-eyedropper`, `cursor-hand-counting`, …). Apply the rule.

**My call:** when a moved file had an entry in the `ClassicyIcons` tree, the entry is removed. Under the README's current rule that entry already changed nothing drawn. Even so, removing it is a breaking change for any host that reads `ClassicyIcons.ui.cursors.watch` or a similar entry, so the release note lists each removed path with its replacement (the system-art or cursor key, read through `resolveClassicyAsset`). The README's "Seven icon paths are gone" table is the model.
7. **A core floor that is not Platinum.** `classicy` needs default values for the core five measurement families and every structural knob that base stylesheets and components read (H-R13). These move into a core-owned defaults module, for example `src/Appearance/ClassicyCoreThemeDefaults.json` or `.ts`. The values equal Platinum's current ones, so nothing renders differently. The core layer becomes: core five + structural knobs from the core floor, then the registered package's own values. Platinum's look-only knob families stay in `platinum.json`. The rule "every package's themes emit the structural knobs" is now guaranteed by the core floor, and the CLAUDE.md and AGENT-REFERENCE text that says "the Platinum floor" changes to match.

## Design: the builder's calls (marked as such; the owner may override)

Where this section says "my call", it is the controller's proposal, not something the owner decided.

### Package resolution and the fallback (my call)
- The chain becomes:
  1. the registered package for the persisted `packageId`;
  2. else the registered default (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, still `"platinum"`);
  3. else the first registered package;
  4. else none, which means the desktop stops (decision 3).
- `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` stays for lone components rendered outside a desktop. It keeps the id `"platinum"`, `css: ""` and no hooks, but takes its defaults and layout from the core floor instead of `platinum.json`. A persisted `packageId` naming an unregistered package keeps today's behavior of a logged fallback to a registered one.

### Default theme and state before a package registers (my call)

**The gap.** The load path assumes Platinum is always readable:
- `knownClassicyThemePackage` (`ClassicyBuiltInThemes.internal.ts:50-55`) and `hasKnownClassicyThemePackage` (`ClassicyAppManagerUtils.tsx:124-128`) answer `"platinum"` with `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`.
- `getInitialState` runs when `classicy` is evaluated, and that now always happens before Platinum registers.

Left as is, a saved `{ id: "bondi", package: "platinum" }` would miss its preset and be reset to defaults with a warning (`ClassicyBuiltInThemes.internal.ts:158-172`). `healThemeWallpapers` (`ClassicyAppManagerUtils.tsx:101-121`) would blank custom-theme wallpapers, and `persistableClassicyTheme` would strip knob values against the wrong defaults.

**The fix:** Platinum gets no special case. `"platinum"` is treated exactly like any package that has not registered yet, through the existing path for that:
- its themes are kept whole and are not stripped, healed or reset;
- they are refreshed when it registers: a built-in active theme of that package is replaced by its current preset, and its wallpapers heal against its registered index.

Neither `knownClassicyThemePackage`, `hasKnownClassicyThemePackage` nor any other load or persist helper may return the fallback package for a real package id. Tests cover a saved Platinum built-in theme, a saved Platinum custom theme with a wallpaper, and a saved knob override, each loading before Platinum registers and coming out unchanged afterward.

**Initial state:**
- The store's initial `activeTheme` comes from the core floor (structure only, no fonts or wallpaper).
- A first session with no persisted theme activates the default package's `defaults` when that package registers.
- `getAllThemes` and the Appearance Manager's theme lists read presets from the registered packages' `presets`, never from `platinum.json` directly.

### Persisted wallpapers (my call)

Custom and host-loaded themes are persisted whole, and `backgroundImage` holds the resolved value: a `data:` URI in today's library build. Once wallpapers are files, a newly saved theme would store a URL to the host's hashed build asset, and that URL breaks when the host rebuilds.

So `backgroundImage` for a registered wallpaper is persisted as its filename, as theme files already do with `classicyWallpaperFilename`, and resolved through the registry at render. On load, a shape-detecting step in `migrateClassicyState` converts any stored value that matches a registered wallpaper (a `data:` URI, or a URL from an older build) back to its filename. It runs once that package has registered, since the index only exists then. A plain http(s) URL a user chose stays as it is.

### Sound (my call)
- `ClassicySoundManagerProvider` loads the pack named by `activeTheme.sound.pack` from the registry, as it does today. With no matching pack it plays nothing, instead of falling back to Platinum's.
- The `sound.pack` refine in `ClassicyThemeSchema.ts` accepts any registered pack and must not import Platinum's.
- The fallback for "a sprite id missing from the active pack" becomes "the default package's pack, if registered, else silent".

### Wallpapers (my call)
- `ClassicyWallpapers` moves into the Platinum package and is registered through `registerClassicyWallpapers`, as now.
- Core consumers (`ClassicyAppearance.ts`, `ClassicyAppManagerUtils.tsx`, `ClassicyBuiltInThemes.internal.ts`, `ClassicyThemeFile.ts`, `ClassicyAppearanceManager.tsx`) resolve a wallpaper filename through the asset registry (`resolveClassicyAsset("wallpapers", …)`) instead of the module's glob. `ClassicyDefaultWallpaper` becomes the active package's first or `default` wallpaper.
- Theme files keep writing wallpapers by filename, and a filename no package registers is handled exactly as an unknown filename is today.
- The wallpapers ship as files in the Platinum package's `dist/assets/`, not inlined. This follows the existing `noInlineAppearanceAssetsPlugin` pattern, which ruling E17 settled for art.

### Build and outputs (my call)
**Package layout:**
- `packages/appearance/platinum/` gets its own `package.json`, `tsconfig.json`, `vite.config.ts` (library mode, ES and UMD) and `src/`.
- `classicy` is a `peerDependency` (`^` the current major.minor) and a `devDependency` (`workspace:*`). The pnpm workspace gains `packages/*/*`.

**`external` in the build** covers `classicy`, its subpaths, `react` and `react-dom`. Platinum's source imports no zod. It builds its `options` with `classicy`'s exported `classicyKnobsToSchema`, and zod stays bundled inside `classicy` as today. Platinum's source imports library modules by their public path (`from "classicy"`), never `@/…`.

**What the package's `dist/` holds:**
- `appearance-platinum.es.js` and `.umd.js`, with the UMD global depending on the `classicy` UMD global;
- `dist/assets/`: the 13 woff2 fonts, the art, the wallpapers and the sound sprites, all as files;
- `classicy-platinum.css` and `classicy-platinum.fonts.css`, for strict-CSP hosts, with the same content as today;
- type declarations.

The emit logic now in `injectCssPlugin` and `bin/classicyFontStylesheet.ts` is shared or moved, not duplicated.

**Exports:**

| Export | Points at |
|---|---|
| `.` | the JS |
| `./scss/*` | the Platinum SCSS, which hosts and the `mirrored` Storybook package build on |
| `./classicy-platinum.css` | the package stylesheet |
| `./classicy-platinum.fonts.css` | the fonts stylesheet |

`sideEffects` lists the entry.

**`classicy` loses:**
- the `./appearance/platinum` and `./appearance/platinum/scss/*` exports and `dist/appearance-platinum.js`;
- `dist/classicy-platinum.css`, `dist/classicy-platinum.fonts.css` and the Platinum files in `dist/assets/`.

**Verification:**
- `verify:dist` for `classicy` inverts invariant 7: the entry bundles carry no package block and no Platinum art, fonts, wallpapers or sprites. It drops invariant 12 and the Platinum asset set.
- A new `verify:dist` in the Platinum package keeps the old checks, adapted.
- Both are wired into `build:source` and the gate.

**Strict CSP:** strict-CSP hosts link three files, in this order:
1. `classicy/dist/classicy.css`;
2. `@classicy/appearance-platinum/classicy-platinum.css`;
3. `@classicy/appearance-platinum/classicy-platinum.fonts.css`.

Those are the specifiers the exports table maps. A host that writes a plain `<link>` uses the files' real location, `node_modules/@classicy/appearance-platinum/dist/…`, and the README shows both forms.

### Tests, Storybook and the example (my call)
- **Core tests that assert Platinum behavior** (sprites, flash, look) keep importing Platinum, now as `@classicy/appearance-platinum` through the workspace. Tests about Platinum itself (its registration, `platinumAssets.*`, `hooks`, the art and font sets) move into the package with its own vitest config.
- **The test setup** (`src/__tests__/setup.ts`) does not register Platinum globally, so the stop screen and the core floor stay testable. A test that needs Platinum imports it.
- **Workspace cycle:** `classicy` would have `@classicy/appearance-platinum` as a devDependency while Platinum peer-depends on `classicy`. pnpm allows that cycle in a workspace. Confirm it builds in a clean CI checkout.
- **Storybook:** `storybook/.storybook/preview.tsx` imports `@classicy/appearance-platinum`. The `mirrored` package's SCSS uses `@classicy/appearance-platinum/scss/*`.
- **The example app** adds the dependency and the import in its entry. This is the reference for the README.

### Releasing (my call)
**Lockstep versions:**
- Both packages carry the same version.
- The version-bump step bumps both.
- The publish step publishes `classicy`, then `@classicy/appearance-platinum`.
- The wait loop checks both.

**The peer range:** `JS-DevTools/npm-publish` does not rewrite pnpm's `workspace:` protocol. Either write the real range (`^3.0.0`, decision 5) into the Platinum package's `peerDependencies` at bump time, or publish both with `pnpm publish -r`, which rewrites it. The builder picks one and proves it with `pnpm pack` and the packed `package.json`.

**Token:** the `NPM_TOKEN` secret must be allowed to publish `@classicy/*`. This is owner action, recorded in the release checklist.

### Docs
**README and `docs/AGENT-REFERENCE.md`:**
- the install line (`pnpm add classicy @classicy/appearance-platinum`) and the import;
- the stop screen;
- the moved strict-CSP stylesheets and SCSS export;
- `classicy/appearance/platinum` removed.

**`docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md`:** a breaking-change entry with the migration step, owner-approved like the rest of the note.

**CLAUDE.md:** the Theming, Build Notes and Common Commands sections. Change every "Platinum is always present" or "importing classicy registers Platinum" sentence. The program decision D14 in plan 0002-ldj is superseded by this design, so the amendment goes in the plan.

## Constraints

- **The full gate**, extended to build and verify the new package:
  ```
  pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build
  ```
- **CLAUDE.md rules still hold** inside the new package: no `!important`, no literal pixels or colors, cascade layers, asset files never inlined (except the halftone mask, ruling E17), quoted `url()`, American English.
- **Pixel parity.** Take a parity baseline at the start (`pnpm parity:shoot`, plus the `--mid` set), and compare AE 0 at the end for every story and the example app screens, with Platinum imported.
- **Committed history only.** No force-push, and nothing outside PR 333's branch.
- **Lands after 0117-qjd and 0118-qm6** (the ESLint removal and the minimatch override), which touch `package.json` and the lockfile.

## Left to the builder

- The exact shape of the core-floor module, and which knob families count as structural. Derive the list from what base stylesheets and components read, as `ClassicyAppearance.varCoverage.test.ts` already does.
- Whether build helpers live in a shared `bin/` module or move.
- The stop screen's markup and styling. It must render with no package registered, so it uses only base CSS or inline structural styles, and no Platinum look.
- How the test files split between core and the package: the 55 with imports, the roughly 25 that read Platinum files by path, and the 3 `vi.mock`s.

## Success

- A host with only `classicy` installed builds and shows the stop screen.
- Adding `@classicy/appearance-platinum` and its import gives a desktop pixel-identical to today.
- `dist/classicy.es.js` no longer contains the wallpapers, fonts, art, sprites or Platinum CSS. The report gives both packages' bundle and `dist/` sizes, measured from fresh builds before and after.
- Both packages publish from CI at the same version.
