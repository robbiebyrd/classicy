---
id: 0222-xrl
title: 'System 7: final review fixes (browser floor and hardening)'
purpose: 'Follow-up from plan 0018-dbd (System 7 Appearance Package): the final whole-branch review of PR #343.'
type: bugs
status: complete
priority: "2"
effort: M
created: "2026-11-18T03:47:34.219Z"
updated: "2026-11-18T03:47:46.602Z"
started: "2026-11-18T03:47:43.516Z"
completed: "2026-11-18T03:47:46.601Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# System 7: final review fixes (browser floor and hardening)

## Problem Statement

The final review found CSS above the declared browser floor with no fallback (the base slider's round(), and :has() rules in System 7's and the base sheets that Firefox 113-120 cannot read), plus minor items: a release-note version, the capture tool's local server, the pattern-origin watcher's per-mutation cost, an unpublishable Sass partial in System 7's tarball, the strict-CSP docs' img-src, and a color-family prototype guard.

## Steps

### 1: Browser floor

Every floor-sensitive declaration has a fallback, the :has() looks key on component classes, and gates hold the compiled CSS to the floor.

### 2: Hardening

The capture server refuses web pages and paths outside its folder; the pattern-origin watcher publishes once per frame and skips paint-only writes; the tarball, CSP docs and color families are fixed.

## Acceptance Criteria

- [x] [MANUAL] Every final-review finding (I1, I2, M1-M6, N1-N3) is fixed with a test, the floor gates pass, parity stays 666/666 AE 0, a Firefox run without :has() renders the same, and the full gate passes.

## Work Log
