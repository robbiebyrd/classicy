---
id: 0086-u2p
title: Storybook type-check clean and in CI; dist/types excludes the root configs
purpose: Make every story type-check under a strict Storybook tsconfig, run that check in CI, and stop the package shipping declarations for vite.config.ts and vitest.config.ts.
type: chor
status: in_progress
priority: "2"
effort: S
created: "2026-10-30T01:47:52.512Z"
updated: "2026-10-30T03:10:51.297Z"
started: "2026-10-30T01:50:13.770Z"
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
      - storybook/tsconfig.json
      - bin/classicyDistTypes.ts
      - .github/workflows/ci.yml
      - CLAUDE.md
  plans:
    - ["0005-1b3", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# Storybook type-check clean and in CI; dist/types excludes the root configs

## Problem Statement

Two tooling gaps were found during the Part J final review (2026-10-30). Both had been deferred as "known" instead of being fixed.

1. **Stories are never type-checked.** The root tsconfig excludes `*.stories.tsx`. `storybook/tsconfig.json` includes them, but:
   - it is not `strict`, so discriminated-union narrowing (`if (!result.ok) result.error`) fails;
   - files under `../src` cannot resolve `@storybook/react-vite`, which lives only in `storybook/node_modules`;
   - `npx tsc --noEmit -p storybook/tsconfig.json` reports 197 errors;
   - CI never runs this check.
2. **dist/types ships the root build configs.** `CLASSICY_DTS_EXCLUDE` (`bin/classicyDistTypes.ts`) excludes `bin/**` but not the root `vite.config.ts` and `vitest.config.ts`, so `dist/types` holds their `.d.ts`. verify:dist reports "none for … build script" anyway, because its build-script check only matches `bin/`.

**Impact:** A story with a type error ships to Storybook and the docs unnoticed. The npm tarball carries declarations for internal build configs, and the dist check that should catch that passes.

## Steps

### 1: dist/types excludes the root configs, and verify:dist catches them

Add the root config files (`vite.config.ts`, `vitest.config.ts`, any root `*.config.ts`) to `CLASSICY_DTS_EXCLUDE`. Widen the build-script declaration check so a root `*.config.d.ts` fails verify:dist, and add a unit test that pins both.

### 2: Storybook tsconfig resolves Storybook and is strict

Map `@storybook/*` to the storybook workspace's node_modules (or the equivalent `paths`/`typeRoots` fix) and set `"strict": true`, matching the root tsconfig. Then fix every reported error in the stories and in `.storybook/`, typing them properly, with no `any` or `@ts-expect-error` unless a comment justifies it.

### 3: CI runs the Storybook type-check

Add a `storybook:typecheck` script and run it in `.github/workflows/ci.yml` beside lint, tsc and test. Document it in CLAUDE.md's CI paragraph.

## Acceptance Criteria

- [ ] VERIFY: npx tsc --noEmit -p storybook/tsconfig.json  # exit 0, no errors
- [ ] VERIFY: pnpm build:source && test -z "$(ls dist/types/*.config.d.ts 2>/dev/null)"
- [ ] CI runs the Storybook type-check, and CLAUDE.md lists it.

## Files

- `storybook/tsconfig.json` - Storybook module mapping; strict
- `bin/classicyDistTypes.ts` - exclude the root configs; detect them in verify:dist
- `.github/workflows/ci.yml` - Storybook type-check step
- `CLAUDE.md` - CI paragraph

## Work Log

### 2026-10-30T03:10:51.297Z - Tooling branch fix/tooling-typecheck at 701489841: root configs excluded from dist/types with a verify:dist guard (80ae8a34f); strict storybook tsconfig 192 -> 0 errors, *.png typed as string (e841ef4db); storybook:typecheck CI step (549b8d3b0); jsdom media stubs, 96 -> 0 noise lines (fb998bc18); verify:dist exact art set (701489841). Gate green: 4031/4031. Two leftovers sent back for fixing: dist/types/package.json.d.ts and 6 remaining jsdom canvas/navigation lines.
