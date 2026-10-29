---
id: 0035-3bj
title: 'B 2.1: Appearance.packageId, ClassicyDesktopChangeAppearancePackage, data-classicy-appearance'
purpose: Persist the active Appearance Package id in the store, switch it with a guarded action, and write it onto the desktop root so package CSS can be scoped at runtime.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T20:10:49.263Z"
updated: "2026-10-29T13:40:54.601Z"
started: "2026-10-29T12:26:02.941Z"
completed: "2026-10-29T13:40:54.601Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - storybook/.storybook/ClassicyDecorators.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.appearancePackage.test.ts
      - src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.appearancePackage.test.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.appearance.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0034-whu", "depends"]
  plans:
    - ["0005-1b3", "included", ["2.1"]]
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
  "6":
    status: complete
---

# B 2.1: Appearance.packageId, ClassicyDesktopChangeAppearancePackage, data-classicy-appearance

## Problem Statement

Audit §8.2 and §9 Phase 2 item 1 (umbrella 0002-ldj 'Store and actions'): the active package id lives in `System.Manager.Appearance.packageId` (default "platinum", persisted), is switched by `ClassicyDesktopChangeAppearancePackage { packageId }` (rejected with a classicyLog warning when unregistered) and is written to the desktop root as `data-classicy-appearance` so a package's CSS — scoped under `.classicyDesktop[data-classicy-appearance="<id>"]` — applies with an attribute flip.

This section adds the store field and default, the `hasPackageId` predicate, the reducer case (activating a clone of the package's `defaults` when the active theme belongs to another package; availableThemes untouched — part J), a copy-on-write `migrateAppearancePackage` so persisted state without the field loads, the root attribute in ClassicyDesktop.tsx, and the same attribute on the non-desktop Storybook frame (ClassicyDecorators.tsx) so Controls/* stories keep the Platinum look once its CSS is scoped.

**Impact:** Without packageId and the root attribute, the Platinum CSS injected in 4.1-4.3 matches nothing and every component renders unstyled; part I's useActiveClassicyAppearancePackage and part J's Packages tab have no state to read.

## Steps

### 1: Write the failing reducer and migration tests

ClassicyDesktopManager.appearancePackage.test.ts (harness copied from importTheme.test.ts; registers a stub package "irix" via registerClassicyAppearancePackage with defaults = getTheme("azul") given package "irix" and id "irix-default", plus a "platinum" stub, in beforeEach; resetClassicyAppearancePackagesForTests in afterEach): `default state carries packageId platinum` (DefaultAppManagerState.System.Manager.Appearance.packageId === "platinum"); `switches to a registered package and activates its defaults` (run ChangeAppearancePackage { packageId: "irix" } → packageId "irix", activeTheme.id "irix-default", activeTheme not `toBe` the registered defaults object); `keeps the active theme when it already belongs to the package` (activeTheme.package "irix" set first → activeTheme reference unchanged); `ignores an unregistered id with a warning` (packageId "beos" → state unchanged; log sink saw level "warn"); `ignores a payload without packageId`; `is unreachable to untrusted dispatches` (isUntrustedActionAllowed("ClassicyDesktopChangeAppearancePackage") === false). ClassicyStateMigrations.appearancePackage.test.ts: `fills packageId and theme.package when absent` (DefaultAppManagerState deep-cloned with packageId deleted and package deleted from activeTheme, availableThemes[0], customThemes[0] → all "platinum"); `returns the same object when complete` (`toBe(DefaultAppManagerState)`); `does not mutate the input` (deep-frozen input, no throw).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.appearancePackage.test.ts src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.appearancePackage.test.ts` — Expected: FAIL — packageId undefined; reducer case missing (state unchanged where change expected).

### 3: Implement the store field, predicate, reducer case and migration

`ClassicyStoreSystemAppearanceManager.packageId: string` (ClassicyAppearance.ts:11-40; doc: the active Appearance Package id, persisted, default "platinum"); DefaultAppManagerState (ClassicyAppManager.ts:620) adds `packageId: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`; `hasPackageId(m): m is Msg & { packageId: string }` after hasAvailableThemes (ClassicyActionPredicates.ts:278); reducer case `ClassicyDesktopChangeAppearancePackage` beside ChangeTheme (ClassicyDesktopManager.tsx:294): `if (!hasPackageId(action)) break; const pkg = getClassicyAppearancePackage(action.packageId); if (!pkg) { classicyLog("warn", "ClassicyAppearance", `Appearance package "${action.packageId}" is not registered.`); break; } appearance.packageId = pkg.id; if (appearance.activeTheme.package !== pkg.id) appearance.activeTheme = cloneClassicyTheme(pkg.defaults);`; `migrateAppearancePackage(state)` chained after migrateThemeMetrics (ClassicyStateMigrations.ts:34-35): copy-on-write fill of `packageId` (default "platinum") and of `package` on activeTheme/availableThemes[]/customThemes[]; doc comment line `- 2.2: Appearance.packageId and theme.package default to "platinum"`. Add `package: string` to the ClassicyTheme type now (3.1 adds the schema side) so the migration compiles; every ClassicyTheme literal tsc flags gets `package: "platinum"`.

### 4: Write the failing desktop-root test

ClassicyDesktop.appearance.test.tsx (setup as ClassicyDesktop.test.tsx:28-45): `writes the active package id on the desktop root` (render → document.getElementById("classicyDesktop")?.getAttribute("data-classicy-appearance") === "platinum"); `follows a package switch` (act(() => useAppManager.setState(s => ({ ...s, System: { ...s.System, Manager: { ...s.System.Manager, Appearance: { ...s.System.Manager.Appearance, packageId: "irix" } } } }))) → attribute "irix").

### 5: Implement the root attribute in ClassicyDesktop.tsx and the Storybook frame

ClassicyDesktop.tsx: `const packageId = useAppManager((s) => s.System.Manager.Appearance.packageId)` and `data-classicy-appearance={packageId}` on the root div (lines 603-615); ClassicyDecorators.tsx:84-86: the non-desktop story frame div also carries `data-classicy-appearance={useAppManager((s) => s.System.Manager.Appearance.packageId)}` via a small `StoryFrame` component so the hook is legal. Run the test → PASS.

### 6: Run tests, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git commit -m "feat(appearance): active package id in the store, ChangeAppearancePackage and the desktop root attribute"` with the trailer Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/ControlPanels/AppManager
- [x] System.Manager.Appearance.packageId defaults to "platinum", persists, is healed by migrateClassicyState, and is written as data-classicy-appearance on #classicyDesktop and on the Storybook frame.
- [x] ClassicyDesktopChangeAppearancePackage switches to a registered package (activating a clone of its defaults when the active theme belongs to another package), ignores unregistered ids with a classicyLog warning, and is unreachable to untrusted dispatches.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - packageId on the Appearance slice type; ClassicyTheme.package
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` - default packageId
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.ts` - migrateAppearancePackage
- `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` - hasPackageId
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` - ChangeAppearancePackage reducer case
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - data-classicy-appearance on the root
- `storybook/.storybook/ClassicyDecorators.tsx` - data-classicy-appearance on the story frame
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.appearancePackage.test.ts` - create: reducer tests
- `src/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations.appearancePackage.test.ts` - create: migration tests
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.appearance.test.tsx` - create: root attribute tests

## Work Log

### 2026-10-29T13:40:53.972Z - Done on feat/appearance-part-b, c3ec154b2..c2da6d1c7: 1eb8a47fd packageId in the store, ChangeAppearancePackage (logged no-op for unregistered ids, untrusted floor), outermost migrateAppearancePackage (label 2.3), LoadThemes package default, resolved id on #classicyDesktop and the Storybook StoryFrame (R6), asset registry follows the store (R2), registry split into store-free ClassicyAppearancePackageRegistry.ts for load order, ClassicyThemeSchema.package landed early; c2da6d1c7 review round 1 (package schema requires defaults.package === id, asset package source moved to an internal non-barrel module, AGENT-REFERENCE §5, stronger load-order test). Review APPROVED (0 critical/important); reviewer smoke-loaded the dist ESM bundle in jsdom. Gate: lint, tsc, 325 files / 3811 tests, build:source + verify:dist green. Parity: 302/302 AE 0, forced 67/67 identical, computed 0 non-noise diffs (html +36 = the attribute).
