---
id: 0118-qm6
title: 'Override minimatch 9.x and 10.x to 11 to close Dependabot #344'
purpose: Fix the minimatch globParts amplification advisory instead of carrying a dismissal, now that it no longer covers minimatch 3.
type: chor
status: blocked
priority: "2"
effort: S
created: "2026-11-05T16:41:17.674Z"
updated: "2026-11-06T15:33:21.834Z"
started: "2026-11-05T18:27:00.095Z"
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
      - package.json
      - pnpm-lock.yaml
      - docs/DEPENDENCY-OVERRIDES.md
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# Override minimatch 9.x and 10.x to 11 to close Dependabot #344

## Problem Statement

Dependabot #344 (GHSA-g3hv-75wg-m249, moderate, development scope) is GitHub's reissue of the withdrawn #343. It was dismissed on 2026-11-05 as tolerable risk under the owner's 2026-11-04 approval, because the fix exists only in the minimatch 11.x major and, as first published, the advisory also covered minimatch 3.x, which eslint 9 needs and which cannot move to 11 (eslint calls the CommonJS default export that 11 drops).

The reissued advisory's range is `>= 7.0.0, < 11.0.1`, so 3.x is no longer affected. The vulnerable copies are 9.0.9 (`vite-plugin-dts` > `@vue/language-core`) and 10.2.3 / 10.2.5 (`@microsoft/api-extractor`, `glob` 13, `nodemon`, `@typescript-eslint/typescript-estree`). An override of those to `^11.0.1` would close the alert outright. If the ESLint retirement story lands first, the typescript-estree consumer is gone.

**Impact:** The alert stays dismissed rather than fixed, and a future, reachable minimatch advisory in the same range would be easier to overlook.

## Steps

### 1: Check the consumers against 11

Read minimatch 11's breaking changes and each consumer's call sites (`glob`, `nodemon`, `api-extractor`, `@vue/language-core`, typescript-estree if still present) for anything 11 removed.

### 2: Override and verify

Add `pnpm.overrides` entries scoped to the 9.x and 10.x ranges (for example `"minimatch@>=7 <11.0.1": "^11.0.1"`), leaving 3.x untouched; record the reason in `docs/DEPENDENCY-OVERRIDES.md`; run `pnpm install`, then the full gate, and check that `dist/` is byte-identical (minimatch is build-time only).

### 3: Confirm on main

After the change reaches main, confirm #344's advisory no longer matches the lockfile (Dependabot marks it fixed, or it can be reopened and auto-closes).

## Acceptance Criteria

- [x] VERIFY: `grep -E "^  minimatch@(9|10)\." pnpm-lock.yaml` finds nothing, and `pnpm install --frozen-lockfile` passes.
- [x] VERIFY: Full gate green, including `pnpm build:source` (api-extractor runs inside vite-plugin-dts) and `pnpm build:storybook`; `dist/` byte-identical to before.
- [ ] [MANUAL] On main, Dependabot shows no open or dismissed-but-applicable alert for GHSA-g3hv-75wg-m249.

## Files

- `package.json` - `pnpm.overrides` entry for minimatch 9/10 to 11
- `pnpm-lock.yaml` - resolved minimatch versions
- `docs/DEPENDENCY-OVERRIDES.md` - reason for the override

## Work Log

### 2026-11-05T18:26:26.226Z - Scheduled 2026-11-05 (owner: start both now), worktree fu-0118 from 713e98242, in parallel with 0117-qjd; lands after 0117, so the override is re-verified against 0117's lockfile at landing.

### 2026-11-05T19:53:19.768Z - Landed 2026-11-05 as aa2fd5f0d..6761d05aa on feat/AppearancePackages (pushed), rebased onto 0117 by the controller (lockfile regenerated per commit with --config.minimum-release-age=10080, 63 libc fields kept; the 0117/0118 doc sections merged; the minimatch row's ESLint-era consumers dropped). Overrides: `minimatch@>=7.0.0 <11.0.1` → ^11.0.1 and `glob@>=13.0.0 <14.0.3` → ^14.0.3 (glob 13 bundled its own vulnerable minimatch). Lockfile: minimatch 11.0.3 only, glob 14.0.3. Review: no blockers; four doc-wording fixes applied. Landing gate at the tip: 458 files / 6259 tests, build:source + verify:dist, build:storybook, example build, exit 0; dist byte-identical to 0117's tip build once the worktree path is normalized (the only difference is the JSX dev runtime's embedded absolute fileName, a separate defect filed as its own story). Remaining: criterion 3 (Dependabot #344 closes on main) after PR 333 merges. Known residue: Storybook 10.6.x bundles glob 10.5.0 + minimatch 9.0.5 (no override reaches it; dev-only, our own story globs), recorded in docs/DEPENDENCY-OVERRIDES.md.

### 2026-11-06T15:33:21.834Z - 2026-11-06: set to blocked (owner). Waiting on PR 333 merging to main: Dependabot scans main only, which still shows 36 open alerts. Unblock after the merge, re-check alerts, tick the last criterion and complete.
