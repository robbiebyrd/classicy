---
id: 0103-8ge
title: 'Strict-CSP hosts lost the Platinum fonts: ship dist/classicy-platinum.fonts.css'
purpose: Give strict-CSP hosts a static stylesheet for the Platinum fonts.
type: bugs
status: complete
priority: "2"
effort: S
created: "2026-11-05T00:57:31.667Z"
updated: "2026-11-05T01:03:54.391Z"
started: "2026-11-05T00:57:39.326Z"
completed: "2026-11-05T00:57:56.863Z"
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
      - bin/classicyFontStylesheet.ts
      - CLAUDE.md
      - docs/AGENT-REFERENCE.md
  stories:
    - ["0091-dxg", "included"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Strict-CSP hosts lost the Platinum fonts: ship dist/classicy-platinum.fonts.css

## Problem Statement

The 0091-dxg release-note review (Important #3) found a product regression: since `classicy/dist/fonts.css` was removed, the Platinum fonts are registered only by a runtime `<style id="classicy-fonts-platinum">`, which a strict CSP blocks, so strict-CSP hosts lost the fonts.

**Impact:** Hosts with a strict Content Security Policy render without the Platinum faces.

## Steps

### 1: Implement

Emit `dist/classicy-platinum.fonts.css` (unlayered `@font-face` rules from the runtime's own face list and rule writer, urls relative to dist), add verify:dist invariant 12, a CSP Playwright proof and docs plus a release-note item.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] A strict-CSP host linking classicy.css, classicy-platinum.css and classicy-platinum.fonts.css gets every Platinum face, and verify:dist invariant 12 checks each face points at its own file in dist/assets/.
- [x] VERIFY: pnpm build:source

## Files

- `vite.config.ts`
- `bin/classicyFontStylesheet.ts`
- `CLAUDE.md`
- `docs/AGENT-REFERENCE.md`

## Work Log

### 2026-11-05T00:57:41.565Z - Controller ruling 2026-11-04 (0091-dxg review, Important #3): fix in the 0091 fix round. Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T00:57:53.494Z - Landed in 52b917046..06380274b with the 0091-dxg release note (a0a9ac8a7 fonts stylesheet + invariant 12 + CSP proof, 06380274b invariant-12 own-file check), pushed. Gate 450 files / 5897 tests; re-review Approved. Complete.
