---
id: 0019-y15
title: 'C 1.1: ClassicyAssetRegistry.ts'
purpose: Create the one deep-merging, per-package asset registry every later Part C story registers into and reads from.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:00:04.770Z"
updated: "2026-10-29T00:01:03.347Z"
started: "2026-10-28T23:33:07.009Z"
completed: "2026-10-28T23:36:19.032Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/ClassicyAssetRegistry.ts
      - src/Appearance/ClassicyAssetRegistry.test.ts
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0018-0zn", "depends"]
  plans:
    - ["0007-1sl", "included", ["1.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: complete
---

# C 1.1: ClassicyAssetRegistry.ts

## Problem Statement

Audit §4.1: `registerClassicyIcons` is a shallow `Object.assign` (`ClassicyIcons.ts:42-48`), so registering `{ system: { alias } }` wipes the other ~200 `system` entries, and five unrelated registries (icons, cursors, wallpapers, fonts, sounds) each have their own shape. Umbrella 0002-ldj pins one registry contract ("Shared Contract — asset registries"): `registerClassicyAssets`, `resolveClassicyAsset`, `subscribeClassicyAssets`, `useClassicyAsset`, `useClassicyAssetTree`, `useClassicyAssetVars`, the kind wrappers, `ClassicyCursorRole` and `ClassicySystemArtKey`.

This story creates `src/Appearance/ClassicyAssetRegistry.ts` with per-`(kind, packageId)` trees, in-place deep merge, dotted-path resolution with active → platinum → undefined fallback, `useSyncExternalStore` readers, a cached merged view, and a CSS-variable exporter. The active package id is a placeholder `getActiveClassicyAppearancePackageId()` returning "platinum" until Part B replaces its body.

**Impact:** Every other Part C story (icons, system art, cursors, wallpapers, fonts) registers into and reads from this module; without it none of them can start, and the audit §4.1 wipe bug stays.

## Steps

### 1: Write the failing test

File `src/Appearance/ClassicyAssetRegistry.test.ts`, `beforeEach(resetClassicyAssets)`:
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

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts` — Expected: FAIL — Cannot find module '@/Appearance/ClassicyAssetRegistry'.

### 3: Implement src/Appearance/ClassicyAssetRegistry.ts per the Interfaces block

Contract exports verbatim: `ClassicyAssetKind`, `ClassicyAssetTree`, `registerClassicyAssets(kind, packageId, tree)`, `resolveClassicyAsset(kind, path, packageId?)`, `subscribeClassicyAssets(listener)`, `useClassicyAsset(kind, path)`, `useClassicyAssetTree(kind)`, `useClassicyAssetVars()`, `registerClassicyCursors(packageId, cursors)`, `registerClassicyWallpapers(packageId, list)`, `registerClassicySystemArt(packageId, art)`, `type ClassicyCursorRole`, `type ClassicySystemArtKey` (`registerClassicyFonts` is C 4.1). Local: `export type ClassicyAssetSource = string` (import Part B's alias instead if it has landed); `export const getActiveClassicyAppearancePackageId = (): string => PLATINUM` with doc comment `Placeholder until plan 0002-ldj Part B reads System.Manager.Appearance.packageId; Part B replaces the body, not the name`; `export const resetClassicyAssets = (): void` (test-only); `export const classicyAssetVarName = (kind: "cursors" | "systemArt", key: string): string` (`cursors` → `--classicy-cursor-${kebab}`, `systemArt` → `--classicy-art-${kebab}`; `resizeLr` → `resize-lr`, `windowStripesRed` → `window-stripes-red`). Store: `const trees = new Map<ClassicyAssetKind, Map<string, ClassicyAssetTree>>()`, `let version = 0`, `const listeners = new Set<() => void>()`. `registerClassicyAssets` deep-merges IN PLACE (object at a key merges recursively, string replaces, string↔object mismatch logs `classicyLog("warn", "ClassicyAssetRegistry", …)` and the new value wins; skip `__proto__`/`constructor`/`prototype` keys with a warn), bumps the version, notifies. `resolveClassicyAsset` walks the dotted path in `packageId ?? getActiveClassicyAppearancePackageId()`, then `"platinum"`, returning the string leaf or `undefined`. `useClassicyAsset` = `useSyncExternalStore(subscribeClassicyAssets, () => resolveClassicyAsset(kind, path))`. `useClassicyAssetTree(kind)` returns a merged COPY (platinum deep-copied, active deep-merged over it) cached per `(kind, version, activeId)`. `useClassicyAssetVars()` returns `{ [classicyAssetVarName("cursors", role)]: `url("${src}")`, …, [classicyAssetVarName("systemArt", key)]: `url("${src}")` }` from the merged `cursors` and `systemArt` trees, cached per version. Wrappers: `registerClassicyCursors` → `("cursors", …)`; `registerClassicySystemArt` → `("systemArt", …)`; `registerClassicyWallpapers(packageId, list)` → `("wallpapers", packageId, Object.fromEntries(list.map(w => [w.name, w.src])))`. `ClassicyCursorRole = "arrow" | "watch" | "hand" | "ibeam" | "crosshair" | "resizeLr" | "resizeUd" | "resizeNwse" | "resizeNesw" | "resizeU" | "resizeD" | "resizeL" | "resizeR"`; `ClassicySystemArtKey` exactly the contract's 25 keys. Caches are `Map<string, {version, value}>` so `useSyncExternalStore` gets stable snapshots.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts` — Expected: PASS (10 tests).

### 5: Regenerate barrels, lint, type-check, commit

`pnpm exec barrelsby -c .ts-barrel.json && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add src/Appearance src/index.ts && git commit -m "feat(appearance): per-package asset registry with deep merge and platinum fallback" (with the trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.test.ts
- [x] Registering `{ system: { alias: "x" } }` after a `system` tree with other keys keeps every other key and resolves `system.alias` to `"x"`.
- [x] A component using `useClassicyAsset` re-renders after a registration made after mount; `useClassicyAssetVars()` emits `--classicy-cursor-<kebab role>` and `--classicy-art-<kebab key>` as `url("…")` strings.
- [x] `resolveClassicyAsset(kind, path)` falls back active package → "platinum" → `undefined`; `getActiveClassicyAppearancePackageId()` returns "platinum" and is documented as Part B's placeholder.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/ClassicyAssetRegistry.ts` - create the registry module
- `src/Appearance/ClassicyAssetRegistry.test.ts` - create registry tests
- `src/index.ts` - barrel regenerated

## Work Log

### 2026-10-28T23:35:30.553Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 5 set not_applicable; tsc and pnpm test passed)

### 2026-10-28T23:35:30.653Z - Completed: commits e9625ee..8633b8a, task review clean

### 2026-10-29T00:01:03.347Z - pnpm lint passes repo-wide on the part branch (format fix cherry-picked: A e1ab6a417 / C 4d92822d3)
