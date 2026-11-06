---
id: 0015-kxa
title: 'Implement: Platinum as @classicy/appearance-platinum, and the core as @classicy/classicy'
type: impl
status: in_progress
priority: "1"
effort: XL
created: "2026-11-05T19:52:35.565Z"
updated: "2026-11-06T17:45:40.689Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/superpowers/specs/2026-11-05-platinum-appearance-package-design.md
  plans:
    - ["0014-ahm", "parent"]
progress:
  "0":
    status: complete
  "0.1":
    status: complete
    stories:
      - 0121-e89
  "1":
    status: complete
  "1.1":
    status: complete
    stories:
      - 0122-ieh
  "1.2":
    status: complete
    stories:
      - 0123-qzc
  "1.3":
    status: complete
    stories:
      - 0124-ln8
  "1.4":
    status: complete
    stories:
      - 0125-gqb
  "1.5":
    status: complete
    stories:
      - 0126-orc
  "1.6":
    status: complete
    stories:
      - 0127-qvl
  "2":
    status: complete
  "2.1":
    status: complete
    stories:
      - 0128-l2h
  "3":
    status: complete
  "3.1":
    status: complete
    stories:
      - 0129-00o
  "3.2":
    status: complete
    stories:
      - 0130-rpe
  "3.3":
    status: complete
    stories:
      - 0131-ku3
  "3.4":
    status: complete
    stories:
      - 0132-jsg
  "3.5":
    status: complete
    stories:
      - 0133-uqg
  "4":
    status: in_progress
  "4.1":
    status: complete
    stories:
      - 0134-8cy
  "4.2":
    status: in_progress
    stories:
      - 0135-t73
  "4.3":
    status: pending
    stories:
      - 0136-tis
  "5":
    status: complete
  "5.1":
    status: complete
    stories:
      - 0137-dm7
  "5.2":
    status: complete
    stories:
      - 0138-cj4
---

# Implement: Platinum as @classicy/appearance-platinum, and the core as @classicy/classicy

## Summary

**Goal:** Ship Platinum as its own npm package, `@classicy/appearance-platinum` (workspace `packages/appearance/platinum`), and publish the core as `@classicy/classicy`, both at 3.0.0, as designed in plan 0014-ahm.

**Problem:** The core always bundles and registers Platinum; a host using another Appearance Package pays for Platinum's stylesheet, art, fonts, sounds and wallpapers.

**Approach:** Five phases after a baseline: decouple the core (floor, load path, sound, wallpapers, stop screen, public API), rename the core, extract Platinum with its assets and `resources/`, release and document, then prepare classicy-web and rt911. Execution is subagent-driven, one reviewed section at a time.

---

# Part 2 — Implementation

**Architecture:** Decouple first, move second: Phase 1 makes the core independent of Platinum while Platinum still lives in `src/` (each step testable against today's layout), Phase 2 renames the core, Phase 3 moves Platinum into its own workspace package with its own build, Phase 4 releases and documents, Phase 5 prepares the two downstream apps.

**Tech Stack:** pnpm workspaces, Vite library mode (ES + UMD), vitest/jsdom, Sass with `pkg:` imports, Storybook + Playwright + ImageMagick parity, GitHub Actions.

## Constraints

- Spec: plan 0014-ahm (`docs/plans/0014-ahm-dsgn-platinum-appearance-package-and-classicy-scope.md`) and `docs/superpowers/specs/2026-11-05-platinum-appearance-package-design.md`; where this plan and 0014-ahm disagree, 0014-ahm wins.
- Every implementer follows `.superpowers/sdd/followups/IMPLEMENTER-RULES.md` (own worktree and branch, only `git add`/`git commit`, no pkill, no edits to `docs/stories/` or `docs/plans/` except 4.2's body edit done by the controller, never read the clued config).
- TDD for every behavior: the failing test first, then the code; kill obvious mutants and name them in the report.
- Nothing is pre-existing: the full gate is green at the start; any failure is the section's to fix.
- Full gate: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` (with `--maxWorkers=2` while several implementers share the machine).
- No `!important`, no bare `Npx`, no literal colors in any SCSS, the Platinum package's included; cascade layers unchanged; asset files are never inlined except the halftone mask (ruling E17); every emitted `url()` is quoted; American English.
- Only npm package names and import specifiers change in the rename: the repository, `dist/classicy.*` file names, the UMD global `classicy`, `classicyDesktopState`, DOM ids, class/part names, CSS variables, `classicy.*` layers, the `classicy_` analytics prefix and every `Classicy*` export stay.
- `@classicy/classicy` is a peer dependency of the Platinum package and external in both its ES and UMD builds; nothing published at 3.0.0 depends on the old `classicy` name.
- Pixel parity: AE 0 for every story (t=0 and `--mid`) and the example screens against 0.1's baseline, with Platinum imported.
- Lockfile edits keep every `libc:` field (install with `--config.minimum-release-age=10080`, as 0118 did).
- Review focus 1 (owned by 1.2): a host that imports Platinum twice, or re-registers it under HMR, ends with one package, one sound pack and an unchanged active theme.
- Review focus 2 (owned by 1.4): a 2.1.x save whose wallpaper is a `data:` URI or old-build URL that matches no current wallpaper keeps its value and still renders; one that matches becomes its filename.
- Review focus 3 (owned by 1.5): with only a non-Platinum package registered (Storybook `mirrored`), icons resolve, system art and cursors resolve to `undefined` without throwing, and sound is silent.
- Review focus 4 (owned by 4.3): a strict-CSP host that links the three stylesheets and allows no inline `<style>` renders the same desktop.
- Review focus 5 (owned by 3.4 and 4.3): a Vite host must exclude both packages from `optimizeDeps`, because Platinum's fonts, art, wallpapers and sound sprites are now `new URL()` files; the example and the README say so, and the standalone host proves it.

## Phase 0: Baseline

### 0.1: Parity baseline and size measurements at the current tip

**Files:**
- Create: `.playwright-mcp/parity/platinum-split/ (gitignored)`

**Depends on:** none

**Interfaces:**
- Produces: `before/` screenshots (every Storybook story at t=0 and the `--mid` set, plus the four example-app screens) and a sizes table (`dist/classicy.es.js`, `.umd.js`, `dist/` total) that 4.3 compares against.

- [ ] **Step 1: Build Storybook and the example at the tip** — Record the commit sha in `.playwright-mcp/parity/platinum-split/BASE`. — `pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 2: Shoot the baseline** — Follow `bin/parity/README.md` § "Baseline, after set, compare" with `P=.playwright-mcp/parity/platinum-split`: serve the built Storybook and the example app as it shows (record each server's PID; stop only those PIDs afterwards), then `pnpm parity:shoot --port <storybook port> --mid --out $P/before` (t=0 shots plus `@mid` shots of the animated stories, in one folder) and `pnpm parity:app --port <example port> --out $P/before`.
- [ ] **Step 3: Record sizes** — `du -b dist/classicy.es.js dist/classicy.umd.js` and `du -sb dist` into `.playwright-mcp/parity/platinum-split/sizes-before.txt`; note which inlined `data:` URIs dominate (grep `data:audio`, `data:image` byte counts).

**Validation:** `ls .playwright-mcp/parity/platinum-split/before | wc -l  # equals the story count`

## Phase 1: Decouple the core from Platinum (Platinum stays in src/ for now)

### 1.1: A core theme floor that is not Platinum

**Files:**
- Create: `src/Appearance/ClassicyCoreTheme.ts`
- Create: `src/Appearance/ClassicyCoreTheme.test.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageRegistry.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`
- Modify: `src/Appearance/Platinum/index.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options.tsx`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`

**Depends on:** none

**Interfaces:**
- Consumes: `getClassicyPackageMeasurements` (ClassicyThemeMeasurementSource.internal.ts), `listClassicyAppearancePackages`.
- Produces: `CLASSICY_CORE_MEASUREMENT_DEFAULTS: ClassicyThemeMeasurements` (frozen; the core five plus every structural knob, i.e. the 84 rows marked "Structural: yes" in AGENT-REFERENCE §8's knob-families table, ~:3599-3695) and `CLASSICY_CORE_DEFAULT_THEME: Readonly<ClassicyTheme>` (id `"default"`, `package: "platinum"`, Platinum's `defaults` colors/typography/layout values, `desktop.backgroundImage: ""`, measurements = the core floor), both in `src/Appearance/ClassicyCoreTheme.ts`. `getTheme(id, overrides?)` and `getAllThemes()` keep their signatures but read the registered packages' `defaults`/`presets` (registration order), falling back to `CLASSICY_CORE_DEFAULT_THEME`.

- [ ] **Step 1: Write the failing floor tests** — `ClassicyCoreTheme.test.ts`: (1) every key of `CLASSICY_CORE_MEASUREMENT_DEFAULTS` equals `platinum.json` `defaults.measurements` at the same family/key (parity pin); (2) it holds the core five families exactly as `CLASSICY_DEFAULT_THEME_METRICS`; (3) it holds exactly the structural knobs: parse the AGENT-REFERENCE table's Structural column and compare sets, so the doc and the floor cannot drift; (4) none of the 11 look-only knobs (`controlStrip.bevelWidth`, `menuFrame.{borderWidth,bevelWidth,shadowWidth,shadowStart,shadowGap}`, `scrollbar.{thumbGripWidth,thumbGripHeight}`, `utilityTitleBar.{textureWidth,textureHeight}`, `quickTime.captionShadowBlur`) is in it; (5) `CLASSICY_CORE_DEFAULT_THEME` equals Platinum's `defaults` except `desktop.backgroundImage === ""` and the look-only knobs; (6) with no package registered (`resetClassicyAppearancePackagesForTests`), `getAllThemes()` is `[CLASSICY_CORE_DEFAULT_THEME]` and `getThemeVars(getTheme("default"))` emits every variable it emits today except the look-only knobs' `--<family>-<key>`. — `pnpm exec vitest run src/Appearance/ClassicyCoreTheme.test.ts`
- [ ] **Step 2: Implement `ClassicyCoreTheme.ts`** — Plain data plus a freeze; no import of `@/Appearance/Platinum` (an import-graph test in 1.6 enforces it). The values are copied, not read from `platinum.json`.
- [ ] **Step 3: Point every `platinumJson` reader outside Platinum at the floor** — `ClassicyThemeMetrics.ts:262-265` (`PLATINUM_MEASUREMENT_DEFAULTS` → `CLASSICY_CORE_MEASUREMENT_DEFAULTS`, keep `mergeMeasurementDefaults`/WeakMap caching), `ClassicyThemeDerivations.ts:47-49` (the `progressBar.stripeWidth` fallback), `ClassicyPopUpMenuPlacement.ts:72` (`maxHeightCap` default from `CLASSICY_CORE_MEASUREMENT_DEFAULTS.menu.popUpMaxHeight`), `ClassicyThemeMetricReader.ts:16`, `ClassicyAppearance.ts:337-357` (`resolvedThemes` goes; `getAllThemes`/`getTheme` read registered packages), `ClassicyAppearancePackageRegistry.ts:40-48` (`CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults = CLASSICY_CORE_DEFAULT_THEME`, `presets: [CLASSICY_CORE_DEFAULT_THEME]`), `ClassicyAppManager.ts:665,668` (`DefaultAppManagerState` activeTheme = `CLASSICY_CORE_DEFAULT_THEME`, `availableThemes = getAllThemes()` evaluated lazily or `[]`; it is not persisted).
- [ ] **Step 4: Make Platinum build its own themes** — `src/Appearance/Platinum/index.ts:41-42` stops calling `getTheme`/`getAllThemes`: it builds `defaults` and `presets` from its own `platinum.json`, completing each with `withDefaultThemeMetrics(theme, classicyThemeMeasurementDefaults("platinum"))`-equivalent logic and resolving `desktop.backgroundImage` through its own wallpaper module (1.4 finishes the wallpaper half).
- [ ] **Step 5: Update the "Platinum floor" sentences** — CLAUDE.md:703, AGENT-REFERENCE :1684, :3476, :3568-3580, `ClassicyAppearanceManager.Options.tsx:89` and `Options.test.tsx:167`: the guarantee now comes from the core floor (`ClassicyCoreTheme.ts`).
- [ ] **Step 6: Run the touched tests and the theming suites** — `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/PopUpMenu`
- [ ] **Step 7: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(appearance): a core theme floor that is not Platinum"`

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyCoreTheme.test.ts && pnpm exec tsc --noEmit -p .`

### 1.2: Load and persist without a Platinum special case

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyDesktopManager.tsx`
- Modify: `src/Appearance/useClassicyAppearance.ts`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts`

**Depends on:** 1.1, 1.4

**Interfaces:**
- Consumes: 1.1's floor; `subscribeClassicyAppearancePackages` (Registry.ts:164-171).
- Produces: Rule: no load/persist helper treats `"platinum"` as known unless it is registered. `knownClassicyThemePackage(id)` returns `getClassicyAppearancePackage(id)` only; `hasKnownClassicyThemePackage(theme)` is true only for a registered package (an absent `theme.package` still means `"platinum"`, which is then unknown until it registers).

- [ ] **Step 1: Write the failing load tests** — `ClassicyLoadBeforePackage.test.ts`, each with Platinum NOT registered at module evaluation (seed `localStorage.classicyDesktopState`, `vi.resetModules()`, import the store, then `await import("@/Appearance/Platinum")`): (a) a saved built-in reference `{id:"bondi",package:"platinum"}` stays pending, logs no "falls back to defaults" warning, and after registration the active theme deep-equals Platinum's current `bondi` preset; (b) a saved Platinum custom theme with `desktop.backgroundImage: "azul_dark.png"` (a real wallpaper filename) and a knob override `{menuFrame:{shadowWidth:2}}` round-trips: before registration `sanitizeStateForPersistence` writes it whole (no stripped knobs, no blanked wallpaper); after registration the wallpaper resolves and the override survives; (c) review focus: importing Platinum twice (and re-registering, as HMR does) leaves exactly one package, one sound pack and an unchanged active theme.
- [ ] **Step 2: Run them to see them fail** — Today (a) resets to defaults, (b) blanks the wallpaper and strips the override. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts`
- [ ] **Step 3: Remove the special cases** — `ClassicyBuiltInThemes.internal.ts:49-55` (`knownClassicyThemePackage`), `ClassicyAppManagerUtils.tsx:125-128` (`hasKnownClassicyThemePackage`), `ClassicyThemeFile.ts:73-75` (`isClassicyAppearancePackageInstalled`: the default id counts only if registered), `ClassicyDesktopManager.tsx:353-358` (`ChangeAppearancePackage` resolves registered packages only), `useClassicyAppearance.ts:53-55` (falls back to `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` for hooks only, never for theme data).
- [ ] **Step 4: Heal wallpapers on registration** — Extend `refreshActiveBuiltInTheme` (ClassicyAppManagerUtils.tsx:260-275) or add a sibling subscriber: when package P registers, run the wallpaper heal over the active theme and every `availableThemes`/`customThemes` entry whose `package` is P (through 1.4's `resolveClassicyWallpaper`), in one `setState`.
- [ ] **Step 5: Run the tests, then the AppManager and AppearanceManager suites** — `pnpm exec vitest run src/SystemFolder/ControlPanels`
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "fix(appearance): a package that registers after load refreshes its themes, Platinum included"`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyLoadBeforePackage.test.ts`

### 1.3: Sound with no Platinum import

**Files:**
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.test.tsx`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.packs.test.tsx`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundStateEventReducer.test.ts`

**Depends on:** none

**Interfaces:**
- Produces: With no registered pack for `activeTheme.sound.pack` and none for `CLASSICY_DEFAULT_SOUND_PACK_ID`, the provider creates no Howl and every sound dispatch is a no-op (no throw, one `classicyLog("warn","Sound",…)` per missing pack id). `fallbackPlayer` is the default pack's player only when that pack is registered.

- [ ] **Step 1: Write the failing tests** — Provider with no pack registered: mounts, plays nothing, `Howl` constructor never called, one warning; registering the Platinum pack afterwards loads it (the provider already re-runs on `useClassicySoundPacks()`). Reducer: `ClassicySoundLoad` with an unknown pack and no default pack sets `fallbackPlayer: null`. Schema: `sound.pack` validates against whatever is registered, and the module graph of `ClassicyThemeSchema.ts` contains no `Appearance/Platinum` file.
- [ ] **Step 2: Remove the three side-effect imports and the hard Platinum fallback** — `ClassicySoundManagerProvider.tsx:7`, `ClassicySoundManagerUtils.tsx:3`, `ClassicyThemeSchema.ts:9`; `createPlatinumPlayer` (:160-163) becomes a lookup of `getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID)` that may return `null`; the "falling back to platinum" warning (:322-327) names the default pack id and only fires when that pack exists.
- [ ] **Step 3: Drop the three `vi.mock("@/Appearance/Platinum/assets/sounds/platinum")` lines** — They are no longer needed; tests that assert Platinum sprites import Platinum explicitly.
- [ ] **Step 4: Run the sound suites** — `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema`
- [ ] **Step 5: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(sound): the core plays only registered packs, and is silent without one"`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/SoundManager`

### 1.4: Wallpapers by filename, through the registry

**Files:**
- Create: `src/Appearance/ClassicyWallpaperIndex.ts`
- Create: `src/Appearance/ClassicyWallpaperIndex.test.ts`
- Create: `src/Appearance/Platinum/assets/platinumWallpapers.ts`
- Modify: `src/Appearance/ClassicyAssetRegistry.ts`
- Modify: `src/Appearance/Platinum/assets/platinumAssets.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyBuiltInThemes.internal.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts`

**Depends on:** none

**Interfaces:**
- Consumes: `registerClassicyAssets`, the package registry subscription (for the index's cache).
- Produces: `registerClassicyWallpapers(packageId, list: Array<{ name: string; src: ClassicyAssetSource; file?: string }>)` (additive `file`). In `src/Appearance/ClassicyWallpaperIndex.ts` (store-free): `resolveClassicyWallpaper(value: string, packageId?: string): string` (`data:`/`blob:`/http(s)/`//` pass through; a registered filename or basename resolves to its source; unknown → `""` with one warning per value), `classicyWallpaperFilename(value: string): string | undefined` (filename for a registered filename, source URL or `data:` URI), `listClassicyWallpapers(packageId?: string): Array<{ file?: string; name: string; src: string }>`, `defaultClassicyWallpaper(packageId?: string): string` (the package's `default.png` entry, else its first, else `""`).

- [ ] **Step 1: Write the failing index tests** — `ClassicyWallpaperIndex.test.ts`: register `{name:"Azul Dark", file:"azul_dark.png", src:"/x/azul_dark-abc.png"}`; `resolveClassicyWallpaper("azul_dark.png")` → `/x/azul_dark-abc.png`; `classicyWallpaperFilename("/x/azul_dark-abc.png")` → `azul_dark.png`; a `data:` URI equal to a registered source maps back to its filename; `https://example.com/a.png` passes through and has no filename; unknown `nope.png` → `""` and warns once; entries without `file` resolve by `name` only.
- [ ] **Step 2: Implement the index and the additive `file`** — Index rebuilt lazily on asset-registry change; `registerClassicyWallpapers` keeps keying the asset tree by `name` (the Desktop tab's labels) and records `file` in the index.
- [ ] **Step 3: Move `ClassicyWallpapers.ts` into Platinum** — `src/Appearance/Platinum/assets/platinumWallpapers.ts` owns the glob (still `assets/img/wallpapers/*` until 3.3) and the 47-entry `{label, file}` list; `platinumAssets.ts:73-76` registers with `file`. Delete the core module; every consumer (ClassicyAppearance.ts:17,345; ClassicyBuiltInThemes.internal.ts:19,78; ClassicyAppManagerUtils.tsx:23,106,115; ClassicyThemeFile.ts:22-24,63,80-81; ClassicyThemeSchema.ts:14,116; ClassicyAppearanceManager.tsx:68,111-112) switches to the index.
- [ ] **Step 4: Persist filenames** — Write failing tests first: `ClassicyDesktopChangeBackground` with a registered wallpaper's resolved URL stores its filename; `sanitizeStateForPersistence` writes filenames for registered wallpapers in `activeTheme` and `customThemes`; a user's `https://` URL is kept; the desktop still renders the image (every CSS read of `desktop.backgroundImage` resolves through `resolveClassicyWallpaper`). Then implement: the Desktop tab (Desktop.tsx:53-59,77-80) dispatches the filename; render-time resolution in the one place `--desktop-background-image` (or its equivalent) is built.
- [ ] **Step 5: Migrate old saved values** — `migrateClassicyState` gains a shape-detecting, idempotent step: a `backgroundImage` that `classicyWallpaperFilename` maps becomes the filename; one that does not map is left alone (the 1.2 registration heal retries it once its package registers). Review focus: a 2.1.x save whose `data:` URI matches no current wallpaper keeps its value and still renders.
- [ ] **Step 6: Run the wallpaper, theme-file and migration suites** — `pnpm exec vitest run src/Appearance/ClassicyWallpaperIndex.test.ts src/SystemFolder/ControlPanels`
- [ ] **Step 7: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(appearance): wallpapers are persisted by filename and resolved through the registry"`

**Validation:** `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels`

### 1.5: No package, no desktop: the stop screen, the resolution chain and the package icon

**Files:**
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.tsx`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.scss`
- Create: `src/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage.test.tsx`
- Create: `src/__tests__/withPlatinum.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: `src/Appearance/ClassicyAppearancePackage.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageSchema.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageRegistry.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes.tsx`
- Modify: `src/Appearance/Platinum/index.ts`
- Modify: `src/Appearance/ClassicyAssetRegistry.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: 1.1-1.4.
- Produces: `ClassicyAppearancePackage.icon?: ClassicyAssetSource` (schema-validated, `.describe()`d). Resolution: `resolveClassicyAppearancePackage(id)` = registered `id` → registered `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID` → first of `listClassicyAppearancePackages()` → `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` (lone components only). `<ClassicyNoAppearancePackage />` (no props). `src/__tests__/withPlatinum.ts`: a side-effect module that imports Platinum, for tests that mount the desktop.

- [ ] **Step 1: Write the failing stop-screen tests** — With no package registered, `<ClassicyDesktop>` renders `ClassicyNoAppearancePackage` and nothing else of the desktop (no menu bar, no icons, no windows, no Control Strip; `#classicyDesktop` absent); the text is exactly: heading "No Appearance Package is loaded", body "Classicy needs an Appearance Package to draw its desktop. Load one at your app's entry, for example:", and a code line `import "@classicy/appearance-platinum";`; `classicyLog("error","Appearance","No Appearance Package is registered; import \"@classicy/appearance-platinum\" (or another package) at your app's entry.")` is called once per page, not per render or remount; registering a package while the screen shows replaces it with the desktop (registry subscription); it is not `ClassicyCrashScreen` and renders no Sad Mac.
- [ ] **Step 2: Write the failing resolution tests** — Only `mirrored` registered: the desktop renders with `data-classicy-appearance="mirrored"` even when the persisted `packageId` is `"platinum"`; a persisted unregistered id with Platinum registered resolves to Platinum and logs once (today's behavior). Review focus: with only `mirrored` registered, icons resolve (the core's `ClassicyIcons` tree), cursors and system art resolve to `undefined` without throwing, and sound is silent.
- [ ] **Step 3: Implement** — The desktop branches to the stop screen when `useClassicyAppearancePackages().length === 0`. `ClassicyDesktop.tsx:64-65` KEEPS `import "@/Appearance/Platinum"` in this section (1.6 drops it), so these tests reach the no-package state with `resetClassicyAppearancePackagesForTests()`. The stop screen must render with no package loaded, so it cannot rely on any package's look or on theme variables a package supplies. Style it in a base-layer `ClassicyNoAppearancePackage.scss` that passes the pixel-literal and literal-color gates: sizes from core-floor variables (`getThemeVars(CLASSICY_CORE_DEFAULT_THEME)` is applied by the desktop root even without a package) or unitless/relative units, and colors only from `--color-*` tokens of the core default theme. If that proves impossible for a color, use the CSS system colors `Canvas`/`CanvasText` and add that one declaration to the color sweep's listed exemptions with a reason. The asset registry's hard `"platinum"` fallback (`ClassicyAssetRegistry.ts:14,116,290,325-330`) becomes `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID` (the core's icon tree still registers there).
- [ ] **Step 4: Give packages an icon** — Add `icon` to the type and schema; Platinum sets it to its `platinum.png` (moved from `AppearanceManager/resources/platinum.png` into `src/Appearance/Platinum/assets/art/`, and `verify:dist`'s art set updated); `ClassicyAppearanceManager.Themes.tsx:8,61-68` reads `pkg.icon` and shows a generic package glyph (an existing icon-tree entry; name it) when absent.
- [ ] **Step 5: Add `withPlatinum.ts`** — `src/__tests__/withPlatinum.ts` is a side-effect module that imports Platinum; 1.6 puts it to use.
- [ ] **Step 6: Run the touched suites** — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/Appearance src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 7: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "feat(desktop): stop and say so when no Appearance Package is loaded"`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/Appearance`

### 1.6: The desktop stops importing Platinum, and Platinum leaves the core's public API and module graph

**Files:**
- Create: `src/Appearance/ClassicyCoreImportGraph.test.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: every test or story that mounts `ClassicyDesktop` and expects Platinum (adds `import "@/__tests__/withPlatinum"`)
- Modify: `.ts-barrel.json`
- Modify: `src/index.ts`
- Modify: `src/Appearance/Platinum/ClassicyPlatinum.test.ts`
- Modify: `storybook/.storybook/preview.tsx`
- Modify: `storybook/.storybook/RenamedPackage.ts`

**Depends on:** 1.2, 1.3, 1.5

**Interfaces:**
- Produces: The core barrel exports nothing from `src/Appearance/Platinum/`; `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks`, `platinumSoundPack` are exported only by Platinum's own index (the future `@classicy/appearance-platinum`). The wallpaper helpers exported by the core are 1.4's index functions.

- [ ] **Step 1: Drop the desktop's Platinum import** — `ClassicyDesktop.tsx:64-65` loses `import "@/Appearance/Platinum"`. Every test or story that mounts `ClassicyDesktop` and expects the Platinum look or sounds imports `@/__tests__/withPlatinum` (stories: `storybook/.storybook/preview.tsx` already imports Platinum). `src/__tests__/setup.ts` stays Platinum-free. Run the whole suite and fix each failure by adding the import, never by registering Platinum globally. — `pnpm test --maxWorkers=3`
- [ ] **Step 2: Write the failing import-graph test** — `ClassicyCoreImportGraph.test.ts`: walk the static import graph from `src/index.ts` (reuse the walker in `platinumAssets.importGraph.test.ts`) and assert no reachable file is under `src/Appearance/Platinum/`; assert `@/index` has no `platinumSoundPack`/`PLATINUM_APPEARANCE_PACKAGE_ID` export.
- [ ] **Step 3: Exclude Platinum from barrelsby** — Add `"Appearance/Platinum"` to `.ts-barrel.json` `exclude`; regenerate; `src/index.ts:17` disappears. Update `ClassicyPlatinum.test.ts:236-248` to assert the opposite.
- [ ] **Step 4: Storybook reads presets from the registry** — `preview.tsx:6,15-18` builds its theme toolbar from `listClassicyAppearancePackages()` presets after importing Platinum (by path for now); `RenamedPackage.ts:15,21` imports `PLATINUM_APPEARANCE_PACKAGE_ID` from Platinum's index.
- [ ] **Step 5: Run the gate** — This is the end of Phase 1: Platinum still lives in `src/`, but nothing in the core reaches it. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(appearance): the core neither exports nor imports Platinum"`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Phase 2: Rename the core to @classicy/classicy

### 2.1: The package name and every specifier

**Files:**
- Modify: `package.json`
- Modify: `example/package.json`
- Modify: `example/vite.config.ts`
- Modify: `example/src/app.tsx`
- Modify: `example/src/Applications/Browser/BrowserContext.ts`
- Modify: `example/src/Applications/Browser/Browser.tsx`
- Modify: `example/src/Applications/Browser/Browser.scss`
- Modify: `example/src/Applications/Demo/Demo.tsx`
- Modify: `example/src/Applications/DemoExtension/DemoExtension.tsx`
- Modify: `example/src/Applications/BlueBox/BlueBox.tsx`
- Modify: `example/src/Applications/HyperCardPlugins/HyperCardPluginsDemo.tsx`
- Modify: `vitest.config.ts`
- Modify: `src/Appearance/ClassicyPackageExports.test.ts`
- Modify: `README.md`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `docs/BUILDING-APPS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md`
- Modify: `pnpm-lock.yaml`

**Depends on:** none

**Interfaces:**
- Produces: Root `package.json` `name: "@classicy/classicy"`, `publishConfig: { access: "public" }`; every import and Sass `pkg:` specifier uses `@classicy/classicy` and `@classicy/classicy/…`; `example/` depends on `"@classicy/classicy": "workspace:*"` (scripts `use:local`/`use:published` renamed to match).

- [ ] **Step 1: Write the failing tests** — `ClassicyPackageExports.test.ts`: `pkg.name === "@classicy/classicy"`, `pkg.publishConfig.access === "public"`; the Sass `pkg:@classicy/classicy/scss/layout` specifier resolves through `example/`; `git grep -nE 'from "classicy["/]|pkg:classicy/|"classicy": "workspace' -- . ':!docs/plans' ':!docs/stories' ':!pnpm-lock.yaml'` returns nothing (as a test over tracked files, with a short allowlist for historical release-note text). Anti-goal pin: the test also asserts `vite.config.ts` `build.lib.name` stays `"classicy"` and file names stay `classicy.${f}.js`, and a store test asserts the localStorage key stays `classicyDesktopState`.
- [ ] **Step 2: Rename** — `package.json`, `example/` (package.json, the 8 imports in 7 files, `Browser.scss:1`, `example/vite.config.ts:23,28` aliases), `vitest.config.ts`'s `classicy` alias → `@classicy/classicy`; docs: README (18 `classicy/…` + 2 bare + install lines), AGENT-REFERENCE (49 + 22, install line :29), BUILDING-APPS (8), CLAUDE.md (9), release notes (18; old-version history text may keep `classicy` where it describes 2.x). Never touch `robbiebyrd/classicy`, dist file names, ids, class names, storage keys or `Classicy*` identifiers.
- [ ] **Step 3: Refresh the lockfile without losing `libc:` fields** — Same method as 0118: run the install with full metadata and confirm the `libc:` count is unchanged. — `pnpm install --config.minimum-release-age=10080 && grep -c 'libc:' pnpm-lock.yaml`
- [ ] **Step 4: Run the gate** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 5: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor!: publish the core as @classicy/classicy"`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Phase 3: Extract Platinum into packages/appearance/platinum

### 3.1: Scaffold the package and move Platinum's source

**Files:**
- Create: `packages/appearance/platinum/package.json`
- Create: `packages/appearance/platinum/tsconfig.json`
- Create: `packages/appearance/platinum/vite.config.ts`
- Create: `packages/appearance/platinum/vitest.config.ts`
- Create: `packages/appearance/platinum/README.md`
- Create: `packages/appearance/platinum/LICENSE`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `src/index.ts (only if a symbol Platinum needs is not yet exported)`
- Delete: `src/Appearance/Platinum/ (moved with git mv to packages/appearance/platinum/src/)`

**Depends on:** 1.6, 2.1

**Interfaces:**
- Consumes: Any core symbol Platinum imports that the barrel does not export today (check `ClassicyPixelArtSource`, `ClassicyAppearancePackageSchema`, `ClassicyFontFaceCss.internal.ts` helpers) is exported from the core in this section, and listed in the report.
- Produces: Workspace member `@classicy/appearance-platinum` at `packages/appearance/platinum` (`version` = the root's; `type: "module"`; `peerDependencies: { "@classicy/classicy": "workspace:^", react, react-dom }`; `devDependencies: { "@classicy/classicy": "workspace:*" }`; `publishConfig.access: "public"`; `files: ["dist", "src/styles", "README.md", "LICENSE"]` plus an `.npmignore`-equivalent rule that keeps tests out; `sideEffects: ["./dist/*.js", "./src/index.ts", "**/*.css", "**/*.scss"]`). Source at `packages/appearance/platinum/src/` with the same tree as today (`index.ts`, `hooks.ts`, `platinum.json`, `styles/`, `assets/`). Every TS import of core code is `from "@classicy/classicy"`; SCSS `@use` of the vocabulary is `pkg:@classicy/classicy/scss/<module>`.

- [ ] **Step 1: Move with history** — `pnpm-workspace.yaml` gains `'packages/*/*'`; remove the empty untracked `packages/appearance/platinum/`; then `git mv src/Appearance/Platinum packages/appearance/platinum/src`.
- [ ] **Step 2: Write the package's own config** — `vite.config.ts` in library mode: entry `src/index.ts`, formats `es` and `umd`, `name: "classicyAppearancePlatinum"`, `fileName: f => \`appearance-platinum.${f}.js\``, `external` = `@classicy/classicy` (and its subpaths), `react`, `react-dom`, `react/jsx-runtime`; UMD `globals: { "@classicy/classicy": "classicy", react: "React", "react-dom": "ReactDOM" }`. `vitest.config.ts` aliases `@classicy/classicy` → `../../../src/index.ts` and uses the root `src/__tests__/setup.ts`. `tsconfig.json` extends the root's settings with `paths` for `@classicy/classicy` → the root `src/index.ts`.
- [ ] **Step 3: Rewrite imports** — `@/…` → `@classicy/classicy`; `@snd/…`/`@img/…` stay until 3.3; SCSS `../../../vocabulary/*` → `pkg:@classicy/classicy/scss/*` (Sass `NodePackageImporter`, as the example already uses).
- [ ] **Step 4: Make the package's tests pass in place** — The 15 tests that moved with the folder run under the package's vitest config; path expressions inside them (`cursorArrow.test.ts:8`, `platinumArt.test.ts:12`, `platinumPixelArt.test.ts:20`, `platinumAssets.importGraph.test.ts:104-122`, `pixelLiterals.test.ts:14-15`, `platinum.css.test.ts:8`) point at the new paths. — `pnpm --filter @classicy/appearance-platinum exec vitest run`
- [ ] **Step 5: Review focus: one registry, not two** — Add a package test that builds the ES bundle, imports it next to the core's built bundle in one module graph, and asserts the core's `listClassicyAppearancePackages()` sees Platinum (the anti-goal "two copies of the registries"); also assert the built `appearance-platinum.es.js` contains no copy of `registerClassicyAppearancePackage`'s implementation (only an import).
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(platinum): move Platinum into packages/appearance/platinum"`

**Validation:** `pnpm --filter @classicy/appearance-platinum exec vitest run && pnpm --filter @classicy/appearance-platinum exec vite build`

### 3.2: Root consumers and the lint gates follow the move

**Files:**
- Modify: `vitest.config.ts`
- Modify: `tsconfig.json`
- Modify: `storybook/tsconfig.json`
- Modify: `storybook/.storybook/main.ts`
- Modify: `storybook/.storybook/preview.tsx`
- Modify: `storybook/.storybook/RenamedPackage.ts`
- Modify: `storybook/.storybook/ClassicyAppearanceProbe.tsx`
- Modify: `storybook/.storybook/mirrored.scss`
- Modify: `example/package.json`
- Modify: `example/src/app.tsx`
- Modify: `bin/check-pixel-literals.ts`
- Modify: `bin/classicyLiteralColorSweep.ts`
- Modify: `bin/multiplier-allowlist.json`
- Modify: `src/Appearance/ClassicyAppearance.varCoverage.test.ts`
- Modify: `src/__tests__/withPlatinum.ts`
- Modify: `package.json`

**Depends on:** 3.1

**Interfaces:**
- Produces: Root tests, Storybook and the example import `@classicy/appearance-platinum` (aliased to `packages/appearance/platinum/src/index.ts` in vitest, Storybook and the example's live-source dev server; a workspace dependency for the example's production build). The pixel-literal gate, the literal-color sweep and varCoverage scan `src/` and `packages/appearance/*/src/`.

- [ ] **Step 1: Write the failing gate tests first** — `check-pixel-literals.test.ts` and `classicyLiteralColorSweep.test.ts`: a fixture package dir under `packages/appearance/<x>/src` with a bare `12px` / literal `#fff` is reported (today it is skipped silently); varCoverage includes Platinum's SCSS reads (assert a known Platinum-only read, e.g. `--menu-frame-shadow-width`, is in the scanned set).
- [ ] **Step 2: Extend the scan roots** — `check-pixel-literals.ts:217,892` and `classicyLiteralColorSweep.ts:157` scan `src` plus each `packages/appearance/*/src`; `PACKAGE_FILE` (`classicyLiteralColorSweep.ts:114`) matches `packages/appearance/<pkg>/src/` too; `multiplier-allowlist.json` keys move to the new paths.
- [ ] **Step 3: Point every root consumer at the package** — `withPlatinum.ts` imports `@classicy/appearance-platinum`; the 52 root test/story files that import `@/Appearance/Platinum…` switch to the package specifier (JSON/sound subpaths become the package's named exports); the ~25 path-reading tests (list in the 0014-ahm research: `ClassicyIcon.art.test.ts:21`, `ClassicyWindow.art.test.ts:26-27,228,317`, `ClassicyMenu.art.test.ts:29-30`, `ClassicyWindow.cascade.test.ts:146`, `ClassicyControlStrip.test.tsx:475`, `ClassicyStateClasses.*`, `ClassicyLiteralColors.test.ts`, `ClassicyCascade.repo.test.ts:153`, `ClassicyPackageExports.test.ts`, `bin/classicyLiteralColorSweep.test.ts:207,239-240`, …) read `packages/appearance/platinum/src/…`. Storybook: `preview.tsx`, `RenamedPackage.ts`, `ClassicyAppearanceProbe.tsx` import the package; `mirrored.scss:15-42` `@use`s `pkg:@classicy/appearance-platinum/scss/…`. Example: depends on `"@classicy/appearance-platinum": "workspace:*"` and imports it in `app.tsx`.
- [ ] **Step 4: Run the gate** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 5: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor: the core's tests, Storybook and the example load Platinum as a package"`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 3.3: Platinum's files leave assets/

**Files:**
- Create: `packages/appearance/platinum/assets/ (moved files)`
- Modify: `packages/appearance/platinum/src/assets/sounds/platinum.ts`
- Modify: `packages/appearance/platinum/src/assets/platinumWallpapers.ts`
- Modify: `packages/appearance/platinum/src/assets/platinumAssets.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts`
- Modify: `bin/make_audio_sprites.sh`
- Modify: `package.json`
- Modify: `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md`

**Depends on:** 3.1

**Interfaces:**
- Produces: Platinum's sound sprites, wallpapers and Platinum-only system-art/cursor files live under `packages/appearance/platinum/assets/` and are imported by Platinum directly. The core's `ClassicyIcons` tree loses the entries for moved files.

- [ ] **Step 1: Apply the rule and write the list down** — For each candidate, a file moves only if nothing outside Platinum reads it (research: `system.apple`, `system.alias`, `system.desktop.trashEmpty/trashFull`, `ui.helpButton`, `ui.cursors.watch/resizeLr/resizeUd/resizeU/resizeD/resizeL/resizeR` move; `system.macosSvg` (ScreenSaverLogoRegistry.ts:129), `classicy.logo` (ScreenSaverLogoRegistry.ts:119, PlatinumTheme.ts:10), `ui.halftoneLarge` (BootSequence.tsx:63) and `ui.cursors.hand` (PDFViewerDocument.tsx:64) stay; check `assets/img/PlatinumClickLaunch.png` and the ten unregistered cursors, which are orphans if unread). Record the final table in the report.
- [ ] **Step 2: Write the failing tests** — An import-graph test: the core's static graph reaches no file under `packages/`; `ClassicyIcons` has no key for a moved file; Platinum's registration still provides every system-art key and cursor role it provided before (compare against a snapshot of `resolveClassicyAsset("systemArt", k)` keys taken before the move); `ClassicyIcons.test.ts:9,16-19,26-28`, `ClassicyHelpButton.test.tsx:37` and `useClassicyCursor.test.tsx:26` are rewritten to read the system-art/cursor registry.
- [ ] **Step 3: Move with git mv** — `assets/sounds/platinum/` → `packages/appearance/platinum/assets/sounds/platinum/` (`make_audio_sprites.sh` default path and the root `build:audio` script follow; `build:watchaudio` watches the new source); `assets/img/wallpapers/` (with `photos/`) → `packages/appearance/platinum/assets/wallpapers/`; the moved system-art and cursor files → `packages/appearance/platinum/assets/art/` or `assets/cursors/`; `assets/img/icons/control-panels/appearance-manager/platinum.png` is deleted (byte-identical to the icon moved in 1.5) and its icon-tree entry (`ClassicyIcons.ts:185`) removed.
- [ ] **Step 4: Release note** — Add a table to the release note, modeled on the README's "Seven icon paths are gone": each removed `ClassicyIcons` path and its replacement (`resolveClassicyAsset("systemArt", key)` / the cursor role). File a follow-up story for the `assets/img/ui/` orphans (`stripe.svg`, `tab.svg`, `halftone-small.png`, `menu-dropdown-arrows.svg`, `sad-mac.png`) and the unread cursors, which the core's eager glob still inlines.
- [ ] **Step 5: Run the gate** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "refactor(platinum): Platinum's sounds, wallpapers and art move into its package"`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 3.4: Two builds, two dist checks, two packs

**Files:**
- Create: `packages/appearance/platinum/bin/verify-dist.mjs`
- Create: `packages/appearance/platinum/src/PlatinumPackageExports.test.ts`
- Modify: `vite.config.ts`
- Modify: `packages/appearance/platinum/vite.config.ts`
- Modify: `bin/check-dist-imports.mjs`
- Modify: `bin/classicyFontStylesheet.ts`
- Modify: `bin/classicyDistAssets.ts`
- Modify: `bin/classicyPackageCss.ts`
- Modify: `package.json`
- Modify: `packages/appearance/platinum/package.json`
- Modify: `src/Appearance/ClassicyPackageExports.test.ts`

**Depends on:** 3.3

**Interfaces:**
- Produces: `packages/appearance/platinum/dist/`: `appearance-platinum.es.js`, `appearance-platinum.umd.js`, `types/`, `assets/` (13 woff2, the art, the wallpapers, the four sound sprites; all files, none inlined except the halftone mask), `classicy-platinum.css` (byte-identical to the injected package block, starting with the layer order) and `classicy-platinum.fonts.css`. Package `exports`: `.` → `{ types, import: ./dist/appearance-platinum.es.js, require: ./dist/appearance-platinum.umd.js }`, `./scss/*` → `./src/styles/*`, `./classicy-platinum.css`, `./classicy-platinum.fonts.css`. The core loses `./appearance/platinum`, `./appearance/platinum/scss/*`, `dist/appearance-platinum.js(.d.ts)`, `dist/classicy-platinum.css`, `dist/classicy-platinum.fonts.css` and the Platinum files in `dist/assets/`. Root `build:source` builds the core then the package and runs both verifiers.

- [ ] **Step 1: Write the failing dist and pack tests** — Core `check-dist-imports.mjs`: invariant 4 checks only `fonts.js`; invariant 5 asserts no woff2, no Platinum art and no sound sprite in core `dist/assets/` and no `data:audio` or wallpaper `data:image` in the bundles; invariant 7 asserts the entry bundles carry NO `@layer classicy.package` block; invariant 12 is removed. Package `verify-dist.mjs`: the old invariants 5, 7 (byte-identity of `classicy-platinum.css`), 9 (charset) and 12, reading `packages/appearance/platinum/src/assets/…` for the expected sets, plus: no `.webp`, every `new URL("assets/…")` names a file, and the bundle imports `@classicy/classicy` rather than containing it. Pack tests for both packages (`npm pack --dry-run --json` and `pnpm pack --dry-run --json`): the core ships no file under `packages/` and no Platinum asset; Platinum ships no `resources/`, no tests, every exported `.scss`, and its packed `package.json` has `peerDependencies["@classicy/classicy"] === "^<version>"` (no `workspace:`).
- [ ] **Step 2: Share the emit logic** — Parameterize `bin/classicyFontStylesheet.ts` (`PLATINUM_FONT_SOURCE` → a function of the package's source dir), `bin/classicyDistAssets.ts` (`CLASSICY_ART_SOURCE_DIR` → argument), `bin/classicyPackageCss.ts` (`PACKAGE_STYLESHEET_MODULE` matches `packages/appearance/<pkg>/src/styles/<name>.scss?inline`); the Platinum vite config's own `injectCssPlugin`-equivalent emits `classicy-platinum.css` and `classicy-platinum.fonts.css` from them; `noInlineAppearanceAssetsPlugin` and `assetFileNames` apply to `packages/appearance/` paths (sound sprites included). The core's `injectCssPlugin` keeps the layer-order prepend, the `fonts.js` shim and the style injector, and drops the Platinum emits.
- [ ] **Step 3: Exports and scripts** — Core `package.json`: drop the two Platinum exports, the shim and the Platinum `sideEffects` entries, keep `src/Appearance` in `files` (vocabulary SCSS only now). `build:source` = barrels, `tsc -b`, core `vite build`, core `verify:dist`, then `pnpm --filter @classicy/appearance-platinum build` (which runs its own `verify:dist`).
- [ ] **Step 4: Review focus: a host bundler** — Add to `example/` (or a fixture under `bin/` tests) a Vite dev-config assertion and README text: a Vite host excludes both `@classicy/classicy` and `@classicy/appearance-platinum` from `optimizeDeps`, since Platinum's fonts, art, wallpapers and sprites are now `new URL(…, import.meta.url)` files too. `example/vite.config.ts` gets the second exclude.
- [ ] **Step 5: Run the gate** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "build: the core and Platinum build, verify and pack separately"`

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 3.5: resources/ moves into the package, unpublished

**Files:**
- Modify: `biome.json`
- Modify: `package.json`
- Modify: `docs/plans/hig-audit.md (or docs/hig-audit.md, wherever it lives at execution)`
- Delete: `resources/ (git mv to packages/appearance/platinum/resources/)`

**Depends on:** none

**Interfaces:**
- Produces: `packages/appearance/platinum/resources/` (346 MB, 80,038 files), outside every `files` allowlist and `exports` entry.

- [ ] **Step 1: Write the failing pack assertion** — The Platinum pack test from 3.4 already asserts no `resources/` path; add one that `packages/appearance/platinum/resources/Apple_HIGOS8_1997_Guidelines.pdf` exists (the move happened) and the root has no `resources/`.
- [ ] **Step 2: Move** — `git mv resources packages/appearance/platinum/resources` (no re-encoding; confirm `git diff --stat -M` shows renames only).
- [ ] **Step 3: Fix references** — `biome.json` (`resources/**` include and the `resources/app-icons/index.json` exclude → new path); the HIGOS8 citation in `hig-audit.md` (path `packages/appearance/platinum/resources/Apple_HIGOS8_1997_Guidelines.pdf`, which also fixes today's nonexistent `Apple_HIGOS8_Guidelines.pdf`); `build:watchaudio` (fixed in 3.3; confirm); any other `resources/` mention (`git grep -n 'resources/' -- ':!packages'`).
- [ ] **Step 4: Run lint and the pack tests** — `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts && pnpm --filter @classicy/appearance-platinum exec vitest run src/PlatinumPackageExports.test.ts`
- [ ] **Step 5: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "chore: move resources/ into the Platinum package folder (never published)"`

**Validation:** `pnpm lint && pnpm --filter @classicy/appearance-platinum exec vitest run`

## Phase 4: Release, docs and final verification

### 4.1: Release both packages at 3.0.0 in lockstep

**Files:**
- Modify: `.github/workflows/push.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `bin/ (a release helper, if needed)`
- Test: `bin/classicyReleaseWorkflow.test.ts`

**Depends on:** none

**Interfaces:**
- Produces: `push.yml`: `paths` gains `packages/**` (keeping `!**/*.stories.tsx`); after the version bump, a step sets the Platinum package's `version` to the root's and commits it `[skip ci]` like the codename step; publish runs `pnpm publish --filter @classicy/classicy --filter @classicy/appearance-platinum --access public --no-git-checks` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (replacing `JS-DevTools/npm-publish`, because pnpm rewrites `workspace:^` to `^<version>`); the wait loop checks both names read from their `package.json` files; the dispatches run only after both are live.

- [ ] **Step 1: Write the failing workflow test** — `bin/classicyReleaseWorkflow.test.ts` parses `push.yml` (the `yaml` package already in the tree, or a minimal parse) and asserts: `packages/**` in `paths`; a version-sync step for the Platinum package after the bump step; the publish step names both packages and uses pnpm; the wait loop iterates both `package.json` names; no step hard-codes `classicy` as a package name.
- [ ] **Step 2: Make the bump produce 3.0.0** — Read `phips28/gh-action-bump-version`'s configured major wording (its `major-wording` default) and either set `major-wording` explicitly or document the keyword; the PR 333 merge commit message must contain it. Record the exact keyword in the PR's release checklist. Prove it with `act`-free reasoning plus the action's README at the pinned ref; if the action cannot be made to produce 3.0.0 from a merge commit, add a one-off `workflow_dispatch` input `version` that, when set, is used instead, and document that path.
- [ ] **Step 3: Implement and prove the packed peer range** — `pnpm pack` both packages locally and assert the Platinum tarball's `package.json` has `"@classicy/classicy": "^<version>"` (this is also 3.4's pack test). — `pnpm --filter @classicy/appearance-platinum pack --pack-destination /tmp/claude-1001/-home-robbiebyrd-classicy/3047943f-7592-48d7-8a65-0338bea11319/scratchpad && tar -xOzf /tmp/claude-1001/-home-robbiebyrd-classicy/3047943f-7592-48d7-8a65-0338bea11319/scratchpad/classicy-appearance-platinum-*.tgz package/package.json | grep -A2 peerDependencies`
- [ ] **Step 4: CI builds the package too** — `ci.yml`'s `pnpm build:source` now covers it; add `pnpm --filter @classicy/appearance-platinum exec vitest run` if the root `pnpm test` does not include the package's tests (make the root vitest config's `projects`/workspace include it instead, so `pnpm test` stays the one command).
- [ ] **Step 5: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "ci: publish @classicy/classicy and @classicy/appearance-platinum together"`

**Validation:** `pnpm exec vitest run bin/classicyReleaseWorkflow.test.ts`

### 4.2: Docs, release notes and the program record

**Files:**
- Modify: `README.md`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `docs/BUILDING-APPS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md`
- Modify: `packages/appearance/platinum/README.md`
- Modify: `docs/plans/0002-ldj-dsgn-appearance-packages-program.md (body edit only)`

**Depends on:** 3.2, 3.4, 3.5, 4.1

**Interfaces:**
- Produces: Docs true to the new layout; release-note breaking-change entries (each with its migration step) for: the rename; the explicit Platinum import; the stop screen; removed exports (`PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks`, `platinumSoundPack`, `classicy/appearance/platinum`, `classicy/appearance/platinum/scss/*`, the old wallpaper helpers) with their replacements; removed icon paths (from 3.3); the moved strict-CSP stylesheets (`@classicy/classicy/dist/classicy.css`, `@classicy/appearance-platinum/classicy-platinum.css`, `…/classicy-platinum.fonts.css`, in that order); the second `optimizeDeps.exclude`; persisted wallpapers stored by filename. The release note's new entries need the owner's approval like the rest of it.

- [ ] **Step 1: README and AGENT-REFERENCE** — Install line `pnpm add @classicy/classicy @classicy/appearance-platinum`; the import; the stop screen; strict-CSP links in both specifier and `node_modules/…/dist/…` form; SCSS exports; Vite `optimizeDeps.exclude: ["@classicy/classicy", "@classicy/appearance-platinum"]`; AGENT-REFERENCE §8 (packages, knob floor, wallpapers, `icon`), §1 (CSP, cascade).
- [ ] **Step 2: CLAUDE.md** — Project Overview, Common Commands (`pnpm --filter @classicy/appearance-platinum …`), the Theming section ("importing classicy registers Platinum", "the Platinum floor", D14 sentences), Build Notes (two builds, `verify:dist` invariants, `resources/` location, the lint gates' scan roots).
- [ ] **Step 3: Release notes** — The entries listed in Produces, in the note's existing voice; a summary line at the top: 3.0.0, two packages.
- [ ] **Step 4: Program record** — Plan 0002-ldj body: a dated amendment line under the Shared Contract stating that D14 ("Platinum is always present") is superseded by plan 0014-ahm.
- [ ] **Step 5: Lint and the doc-pinning tests** — `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts src/Appearance/ClassicyCoreTheme.test.ts`
- [ ] **Step 6: Commit** — Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. — `git commit -m "docs: two packages, @classicy/classicy and @classicy/appearance-platinum"`

**Validation:** `pnpm lint`

### 4.3: Final verification: parity, sizes, and a real host

**Files:**
- Create: `bin/standalone-host/ (a throwaway Vite app under the scratchpad, not committed)`

**Depends on:** 4.2

**Interfaces:**
- Consumes: 0.1's baseline and sizes.

- [ ] **Step 1: Parity** — Rebuild and compare every story (t=0 and `--mid`) and the four example screens against 0.1: AE 0 everywhere. Any difference is a bug in this plan's work. Same recipe as 0.1 (`bin/parity/README.md` § "Baseline, after set, compare"), shooting into `$P/after`, then `pnpm parity:compare $P/before $P/after` (the `@mid` shots are compared too).
- [ ] **Step 2: Sizes** — Report both packages' bundle and `dist/` sizes against 0.1, and grep the core bundles for `data:audio`, wallpaper `data:image`, `woff2` and `@layer classicy.package`: none.
- [ ] **Step 3: A real host, both ways (review focus: strict CSP and bundler)** — Create a minimal Vite + React app in the scratchpad, install the two `pnpm pack` tarballs, `optimizeDeps.exclude` both: (a) with only `@classicy/classicy` imported, `vite build` succeeds and the page shows the stop screen; (b) adding `import "@classicy/appearance-platinum"` shows the desktop, plays the boot chime (Playwright: a `Howl` load succeeds, no 404 for a sprite, font or wallpaper URL); (c) a strict-CSP variant that disallows inline `<style>` and links the three stylesheets renders the same desktop.
- [ ] **Step 4: Full gate** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`
- [ ] **Step 5: Report** — Write the results to the story's work log: parity counts, sizes before/after, the three host runs, and the gate's test totals.

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Phase 5: Prepare the downstream apps

### 5.1: Prepare robbiebyrd/classicy-web for 3.0.0

**Files:**
- Modify: `robbiebyrd/classicy-web: package.json, the lockfile, every `from "classicy` import, the app entry, its classicy auto-bump workflow (deploy-pages)`

**Depends on:** 3.4

**Interfaces:**
- Consumes: The two `pnpm pack` tarballs from 4.3.

- [ ] **Step 1: Branch the repo** — Clone into the scratchpad, branch `classicy-3.0.0`; read its build/test commands and its `repository_dispatch` handler for `deploy-pages`.
- [ ] **Step 2: Switch to the new packages** — Replace `classicy` with `@classicy/classicy` and add `@classicy/appearance-platinum` (pinned `^3.0.0`), rewrite every `classicy` import and CSS/SCSS specifier, add `import "@classicy/appearance-platinum";` at the app entry, add both to `optimizeDeps.exclude` if it uses Vite, and handle any other 3.0 breaking change the build or its tests hit (the release note lists them).
- [ ] **Step 3: Verify against the tarballs** — Temporarily point both dependencies at the local tarballs (`file:`), run the repo's install, build and tests, and load the built app in Playwright: the desktop renders, no console errors, no 404s. Then restore `^3.0.0` ranges (the lockfile is regenerated once 3.0.0 is on npm; say so in the PR).
- [ ] **Step 4: Fix the auto-bump** — Its `deploy-pages` handler must bump `@classicy/classicy` and `@classicy/appearance-platinum` together; a bump of `classicy` would find no 3.0.0.
- [ ] **Step 5: Open the PR** — Title `Classicy 3.0.0: @classicy/classicy and @classicy/appearance-platinum`; body: what changed, the verification run, and that it must merge only after 3.0.0 is published (or before PR 333 merges, if the auto-bump is ready to resolve it). Do not merge; the owner merges.

### 5.2: Prepare Keeping-History/rt911 for 3.0.0

**Files:**
- Modify: `Keeping-History/rt911: package.json, the lockfile, every `from "classicy` import, the app entry, its classicy auto-bump workflow (classicy-published)`

**Depends on:** 3.4

**Interfaces:**
- Consumes: The two `pnpm pack` tarballs from 4.3.

- [ ] **Step 1: Branch the repo** — Clone into the scratchpad, branch `classicy-3.0.0`; read its build/test commands and its `repository_dispatch` handler for `classicy-published`.
- [ ] **Step 2: Switch to the new packages** — Replace `classicy` with `@classicy/classicy` and add `@classicy/appearance-platinum` (pinned `^3.0.0`), rewrite every `classicy` import and CSS/SCSS specifier, add `import "@classicy/appearance-platinum";` at the app entry, add both to `optimizeDeps.exclude` if it uses Vite, and handle any other 3.0 breaking change the build or its tests hit (the release note lists them).
- [ ] **Step 3: Verify against the tarballs** — Temporarily point both dependencies at the local tarballs (`file:`), run the repo's install, build and tests, and load the built app in Playwright: the desktop renders, no console errors, no 404s. Then restore `^3.0.0` ranges (the lockfile is regenerated once 3.0.0 is on npm; say so in the PR).
- [ ] **Step 4: Fix the auto-bump** — Its `classicy-published` handler must bump `@classicy/classicy` and `@classicy/appearance-platinum` together; a bump of `classicy` would find no 3.0.0.
- [ ] **Step 5: Open the PR** — Title `Classicy 3.0.0: @classicy/classicy and @classicy/appearance-platinum`; body: what changed, the verification run, and that it must merge only after 3.0.0 is published (or before PR 333 merges, if the auto-bump is ready to resolve it). Do not merge; the owner merges.

## Phase 6: Owner actions and release

- [ ] [OWNER] Create the free npm organization `classicy` on npmjs.com.
- [ ] [OWNER] Make sure the `NPM_TOKEN` secret can publish `@classicy/*` (a granular token that lists the organization, or a classic automation token).
- [ ] [OWNER] Approve the new release-note entries (4.2).
- [ ] [OWNER] Merge the classicy-web and rt911 PRs (5.1, 5.2) when ready, per their PR notes.
- [ ] [OWNER] Merge PR 333 with the major-bump keyword recorded in 4.1, so both packages publish as 3.0.0.
- [ ] [OWNER] After both 3.0.0 packages are live, run `npm deprecate classicy "Renamed to @classicy/classicy. See https://github.com/robbiebyrd/classicy#readme"`.
- [ ] [OWNER] V&V: in the example app and on classicy-web, the desktop looks and sounds as before (boot chime, button clicks, menu hover), the Appearance Manager's Themes tab shows Platinum's icon, a saved custom theme with a wallpaper survives the upgrade, and a host with Platinum removed shows the stop screen.

## Acceptance Criteria

- [ ] The core's static import graph reaches no Platinum file, and its bundles hold no Platinum CSS, art, fonts, wallpapers or sound sprites (`verify:dist`).
- [ ] With only `@classicy/classicy` installed, a host builds and shows the stop screen; adding `@classicy/appearance-platinum` and its import gives a desktop pixel-identical to the 0.1 baseline (AE 0, every story and screen).
- [ ] Saved 2.1.x state (built-in theme reference, custom theme with wallpaper, knob override) loads unchanged once Platinum registers.
- [ ] Both packages pack correctly: no `resources/`, no tests, the peer range `^<version>`; `push.yml` publishes both at the same version and the release trigger includes `packages/**`.
- [ ] The classicy-web and rt911 PRs build and render against the 3.0.0 tarballs.
- [ ] Full gate green at the end.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Location and name (decision 1) | 3.1, 3.4 |
| Explicit load (decision 2) | 1.5, 1.6, 3.2 |
| No package, no desktop (decision 3) | 1.5 |
| Same release (decision 4) | the whole plan lands on feat/AppearancePackages |
| 3.0.0, downstream prepared, trigger paths (decision 5) | 4.1, 5.1, 5.2, Phase 6 |
| Platinum's contents, assets/ rule, resources/ (decision 6) | 3.1, 3.3, 3.5 |
| Core floor (decision 7) | 1.1 |
| @classicy/classicy rename and deprecation (decision 8) | 2.1, 4.1, Phase 6 |
| Resolution chain and fallback | 1.5 |
| Load path without a Platinum special case | 1.2 |
| Persisted wallpapers by filename | 1.4 |
| Sound without Platinum | 1.3 |
| Build outputs, exports, verify:dist | 3.4 |
| Tests, Storybook, example | 1.5, 3.2 |
| Releasing (lockstep, peer range, owner actions) | 4.1, Phase 6 |
| Docs and release notes | 2.1, 4.2 |
| Anti-goals (one registry, no Platinum in core, parity, persisted state, rename scope) | 3.1 step 5, 3.4, 4.3, 1.2, 2.1 |
| Package icon | 1.5 |
| Lint gates cover the moved SCSS | 3.2 |
| Success criteria | 4.3 |

**Placeholder scan:** No TBDs. Two choices are deliberately left to the implementer with a rule: the exact structural-knob list (derived from and pinned to AGENT-REFERENCE's table by a test in 1.1) and the stop screen's markup (copy fixed in 1.5). The bump-to-3.0.0 mechanism in 4.1 has a stated fallback (a `workflow_dispatch` version input) if the action cannot do it from a merge commit.
**Residual risk:** Phase 1.5's test churn (every desktop-mounting test without an explicit Platinum import) is the largest diff; 3.2's specifier rewrite is mechanical but wide. The workspace cycle (core dev-depends on Platinum, Platinum peer-depends on the core) must be proven in a clean CI checkout in 3.4/4.1.

## Execution: concurrency and order

The dependency graph above is drawn for speed: a section waits only for sections whose code or interfaces it uses. The critical path is **1.1 → 1.2 → 1.6 → 3.1 → 3.3 → 3.4 → 4.2 → 4.3** (with 1.4 feeding 1.2); everything else runs beside it. Run at most five implementers at once (each with its own worktree and a `--maxWorkers=2` gate); fill free slots in the order given.

| Wave | Starts when | Sections (critical path first) |
|---|---|---|
| A | now | 1.1, 1.4, 0.1, 2.1, 1.3, then 3.5, 4.1 (and the independent bug 0120-ak4) |
| B | 1.1 and 1.4 land (1.5 needs only 1.1) | 1.2, 1.5 |
| C | 1.2, 1.3, 1.5 land | 1.6 |
| D | 1.6 and 2.1 land | 3.1 |
| E | 3.1 lands | 3.3, 3.2 (parallel) |
| F | 3.3 lands | 3.4 |
| G | 3.4 lands (and 3.2, 3.5, 4.1 for 4.2) | 4.2, 5.1, 5.2 (5.1/5.2 may branch and rewrite imports as soon as 2.1 lands, and verify against tarballs after 3.4) |
| H | 4.2 lands | 4.3, then the owner's Phase 6 |

**Landing rules for parallel work.**
- Nothing lands before 0.1's baseline exists: other sections may start, but merge only after it is captured.
- Sections land one at a time, in critical-path order when two are ready together. Each rebases onto the tip and passes the full gate before the fast-forward.
- Expected overlaps, resolved at rebase:
  - 1.1 and 1.4 (`ClassicyAppearance.ts`, `ClassicyBuiltInThemes.internal.ts`);
  - 2.1 and any section that edits CLAUDE.md, AGENT-REFERENCE or `ClassicyPackageExports.test.ts`;
  - 3.2 and 3.3 (root tests that import Platinum);
  - 1.3/1.4 and 1.6 (`vi.mock` lines, desktop tests).
- A lockfile conflict is resolved by regenerating with `--config.minimum-release-age=10080` and checking the `libc:` count.

## Next Steps

1. File one story per section (0.1 … 5.2), chained with `depends` in this plan's order, plus a V&V story for Phase 6's owner checks.
2. Execute subagent-driven: one implementer per section in its own worktree, review, fix, controller verification, land on feat/AppearancePackages; sections in Phase 1 run in dependency order (1.3 may run beside 1.2).
