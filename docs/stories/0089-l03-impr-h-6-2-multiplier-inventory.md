---
id: 0089-l03
title: 'H 6.2: Multiplier inventory'
purpose: Work Part G's 86-site one-off multiplier inventory down to the sites kept on purpose, so no unnamed calc(var(--x) * N) proportion survives in the stylesheets.
type: impr
status: ready
priority: "2"
effort: L
created: "2026-10-30T12:16:47.737Z"
updated: "2026-10-30T17:33:13.072Z"
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
      - bin/check-pixel-literals.ts
      - bin/multiplier-allowlist.json
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts
      - docs/AGENT-REFERENCE.md
  stories:
    - ["0073-wte", "depends"]
  plans:
    - ["0011-v9t", "included", ["6.2"]]
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

# H 6.2: Multiplier inventory

## Problem Statement

Part G rewrote the simple multipliers into named derivations but left 86 `calc(var(--x) * N)` sites as a documented one-off inventory (AGENT-REFERENCE §8). Part H's plan purges pixel literals but never handles these unnamed proportions, and its own rewrite tables would add new ones. Owner ruling H-R6 (2026-10-30) adds this section: a `kind: "multiplier"` ratchet in H's scanner, converting every site to a named derivation (a structural role shared across the theme) or a knob (a component-local size), ending at the sites G kept on purpose plus H-R7's stated-reason exceptions.

**Impact:** Without it a package changing a base size still fights dozens of hidden ratios, and the inventory only grows.

## Steps

### 1: Failing tests

The scanner reports kind multiplier; a fixture with one unnamed calc(var(--x) * 3) fails the ratchet; every allowlist entry carries a reason.

### 2: E-independent sites

Seed the allowlist from the live sites, convert every E-independent site to a derivation or a knob; parity AE 0 on touched stories (H-R10).

### 3: E-file sites

After Part E lands, convert the sites in Window, WindowFrame, ClassicyWindowTitleBar.scss, Tabs, Menu and _Slider.scss; tighten the allowlist to the kept-on-purpose set.

### 4: Docs and commit

AGENT-REFERENCE §8 replaces the inventory with the kept-on-purpose list and documents the new names; lint, type-check, test, commit.

## Acceptance Criteria

- [ ] VERIFY: node bin/check-pixel-literals.ts  # exit 0, with the multiplier ratchet active
- [ ] bin/multiplier-allowlist.json lists only G's kept-on-purpose sites and H-R7's stated-reason exceptions, each with a reason; every other former site reads a named derivation or a knob, and parity is AE 0 on every touched story.

## Files

- `bin/check-pixel-literals.ts` - multiplier kind and ratchet
- `bin/multiplier-allowlist.json` - create: the ratchet allowlist with reasons
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts` - new shared-role derivations
- `docs/AGENT-REFERENCE.md` - kept-on-purpose list and new names

## Work Log

### 2026-10-30T17:33:02.291Z - H 6.2 started in two passes: 6.2a (the multiplier gate, the seeded allowlist, and sites outside H 6.1's 27 files, plus E's ClassicyWindowTitleBar.scss) runs in parallel with H 6.1 in worktree part-h-62; 6.2b converts the sites in those 27 files after 6.1 integrates. Base: land/part-h d6aed9d95 (H rebased onto the landed Part E, pushed as feat/appearance-part-h-v2).
