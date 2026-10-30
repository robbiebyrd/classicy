---
id: 0098-drm
title: On a fresh boot the live file-system tree is the shared default tree object, so edits change the defaults
purpose: Keep the default file-system tree immutable, so one session's edits never leak into other storage keys or Drive Setup.
type: bugs
status: pending
priority: "2"
effort: S
created: "2026-10-30T21:44:07.146Z"
updated: "2026-10-30T21:44:07.146Z"
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
      - src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts
      - src/SystemFolder/SystemResources/File/DefaultFSContent.ts
  stories:
    - ["0096-4hh", "depends"]
  plans:
    - ["0013-l9f", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# On a fresh boot the live file-system tree is the shared default tree object, so edits change the defaults

## Problem Statement

While fixing 0096-4hh, the implementer found the bug. On a fresh boot, with nothing in localStorage, the live tree of `ClassicyFileSystem` IS the `DefaultFSContent` module object; in exclusive mode it is the host's own `defaultFileSystem` object. Every edit in that session therefore changes the default tree that other storage keys, a later reload with no storage, and Drive Setup all read. The 0096 fix compares against a frozen `CLASSICY_SEEDED_PLACEHOLDER` constant because comparing with the seed tree was unsound for this reason.

**Impact:** Defaults drift during a session. A second file system or a Drive Setup reset can come up with the user's edits instead of the defaults, and a host's own default object is changed behind its back.

## Steps

### 1: Failing test

On a fresh boot, write a file, then construct a second file system with another storage key (and run a Drive Setup reset). Assert that both see the untouched defaults, and that the host's `defaultFileSystem` object is unchanged.

### 2: Fix

Deep-copy the default tree (`structuredClone`) when it seeds the live tree, in both merge and exclusive mode. Consider freezing `DefaultFSContent` in dev builds.

## Acceptance Criteria

- [ ] Edits in one session never change `DefaultFSContent` or a host's `defaultFileSystem` object, and every new file system seeds from untouched defaults.
- [ ] VERIFY: pnpm test --maxWorkers=3

## Files

- `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts` - Seed the live tree from a deep copy of the defaults.

## Work Log
