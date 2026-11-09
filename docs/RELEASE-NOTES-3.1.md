# Release notes: 3.1

Screen savers now ship with Appearance Packages. These notes list every change
a host can see, measured from 3.0.x, with the step each breaking change needs.
The API is described in [`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) ("Screen
savers").

## Summary

The core keeps the Screen Saver mechanism (registry, overlay, control panel,
Control Strip module) and ships no saver. Platinum's twelve savers and the
Logo saver's registry moved to `@classicy/appearance-platinum`, and each saver
now names the Appearance Packages it is offered under. Only the active
package's savers are listed and run.

## Breaking change: saver names are exported by `@classicy/appearance-platinum`

A host that imports a saver or logo name from `@classicy/classicy` changes the
specifier to `@classicy/appearance-platinum`. The names are unchanged:

```diff
-import { registerClassicyScreenSaverLogo, ClassicyScreenSaverFish } from '@classicy/classicy'
+import { registerClassicyScreenSaverLogo, ClassicyScreenSaverFish } from '@classicy/appearance-platinum'
```

Removed from `@classicy/classicy`: every saver component, config schema and
options UI (`ClassicyScreenSaverBouncingBall`, `FishConfigSchema`, …),
`ClassicyScreenSaverBuiltIns`, the logo registry (`registerClassicyScreenSaverLogo`,
`getClassicyScreenSaverLogo`, `listClassicyScreenSaverLogos`,
`resolveClassicyScreenSaverLogo`, `useClassicyScreenSaverLogos`,
`unregisterClassicyScreenSaverLogo`, `CLASSICY_SCREEN_SAVER_LOGO_IDS`, …) and
`SCREEN_SAVER_DEFAULT_SAVER_ID`. There is no default saver id in the core any
more: see "Which saver runs" below. Persisted state keeps its shape
(`selectedSaver`, `saverConfigs`, `enabled`, `timeoutMinutes`); nothing
migrates.

`registerClassicyScreenSaver`, the registry read side and the actions stay in
`@classicy/classicy`. A host that imports Platinum at its entry (as 3.0 already
requires) gets the twelve savers registered, as before.

## New

- **`ClassicyScreenSaverDefinition.packages`**: the Appearance Package ids a
  saver is offered under. Absent or empty, it is offered under every package.
  Re-registering an id replaces the definition, `packages` included.
- **`ClassicyAppearancePackage.defaultScreenSaver`**: the id of the saver a
  package prefers when the user has not chosen one (Platinum: `bouncing-ball`).
- **Offer and resolution helpers** in `@classicy/classicy`:
  `isClassicyScreenSaverOffered`, `listClassicyScreenSaversFor`,
  `resolveClassicyScreenSaverFor`, `activeClassicyScreenSaverPackageId`,
  `subscribeClassicyScreenSavers` and `useClassicyScreenSavers`.
- **`ClassicyScreenSaverLogoDefinition.src`** is `string | (() => string)`. A
  function is read each time the logo draws, so a logo can follow the active
  package's icons: Platinum's `classicy` and `startup-screen` logos do.

## Which saver runs

The saver in effect is the stored choice when the active package offers it,
else the package's `defaultScreenSaver`, else the first offered saver in
registration order. The stored choice is never overwritten, so switching
packages and back restores it. With no saver offered the Screen Saver panel
says "This appearance has no screen savers.", Test and the Control Strip's
Sleep Now are disabled, and the overlay never activates. `SetSaver` and
`SetConfig` accept any registered saver, including one another package offers.

To offer a Platinum saver under your own package too, re-register it with both
ids:

```tsx
import { getClassicyScreenSaver, registerClassicyScreenSaver } from '@classicy/classicy'
import '@classicy/appearance-platinum'

const fish = getClassicyScreenSaver('fish')
if (fish) registerClassicyScreenSaver({ ...fish, packages: ['platinum', 'my-package'] })
```

## Other changes you may notice

- **Saver styles live in Platinum's package stylesheet**
  (`@layer classicy.package`), not the core's base layer, and saver art ships
  as files in Platinum's `dist/assets`. Reduced-motion pausing and the hidden
  pointer over a running saver still hold: Platinum's package layer carries
  its own reduced-motion pause rule after every saver (their `animation:`
  shorthands would otherwise beat the core's base-layer rule), no saver style
  sets `animation-play-state` or `cursor`, and the overlay also pauses
  animations from JS. A package that ships savers in its own layer must carry
  the same rule.
- **Platinum bundles its own zod**, as the core does, so both packages carry
  the zod their release was built with; `zod` stays in Platinum's
  `dependencies` for its type declarations. Platinum's ES bundle grows from
  about 170 KB to 291 KB raw (about 52 kB gzipped). The core's bundle shrinks
  by the savers' code.
- **`ClassicySchemaForm` identifies fields by zod's definition type** instead
  of `instanceof`, which also covers a second copy of zod whose class names
  differ.
- **Dist checks**: the core's `verify:dist` gains invariant 14 (no
  `classicySaver` name in the core's dist), and its invariant 5 also covers the
  saver images; Platinum's gains invariant 8 (production JSX).

## Install

Bump both packages together to 3.1.0, as in 3.0.
