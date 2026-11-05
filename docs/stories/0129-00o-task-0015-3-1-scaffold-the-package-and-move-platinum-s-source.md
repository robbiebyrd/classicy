---
id: 0129-00o
title: '0015 §3.1: Scaffold the package and move Platinum''s source'
purpose: Execute plan 0015-kxa section 3.1.
type: task
status: pending
priority: "1"
effort: M
created: "2026-11-05T19:54:48.766Z"
updated: "2026-11-05T20:16:31.478Z"
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
    - ["0127-qvl", "depends"]
    - ["0128-l2h", "depends"]
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
  "6":
    status: pending
---

# 0015 §3.1: Scaffold the package and move Platinum's source

## Problem Statement

Plan 0015-kxa section 3.1 (Extract Platinum into packages/appearance/platinum): Scaffold the package and move Platinum's source. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Workspace member `@classicy/appearance-platinum` at `packages/appearance/platinum` (`version` = the root's; `type: "module"`; `peerDependencies: { "@classicy/classicy": "workspace:^", react, react-dom }`; `devDependencies: { "@classicy/classicy": "workspace:*" }`; `publishConfig.access: "public"`; `files: ["dist", "src/styles", "README.md", "LICENSE"]` plus an `.npmignore`-equivalent rule that keeps tests out; `sideEffects: ["./dist/*.js", "./src/index.ts", "**/*.css", "**/*.scss"]`). Source at `packages/appearance/platinum/src/` with the same tree as today (`index.ts`, `hooks.ts`, `platinum.json`, `styles/`, `assets/`). Every TS import of core code is `from "@classicy/classicy"`; SCSS `@use` of the vocabulary is `pkg:@classicy/classicy/scss/<module>`.

## Steps

### 1: Move with history

`pnpm-workspace.yaml` gains `'packages/*/*'`; remove the empty untracked `packages/appearance/platinum/`; then `git mv src/Appearance/Platinum packages/appearance/platinum/src`.

### 2: Write the package's own config

`vite.config.ts` in library mode: entry `src/index.ts`, formats `es` and `umd`, `name: "classicyAppearancePlatinum"`, `fileName: f => \`appearance-platinum.${f}.js\``, `external` = `@classicy/classicy` (and its subpaths), `react`, `react-dom`, `react/jsx-runtime`; UMD `globals: { "@classicy/classicy": "classicy", react: "React", "react-dom": "ReactDOM" }`. `vitest.config.ts` aliases `@classicy/classicy` → `../../../src/index.ts` and uses the root `src/__tests__/setup.ts`. `tsconfig.json` extends the root's settings with `paths` for `@classicy/classicy` → the root `src/index.ts`.

### 3: Rewrite imports

`@/…` → `@classicy/classicy`; `@snd/…`/`@img/…` stay until 3.3; SCSS `../../../vocabulary/*` → `pkg:@classicy/classicy/scss/*` (Sass `NodePackageImporter`, as the example already uses).

### 4: Make the package's tests pass in place

The 15 tests that moved with the folder run under the package's vitest config; path expressions inside them (`cursorArrow.test.ts:8`, `platinumArt.test.ts:12`, `platinumPixelArt.test.ts:20`, `platinumAssets.importGraph.test.ts:104-122`, `pixelLiterals.test.ts:14-15`, `platinum.css.test.ts:8`) point at the new paths. Command: `pnpm --filter @classicy/appearance-platinum exec vitest run`

### 5: Review focus: one registry, not two

Add a package test that builds the ES bundle, imports it next to the core's built bundle in one module graph, and asserts the core's `listClassicyAppearancePackages()` sees Platinum (the anti-goal "two copies of the registries"); also assert the built `appearance-platinum.es.js` contains no copy of `registerClassicyAppearancePackage`'s implementation (only an import).

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor(platinum): move Platinum into packages/appearance/platinum"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm --filter @classicy/appearance-platinum exec vitest run && pnpm --filter @classicy/appearance-platinum exec vite build` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `packages/appearance/platinum/package.json` - create
- `packages/appearance/platinum/tsconfig.json` - create
- `packages/appearance/platinum/vite.config.ts` - create
- `packages/appearance/platinum/vitest.config.ts` - create
- `packages/appearance/platinum/README.md` - create
- `packages/appearance/platinum/LICENSE` - create
- `pnpm-workspace.yaml` - modify
- `package.json` - modify
- `src/index.ts` - modify (only if a symbol Platinum needs is not yet exported)
- `src/Appearance/Platinum/` - delete (moved with git mv to packages/appearance/platinum/src/)

## Work Log
