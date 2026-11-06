---
id: 0100-a5o
title: Icon view stacks every icon at the top left (regression from the 11/02 CSS fix b4337ba2c)
purpose: Restore the file browser's icon view without undoing what the 11/02 CSS fix solved for the list view.
type: bugs
status: complete
priority: "1"
effort: S
created: "2026-11-04T00:27:39.118Z"
updated: "2026-11-05T00:48:23.208Z"
started: "2026-11-04T00:30:23.465Z"
completed: "2026-11-05T00:48:23.208Z"
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
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowser.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons.tsx
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
---

# Icon view stacks every icon at the top left (regression from the 11/02 CSS fix b4337ba2c)

## Problem Statement

Commit b4337ba2c ("CSS bug fix", 2026-11-02, on main and feat/AppearancePackages) removed `width: 100%` from `.classicyFileBrowserFill` in `ClassicyFileBrowserViewTable.scss`. That class is on BOTH the file browser root (`ClassicyFileBrowser.tsx:263`, list and icon views) and the icon view's holder (`ClassicyFileBrowserViewIcons.tsx:286`). Without a width, the icon view has no measurable width, and every icon stacks at the window's top left. The Part K landing found it: `desktop-filebrowser--icon-view` AE 10473 and `--icon-view-kept-arranged` AE 10477 against the baseline, and putting the line back restores both exactly. The commit evidently fixed something in the list view (Finder's Macintosh HD window opens in list view and looks right), but its message doesn't say what.

**Impact:** Every icon-view file browser (Finder windows set to icon view, file dialogs) is unusable in the released library.

## Steps

### 1: Find what the fix fixed

Reproduce the list-view problem that `width: 100%` caused, by shooting the list-view stories and the example app's Finder windows with and without the line. Likely candidates are a horizontal overflow and scroll bar from #330, or a table wider than the window.

### 2: Fix both

Give each view the width it needs: the icon view's fill must span its window (the icon layout measures it), and the list view keeps the 11/02 behavior. Scope by the view rather than restoring the shared rule blindly.

### 3: Pin it

Add a test, a real-browser check or a parity story for each view, so neither regresses again.

## Acceptance Criteria

- [x] `desktop-filebrowser--icon-view` and `--icon-view-kept-arranged` match the baseline (AE 0), and the list-view problem the 11/02 fix solved stays solved, demonstrated before and after.
- [x] VERIFY: pnpm test --maxWorkers=3

## Files

- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss` - Scope the fill width by view.

## Work Log

### 2026-11-04T00:32:11.879Z - Wave 2 started in its own worktree from feat/AppearancePackages a02e805cb (Part K landed).

### 2026-11-05T00:48:04.030Z - Landed as 40f0f5cd8 (in wave 1's range, before 9b9f8d028): one scoped rule .classicyFileBrowserFill:not(:has(> .classicyFileBrowserViewTableContainer)) { width: 100% }. The icon views are restored (AE 0) and the 11/02 list fix is kept (wide tables scroll right), demonstrated before and after in the report. Applies cleanly to main.

### 2026-11-05T00:48:06.249Z - Hotfix: owner approved 2026-11-04 PR #336 to main (fix/icon-view-width: 7ab54deee = 40f0f5cd8, plus e69dda118 = a31e7ecd3, the example HCPluginAction type fix). The regression shipped in 2.1.6 and 2.1.7. Gate green (288 files / 3317 tests, both builds). Note: main's CI doesn't build example/, so the example type error went unnoticed there.

### 2026-11-05T00:48:20.141Z - PR #336 merged by the owner (03ad6099a); hotfix released in 2.1.8 ('Fortissimo'). Complete.
