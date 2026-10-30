---
id: 0096-4hh
title: A user file in Applications or Extensions is replaced by a same-named app entry
purpose: Never lose a user's file to a derived folder entry that shares its name.
type: bugs
status: pending
priority: "1"
effort: S
created: "2026-10-30T19:15:44.106Z"
updated: "2026-10-30T19:15:44.106Z"
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
      - src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts
      - src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts
      - src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts
  stories:
    - ["0089-r2d", "depends"]
  plans:
    - ["0013-l9f", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# A user file in Applications or Extensions is replaced by a same-named app entry

## Problem Statement

Derived app entries are placed into Applications and Extensions by name. An app with no package override REPLACES a static entry of the same name: K-R6 kept this on purpose, so Platinum's invisible SimpleText and Calculator placeholders give way to the real apps. The K 3.3 fix re-review showed that a user can place their own file in Applications. A user file named like an installed app (for example "TV") is therefore replaced in the live tree. Since K-R5, derived entries are stripped from persistence, so the next save writes neither, and the user's file is lost for good. Before K-R5 the derived entry was saved in its place, so the file was lost then too. Part K only changes how the loss looks.

**Impact:** Silent, permanent loss of a user file.

## Steps

### 1: Reproduce

Write a failing test: create a user file named after an installed app in Applications, rebuild the derived folder, flush, reload, and assert that the file is still there.

### 2: Fix

Replace only the placeholders that are meant to give way. Mark them (for example `_placeholder: true`, set where they are created) or match their exact shape. A collision with any other static or user entry takes the K-R4 fallback ("<name> (<id>)") instead, with one warning (K-R3).

### 3: Verify

Pin the SimpleText and Calculator placeholder handoff, the user-file case and the Control Strip Modules folder (K-R7); run the full gate.

## Acceptance Criteria

- [ ] A user file named like an installed app survives a derived-folder rebuild, a save and a reload.
- [ ] Platinum's SimpleText and Calculator placeholders still give way to the real apps.
- [ ] VERIFY: pnpm test --maxWorkers=3

## Files

- `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts` - placement rule
- `src/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions.ts` - placement rule
- `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts` - snapshot filter (K-R5)

## Work Log
