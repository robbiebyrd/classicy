---
id: 0108-4md
title: Resolve the five latent stylesheet-order ties found by 0082-lgo's cascade guard
purpose: Make every cross-file cascade tie the 0082-lgo guard found independent of stylesheet order.
type: impr
status: complete
priority: "4"
effort: M
created: "2026-11-05T00:59:45.262Z"
updated: "2026-11-05T01:04:05.193Z"
started: "2026-11-05T00:59:52.040Z"
completed: "2026-11-05T01:00:08.920Z"
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
      - src/SystemFolder/SystemResources
  stories:
    - ["0082-lgo", "included"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
---

# Resolve the five latent stylesheet-order ties found by 0082-lgo's cascade guard

## Problem Statement

0082-lgo's guard found five declarations whose winner depended on stylesheet order: the large-toolbar help button's square width (HelpButton vs BevelButton order); the combo box's 'No matches' row; the menu-bar clock margin; a window with a header and its own menu bar (contents height thought to leave out the header, mirrored package only); and the slider value label always drawn at the small size.

**Impact:** A bundling-order change could silently change these surfaces.

## Steps

### 1: Implement

Resolve each tie by structure or specificity and remove its allowlist entry. Owner decision 2026-11-04: keep the smaller slider value label (ui size / 1.25), made order-independent.

### 2: Land

Gate on the landing tree, land on feat/AppearancePackages and push.

## Acceptance Criteria

- [x] The cascade guard's allowlist holds none of the five ties, and parity is 344/344 AE 0.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test --maxWorkers=3 && pnpm build:source

## Files

- `src/SystemFolder/SystemResources`

## Work Log

### 2026-11-05T00:59:53.997Z - Filed from the 0082-lgo guard findings; dispatched 2026-11-04 ~18:00 UTC on fu/order-ties from 40934effc; slider item reworked on the owner's decision (5c823ca08 on the branch). Filed after the fact because the tracker was offline (MongoDB outage).

### 2026-11-05T01:00:05.569Z - Landed 5b0ce7ee3..b945f78fd, pushed (fbcda3c71, 4cd691a24, 394b5b720, 76a8b0781, b945f78fd). Land gate 453 files / 5982 tests, all builds; parity 344/344 AE 0. Item 4 was already correct via a 4-class rule (no render change); the help button keeps its square width (48x21 in a large toolbar). Note: fbcda3c71's message ('draw the value readout at labelSize') is superseded by b945f78fd. Complete.
