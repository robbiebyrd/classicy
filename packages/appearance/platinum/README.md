# @classicy/appearance-platinum

Platinum, the Mac OS 8 look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). It holds Platinum's
stylesheet, its themes (21 presets), its art, cursors, fonts and wallpapers,
its sound pack and its twelve screen savers.

The core, `@classicy/classicy`, registers no Appearance Package. Without one,
`ClassicyDesktop` shows a message telling you to load one instead of the
desktop. Import this package once, at your app's entry, to register Platinum:

```ts
import "@classicy/appearance-platinum";
```

`@classicy/classicy` is a peer dependency. Install both, at the same version:

```sh
pnpm add @classicy/classicy @classicy/appearance-platinum
```

A host that auto-bumps its dependencies lists both names and moves them
together. The package ships its type declarations (`bundler`, `node16` and `nodenext`
resolution), so a named import type-checks:

```ts
import { platinumAppearanceHooks } from "@classicy/appearance-platinum";
```

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers Platinum. It also exports `PLATINUM_APPEARANCE_PACKAGE_ID`,
  `platinumAppearanceHooks`, `platinumSoundPack` and `platinumJson`.
- The screen savers, also exported from `.`: the twelve saver components
  (`ClassicyScreenSaverBouncingBall`, `FadeOut`, `Fish`, `FlyingToasters`,
  `Globe`, `HardRain`, `Logo`, `Messages`, `Messages2`, `Rainstorm`,
  `Spotlight`, `Warp`), their config schemas (`BouncingBallConfigSchema`,
  `FishConfigSchema`, ...) and options components
  (`ClassicyScreenSaverBouncingBallOptions`, `ClassicyScreenSaverLogoOptions`),
  and the Logo saver's registry: `registerClassicyScreenSaverLogo`,
  `unregisterClassicyScreenSaverLogo`, `getClassicyScreenSaverLogo`,
  `listClassicyScreenSaverLogos`, `useClassicyScreenSaverLogos`,
  `resolveClassicyScreenSaverLogo`, `CLASSICY_SCREEN_SAVER_LOGO_IDS`,
  `CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID` and the
  `ClassicyScreenSaverLogoDefinition` type. Platinum registers the savers
  under `packages: ["platinum"]` and names `defaultScreenSaver:
  "bouncing-ball"`.
- `./scss/*`: Platinum's SCSS (`mixins`, `scrollbars`, `assets`), for hosts
  and packages that build on its look. It uses the core's vocabulary as
  `pkg:@classicy/classicy/scss/*`, so compile it with Sass's
  `NodePackageImporter`.
  The package also ships `platinum.scss` and the saver partial
  `_screenSavers.scss`; they are not for host compilation (the first ships
  compiled, the second loads saver sheets that are not published).
- `./classicy-platinum.css` and `./classicy-platinum.fonts.css`: the look and
  the fonts as stylesheets, for hosts whose Content-Security-Policy blocks
  inline `<style>` (below).

Platinum's fonts, art, wallpapers and sound sprites are files in
`dist/assets/`, loaded as `new URL("assets/…", import.meta.url)`. A Vite host
keeps both packages out of the dev server's dependency pre-bundle, which
would break those URLs:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@classicy/classicy", "@classicy/appearance-platinum"],
  },
})
```

## Strict CSP

The package injects its look as `<style id="classicy-appearance-platinum">`
and its fonts as `<style id="classicy-fonts-platinum">`. Under a policy that
blocks inline `<style>`, link the three stylesheets first in `<head>`, in this
order: the core's, then this package's two.

```html
<link rel="stylesheet" href="/node_modules/@classicy/classicy/dist/classicy.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-platinum/dist/classicy-platinum.css">
<link rel="stylesheet" href="/node_modules/@classicy/appearance-platinum/dist/classicy-platinum.fonts.css">
```

Serve this package's `dist/assets/` beside them, and allow it in `font-src`.

Link the files rather than importing `classicy-platinum.fonts.css` through your
own bundler: Vite inlines the small Monaco font as a `data:` URL, which
`font-src 'self'` blocks. Linking (copied, or served from `node_modules`) is
recommended; otherwise set `build.assetsInlineLimit: 0` or allow
`font-src data:`.

## Developing

This package lives in the Classicy repository, at
`packages/appearance/platinum`. Its tests run against the workspace core's
source. Its build needs the core's built declarations, so build the core
first (the root `pnpm build:source` builds both, in order); `build` runs the
package's dist check, `bin/verify-dist.mjs`, after `vite build`:

```sh
pnpm --filter @classicy/appearance-platinum exec vitest run
pnpm --filter @classicy/appearance-platinum build
```

The repository's `resources/` folder (the Apple Human Interface Guidelines
and reference art) sits beside this package's source. It is never published.

## License

This software is provided free and in the public domain under
[The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE). Apple
maintains the copyright on the background patterns, icons and interface
components Platinum reproduces.
