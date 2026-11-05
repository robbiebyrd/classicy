---
id: 0135-t73
title: '0015 §4.2: Docs, release notes and the program record'
purpose: Execute plan 0015-kxa section 4.2.
type: task
status: ready
priority: "1"
effort: M
created: "2026-11-05T19:55:08.260Z"
updated: "2026-11-05T20:26:51.012Z"
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
    - ["0130-rpe", "depends"]
    - ["0132-jsg", "depends"]
    - ["0133-uqg", "depends"]
    - ["0134-8cy", "depends"]
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

# 0015 §4.2: Docs, release notes and the program record

## Problem Statement

Plan 0015-kxa section 4.2 (Release, docs and final verification): Docs, release notes and the program record. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** Docs true to the new layout; release-note breaking-change entries (each with its migration step) for: the rename; the explicit Platinum import; the stop screen; removed exports (`PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks`, `platinumSoundPack`, `classicy/appearance/platinum`, `classicy/appearance/platinum/scss/*`, the old wallpaper helpers) with their replacements; removed icon paths (from 3.3); the moved strict-CSP stylesheets (`@classicy/classicy/dist/classicy.css`, `@classicy/appearance-platinum/classicy-platinum.css`, `…/classicy-platinum.fonts.css`, in that order); the second `optimizeDeps.exclude`; persisted wallpapers stored by filename. The release note's new entries need the owner's approval like the rest of it.

## Steps

### 1: README and AGENT-REFERENCE

Install line `pnpm add @classicy/classicy @classicy/appearance-platinum`; the import; the stop screen; strict-CSP links in both specifier and `node_modules/…/dist/…` form; SCSS exports; Vite `optimizeDeps.exclude: ["@classicy/classicy", "@classicy/appearance-platinum"]`; AGENT-REFERENCE §8 (packages, knob floor, wallpapers, `icon`), §1 (CSP, cascade).

### 2: CLAUDE.md

Project Overview, Common Commands (`pnpm --filter @classicy/appearance-platinum …`), the Theming section ("importing classicy registers Platinum", "the Platinum floor", D14 sentences), Build Notes (two builds, `verify:dist` invariants, `resources/` location, the lint gates' scan roots).

### 3: Release notes

The entries listed in Produces, in the note's existing voice; a summary line at the top: 3.0.0, two packages.

### 4: Program record

Plan 0002-ldj body: a dated amendment line under the Shared Contract stating that D14 ("Platinum is always present") is superseded by plan 0014-ahm.

### 5: Lint and the doc-pinning tests

Lint and the doc-pinning tests Command: `pnpm lint && pnpm exec vitest run src/Appearance/ClassicyPackageExports.test.ts src/Appearance/ClassicyCoreTheme.test.ts`

### 6: Commit

Conventional commit(s) ending with the session trailers; confirm the branch and `git diff --cached` first. Command: `git commit -m "docs: two packages, @classicy/classicy and @classicy/appearance-platinum"`

## Acceptance Criteria

- [ ] VERIFY: `pnpm lint` passes.
- [ ] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `README.md` - modify
- `docs/AGENT-REFERENCE.md` - modify
- `docs/BUILDING-APPS.md` - modify
- `CLAUDE.md` - modify
- `docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md` - modify
- `packages/appearance/platinum/README.md` - modify
- `docs/plans/0002-ldj-dsgn-appearance-packages-program.md` - modify (body edit only)

## Work Log
