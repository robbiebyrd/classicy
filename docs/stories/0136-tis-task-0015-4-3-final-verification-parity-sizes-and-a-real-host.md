---
id: 0136-tis
title: '0015 §4.3: Final verification: parity, sizes, and a real host'
purpose: Execute plan 0015-kxa section 4.3.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:55:11.304Z"
updated: "2026-11-05T19:55:11.304Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0135-t73", "depends"]
  plans:
    - ["0015-kxa", "included"]
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

# 0015 §4.3: Final verification: parity, sizes, and a real host

## Problem Statement

Plan 0015-kxa section 4.3 (Release, docs and final verification): Final verification: parity, sizes, and a real host. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

## Steps

### 1: Parity

Rebuild and compare every story (t=0 and `--mid`) and the four example screens against 0.1: AE 0 everywhere. Any difference is a bug in this plan's work. Same recipe as 0.1 (`bin/parity/README.md` § "Baseline, after set, compare"), shooting into `$P/after`, then `pnpm parity:compare $P/before $P/after` (the `@mid` shots are compared too).

### 2: Sizes

Report both packages' bundle and `dist/` sizes against 0.1, and grep the core bundles for `data:audio`, wallpaper `data:image`, `woff2` and `@layer classicy.package`: none.

### 3: A real host, both ways (review focus: strict CSP and bundler)

Create a minimal Vite + React app in the scratchpad, install the two `pnpm pack` tarballs, `optimizeDeps.exclude` both: (a) with only `@classicy/classicy` imported, `vite build` succeeds and the page shows the stop screen; (b) adding `import "@classicy/appearance-platinum"` shows the desktop, plays the boot chime (Playwright: a `Howl` load succeeds, no 404 for a sprite, font or wallpaper URL); (c) a strict-CSP variant that disallows inline `<style>` and links the three stylesheets renders the same desktop.

### 4: Full gate

Full gate Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 5: Report

Write the results to the story's work log: parity counts, sizes before/after, the three host runs, and the gate's test totals.

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `bin/standalone-host/` - create (a throwaway Vite app under the scratchpad, not committed)

## Work Log
