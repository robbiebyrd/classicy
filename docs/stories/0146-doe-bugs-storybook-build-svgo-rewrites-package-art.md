---
id: 0146-doe
title: Storybook's build runs svgo over Appearance Package art, so the static Storybook and the parity baseline draw altered art
purpose: The published Storybook and the parity baseline show package art exactly as authored, as the library does.
type: bugs
status: ready
priority: "2"
effort: S
created: "2026-11-06T03:39:09.727Z"
updated: "2026-11-06T03:39:15.201Z"
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
      - storybook/.storybook/main.ts
      - vite.config.ts
      - bin/parity/README.md
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Storybook's build runs svgo over Appearance Package art, so the static Storybook and the parity baseline draw altered art

## Problem Statement

Found by 0140-mid (2026-11-06). `VitePluginImageTools` in `storybook/.storybook/main.ts:54` has no `excludes`, unlike `vite.config.ts` (`excludes: /src\/Appearance\//`, so package assets ship as authored and `verify:dist` fails on an altered SVG). `storybook build` therefore runs svgo over Platinum's art: `resizer.svg` (the window grow-box grip) goes from `<rect>`s to `<path>`s and rasterizes differently, AE 69 in a 10x10 box on every window story. `storybook dev` serves the authored file, so dev is the faithful rendering; the static build (published as demo.classicy.ing/storybook) and the `platinum-split/before` parity baseline, shot from it, carry the svgo'd grip. The npm library is unaffected.

**Impact:** The published Storybook draws slightly different art from what hosts ship, and parity compares between dev and static disagree.

## Steps

### 1: Failing check

A test that `storybook/.storybook/main.ts`'s image plugin excludes package assets the way `vite.config.ts` does (same pattern, or a shared constant), and after `pnpm build:storybook` every SVG under `storybook-static` that comes from a package's `assets/art` is byte-identical to its source.

### 2: Exclude and rebaseline

Share the exclude pattern between both configs (Phase 3 moves Platinum's art to `packages/appearance/platinum`, so cover that path too). Then shoot the current tip from the static build, confirm against the existing baseline that only the grip box changes (AE 69 at the same 10x10 box, nothing else), and adopt that shoot as the new baseline in a new directory, recording the swap in the work log. Update `bin/parity/README.md`: dev and static then agree.

## Acceptance Criteria

- [ ] VERIFY: After `pnpm build:storybook`, package art in `storybook-static` is byte-identical to its sources, and a dev-server shoot and a static shoot of `desktop-window--default` are AE 0 against each other.
- [ ] VERIFY: The rebaseline differs from the old baseline only in the grip box, and the full gate is green.

## Files

- `storybook/.storybook/main.ts` - exclude package art from svgo, as vite.config.ts does

## Work Log
