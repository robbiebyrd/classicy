---
id: 0007-1sl
title: 'Part C: Asset registries and system art'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:13:05.606Z"
updated: "2026-10-29T01:11:30.305Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: complete
  "1.1":
    status: complete
  "2":
    status: complete
  "2.1":
    status: complete
  "3":
    status: complete
  "3.1":
    status: complete
  "3.2":
    status: complete
  "4":
    status: complete
  "4.1":
    status: complete
  "5":
    status: complete
  "5.1":
    status: complete
  "6":
    status: complete
  "6.1":
    status: complete
---

# Part C: Asset registries and system art

## Summary

**Goal:** Every icon, cursor, wallpaper, font and piece of system art is read at render time from one deep-merging, per-package asset registry, with Platinum's current assets registered under the id "platinum" and the Platinum look pixel-identical.

**Problem:** Audit §4.1: `registerClassicyIcons` is a shallow `Object.assign` (`ClassicyIcons.ts:42-48`), so registering `{ system: { alias } }` — the documented way to swap the alias badge — wipes the other ~200 `system` entries; 39 module-scope `const x = ClassicyIcons.a.b` captures (37 in the audit, drift since) plus direct `@img/` and `./resources/` imports never see a registration. §4.2: cursors are raw relative `url()`s in `ClassicySplitView.scss:52-74` and `PDFViewerDocument.scss:37-44`, there is no default arrow. §4.4: fonts are base64 `@font-face` in `fonts.scss` and the Fonts tab list is a literal (`ClassicyAppearanceManager.Fonts.tsx:9-16`). §4.5: `ClassicyWallpapers.ts:3-6` globs `*.png` only. §4.6: the Apple menu logo, `system.macos`, parade defaults, Trash, alias badge, help button, About art, QuickTime controls and the `assets.scss` base64 art are not replaceable. §4.7: `build.lib` inlines every asset.

**Approach:** One registry module (`src/Appearance/ClassicyAssetRegistry.ts`) parameterized by kind with per-package namespaces, in-place deep merge, `useSyncExternalStore` readers and a CSS-variable exporter; Platinum registers its existing trees and art under the string constant `"platinum"` from a side-effect module, every consumer reads at render or call time, and a Vite `?no-inline` resolver emits `src/Appearance/**` assets as files.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 3 under umbrella plan 0002-ldj ("Shared Contract — asset registries"). Part C has no dependency on Part B: the active package id comes from a placeholder `getActiveClassicyAppearancePackageId()` in the registry file that always returns "platinum", and all Platinum registrations live in `src/Appearance/Platinum/assets/platinumAssets.ts`, which Part B later imports from (or folds into) `src/Appearance/Platinum/index.ts`. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript, React 19 `useSyncExternalStore`, zustand (read-only here), SCSS, Vite 7.3.5 `build.lib` (lib mode ignores `assetsInlineLimit`; `?no-inline` is honored — `node_modules/vite/dist/node/chunks/config.js:8815-8819`), vitest 5/jsdom, Biome, Storybook 10 + Playwright + ImageMagick `compare`.

## Constraints

- Platinum renders pixel-identical: the parity set in Phase 0 compares with AE 0 after Phase 6; `assets.scss` keeps its base64 variables (Part E swaps the files in), only exposure changes.
- Before every commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Library code logs through `classicyLog(level, subsystem, …)`, never `console.*`.
- `src/index.ts` is barrel-generated: run `pnpm exec barrelsby -c .ts-barrel.json` after adding a module; never hand-edit it.
- Contract names are used verbatim (`registerClassicyAssets`, `resolveClassicyAsset`, `subscribeClassicyAssets`, `useClassicyAsset`, `useClassicyAssetTree`, `useClassicyAssetVars`, `registerClassicyIcons`, `registerClassicyCursors`, `registerClassicyWallpapers`, `registerClassicyFonts`, `registerClassicySystemArt`, `ClassicyCursorRole`, `ClassicySystemArtKey`, `--classicy-cursor-<role>`, `--classicy-art-<key>`); names invented here stay inside Part C's own files.
- Every Platinum registration is made under the local constant `const PLATINUM = "platinum"`; nothing imports from Part B's `ClassicyAppearancePackage.ts`.
- American English spelling in code, comments and docs (color, behavior, gray, center, normalize).
- Review focus: (1) registering `{ system: { alias } }` must keep every other `system` entry → 1.1; (2) a `useClassicyAsset` subscriber must re-render when its path is re-registered after mount → 1.1; (3) no `const … = ClassicyIcons.` capture may remain at module scope outside stories → 2.1 validation grep; (4) `dist/classicy.es.js` must contain no `data:font` and `dist/assets/` must hold 13 `.woff2` files → 5.1; (5) the SplitView and PDF cursors must still resolve inside a desktop (`var(--classicy-cursor-resize-lr)` defined on `.classicyDesktop`) → 3.2.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/ClassicyAssetRegistry.ts` | create | Registry core: kinds, per-package trees, deep merge, dotted resolve with platinum fallback, subscribe/hooks, `useClassicyAssetVars`, kind wrappers, `ClassicyCursorRole`, `ClassicySystemArtKey`, placeholder `getActiveClassicyAppearancePackageId`, `resetClassicyAssets` (tests). |
| `src/Appearance/ClassicyAssetRegistry.test.ts` | create | Registry unit tests incl. the audit §4.1 wipe case and the re-register render test. |
| `src/Appearance/ClassicyAssetRegistry.fonts.test.ts` | create | `registerClassicyFonts` `<style>` writing tests. |
| `src/Appearance/Platinum/assets/platinumAssets.ts` | create | Side-effect module: registers Platinum icons, cursors, system art, wallpapers and fonts under "platinum". Listed in `package.json` `sideEffects`; imported by `ClassicyDesktop.tsx` (replacing the `fonts.scss` import) and Storybook `preview.tsx`. |
| `src/Appearance/Platinum/assets/platinumAssets.test.ts` | create | Every system-art key the module registers resolves to a non-empty source; cursor roles; wallpaper count; font families. |
| `src/Appearance/Platinum/assets/art/*.svg, sad-mac.png, cursor-arrow.svg` | create | The 13 `assets.scss` SVGs decoded to files, the Slider/Tabs inline SVGs, `slider-strikes.svg`, the sad Mac, and the new arrow cursor. |
| `src/Appearance/Platinum/assets/fonts/*.woff2` | create | The 13 `@font-face` woff2 payloads from `fonts.scss`, decoded to files. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts` | modify | `registerClassicyIcons` re-pointed at the registry; registers `ClassicyIcons` itself; delete `ui.stripe`, `ui.tab`, `ui.menuDropdownArrows`, `ui.halftoneSmall`, `system.bomb`. |
| `src/SystemFolder/**/*.tsx|ts (39 capture sites, 5 direct-import sites)` | modify | Module-scope captures become `useClassicyAsset`/`resolveClassicyAsset` reads (list in 2.1). |
| `src/SystemFolder/SystemResources/Cursor/useClassicyCursor.ts` | modify | Reads the cursors registry by role. |
| `src/SystemFolder/SystemResources/SplitView/ClassicySplitView.scss, src/SystemFolder/PDFViewer/PDFViewerDocument.scss, src/SystemFolder/PDFViewer/PDFViewerDocument.tsx` | modify | `url()` cursors become `var(--classicy-cursor-*)`. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` | modify | Spreads `useClassicyAssetVars()` beside the theme vars; imports `platinumAssets` instead of `fonts.scss`; `system.macos` read at render. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts, ClassicyAppearanceManager.Desktop.tsx, ClassicyAppearanceManager.Fonts.tsx` | modify | Glob includes `.jpg`; the picker and the Fonts tab read the registry. |
| `src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss` | delete | Replaced by `registerClassicyFonts`. |
| `src/custom.d.ts` | modify | `declare module "*.woff2"`. |
| `vite.config.ts, bin/check-dist-imports.mjs, package.json` | modify | `?no-inline` resolver for `src/Appearance/**`; `splitFontFacesPlugin` removed; `fonts.js` becomes a no-op shim; `verify:dist` checks files not base64; `sideEffects` + `exports`. |
| `storybook/.storybook/preview.tsx` | modify | Imports `platinumAssets` instead of `fonts.scss`. |
| `docs/AGENT-REFERENCE.md, docs/BUILDING-APPS.md, CLAUDE.md` | modify | Registry API, deep-merge semantics, fonts delivery. |

## Phase 0: Parity baseline

- [ ] `pnpm storybook` in the background (storybook/package.json: port 6006); wait for "Storybook … started".
- [ ] `curl -s http://localhost:6006/index.json | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["entries"]; print("\n".join(k for k,v in d.items() if v["type"]=="story" and v["title"] in {"Desktop/Desktop","Desktop/DesktopIcon","Desktop/MenuBar","Desktop/Window","Desktop/WindowFrame","Desktop/Menu","Desktop/AboutWindow","Dialogs/Alert","Controls/HelpButton","Controls/QuickTime","Controls/SplitView","Controls/Table","Controls/LittleArrows","Controls/PopUpMenu","Controls/Slider","Controls/Tabs","System/CrashScreen","System/StartupScreen"}))' > .playwright-mcp/parity/part-C/stories.txt` (create the directory first).
- [ ] Playwright: for each id open `http://localhost:6006/iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, save `.playwright-mcp/parity/part-C/before/<id>.png`.
- [ ] `ls .playwright-mcp/parity/part-C/before | wc -l` equals `wc -l < stories.txt`. No commit.

**Validation:** `ls .playwright-mcp/parity/part-C/before/*.png | wc -l  # equals the line count of stories.txt`

## Phase 1: Registry core

### 1.1: ClassicyAssetRegistry.ts

**Files:**
- Create: `src/Appearance/ClassicyAssetRegistry.ts`
- Test: `src/Appearance/ClassicyAssetRegistry.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: `classicyLog` (`src/SystemFolder/SystemResources/Log/ClassicyLog.ts`); React `useSyncExternalStore`.
- Produces: Contract exports verbatim: `ClassicyAssetKind`, `ClassicyAssetTree`, `registerClassicyAssets(kind, packageId, tree)`, `resolveClassicyAsset(kind, path, packageId?)`, `subscribeClassicyAssets(listener)`, `useClassicyAsset(kind, path)`, `useClassicyAssetTree(kind)`, `useClassicyAssetVars()`, `registerClassicyCursors(packageId, cursors)`, `registerClassicyWallpapers(packageId, list)`, `registerClassicyFonts(packageId, fonts)`, `registerClassicySystemArt(packageId, art)`, `type ClassicyCursorRole`, `type ClassicySystemArtKey`. Local to this file: `type ClassicyAssetSource = string` (Part B re-exports the same alias from `ClassicyAppearancePackage.ts`; keep this one `export type` so the barrel does not clash — name it `ClassicyAssetSource` only if Part B has not landed, else import Part B's), `export const getActiveClassicyAppearancePackageId = (): string => PLATINUM` with the doc comment `Placeholder until plan 0002-ldj Part B reads System.Manager.Appearance.packageId; Part B replaces the body, not the name`, `export const resetClassicyAssets = (): void` (clears every package tree and bumps the version; test-only, documented as such), `export const classicyAssetVarName = (kind: "cursors" | "systemArt", key: string): string` (`cursors` → `--classicy-cursor-${kebab}`, `systemArt` → `--classicy-art-${kebab}`; kebab = camelCase to lower-kebab, `resizeLr` → `resize-lr`, `windowStripesRed` → `window-stripes-red`). Semantics: trees are stored per `(kind, packageId)`; `registerClassicyAssets` deep-merges IN PLACE into the stored tree (a plain object at a key merges recursively, a string replaces, a string replaced by an object or vice versa logs `classicyLog("warn", "ClassicyAssetRegistry", …)` and the new value wins), then bumps a module version and notifies listeners. `resolveClassicyAsset` walks the dotted `path` in the `packageId ?? getActiveClassicyAppearancePackageId()` tree, then `"platinum"`, returning the string leaf or `undefined` (an object at the path is not a leaf). `useClassicyAsset` = `useSyncExternalStore(subscribeClassicyAssets, () => resolveClassicyAsset(kind, path))`. `useClassicyAssetTree(kind)` returns a merged COPY (platinum tree deep-copied, active tree deep-merged over it; same object identity until the version changes — cache per `(kind, version, activeId)`). `useClassicyAssetVars()` returns `{ [classicyAssetVarName("cursors", role)]: `url("${src}")`, … , [classicyAssetVarName("systemArt", key)]: `url("${src}")` }` from the merged `cursors` and `systemArt` trees (string leaves only), cached per version. Wrappers: `registerClassicyCursors(packageId, cursors)` → `registerClassicyAssets("cursors", packageId, cursors)`; `registerClassicySystemArt(packageId, art)` → `("systemArt", …)`; `registerClassicyWallpapers(packageId, list)` → `("wallpapers", packageId, Object.fromEntries(list.map(w => [w.name, w.src])))`; `registerClassicyFonts` is 4.1. `ClassicyCursorRole = "arrow" | "watch" | "hand" | "ibeam" | "crosshair" | "resizeLr" | "resizeUd" | "resizeNwse" | "resizeNesw" | "resizeU" | "resizeD" | "resizeL" | "resizeR"` (the last four are needed by `ClassicySplitView.tsx:33-37` and `ClassicySplitView.scss:70-77`; reported to the umbrella as a contract gap). `ClassicySystemArtKey` exactly as the contract lists it (25 keys).

- [ ] **Step 1: Write the failing test** — File `src/Appearance/ClassicyAssetRegistry.test.ts`, `beforeEach(resetClassicyAssets)`:
```ts
it("resolves a dotted path in the platinum tree") // registerClassicyAssets("icons","platinum",{system:{apple:"a.png"}}); expect(resolveClassicyAsset("icons","system.apple")).toBe("a.png"); expect(resolveClassicyAsset("icons","system")).toBeUndefined(); expect(resolveClassicyAsset("icons","system.missing")).toBeUndefined()
it("deep-merges instead of replacing a namespace (audit §4.1)") // register {system:{apple:"a",help:"h",files:{file:"f",document:"d"}}} then {system:{alias:"x"}} → system.apple "a", system.files.document "d", system.alias "x"; Object.keys(useTree) has 4 keys under system
it("a later registration of the same leaf replaces it") // alias "x" then "y" → "y"
it("falls back from the active package to platinum, then undefined") // register ("icons","platinum",{a:"p"}) and ("icons","other",{b:"o"}); resolveClassicyAsset("icons","a","other") === "p"; ("icons","b","other") === "o"; ("icons","b") === undefined
it("notifies subscribers once per registration") // listener via subscribeClassicyAssets called 1× after one register, 0× after unsubscribe
it("useClassicyAsset re-renders when its path is re-registered after mount") // render <Probe/> using useClassicyAsset("systemArt","appleMenu") → text ""; act(() => registerClassicySystemArt("platinum",{appleMenu:"apple.png"})) → text "apple.png"
it("useClassicyAssetTree returns a stable merged copy until the version changes") // two renders same reference; after register, new reference; mutating the returned tree does not change resolveClassicyAsset
it("useClassicyAssetVars emits kebab-cased url() variables for cursors and system art") // registerClassicyCursors("platinum",{resizeLr:"lr.png",arrow:"arrow.svg"}); registerClassicySystemArt("platinum",{windowStripesRed:"red.svg"}); expect(vars).toEqual({"--classicy-cursor-resize-lr":'url("lr.png")',"--classicy-cursor-arrow":'url("arrow.svg")',"--classicy-art-window-stripes-red":'url("red.svg")'})
it("registerClassicyWallpapers keys the tree by name") // registerClassicyWallpapers("platinum",[{name:"Azul Dark",src:"azul_dark.png"}]) → resolveClassicyAsset("wallpapers","Azul Dark") === "azul_dark.png"
it("classicyAssetVarName") // ("cursors","resizeNwse") → "--classicy-cursor-resize-nwse"; ("systemArt","sadMac") → "--classicy-art-sad-mac"
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — Cannot find module '@/Appearance/ClassicyAssetRegistry'. — `pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts`
- [ ] **Step 3: Implement `src/Appearance/ClassicyAssetRegistry.ts` per the Interfaces block** — Store: `const trees = new Map<ClassicyAssetKind, Map<string, ClassicyAssetTree>>()`, `let version = 0`, `const listeners = new Set<() => void>()`. Deep merge: recursive over own enumerable keys, skipping `__proto__`/`constructor`/`prototype` keys (log a warn and ignore). Caches for `useClassicyAssetTree` and `useClassicyAssetVars` are `Map<string, {version, value}>` so `useSyncExternalStore` receives a stable snapshot.
- [ ] **Step 4: Run tests to verify they pass** — Expected: PASS (10 tests). — `pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts`
- [ ] **Step 5: Regenerate barrels, lint, type-check, commit** — git add src/Appearance src/index.ts && git commit -m "feat(appearance): per-package asset registry with deep merge and platinum fallback" (with the trailer). — `pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts`

## Phase 2: Icons through the registry

### 2.1: registerClassicyIcons re-pointed; captures converted; dead entries deleted

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerUtils.tsx:4`
- Modify: `src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx:37`
- Modify: `src/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils.tsx:4`
- Modify: `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx:37`
- Modify: `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils.tsx:4`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimePlayPauseButton.tsx:4-5`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeSeekBar.tsx:5-6`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeFullscreenButton.tsx:4`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.tsx:20`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeUtils.ts:3-6`
- Modify: `src/SystemFolder/SimpleText/SimpleText.tsx:32`
- Modify: `src/SystemFolder/Finder/Finder.tsx:72`
- Modify: `src/SystemFolder/Finder/FinderPreferences.tsx:19`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx:37`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx:5`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.tsx:18-20`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts:30`
- Modify: `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts:4-8`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts:5-6`
- Modify: `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx:31`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts:49,604`
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx:21`
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx:26`
- Modify: `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx:25`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyDefaultParadeIcons.ts:4`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx:88,657`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx:29,281`
- Modify: `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx:21`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension.stories.tsx:17`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx:2-3`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx:60`
- Modify: `docs/BUILDING-APPS.md:866-885`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: 1.1 registry; `ClassicyIcons` tree (`ClassicyIcons.ts:49-540`).
- Produces: `ClassicyIcons.ts`: `const PLATINUM = "platinum"`; `export type ClassicyIconMap = ClassicyAssetTree` (alias kept for consumers); `export function registerClassicyIcons<T extends ClassicyAssetTree>(icons: T, packageId: string = PLATINUM): T` → `registerClassicyAssets("icons", packageId, icons); return icons;`; after the `ClassicyIcons` literal: `registerClassicyAssets("icons", PLATINUM, ClassicyIcons)` (the constant IS the stored Platinum tree, so in-place merges stay visible to `ClassicyIcons.x.y` readers and to the registry alike; Part B moves this call). Delete entries `ui.stripe`, `ui.tab`, `ui.menuDropdownArrows`, `ui.halftoneSmall`, `system.bomb` (verified unconsumed: `grep -rn 'ui\.stripe\|ui\.tab\b\|menuDropdownArrows\b\|halftoneSmall\|system\.bomb' src` outside `ClassicyIcons.ts` is empty; the asset files stay on disk). Capture conversion rule: inside a component → `const x = useClassicyAsset("icons", "<dotted path>")` (string | undefined; pass `?? ""` where a string is required); in a plain function/module (`*Utils.ts`, `ClassicyFileSystem.ts`, `DefaultClassicyFileSystem.ts`, `ClassicyFileBrowserUtils.ts`, `ClassicyAppManager.ts:604` inside the `DefaultAppManagerState` literal, `ClassicyDefaultParadeIcons.ts`) → `resolveClassicyAsset("icons", "<dotted path>") ?? ""` evaluated where the value is used (for `DefaultAppManagerState`, which is a module-scope literal, keep the `import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons"` side-effect import so Platinum is registered first, and add the comment `// Platinum icons are registered by the ClassicyIcons import above`). `ClassicyDefaultParadeIcons` becomes `export const getClassicyDefaultParadeIcons = (): ClassicyBootParadeIcon[]` (same 11 entries, icons resolved at call time); update its one caller (`grep -rn ClassicyDefaultParadeIcons src`). Direct imports: `PDFViewerDocument.tsx:2-3` → `useClassicyAsset("icons","system.sherlock.search")` and `useClassicyAsset("icons","ui.cursors.hand")`; `ClassicyAppearanceManager.tsx:60` `./resources/app.png` → add `controlPanels.appearanceManager.app: icon("control-panels/appearance-manager/app.png")` to `ClassicyIcons` after moving `src/SystemFolder/ControlPanels/AppearanceManager/resources/app.png` to `assets/img/icons/control-panels/appearance-manager/app.png` (`git mv`), then `useClassicyAsset("icons","controlPanels.appearanceManager.app")`; `PictureViewer.tsx:2` `sample-picture.jpg?inline` stays a direct import (sample content, not art) but is documented as such in a comment. `ClassicyCrashScreen.tsx:2` is handled in 3.1 (system art).

- [ ] **Step 1: Write the failing test** — File `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts`:
```ts
it("registers the Platinum icon tree on import") // expect(resolveClassicyAsset("icons","system.apple")).toBe(ClassicyIcons.system.apple); expect(ClassicyIcons.system.apple).not.toBe("")
it("registerClassicyIcons deep-merges: system.alias override keeps every other system entry") // const before = Object.keys(ClassicyIcons.system).length; const original = ClassicyIcons.system.alias; registerClassicyIcons({ system: { alias: "custom.png" } }); expect(Object.keys(ClassicyIcons.system).length).toBe(before); expect(resolveClassicyAsset("icons","system.alias")).toBe("custom.png"); expect(resolveClassicyAsset("icons","system.desktop.trashFull")).toBe(ClassicyIcons.system.desktop.trashFull); afterEach restores alias
it("returns its argument typed") // const r = registerClassicyIcons({ myApp: { app: "x.png" } }); expect(r.myApp.app).toBe("x.png"); expect(resolveClassicyAsset("icons","myApp.app")).toBe("x.png")
it("no longer carries the five unconsumed entries") // expect((ClassicyIcons.ui as Record<string,unknown>).stripe).toBeUndefined(); same for tab, menuDropdownArrows, halftoneSmall, (ClassicyIcons.system as …).bomb
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — `resolveClassicyAsset` returns undefined (nothing registered) and `stripe` is defined. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts`
- [ ] **Step 3: Implement `registerClassicyIcons` and the Platinum registration in `ClassicyIcons.ts`; delete the five entries** — Replace lines 21-47 with the alias type and the new function; append the `registerClassicyAssets("icons", PLATINUM, ClassicyIcons)` call after the literal. `ClassicyAssetRegistry.ts` must not import `ClassicyIcons.ts` (cycle).
- [ ] **Step 4: Convert the 39 module-scope captures and the direct imports listed in Files** — One mechanical pass per file per the conversion rule; `git mv` the Appearance Manager app icon; delete `ClassicyDefaultParadeIcons` in favor of `getClassicyDefaultParadeIcons`. Then `grep -rn '^const .* = ClassicyIcons\.' src --include=*.ts --include=*.tsx | grep -v stories` must print nothing (the two stories are converted too, so the unfiltered grep is also empty).
- [ ] **Step 5: Update `docs/BUILDING-APPS.md` §10 (lines 866-885)** — Replace the "assigns shallowly, so spread the existing namespace" paragraph and example with: registration deep-merges, so `registerClassicyIcons({ applications: { myApp: { app } } })` keeps the bundled apps; read icons at render with `useClassicyAsset("icons", "applications.myApp.app")` or at call time with `resolveClassicyAsset`.
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS; existing tests that mocked `ClassicyIcons` keep passing because the constant still exists. — `pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Boot src/SystemFolder/PDFViewer`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src assets docs/BUILDING-APPS.md && git commit -m "refactor(icons): deep-merging registerClassicyIcons and render-time icon reads" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `grep -rn '= ClassicyIcons\.' src --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -c '^[^:]*:[0-9]*:const '  # expect 0`

## Phase 3: System art and cursors

### 3.1: registerClassicySystemArt and the Platinum art module

**Files:**
- Create: `src/Appearance/Platinum/assets/platinumAssets.ts`
- Create: `src/Appearance/Platinum/assets/art/corner-dither.svg, collapse.svg, zoom.svg, title-bar-center.svg, title-bar-left.svg, title-bar-right.svg, title-bar-utility.svg, resizer.svg, triangle.svg, down-arrow.svg, title-bar-center-red.svg, title-bar-left-red.svg, title-bar-right-red.svg, slider-thumb.svg, slider-strikes.svg, tab-outline.svg, sad-mac.png`
- Modify: `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.tsx:2,90`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx:281`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx:54`
- Modify: `src/SystemFolder/Finder/Finder.tsx:556-565`
- Modify: `src/SystemFolder/SystemResources/File/ClassicyTrash.ts:69`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx:118-124,469,475`
- Modify: `src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.tsx:35,45`
- Modify: `src/SystemFolder/Finder/FinderAboutThisComputer.tsx:95-103`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx:90,569,608`
- Modify: `storybook/.storybook/preview.tsx:1`
- Modify: `package.json (sideEffects)`
- Test: `src/Appearance/Platinum/assets/platinumAssets.test.ts`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx`

**Depends on:** 2.1

**Interfaces:**
- Consumes: 1.1 `registerClassicySystemArt`, `useClassicyAsset`, `resolveClassicyAsset`, `useClassicyAssetVars`; `ClassicyIcons` leaves; `assets.scss` base64 (`styles/assets.scss:1-14`), `ClassicySlider.scss:25,30`, `ClassicyTabs.scss:26`.
- Produces: `platinumAssets.ts` (side-effect module, `const PLATINUM = "platinum"`): imports `ClassicyIcons` (which registers icons), the 17 art files via `import.meta.glob("./art/*.{svg,png}", { eager: true, import: "default" }) as Record<string,string>` with a local `art(name)` helper, and calls `registerClassicySystemArt(PLATINUM, { appleMenu: ClassicyIcons.system.apple, sadMac: art("sad-mac.png"), startupLogo: ClassicyIcons.system.macosSvg, trashEmpty: ClassicyIcons.system.desktop.trashEmpty, trashFull: ClassicyIcons.system.desktop.trashFull, aliasBadge: ClassicyIcons.system.alias, helpButton: ClassicyIcons.ui.helpButton, aboutLogo: ClassicyIcons.classicy.logo, windowStripes: art("title-bar-center.svg"), windowStripesRed: art("title-bar-center-red.svg"), windowGrip: art("resizer.svg"), windowDither: art("corner-dither.svg"), zoomGlyph: art("zoom.svg"), collapseGlyph: art("collapse.svg"), triangle: art("triangle.svg"), downArrow: art("down-arrow.svg"), submenuArrow: art("triangle.svg"), popupArrows: art("down-arrow.svg"), sliderThumb: art("slider-thumb.svg"), sliderStrikes: art("slider-strikes.svg"), tabOutline: art("tab-outline.svg") })` — 21 of the 25 keys. Unregistered on purpose (no Platinum asset exists today; Part E creates them): `startupWordmark` (the wordmark is text, `ClassicyStartupScreen.tsx:54`), `paradeDefault` (the parade is 11 icons, read through `getClassicyDefaultParadeIcons`), `menuCheck`, `menuDash` (Unicode in `ClassicyMenu.tsx:384`). Also registers cursors (3.2), wallpapers and fonts (4.1). Art files: `title-bar-left.svg`, `title-bar-right.svg`, `title-bar-utility.svg`, `title-bar-left-red.svg`, `title-bar-right-red.svg` are decoded too but have no contract key (reported as a gap; Part E consumes them). Consumers: `ClassicyCrashScreen` (class component) reads `resolveClassicyAsset("systemArt","sadMac") ?? ""` in `render()`; `ClassicyDesktopMenuBar` `image: useClassicyAsset("systemArt","appleMenu")`; `ClassicyStartupScreen` default `logo = resolveClassicyAsset("systemArt","startupLogo")` applied inside the body (`logo ?? …`), doc comment updated; `Finder.tsx` `const trashFullIcon = useClassicyAsset("systemArt","trashFull")`, `trashEmptyIcon` likewise, both in the effect's dependency array; `ClassicyTrash.ts:69` `resolveClassicyAsset("systemArt","trashEmpty")`; `ClassicyDesktopIcon` `const aliasBadge = useClassicyAsset("systemArt","aliasBadge")` for both the mask var and the `<img>`, doc comment (118-124) now says `registerClassicySystemArt("<package>", { aliasBadge })`; `ClassicyHelpButton` `icon={useClassicyAsset("systemArt","helpButton")}`; `FinderAboutThisComputer` logo `useClassicyAsset("systemArt","aboutLogo")`, `classicy.bg` and `system.macos`/`system.mac` via `useClassicyAsset("icons", …)`. `ClassicyDesktop.tsx`: line 90 `import "@/Appearance/Platinum/assets/platinumAssets"` replaces the `fonts.scss` import (the fonts move in 4.1; until then keep BOTH imports and drop `fonts.scss` in 4.1); `const assetVars = useClassicyAssetVars()`; root `style={{ ...currentTheme, ...assetVars } as CSSProperties}` (line 608); `macosIcon` (88/657) → `useClassicyAsset("icons","system.macos")`. `package.json` `sideEffects` gains `"./src/Appearance/Platinum/assets/platinumAssets.ts"`. Storybook `preview.tsx:1` imports the same module (keeps `fonts.scss` until 4.1).

- [ ] **Step 1: Decode the SCSS and inline SVGs to files (one-off script in the scratchpad, not committed)** — For each `$name: url('data:image/svg+xml;base64,…')` in `styles/assets.scss` write `src/Appearance/Platinum/assets/art/<name>.svg` (base64-decoded; `$triangle` and `$down-arrow` are URL-encoded `data:image/svg+xml,` — decode with `decodeURIComponent`); write `slider-thumb.svg` from `ClassicySlider.scss:25` (`$_thumb-border-svg`, URL-encoded) and `tab-outline.svg` from `ClassicyTabs.scss:26`; `cp assets/img/ui/slider-strikes.svg` and `cp assets/img/ui/sad-mac.png` into `art/`. Verify: `for f in src/Appearance/Platinum/assets/art/*.svg; do xmllint --noout "$f" || echo BAD $f; done` prints nothing and `ls src/Appearance/Platinum/assets/art | wc -l` is 17. `assets.scss`, `ClassicySlider.scss` and `ClassicyTabs.scss` are NOT edited.
- [ ] **Step 2: Write the failing tests** — `src/Appearance/Platinum/assets/platinumAssets.test.ts` (imports the module for its side effect):
```ts
const REGISTERED: ClassicySystemArtKey[] = ["appleMenu","sadMac","startupLogo","trashEmpty","trashFull","aliasBadge","helpButton","aboutLogo","windowStripes","windowStripesRed","windowGrip","windowDither","zoomGlyph","collapseGlyph","triangle","downArrow","submenuArrow","popupArrows","sliderThumb","sliderStrikes","tabOutline"];
it.each(REGISTERED)("registers system art %s", key => expect(resolveClassicyAsset("systemArt", key)).toMatch(/\S/))
it("leaves the keys Platinum has no art for unregistered") // ["startupWordmark","paradeDefault","menuCheck","menuDash"] each undefined
it("the Apple menu, trash, alias badge and help button are the icon-tree leaves") // resolveClassicyAsset("systemArt","appleMenu") === ClassicyIcons.system.apple, etc. for trashFull, aliasBadge, helpButton
```
`src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx` (render a `ClassicyDesktop` with `startupScreen={false}` inside `ClassicyAppManagerProvider` as other Desktop tests do):
```ts
it("spreads the asset variables onto the desktop root beside the theme vars") // const root = document.getElementById("classicyDesktop"); expect(root.style.getPropertyValue("--classicy-art-window-grip")).toMatch(/^url\("/); expect(root.style.getPropertyValue("--classicy-cursor-resize-lr")).toMatch(/^url\("/); expect(root.style.getPropertyValue("--color-system-01")).not.toBe("")
```
- [ ] **Step 3: Run them to verify they fail** — Expected: FAIL — module not found / empty custom property. — `pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx`
- [ ] **Step 4: Implement `platinumAssets.ts`, the `sideEffects` entry and the consumer reads per the Interfaces block** — Finder's `useEffect` that dispatches the Trash icon must list `trashFullIcon`/`trashEmptyIcon` in its deps so a later registration re-dispatches `ClassicyDesktopIconAdd` (a re-add refreshes `icon`, CLAUDE.md Trash section).
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources/Desktop src/SystemFolder/Finder src/SystemFolder/SystemResources/CrashScreen src/SystemFolder/SystemResources/HelpButton src/SystemFolder/SystemResources/Boot`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src package.json storybook/.storybook/preview.tsx && git commit -m "feat(appearance): register Platinum system art and read it at render" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum/assets/platinumAssets.test.ts && grep -rn 'sad-mac\|@img/' src/SystemFolder --include=*.tsx | grep -v 'sample-picture' | wc -l  # expect 0`

### 3.2: Cursors by role

**Files:**
- Create: `src/Appearance/Platinum/assets/art/cursor-arrow.svg`
- Modify: `src/Appearance/Platinum/assets/platinumAssets.ts`
- Modify: `src/SystemFolder/SystemResources/Cursor/useClassicyCursor.ts`
- Modify: `src/SystemFolder/SystemResources/SplitView/ClassicySplitView.scss:52,59,70-77`
- Modify: `src/SystemFolder/SystemResources/SplitView/ClassicySplitView.tsx:33-37`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerDocument.scss:35-46`
- Modify: `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx`
- Test: `src/SystemFolder/SystemResources/Cursor/useClassicyCursor.test.tsx`

**Depends on:** 3.1

**Interfaces:**
- Consumes: `ClassicyCursorRole`, `registerClassicyCursors`, `resolveClassicyAsset` (1.1); `ClassicyIcons.ui.cursors.*` (`ClassicyIcons.ts:519-538`).
- Produces: `cursor-arrow.svg`: a 16×16 `shape-rendering="crispEdges"` SVG drawn from the classic Macintosh arrow cursor bitmap (Inside Macintosh, QuickDraw): data rows (hex, MSB = left pixel) `4000 6000 7000 7800 7C00 7E00 7F00 7F80 7FC0 7C00 6C00 4600 0600 0300 0300 0000` painted black, mask rows `C000 E000 F000 F800 FC00 FE00 FF00 FF80 FFC0 FFE0 FE00 EF00 CF00 8780 0780 0380` minus data painted white; hotspot (1,1). Generated by a scratchpad script, committed as a file. `platinumAssets.ts` adds `registerClassicyCursors(PLATINUM, { arrow: art("cursor-arrow.svg"), watch: ClassicyIcons.ui.cursors.watch, hand: ClassicyIcons.ui.cursors.hand, resizeLr: ClassicyIcons.ui.cursors.resizeLr, resizeUd: ClassicyIcons.ui.cursors.resizeUd, resizeU: ClassicyIcons.ui.cursors.resizeU, resizeD: ClassicyIcons.ui.cursors.resizeD, resizeL: ClassicyIcons.ui.cursors.resizeL, resizeR: ClassicyIcons.ui.cursors.resizeR })` (`ibeam`, `crosshair`, `resizeNwse`, `resizeNesw` have no Platinum file; left unregistered). `useClassicyCursor.ts`: `setCursor(role?: ClassicyCursorRole)`; with a role → `const url = resolveClassicyAsset("cursors", role); document.body.style.cursor = url ? `url(${url}), auto` : ""`; without → `""` (unchanged: the browser arrow, so behavior is identical; the registered `arrow` is for packages and for `setCursor("arrow")`). `ClassicySplitView.tsx:33-37` `dragCursorName` typed `Record<"u"|"d"|"l"|"r", ClassicyCursorRole>` (values unchanged). SCSS: `ClassicySplitView.scss:52` → `var(--classicy-cursor-resize-lr) 8 8, col-resize`; `:59` → `var(--classicy-cursor-resize-ud) 8 8, row-resize`; the `@each` at 70-77 iterates `('u', resize-u, n-resize) ('d', resize-d, s-resize) ('l', resize-l, w-resize) ('r', resize-r, e-resize)` and emits `var(--classicy-cursor-#{$var}) 8 8, $fallback`. `PDFViewerDocument.scss:37` → `var(--classicy-cursor-hand) 8 8, grab`; `:44` → `var(--classicy-pdf-zoom-cursor) 10 10, zoom-in`, where `PDFViewerDocument.tsx` sets `style={{ "--classicy-pdf-zoom-cursor": `url("${zoomToolIcon}")` }}` on its root from the `useClassicyAsset("icons","system.sherlock.search")` value it already reads for the tool button (2.1).

- [ ] **Step 1: Write the failing test** — `src/SystemFolder/SystemResources/Cursor/useClassicyCursor.test.tsx` (imports `platinumAssets` for its side effect; `renderHook`):
```ts
it("sets the body cursor from the registry for a role") // setCursor("resizeLr"); expect(document.body.style.cursor).toBe(`url(${ClassicyIcons.ui.cursors.resizeLr}), auto`)
it("the arrow role resolves to the Platinum arrow file") // expect(resolveClassicyAsset("cursors","arrow")).toMatch(/cursor-arrow/)
it("clears the body cursor with no role") // setCursor("watch"); setCursor(); expect(document.body.style.cursor).toBe("")
it("an unregistered role clears instead of writing url(undefined)") // setCursor("ibeam"); expect(document.body.style.cursor).toBe("")
it("every role SplitView drags with is registered") // for u,d,l,r: resolveClassicyAsset("cursors", dragCursorName[k]) defined (export dragCursorName or duplicate the four roles in the test)
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL — `resolveClassicyAsset("cursors", …)` is undefined. — `pnpm exec vitest run src/SystemFolder/SystemResources/Cursor`
- [ ] **Step 3: Generate `cursor-arrow.svg`, register the cursors, rewrite `useClassicyCursor.ts`** — Script in the scratchpad turns the two hex row lists into `<rect>`s (1×1 user units, `viewBox="0 0 16 16"`, `width="16" height="16"`); commit only the SVG.
- [ ] **Step 4: Rewrite the SCSS `url()`s and the PDF viewer's zoom cursor variable** — Per the Interfaces block; then `grep -rn "cursors/cursor-" src --include=*.scss` prints nothing.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/SystemResources/Cursor src/SystemFolder/SystemResources/SplitView src/SystemFolder/PDFViewer`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src && git commit -m "feat(cursors): cursor roles in the asset registry and CSS cursor variables" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `grep -rn "assets/img/ui/cursors" src --include=*.scss | wc -l  # expect 0`

## Phase 4: Wallpapers and fonts

### 4.1: registerClassicyWallpapers, the .jpg glob, registerClassicyFonts and the Fonts tab

**Files:**
- Create: `src/Appearance/Platinum/assets/fonts/*.woff2 (13 files)`
- Create: `src/Appearance/ClassicyAssetRegistry.fonts.test.ts`
- Modify: `src/Appearance/ClassicyAssetRegistry.ts`
- Modify: `src/Appearance/Platinum/assets/platinumAssets.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts:3-6,81-128`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx:6,69`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx:9-16,47`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx:90`
- Modify: `storybook/.storybook/preview.tsx:1`
- Modify: `src/custom.d.ts`
- Delete: `src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx`

**Depends on:** 3.1

**Interfaces:**
- Consumes: 1.1 registry; `fonts.scss` (13 `@font-face` blocks, `font-family`/`font-weight`/`font-style` at lines 2-105); `ClassicyWallpapers` array (`ClassicyWallpapers.ts:81-128`).
- Produces: In `ClassicyAssetRegistry.ts`: `export type ClassicyFontFace = { family: string; src: ClassicyAssetSource; weight?: string; style?: string }`; `registerClassicyFonts(packageId: string, fonts: ClassicyFontFace[]): void` → `registerClassicyAssets("fonts", packageId, { [family]: { [`${weight ?? "normal"}-${style ?? "normal"}`]: src } })` then `writeClassicyFontFaces(packageId)` (local): builds one `@font-face{font-family:"<family>";src:url("<src>")<format>;font-weight:<w>;font-style:<s>;font-display:swap}` per leaf of that package's fonts tree, where `<format>` is ` format("woff2")`/`("woff")`/`("truetype")`/`("opentype")` by extension or `data:font/<ext>` mime and empty otherwise; writes it into `<style id="classicy-fonts-<packageId>">` (created after `#classicy-styles` when present, else at the head's start; `textContent` replaced on every call; no-op without `document`). `ClassicyWallpapers.ts`: glob becomes `"../../../../assets/img/wallpapers/*.{png,jpg}"` (line 4); the 46-entry array keeps its labels and gains `{ label: "Default Photo", value: wp("default.jpg") }` after "Default"; `export const ClassicyWallpapers` stays (used by tests and by the registration) and `platinumAssets.ts` calls `registerClassicyWallpapers(PLATINUM, ClassicyWallpapers.map(w => ({ name: w.label, src: w.value })))`. `ClassicyAppearanceManager.Desktop.tsx`: `const wallpapers = useClassicyAssetTree("wallpapers")` → `options={Object.entries(wallpapers).filter(([, v]) => typeof v === "string").map(([label, value]) => ({ label, value }))}` (registration order = today's alphabetical list; the Platinum tree is registered once, so order is stable). `ClassicyAppearanceManager.Fonts.tsx`: delete lines 9-16; `const fonts = useClassicyAssetTree("fonts")`; `const CLASSICY_FONT_LABELS: Record<string,string> = { "VCR OSD Mono": "Digital" }`; `options = Object.keys(fonts).map(family => ({ label: CLASSICY_FONT_LABELS[family] ?? family, value: family }))`. Platinum fonts: `src/Appearance/Platinum/assets/fonts/<Family>-<weight>-<style>.woff2` for the 13 faces — `ChicagoFLF-normal-normal`, `Charcoal-normal-normal`, `Geneva-normal-normal`, `Geneva-bold-normal`, `Geneva-normal-italic`, `AppleGaramond-bold-normal`, `AppleGaramond-bold-italic`, `AppleGaramond-normal-italic`, `AppleGaramond-300-normal`, `AppleGaramond-300-italic`, `AppleGaramond-normal-normal`, `VCROSDMono-normal-normal`, `Monaco-normal-normal` (woff2 payload only; the woff fallback is dropped — woff2 is baseline in every supported browser); `platinumAssets.ts` imports them with `import.meta.glob("./fonts/*.woff2", { eager: true, import: "default" })` and calls `registerClassicyFonts(PLATINUM, [...])` in the order Charcoal, ChicagoFLF, Geneva (3), AppleGaramond (6), Monaco, VCR OSD Mono (so the Fonts tab keeps today's order: Charcoal, ChicagoFLF, Geneva, AppleGaramond, Monaco, Digital). `custom.d.ts`: `declare module "*.woff2" { const value: string; export default value; }`. `fonts.scss` is deleted; `ClassicyDesktop.tsx:90` and `preview.tsx:1` lose that import (they already import `platinumAssets` since 3.1).

- [ ] **Step 1: Write the failing tests** — `src/Appearance/ClassicyAssetRegistry.fonts.test.ts` (`beforeEach`: `resetClassicyAssets(); document.head.innerHTML = ""`):
```ts
it("writes one @font-face per face into <style id=classicy-fonts-<packageId>>") // registerClassicyFonts("platinum",[{family:"Geneva",src:"geneva.woff2"},{family:"Geneva",src:"geneva-b.woff2",weight:"bold"}]); const css = document.getElementById("classicy-fonts-platinum")!.textContent!; expect(css.match(/@font-face/g)).toHaveLength(2); expect(css).toContain('font-family:"Geneva";src:url("geneva-b.woff2") format("woff2");font-weight:bold;font-style:normal;font-display:swap')
it("re-registering replaces the style element's content, not duplicates it") // register twice → still one element, 2 faces
it("places the element after #classicy-styles when present") // prepend <style id=classicy-styles>; register; expect(styles.nextElementSibling.id).toBe("classicy-fonts-platinum")
it("keys the fonts tree by family and weight-style") // resolveClassicyAsset("fonts","Geneva.bold-normal") === "geneva-b.woff2"
it("derives format from a data: mime") // src "data:font/woff;base64,AAAA" → 'format("woff")'
```
`ClassicyWallpapers.test.ts` add:
```ts
it("includes the jpg wallpaper") // expect(ClassicyWallpapers.some(w => w.label === "Default Photo" && w.value.endsWith(".jpg") || w.value.startsWith("data:image/jpeg"))).toBe(true); resolveWallpaper("default.jpg") !== ""
```
`ClassicyAppearanceManager.Fonts.test.tsx` (render the tab's `children` via `renderHook(() => useFontsTab({...}))` inside the providers, with `platinumAssets` imported):
```ts
it("lists the registered font families in registration order with the Digital label") // option labels equal ["Charcoal","ChicagoFLF","Geneva","AppleGaramond","Monaco","Digital"]; value of "Digital" is "VCR OSD Mono"
it("a family registered after mount appears") // act(() => registerClassicyFonts("platinum",[{family:"Espy Sans",src:"espy.woff2"}])) → an "Espy Sans" option
```
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL — `registerClassicyFonts` is not exported; jpg not found; option list is the literal. — `pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.fonts.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx`
- [ ] **Step 3: Decode the 13 woff2 payloads to files (scratchpad script, not committed)** — Parse `fonts.scss`: for each `@font-face` block take `font-family`, `font-weight`, `font-style` and the first `url(data:…;base64,<b64>) format('woff2')`; write `src/Appearance/Platinum/assets/fonts/<Family sans spaces>-<weight>-<style>.woff2`. Verify `ls src/Appearance/Platinum/assets/fonts/*.woff2 | wc -l` is 13 and `file` reports `Web Open Font Format (Version 2)` for each.
- [ ] **Step 4: Implement `registerClassicyFonts`/`writeClassicyFontFaces`, the wallpaper glob and registration, the two tabs, the Platinum font registration; delete `fonts.scss` and its two imports** — Per the Interfaces block. `grep -rn fonts.scss src storybook vite.config.ts bin` must then show only `vite.config.ts` comments (rewritten in 5.1).
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 6: Lint, type-check, commit** — git add -A src storybook/.storybook/preview.tsx && git commit -m "feat(appearance): wallpaper and font registries; Platinum fonts as files" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.fonts.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx`

## Phase 5: Bundling

### 5.1: Package assets emit as files; verify:dist

**Files:**
- Modify: `vite.config.ts`
- Modify: `bin/check-dist-imports.mjs`
- Modify: `package.json (exports, files)`
- Modify: `docs/AGENT-REFERENCE.md:36-56`
- Modify: `CLAUDE.md:621-622`
- Test: `bin/classicyStyleInjector.test.ts (unchanged, must still pass)`

**Depends on:** 4.1

**Interfaces:**
- Consumes: Vite 7.3.5 `shouldInline` (`?no-inline` short-circuits before the `build.lib` always-inline branch, `node_modules/vite/dist/node/chunks/config.js:8815-8819`); `injectCssPlugin` and `splitFontFacesPlugin` (`vite.config.ts:34-153`); `bin/check-dist-imports.mjs`.
- Produces: `vite.config.ts`: new `noInlineAppearanceAssetsPlugin(): Plugin` (`enforce: "pre"`, `resolveId(source, importer, options)`: return `null` unless `importer` is set and `source` carries no Vite query; `const r = await this.resolve(source, importer, { ...options, skipSelf: true })`; if `r` and `r.id` (query stripped) matches `/\.(woff2?|ttf|otf|png|jpe?g|gif|svg|ogg|m4a|mp3|ac3|wav)$/i` and contains `/src/Appearance/`, return `r.id + (r.id.includes("?") ? "&" : "?") + "no-inline"`); listed before `react()`; the long comment at 254-270 is replaced by three lines saying lib mode ignores `assetsInlineLimit` and this plugin uses the per-import `?no-inline` opt-out for package assets. `splitFontFacesPlugin` is deleted (no base64 fonts remain); `injectCssPlugin` always emits `fonts.js` with the source `// Deprecated no-op: Classicy's fonts are registered by the Platinum appearance package (registerClassicyFonts). Kept so \`import "classicy/fonts"\` keeps resolving.\n` and `fonts.d.ts` as today; the `CLASSICY_FONTS_STYLE_ELEMENT_ID` import is dropped (the constant stays in `bin/classicyStyleInjector.ts` for its test). `package.json`: remove the `./dist/fonts.css` export; keep `./fonts`; `files` unchanged (`dist` covers `dist/assets`). `check-dist-imports.mjs`: invariant 3 becomes "each entry bundle injects the stylesheet and contains neither `data:font/` nor `data:application/font-`"; invariant 4 becomes "`dist/fonts.js` exists and has no `import`/`require`"; new invariant 5: `dist/assets/` contains exactly 13 `.woff2` files and at least 17 `.svg`/`.png` files from `src/Appearance/Platinum/assets/art`, and `dist/classicy.es.js` references `new URL("assets/` at least once (file assets resolved relative to the bundle). Docs: `AGENT-REFERENCE.md:36-56` — `import 'classicy/fonts'` line becomes `// no longer needed: the Platinum package registers its fonts; the import is a deprecated no-op`, the exports table drops `classicy/dist/fonts.css` and says fonts ship as `dist/assets/*.woff2`; `CLAUDE.md:621-622` — rewrite the two bullets: styles still inject; fonts are registered by `registerClassicyFonts` as `<style id="classicy-fonts-platinum">` from files under `dist/assets/`, `classicy/fonts` is a no-op shim, package assets under `src/Appearance/**` emit as files via the `?no-inline` resolver, `verify:dist` checks both.

- [ ] **Step 1: Write the failing check** — Edit `bin/check-dist-imports.mjs` first (invariants 3-5 as above, each printing `<file>: <reason>` and exiting 1). Then build the current tree:
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL at `verify:dist` — `dist/classicy.es.js: inlines fonts as data: URIs` (the fonts are now imported from `src/Appearance` but lib mode still inlines them) and `dist/assets: expected 13 .woff2 files, found 0`. — `pnpm build:source`
- [ ] **Step 3: Implement `noInlineAppearanceAssetsPlugin`, delete `splitFontFacesPlugin`, make `fonts.js` the shim, update `package.json` exports** — Per the Interfaces block.
- [ ] **Step 4: Build to verify it passes** — Expected: `verify:dist` passes; `13`; `0`. Also `grep -c 'classicy-fonts-platinum' dist/classicy.es.js` ≥ 1 and `du -sh dist/classicy.es.js` is smaller than before the part (record both numbers in the commit body). — `pnpm build:source && ls dist/assets | grep -c '\.woff2$' && grep -c 'data:font' dist/classicy.es.js`
- [ ] **Step 5: Smoke the example app** — Open it; in devtools `document.getElementById("classicy-fonts-platinum").textContent.match(/@font-face/g).length` is 13; Network shows `.woff2` requests with 200; the Appearance Manager Fonts tab lists six families; no console errors. Stop the server. — `pnpm preview`
- [ ] **Step 6: Update the docs** — `docs/AGENT-REFERENCE.md:36-56` and `CLAUDE.md:621-622` per the Interfaces block.
- [ ] **Step 7: Lint, type-check, commit** — git add vite.config.ts bin/check-dist-imports.mjs package.json docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "build: emit appearance package assets as files; fonts.js becomes a no-op shim" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm build:source  # verify:dist passes with the new invariants`

## Phase 6: Documentation and parity

### 6.1: Registry docs, example app, parity after

**Files:**
- Modify: `docs/AGENT-REFERENCE.md:725-747`
- Modify: `CLAUDE.md:160-170`
- Modify: `example/src/app.tsx:4`

**Depends on:** 5.1

**Interfaces:**
- Consumes: Everything above.
- Produces: `AGENT-REFERENCE.md` §5 becomes "Asset registries": the five kinds, `registerClassicyAssets`/`registerClassicyIcons`/`registerClassicyCursors`/`registerClassicyWallpapers`/`registerClassicyFonts`/`registerClassicySystemArt` signatures, deep-merge semantics (the alias-badge example now `registerClassicySystemArt("platinum", { aliasBadge })`), read-side rule (`useClassicyAsset` in components, `resolveClassicyAsset` elsewhere, never a module-scope capture), `useClassicyAssetTree`, the CSS variables `--classicy-cursor-<role>` and `--classicy-art-<key>` with the role and key lists, and the four keys Platinum leaves unregistered. `CLAUDE.md:169` alias sentence → `registerClassicySystemArt("<package>", { aliasBadge })`; the Theming section gains one paragraph pointing at `src/Appearance/ClassicyAssetRegistry.ts` and `src/Appearance/Platinum/assets/platinumAssets.ts`. `example/src/app.tsx:4` `import "classicy/fonts"` is removed.

- [ ] **Step 1: Write the docs and remove the example's fonts import** — Per the Interfaces block; `grep -rn "classicy/fonts" example storybook docs CLAUDE.md` then shows only the deprecation note in AGENT-REFERENCE.
- [ ] **Step 2: Shoot the parity set after** — Same ids from `stories.txt` into `.playwright-mcp/parity/part-C/after/`; then `cd .playwright-mcp/parity/part-C && for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected: `0` on every line. Any non-zero: inspect both images; fix the code (never the screenshot); a font-rendering difference means a face failed to load — check the `<style id="classicy-fonts-platinum">` URLs in the Storybook iframe. — `pnpm storybook`
- [ ] **Step 3: Full gate** — Expected: all PASS; record test and story counts in the commit body. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source`
- [ ] **Step 4: Commit** — git add docs CLAUDE.md example/src/app.tsx && git commit -m "docs(appearance): asset registries, system art keys and cursor roles" (with the trailer). Stop the Storybook server.

**Validation:** `ls .playwright-mcp/parity/part-C/after/*.png | wc -l  # equals before; compare loop prints 0 for every story`

## Acceptance Criteria

- [ ] `registerClassicyIcons({ system: { alias } })` leaves `Object.keys(ClassicyIcons.system).length` unchanged and `resolveClassicyAsset("icons","system.desktop.trashFull")` defined (2.1 test).
- [ ] A component using `useClassicyAsset` re-renders after a registration made after mount (1.1 test).
- [ ] `grep -rn '= ClassicyIcons\.' src --include=*.ts --include=*.tsx | grep '^[^:]*:[0-9]*:const '` prints nothing; `grep -rn '@img/' src/SystemFolder --include=*.tsx` prints only `PictureViewer.tsx` (sample content).
- [ ] 21 of the 25 `ClassicySystemArtKey`s resolve to a non-empty source under "platinum"; `startupWordmark`, `paradeDefault`, `menuCheck`, `menuDash` resolve to `undefined` (3.1 test).
- [ ] `.classicyDesktop` carries `--classicy-cursor-*` and `--classicy-art-*` inline variables; `ClassicySplitView.scss` and `PDFViewerDocument.scss` contain no `url('../`.
- [ ] The wallpaper picker lists 47 entries including the `.jpg`; the Fonts tab lists the six registered families in today's order.
- [ ] `pnpm build:source` passes `verify:dist`: 13 `.woff2` files in `dist/assets`, no `data:font` in the bundles, `dist/fonts.js` is a self-contained no-op.
- [ ] All 18-title parity stories compare with AE 0 before vs after.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 3 item 1: one registry parameterized by kind; deep merge; per-package namespaces; Platinum fallback | 1.1, Steps 1-3 |
| Contract: `registerClassicyAssets`, `resolveClassicyAsset`, `subscribeClassicyAssets`, `useClassicyAsset`, `useClassicyAssetTree`, `useClassicyAssetVars` | 1.1, Step 3 |
| Audit §4.1 wipe case test (`{ system: { alias } }` keeps the other entries) | 1.1 Step 1 and 2.1 Step 1 |
| Phase 3 item 2: `registerClassicyIcons` re-pointed; 37 captures + direct imports converted; 5 unconsumed entries deleted | 2.1, Steps 3-4 |
| Phase 3 item 3: Apple menu, sad-mac, parade, Trash, alias badge, help button, About art, QuickTime controls, boot art registered by Platinum and read at render (D6) | 3.1 Step 4 (QuickTime controls and parade through the icons registry in 2.1 Step 4) |
| `assets.scss` art re-exposed as `--classicy-art-*` while staying base64 in SCSS | 3.1 Steps 1 and 4; `ClassicyDesktop.assetVars` test |
| Phase 3 item 4: cursors by role; SCSS `url()` → `var(--classicy-cursor-*)`; default arrow | 3.2, Steps 3-4 |
| Phase 3 item 5: wallpapers (`.jpg` glob) and fonts as registries; picker and Fonts tab read them | 4.1, Step 4 |
| Phase 3 item 6 / D17: values are imported URL, http(s) or data: (string leaves only, no stricter validation); package assets emitted as files | 1.1 (type) and 5.1 Step 3 |
| `verify:dist` adjustments | 5.1, Step 1 |
| Platinum pixel-identical | 0 and 6.1 Step 2 |

**Placeholder scan:** No TBDs. Every step names its file, signature, command or expected output; the only deliberate placeholder is `getActiveClassicyAppearancePackageId()` returning "platinum", which the umbrella plan assigns to Part B.
**Residual risk:** (1) Vite's `?no-inline` path emits `new URL("assets/…", import.meta.url)`; the UMD bundle rewrites `import.meta.url` to `document.currentScript.src`, which fails for hosts that inline the UMD script — mitigated by the example-app smoke in 5.1 Step 5 and by `verify:dist`. (2) Dropping the woff fallback changes nothing in supported browsers but is a visible diff in `fonts.css`-dependent CSP setups; documented in 5.1. (3) Screenshots do not capture cursors; the cursor tests in 3.2 and a manual hover over a SplitView divider in the example app cover it.

## Next Steps

1. Part B imports `src/Appearance/Platinum/assets/platinumAssets.ts` from (or folds it into) `src/Appearance/Platinum/index.ts` and replaces `getActiveClassicyAppearancePackageId()`'s body with the store read; the registration call at the bottom of `ClassicyIcons.ts` moves with it.
2. Part E rewrites `assets.scss`, `ClassicySlider.scss` and `ClassicyTabs.scss` to `mask-image: var(--classicy-art-*)` and adds the four unregistered keys' art.
3. Report to the umbrella plan (contract gaps): cursor roles `resizeU`/`resizeD`/`resizeL`/`resizeR`; system-art keys for the title-bar end caps (`windowStripesLeft/Right`, red variants), the utility crosshatch, the pre-boot halftone and the About background; `startupWordmark`/`paradeDefault` have no single asset; `assetsInlineLimit` cannot work in lib mode (the `?no-inline` resolver replaces it); `ClassicyAssetSource` is defined in Part B's file but needed by Part C first.
