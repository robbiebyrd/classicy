---
id: 0160-woz
title: 'Override audiosprite''s minimist and underscore (Dependabot #345, #346, #347)'
purpose: Clear the three alerts the 3.0.0 merge brought onto main, and the failing Dependabot security run.
type: chor
status: in_progress
priority: "1"
effort: S
created: "2026-11-06T22:14:32.014Z"
updated: "2026-11-06T22:26:43.055Z"
started: "2026-11-06T22:26:43.055Z"
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
      - package.json
      - pnpm-lock.yaml
      - docs/DEPENDENCY-OVERRIDES.md
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Override audiosprite's minimist and underscore (Dependabot #345, #346, #347)

## Problem Statement

PR 337 (e77fe6fa3) put audiosprite 0.7.2 in main's lockfile as a pinned devDependency. It pins underscore 1.8.3 and optimist 0.6.1, which pins minimist 0.0.10. GitHub opened #346 (underscore, critical, GHSA-cf4h-3jhx-xvhq), #347 (minimist, critical, GHSA-xvch-5gv4-984h) and #345 (minimist, medium, GHSA-vh95-rmgr-6w4m) on 2026-11-06, and Dependabot's security run on main fails with security_update_not_possible for both, since no parent range allows a fixed version. underscore <=1.13.7 also has GHSA-qpx9-hpmf-5gmw (high, recursion in _.flatten, which audiosprite calls).

**Impact:** Two critical alerts open and a failing Dependabot run on every push to main. Build-time only: audiosprite runs only in build:audio, and neither published package depends on it.

## Steps

### 1: Overrides

pnpm.overrides `minimist@<0.2.4` -> `^0.2.4` (the 0.x security line, same API for optimist) and `underscore@<1.13.8` -> `^1.13.8`; lockfile updated with --config.minimum-release-age=10080 so the libc fields stay; rows in docs/DEPENDENCY-OVERRIDES.md.

### 2: Verify

CLASSICY_AUDIO_FORCE=1 pnpm build:audio with the old and the new lockfile under the same ffmpeg gives byte-identical sprites; full gate.

## Acceptance Criteria

- [x] VERIFY: Sprites byte-identical between the old and new dependency versions under the same ffmpeg; the committed sprites are unchanged.
- [x] VERIFY: Full gate green.
- [ ] [MANUAL] After the PR merges, Dependabot closes #345, #346 and #347 and its security run on main passes.

## Files

- `package.json` - two overrides
- `docs/DEPENDENCY-OVERRIDES.md` - document them

## Work Log

### 2026-11-06T22:26:22.468Z - 2026-11-06: overrides added; lockfile updated with --config.minimum-release-age=10080 (libc fields kept; only minimist and underscore change). CLASSICY_AUDIO_FORCE=1 build:audio under mise ffmpeg 8.0.1: old (underscore 1.8.3, minimist 0.0.10) and new (1.13.8, 0.2.4) sprites byte-identical, all five files; committed sprites (CI's distro ffmpeg) left unchanged. Full gate green: 499 files, 7599 tests, build:source, build:storybook, example build.
