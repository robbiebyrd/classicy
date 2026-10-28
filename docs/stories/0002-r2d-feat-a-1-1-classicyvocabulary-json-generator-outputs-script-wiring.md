---
id: 0002-r2d
title: 'A 1.1: ClassicyVocabulary.json, generator, outputs, script wiring'
purpose: Generate the shared JS/SCSS vocabulary (state classes, component names, part attributes) from one JSON source wired into the build.
type: feat
status: complete
priority: "2"
effort: M
created: "2026-10-28T19:46:47.320Z"
updated: "2026-10-28T23:36:18.550Z"
started: "2026-10-28T23:32:52.063Z"
completed: "2026-10-28T23:36:18.550Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/vocabulary/ClassicyVocabulary.json
      - bin/generate-vocabulary.ts
      - src/Appearance/vocabulary/ClassicyVocabulary.ts
      - src/Appearance/vocabulary/_vocabulary.scss
      - package.json
      - tsconfig.json
      - bin/generate-vocabulary.test.ts
      - src/Appearance/vocabulary/ClassicyVocabulary.test.ts
      - .github/workflows/ci.yml
      - src/index.ts
      - example/src/Applications/BlueBox/BlueBox.scss
      - example/src/Applications/Browser/Browser.scss
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0001-cay", "depends"]
  plans:
    - ["0003-7x7", "included", ["1.1"]]
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
  "7":
    status: complete
---

# A 1.1: ClassicyVocabulary.json, generator, outputs, script wiring

## Problem Statement

Audit §2.8 / §8.6 and umbrella 0002-ldj (vocabulary names): JS and CSS need one source of truth for the 15 bare shared state classes, the `classicy<Component>` root names and the part attributes. This story adds `src/Appearance/vocabulary/ClassicyVocabulary.json` (hand-edited) and `bin/generate-vocabulary.ts`, which writes `ClassicyVocabulary.ts` (`CLASSICY_STATE`, `ClassicyState`, `classicyStateClasses`, `CLASSICY_COMPONENT`, `ClassicyComponentName`, `CLASSICY_PART_ATTRIBUTE`) and `_vocabulary.scss` (`$classicy-states`, `classicy-state()`), run by `generate-barrels` before barrelsby and gated in CI with `--check`. The generator rejects a state that collides with any root or part class.

Node 24 (`mise.toml`, CI `node-version: '24.x'`) runs `.ts` natively, so the generator uses erasable syntax only. The `./scss/*` export is re-pointed to the vocabulary directory with a temporary `./scss-platinum/*` bridge for the example app (deleted by part B).

**Impact:** Every later Part A story (and Part G's `_color.scss`) imports from `src/Appearance/vocabulary/`; without the generator there is no `classicyStateClasses` to emit and no `classicy-state()` for packages to target.

## Steps

### 1: Write the failing generator tests

`bin/generate-vocabulary.test.ts`: `describe("generateVocabulary")` with `it("emits CLASSICY_STATE with every state as key and value")` (input `{ components: { Button: [] }, states: ["pressed", "disabled"], attributes: { "data-classicy-control": [], "data-classicy-role": [], "data-classicy-part": [] } }` → `ts` contains `pressed: "pressed"`, `export type ClassicyState = keyof typeof CLASSICY_STATE`, `Button: "Button"`, and starts with `// generated — do not edit`); `it("emits $classicy-states and classicy-state()")` (`scss` contains `$classicy-states: (pressed, disabled);` and `@function classicy-state($name)`); `it("rejects a state that equals a root or part class")` (`validateVocabulary({ components: { Button: ["Pressed"] }, states: ["classicybuttonpressed"], … })` → `["state \"classicybuttonpressed\" collides with part class classicyButtonPressed"]`; `{ components: { Pressed: [] }, states: ["classicypressed"] }` → `["state \"classicypressed\" collides with root class classicyPressed"]`); `it("rejects duplicate and malformed state names")` (`["open","open"]` → `["duplicate state \"open\""]`; `["Open"]` → `["state \"Open\" must match /^[a-z][a-z0-9-]*$/"]`); `it("is deterministic")` (`generateVocabulary(x)` toEqual itself). `src/Appearance/vocabulary/ClassicyVocabulary.test.ts`: `it("CLASSICY_STATE has the 15 contract states")` (`Object.keys(CLASSICY_STATE)` toEqual `["active","inactive","disabled","selected","pressed","focused","hover","collapsed","open","dragging","error","default","checked","mixed","expanded"]`); `it("CLASSICY_STATE.pressed === 'pressed'")`; `it("classicyStateClasses joins truthy states in vocabulary order")` (`classicyStateClasses({ pressed: true, disabled: false, active: true })` toBe `"active pressed"`); `it("classicyStateClasses returns '' for no states")`; `it("CLASSICY_COMPONENT contains Window, Button, Alert, DesktopMenuBar")`; `it("the committed outputs are fresh")` (`generateVocabulary(json).ts` toBe `readFileSync(tsPath, "utf8")`, same for scss).

### 2: Run them to verify they fail

`pnpm exec vitest run bin/generate-vocabulary.test.ts src/Appearance/vocabulary/ClassicyVocabulary.test.ts` — Expected: FAIL — `Cannot find module './generate-vocabulary'` / `@/Appearance/vocabulary/ClassicyVocabulary`.

### 3: Write ClassicyVocabulary.json and implement bin/generate-vocabulary.ts

JSON shape `{ components: Record<PascalCase, string[]>, states: string[], attributes: Record<'data-classicy-control'|'data-classicy-role'|'data-classicy-part', string[]> }`; build `components` from `grep -rhoE '"classicy[A-Z][A-Za-z]+' src --include=*.tsx | sort -u`, hand-grouped (root = the exported component's own class, parts = the rest, e.g. `Window: ["TitleBar","Title","TitleText","TitleLeft","TitleCenter","TitleRight","ControlBox","CloseBox","ZoomBox","CollapseBox","Header","Contents","ContentsInner","Resizer","PlacardBar","ModalScrim"]`); states = the 15 contract names; attributes: control `["close","zoom","collapse"]`, role `["default","cancel","other"]`, part `["apple","app","help","switcher","extensions","clock"]`. Generator exports `generateVocabulary(input: VocabularyInput): { ts: string; scss: string }` (pure) and `validateVocabulary(input: VocabularyInput): string[]`; CLI main guarded by `if (process.argv[1]?.endsWith('generate-vocabulary.ts'))`, `--check` exits 1 when either output on disk differs. Generated TS: `export const CLASSICY_STATE = { active: "active", … } as const; export type ClassicyState = keyof typeof CLASSICY_STATE; export const classicyStateClasses = (states: Partial<Record<ClassicyState, boolean>>): string => (Object.keys(CLASSICY_STATE) as ClassicyState[]).filter((s) => states[s]).join(" "); export const CLASSICY_COMPONENT = { Button: "Button", … } as const; export type ClassicyComponentName = keyof typeof CLASSICY_COMPONENT; export const CLASSICY_PART_ATTRIBUTE = { control: "data-classicy-control", role: "data-classicy-role", part: "data-classicy-part" } as const;`. Generated SCSS: `$classicy-states: (active, inactive, …);` and `@function classicy-state($name) { @if not list.index($classicy-states, $name) { @error "classicy-state: unknown state #{$name}"; } @return ".#{$name}"; }` with `@use "sass:list"`. Both start with `// generated — do not edit (bin/generate-vocabulary.ts)`. Emit Biome-clean text (tabs, double quotes) directly; do not run biome inside the generator. Erasable TS syntax only (no enums, no parameter properties, `import type`).

### 4: Wire the script and regenerate

package.json: `"generate-barrels": "node bin/generate-vocabulary.ts && barrelsby -c .ts-barrel.json"`; `"exports"["./scss/*"] = "./src/Appearance/vocabulary/*"`; add `"./scss-platinum/*": "./src/SystemFolder/ControlPanels/AppearanceManager/styles/*"` and switch `example/src/Applications/{BlueBox,Browser}/*.scss:1` to `@use 'classicy/scss-platinum/appearance'` (part B deletes the bridge); `files` gains `"src/Appearance/vocabulary"`. Then `node bin/generate-vocabulary.ts && pnpm exec barrelsby -c .ts-barrel.json && git status --short` — Expected: the two generated files appear, `src/index.ts` gains `export * from "./Appearance/vocabulary/ClassicyVocabulary";`; running the command twice produces no further diff.

### 5: Run tests to verify they pass

`pnpm exec vitest run bin src/Appearance` — Expected: PASS (both files).

### 6: Add the staleness gate to CI

In `.github/workflows/ci.yml` add a step after install: `node bin/generate-vocabulary.ts --check`. Verify locally: add a state to the JSON, run `--check` → exit 1; revert.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance bin/generate-vocabulary.ts bin/generate-vocabulary.test.ts package.json .github/workflows/ci.yml src/index.ts example && git commit -m "feat(vocabulary): generate ClassicyVocabulary.ts and _vocabulary.scss from one JSON"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [x] VERIFY: node bin/generate-vocabulary.ts --check && pnpm exec vitest run bin src/Appearance
- [x] `CLASSICY_STATE.pressed === "pressed"`, `classicyStateClasses({ pressed: true, active: true }) === "active pressed"`, and `classicy-state(bogus)` errors at Sass compile time.
- [x] `validateVocabulary` rejects a state equal to any root or part class, duplicates and malformed names; both generated files start with `// generated — do not edit`.
- [x] `package.json` `./scss/*` points at `./src/Appearance/vocabulary/*`; `generate-barrels` runs the generator first; CI runs `--check`.

## Files

- `src/Appearance/vocabulary/ClassicyVocabulary.json` - create: hand-edited source (components, states, attributes)
- `bin/generate-vocabulary.ts` - create: validate + generate + CLI with --check
- `src/Appearance/vocabulary/ClassicyVocabulary.ts` - create (generated)
- `src/Appearance/vocabulary/_vocabulary.scss` - create (generated)
- `bin/generate-vocabulary.test.ts` - create: generator tests
- `src/Appearance/vocabulary/ClassicyVocabulary.test.ts` - create: pins the generated API
- `package.json` - generate-barrels wiring, ./scss/* and ./scss-platinum/* exports, files
- `tsconfig.json` - only if bin/ is outside include
- `.github/workflows/ci.yml` - add --check step
- `src/index.ts` - regenerated barrel
- `example/src/Applications/BlueBox/BlueBox.scss` - @use classicy/scss-platinum/appearance
- `example/src/Applications/Browser/Browser.scss` - @use classicy/scss-platinum/appearance

## Work Log

### 2026-10-28T23:35:30.122Z - Completed: commits e9625ee..4d7029c, task review clean
