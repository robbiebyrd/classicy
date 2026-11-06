---
id: 0140-mid
title: parity:shoot --mid flakes on the menu-bar clock's blinking colon (AE 12)
purpose: Make mid-time parity shots deterministic, so a parity failure always means a real change.
type: bugs
status: in_progress
priority: "2"
effort: S
created: "2026-11-05T20:58:59.049Z"
updated: "2026-11-06T02:19:13.073Z"
started: "2026-11-06T02:19:13.073Z"
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
      - src/SystemFolder/SystemResources/MenuBar/
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# parity:shoot --mid flakes on the menu-bar clock's blinking colon (AE 12)

## Problem Statement

Found by 0121-e89's determinism check (2026-11-05). `pnpm parity:shoot --mid` freezes animated stories at `--at 50%`. The menu-bar clock's seconds colon (`.textBlinker`, `animation: blinker 2s steps(1,end)`, keyframe `50% { opacity: 0 }`) switches visibility exactly at 50%, so the paused frame lands on either side of the step. About 1.7% of `@mid` shots under load (seen on `dialogs-assistant--setup-assistant`, `desktop-window--default`, `desktop-window--with-context-menu`, `dialogs-fileopendialog--single-selection-two-volumes`, `system-appearancemanager--fonts`) differ by AE 12, always the same 3x8 box. A single-story reshoot matches the baseline byte for byte.

**Impact:** Every later parity compare in plan 0015-kxa (and future work) can report a false AE 12 difference, which costs a reshoot each time and trains reviewers to dismiss parity failures.

## Steps

### 1: Failing check

A parity tool test (or a scripted 10x `--mid` shot of `dialogs-assistant--setup-assistant`) that shows the colon frame varying.

### 2: Make the mid frame deterministic

Pick one and justify it: pause step-timing animations at a point strictly inside a step (for example sample at `--at` plus a small epsilon, or pause step animations at 25%/75%), or have the tool exclude `.textBlinker` (`animation: none` during mid shots), or round the pause time per animation away from step boundaries. It must not change any t=0 shot.

### 3: Rebaseline the mid set

If the chosen fix changes which frame `@mid` captures, re-shoot `@mid` for the 0015-kxa baseline at its recorded base (`/home/robbiebyrd/classicy/.playwright-mcp/parity/platinum-split/BASE`) so later compares stay valid, and say so in the work log.

## Acceptance Criteria

- [ ] VERIFY: Three full `pnpm parity:shoot --mid` passes under load (4 workers) compare AE 0 against each other for every `@mid` shot.
- [ ] VERIFY: t=0 shots are byte-identical to before the change.

## Files

- `bin/parity/` - deterministic mid-time pause

## Work Log

### 2026-11-06T00:32:57.382Z - 2026-11-06: second parity-recipe gap. bin/parity/README.md says to shoot from 'storybook dev', but the platinum-split/before baseline was shot from the static build (python http.server over storybook-static). In dev mode the window grow-box grip renders differently: AE 69 in a 10x10 box on every window story (fu/0123: static AE 0, dev AE 69 on desktop-window--default and colorpicker--controlled). When fixing the clock flake, also make the README name one serving mode (static, to match baselines) and find why dev draws the grip differently.
