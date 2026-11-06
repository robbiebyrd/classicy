---
id: 0142-h84
title: 'Remove bin/ tooling we no longer need: parity dump, forced and probe, and the empty pixel-literal ratchet'
purpose: Ship PR 333 without tools that only served the Appearance Packages extraction.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-11-05T21:48:42.949Z"
updated: "2026-11-06T00:13:02.753Z"
started: "2026-11-05T21:48:50.592Z"
completed: "2026-11-06T00:13:02.753Z"
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
      - bin/parity/
      - bin/check-pixel-literals.ts
      - bin/pixel-literal-allowlist.json
      - package.json
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

# Remove bin/ tooling we no longer need: parity dump, forced and probe, and the empty pixel-literal ratchet

## Problem Statement

Owner decision 2026-11-05: remove the bin/ files that will not be needed after PR 333 merges.

- **Parity subcommands `probe`, `dump` and `forced`:** `parityProbe.ts`, `parityDump.ts`, `parityDumpCompare.ts`, `parityForced.ts`, `parityForcedMatrix.ts` and their tests, plus the `computed` and `forced` kinds of `parity compare`, and the `parity:probe`, `parity:dump` and `parity:forced` package scripts. They checked computed styles, forced states and render health during the extraction; nothing in CI or plan 0015-kxa uses them. What stays: `stories`, `shoot` (with `--mid`), `app` and `compare` (AE).
- **The pixel-literal ratchet:** `bin/pixel-literal-allowlist.json` is `{}`, and the ratchet code in `bin/check-pixel-literals.ts` (around :3 and :1003-1034) is dead weight now that every literal is gone. The gate becomes "no bare `Npx` in `src/**/*.scss`", with no allowlist. The multiplier gate and `bin/multiplier-allowlist.json` stay unchanged.

**Impact:** Less code to maintain and review; docs that describe the tools as they are.

## Steps

### 1: Tests first

Update the tests so they describe the new behavior and fail on the old code: `bin/parity/parity.test.ts` (no `dump`/`forced`/`probe` commands; unknown command errors), `parityArgs.test.ts`, `parityCompare.test.ts` (only `--kind ae`; `computed`/`forced` rejected), `bin/check-pixel-literals.test.ts` (any literal fails; no allowlist file is read; its absence is fine), and `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.varCoverage.test.ts` if it reads the allowlist.

### 2: Remove

`git rm` the five parity modules and their tests and `bin/pixel-literal-allowlist.json`; simplify `parity.ts`, `parityArgs.ts`, `parityCompare.ts`, `parityBrowser.ts` and `check-pixel-literals.ts` to match; drop the three package scripts.

### 3: Docs

`bin/parity/README.md`, CLAUDE.md (Common Commands; the "pixel ratchet" sentence in Theming), `docs/AGENT-REFERENCE.md` §8 "Pixel literal gate", and any other mention (`git grep -nE 'parity:(dump|forced|probe)|pixel-literal-allowlist|parityDump|parityForced|parityProbe'`).

### 4: Gate

Full gate, plus one `pnpm parity:shoot --mid` and `parity:compare` round against the 0015 baseline to prove shoot/compare still work.

## Acceptance Criteria

- [x] VERIFY: `git grep -nE 'parity:(dump|forced|probe)|pixel-literal-allowlist|parityDump|parityForced|parityProbe' -- . ':!docs/plans' ':!docs/stories' ':!docs/superpowers'` prints only release-note history, if anything.
- [x] VERIFY: Full gate green, and a parity shoot/compare round against `/home/robbiebyrd/classicy/.playwright-mcp/parity/platinum-split/before` runs (AE 0 except the known clock-colon @mid flake).

## Files

- `bin/parity/` - remove probe, dump and forced
- `bin/pixel-literal-allowlist.json` - delete
- `bin/check-pixel-literals.ts` - drop the ratchet
- `package.json` - drop parity:probe, parity:dump and parity:forced

## Work Log

### 2026-11-06T00:12:56.839Z - Landed at eeb597bb0 (6b4854944, eeb597bb0) stacked on 0119. Grep leaves only the two tests asserting bin/pixel-literal-allowlist.json is absent. Gate on old tip 456/6260 green and parity 440 zero, 1 nonzero (clock-colon @mid flake, 0140), 4 app shots not reshot; stacked gate 463/6489 green.
