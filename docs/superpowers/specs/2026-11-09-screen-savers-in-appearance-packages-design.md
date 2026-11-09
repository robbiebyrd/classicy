# Screen savers ship with Appearance Packages

Status: draft, 2026-11-09. Follows the Platinum split (plan 0014-ahm, design
`2026-11-05-platinum-appearance-package-design.md`).

## Intent

Since 3.0.0 the core (`@classicy/classicy`) registers no look of its own:
Platinum's art, sounds, fonts, cursors and wallpapers live in
`@classicy/appearance-platinum`. The screen savers are the exception. The
twelve After Dark ports under `src/SystemFolder/Extensions/ScreenSaver/savers/`
and their art ship in the core, and the core registers them itself
(`ClassicyScreenSaver.tsx` imports `savers/ClassicyScreenSaverBuiltIns`).

The owner wants the savers to be content an Appearance Package provides, like
its other content. The core keeps the machinery. Platinum ships the savers.

## Goals

1. **The core keeps the mechanism, and no saver.** It keeps the Screen Saver
   extension (idle detection, overlay, waking, reduced-motion pausing, the
   hidden pointer), the Screen Saver control panel, its Control Strip module,
   the `ClassicyAppScreenSaver*` actions, `registerClassicyScreenSaver` and
   the options-form machinery (`ClassicyScreenSaverConfigForm`). Nothing the
   core's entry reaches defines or registers a saver.
2. **Platinum ships the twelve savers,** with their components, config
   schemas, custom options UIs, art and styles, and the Logo saver's logo
   registry and its three built-in logos. It registers them when it loads, as
   it does its other assets.
3. **Savers follow the active package.** A saver registration may name the
   packages it is offered under: `packages?: string[]`, Appearance Package
   ids. The control panel lists, and the overlay draws, only savers offered
   under the active (resolved) package. A saver that names **no** packages is
   offered under **every** package, so every existing host call keeps working.
   Platinum registers its savers with `packages: ["platinum"]`.
4. **Each package names its default saver.** A new optional field on the
   Appearance Package, `defaultScreenSaver?: string`, a saver id. Platinum's
   is `bouncing-ball`. The core's `SCREEN_SAVER_DEFAULT_SAVER_ID` constant,
   which names a Platinum saver, goes.
5. **The user's choice is never overwritten.** `selectedSaver` stays as
   stored. Whenever it is not offered under the active package (unset, a
   saver of another package, or unregistered), the overlay and the control
   panel use the active package's `defaultScreenSaver` instead, if that is
   offered. Switching back to a package that offers the stored choice
   restores it.
6. **A package with no savers is a supported state.** The list is empty, the
   control panel says so, and the overlay draws nothing.
7. **Platinum users see no change.** With Platinum active, the list, the
   selected saver, every saver's look and motion, its options and the stored
   state are as in 3.0.0.

## Non-goals

- Changing any saver's look, motion, options or config schema.
- Per-theme (preset) savers: savers belong to a package, not to one of its
  themes.
- New savers, or savers for any other package.
- The Appearance Manager's `resources/` images (dropped from this work by the
  owner).

## Anti-goals

- A core that still imports, bundles or names a saver, its art, or a
  Platinum saver id (`bouncing-ball`, `berkeley-systems`, …). The core's
  import-graph test and `verify:dist` must keep proving it.
- Rewriting the stored `selectedSaver` or `saverConfigs` on a package switch,
  or on load.
- A saver that renders differently, or not at all, under a package it names
  because its styles depend on the package's scope.

## Constraints

- **Release: a 3.x minor** (the owner's decision). Removing the saver exports
  from `@classicy/classicy` is breaking for a host that imports one, so the
  release notes list it as a breaking change with its migration (import from
  `@classicy/appearance-platinum`). No commit message may contain
  `BREAKING CHANGE`: `push.yml` bumps the major version on that phrase. Use
  `feat:` for the minor bump.
- Platinum imports the core only as `@classicy/classicy`
  (`PlatinumSourceImports.test.ts`). Anything a saver imports from the core
  today by `@/…` path must be a public export of the core, or move with it.
- Persisted state keeps its shape and bytes: `selectedSaver`, `saverConfigs`,
  `enabled`, `timeoutMinutes`. No migration is needed.
- The repo's gates hold. The pixel-literal gate, the literal-color sweep and
  the vocabulary coverage test exempt the savers by the path
  `Extensions/ScreenSaver/savers/` today, and those exemptions follow the
  savers to their new path. Platinum's `verify:dist` lists its `dist/assets`
  exactly, so the saver art joins that list. The core's `verify:dist` must
  show the art gone from the core's `dist`.
- `package.json` `sideEffects` (both packages) lists the modules that
  register savers and logos, so tree-shaking never drops a registration.

## Decided by the owner

- Savers come from the Appearance Package, and Platinum ships them.
- Only the active package's savers are offered, with no fallback to another
  package's.
- A saver can name one or more packages. One that names none is offered under
  every package.
- Each package names its default saver. The stored choice is never
  overwritten, and the package default stands in when it isn't offered.
- Ship as a 3.x minor, with the move in the release notes as a breaking
  change.

## My calls (the owner can overrule)

- **The field names** `packages` (on a saver) and `defaultScreenSaver` (on a
  package).
- **The Logo saver's registry moves with it.** `registerClassicyScreenSaverLogo`,
  `CLASSICY_SCREEN_SAVER_LOGO_IDS` and the rest become Platinum's exports,
  since only Platinum's Logo saver reads them. Its `classicy` and
  `startup-screen` logos read their images through the asset registry, not a
  module-level capture of `ClassicyIcons`.
- **Every saver export moves to `@classicy/appearance-platinum`** under its
  current name, so migrating is a change of import specifier only.
- **With no saver offered, the idle timer does not activate the overlay,**
  and the `ClassicyAppScreenSaverActivate` action does nothing, rather than
  covering the screen with an empty overlay.
- **The empty control panel** shows a short message in place of the list,
  wording left to the builder, in American English. The Control Strip
  module's "Activate" item is disabled when no saver is offered.
- **Saver styles stay keyed on the saver** (its root class and keyframes,
  `classicySaver*`), not on the package's
  `.classicyDesktop[data-classicy-appearance="…"]` scope. A saver another
  package also names then renders the same there. They still compile into
  Platinum's bundle, so the core's CSS carries none.
- **Register-time warnings:** a `defaultScreenSaver` that names an
  unregistered or non-offered saver logs one `classicyLog` warning per
  package, and the package registers anyway.
- **One zod for the schemas.** The core bundles its own zod, and the options
  form and `ClassicySchemaForm` identify fields with `instanceof z.ZodObject`,
  `z.ZodNumber` and the rest. A Platinum saver's schema built with a second
  zod copy would fail every check, and the derived options form for seven
  savers would render nothing in a real install, while source-aliased tests,
  Storybook and the dev server stay green. The fix: the form and its field
  helpers identify a schema by its zod definition type (`def.type`: `object`,
  `number`, `boolean`, `enum`, `string`, `optional`, `default`, `nullable`,
  `readonly`), not by `instanceof`. Platinum declares `zod` at the core's
  range, since its saver schemas and their declarations import it. A test
  builds a saver schema with a separate zod instance and proves the form
  renders its fields.
- **Saver styles live in Platinum's one package stylesheet.** Platinum's
  build has a single CSS path (`styles/platinum.scss?inline`, one
  `@layer classicy.package` block, also emitted as `classicy-platinum.css`).
  The saver rules join that sheet, written outside the `classicy-package()`
  scope mixin and keyed on their own classes and keyframes. No second
  stylesheet, no new injection API and no new dist file. That moves them from
  `classicy.base` to `classicy.package`, so they now beat the overlay's base
  rules. The overlay's reduced-motion pause and hidden pointer must still
  hold: a test proves no saver stylesheet sets `animation-play-state` or
  `cursor`. The JS pause (`usePauseForReducedMotion`) covers every running
  and later-started animation, and the docs describe the guarantee as it then
  stands.
- **Re-registering a saver id replaces it,** `packages` included, as
  `registerClassicyScreenSaver` is documented to do today. To offer
  Platinum's saver under another package as well, a host re-registers it
  from Platinum's exported definition with both ids, `packages: ["platinum",
  "mine"]`. The docs show that pattern.
- **Logo images resolve at render.** `ClassicyScreenSaverLogoDefinition.src`
  widens to `string | (() => string)`, which is additive and existing callers
  keep working. The `classicy` and `startup-screen` logos pass a function
  that reads the asset registry, and the Logo saver calls it when it draws.
  Platinum's own logo art (`logo.webp`) stays a plain import.
- **When there is no effective saver:** if the stored choice isn't offered
  and the package names no offered default, the first offered saver in
  registration order is used. Only when no saver is offered at all does the
  idle timer never activate, and `Activate` does nothing.
- **Dispatches for a registered saver that isn't offered**
  (`SetSaver`, `SetConfig`) are accepted and stored, consistent with "the
  choice is never overwritten." An unregistered id is still refused, as
  today.
- **Release notes:** a new `docs/RELEASE-NOTES-3.1.md` holding the breaking
  saver-export move and its migration. `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md`
  stays 3.0.0's record. The README's upgrade section links the new file.

## Left to the builder

- Where each saver lives under `packages/appearance/platinum/src/`, and how
  the "offered under the active package" filter is shared between the
  overlay, the control panel and the Control Strip module (one store-free
  helper, in the style of `resolveClassicyAppearancePackage`).
- Whether the saver registry stays one list that filters, or keys by package.
  The observable rules above are what count.
- How tests that used the built-ins (`ClassicyScreenSaver.test.tsx`, the
  control panel's, the config form's, the Control Strip module's) get savers:
  test-only fakes registered in the test, or `import "@/__tests__/withPlatinum"`
  where the Platinum savers themselves are the subject.
- Story placement: the saver stories move with the savers, and Storybook
  imports Platinum by name as it already does.
- Docs: CLAUDE.md's Screen Saver section, `docs/AGENT-REFERENCE.md`, the
  README if it names a saver export, and the release-note entry.

## How we'll know it worked

- With Platinum active: parity shots of the Screen Saver control panel and of
  each saver match 3.0.0, and the stored state's bytes are unchanged.
- The core's `dist` holds no saver art, styles or ids. Platinum's holds them,
  each asset byte-identical to its source.
- A test package registering one saver for itself shows only that saver,
  falls back to its own default, and leaves `selectedSaver` as stored. A
  package with none shows the empty panel and never activates.
- A host saver with no `packages` appears under every package.
- In a packed-package install (`verify:host-types` style, two zod copies), a
  Platinum saver's options form renders its fields.
- The full gate is green, including Platinum's own build and `verify:dist`.
