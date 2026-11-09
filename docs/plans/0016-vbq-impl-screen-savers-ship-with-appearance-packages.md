---
id: 0016-vbq
title: Screen savers ship with Appearance Packages
type: impl
status: pending
priority: "2"
effort: L
created: "2026-11-09T19:24:12.927Z"
updated: "2026-11-09T19:25:06.539Z"
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
    - docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md
progress:
  "1":
    status: pending
  "1.1":
    status: pending
    stories:
      - 0161-hch
  "1.2":
    status: pending
    stories:
      - 0162-mk7
  "1.3":
    status: pending
    stories:
      - 0163-l8n
  "2":
    status: pending
  "2.1":
    status: pending
    stories:
      - 0166-z4u
  "2.2":
    status: pending
    stories:
      - 0164-l2e
  "3":
    status: pending
  "3.1":
    status: pending
    stories:
      - 0165-z8i
  "4":
    status: pending
---

# Screen savers ship with Appearance Packages

## Summary

**Goal:** The core keeps the screen saver mechanism and ships no saver; Platinum ships the twelve savers, and the control panel and overlay offer only the active package's savers.

**Problem:** Since 3.0.0 every piece of Platinum's look lives in @classicy/appearance-platinum except the screen savers: the twelve After Dark ports, their art and the Logo saver's logos ship in the core, which registers them itself (ClassicyScreenSaver.tsx imports savers/ClassicyScreenSaverBuiltIns).

**Approach:** Add `packages?: string[]` to a saver and `defaultScreenSaver?: string` to a package, resolve the offered list and the effective saver store-free from the active package, then move the savers, art, styles and logo registry into Platinum. Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md.

---

# Part 1 — Design

## Current State

`registerClassicyScreenSaver` stores savers in one global Map with no package. The overlay draws `getClassicyScreenSaver(data.selectedSaver)`, the control panel defaults to the core constant `SCREEN_SAVER_DEFAULT_SAVER_ID = "bouncing-ball"`, and `src/index.ts` exports all twelve savers, `ClassicyScreenSaverBuiltIns` and the logo registry. The core bundles zod, and `ClassicySchemaForm`, `ClassicySchemaFormFields` and `ClassicyScreenSaverConfigForm` identify fields with `instanceof z.Zod*`.

## Decisions

- **Owner: savers come from the Appearance Package; only the active package's savers are offered (no fallback to another package); a saver names one or more packages, none means every package; each package names a default; the stored choice is never overwritten; ship as a 3.x minor.** — Approved design, 2026-11-09.
- **The schema form identifies zod fields by `def.type`, not `instanceof`.** — Platinum's saver schemas are built by a second zod copy in a real install; instanceof would fail and seven options forms would render empty while source-aliased tests pass.
- **Saver styles join Platinum's one package stylesheet, outside the `classicy-package()` scope mixin.** — Platinum's build has a single CSS path; no new file, injection API or dist entry. A test pins that no saver style sets `animation-play-state` or `cursor`, since the package layer now beats the overlay's base rules.
- **Re-registering a saver id replaces it, `packages` included; `ClassicyScreenSaverLogoDefinition.src` widens to `string | (() => string)`; with no offered stored choice and no offered default, the first offered saver in registration order is used; SetSaver/SetConfig accept a registered saver that is not offered.** — The calls recorded in the spec after the builder check.

---

# Part 2 — Implementation

## Constraints

- Release is a 3.x minor: no commit message may contain BREAKING CHANGE (push.yml bumps the major on it); use `feat:` for the user-facing commits. The breaking export move goes only in docs/RELEASE-NOTES-3.1.md.
- Platinum imports the core only as `@classicy/classicy` (PlatinumSourceImports.test.ts); every core name a moved saver uses must be a public export of the core.
- Persisted state keeps its shape and bytes (`selectedSaver`, `saverConfigs`, `enabled`, `timeoutMinutes`); no migration.
- The core neither imports, bundles nor names a saver, its art or a Platinum saver id (`bouncing-ball`, `berkeley-systems`, …) outside tests.
- Repo rules: diagnostics through `classicyLog`, never console; no `!important`; no bare `Npx` or literal color in SCSS (the saver exemptions move with the savers); assets read at render; American English; barrels are generated (never hand-edit index.ts barrels).
- Never `git stash`, `git checkout -- <path>`, `git restore`, or `rm` outside a `mktemp -d` scratch directory; work only in the plan's worktree; never switch the owner's ~/classicy checkout.

## Phase 1: Core mechanism

### 1.1: Schema form identifies zod fields by definition type

**Files:**
- Modify: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.tsx`
- Modify: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields.ts`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm.tsx`
- Test: `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.foreignZod.test.tsx`

**Depends on:** none

**Interfaces:**
- Produces: `classicyZodType(schema: unknown): string | undefined` exported from ClassicySchemaFormFields.ts (reads `schema._zod?.def?.type ?? schema.def?.type`); `unwrapClassicySchemaField` and every field branch use it instead of `instanceof`.

- [ ] **Step 1: Write the failing test** — `renders every field of a schema built by another zod instance`: build `z.looseObject({ speed: z.number().min(1).max(10).default(5), trails: z.boolean().default(true), color: z.enum(["red","blue"]).default("red"), label: z.string().optional() })` with a zod module instance that is not the core's (import it through a distinct module id, e.g. `vi.importActual` of a re-export file under `src/__tests__/` with `vi.resetModules()`, or another route that makes `instanceof` against the core's `z` false; assert that precondition first), render `ClassicySchemaForm` and `ClassicyScreenSaverConfigForm` for a saver using it, and expect a slider, checkbox, pop-up and text field. Same test with the core's zod stays green.
- [ ] **Step 2: Confirm it fails** — Expected: the foreign-schema case renders no fields. — `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.foreignZod.test.tsx`
- [ ] **Step 3: Implement `classicyZodType` and replace every `instanceof z.Zod*` in the three files**
- [ ] **Step 4: Confirm it passes, with the existing SchemaForm, Options-tab and config-form tests** — `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 5: Commit** — `git commit -m "fix(schema-form): identify zod fields by definition type, not instanceof"`

### 1.2: Savers name packages; packages name a default; offered resolution

**Files:**
- Create: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.ts`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry.tsx`
- Modify: `src/Appearance/ClassicyAppearancePackage.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageSchema.ts`
- Modify: `src/Appearance/ClassicyAppearancePackageRegistry.ts`
- Test: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.test.ts`

**Depends on:** none

**Interfaces:**
- Produces: `ClassicyScreenSaverDefinition.packages?: readonly string[]`; `ClassicyAppearancePackage.defaultScreenSaver?: string` (schema: optional non-empty string). In ClassicyScreenSaverOffer.ts, all store-free: `isClassicyScreenSaverOffered(saver, packageId: string): boolean` (no `packages` or empty → true); `listClassicyScreenSaversFor(packageId: string): ClassicyScreenSaverDefinition[]` (offered, sorted by name like `listClassicyScreenSavers`); `resolveClassicyScreenSaverFor(packageId: string, selectedSaver?: string): ClassicyScreenSaverDefinition | undefined` (stored choice if offered, else the package's `defaultScreenSaver` if offered, else the first offered saver in registration order, else undefined); `activeClassicyScreenSaverPackageId(state?: ClassicyStore): string` (the resolved package id, via `getRegisteredClassicyAppearancePackageOrDefault(state.System.Manager.Appearance.packageId)?.id ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`). The registry gains a subscription (`subscribeClassicyScreenSavers`, `useClassicyScreenSavers`) if one does not exist, so UIs follow late registrations.

- [ ] **Step 1: Write the failing tests** — With fake savers and fake packages (`resetClassicyAppearancePackagesForTests`): `a saver naming no packages is offered under every package`; `a saver naming ["a"] is offered only under "a"`; `the stored choice wins when offered`; `the package default stands in when the stored choice belongs to another package, and the stored value is untouched`; `the first offered saver in registration order is used when neither is offered`; `a package offering none resolves to undefined`; `re-registering an id replaces its packages`; `a package whose defaultScreenSaver is unregistered logs one classicyLog warning and still registers`.
- [ ] **Step 2: Confirm they fail** — `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer.test.ts`
- [ ] **Step 3: Implement the fields, schema entry, warning and ClassicyScreenSaverOffer.ts** — The warning is logged once per package id at `registerClassicyAppearancePackage` when `defaultScreenSaver` is set and no saver with that id is registered or offered under it (savers register before their package, as Platinum's assets do).
- [ ] **Step 4: Confirm they pass, with the package-registry and schema suites** — `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/Appearance`
- [ ] **Step 5: Commit** — `git commit -m "feat(screen-saver): savers name the packages they are offered under"`

### 1.3: Overlay, reducer, control panel and Control Strip follow the active package

**Files:**
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.tsx`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext.tsx`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule.ts`
- Modify: `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.tsx`
- Test: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.test.tsx`
- Test: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext.test.tsx`
- Test: `src/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager.test.tsx`

**Depends on:** 1.2

**Interfaces:**
- Consumes: 1.2's `listClassicyScreenSaversFor`, `resolveClassicyScreenSaverFor`, `activeClassicyScreenSaverPackageId`.
- Produces: `SCREEN_SAVER_DEFAULT_SAVER_ID` removed. The overlay draws `resolveClassicyScreenSaverFor(activeId, data.selectedSaver)`. `ClassicyAppScreenSaverActivate` (and the idle timer) does nothing when that resolves to undefined. `SetSaver`/`SetConfig` accept any registered id (offered or not) and still refuse unregistered ids. The control panel lists `listClassicyScreenSaversFor(activeId)`, shows the resolved saver as selected, and with none offered shows a short message in place of the list (e.g. "This appearance has no screen savers.") with Sleep Now disabled; the Control Strip module's activate item is disabled likewise.

- [ ] **Step 1: Write the failing tests** — Using fake savers (not the built-ins): `the overlay draws the active package's default when the stored choice belongs to another package`; `the stored selectedSaver is unchanged after a package switch and back`; `idle and Activate never show the overlay when no saver is offered`; `SetSaver stores a registered saver another package offers`; `the control panel lists only offered savers and shows the empty message with none`; `the Control Strip's activate item is disabled with none offered`. Existing tests that relied on the built-ins switch to fakes registered in the test.
- [ ] **Step 2: Confirm they fail** — `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels/ScreenSaverManager`
- [ ] **Step 3: Implement; remove SCREEN_SAVER_DEFAULT_SAVER_ID and its readers**
- [ ] **Step 4: Confirm they pass** — `pnpm exec vitest run src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels src/SystemFolder/SystemResources/ControlStrip`
- [ ] **Step 5: Commit** — `git commit -m "feat(screen-saver): overlay and control panel offer the active package's savers"`

## Phase 2: Platinum ships the savers

### 2.1: Move the savers, art, styles and logo registry into Platinum

**Files:**
- Create: `packages/appearance/platinum/src/screenSavers/ (the twelve saver folders, ClassicyScreenSaverBuiltIns renamed platinumScreenSavers.ts, the logo registry)`
- Create: `packages/appearance/platinum/src/styles/_screenSavers.scss`
- Modify: `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.tsx`
- Modify: `src/index.ts (regenerated barrel)`
- Modify: `package.json (sideEffects)`
- Modify: `packages/appearance/platinum/src/index.ts`
- Modify: `packages/appearance/platinum/src/styles/platinum.scss`
- Modify: `packages/appearance/platinum/package.json`
- Modify: `storybook/.storybook/main.ts`
- Modify: `storybook/tsconfig.json`
- Delete: `src/SystemFolder/Extensions/ScreenSaver/savers/`
- Test: `packages/appearance/platinum/src/screenSavers/platinumScreenSavers.test.tsx`
- Test: `packages/appearance/platinum/src/screenSavers/platinumScreenSaverStyles.test.ts`
- Test: `src/ClassicyCoreImportGraph.test.ts`

**Depends on:** 1.3

**Interfaces:**
- Consumes: 1.2's `packages` field; the core's public exports (registerClassicyScreenSaver, ClassicySpinner, ClassicyPopUpMenu, resolveClassicyAsset, …).
- Produces: `@classicy/appearance-platinum` exports every saver component, schema and options component under its current name, plus `registerClassicyScreenSaverLogo`, `unregisterClassicyScreenSaverLogo`, `getClassicyScreenSaverLogo`, `listClassicyScreenSaverLogos`, `useClassicyScreenSaverLogos`, `resolveClassicyScreenSaverLogo`, `CLASSICY_SCREEN_SAVER_LOGO_IDS`, `CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID`, `ClassicyScreenSaverLogoDefinition` (`src: string | (() => string)`, resolved when the Logo saver draws). Every Platinum saver registers with `packages: ["platinum"]` before the package registers; the package declares `defaultScreenSaver: "bouncing-ball"`. Platinum's package.json gains `zod` at the core's range and the saver/logo registration modules in `sideEffects`.

- [ ] **Step 1: Write the failing tests** — `Platinum registers the twelve savers under platinum, with bouncing-ball as its default`; `the three built-in logos resolve, the classicy and startup-screen logos at draw time`; `no saver style sets animation-play-state or cursor` (scan the compiled `_screenSavers.scss` rules); in the core: `nothing src/index.ts reaches names a saver module, its art or a Platinum saver id` (extend ClassicyCoreImportGraph.test.ts).
- [ ] **Step 2: Confirm they fail** — `pnpm exec vitest run src/ClassicyCoreImportGraph.test.ts && pnpm --filter @classicy/appearance-platinum exec vitest run src/screenSavers`
- [ ] **Step 3: Move with `git mv`, rewrite `@/…` imports to `@classicy/classicy`, register in Platinum, move saver styles into `_screenSavers.scss` (included by platinum.scss outside the scope mixin), remove the core's BuiltIns import and saver sideEffects, regenerate barrels (`pnpm build:source` runs generate-barrels), move the saver stories next to the savers and widen Storybook's stories glob and tsconfig include**
- [ ] **Step 4: Confirm they pass, plus both packages' suites** — `pnpm test --maxWorkers=3`
- [ ] **Step 5: Commit** — `git commit -m "feat(platinum): Platinum ships the screen savers"`

### 2.2: Gates and dist checks follow the savers

**Files:**
- Modify: `bin/check-pixel-literals.ts`
- Modify: `bin/classicyLiteralColorSweep.ts`
- Modify: `src/Appearance/vocabulary/ClassicyVocabulary.test.ts`
- Modify: `packages/appearance/platinum/bin/verify-dist.mjs`
- Modify: `packages/appearance/platinum/bin/verify-dist.test.ts`
- Modify: `bin/check-dist-imports.mjs`
- Test: `packages/appearance/platinum/bin/verify-dist.test.ts`
- Test: `bin/checkDistImports.test.ts`

**Depends on:** 2.1

- [ ] **Step 1: Write the failing tests** — verify-dist: `dist/assets must hold each saver image, byte-identical` and `a missing saver image fails`; core dist check: `a saver image or a classicySaver keyframe in the core's dist fails`.
- [ ] **Step 2: Confirm they fail** — `pnpm exec vitest run bin packages/appearance/platinum/bin`
- [ ] **Step 3: Implement: move the savers/ path exemptions to Platinum's new path (pixel gate, color sweep, vocabulary test); list the saver art in Platinum's verify-dist; add the core dist invariant**
- [ ] **Step 4: Confirm the gates pass on the real build** — `pnpm lint && node bin/classicyLiteralColorSweep.ts && pnpm build:source`
- [ ] **Step 5: Commit** — `git commit -m "chore(gates): saver exemptions and dist checks follow the savers to Platinum"`

## Phase 3: Docs and release notes

### 3.1: Document the move

**Files:**
- Create: `docs/RELEASE-NOTES-3.1.md`
- Modify: `CLAUDE.md`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `README.md`
- Modify: `docs/BUILDING-APPS.md`

**Depends on:** 2.2

- [ ] **Step 1: Write the docs** — CLAUDE.md's Screen Saver section (core mechanism; Platinum ships the savers; `packages`, `defaultScreenSaver`, the resolution order; saver styles in the package layer and the reduced-motion/pointer guarantee as it now stands; logo registry in Platinum); AGENT-REFERENCE §8 and the screen saver API; README upgrade link; RELEASE-NOTES-3.1.md: the saver exports moved to @classicy/appearance-platinum (breaking for a host importing one; migration is the import specifier), `packages`, `defaultScreenSaver`, `src` widening, and how to offer a Platinum saver under another package. American English.
- [ ] **Step 2: Check doc tests and lint** — `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts`
- [ ] **Step 3: Commit** — `git commit -m "docs: screen savers ship with Appearance Packages"`

## Phase 4: Verification

- [ ] Full gate green: pnpm lint, tsc, storybook:typecheck, vocabulary --check, color sweep, pnpm test, build:source (both verify:dist, verify:host-types), build:storybook, example build.
- [ ] Parity: the Screen Saver control panel and each saver's story match 3.0.0 (parity:shoot / parity:compare, AE 0).
- [ ] Example production build (core dist bundles its zod, Platinum's dist imports zod: two copies): the Screen Saver panel lists twelve savers, Bouncing Ball selected by default, and Fish's derived options form shows its fields.
- [ ] A stored selectedSaver from 3.0.0 renders the same saver; persisted bytes unchanged.

**Validation:** `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Acceptance Criteria

- [ ] The core's entry reaches no saver, saver art, saver style or Platinum saver id; its dist holds none.
- [ ] Platinum registers the twelve savers under `platinum` with `bouncing-ball` as its default; its dist holds their art byte-identical.
- [ ] Only the active package's savers are offered; a saver naming no packages is offered under every package; the stored choice is never overwritten and the package default stands in.
- [ ] A package with no savers shows the empty panel and never activates.
- [ ] A saver schema from a second zod copy renders its options form.
- [ ] Platinum users see no visual or stored-state change; full gate and parity green.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Core keeps the mechanism, no saver | 2.1, 2.2 |
| Platinum ships the twelve savers and logos | 2.1 |
| Savers follow the active package; none-named means every package | 1.2, 1.3 |
| Each package names its default; stored choice never overwritten | 1.2, 1.3 |
| No-saver package supported | 1.3 |
| Two zod copies | 1.1, 4 |
| Release notes and docs, 3.x minor | 3.1, constraints |
| Platinum users see no change | 4 |
**Residual risk:** Review focus (inputs no section's tests pin by default, each given a test above): (1) a second zod copy in a packed install — 1.1 and the example production check; (2) a stored selectedSaver of another package after a switch and back — 1.3; (3) the reduced-motion pause and hidden pointer with saver rules now in the package layer — 2.1's style test and the overlay tests; (4) a host saver with no packages under a non-Platinum package — 1.2; (5) a Logo saver drawing after a package switch resolves the logo image then, not at registration — 2.1.
