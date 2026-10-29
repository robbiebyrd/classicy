---
id: 0025-xns
title: 'C 6.1: Registry docs, example app, parity after'
purpose: Document the asset registries, drop the example's obsolete fonts import, and prove Platinum is pixel-identical with the after-shoot and the full gate.
type: chor
status: in_progress
priority: "2"
effort: S
created: "2026-10-28T20:04:33.061Z"
updated: "2026-10-29T00:20:35.331Z"
started: "2026-10-29T00:20:35.252Z"
links:
  repo:
    local: ~/classicy
    files:
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - example/src/app.tsx
      - .playwright-mcp/parity/part-C/after
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0024-ktc", "depends"]
  plans:
    - ["0007-1sl", "included", ["6.1"]]
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

# C 6.1: Registry docs, example app, parity after

## Problem Statement

Plan 0007-1sl's last section closes Part C: `docs/AGENT-REFERENCE.md` §5 still documents the shallow-merging `registerClassicyIcons` and the alias-badge override through `system.alias`; `CLAUDE.md:169` says the same; `example/src/app.tsx:4` still imports the now no-op `classicy/fonts`. Umbrella 0002-ldj requires every part to end pixel-identical for Platinum, proven by re-shooting the Phase 0 story set and comparing with ImageMagick `compare -metric AE`.

This story rewrites §5 as "Asset registries" (kinds, wrapper signatures, deep-merge semantics, read-side rule, `useClassicyAssetTree`, the `--classicy-cursor-<role>` and `--classicy-art-<key>` variables, the four unregistered keys), points `CLAUDE.md` at `ClassicyAssetRegistry.ts` and `platinumAssets.ts`, removes the example import, re-shoots the 18 titles into `after/`, and runs the full gate including `pnpm build:source`. The plan has no separate final-verification phase; that gate lives here.

**Impact:** Without the after-shoot and gate, a regression from any of C 2.1 through C 5.1 (a wrong icon, a font that failed to load, a moved badge) ships undetected, and consumers keep following docs that describe the wiped-namespace behavior.

## Steps

### 1: Write the docs and remove the example's fonts import

`docs/AGENT-REFERENCE.md:725-747` §5 becomes "Asset registries": the five kinds, `registerClassicyAssets`/`registerClassicyIcons`/`registerClassicyCursors`/`registerClassicyWallpapers`/`registerClassicyFonts`/`registerClassicySystemArt` signatures, deep-merge semantics (the alias-badge example now `registerClassicySystemArt("platinum", { aliasBadge })`), the read-side rule (`useClassicyAsset` in components, `resolveClassicyAsset` elsewhere, never a module-scope capture), `useClassicyAssetTree`, the CSS variables `--classicy-cursor-<role>` and `--classicy-art-<key>` with the role and key lists, and the four keys Platinum leaves unregistered. `CLAUDE.md:169` alias sentence → `registerClassicySystemArt("<package>", { aliasBadge })`; the Theming section gains one paragraph pointing at `src/Appearance/ClassicyAssetRegistry.ts` and `src/Appearance/Platinum/assets/platinumAssets.ts`. Remove `import "classicy/fonts"` from `example/src/app.tsx:4`. Then `grep -rn "classicy/fonts" example storybook docs CLAUDE.md` shows only the deprecation note in AGENT-REFERENCE.

### 2: Shoot the parity set after

`pnpm storybook`; shoot the same ids from `stories.txt` into `.playwright-mcp/parity/part-C/after/`; then `cd .playwright-mcp/parity/part-C && for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected: `0` on every line. Any non-zero: inspect both images; fix the code (never the screenshot); a font-rendering difference means a face failed to load — check the `<style id="classicy-fonts-platinum">` URLs in the Storybook iframe.

### 3: Full gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` — Expected: all PASS; record test and story counts in the commit body.

### 4: Commit

git add docs CLAUDE.md example/src/app.tsx && git commit -m "docs(appearance): asset registries, system art keys and cursor roles" (with the trailer). Stop the Storybook server.

## Acceptance Criteria

- [ ] VERIFY: ls .playwright-mcp/parity/part-C/after/*.png | wc -l  # equals before; compare loop prints 0 for every story
- [ ] [MANUAL] Every `compare -metric AE before/<id>.png after/<id>.png` prints 0 for all 18-title parity stories; any non-zero was fixed in code, not in the screenshot.
- [ ] `docs/AGENT-REFERENCE.md` §5 documents the registries, deep merge, the read-side rule and the `--classicy-cursor-*`/`--classicy-art-*` variables; `CLAUDE.md` names `ClassicyAssetRegistry.ts` and `platinumAssets.ts`; `grep -rn "classicy/fonts" example storybook docs CLAUDE.md` shows only the deprecation note.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source

## Files

- `docs/AGENT-REFERENCE.md` - :725-747 §5 rewritten as Asset registries
- `CLAUDE.md` - :160-170 alias sentence and Theming paragraph
- `example/src/app.tsx` - :4 classicy/fonts import removed
- `.playwright-mcp/parity/part-C/after` - after screenshots (gitignored)

## Work Log

### 2026-10-29T00:20:35.331Z - Implementation dispatched; includes the example-app cursor check owed by 0022-cbh criterion 4
