---
id: 0117-qjd
title: 'Retire ESLint: Biome as the one linter, Oxlint evaluated for the React Compiler rules'
purpose: Drop the unused ESLint toolchain and its dependency tree, and decide how the React Compiler lint rules get covered without it.
type: chor
status: complete
priority: "2"
effort: M
created: "2026-11-05T16:41:14.617Z"
updated: "2026-11-05T19:31:21.651Z"
started: "2026-11-05T18:26:52.826Z"
completed: "2026-11-05T19:31:21.651Z"
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
      - eslint.config.js
      - example/eslint.config.js
      - package.json
      - example/package.json
      - biome.json
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# Retire ESLint: Biome as the one linter, Oxlint evaluated for the React Compiler rules

## Problem Statement

Classicy lints with Biome (`pnpm lint` = `biome check .` plus the pixel-literal gate; CI runs only that), but the root and `example/` still carry a full ESLint 9 toolchain: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` 7 and `eslint-plugin-react-refresh`, with an `eslint.config.js` in each. Nothing runs the root config: no CI job, hook or script. `example/`'s `lint` script runs `eslint .` and reports 0 findings.

Measured 2026-11-05: Biome checks 933 files in about 2 s with no findings, and its React domain is active (`useExhaustiveDependencies` and `useHookAtTopLevel` enforce; 24 `biome-ignore` suppressions exist for the former). Root ESLint takes 33 s over `src/` and reports 223 findings Biome does not: 168 in library source, 55 in tests and stories. The 24 `rules-of-hooks` hits are all false positives (Storybook `render` functions and the Control Strip's function-form hook fields). The rules with no Biome 2.5 equivalent are the React Compiler ones from react-hooks 7: `refs` (31), `set-state-in-effect` (26), `immutability` (7), `purity` (3), `preserve-manual-memoization` (3), `globals` (2), `incompatible-library` (1), plus `react-refresh/only-export-components` (37; Biome's `useComponentExportOnlyModules` is off and would report 113).

Candidates for that coverage: Oxlint implements the React Compiler rules natively as experimental `react/*` rules (off by default) and can also load `eslint-plugin-react-hooks` as a JS plugin; newer Biome lists a nursery `useReactCompiler` rule (not in 2.5.0).

**Impact:** Two linters' worth of devDependencies (including minimatch 3/10 behind Dependabot alert #344) and two configs that disagree, one of which nobody runs, so its 223 findings are invisible. Removing ESLint without a replacement loses the React Compiler checks for good.

## Steps

### 1: Decide the React Compiler coverage

Run Oxlint with the react plugin and the React Compiler categories enabled (and, separately, a Biome release that ships `useReactCompiler`) over `src/`; compare findings, false positives and run time against `eslint src` with react-hooks 7. Record the comparison in the work log and get the owner's pick: Oxlint beside Biome, Biome nursery, or no React Compiler lint.

### 2: Remove ESLint

Delete both `eslint.config.js` files and the ESLint devDependencies from the root and `example/` package.json; point `example/`'s `lint` script at Biome (the root `biome check .` already covers `example/`). Turn the 6 files' 7 `eslint-disable` comments into the chosen linter's suppressions or delete them (2 are already unused).

### 3: Add the chosen React Compiler linter

If the owner picked Oxlint: add it as a devDependency with an `.oxlintrc.json` that enables only the React Compiler rules (Biome keeps everything else), wire it into `pnpm lint` and CI, and either fix or suppress-with-reason each library-source finding. If Biome nursery: upgrade Biome and enable the rule the same way.

### 4: Update the docs

CLAUDE.md (Common Commands, CI paragraph) and any README or AGENT-REFERENCE mention of ESLint.

## Acceptance Criteria

- [x] [MANUAL] The owner has chosen the React Compiler coverage from the recorded comparison.
- [x] VERIFY: `git ls-files | grep -i eslint` lists nothing, and `pnpm why eslint` finds no package in the workspace.
- [x] VERIFY: `pnpm lint` (and the chosen React Compiler linter, if separate) passes and runs in CI.
- [x] VERIFY: Full gate green: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`.

## Files

- `eslint.config.js` - deleted
- `example/eslint.config.js` - deleted
- `package.json` - ESLint devDependencies removed; the React Compiler linter added if chosen
- `example/package.json` - ESLint devDependencies removed; `lint` runs Biome
- `CLAUDE.md` - linter and CI description

## Work Log

### 2026-11-05T16:42:11.762Z - Step 1 comparison, 2026-11-05 (owner asked to explore Biome/Oxlint): Oxlint 1.91.0 (pnpm dlx, lockfile untouched) with only the react plugin's React Compiler rules plus react-hooks and only-export-components enabled ran over src/ in ~2 s vs eslint's 33 s, and matched eslint-plugin-react-hooks 7 closely: refs 31/31, set-state-in-effect 26/26, globals 2/2, incompatible-library 1/1, immutability 10 vs 7, purity 5 vs 3, preserve-manual-memoization 2 vs 3, only-export-components 41 vs 37, rules-of-hooks 24 vs 24 (the same Storybook-render / function-form-hook false positives), exhaustive-deps 47 vs 39 (Biome already enforces its own exhaustive-deps, so Oxlint's should stay off). Biome 2.5.0 has no React Compiler rule (`nursery/useReactCompiler` does not exist in it). Controller recommendation: Biome stays the linter and formatter; Oxlint runs beside it with only the React Compiler rules (+ only-export-components optionally), and the ~70 library-source findings are triaged as their own step. Awaiting the owner's pick.

### 2026-11-05T18:26:25.183Z - Owner decision 2026-11-05: Biome only; the React Compiler rules (refs, set-state-in-effect, immutability, purity, preserve-manual-memoization, globals, incompatible-library) and react-refresh/only-export-components are dropped, no Oxlint. Step 3 is therefore not applicable. Scheduled now (owner: start both 0117 and 0118), worktree fu-0117 from 713e98242; 0117 lands before 0118.

### 2026-11-05T19:31:19.552Z - Landed 2026-11-05 as 784a5c6de..fca12e541 on feat/AppearancePackages (pushed): root eslint.config.js and all ESLint devDependencies removed from root and example/ (82 lockfile packages, removals only; minimatch 3 and typescript-estree gone), example/ lint = `biome check .` (uses root biome.json), 7 eslint-disable comments deleted (comment text only, verified by diff), the brace-expansion@<1.1.18 override that only ESLint's minimatch 3 needed removed. Review: no findings >= 70. Landing gate at the tip: lint, tsc, storybook:typecheck, vocabulary --check, color sweep, 458 test files / 6259 tests, build:source + verify:dist, build:storybook, example build, all exit 0. Criterion 2: `pnpm why -r eslint` is empty and no ESLint file is tracked; the only `git ls-files | grep -i eslint` hit is this story's own filename. The one gate flake seen in the implementer's first run (bin/gitClearStaleLock.test.ts) is a real script bug, filed as 0119-o08.
