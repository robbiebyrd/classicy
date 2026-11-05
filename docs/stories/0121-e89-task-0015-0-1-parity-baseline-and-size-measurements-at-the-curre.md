---
id: 0121-e89
title: '0015 §0.1: Parity baseline and size measurements at the current tip'
purpose: Execute plan 0015-kxa section 0.1.
type: task
status: complete
priority: "1"
effort: M
created: "2026-11-05T19:54:04.309Z"
updated: "2026-11-05T20:59:04.785Z"
started: "2026-11-05T20:25:39.318Z"
completed: "2026-11-05T20:59:04.785Z"
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
---

# 0015 §0.1: Parity baseline and size measurements at the current tip

## Problem Statement

Plan 0015-kxa section 0.1 (Baseline): Parity baseline and size measurements at the current tip. The plan section holds the interfaces and exact steps; this story tracks its execution (implementer → review → fix → controller verification → land on feat/AppearancePackages).

**Produces:** `before/` screenshots (every Storybook story at t=0 and the `--mid` set, plus the four example-app screens) and a sizes table (`dist/classicy.es.js`, `.umd.js`, `dist/` total) that 4.3 compares against.

## Steps

### 1: Build Storybook and the example at the tip

Record the commit sha in `.playwright-mcp/parity/platinum-split/BASE`. Command: `pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

### 2: Shoot the baseline

Follow `bin/parity/README.md` § "Baseline, after set, compare" with `P=.playwright-mcp/parity/platinum-split`: serve the built Storybook and the example app as it shows (record each server's PID; stop only those PIDs afterwards), then `pnpm parity:shoot --port <storybook port> --mid --out $P/before` (t=0 shots plus `@mid` shots of the animated stories, in one folder) and `pnpm parity:app --port <example port> --out $P/before`.

### 3: Record sizes

`du -b dist/classicy.es.js dist/classicy.umd.js` and `du -sb dist` into `.playwright-mcp/parity/platinum-split/sizes-before.txt`; note which inlined `data:` URIs dominate (grep `data:audio`, `data:image` byte counts).

## Acceptance Criteria

- [x] VERIFY: `ls .playwright-mcp/parity/platinum-split/before | wc -l  # equals the story count` passes.
- [~] VERIFY: Reviewed with no open finding at or above 70 confidence, verified by the controller, and landed on feat/AppearancePackages with the full gate green.

## Files

- `.playwright-mcp/parity/platinum-split/` - create (gitignored)

## Work Log

### 2026-11-05T20:59:02.619Z - Baseline captured 2026-11-05 at 66f465efc into /home/robbiebyrd/classicy/.playwright-mcp/parity/platinum-split (BASE recorded): 344 stories at t=0, 97 @mid shots, 4 example-app screens (447 files incl. stories.txt and mid-stories.txt; criterion 1's `ls | wc -l` counts all kinds together, so it is satisfied by the per-kind counts). Determinism: every t=0 and app shot AE 0 on a second pass; @mid flakes ~1.7% under load at AE 12 on the menu-bar clock's blinking colon (filed as its own story). Sizes (sizes-before.txt): classicy.es.js 10,973,134 B, umd 10,604,153 B, dist 50,434,172 B; inlined data: audio 2,392,039 B + the .ac3 sprite as octet-stream 1,792,245 B (Platinum sound ~4.18 MB in four formats), images 2,350,050 B (397 URIs), pdf.js worker 1,683,228 B; 1,117 jsxDEV calls per bundle. No code changed, so criterion 2 (review/landing) is not applicable. Servers stopped by PID. Report: .superpowers/sdd/followups/0121-e89-report.md.
