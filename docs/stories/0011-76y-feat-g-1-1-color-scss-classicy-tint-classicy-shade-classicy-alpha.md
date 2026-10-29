---
id: 0011-76y
title: 'G 1.1: _color.scss: classicy-tint, classicy-shade, classicy-alpha'
purpose: Add the three package-neutral `color-mix` helpers every Classicy stylesheet uses instead of literal colors, pinned by a compiled-CSS test.
type: feat
status: complete
priority: "2"
effort: S
created: "2026-10-28T19:53:21.572Z"
updated: "2026-10-29T16:32:42.269Z"
started: "2026-10-29T16:19:32.492Z"
completed: "2026-10-29T16:32:42.269Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/vocabulary/_color.scss
      - src/Appearance/vocabulary/ClassicyColorHelpers.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0010-f28", "depends"]
  plans:
    - ["0004-vqt", "included", ["1.1"]]
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

# G 1.1: _color.scss: classicy-tint, classicy-shade, classicy-alpha

## Problem Statement

Audit §8.7 / D10 and umbrella 0002-ldj (colors and numbers): `getThemeVars` emits one variable per color token; tint, shade and opacity variants come from SCSS helpers in `src/Appearance/vocabulary/_color.scss` so a component never needs a literal. `classicy-tint($token, $pct)` → `color-mix(in srgb, var(#{$token}), white #{$pct})`, `classicy-shade` → `… black …`, `classicy-alpha` → `color-mix(in srgb, var(#{$token}) #{$pct}, transparent)`; `$token` is the full custom-property name string (`"--color-system-01"`). `color-mix()` is emitted verbatim (baseline since 2023).

This story depends on Part A only for the `src/Appearance/vocabulary/` directory; if it is absent, create it with `_color.scss` alone.

**Impact:** G 1.2 replaces every literal color with these helpers; parts B and H consume them as `classicy/scss/color`.

## Steps

### 1: Write the failing compiled-CSS test

`src/Appearance/vocabulary/ClassicyColorHelpers.test.ts`: `const css = sass.compileString(`@use "color" as c; .t { a: c.classicy-tint("--color-error", 80%); b: c.classicy-shade("--color-system-04", 10%); d: c.classicy-alpha("--color-black", 50%); }`, { loadPaths: [path.resolve(process.cwd(), "src/Appearance/vocabulary")], style: "expanded" }).css;` then `it("classicy-tint mixes toward white")` (`css` toContain `"a: color-mix(in srgb, var(--color-error), white 80%);"`); `it("classicy-shade mixes toward black")` (`"b: color-mix(in srgb, var(--color-system-04), black 10%);"`); `it("classicy-alpha mixes with transparent")` (`"d: color-mix(in srgb, var(--color-black) 50%, transparent);"`); `it("rejects a token that is not a custom-property name")` (`sass.compileString(`@use "color" as c; .t { a: c.classicy-tint(red, 10%); }`, …)` toThrow `/custom-property name/`).

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts` — Expected: FAIL — `Can't find stylesheet to import` (color).

### 3: Implement src/Appearance/vocabulary/_color.scss

`@use "sass:meta"; @function classicy-token($token) { @if meta.type-of($token) != string or not str-index($token, "--") == 1 { @error "classicy color helpers take a custom-property name string such as \"--color-system-01\", got #{$token}"; } @return $token; } @function classicy-tint($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}), white #{$pct}); } @function classicy-shade($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}), black #{$pct}); } @function classicy-alpha($token, $pct) { @return color-mix(in srgb, var(#{classicy-token($token)}) #{$pct}, transparent); }` — four functions, header comment citing audit §8.7 and D10; no mixins, no literals.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts` — Expected: PASS (4).

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance/vocabulary && git commit -m "feat(scss): classicy-tint, classicy-shade and classicy-alpha color helpers"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts
- [x] `classicy-tint("--color-error", 80%)` compiles to `color-mix(in srgb, var(--color-error), white 80%)`, `classicy-shade("--color-system-04", 10%)` to `color-mix(in srgb, var(--color-system-04), black 10%)`, `classicy-alpha("--color-black", 50%)` to `color-mix(in srgb, var(--color-black) 50%, transparent)`.
- [x] A non-string or non-`--` token is a Sass compile error mentioning `custom-property name`.

## Files

- `src/Appearance/vocabulary/_color.scss` - create: classicy-token, classicy-tint, classicy-shade, classicy-alpha
- `src/Appearance/vocabulary/ClassicyColorHelpers.test.ts` - create: compiled-CSS test

## Work Log

### 2026-10-29T16:32:18.392Z - Done on feat/appearance-part-g (branched from Part B tip 7343d5f51, runs beside B per ruling G11): 08b34b126 adds src/Appearance/vocabulary/_color.scss (classicy-token/tint/shade/alpha) and 7 compiled-CSS tests. Ruling G10 applied: the plan's `not str-index(...) == 1` guard never fired (bare "color-error" compiled to the invalid var(color-error)) and warned about deprecated globals; the guard is `string.index(...) != 1` via sass:string, with tests for a bare name, no warnings and no emitted CSS. Gate: lint, tsc, 329 files / 3903 tests, build:source + verify:dist green. Controller reviewed the diff directly (two new files, ~95 lines) and re-ran the suite: 7/7.

### 2026-10-29T16:32:41.307Z - Completed ahead of its `depends` story 0010-f28 (G 0 parity baseline) by controller decision: ruling G11 runs G's code-only sections before Part B lands, and the Phase 0 baseline is deferred to after B by design. This section has no visual effect (it adds an unused helper module), so it needs no parity baseline; the forced status change skips only the dependency check.
