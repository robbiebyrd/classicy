# @classicy/appearance-system7

System 7, the classic Mac OS look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). One package, two themes:

- **System 7**: black and white, 1-bit, drawing the package's `bw` asset
  variant, with dimmed text and dotted rules dithered.
- **System 7 Color**: the Standard lavender window colors, true gray, and the
  package's color art.

The package is being built: it registers its themes, layout, fonts and sound
pack today, and its look, art, cursors, alert sounds and screen savers land
element by element. Until its art is registered, Classicy draws the default
package's art (Platinum's, when a host also loads Platinum) and the core's
icons.

The core, `@classicy/classicy`, registers no Appearance Package. Import this
package once, at your app's entry, to register System 7:

```ts
import "@classicy/appearance-system7";
```

`@classicy/classicy` is a peer dependency. Install both, at the same version:

```sh
pnpm add @classicy/classicy @classicy/appearance-system7
```

A host may load System 7 alone or beside Platinum
(`@classicy/appearance-platinum`); the Appearance Manager switches between
them. The package ships its type declarations (`bundler`, `node16` and
`nodenext` resolution).

## Exports

- `.`: the package entry (ES and UMD bundles, with types). Importing it
  registers System 7. It also exports `SYSTEM7_APPEARANCE_PACKAGE_ID`,
  `system7Json` (the themes, layout and knobs, typed with the core's types)
  and `system7SoundPack`.
- `./scss/*`: the package's SCSS (`system7.scss`, which ships compiled and is
  not for host compilation).
- `./classicy-system7.css` and `./classicy-system7.fonts.css`: the look and
  the fonts as stylesheets, for hosts whose Content-Security-Policy blocks
  inline `<style>` (below).

The fonts are Chicago (ChicagoFLF) and Geneva, byte-identical copies of
Platinum's faces. They and the sound sheet are files in `dist/assets/`,
loaded as `new URL("assets/…", import.meta.url)`. A Vite host keeps the
packages out of the dev server's dependency pre-bundle, which would break
those URLs:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@classicy/classicy", "@classicy/appearance-system7"],
  },
})
```

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

## License

This software is provided free and in the public domain under
[The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE). Apple
maintains the copyright on the interface components System 7 reproduces.
