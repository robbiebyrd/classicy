---
id: 0034-whu
title: 'B 1.1: ClassicyAppearancePackage.ts, ClassicyAppearancePackageSchema.ts, ClassicyAppearanceStyles.ts'
purpose: Create the Appearance Package registry, its zod schema and the scoped style injector that every later package feature builds on.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:10:08.701Z"
updated: "2026-10-28T20:10:08.701Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/ClassicyAppearancePackage.ts
      - src/Appearance/ClassicyAppearancePackageSchema.ts
      - src/Appearance/ClassicyAppearanceStyles.ts
      - src/Appearance/ClassicyAppearancePackage.test.tsx
      - src/Appearance/ClassicyAppearancePackageSchema.test.ts
      - src/Appearance/ClassicyAppearanceStyles.test.ts
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0033-f4o", "depends"]
  plans:
    - ["0005-1b3", "included", ["1.1"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
---

# B 1.1: ClassicyAppearancePackage.ts, ClassicyAppearancePackageSchema.ts, ClassicyAppearanceStyles.ts

## Problem Statement

There is no package registry, no active-package state and no root attribute to scope a package's CSS (audit §2.9, §8.2; §9 Phase 2 items 1-2). This section creates the contract module pinned by umbrella 0002-ldj ('package module'): `src/Appearance/ClassicyAppearancePackage.ts` with every exported type and function (ClassicyAssetSource, isClassicyAssetSource, ClassicyAppearanceLayout, ClassicyAppearancePackage, register/get/list/subscribe/useClassicyAppearancePackages, useActiveClassicyAppearancePackage, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) plus the hook/event types part I implements, `ClassicyAppearancePackageSchema.ts` (zod, validating everything but css/options/hooks) and `ClassicyAppearanceStyles.ts` (`injectClassicyAppearanceStyles(id, css)`: idempotent `<style id="classicy-appearance-<id>">` after `#classicy-styles`, no-op without `document`).

Local additions: structurally identical stand-ins for parts C/D's `assets`/`sounds` types; `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` (id "platinum", css "", Platinum data and layout) returned only when nothing is registered — the structure-only render of audit §8.2; `useClassicyAppearanceLayout()` = the active package's layout; `classicyKnobsToSchema(knobs)`; `resetClassicyAppearancePackagesForTests()`. Registration validates with the schema, logs `classicyLog("error", "ClassicyAppearance", …)` and skips on failure, injects the css on success, then publishes to `useSyncExternalStore` subscribers (registry shape mirrors ClassicyControlStripRegistry.ts).

**Impact:** Every later story imports from these three modules: the store/reducer (2.1), theme refusal (3.1), the Platinum package (4.1) and part I's hook. Without them nothing else in B or I compiles.

## Steps

### 1: Write the failing registry tests

src/Appearance/ClassicyAppearancePackage.test.tsx (a `makePackage(id)` helper builds a valid package from getTheme("default") with css "" and the Platinum layout). Tests: `registers and lists in registration order` (register b then a → listClassicyAppearancePackages().map(p=>p.id) deep-equals ["b","a"]); `re-registering the same id replaces in place` (register a with name "One" then "Two" → getClassicyAppearancePackage("a")?.name === "Two", list length 1, position unchanged); `rejects an invalid package and logs an error` (id "Not Kebab" → getClassicyAppearancePackage returns undefined; a registerClassicyLogSink spy received one entry with level "error" and subsystem "ClassicyAppearance"); `injects the package css on register` (css ".x{}" → document.getElementById("classicy-appearance-a")?.textContent === ".x{}"); `subscribe fires once per register and stops after unsubscribe`; `useClassicyAppearancePackages re-renders on registration` (renderHook; act(register) → result.current.length increments); `useActiveClassicyAppearancePackage falls back to platinum for an unknown packageId` (register platinum stub + set useAppManager state packageId "irix" → result id "platinum" and `toBe` the registered object); `returns CLASSICY_FALLBACK_APPEARANCE_PACKAGE when nothing is registered` (`toBe` the constant, css ""); `useClassicyAppearanceLayout returns the active package layout` (register "mirror" with growBoxCorner "bottom-left", set packageId "mirror" → layout.window.growBoxCorner === "bottom-left"); `isClassicyAssetSource` table: "data:image/png;base64,AA" true, "https://x/y.png" true, "/assets/a.png" true, "./a.png" true, "blob:https://x/1" true, "" false, "javascript:alert(1)" false, 5 false. Reset between tests with the test-only export `resetClassicyAppearancePackagesForTests()` (clears the map, removes injected style elements).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/ClassicyAppearancePackage.test.tsx` — Expected: FAIL — Cannot find module '@/Appearance/ClassicyAppearancePackage'.

### 3: Write the failing schema and injector tests

ClassicyAppearancePackageSchema.test.ts: `accepts a package with all 21 presets` (platinum-shaped object built from getAllThemes() → success); `rejects a missing layout group` (delete layout.menuBar → failure with path ["layout","menuBar"]); `rejects an unknown growBoxCorner` ("middle"); `strips css, options and hooks` (input carries css "x" and hooks {} → parsed data has no css key); `accepts a nested asset tree` ({ icons: { system: { alias: "/a.png" } } }) and `rejects an empty-string asset` ({ icons: { a: "" } }); `classicyKnobsToSchema builds a bounded number per knob` (knobs { menuFrame: { shadow: { label: "Shadow", min: 0, max: 4, default: 1 } } } → parse({}) gives { menuFrame: { shadow: 1 } }; parse({ menuFrame: { shadow: 9 } }) fails; unknown family "extra" passes through). ClassicyAppearanceStyles.test.ts: `inserts the style element directly after #classicy-styles` (prepend a <style id="classicy-styles"> to head → inject("p", ".a{}") → head.children[1].id === "classicy-appearance-p"); `appends to head when #classicy-styles is absent`; `is idempotent and updates the text on a second call` (two calls → one element, textContent of the last call); `is a no-op without document` (vi.stubGlobal("document", undefined) → does not throw).

### 4: Run them to verify they fail

`pnpm exec vitest run src/Appearance` — Expected: FAIL — modules not found.

### 5: Implement the three modules per the Interfaces block

Exactly the 0002-ldj 'package module' block plus the hook/event types (ClassicyAppearanceEvent, ClassicyAppearanceDecoration, ClassicyAppearanceContext, ClassicyAppearanceHandler, ClassicyAppearanceHooks, CSSProperties from react). Local types: `assets?: Partial<Record<"icons"|"cursors"|"wallpapers"|"fonts"|"systemArt", ClassicyAssetTreeLike>>` with `type ClassicyAssetTreeLike = { [key: string]: ClassicyAssetSource | ClassicyAssetTreeLike }`; `sounds?: Array<{ id: string; name: string; packageId?: string } & Record<string, unknown>>`; `CLASSICY_FALLBACK_APPEARANCE_PACKAGE = { id: "platinum", name: "Platinum", css: "", defaults: getTheme("default"), presets: getAllThemes(), layout: { window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } } }` (frozen); `useClassicyAppearanceLayout(): ClassicyAppearanceLayout`. Registry: Map + listeners Set + cached array snapshot republished on every change; `useClassicyAppearancePackages` = useSyncExternalStore(subscribe, () => snapshot, () => snapshot); `useActiveClassicyAppearancePackage` reads `useAppManager((s) => s.System.Manager.Appearance.packageId)` and returns `getClassicyAppearancePackage(packageId) ?? getClassicyAppearancePackage("platinum") ?? CLASSICY_FALLBACK_APPEARANCE_PACKAGE`. Schema: `ClassicyAppearanceLayoutSchema` (three z.enum groups, all required); `ClassicyAppearancePackageSchema = z.object({ id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(64), defaults: ClassicyThemeSchema, presets: z.array(ClassicyThemeSchema).max(256).optional(), layout: ClassicyAppearanceLayoutSchema, assets: z.record(z.string(), assetTree).optional(), sounds: z.array(z.looseObject({ id: z.string(), name: z.string() })).optional() })` with assetTree = `z.lazy(() => z.record(z.string(), z.union([z.string().refine(isClassicyAssetSource), assetTree])))`; `isClassicyAssetSource(v)`: a `data:` URI, an absolute http(s) URL, or a bundler URL (`/`, `./`, `../` or `blob:` prefix); empty string false. `classicyKnobsToSchema(knobs: Record<string, Record<string, { label: string; min: number; max: number; default: number }>>): z.ZodObject<any>` returns `z.looseObject({ [family]: z.object({ [key]: z.number().min(min).max(max).default(default) }) })`. Styles: `CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX = "classicy-appearance-"`.

### 6: Run tests to verify they pass; regenerate barrels

`pnpm exec vitest run src/Appearance && pnpm generate-barrels && pnpm exec tsc --noEmit -p .` — Expected: PASS; src/index.ts now exports the three modules.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance src/index.ts && git commit -m "feat(appearance): package registry, schema and style injection"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance
- [ ] src/Appearance/ClassicyAppearancePackage.ts exports every name in the 0002-ldj 'package module' block and the hook/event types; re-registering an id replaces in place; useActiveClassicyAppearancePackage falls back to platinum, then to CLASSICY_FALLBACK_APPEARANCE_PACKAGE.
- [ ] registerClassicyAppearancePackage validates with ClassicyAppearancePackageSchema, logs an error and skips an invalid package, and injects `<style id="classicy-appearance-<id>">` directly after `#classicy-styles` on success.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/ClassicyAppearancePackage.ts` - create: types, registry, hooks, fallback package
- `src/Appearance/ClassicyAppearancePackageSchema.ts` - create: zod schema and classicyKnobsToSchema
- `src/Appearance/ClassicyAppearanceStyles.ts` - create: injectClassicyAppearanceStyles
- `src/Appearance/ClassicyAppearancePackage.test.tsx` - create: registry and hook tests
- `src/Appearance/ClassicyAppearancePackageSchema.test.ts` - create: schema tests
- `src/Appearance/ClassicyAppearanceStyles.test.ts` - create: injector tests
- `src/index.ts` - regenerated by barrelsby

## Work Log
