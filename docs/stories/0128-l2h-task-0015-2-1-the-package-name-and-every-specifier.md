---
id: 0128-l2h
title: '0015 §2.1: The package name and every specifier'
purpose: Execute plan 0015-kxa section 2.1.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:45.536Z"
updated: "2026-11-05T21:32:51.358Z"
started: "2026-11-05T20:25:59.629Z"
completed: "2026-11-05T21:32:51.358Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
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

# 0015 §2.1: The package name and every specifier

## Problem Statement

Plan 0015-kxa section 2.1 (Rename the core to @classicy/classicy): The package name and every specifier. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Root `package.json` `name: "@classicy/classicy"`, `publishConfig: { access: "public" }`; every import and Sass `pkg:` specifier uses `@classicy/classicy` and `@classicy/classicy/…`; `example/` depends on `"@classicy/classicy": "workspace:*"` (scripts `use:local`/`use:published` renamed to match).

## Steps

### 1: Write the failing tests

`ClassicyPackageExports.test.ts`: `pkg.name === "@classicy/classicy"`, `pkg.publishConfig.access === "public"`; the Sass `pkg:@classicy/classicy/scss/layout` specifier resolves through `example/`; `git grep -nE 'from "classicy["/]|pkg:classicy/|"classicy": "workspace' -- . ':!docs/plans' ':!docs/stories' ':!pnpm-lock.yaml'` returns nothing (as a test over tracked files, with a short allowlist for historical release-note text). Anti-goal pin: the test also asserts `vite.config.ts` `build.lib.name` stays `"classicy"` and file names stay `classicy.${f}.js`, and a store test asserts the localStorage key stays `classicyDesktopState`.

### 2: Rename

`package.json`, `example/` (package.json, the 8 imports in 7 files, `Browser.scss:1`, `example/vite.config.ts:23,28` aliases), `vitest.config.ts`'s `classicy` alias → `@classicy/classicy`; docs: README (18 `classicy/…` + 2 bare + install lines), AGENT-REFERENCE (49 + 22, install line :29), BUILDING-APPS (8), CLAUDE.md (9), release notes (18; old-version history text may keep `classicy` where it describes 2.x). Never touch `robbiebyrd/classicy`, dist file names, ids, class names, storage keys or `Classicy*` identifiers.

### 3: Refresh the lockfile without losing `libc:` fields

Same method as 0118: run the install with full metadata and confirm the `libc:` count is unchanged. Command: `pnpm install --config.minimum-release-age=10080 && grep -c 'libc:' pnpm-lock.yaml`

### 4: Run the gate

Run the gate Command: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 5: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "refactor!: publish the core as @classicy/classicy"`

## Acceptance Criteria

- [x] VERIFY: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && node bin/generate-vocabulary.ts --check && node bin/classicyLiteralColorSweep.ts && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build` passes.
- [x] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `package.json` - modify
- `example/package.json` - modify
- `example/vite.config.ts` - modify
- `example/src/app.tsx` - modify
- `example/src/Applications/Browser/BrowserContext.ts` - modify
- `example/src/Applications/Browser/Browser.tsx` - modify
- `example/src/Applications/Browser/Browser.scss` - modify
- `example/src/Applications/Demo/Demo.tsx` - modify
- `example/src/Applications/DemoExtension/DemoExtension.tsx` - modify
- `example/src/Applications/BlueBox/BlueBox.tsx` - modify
- `example/src/Applications/HyperCardPlugins/HyperCardPluginsDemo.tsx` - modify
- `vitest.config.ts` - modify
- `src/Appearance/ClassicyPackageExports.test.ts` - modify
- `README.md` - modify
- `docs/AGENT-REFERENCE.md` - modify
- `docs/BUILDING-APPS.md` - modify
- `CLAUDE.md` - modify
- `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md` - modify
- `pnpm-lock.yaml` - modify

## Work Log

### 2026-11-05T21:32:48.824Z - Landed 2026-11-05 as 5b55b1ef0..aca0ba39e on feat/AppearancePackages (pushed): root package.json name @classicy/classicy with publishConfig.access public; example/ dependency, 8 imports, Browser.scss and vite aliases; vitest alias; doc specifiers and install lines (README, AGENT-REFERENCE, BUILDING-APPS, CLAUDE.md, release notes, Welcome.mdx); lockfile one line (importer key), libc 63. Tests pin the name, publishConfig, exports keys, UMD name "classicy" and the classicy.${format}.js file names, plus a tracked-file scan for leftover specifiers (vi.mock targets and unquoted YAML keys added after review). Review: one important (three vi.mock("classicy") in BUILDING-APPS) and one minor (ci.yml comment), both fixed in aca0ba39e. Landing gate: 458 files / 6267 tests, build:source + verify:dist, build:storybook, example build, exit 0.
