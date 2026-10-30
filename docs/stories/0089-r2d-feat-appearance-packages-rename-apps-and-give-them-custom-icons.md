---
id: 0089-r2d
title: Appearance packages rename apps and give them custom icons
purpose: Let an appearance package give any app, by id, its own display name and icon, shown everywhere the app is displayed, without changing the app's internal identity.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-30T14:45:18.135Z"
updated: "2026-10-30T15:43:44.045Z"
started: "2026-10-30T15:43:44.045Z"
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
      - src/Appearance/ClassicyAppearancePackage.ts
      - src/SystemFolder/SystemResources/App/ClassicyApp.tsx
      - src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx
      - docs/AGENT-REFERENCE.md
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Appearance packages rename apps and give them custom icons

## Problem Statement

Owner request (2026-10-30): an appearance package must be able to rename apps and give them custom icons, e.g. QuickTime Player under another look. Owner rulings: (1) any app, keyed by its id (bundled apps and a host's own registered apps); (2) the package-supplied name shows everywhere the app name is displayed (desktop icon, Applications folder, app menu and switcher, About/Quit menu items, About box, balloon help, window titles that show the app name), while internal ids, action types and saved state keep the original identity so switching packages back restores everything. Today names are fixed constants (e.g. MoviePlayerAppInfo) and some action types are derived from the display name (`ClassicyApp${appName}CloseFile`), so display name and internal name must be separated. Icons already resolve through the per-package asset registry (e.g. useClassicyAsset("icons", "system.quicktime.player")), but saved desktop-icon records may hold resolved icons that go stale on a package switch.

**Impact:** Without it a package cannot present a coherent alternative OS look: QuickTime Player, SimpleText and the other bundled apps keep their Mac OS 8 names and icons under any package.

## Steps

### 1: Plan

Survey every surface an app name or icon reaches and write the implementation plan (package declaration, resolver and hook, display-vs-internal name split, persistence and derived-folder behavior, live package switches).

### 2: Implement

Per the plan, after Part E lands; pixel parity for Platinum (no package override) and a Storybook story under a test package that renames and re-icons QuickTime Player.

## Acceptance Criteria

- [ ] A package declares per-app overrides by app id (name and/or icon); with a package that renames QuickTime Player, every displayed occurrence of the name and icon changes, live on a package switch, and switching back restores the originals.
- [ ] Internal ids, action types, routing and persisted state are unchanged by an override; Platinum (no overrides) stays pixel-identical.
- [ ] A host app registered by the host can be renamed and re-iconed the same way; the feature is documented in AGENT-REFERENCE and CLAUDE.md.

## Files

- `src/Appearance/ClassicyAppearancePackage.ts` - package app-identity declaration
- `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` - resolve display name and icon
- `docs/AGENT-REFERENCE.md` - document the feature

## Work Log
