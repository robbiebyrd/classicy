---
id: 0011-76y
title: 'G 1.1: _color.scss: classicy-tint, classicy-shade, classicy-alpha'
purpose: Add the three package-neutral `color-mix` helpers every Classicy stylesheet uses instead of literal colors, pinned by a compiled-CSS test.
type: feat
status: in_progress
priority: "2"
effort: S
created: "2026-10-28T19:53:21.572Z"
updated: "2026-10-29T16:19:32.492Z"
started: "2026-10-29T16:19:32.492Z"
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
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
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

- [ ] VERIFY: pnpm exec vitest run src/Appearance/vocabulary/ClassicyColorHelpers.test.ts
- [ ] `classicy-tint("--color-error", 80%)` compiles to `color-mix(in srgb, var(--color-error), white 80%)`, `classicy-shade("--color-system-04", 10%)` to `color-mix(in srgb, var(--color-system-04), black 10%)`, `classicy-alpha("--color-black", 50%)` to `color-mix(in srgb, var(--color-black) 50%, transparent)`.
- [ ] A non-string or non-`--` token is a Sass compile error mentioning `custom-property name`.

## Files

- `src/Appearance/vocabulary/_color.scss` - create: classicy-token, classicy-tint, classicy-shade, classicy-alpha
- `src/Appearance/vocabulary/ClassicyColorHelpers.test.ts` - create: compiled-CSS test

## Work Log
