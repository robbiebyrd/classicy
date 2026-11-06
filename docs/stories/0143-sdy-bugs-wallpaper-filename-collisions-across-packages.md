---
id: 0143-sdy
title: Two packages registering the same wallpaper filename collide in the Desktop tab and in resolution
purpose: Keep wallpapers unambiguous once a second package registers its own.
type: bugs
status: in_progress
priority: "3"
effort: S
created: "2026-11-05T22:16:22.186Z"
updated: "2026-11-06T05:13:23.689Z"
started: "2026-11-06T05:13:23.689Z"
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
      - src/Appearance/ClassicyWallpaperIndex.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Two packages registering the same wallpaper filename collide in the Desktop tab and in resolution

## Problem Statement

From 0125-gqb's review (2026-11-05, minor, confidence 70). A persisted wallpaper is a bare filename with no package. If package `foo` registers `{name: "Foo Default", file: "default.png"}`, the Desktop tab (`ClassicyAppearanceManager.Desktop.tsx:58-69`) merges Platinum's "Default" with the same value `"default.png"`: picking Platinum's stores a value that resolves to foo's image (the theme's package wins, `ClassicyWallpaperIndex.ts:100-114`), and the selection highlight lands on whichever option comes first. Also, `classicyWallpaperFilename` (and so the strict schema) accepts any package's filename, while `resolveClassicyWallpaper` searches only theme package → active → Platinum, so an imported theme naming a third package's file validates and renders `""`. No package other than Platinum registers wallpapers today.

**Impact:** Wrong or missing desktop picture once a second Appearance Package ships wallpapers.

## Steps

### 1: Decide the reference form

Choose package-qualified wallpaper references (for example `platinum:default.png`, with a bare filename meaning the theme's package) or a uniqueness rule enforced at registration (warn and namespace). Write a failing test for the Desktop tab's duplicate options and for the cross-package resolve.

### 2: Implement and migrate

Apply the choice in the index, the Desktop tab and theme files; keep bare filenames working for existing saves.

## Acceptance Criteria

- [ ] VERIFY: With two packages registering `default.png`, each Desktop-tab option stores and renders its own image, and an imported theme naming another package's wallpaper renders it or is refused with a clear error.

## Files

- `src/Appearance/ClassicyWallpaperIndex.ts` - unambiguous references

## Work Log
