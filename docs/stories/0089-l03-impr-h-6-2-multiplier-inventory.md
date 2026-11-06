---
id: 0089-l03
title: 'H 6.2: Multiplier inventory'
purpose: Work Part G's 86-site one-off multiplier inventory down to the sites kept on purpose, so no unnamed calc(var(--x) * N) proportion survives in the stylesheets.
type: impr
status: complete
priority: "2"
effort: L
created: "2026-10-30T12:16:47.737Z"
updated: "2026-11-05T00:49:43.453Z"
started: "2026-11-03T22:47:14.319Z"
completed: "2026-11-05T00:49:43.453Z"
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
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
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

- [x] VERIFY: node bin/check-pixel-literals.ts  # exit 0, with the multiplier ratchet active
- [x] bin/multiplier-allowlist.json lists only G's kept-on-purpose sites and H-R7's stated-reason exceptions, each with a reason; every other former site reads a named derivation or a knob, and parity is AE 0 on every touched story.

## Files

- `bin/check-pixel-literals.ts` - multiplier kind and ratchet
- `bin/multiplier-allowlist.json` - create: the ratchet allowlist with reasons
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.ts` - new shared-role derivations
- `docs/AGENT-REFERENCE.md` - kept-on-purpose list and new names

## Work Log

### 2026-10-30T17:33:02.291Z - H 6.2 started in two passes: 6.2a (the multiplier gate, the seeded allowlist, and sites outside H 6.1's 27 files, plus E's ClassicyWindowTitleBar.scss) runs in parallel with H 6.1 in worktree part-h-62; 6.2b converts the sites in those 27 files after 6.1 integrates. Base: land/part-h d6aed9d95 (H rebased onto the landed Part E, pushed as feat/appearance-part-h-v2).

### 2026-10-30T19:59:21.020Z - H 6.2a implemented (9a98dfb74 on h/6.2a): the multiplier gate with a reasoned allowlist (178 live sites seeded, more than G's 88 grep count); 123 sites named with 31 derivations and 31 knobs; 55 sites left (31 kept on purpose, 24 in 6.1's files for 6.2b). Parity AE 0 on 342 stories + 4 app shots. Ruling H-R25: sites multiplying a user-editable metric must stay proportional (derivations, not knobs), so the Metrics tab keeps scaling; fix round running.

### 2026-10-30T21:09:10.933Z - H 6.2a H-R25 fix (08a84dc11): all 31 knobs had replaced multiples of user-editable metrics, so all 31 are now derivations under the same variable names (no SCSS change). A new metric-scaling test sets each metric through its real action and fails against the knob version. Parity AE 0 on 346 shots, computed styles 342/342, forced states 67/67. All 24 sites left for 6.2b multiply editable metrics, so they become derivations too. In review.

### 2026-10-30T21:21:34.698Z - 6.2a review: Needs fixes. The scanner misses Sass #{$x} operands (4 live Slider sites; the true total is 182, not 178) and sign-flip-plus-factor chains such as var(--x) * -1 / 2. Values verified: 33,212 old-vs-new comparisons across every editable input; H-R25 fully applied. Ruling H-R28 covers the scanner fix, the title-bar cap offset's own name, a knob/derivation collision test and a duplicate-role check. Fix round running.

### 2026-11-03T21:30:53.318Z - 6.2a review fixes (fa2e74728, cdd929f44): the scanner counts Sass #{$x} operands and multiplies factor chains (* -1 / 2 is now caught); the 4 Slider thumb halves are allowlisted under H-R21 (the live total is 176, since ±1 products are not sites); the title-bar cap offset gets --window-title-cap-offset; a knob/derivation collision test is added; no duplicate role is merged, with reasons recorded. Parity AE 0, computed styles and forced states identical. Accepted; integrating with 6.1 onto land/part-h.

### 2026-11-03T22:47:16.507Z - 6.2a integrated with 6.1 onto land/part-h (d7e159c5e): 105 derivations, 93 knobs, 59 allowlisted sites over 16 files, no H-R6 conflicts. H 6.2b (the 24 remaining sites, all derivations under H-R25) started on land/part-h.

### 2026-11-04T00:13:13.674Z - H 6.2b implemented (2b481f62b on land/part-h, pushed as feat/appearance-part-h-v2): 22 sites now read 14 new derivations (119 in all), PopUpMenu reuses --ui-font-size-xlarge, and Slider:6 is kept as H-R21 geometry. The allowlist ends at the kept-on-purpose set (36 sites over 7 files). The scaling test has 77 rows plus a whole-pixel sweep. Parity AE 0 on 342 + 4 shots; computed styles and forced states identical; 4980 tests. In review.

### 2026-11-04T00:25:42.763Z - H 6.2b review: Approved (values exact for every whole-pixel input 0-512; allowlist exactly the kept set of 36 sites; story VERIFY passes). Minors folded into H 7.1; a negative UI font size accepted by hasFontSize filed as 0099-rlc.

### 2026-11-05T00:49:23.165Z - Rebased onto feat/AppearancePackages 536a958c9 as land/part-h-v3 (9b1842dc7, pushed as feat/appearance-part-h-v3). Full gate green (443 files / 5722 tests); parity vs a fresh before-tip baseline 348/348 AE 0, only the ruled diffs H-R4/H-R23. The fallout commit pins knob font sizes inside 0099's 8-72. Final reviews: correctness Ready to land (7 minors); contract Needs fixes (I1 missing 0002-ldj amendment, fixed in ec253dd48; M1-M9). Fix round under H-R29: ff36fe59a..83b2c8775 (H-R29 a-e); knobs 93 -> 95; multiplier allowlist 40 sites / 9 files; gate 445 files / 5739 tests; fix re-review Approved.

### 2026-11-05T00:49:39.939Z - Landed 93aa968fe: feat/AppearancePackages fast-forwarded 536a958c9..93aa968fe and pushed (Part H 0-7.1, the H-R29 final-review fixes and the 0002-ldj amendment ec253dd48). check-pixel-literals exits 0 with the multiplier ratchet active; bin/multiplier-allowlist.json holds only the 40 kept-on-purpose sites over 9 files, each with a reason. Complete.
