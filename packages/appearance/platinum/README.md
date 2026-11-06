# @classicy/appearance-platinum

Platinum, the Mac OS 8 look, as an Appearance Package for
[Classicy](https://github.com/robbiebyrd/classicy). It holds Platinum's
stylesheet, its themes (21 presets), its art, cursors, fonts and wallpapers,
and its sound pack.

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

## Exports

- `.`: the package entry. Importing it registers Platinum. It also exports
  `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks` and
  `platinumSoundPack`.
- `./scss/*`: Platinum's SCSS (`mixins`, `scrollbars`, `assets`), for hosts
  and packages that build on its look. It uses the core's vocabulary as
  `pkg:@classicy/classicy/scss/*`, so compile it with Sass's
  `NodePackageImporter`.

## Developing

This package lives in the Classicy repository, at
`packages/appearance/platinum`. Its tests run against the workspace core's
source:

```sh
pnpm --filter @classicy/appearance-platinum exec vitest run
pnpm --filter @classicy/appearance-platinum exec vite build
```

The repository's `resources/` folder (the Apple Human Interface Guidelines
and reference art) sits beside this package's source. It is never published.

## License

This software is provided free and in the public domain under
[The Unlicense](https://unlicense.org/). See [LICENSE](LICENSE). Apple
maintains the copyright on the background patterns, icons and interface
components Platinum reproduces.
