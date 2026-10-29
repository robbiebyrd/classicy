---
id: 0005-1b3
title: 'Part B: Package core and the Platinum package'
type: impl
status: in_progress
priority: "2"
effort: XL
created: "2026-10-28T19:03:51.006Z"
updated: "2026-10-29T11:35:07.729Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0003-7x7", "depends"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: in_progress
  "1.1":
    status: in_progress
  "2":
    status: pending
  "2.1":
    status: pending
  "3":
    status: pending
  "3.1":
    status: pending
  "4":
    status: pending
  "4.1":
    status: pending
  "4.2":
    status: pending
  "4.3":
    status: pending
  "5":
    status: pending
  "5.1":
    status: pending
  "6":
    status: pending
---

# Part B: Package core and the Platinum package

## Summary

**Goal:** Classicy gains a runtime Appearance Package registry, a persisted active package id written to the desktop root, and a Platinum package module that owns every Platinum mixin, asset and preset, with built-ins rendering pixel-identical.

**Problem:** The Platinum look is compiled into Classicy: appearance.scss (20 mixins), scrollbars.scss (10 mixins) and assets.scss (13 base64 SVGs) live under CP/AppearanceManager/styles and are @used by 43 component stylesheets (audit §2.3, §2.2); the 21 themes in themes.json are Classicy data, not package presets (§1.2, D24); there is no package registry, no active-package state and no root attribute to scope a package's CSS (§2.9, §8.2); theme JSON and theme files carry no package id (§9 Phase 2 item 4).

**Approach:** Create src/Appearance/ (registry, zod schema, style injector, layout hook) and src/Appearance/Platinum/ (platinum.json with the 21 presets, renamed platinum-* mixins, per-component look partials compiled with Vite ?inline and scoped by the classicy-package mixin), add Appearance.packageId plus ClassicyDesktopChangeAppearancePackage, give themes a package field, and re-point package.json, the example app and Storybook; every step is gated by the full Storybook parity set.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 2 (§8.1 naming, §8.2 package shape) under umbrella plan 0002-ldj: the 'package module', 'directories and exports' and 'layout declarations (storage)' contract sections, plus the appearance hook and event *types* that part I implements. Part A (vocabulary, @layer classicy.base, classicy-no-select / classicy-px-rect in src/Appearance/vocabulary/_layout.scss) must be merged first; parts C and D register under the string id "platinum" and are wired into the Platinum registration by 5.1 Step 6 when present. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript 5.9, React 19 (useSyncExternalStore), zod 4 (.default() does not re-parse; .catchall for open families), Zustand + Immer reducer, SCSS (sass 1.101 via Vite; `?inline` import for the package CSS), vitest 5 + jsdom (CSS imports resolve to "" under vitest, so compiled-CSS assertions call the sass API directly), Biome, barrelsby, Storybook 10 + Playwright + ImageMagick compare.

## Constraints

- Pixel-identical: every Storybook story screenshot compares with AE 0 before vs after; no visual change is named by this part.
- Before every commit: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test (CI runs the same three); pnpm build:source before the final commit.
- Library code logs through classicyLog(level, subsystem, message) — never console.*; subsystem "ClassicyAppearance" for the registry and reducer messages.
- src/index.ts is barrel-generated: run pnpm generate-barrels after adding modules; never hand-edit it. src/Appearance/Platinum/index.ts is hand-written and must survive barrelsby's purge (4.1 Step 5 flips .ts-barrel.json noHeader to false so only header-carrying barrels are deleted).
- Contract names from plan 0002-ldj are used verbatim; names invented here are local to this part's files (CLASSICY_FALLBACK_APPEARANCE_PACKAGE, classicyKnobsToSchema, hasPackageId, migrateAppearancePackage, the components/_<Name>.scss partials).
- Commits end with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>; commit after every section at minimum.
- American English spelling in code, comments and docs (color, behavior, gray, center, normalize).
- Review focus: (1) a moved mixin include that previously lost to a later base rule for a state (e.g. .classicyWindowRed border, utility title bar) now wins from the package layer — caught by 4.2 Step 6 parity; (2) registration order: getAllThemes() reads platinum.json statically so DefaultAppManagerState never depends on the Platinum side-effect import — 4.1 Step 7; (3) a persisted state without packageId or a theme without package must load — 2.1 Step 1 and 3.1 Step 1; (4) ClassicyDesktopChangeAppearancePackage with an unregistered id is a logged no-op and ImportTheme for an unregistered package shows the error dialog — 2.1 Step 1, 3.1 Step 1; (5) the generic measurements walker must emit exactly the 21 input variables it replaces, byte-identical — 3.1 Step 5.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/ClassicyAppearancePackage.ts` | create | Contract types (package, layout, asset source, hook/event types), registry with useSyncExternalStore, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, CLASSICY_FALLBACK_APPEARANCE_PACKAGE, useActiveClassicyAppearancePackage, useClassicyAppearanceLayout. |
| `src/Appearance/ClassicyAppearancePackageSchema.ts` | create | zod ClassicyAppearancePackageSchema (everything but css/options/hooks), ClassicyAppearanceLayoutSchema, classicyKnobsToSchema. |
| `src/Appearance/ClassicyAppearanceStyles.ts` | create | injectClassicyAppearanceStyles(id, css): idempotent <style id="classicy-appearance-<id>"> after #classicy-styles; no-op without document. |
| `src/Appearance/vocabulary/_package.scss` | create | classicy-package($id) mixin emitting @layer classicy.package { .classicyDesktop[data-classicy-appearance="<id>"] { @content } }. |
| `src/Appearance/Platinum/index.ts` | create | Side-effect module: imports platinum.json and styles/platinum.scss?inline, calls registerClassicyAppearancePackage once. |
| `src/Appearance/Platinum/platinum.json` | create | id, name, defaults (the Default preset), presets (the 21 themes.json entries with package: "platinum"), layout, knobs. |
| `src/Appearance/Platinum/styles/platinum.scss` | create | Entry compiled to the css string: @use mixins/scrollbars/assets and every components/_*.scss inside @include classicy-package("platinum"). |
| `src/Appearance/Platinum/styles/_mixins.scss` | create | appearance.scss moved here; 18 platinum* mixins, theme-halftone and encode-color renamed platinum-*; px-rect/no-select consumed from the vocabulary. |
| `src/Appearance/Platinum/styles/_scrollbars.scss` | create | scrollbars.scss moved here; 10 mixins renamed platinum-scrollbar*. |
| `src/Appearance/Platinum/styles/_assets.scss` | create | assets.scss moved here verbatim (13 $variables; part E replaces the data URIs). |
| `src/Appearance/Platinum/styles/components/_<Component>.scss` | create | 22 per-component look partials (Window, Alert, WindowFrame, Desktop, Menu, PopUpMenu, BevelButton, Button, Checkbox, Placard, Table, DriveSetupList, Meter, Output, ProgressBar, SplitView, Assistant, StartupScreen, QuickTimeMovieEmbed, ControlStrip, Slider, DesktopIcon, Icon) holding the @include / asset reads moved out of base. |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/{appearance,scrollbars,assets}.scss` | delete | Moved into the Platinum package (fonts.scss stays for part C). |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json` | delete | Absorbed into platinum.json presets (D24). |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` | modify | ClassicyTheme.package; measurements index signature; getThemeVars generic measurements walker; resolvedThemes from platinum.json presets. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts` | modify | package: z.string().default("platinum"); measurements .catchall for package families. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts` | modify | readClassicyTheme refuses a theme whose package is not registered; export keeps package. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` | modify | Appearance.packageId in DefaultAppManagerState. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` | modify | migrateAppearancePackage fills a missing packageId / theme.package copy-on-write. |
| `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` | modify | hasPackageId predicate. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` | modify | ClassicyDesktopChangeAppearancePackage case; ImportTheme refusal with error dialog. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` | modify | import "@/Appearance/Platinum"; data-classicy-appearance on the root. |
| `src/SystemFolder/**/*.scss (43 files listed in 4.2/4.3)` | modify | Drop @use of AppearanceManager/styles; move look includes and asset reads to the Platinum partials; no-select → vocabulary. |
| `package.json, .ts-barrel.json, src/custom.d.ts` | modify | exports ./scss/* → vocabulary, ./appearance/platinum, ./appearance/platinum/scss/*; sideEffects; files; barrelsby noHeader false; *.scss?inline module declaration. |
| `storybook/.storybook/{preview.tsx,ClassicyDecorators.tsx}, example/src/Applications/{Browser,BlueBox}/*.scss` | modify | Toolbar themes from platinum.json presets; data-classicy-appearance on the story frame; example SCSS uses classicy/appearance/platinum/scss/mixins. |
| `docs/AGENT-REFERENCE.md, CLAUDE.md` | modify | Package registry, action, theme package field, export paths. |

## Phase 0: Parity baseline

- [ ] Start Storybook in the background (`pnpm storybook`; note the port it prints, normally 6006).
- [ ] `curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(sorted(e["id"] for e in d["entries"].values() if e["type"]=="story")))' > .playwright-mcp/parity/part-b/stories.txt` — this is the full set (every story, ~126 ids), not a subset.
- [ ] Playwright: for each id open `http://localhost:<port>/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-b/before/<id>.png`.
- [ ] Verify `ls .playwright-mcp/parity/part-b/before | wc -l` equals `wc -l < stories.txt`. No commit (the directory is gitignored).

**Validation:** `ls .playwright-mcp/parity/part-b/before | wc -l  # equals the story count`

## Phase 1: Package registry, schema and style injection

### 1.1: ClassicyAppearancePackage.ts, ClassicyAppearancePackageSchema.ts, ClassicyAppearanceStyles.ts

**Files:**
- Create: `src/Appearance/ClassicyAppearancePackage.ts`
- Create: `src/Appearance/ClassicyAppearancePackageSchema.ts`
- Create: `src/Appearance/ClassicyAppearanceStyles.ts`
- Test: `src/Appearance/ClassicyAppearancePackage.test.tsx`
- Test: `src/Appearance/ClassicyAppearancePackageSchema.test.ts`
- Test: `src/Appearance/ClassicyAppearanceStyles.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: ClassicyTheme / getTheme (ClassicyAppearance.ts); ClassicyThemeSchema; CLASSICY_COMPONENT / ClassicyComponentName / ClassicyState / classicyStateClasses from src/Appearance/vocabulary/ClassicyVocabulary.ts (part A); classicyLog; useAppManager (ClassicyAppManagerUtils.tsx) — only inside hooks, so the import cycle AppManager → DesktopManager → ClassicyAppearancePackage → AppManagerUtils is function-level like the existing DesktopManager ↔ AppManager cycle.
- Produces: Exactly the contract block of plan 0002-ldj 'package module' plus the 'appearance hook and events' types (ClassicyAppearanceEvent, ClassicyAppearanceDecoration, ClassicyAppearanceContext, ClassicyAppearanceHandler, ClassicyAppearanceHooks) — types only; part I writes useClassicyAppearance. Local additions: `assets?: Partial<Record<"icons"|"cursors"|"wallpapers"|"fonts"|"systemArt", ClassicyAssetTreeLike>>` with `type ClassicyAssetTreeLike = { [key: string]: ClassicyAssetSource | ClassicyAssetTreeLike }` and `sounds?: Array<{ id: string; name: string; packageId?: string } & Record<string, unknown>>` (structurally identical to parts C/D's types so either side assigns without importing the other); `export const CLASSICY_FALLBACK_APPEARANCE_PACKAGE: ClassicyAppearancePackage` = `{ id: "platinum", name: "Platinum", css: "", defaults: getTheme("default"), presets: getAllThemes(), layout: { window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } } }` (frozen; returned only when no package is registered — the structure-only render of audit §8.2); `useClassicyAppearanceLayout(): ClassicyAppearanceLayout` = `useActiveClassicyAppearancePackage().layout`. registerClassicyAppearancePackage validates with the schema and on failure logs `classicyLog("error", "ClassicyAppearance", `Package "${id}" was not registered: ${issues}`)` and returns without registering; on success calls injectClassicyAppearanceStyles(pkg.id, pkg.css) then publishes. Schema file: `ClassicyAppearanceLayoutSchema` (three z.enum groups, all required), `ClassicyAppearancePackageSchema = z.object({ id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(64), defaults: ClassicyThemeSchema, presets: z.array(ClassicyThemeSchema).max(256).optional(), layout: ClassicyAppearanceLayoutSchema, assets: z.record(z.string(), assetTree).optional(), sounds: z.array(z.looseObject({ id: z.string(), name: z.string() })).optional() })` where assetTree is `z.lazy(() => z.record(z.string(), z.union([z.string().refine(isClassicyAssetSource), assetTree])))`; `isClassicyAssetSource(v)`: a string that is a `data:` URI, an absolute http(s) URL, or a bundler URL (`/`, `./`, `../` or `blob:` prefix) — empty string is false. `classicyKnobsToSchema(knobs: ClassicyAppearanceKnobs): z.ZodObject<any>` with `type ClassicyAppearanceKnobs = Record<string, Record<string, { label: string; min: number; max: number; default: number }>>` (family → key) returning `z.looseObject({ [family]: z.object({ [key]: z.number().min(min).max(max).default(default) }) })`. Styles file: `CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX = "classicy-appearance-"`.

- [ ] **Step 1: Write the failing registry tests** — src/Appearance/ClassicyAppearancePackage.test.tsx (a `makePackage(id)` helper builds a valid package from getTheme("default") with css "" and the Platinum layout). Tests: `registers and lists in registration order` (register b then a → listClassicyAppearancePackages().map(p=>p.id) deep-equals ["b","a"]); `re-registering the same id replaces in place` (register a with name "One" then "Two" → getClassicyAppearancePackage("a")?.name === "Two", list length 1, position unchanged); `rejects an invalid package and logs an error` (id "Not Kebab" → getClassicyAppearancePackage returns undefined; a registerClassicyLogSink spy received one entry with level "error" and subsystem "ClassicyAppearance"); `injects the package css on register` (css ".x{}" → document.getElementById("classicy-appearance-a")?.textContent === ".x{}"); `subscribe fires once per register and stops after unsubscribe`; `useClassicyAppearancePackages re-renders on registration` (renderHook; act(register) → result.current.length increments); `useActiveClassicyAppearancePackage falls back to platinum for an unknown packageId` (register platinum stub + set useAppManager state packageId "irix" → result id "platinum" and `toBe` the registered object); `returns CLASSICY_FALLBACK_APPEARANCE_PACKAGE when nothing is registered` (`toBe` the constant, css ""); `useClassicyAppearanceLayout returns the active package layout` (register "mirror" with growBoxCorner "bottom-left", set packageId "mirror" → layout.window.growBoxCorner === "bottom-left"); `isClassicyAssetSource` table: "data:image/png;base64,AA" true, "https://x/y.png" true, "/assets/a.png" true, "./a.png" true, "blob:https://x/1" true, "" false, "javascript:alert(1)" false, 5 false. Reset between tests with the test-only export `resetClassicyAppearancePackagesForTests()` (clears the map, removes injected style elements).
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — Cannot find module '@/Appearance/ClassicyAppearancePackage'. — `pnpm exec vitest run src/Appearance/ClassicyAppearancePackage.test.tsx`
- [ ] **Step 3: Write the failing schema and injector tests** — ClassicyAppearancePackageSchema.test.ts: `accepts a package with all 21 presets` (platinum-shaped object built from getAllThemes() → success); `rejects a missing layout group` (delete layout.menuBar → failure with path ["layout","menuBar"]); `rejects an unknown growBoxCorner` ("middle"); `strips css, options and hooks` (input carries css "x" and hooks {} → parsed data has no css key); `accepts a nested asset tree` ({ icons: { system: { alias: "/a.png" } } }) and `rejects an empty-string asset` ({ icons: { a: "" } }); `classicyKnobsToSchema builds a bounded number per knob` (knobs { menuFrame: { shadow: { label: "Shadow", min: 0, max: 4, default: 1 } } } → parse({}) gives { menuFrame: { shadow: 1 } }; parse({ menuFrame: { shadow: 9 } }) fails; unknown family "extra" passes through). ClassicyAppearanceStyles.test.ts: `inserts the style element directly after #classicy-styles` (prepend a <style id="classicy-styles"> to head → inject("p", ".a{}") → head.children[1].id === "classicy-appearance-p"); `appends to head when #classicy-styles is absent`; `is idempotent and updates the text on a second call` (two calls → one element, textContent of the last call); `is a no-op without document` (vi.stubGlobal("document", undefined) → does not throw).
- [ ] **Step 4: Run them to verify they fail** — Expected: FAIL — modules not found. — `pnpm exec vitest run src/Appearance`
- [ ] **Step 5: Implement the three modules per the Interfaces block** — Registry shape mirrors ClassicyControlStripRegistry.ts (Map + listeners Set + cached array snapshot republished on every change; `useClassicyAppearancePackages` = useSyncExternalStore(subscribe, () => snapshot, () => snapshot)). `useActiveClassicyAppearancePackage` reads `useAppManager((s) => s.System.Manager.Appearance.packageId)` and `useClassicyAppearancePackages()`, then `getClassicyAppearancePackage(packageId) ?? getClassicyAppearancePackage("platinum") ?? CLASSICY_FALLBACK_APPEARANCE_PACKAGE`. Hook/event types are copied verbatim from the contract (CSSProperties from react).
- [ ] **Step 6: Run tests to verify they pass; regenerate barrels** — Expected: PASS; src/index.ts now exports the three modules. — `pnpm exec vitest run src/Appearance && pnpm generate-barrels && pnpm exec tsc --noEmit -p .`
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance src/index.ts && git commit -m "feat(appearance): package registry, schema and style injection" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance`

## Phase 2: Active package in the store and on the desktop root

### 2.1: Appearance.packageId, ClassicyDesktopChangeAppearancePackage, data-classicy-appearance

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: `storybook/.storybook/ClassicyDecorators.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.appearancePackage.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.appearancePackage.test.ts`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.appearance.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes: getClassicyAppearancePackage, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID (1.1); cloneClassicyTheme (ClassicyCustomTheme.ts); the Immer reducer test harness of ClassicyDesktopManager.importTheme.test.ts:20-36 (makeStore/run).
- Produces: `ClassicyStoreSystemAppearanceManager.packageId: string` (ClassicyAppearance.ts:11-40 interface; doc comment: the active Appearance Package id, persisted, default "platinum"); DefaultAppManagerState (ClassicyAppManager.ts:620) adds `packageId: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`; `hasPackageId(m): m is Msg & { packageId: string }` after hasAvailableThemes (ClassicyActionPredicates.ts:278); reducer case `ClassicyDesktopChangeAppearancePackage` beside ChangeTheme (ClassicyDesktopManager.tsx:294): `if (!hasPackageId(action)) break; const pkg = getClassicyAppearancePackage(action.packageId); if (!pkg) { classicyLog("warn", "ClassicyAppearance", `Appearance package "${action.packageId}" is not registered.`); break; } appearance.packageId = pkg.id; if (appearance.activeTheme.package !== pkg.id) appearance.activeTheme = cloneClassicyTheme(pkg.defaults);` (availableThemes untouched — part J owns preset lists); `migrateAppearancePackage(state)` chained after migrateThemeMetrics (ClassicyStateMigrations.ts:34-35): copy-on-write fill of `packageId` (default "platinum") and of `package` on activeTheme/availableThemes[]/customThemes[] (default "platinum"); doc comment line `- 2.2: Appearance.packageId and theme.package default to "platinum"`. ClassicyDesktop.tsx: `const packageId = useAppManager((s) => s.System.Manager.Appearance.packageId)` and `data-classicy-appearance={packageId}` on the root div (line 603-615); `import "@/Appearance/Platinum"` is added in 4.1 (the module does not exist yet). ClassicyDecorators.tsx:84-86: the non-desktop story frame div also carries `data-classicy-appearance={useAppManager((s) => s.System.Manager.Appearance.packageId)}` (via a small `StoryFrame` component so the hook is legal).

- [ ] **Step 1: Write the failing reducer and migration tests** — ClassicyDesktopManager.appearancePackage.test.ts (harness copied from importTheme.test.ts; registers a stub package "irix" via registerClassicyAppearancePackage with defaults = getTheme("azul") given package "irix" and id "irix-default", plus a "platinum" stub, in beforeEach; resetClassicyAppearancePackagesForTests in afterEach): `default state carries packageId platinum` (DefaultAppManagerState.System.Manager.Appearance.packageId === "platinum"); `switches to a registered package and activates its defaults` (run ChangeAppearancePackage { packageId: "irix" } → packageId "irix", activeTheme.id "irix-default", activeTheme not `toBe` the registered defaults object); `keeps the active theme when it already belongs to the package` (activeTheme.package "irix" set first → activeTheme reference unchanged); `ignores an unregistered id with a warning` (packageId "beos" → state unchanged; log sink saw level "warn"); `ignores a payload without packageId`; `is unreachable to untrusted dispatches` (isUntrustedActionAllowed("ClassicyDesktopChangeAppearancePackage") === false). ClassicyStateMigrations.appearancePackage.test.ts: `fills packageId and theme.package when absent` (DefaultAppManagerState deep-cloned with packageId deleted and package deleted from activeTheme, availableThemes[0], customThemes[0] → all "platinum"); `returns the same object when complete` (`toBe(DefaultAppManagerState)`); `does not mutate the input` (deep-frozen input, no throw).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — packageId undefined; reducer case missing (state unchanged where change expected). — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.appearancePackage.test.ts src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.appearancePackage.test.ts`
- [ ] **Step 3: Implement the store field, predicate, reducer case and migration** — Per the Interfaces block. `ClassicyTheme.package` is typed in 3.1; here add it as `package: string` to the type already (3.1 adds the schema side) so the migration compiles — every ClassicyTheme literal that tsc flags gets `package: "platinum"`.
- [ ] **Step 4: Write the failing desktop-root test** — ClassicyDesktop.appearance.test.tsx (setup as ClassicyDesktop.test.tsx:28-45): `writes the active package id on the desktop root` (render → document.getElementById("classicyDesktop")?.getAttribute("data-classicy-appearance") === "platinum"); `follows a package switch` (act(() => useAppManager.setState(s => ({ ...s, System: { ...s.System, Manager: { ...s.System.Manager, Appearance: { ...s.System.Manager.Appearance, packageId: "irix" } } } }))) → attribute "irix").
- [ ] **Step 5: Implement the root attribute in ClassicyDesktop.tsx and the Storybook frame** — Per the Interfaces block; run the test → PASS.
- [ ] **Step 6: Run tests, type-check, commit** — git commit -m "feat(appearance): active package id in the store, ChangeAppearancePackage and the desktop root attribute" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/ControlPanels/AppManager`

## Phase 3: Theme package field, theme files and the measurements walker

### 3.1: ClassicyTheme.package, schema default, file export/import refusal, generic getThemeVars walker

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes: getClassicyAppearancePackage (1.1); intToPx (ClassicySize.ts); the existing getThemeVars test `emits every metric input and derivation for the default theme` (ClassicyAppearance.test.ts:123).
- Produces: ClassicyThemeSchema (ClassicyThemeSchema.ts:94): `package: z.string().max(64).default("platinum")` after `name`; `measurements: z.object({...}).catchall(z.record(z.string(), measurement))` so a package family (`controlStrip`, `menuFrame`, …) of numbers passes and anything else is rejected. ClassicyAppearance.ts: `ClassicyThemeMeasurements` gains `[family: string]: Record<string, number>` (an index signature; the five named groups stay); `ClassicyTheme.package: string`. getThemeVars: replace the 21 explicit `measurements` input emissions (`--window-control-size` … `--layout-dialog-edge`, ClassicyAppearance.ts:189-192 and 240-259) with a generic walker `for (const [family, keys] of Object.entries(m)) for (const [key, n] of Object.entries(keys)) if (typeof n === "number") vars[`--${kebab(family)}-${kebab(key)}`] = intToPx(n)` where `kebab` lower-cases each capital with a leading hyphen (`groupBox` → `group-box`, `titleBarHeight` → `title-bar-height`); the derived variables (`--window-scrollbar-arrow-size`, `--button-height`, frames, bevels, …) stay explicit after the walker. themes.json: every entry gains `"package": "platinum"` after `"name"` (this file is deleted in 4.1; the field travels into platinum.json). ClassicyThemeFile.ts readClassicyTheme: after schema parse, `if (!getClassicyAppearancePackage(theme.package)) return { ok: false, error: `This theme needs the "${theme.package}" appearance package, which is not installed.` }`; exportClassicyTheme writes `package` (it is part of the schema output). ClassicyDesktopManager.tsx ImportTheme (line 308-331): when `readClassicyTheme` fails, set `ds.System.Manager.Desktop.errorDialog = { title: "Appearance", message: read.error }` (today it breaks silently) and `classicyLog("warn", "ClassicyAppearance", read.error)`.

- [ ] **Step 1: Write the failing schema, file and import tests** — ClassicyThemeSchema.test.ts: `defaults package to platinum when absent` (delete package → data.package === "platinum"); `keeps a package id`; `accepts a package measurement family` (measurements.controlStrip { cellHeight: 22 } → data.measurements.controlStrip.cellHeight === 22); `rejects a non-numeric package measurement` (controlStrip { cellHeight: "22" } → failure). ClassicyThemeFile.test.ts: `writes the package id` (exportClassicyTheme(theme("default")) parsed JSON theme.package === "platinum"); `a v1 file without package loads as platinum`; `refuses a theme for an uninstalled package` (package "irix", nothing registered → error equals the exact message above). importTheme.test.ts: `refuses an uninstalled package with the error dialog` (payload package "irix" → customThemes unchanged, Desktop.errorDialog.message equals the message, title "Appearance"); `accepts a registered package` (register "irix" stub → imported, activeTheme.package "irix").
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — package key stripped / missing refusal. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.importTheme.test.ts`
- [ ] **Step 3: Implement the schema field, catchall, type, themes.json field, readClassicyTheme refusal and the ImportTheme error dialog** — Per the Interfaces block. The `AssertTrue` guard in ClassicyThemeSchema.ts:152-156 must still compile (the catchall output `Record<string, Record<string, number>>` matches the index signature). Add `package: "platinum"` to themes.json with a one-off node script (tab indentation preserved).
- [ ] **Step 4: Run them to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 5: Write the failing walker tests, then implement the walker** — ClassicyAppearance.test.ts: `emits a package measurement family as kebab-case px variables` (getTheme("default") with measurements.controlStrip { cellHeight: 22, moduleWidth: 30 } → vars["--control-strip-cell-height"] === "22px", vars["--control-strip-module-width"] === "30px"); `the walker reproduces every input variable byte-identically` (snapshot of the 21 input entries from the existing test at :123 — same keys, same values: `--window-control-size` "12px", `--group-box-margin-side` "10px", `--layout-dialog-edge` "12px", …); `ignores non-numeric leaves` (a family with a string leaf emits nothing for it). Then replace the explicit input emissions with the walker; run → PASS, including the untouched derivation assertions.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "feat(theme): package id on themes and files, open measurement families in getThemeVars" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager`

## Phase 4: The Platinum package

### 4.1: platinum.json, index.ts, vocabulary _package.scss, moved and renamed mixin files, compiled css

**Files:**
- Create: `src/Appearance/Platinum/index.ts`
- Create: `src/Appearance/Platinum/platinum.json`
- Create: `src/Appearance/Platinum/styles/platinum.scss`
- Create: `src/Appearance/Platinum/styles/_mixins.scss`
- Create: `src/Appearance/Platinum/styles/_scrollbars.scss`
- Create: `src/Appearance/Platinum/styles/_assets.scss`
- Create: `src/Appearance/vocabulary/_package.scss`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: `.ts-barrel.json`
- Modify: `src/custom.d.ts`
- Modify: `package.json`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/styles/scrollbars.scss`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/styles/assets.scss`
- Test: `src/Appearance/Platinum/ClassicyPlatinum.test.ts`
- Test: `src/Appearance/Platinum/styles/platinum.css.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts`
- Test: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.typescale.test.ts`

**Depends on:** 3.1

**Interfaces:**
- Consumes: registerClassicyAppearancePackage, classicyKnobsToSchema (1.1); `classicy-px-rect` and `classicy-no-select` from src/Appearance/vocabulary/_layout.scss (part A); sass (devDependency) for the css test.
- Produces: platinum.json: `{ "id": "platinum", "name": "Platinum", "defaults": <the themes.json "default" entry>, "presets": [<all 21 entries, in themes.json order, each with package "platinum">], "layout": { "window": { "growBoxCorner": "bottom-right" }, "menuBar": { "placement": "screen" }, "desktop": { "iconGridOrigin": "top-right" } }, "knobs": {} }` (knobs is the family→key map of 1.1's ClassicyAppearanceKnobs; part H adds controlStrip/menuFrame/pager/balloonHelp entries). index.ts: `import platinumJson from "./platinum.json"; import platinumCss from "./styles/platinum.scss?inline"; registerClassicyAppearancePackage({ ...platinumJson, css: platinumCss, options: classicyKnobsToSchema(platinumJson.knobs), layout: platinumJson.layout })` — side effects only, no exports (export `PLATINUM_APPEARANCE_PACKAGE_ID = "platinum"` is allowed). ClassicyAppearance.ts:1-8 and 267-277: `themesData` now comes from `@/Appearance/Platinum/platinum.json` (`platinumJson.presets`) — a data import, so DefaultAppManagerState never waits for the side-effect module. ClassicyDesktop.tsx: `import "@/Appearance/Platinum";` beside the scss import at line 34 (D14). _package.scss: `@mixin classicy-package($id) { @layer classicy.package { .classicyDesktop[data-classicy-appearance="#{$id}"] { @content; } } }`. _mixins.scss = appearance.scss with `@use "../../vocabulary/layout"` (for layout.classicy-px-rect; `@use "assets"` stays) and these renames (20 mixins + 1 function): platinumMenuFrame→platinum-menu-frame, platinumMenuDivider→platinum-menu-divider, platinumWindowBoxShadow→platinum-window-box-shadow, platinumBoxShadow→platinum-box-shadow, platinumWindowBorder→platinum-window-border, platinumWindowHeaderBorder→platinum-window-header-border, platinumWindowHeaderBorderDepressed→platinum-window-header-border-depressed, platinumWindowInnerBoxShadow→platinum-window-inner-box-shadow, platinumWindowInnerBoxShadowOuter→platinum-window-inner-box-shadow-outer, platinumWindowInnerBorder→platinum-window-inner-border, platinumWindowControlBoxBorder→platinum-window-control-box-border, platinumWindowControlBox→platinum-window-control-box, platinumWindowControlBoxDepressable→platinum-window-control-box-depressable, platinumWindowUndepressable→platinum-window-undepressable, platinumWindowDepressable→platinum-window-depressable, platinumWindowDepressed→platinum-window-depressed, platinumDepressableDefault→platinum-depressable-default, platinumDepressableBoxShadowActive→platinum-depressable-box-shadow-active, theme-halftone→platinum-halftone, encode-color→platinum-encode-color; `px-rect` (appearance.scss:9) and `no-select` (:239) are deleted here (the vocabulary owns classicy-px-rect / classicy-no-select) and `.hidden` (:244-246) moves to ClassicyDesktop.scss as a base structure rule. _scrollbars.scss = scrollbars.scss with 10 renames: sb-glyph-up→platinum-scrollbar-glyph-up, sb-glyph-down→platinum-scrollbar-glyph-down, sb-glyph-left→platinum-scrollbar-glyph-left, sb-glyph-right→platinum-scrollbar-glyph-right, sb-btn-box→platinum-scrollbar-button-box, sb-btn-pressed→platinum-scrollbar-button-pressed, scrollbars→platinum-scrollbars, scrollbars-split-arrows→platinum-scrollbars-split-arrows, scrollbars-inactive→platinum-scrollbars-inactive, scrollbars-themed→platinum-scrollbars-themed (the `$sb-arrow*` variables keep their names). _assets.scss = assets.scss verbatim. platinum.scss: `@use "../../vocabulary/package"; @use "mixins"; @use "scrollbars"; @use "assets"; @include package.classicy-package("platinum") { @include components; }` where each `components/_<Name>.scss` exposes one mixin `<name>` (e.g. `@mixin window { … }`) that platinum.scss includes inside the wrapper (4.2/4.3 create them; here the file includes none yet). .ts-barrel.json: `"noHeader": false` (barrelsby's purge deletes every file named index.ts under src when noHeader is true — see node_modules/barrelsby/bin/purge.js:14-22 — which would delete the Platinum entry on every generate-barrels; with a header only barrelsby-made barrels are purged, and the top barrel re-exports `./Appearance/Platinum/index`). src/custom.d.ts: `declare module "*.scss?inline" { const css: string; export default css; }`. package.json: `sideEffects` gains `"./src/Appearance/Platinum/index.ts"`.

- [ ] **Step 1: Write the failing Platinum tests** — ClassicyPlatinum.test.ts: `registers the platinum package on import` (`await import("@/Appearance/Platinum")` → getClassicyAppearancePackage("platinum") defined, name "Platinum"); `ships 21 presets whose ids match the former themes.json order` (ids deep-equal ["default","azul","bondi","copper","crimson","emerald","frenchBlue","gold","ivy","lavender","pistachio","magenta","nutmeg","poppy","plum","rose","sapphire","silver","teal","turquoise","sunny"]); `defaults equals the Default preset` (deep-equal presets[0]); `every preset carries package platinum`; `layout declares today's Platinum values` (exact object); `getAllThemes() comes from the package presets with resolved wallpapers` (same ids; backgroundImage of "azul" !== "azul_dark.png" and classicyWallpaperFilename(...) === "azul_dark.png"); `the top barrel re-exports the Platinum entry` (readFileSync("src/index.ts") contains `./Appearance/Platinum/index`). platinum.css.test.ts (sass API: `compile("src/Appearance/Platinum/styles/platinum.scss", { loadPaths: ["src"] }).css`): `is wrapped in the package layer` (css starts with `@layer classicy.package`); `every rule is scoped under the platinum root` (every selector line matched by /^[^@{}]+\{/m starts with `.classicyDesktop[data-classicy-appearance=platinum]` or `.classicyDesktop[data-classicy-appearance="platinum"]`); `contains no platinumCamelCase mixin name` (no match for /platinum[A-Z]/).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — module not found. — `pnpm exec vitest run src/Appearance/Platinum`
- [ ] **Step 3: Create platinum.json, _package.scss, the three moved style files and platinum.scss** — `git mv` appearance.scss → src/Appearance/Platinum/styles/_mixins.scss, scrollbars.scss → _scrollbars.scss, assets.scss → _assets.scss, then apply the rename table (a sed over the three files; `@use 'assets'` in _mixins.scss stays valid). Build platinum.json from themes.json with a one-off node script (defaults = entry 0, presets = all, tab indentation), then `git rm` themes.json.
- [ ] **Step 4: Create index.ts; re-point ClassicyAppearance.ts, the four themes.json test imports and Storybook preview.tsx** — ClassicyAppearance.ts:8 `import platinumJson from "@/Appearance/Platinum/platinum.json"` and `platinumJson.presets` at :267; ClassicyThemeSchema.test.ts:17, ClassicyWallpapers.test.ts:10, ClassicyWindow.resizer.test.ts:4, ClassicyTabs.typescale.test.ts:4 import `platinumJson` and read `.presets`; storybook/.storybook/preview.tsx:3,12 builds the toolbar from `platinumJson.presets`. Add `import "@/Appearance/Platinum";` to ClassicyDesktop.tsx; add the custom.d.ts declaration and the sideEffects entry.
- [ ] **Step 5: Flip barrelsby noHeader and regenerate** — Expected: the entry file still exists and the grep prints 1. src/index.ts now starts with the barrelsby `@file` header comment. — `pnpm generate-barrels && test -f src/Appearance/Platinum/index.ts && grep -c 'Appearance/Platinum/index' src/index.ts`
- [ ] **Step 6: Run the Platinum tests and the whole suite** — Expected: PASS. (Under vitest the `?inline` import resolves to "", so `css` is empty in tests; the sass test covers the real output.) — `pnpm exec vitest run src/Appearance/Platinum && pnpm test`
- [ ] **Step 7: Verify module-evaluation order** — Expected: PASS — DefaultAppManagerState.availableThemes has 21 entries without importing @/Appearance/Platinum (the test file must not import it). — `node -e "import('./src/index.ts')" 2>/dev/null; pnpm exec vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
- [ ] **Step 8: Lint, type-check, commit** — git commit -m "feat(appearance): Platinum package module with presets, layout and renamed mixins" (with the trailer). The component stylesheets still @use the old paths, which no longer exist — tsc passes but `vite build` would not; 4.2/4.3 fix that before the next parity shot, so do not run the parity set yet. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum`

### 4.2: Move the asset- and scrollbar-bearing component looks: Window, Alert, WindowFrame, Desktop, Menu, PopUpMenu

**Files:**
- Create: `src/Appearance/Platinum/styles/components/_Window.scss`
- Create: `src/Appearance/Platinum/styles/components/_Alert.scss`
- Create: `src/Appearance/Platinum/styles/components/_WindowFrame.scss`
- Create: `src/Appearance/Platinum/styles/components/_Desktop.scss`
- Create: `src/Appearance/Platinum/styles/components/_Menu.scss`
- Create: `src/Appearance/Platinum/styles/components/_PopUpMenu.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss`
- Modify: `src/Appearance/Platinum/styles/platinum.scss`
- Test: `src/Appearance/Platinum/styles/platinum.css.test.ts`

**Depends on:** 4.1

**Interfaces:**
- Consumes: The renamed mixins and $assets variables (4.1); `layout.classicy-no-select` (part A).
- Produces: One partial per component exposing `@mixin <camelName>` (window, alert, windowFrame, desktop, menu, popUpMenu) and included by platinum.scss inside the package wrapper. Move rule (applies to 4.3 too): for each `@include appearance.*` / `@include scrollbars.*` / `assets.$*` read listed below, delete it from the base file and re-create it in the partial under the *same selector chain* (the chain is relative to the package root, which is `.classicyDesktop[…]` itself for Desktop — so `.classicyDesktop { &, & * {…} }` becomes `&, & * {…}` at the partial's top level). Then grep the base file for every property the moved mixin or asset sets (border, border-*, box-shadow, background, background-image, color, border-radius) under a later selector of the same component element or its state classes; move those declarations too, under their own chain, so the package layer keeps the same winner (review focus 1). `@include appearance.no-select` becomes `@include layout.classicy-no-select` and stays in base (structure). Line numbers are as of main 9601617ee; re-verify with grep after part A's reorder of ClassicyWindow.scss. Window (ClassicyWindow.scss): :24-25 header border + inner-box-shadow-outer under `.classicyWindowHeader`; :53 scrollbars-inactive under `.classicyWindowInactive`; :101-126 `$title-bar-center/right/left` under `.classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter|Right(::after|::before)`; :193 window-border and :202-215 red stripes under `.classicyWindowRed …`; :235 window-border under `.classicyWindow`; :326 box-shadow under `… .classicyWindowControlBox`; :336/:357 control-box-depressable under `.classicyWindowZoomBox` / `.classicyWindowCloseBox`; :342 `$collapse`, :350 `$zoom` under the box `&:after`; :394 `$resizer` under `.classicyWindowResizer`; :436 inner-border under `.classicyWindowContents`; :485/:488 under `.classicyWindowContentsModal`; :680 `$title-bar-utility !important` under `.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitleCenter` (drop the !important: the package layer wins). Alert: :92-105 red stripes under `.classicyWindow:has(.classicyAlertMovable) …`. WindowFrame: :19 `$title-bar-center` under `.classicyWindowFrameTitleBar`. Desktop: :25-26 platinum-scrollbars + platinum-scrollbars-themed under `&, & *`; :58 split-arrows under `&.classicyDesktopSplitArrows { &, & * }`; :21 no-select → vocabulary. Menu: :27/:47/:77/:95 menu-frame under `.classicyMenu`, `.classicySubMenu`, `.classicyContextMenu`, `.classicyContextSubMenu`; :108 menu-divider under `.classicyContextSubMenu .classicySeparatorHorizontal`; :227 `$triangle` under `.classicyMenuItemChildMenuIndicator:after`. PopUpMenu: :46 undepressable under `.classicyPopUpMenu`; :116 `$down-arrow` under `.classicyPopUpMenuIndicator`. After the move each base file has no `@use` of AppearanceManager/styles (Window/Alert/WindowFrame/Menu/PopUpMenu keep only `@use "../../../Appearance/vocabulary/layout"` where no-select is used).

- [ ] **Step 1: Extend the css test with the moved selectors** — platinum.css.test.ts: `scopes the window chrome` (compiled css contains `.classicyDesktop[data-classicy-appearance=platinum] .classicyWindow{` with `border:` and `box-shadow:` inside, `… .classicyWindowRed .classicyWindowTitleBar`, `… .classicyWindowResizer{background-image:url(` ); `scopes the desktop scrollbars` (contains `.classicyDesktop[data-classicy-appearance=platinum] *::-webkit-scrollbar{` and `.classicyDesktop[data-classicy-appearance=platinum].classicyDesktopSplitArrows`); `scopes the menu frame` (contains `… .classicyContextSubMenu .classicySeparatorHorizontal{`); `the base stylesheets no longer reference the Platinum mixins` (for each of the six base files, readFileSync has no match for /AppearanceManager\/styles|platinum-|assets\.\$/).
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — the partials do not exist. — `pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts`
- [ ] **Step 3: Create the six partials and strip the six base files per the move rule** — Each partial starts `@use "../mixins"; @use "../scrollbars"; @use "../assets";` and wraps its rules in `@mixin window { … }` etc.; platinum.scss includes all six inside the wrapper. Keep every moved declaration's text identical except the mixin name and the dropped `!important`.
- [ ] **Step 4: Run the css test and the full suite** — Expected: PASS. — `pnpm exec vitest run src/Appearance/Platinum && pnpm test`
- [ ] **Step 5: Build the library and the Storybook** — Expected: both succeed; `grep -c 'classicy-appearance-platinum' dist/classicy.es.js` prints at least 1 (the injector call is in the bundle). — `pnpm build:source && pnpm build:storybook`
- [ ] **Step 6: Parity: Window, Alert, Desktop, Menu and PopUpMenu stories** — Re-shoot the ids whose title starts with Desktop/Window, Desktop/WindowFrame, Desktop/Desktop, Desktop/Menu, Desktop/MenuBar, Dialogs/Alert, Controls/PopUpMenu, Controls/ContextualMenu into `.playwright-mcp/parity/part-b/after/`; `compare -metric AE before/<id>.png after/<id>.png null:` → 0 for each. Any non-zero: a declaration that lost its winner — find it with the property grep of the move rule, move it, re-shoot; never touch the screenshot.
- [ ] **Step 7: Lint, type-check, commit** — git commit -m "refactor(appearance): move window, desktop and menu looks into the Platinum package" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts`

### 4.3: Move the remaining component looks and drop every dead @use

**Files:**
- Create: `src/Appearance/Platinum/styles/components/_BevelButton.scss`
- Create: `src/Appearance/Platinum/styles/components/_Button.scss`
- Create: `src/Appearance/Platinum/styles/components/_Checkbox.scss`
- Create: `src/Appearance/Platinum/styles/components/_Placard.scss`
- Create: `src/Appearance/Platinum/styles/components/_Table.scss`
- Create: `src/Appearance/Platinum/styles/components/_DriveSetupList.scss`
- Create: `src/Appearance/Platinum/styles/components/_Meter.scss`
- Create: `src/Appearance/Platinum/styles/components/_Output.scss`
- Create: `src/Appearance/Platinum/styles/components/_ProgressBar.scss`
- Create: `src/Appearance/Platinum/styles/components/_SplitView.scss`
- Create: `src/Appearance/Platinum/styles/components/_Assistant.scss`
- Create: `src/Appearance/Platinum/styles/components/_StartupScreen.scss`
- Create: `src/Appearance/Platinum/styles/components/_QuickTimeMovieEmbed.scss`
- Create: `src/Appearance/Platinum/styles/components/_ControlStrip.scss`
- Create: `src/Appearance/Platinum/styles/components/_Slider.scss`
- Create: `src/Appearance/Platinum/styles/components/_DesktopIcon.scss`
- Create: `src/Appearance/Platinum/styles/components/_Icon.scss`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss`
- Modify: `src/SystemFolder/SystemResources/{Assistant,BevelButton,Boot,Button,Checkbox,ControlStrip,Desktop,Icon,Meter,Output,Placard,ProgressBar,QuickTime,Slider,SplitView,Table}/*.scss`
- Modify: `src/SystemFolder/SystemResources/{BalloonHelp,ButtonToolbar,ColorPicker,ContextualMenu,ControlGroup,DatePicker,Disclosure,FileDialog,FileInput,ImageWell,Input,ListBox,LittleArrows,RadioInput,Separator,Spinner,Tabs,TimePicker,Tree,Triangle}/*.scss`
- Modify: `src/Appearance/Platinum/styles/platinum.scss`
- Test: `src/Appearance/Platinum/styles/platinum.css.test.ts`

**Depends on:** 4.2

**Interfaces:**
- Consumes: The move rule of 4.2.
- Produces: Partials (mixin name in parentheses) and their moves: _Button (button): ClassicyButton.scss:22 depressable under `.classicyButton`, :38 depressable-default under `.classicyButtonDefault`, :56 and :63 depressed under `.classicyButtonDepressed` / `.classicyButtonKeyActive`, :67 box-shadow-active under `.classicyButtonDefault.classicyButtonKeyActive`. _BevelButton (bevelButton): :158 menu-frame under `.classicyBevelButtonPopup.classicyBevelButtonPopupPanel`. _Checkbox: :9 window-border under `.classicyCheckbox`. _Placard: :91 window-border under `.classicyPlacardMenu`. _Table: :54 window-box-shadow under `.classicyTableColumnHeader`, :58 header-border-depressed under `.classicyTableColumnHeaderSelected`. _DriveSetupList: :72 window-box-shadow under `.driveSetupList__head th`. _Meter: :31 inner-border under `.classicyMeter`. _Output: :19 inner-border under `.classicyOutputInset`. _ProgressBar: :13 inner-border under `.classicyProgress progress[value]::-webkit-progress-bar`. _SplitView: :35 window-border under `.classicySplitViewDivider` (:36 no-select → vocabulary, stays). _Assistant: :22 header-border under `.classicyAssistantHeader` (:23, :80 no-select → vocabulary). _StartupScreen: :21 window-border under `.classicyStartupScreenPanel` (:47 no-select → vocabulary). _QuickTimeMovieEmbed: :68 undepressable under `.quickTimePlayerVideoControlsTime`, :83 and :103 depressable under `…ControlsButton` / `…ProgressBarHolder`, :187 inner-box-shadow under `…VolumeBar` (:8, :47 no-select → vocabulary). _ControlStrip: the three local look mixins `bevel-raised` (:23-34), `bevel-recessed` (:36-45), `bevel-pressed` (:47-58) move verbatim into the partial as `platinum-control-strip-bevel-raised/-recessed/-pressed` (bodies call `layout.classicy-px-rect`), with their five includes :144, :151, :182, :201, :227 under their chains (`.classicyControlStripCell`, `… &:active:not(:disabled)`, `.classicyControlStripScroll &:disabled`, `.classicyControlStrip .classicyBevelButton.classicyControlStripModule`, `… &[aria-expanded="true"]`); `strip-cell` (:60) is structure and stays; the `@use … as *` line is replaced by `@use "../../../Appearance/vocabulary/layout"`. _Slider: the `thumb-appearance` mixin (ClassicySlider.scss:39-47) and the `$_thumb-*-svg` / `$thumb-shape` variables it reads move into the partial (as `platinum-slider-thumb`), with the eight includes :113-:163 under their chains (`.classicySlider::-webkit-slider-thumb`, `::-moz-range-thumb`, `:active::…`, and the `.classicySliderHighlighted` variants) — the external `url('../../../../assets/img/ui/slider-strikes.svg')` becomes `url('../../../../../assets/img/ui/slider-strikes.svg')` from the new depth. _DesktopIcon: :55 `platinum-halftone(#000000, 7%)` under `.classicyDesktopIconMask`. _Icon: :57 likewise under `.classicyIconMask`. ColorPicker's `color-track` (:251-263) is data (crayon colors), not a bevel — it stays. Dead `@use` lines (no include, no asset read) are deleted outright from: BalloonHelp:1, ButtonToolbar:1, ColorPicker:1, ContextualMenu:1, ControlGroup:1-2, DatePicker:1, Disclosure:1, FileOpenDialog:1, FileInput:2, ImageWell:1, Input:1, ListBox:1, LittleArrows:1, RadioInput:1-2, Separator:1-2, Spinner:1, Tabs:1, TimePicker:1, Tree:1, Triangle:1, and the now-unused `@use` lines in Alert:2, DesktopIcon:1-2, Icon:1-2 (after their halftone move).

- [ ] **Step 1: Extend the css test and add the repo-wide guard** — platinum.css.test.ts: `scopes the push button bevels` (contains `… .classicyButton{` with `border-radius:` and `… .classicyButtonDefault.classicyButtonKeyActive{`); `scopes the control strip bevels` (contains `… .classicyControlStripCell{background:linear-gradient(`); `scopes the slider thumb` (contains `… .classicySlider::-webkit-slider-thumb{clip-path:`); `no base stylesheet uses the old style modules` (glob `src/SystemFolder/**/*.scss` → no file matches /AppearanceManager\/styles\/(appearance|scrollbars|assets)|@include appearance\.|@include scrollbars\.|assets\.\$/; note the glob must skip `src/Appearance/`).
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — 37 base files still reference the old modules. — `pnpm exec vitest run src/Appearance/Platinum/styles/platinum.css.test.ts`
- [ ] **Step 3: Create the seventeen partials and strip the base files per the Interfaces block** — Mechanical; a script that deletes the dead `@use` lines is fine. Every partial follows the 4.2 header; platinum.scss includes all 23 partials inside the wrapper.
- [ ] **Step 4: Run the css test and the full suite** — Expected: PASS and a clean build; `grep -rn 'AppearanceManager/styles/' src --include=*.scss` prints nothing. — `pnpm exec vitest run src/Appearance/Platinum && pnpm test && pnpm build:source`
- [ ] **Step 5: Parity: the full story set** — Re-shoot every id in stories.txt into `after/`; `for f in before/*.png; do compare -metric AE "$f" "after/$(basename $f)" null: 2>&1; echo " $f"; done` → 0 everywhere. Non-zero → apply the move rule's property grep to that component and re-shoot.
- [ ] **Step 6: Lint, type-check, commit** — git commit -m "refactor(appearance): move every remaining component look into the Platinum package" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `grep -rn 'AppearanceManager/styles/' src --include=*.scss | wc -l  # expect 0`

## Phase 5: Exports, consumers, documentation

### 5.1: package.json exports, example app, Storybook, docs, C/D wiring

**Files:**
- Modify: `package.json`
- Modify: `example/src/Applications/Browser/Browser.scss`
- Modify: `example/src/Applications/BlueBox/BlueBox.scss`
- Modify: `storybook/.storybook/ClassicyDecorators.tsx`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`
- Modify: `src/Appearance/Platinum/index.ts`
- Test: `bin/check-dist-imports.mjs`
- Test: `src/Appearance/ClassicyPackageExports.test.ts`

**Depends on:** 4.3

**Interfaces:**
- Consumes: The vocabulary directory (part A); registerClassicySoundPack / ClassicySoundPacks.ts (part D) and registerClassicyAssets / ClassicyAssetRegistry.ts (part C) when present.
- Produces: package.json `exports`: `"./scss/*": "./src/Appearance/vocabulary/*"` (replaces the AppearanceManager path), `"./appearance/platinum": { "types": "./dist/types/src/Appearance/Platinum/index.d.ts", "default": "./src/Appearance/Platinum/index.ts" }`, `"./appearance/platinum/scss/*": "./src/Appearance/Platinum/styles/*"` (a JS export cannot serve SCSS, so the mixins get their own subpath); `files` gains `"src/Appearance"` (the AppearanceManager/styles entry stays for fonts.scss); `sideEffects` already lists the entry (4.1). Browser.scss:1,13 → `@use 'classicy/appearance/platinum/scss/mixins'; … @include mixins.platinum-window-control-box-border;`; BlueBox.scss:1 → delete the unused `@use`. Docs: AGENT-REFERENCE.md:56 row text `Raw SCSS partials (the Classicy vocabulary: states, layout helpers, classicy-package)` plus a new row `classicy/appearance/platinum` (side-effect import registering the Platinum package) and `classicy/appearance/platinum/scss/*` (Platinum mixins); :1004 paragraph updated; a new `### Appearance Packages` subsection after the metric paragraph (:980-990) documenting registerClassicyAppearancePackage, useActiveClassicyAppearancePackage, Appearance.packageId, ClassicyDesktopChangeAppearancePackage { packageId }, theme.package, the import refusal and the fallback package. CLAUDE.md `### Theming` (:602-612): first sentence now `Themes are JSON presets of an Appearance Package (`src/Appearance/Platinum/platinum.json` for Platinum) …` and one paragraph on packages (registry, packageId, root attribute, platinum-* mixins live in the package, `classicy/scss/*` is the vocabulary).

- [ ] **Step 1: Write the failing exports test** — src/Appearance/ClassicyPackageExports.test.ts: `exports the vocabulary, the Platinum entry and its scss` (package.json exports["./scss/*"] === "./src/Appearance/vocabulary/*", exports["./appearance/platinum"].default === "./src/Appearance/Platinum/index.ts", exports["./appearance/platinum/scss/*"] === "./src/Appearance/Platinum/styles/*"); `ships src/Appearance` (files includes "src/Appearance"); `marks the Platinum entry as a side effect` (sideEffects includes "./src/Appearance/Platinum/index.ts"); `the example app no longer uses the old mixin path` (example/src/Applications/Browser/Browser.scss has no `scss/appearance`).
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL on the first assertion. — `pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts`
- [ ] **Step 3: Edit package.json, the example SCSS and the docs per the Interfaces block** — Then `pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts` → PASS.
- [ ] **Step 4: Build and run the example app** — Expected: both builds pass (the example resolves `classicy/appearance/platinum/scss/mixins` through the exports map); then run the `verify` skill: open the example, confirm `document.querySelector('.classicyDesktop').dataset.classicyAppearance === 'platinum'` and that `document.getElementById('classicy-appearance-platinum')` is the element right after `#classicy-styles`; switch Default → Azul → Default in the Appearance panel with no console errors. — `pnpm build:source && pnpm --filter classicy-example build`
- [ ] **Step 5: Storybook smoke** — Expected: builds; the non-desktop frame carries data-classicy-appearance (2.1) so Controls/* stories keep the Platinum look — spot-check Controls/Button--default in the browser. — `pnpm build:storybook`
- [ ] **Step 6: Wire part C and part D registrations when they are already merged** — For each file the command lists: ClassicySoundPacks.ts present → index.ts passes `sounds: [platinumSoundPack]` (imported from src/Appearance/Platinum/assets/sounds/platinum.ts) and calls `registerClassicySoundPack(platinumSoundPack)` before registering the package; ClassicyAssetRegistry.ts present → index.ts passes `assets: { icons: ClassicyIcons }` and calls `registerClassicyIcons(ClassicyIcons, "platinum")`. A file the command does not list is wired by that part's own plan; record which case applied in the commit body. — `ls src/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks.ts src/Appearance/ClassicyAssetRegistry.ts 2>/dev/null`
- [ ] **Step 7: Lint, type-check, test, commit** — git commit -m "feat(appearance): export the vocabulary and the Platinum package; document packages" (with the trailer) — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts && pnpm build:source`

## Phase 6: Final verification

- [ ] `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` → all PASS; record the test count.
- [ ] `pnpm build:source` → PASS; `grep -c 'platinum[A-Z]' dist/classicy.css` → 0 (no camelCase mixin leaked into base); `grep -c '@layer classicy.package' dist/classicy.es.js` ≥ 1.
- [ ] Re-shoot the full story set into `.playwright-mcp/parity/part-b/after/` and compare: AE 0 for every id in stories.txt (4.3 Step 5 already did this; repeat after 5.1 since the Storybook decorator changed).
- [ ] Stop the background Storybook / dev servers started by this plan.

**Validation:** `for f in .playwright-mcp/parity/part-b/before/*.png; do compare -metric AE "$f" ".playwright-mcp/parity/part-b/after/$(basename $f)" null: 2>&1; echo " $f"; done | grep -v '^0 ' | wc -l  # expect 0`

## Acceptance Criteria

- [ ] src/Appearance/ClassicyAppearancePackage.ts exports every name in the 0002-ldj 'package module' block and the hook/event types; re-registering an id replaces in place; useActiveClassicyAppearancePackage falls back to platinum, then to CLASSICY_FALLBACK_APPEARANCE_PACKAGE.
- [ ] System.Manager.Appearance.packageId defaults to "platinum", persists, is healed by migrateClassicyState, and is written as data-classicy-appearance on #classicyDesktop; ClassicyDesktopChangeAppearancePackage ignores unregistered ids with a classicyLog warning and is untrusted-unreachable.
- [ ] ClassicyThemeSchema defaults package to "platinum"; theme files carry it; readClassicyTheme and ClassicyDesktopImportTheme refuse an unregistered package (file error / Desktop.errorDialog).
- [ ] getThemeVars emits every measurements.<family>.<key> number as --<kebab family>-<kebab key>: <n>px and the 21 pre-existing input variables are byte-identical.
- [ ] src/Appearance/Platinum/ registers id "platinum" with 21 presets, the Platinum layout, and css compiled from platinum.scss wrapped in @layer classicy.package under .classicyDesktop[data-classicy-appearance="platinum"]; no file under src/SystemFolder references AppearanceManager/styles/{appearance,scrollbars,assets} or a platinum* camelCase mixin.
- [ ] package.json exports ./scss/* (vocabulary), ./appearance/platinum and ./appearance/platinum/scss/*; the example app and Storybook build.
- [ ] Every Storybook story compares with AE 0 before vs after; pnpm lint, tsc, test and build:source pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 2 item 1: registry with useSyncExternalStore, Appearance.packageId, ChangeAppearancePackage action, root attribute | 1.1 Steps 1-5; 2.1 Steps 1-5 |
| §9 Phase 2 item 2: CSS injection on register as <style id="classicy-appearance-<id>"> after #classicy-styles | 1.1 Steps 3-5 |
| §9 Phase 2 item 3: appearance/scrollbars/assets moved into src/Appearance/Platinum, mixins renamed platinum-*, component SCSS stops using them, local bevels (ControlStrip, Slider) move too | 4.1 Step 3; 4.2 Step 3; 4.3 Step 3 |
| §9 Phase 2 item 4: theme JSON gains package; themes.json becomes platinum.json presets (D24); theme files carry the id; import of an uninstalled package refused | 3.1 Steps 1-3; 4.1 Steps 3-4 |
| §9 Phase 2 item 5: package.json exports ./scss/* → vocabulary, ./appearance/platinum; example and Storybook updated | 5.1 Steps 1-5; 2.1 Step 5; 4.1 Step 4 |
| Contract: useClassicyAppearanceLayout returns the active package's layout; platinum.json layout values | 1.1 Steps 1, 5; 4.1 Step 1 |
| Contract: getThemeVars generic measurements walker | 3.1 Step 5 |
| Contract: hook and event types created by part B | 1.1 Step 5 |
| §8.2 test: no package registered still lays out | 1.1 Step 1 (`returns CLASSICY_FALLBACK_APPEARANCE_PACKAGE when nothing is registered`); part I's probe story renders the structure-only case visually |
| Platinum pixel-identical across all stories | Phase 0; 4.2 Step 6; 4.3 Step 5; Phase 6 |

**Placeholder scan:** No TBDs. knobs is seeded as an empty family map with a defined shape and a schema builder test; parts C/D wiring is one presence-checked step (5.1 Step 6) rather than a conditional narrative.
**Residual risk:** Moving look rules into the package layer changes cascade winners wherever a base state rule used to override a mixin; the move rule's property grep plus the full-story parity set catch it, but a state only reachable by interaction (e.g. a pressed zoom box) has no story and must be checked by hand in 5.1 Step 4. The `?inline` SCSS import is new to the build: if Vite's lib mode fails to inline it, fall back to importing the compiled string through a tiny Vite plugin, keeping the same `css` value.

## Next Steps

1. Part I implements useClassicyAppearance against the types created here and registers Platinum hooks.
2. Part E replaces the _assets.scss data URIs with SVG files and --classicy-art-* variables; part H fills platinum.json knobs and reads them in the Platinum partials.
3. Part J adds the Packages tab and preset handling on top of packageId / ChangeAppearancePackage.
4. Parts C and D register assets and sounds under "platinum" and add them to the Platinum registration if 5.1 Step 6 did not.
