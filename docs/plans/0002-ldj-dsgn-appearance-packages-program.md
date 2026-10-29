---
id: 0002-ldj
title: 'Appearance Packages: program design and shared contract'
type: dsgn
status: in_progress
priority: "2"
effort: XL
created: "2026-10-28T18:07:39.758Z"
updated: "2026-10-28T23:31:30.980Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
    - ./docs/superpowers/specs/2026-10-27-theme-metrics-design.md
  plans:
    - ["0001-1t9", "depends"]
    - ["0000-aud", "included"]
---

# Appearance Packages: program design and shared contract

## Summary

**Goal:** Classicy ships a Platinum Appearance Package and the machinery for a second package (Windows 3.11, IRIX) to replace every look, asset, sound, cursor, font and part arrangement at runtime, with no `!important`, no literal pixels and no literal colors anywhere in Classicy's own styles.

**Problem:** `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) §1–§6 found the Platinum look baked into the wrong layers: fixed SCSS multipliers and compile-time bevel mixins, base64 SVG art with baked hex, a shallow-merge icon registry and 39 module-scope asset captures, a sound manager that ignores the theme, JSX-fixed part order, 158 `!important`s and 333 pixel literals. Owner decisions D1–D24 (§7) and the target architecture (§8) are settled; §9 lists nine phases. Phase 0 (plan 0001-1t9) is merged. The remaining eight phases are too large for one plan and several can run concurrently.

**Approach:** This design plan is the program's single source of names. It splits §9 into ten implementation plans (parts A–J), each a mind-palace plan linked back here with `parent`, and records the dependency graph so parts can be scheduled concurrently or consecutively. Every cross-part identifier (file path, export name, signature, CSS variable, attribute, store key, action type) is pinned in the Shared Contract below; part plans must use these names verbatim and may add names only inside their own files. **Where a part plan and this contract disagree, the "Contract amendments" section wins**: it was written after all ten parts and reconciles them. Each part plan is further broken into stories (one per plan section, chained with `depends` links in execution order); see the table at the end.

---

# Part 1 — Design

## Current State

See `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) §1–§6 (findings) and §8 (target architecture); this plan does not restate them. Delta since the audit was written: plan 0001-1t9 landed on `main` (commits "refactor(theme): drop the deprecated --hig-* aliases outright" through "fix(theme): complete metric groups on themes handed to ClassicyDesktopLoadThemes"): `--hig-*` is gone, `measurements.<family>` inputs exist (`ClassicyThemeMetrics.ts`), `CLASSICY_THEME_METRIC_TARGETS` and `ClassicyDesktopChangeMetric` exist, title bar reads `--window-title-bar-height`. The screenshot parity procedure from that plan (Storybook `iframe.html?id=<id>&viewMode=story` at 1024×768, ImageMagick `compare -metric AE`) is the regression gate reused by every part below; its output lives in `.playwright-mcp/parity/` (gitignored), so each part re-shoots its own `before/` set at its start.

## Decisions

- **One design plan plus ten implementation plans (A–J), not one plan** — Owner asked to reduce size and allow concurrent work. Parts are cut where a reviewer could accept one while rejecting its neighbor and where file sets do not overlap.
- **The vocabulary is names and tokens, not look mixins**: component root/part/state class names, part attributes, CSS custom properties (theme tokens plus `--classicy-art-*` and `--classicy-cursor-*`), and SCSS helpers. Look lives only in a package's own scoped CSS — Refines audit §8.1. A SCSS mixin is compile-time, so it cannot dispatch to a package that is chosen at runtime (D15). Base CSS therefore holds structure only; a package's CSS targets the vocabulary classes under its root-attribute scope. The audit's test holds: with no package registered every component still lays out and is merely unstyled.
- **Parts C and D register under the string constant `"platinum"` before the package module exists** — Lets registries (C, D) land concurrently with the package core (B); B only has to call what C and D already export.
- **Each part re-shoots its own parity baseline on its first day and must end pixel-identical for Platinum unless its plan names the visual change** — Nine phases of mechanical rewrites; a per-part gate localizes regressions.
- **Breaking changes allowed everywhere (D16): `platinum*` mixin names, `registerClassicyIcons` shape, `sound.name`, theme-file layout** — Owner decision; no alias bridges are written.
- **Package CSS may hold `--platinum-*` design constants; Classicy base CSS may not hold literals** — D10 forbids hard-coded colors in Classicy. A package *is* the look, so its CSS may define constants (e.g. stripe grays) as package-private custom properties, derived from theme tokens with `classicy-tint`/`classicy-shade` wherever the value is arithmetically reachable.
- **One story per plan section, chained** — A story is the unit of tracked work; a plan section is already the smallest independently testable deliverable, so they map one to one. Phase 0 (parity baseline) and a trailing checklist-only phase get their own story, or fold into the neighboring section's story when that section already does the parity re-shoot.

### Rejected alternatives

- **One plan with nine phases** — Too large to review; serializes work that has no shared files (registries, sound packs, colors).
- **Packages as lazily fetched JSON/CSS bundles** — D15: compiled in, switched at runtime.

## Design

### Shared Contract — directories and exports

- `src/Appearance/` is Classicy-owned package machinery and the vocabulary. `src/Appearance/Platinum/` is the Platinum package (D22). Future packages: `src/Appearance/<Package>/`.
- `src/Appearance/vocabulary/ClassicyVocabulary.json` (hand-edited source) → generated `src/Appearance/vocabulary/ClassicyVocabulary.ts` and `src/Appearance/vocabulary/_vocabulary.scss` by `bin/generate-vocabulary.ts` (Node 24 runs `.ts` natively), run by the `generate-barrels` script before barrelsby, with a `--check` mode for CI. Generated files carry a `// generated — do not edit` header and are committed.
- SCSS helper modules (hand-written, Classicy-owned): `src/Appearance/vocabulary/_color.scss` (`classicy-tint`, `classicy-shade`, `classicy-alpha`), `src/Appearance/vocabulary/_package.scss` (`classicy-package` mixin), `src/Appearance/vocabulary/_layout.scss` (structural mixins only: `classicy-no-select`, `classicy-px-rect`).
- `package.json` exports: `"./scss/*": "./src/Appearance/vocabulary/*"` (replaces the current path); `"./appearance/platinum": "./src/Appearance/Platinum/index.ts"` (JS, listed in `sideEffects`); `"./appearance/platinum/scss/*": "./src/Appearance/Platinum/styles/*"` (SCSS for hosts that extend Platinum); `files` includes `src/Appearance`. Part A adds a temporary `"./scss-platinum/*"` export pointing at today's `styles/` so the example app keeps building until Part B replaces it.
- `src/index.ts` stays barrel-generated; new modules are picked up by barrelsby, never hand-added. **`.ts-barrel.json` `noHeader` becomes `false`** (Part B): with `noHeader: true` barrelsby's purge deletes every `index.ts` under `src`, which would delete `src/Appearance/Platinum/index.ts`.

### Shared Contract — vocabulary names (part A owns, everyone consumes)

- Root class `classicy<Component>`; part class `classicy<Component><Part>`; both unchanged from today where they already exist. `ClassicyVocabulary.json` maps each component name to its root class, so `CLASSICY_COMPONENT.Tabs === "classicyTabContainer"` where the root class does not follow the pattern. Part I adds any component names it needs that Part A did not list.
- **Shared state classes (D20), bare, beside the root**: `active`, `inactive`, `disabled`, `selected`, `pressed`, `focused`, `hover`, `collapsed`, `open`, `dragging`, `error`, `default`, `checked`, `mixed`, `expanded`. TS: `CLASSICY_STATE` (`as const` object, `CLASSICY_STATE.pressed === "pressed"`), `type ClassicyState = keyof typeof CLASSICY_STATE`, `classicyStateClasses(states: Partial<Record<ClassicyState, boolean>>): string` (joins truthy states with a space). SCSS: `$classicy-states` list, `@function classicy-state($name)` returning `".#{$name}"` and erroring on unknown names. The generator rejects a state name equal to any root or part class. Recorded mappings: Tabs use `selected` (not `active`); a BevelButton with its pop-up open is `open` (replaces the `[aria-expanded]` selector); `classicyButtonKeyActive` stays as a part class beside `pressed`.
- Component names: `CLASSICY_COMPONENT` (`as const`), `type ClassicyComponentName = keyof typeof CLASSICY_COMPONENT`.
- Part attributes, with constants in `CLASSICY_PART_ATTRIBUTE` (generated): `data-classicy-control="close" | "zoom" | "collapse"` on window control boxes; `data-classicy-role="default" | "cancel" | "other"` on alert buttons; `data-classicy-part="<part>"` where a part needs addressing without a class (menu-bar clusters: `apple`, `app`, `help`, `switcher`, `extensions`, `clock`; keyboard modifiers: `modifier-<name>`). `ClassicyMenuItem` gains `part?: string`, rendered as `data-classicy-part` (Part A; Part F adds it if A did not reach the menu bar).
- Root attribute: `data-classicy-appearance="<packageId>"` on `.classicyDesktop`, and on the Storybook non-desktop frame so Controls/* stories keep the Platinum look.
- Cascade layers, declared once by `bin/classicyStyleInjector.ts` before any rule: `@layer classicy.base, classicy.package, classicy.user;`. All Classicy component SCSS compiles into `classicy.base` (wrapped by `bin/classicyCssLayerPlugin.ts` for Vite build, dev and Storybook); package CSS into `classicy.package`. Host-facing consequence, documented in `docs/AGENT-REFERENCE.md`: layered Classicy rules lose to any unlayered host CSS of the same selector; hosts that want to override use `@layer classicy.user` or unlayered rules.

### Shared Contract — package module (part B owns)

File `src/Appearance/ClassicyAppearancePackage.ts`:
```ts
export type ClassicyAppearanceLayout = {
  window: { growBoxCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left" }
  menuBar: { placement: "screen" | "window" }
  desktop: { iconGridOrigin: "top-right" | "top-left" | "bottom-right" | "bottom-left" }
}
export type ClassicyAppearancePackage = {
  id: string                       // kebab-case, e.g. "platinum"
  name: string
  css: string                      // compiled, already scoped under [data-classicy-appearance=id]
  defaults: ClassicyTheme          // the package's default theme (color/typography/measurements/desktop/sound)
  presets?: ClassicyTheme[]        // D24: Platinum's 21 built-ins
  knobs?: ClassicyAppearanceKnobs  // UI metadata per measurements family/key: { label, min, max, default }
  options?: z.ZodObject<any>       // built from knobs by classicyKnobsToSchema(knobs)
  layout: ClassicyAppearanceLayout
  assets?: Partial<Record<ClassicyAssetKind, ClassicyAssetTree>>
  sounds?: ClassicySoundPack[]
  hooks?: ClassicyAppearanceHooks
}
export const registerClassicyAppearancePackage: (pkg: ClassicyAppearancePackage) => void  // re-register same id replaces
export const getClassicyAppearancePackage: (id: string) => ClassicyAppearancePackage | undefined
export const listClassicyAppearancePackages: () => ClassicyAppearancePackage[]   // registration order
export const subscribeClassicyAppearancePackages: (listener: () => void) => () => void
export const useClassicyAppearancePackages: () => ClassicyAppearancePackage[]    // useSyncExternalStore
export const useActiveClassicyAppearancePackage: () => ClassicyAppearancePackage  // active → "platinum" → CLASSICY_FALLBACK_APPEARANCE_PACKAGE
export const CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID = "platinum"
export const CLASSICY_FALLBACK_APPEARANCE_PACKAGE: ClassicyAppearancePackage   // id "platinum", css "", Platinum defaults/layout, no hooks — for lone-component tests
export const resetClassicyAppearancePackagesForTests: () => void
```
`ClassicyAssetSource` and `isClassicyAssetSource` live in **`src/Appearance/ClassicyAssetSource.ts`** (Part C creates it; if Part B lands first it creates the same file with the same content). `ClassicyAppearancePackageSchema` (zod) in `src/Appearance/ClassicyAppearancePackageSchema.ts` validates everything but `css`, `options`, `hooks`.

Store and actions: `System.Manager.Appearance.packageId: string` (default `"platinum"`, persisted) is the source of truth for the active package; `theme.package` records which package a theme was authored for. `ClassicyDesktopChangeAppearancePackage { packageId }` sets `packageId` and, when `activeTheme.package !== packageId`, activates a clone of the package's `defaults` (`availableThemes` untouched); unregistered ids are rejected with `classicyLog("warn", …)`. `ClassicyDesktop` writes `data-classicy-appearance={packageId}`. Theme JSON gains `package: string` (zod default `"platinum"`); theme files carry it; `ClassicyDesktopImportTheme` and `readClassicyTheme` refuse an unregistered package id through `Desktop.errorDialog` (the existing error-dialog state).

Style injection: `injectClassicyAppearanceStyles(id: string, css: string): void` in `src/Appearance/ClassicyAppearanceStyles.ts` writes `<style id="classicy-appearance-<id>">` after `#classicy-styles`, idempotent, no-op without `document`. Registration calls it. The "every rule is scoped under the root" test exempts keyframe step selectors. Under vitest `*.scss?inline` resolves to `""`, so compiled-CSS assertions call the sass API directly.

Platinum: `src/Appearance/Platinum/index.ts` (side-effect import that registers; builds `options` with `classicyKnobsToSchema`), `src/Appearance/Platinum/platinum.json` (`id`, `name`, `defaults` incl. `defaults.measurements.<family>` knob values, `presets`, `layout`, `knobs`), `src/Appearance/Platinum/styles/platinum.scss` compiled via Vite `?inline` into `css`, wrapped by `@include classicy-package("platinum") { … }` which emits `@layer classicy.package { .classicyDesktop[data-classicy-appearance="platinum"] { … } }`. Platinum mixins keep their bodies but are renamed `platinum-*` and live in `src/Appearance/Platinum/styles/_mixins.scss`, `_scrollbars.scss`, `_assets.scss`; per-component look rules live in `src/Appearance/Platinum/styles/components/_<Component>.scss` (the Control Strip's three local bevel mixins move to `_ControlStrip.scss` there). `ClassicyDesktop` imports `@/Appearance/Platinum` so Platinum is always present (D14).

### Shared Contract — asset registries (part C owns)

File `src/Appearance/ClassicyAssetRegistry.ts`:
```ts
export type ClassicyAssetKind = "icons" | "cursors" | "wallpapers" | "fonts" | "systemArt"
export type ClassicyAssetTree = { [key: string]: ClassicyAssetSource | ClassicyAssetTree }
export const registerClassicyAssets: (kind: ClassicyAssetKind, packageId: string, tree: ClassicyAssetTree) => void // deep merge into that package's namespace
export const resolveClassicyAsset: (kind: ClassicyAssetKind, path: string, packageId?: string) => ClassicyAssetSource | undefined // dotted path; active package → "platinum" → undefined
export const subscribeClassicyAssets: (listener: () => void) => () => void
export const useClassicyAsset: (kind: ClassicyAssetKind, path: string) => ClassicyAssetSource | undefined
export const useClassicyAssetTree: (kind: ClassicyAssetKind) => ClassicyAssetTree // merged view for the active package; "fonts" keys are family names, "wallpapers" keys are wallpaper names
```
Until Part B lands, "active package" is read from `getActiveClassicyAppearancePackageId()` in the same file, a placeholder returning `"platinum"` that Part B replaces with the store value.

Kind-specific wrappers: `registerClassicyIcons(tree, packageId = "platinum")` → `registerClassicyAssets("icons", …)` (deep-merging; the existing `ClassicyIcons` constant remains the Platinum tree and is what Platinum registers); `registerClassicyCursors(packageId, Partial<Record<ClassicyCursorRole, ClassicyAssetSource>>)` with `type ClassicyCursorRole = "arrow" | "watch" | "hand" | "ibeam" | "crosshair" | "resizeLr" | "resizeUd" | "resizeNwse" | "resizeNesw" | "resizeU" | "resizeD" | "resizeL" | "resizeR"` (roles with no Platinum file stay unregistered; `resolveClassicyAsset` returns `undefined` and CSS falls back to `auto`); `registerClassicyWallpapers(packageId, Array<{ name: string; src: ClassicyAssetSource }>)`; `registerClassicyFonts(packageId, Array<{ family: string; src: ClassicyAssetSource | ClassicyAssetSource[]; weight?: string; style?: string }>)` (array = fallback sources in order) which writes `<style id="classicy-fonts-<packageId>">` with `@font-face`; the `classicy/fonts` export becomes a no-op shim and `dist/fonts.css` is removed; `registerClassicySystemArt(packageId, Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>)`.

`ClassicySystemArtKey` (defined in `ClassicyAssetRegistry.ts`; Part E extends it in place): `appleMenu`, `sadMac`, `startupLogo`, `trashEmpty`, `trashFull`, `aliasBadge`, `helpButton`, `aboutLogo`, `aboutBackground`, `windowStripes`, `windowStripesRed`, `windowUtilityShade`, `windowUtilityHighlight`, `titleBarCapLeft`, `titleBarCapRight`, `titleBarCapLeftRed`, `titleBarCapRightRed`, `windowGrip`, `windowDither`, `zoomGlyph`, `collapseGlyph`, `submenuArrow`, `popupArrows`, `sliderThumb`, `sliderThumbRect`, `sliderStrikes`, `tabOutline`, `halftone`, `halftoneLarge`, `quickTimeThumbSlider`, `quickTimeVolumeSlider`, `controlStripTab`, `controlStripCollapse`, `controlStripScrollLeft`, `controlStripScrollLeftDisabled`, `controlStripScrollRight`, `controlStripScrollRightDisabled`, `controlStripModuleArrow`, `popUpSliderTrack`, `popUpSliderThumb`, and the optional glyph keys `menuCheck`, `menuDash`, `triangle`, `downArrow` (Platinum renders those as `::before` text content for pixel parity; another package may register art). Dropped: `startupWordmark` (text, not art), `paradeDefault` (eleven icons; stays in the icon tree). Pixel-art rows are encoded as `data:text/x-classicy-pixel-art,<rows>` so they fit `ClassicyAssetSource`; `ClassicyPixelArt` decodes them.

All Platinum registration calls live in **`src/Appearance/Platinum/assets/platinumAssets.ts`** (Part C creates it; Part E adds entries there, importing its data modules `platinumArt.ts` / `platinumPixelArt.ts`).

CSS exposure: `useClassicyAssetVars(): Record<string, string>` returns `--classicy-cursor-<role>` and `--classicy-art-<key>` (kebab-cased) as `url("…")` strings for the active package; `ClassicyDesktop` spreads them onto the root style beside the theme vars. SCSS reads `var(--classicy-art-window-grip)` etc.

Bundling: Vite lib mode inlines every asset regardless of `assetsInlineLimit` (`shouldInline` returns true for `build.lib`), so Part C adds a `resolveId` plugin that appends `?no-inline` to asset imports under `src/Appearance/`; `verify:dist` is adjusted accordingly.

Read-side rule: no module-scope `const x = ClassicyIcons.a.b` captures; components call `useClassicyAsset` or `resolveClassicyAsset` at render/handler time.

### Shared Contract — sound packs (part D owns)

File `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts`:
```ts
export type ClassicySoundPack = SoundData & { id: string; name: string; packageId?: string }  // SoundData from ClassicySoundSchema (src: string[] of URLs, sprite map); SoundDataSchema becomes z.looseObject
export const ClassicySoundPackSchema: z.ZodType<ClassicySoundPack>
export const registerClassicySoundPack: (pack: ClassicySoundPack) => void  // validates; re-register replaces
export const getClassicySoundPack: (id: string) => ClassicySoundPack | undefined
export const listClassicySoundPacks: () => ClassicySoundPack[]
export const subscribeClassicySoundPacks: (listener: () => void) => () => void
export const useClassicySoundPacks: () => ClassicySoundPack[]
export const CLASSICY_SOUND_SPRITE_IDS: readonly string[]   // the 41 sprite ids (dispatched from ~140 sites); the contract a pack must satisfy
```
Theme JSON: `sound.pack: string` replaces `sound.name` (zod `refine` consults `getClassicySoundPack` at parse time); persisted `sound.name` is healed by `migrateClassicyState` (shape-detecting); theme files with `sound.name` are refused (D16). `ClassicySoundLoad`'s payload becomes `{ pack }`. `ClassicySoundManagerProvider` boots from `activeTheme.sound.pack` and reloads the Howl when it changes; a sprite id missing from the active pack falls back to the `platinum` pack; volume is re-applied. `ClassicySounds` (the mutable record) is deleted; Platinum's pack is `src/Appearance/Platinum/assets/sounds/platinum.ts` and is registered by part D under id `"platinum"` until part B moves the call into the package. `bin/make_audio_sprites.sh` writes `src: ["./<name>.ogg", …]` (relative) and `id`/`name` into the pack JSON. Changing the pack from the control panel goes through `ClassicyDesktopChangeAppearanceOption { path: "sound.pack", value }` (Part J).

### Shared Contract — appearance hook and events (part I owns; part B creates the types)

File `src/Appearance/useClassicyAppearance.ts` (types in `src/Appearance/ClassicyAppearancePackage.ts`):
```ts
export type ClassicyAppearanceEvent = "mount" | "unmount" | "press" | "release" | "click" | "open" | "close" | "focus" | "blur" | "collapse" | "expand" | "zoom" | "select" | "change" | "dragStart" | "dragEnd"
export type ClassicyAppearanceDecoration = { className?: string; style?: CSSProperties; attrs?: Record<string, string> }
export type ClassicyAppearanceContext = { component: ClassicyComponentName; event: ClassicyAppearanceEvent; element: HTMLElement | null; state: Partial<Record<ClassicyState, boolean>>; detail?: unknown }
export type ClassicyAppearanceHandler = (ctx: ClassicyAppearanceContext) => ClassicyAppearanceDecoration | void
export type ClassicyAppearanceHooks = {
  decorate?: (component: ClassicyComponentName, state: Partial<Record<ClassicyState, boolean>>) => ClassicyAppearanceDecoration | undefined
  on?: Partial<Record<ClassicyComponentName, Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>>>>
}
export const useClassicyAppearance: <E extends HTMLElement>(component: ClassicyComponentName, state: Partial<Record<ClassicyState, boolean>>, ref?: RefObject<E | null>) => { className: string; style?: CSSProperties; attrs: Record<string, string>; emit: (event: ClassicyAppearanceEvent, detail?: unknown) => void }
```
`className` = state classes (from `classicyStateClasses`) + `decorate()` className + the last decoration returned from `emit`. D23 semantics: a handler returning `void` keeps the previous decoration; returning `{}` clears it; returning a decoration replaces it on the next render. Without an active package hook the hook is a pure function of `state`. Handlers play sounds through `playClassicyAppearanceSound(sound, { interrupt? })` in `src/Appearance/ClassicyAppearanceSound.ts`, scoped by `runWithClassicyAppearanceSoundDispatch` to the emitting component's `useSoundDispatch`, so tests that mock the dispatcher keep observing sprites.

### Shared Contract — layout declarations (part B creates the file; part F owns the readers)

File `src/Appearance/useClassicyAppearanceLayout.ts`: `CLASSICY_DEFAULT_APPEARANCE_LAYOUT` (Platinum: `{ window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } }`), `getClassicyAppearanceLayout(packageId?: string): ClassicyAppearanceLayout` (non-hook, for reducers and effects), `useClassicyAppearanceLayout(): ClassicyAppearanceLayout`, and `classicyLayoutVars(layout): Record<string, string>` emitting `--classicy-layout-grow-box-corner`, `--classicy-layout-menu-bar-placement`, `--classicy-layout-icon-grid-origin` as bare keywords. `ClassicyDesktop` spreads `classicyLayoutVars` beside the theme vars (not `getThemeVars`, which only sees the theme) and carries `data-classicy-menu-bar="screen" | "window"` and `data-classicy-grow-box="<corner>"`. In `menuBar.placement: "window"` mode the Apple, Help and switcher clusters are absent (only the app's menus render, in `ClassicyWindowMenuBar`); the screen band reservation disappears once Part G makes `ClassicyWindow` read `--menu-bar-height`, which is `0px` in window mode.

### Shared Contract — colors and numbers (parts G and H)

- `getThemeVars` keeps one variable per color token (`--color-*`). SCSS helpers in `src/Appearance/vocabulary/_color.scss`: `@function classicy-tint($token, $pct)` → `color-mix(in srgb, var(#{$token}), white #{$pct})`; `@function classicy-shade($token, $pct)` → `… black …`; `@function classicy-alpha($token, $pct)` → `color-mix(in srgb, var(#{$token}) #{$pct}, transparent)`. `$token` is the full custom-property name string (`"--color-system-01"`).
- Named derivations live in **`src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts`** as `CLASSICY_THEME_DERIVATIONS` (Part G, 35 entries with formula and Platinum value, e.g. `--window-collapsed-height`, `--menu-bar-height` = control × 2.5 = 30px, `--popup-height`, `--window-zoom-margin`, `--window-resize-inset`, `--ui-font-size-small`, `--ui-font-size-compact`, `--ui-font-size-large`), spread by `getThemeVars`. `--menu-item-height` is not emitted (nothing reads a menu row height). Part H adds `--focus-ring-width`, `--focus-ring-inset`, `--control-corner-radius`, `--window-shadow-offset` to the same file if G's inventory did not.
- JS reads a metric with `readClassicyThemeVar(element, name): number` in `ClassicyThemeMetricReader.ts` (Part G).
- Package knobs: values live under `defaults.measurements.<family>.<key>` in `platinum.json` (theme data: editable, persisted, saved in theme files); UI metadata lives under `platinum.json.knobs[family][key] = { label, min, max, default }` and becomes the package's `options` schema via `classicyKnobsToSchema`. `ClassicyThemeMeasurements` gains an index signature `[family: string]: Record<string, number>` and the theme schema keeps unknown families. The generic walker is `classicyMeasurementVars(measurements)` in `ClassicyThemeMetrics.ts` (Part B creates it; Part H adds families), emitting `--<kebab family>-<kebab key>: <n>px` for every numeric leaf. Families Part H adds: `controlStrip`, `menuFrame`, `pager`, `balloonHelp`, `popUpSlider`, `scrollbar`, plus app families (`hyperCard`, `finder`, `appleGuide`, `colorPicker`, `dialog`, `controlPanel`).

### Contract amendments (reconciled after all ten parts were written)

Each line names the part plan whose text it corrects; executors apply the amendment over the plan's wording.

- **0005-1b3 (B) §2.1/§3.1**: `useClassicyAppearanceLayout` and friends live in `src/Appearance/useClassicyAppearanceLayout.ts` (above), not in `ClassicyAppearancePackage.ts`; layout vars are emitted by `classicyLayoutVars`, not `getThemeVars`.
- **0005-1b3 (B)**: `ClassicyAssetSource`/`isClassicyAssetSource` come from `src/Appearance/ClassicyAssetSource.ts`; B's structurally identical local types for `assets`/`sounds` are replaced by imports once C/D have landed (B §5.1 presence-checked step).
- **0005-1b3 (B) and 0011-v9t (H)**: `platinum.json` carries both `defaults.measurements.<family>` (values) and `knobs` (UI metadata), as pinned above.
- **0007-1sl (C) and 0009-agy (E)**: one key union `ClassicySystemArtKey` as listed above; registration only in `platinumAssets.ts`.
- **0007-1sl (C)**: `ClassicyCursorRole` includes `resizeU/D/L/R`.
- **0004-vqt (G) and 0011-v9t (H)**: derivations live in `ClassicyThemeDerivations.ts`; H appends, never duplicates.
- **0009-agy (E)**: the halftone is `--classicy-art-halftone` (system-art key `halftone`), so G's token-painted halftone fallback uses the same name.
- **0010-743 (F)**: `ClassicyMenuItem.part` is Part A's; F only adds it if absent.
- **0012-pt9 (J)**: Fonts tab and wallpaper picker reading the registries is Part C's deliverable; J re-tests, does not re-implement. The import refusal reuses `Desktop.errorDialog` from Part B.
- **0003-7x7 (A)**: `./scss-platinum/*` is temporary and is deleted by Part B.

### Part plans, stories and dependency graph

| Part | Plan | Stories | Audit §9 phase | Effort | Depends on | Can run beside |
|---|---|---|---|---|---|---|
| A (landed 738dbead5) | 0003-7x7 Vocabulary and cascade hygiene | 0001-cay … 0009-pat (9), follow-ups 0082-lgo | 1 | XL | 0001-1t9 (done) | C, D, G |
| B (in progress) | 0005-1b3 Package core and the Platinum package | 0033-f4o … 0041-dyu (9) | 2 | XL | A | C, D (B wires their registrations last) |
| C | 0007-1sl Asset registries and system art | 0018-0zn … 0025-xns (8) | 3 | L | — | A, B, D, G |
| D | 0008-j5l Sound packs | 0026-3a7 … 0032-ztu (7) | 4 | M | — | A, B, C, G |
| E | 0009-agy Art extraction and title-bar unification | 0051-532 … 0058-83a (8) | 5 items 1–5 | L | B, C | F, G, H, I |
| F | 0010-743 Arrangement slots | 0059-2t4 … 0066-874 (8) | 5 item 6 | L | A, B | E, G, H, I |
| G | 0004-vqt Colors, derivations and JS geometry | 0010-f28 … 0017-ih7 (8) | 6 items 1, 2, 4 | L | A (directory only) | C, D, E, F |
| H | 0011-v9t Pixel-literal purge | 0067-opx … 0074-zpv (8) | 6 item 3 | L | B, G | E, F, I |
| I | 0006-dy6 Package events and display participation | 0042-pbp … 0050-ryq (9) | 7 | L | B | E, F, H |
| J | 0012-pt9 Appearance control panel | 0075-uev … 0081-ww6 (7) | 8 | L | B, C, D | E, F, H, I |

82 stories in `docs/stories/` (81 part stories plus 0082-lgo, the Part A follow-ups collected after landing). Each story links its plan with `included` and the section numbers it implements; within a part, every story `depends` on the previous one; a part's first story `depends` on the last story of each plan in the "Depends on" column. `story_list({ plan: "<plan id>" })` lists a part's stories; a plan's `progress` map does not back-reference them.

Critical path: A → B → {E, F, H, I, J}. Two people: one takes A then B; the other takes C, D, G in parallel, then joins the fan-out. Every part links here with `parent`; `depends` links mirror the "Depends on" column.

## Testing

Unit (vitest/jsdom) per part for every exported function and reducer case; style tests that assert emitted CSS variables; Storybook + Playwright + ImageMagick screenshot parity per part (Platinum pixel-identical unless the part names a change); `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` before every commit (CI runs the same three). Parts that add registries test the `useSyncExternalStore` path with a render that re-registers.

Named visual changes across the program (the only non-zero parity allowed): Part E — `ClassicyWindowFrame` adopts the 19 px window title bar; zoom glyph `#231f20` → `--color-black`; ≤2-level anti-aliasing tolerance on the stripe band. Part G — the error title-bar pink (see Open Questions).

## Scope

**In scope:**

- Everything in `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) §9 Phases 1–8, including arrangement (D21)
- The shared contract above; part plans may not rename anything in it

**Out of scope:**

- Reloading built-in presets on hydrate — Named in the metrics spec as its own design
- A second shipped package (Windows 3.11, IRIX) — The program's proof is one mirrored Storybook story per surface (part F) and the structure-only test (part B), not a second package
- Screen-saver art under `Extensions/ScreenSaver/savers/**` — Intentionally per-saver (audit scope)

## Open Questions

- [ ] Error title-bar pink `#f7cecd` cannot be reached by any tint of `--color-error` (#ff0000 keeps R=255). Part G pins `classicy-tint("--color-error", 80%)` = `#ffcccc` and names the change (error-alert stories only). Alternative: a 29th color target `window.titleError` (schema + migration + Colors tab). Which? — owner
