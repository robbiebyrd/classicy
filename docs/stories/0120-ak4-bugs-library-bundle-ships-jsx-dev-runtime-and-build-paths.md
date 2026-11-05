---
id: 0120-ak4
title: The library bundle ships React's JSX dev runtime and 1,117 absolute build-machine paths
purpose: 'Publish a production JSX build: smaller, no dev-only checks, and no leaked build paths.'
type: bugs
status: pending
priority: "2"
effort: S
created: "2026-11-05T19:53:37.405Z"
updated: "2026-11-05T19:53:37.405Z"
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
      - vite.config.ts
      - package.json
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# The library bundle ships React's JSX dev runtime and 1,117 absolute build-machine paths

## Problem Statement

`dist/classicy.es.js` (and the UMD bundle) import `react/jsx-dev-runtime` and call `jsxDEV(…)` with a source location for every element: 1,117 `fileName: "/home/robbiebyrd/classicy/…/src/…tsx"` objects in a 10.9 MB bundle (found 2026-11-05 while comparing 0117's and 0118's builds, which differed only by the worktree directory in those paths). A published build made by CI would embed the runner's paths the same way.

The likely cause is that `vite build` runs the React plugin in development mode for the library (NODE_ENV not `production` at transform time, or `mode`/`define` settings in `vite.config.ts`). Not yet confirmed; check whether the published 2.1.8 tarball on npm has the same `jsxDEV` calls.

**Impact:** Consumers ship React's development JSX path in production (extra checks, larger bundle), every published build exposes the build machine's directory layout, and two builds of identical source are not byte-identical when built from different directories, which weakens every dist comparison.

## Steps

### 1: Failing check

Add a `verify:dist` invariant (in `bin/check-dist-imports.mjs`) that fails when a bundle imports `react/jsx-dev-runtime`, calls `jsxDEV`, or contains an absolute path from the build machine (`process.cwd()` or `/home/`, `/Users/`, `C:\\`). Run it on the current build to see it fail.

### 2: Find and fix the cause

Confirm why the library build uses the dev runtime (check `vite.config.ts` mode/define/esbuild `jsxDev`, the React plugin options, and the env CI's `pnpm build:source` runs in), and fix it so `vite build` uses `react/jsx-runtime`. Check the published classicy@2.1.8 tarball to know whether released versions are affected and say so in the release note if they are.

### 3: Gate and parity

Run the full gate; take Storybook parity against the current baseline (AE 0, since production JSX must not change rendering); record the bundle size before and after.

## Acceptance Criteria

- [ ] VERIFY: `grep -c jsxDEV dist/classicy.es.js` is 0, no bundle imports `react/jsx-dev-runtime`, and the new verify:dist invariant passes.
- [ ] VERIFY: Two builds of the same commit from different directories produce byte-identical `dist/`.
- [ ] VERIFY: Full gate green, and parity AE 0 for every story.

## Files

- `vite.config.ts` - production JSX for the library build
- `bin/check-dist-imports.mjs` - the new invariant

## Work Log
