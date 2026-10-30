---
id: 0089-r2d
title: Appearance packages rename apps and give them custom icons
purpose: Let an appearance package give any app, by id, its own display name and icon, shown everywhere the app is displayed, without changing the app's internal identity.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-30T14:45:18.135Z"
updated: "2026-10-30T16:47:37.515Z"
started: "2026-10-30T15:15:36.055Z"
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

### 2026-10-30T15:15:36.445Z - Part K started on feat/appearance-part-k (worktree from 5ebaff579, after Part E landed): Phase 0 baseline and 1.1 (the validated apps field) dispatched. Plan 0013-l9f holds the surface inventory and the controller rulings (K-D7 changed per the owner's 'everywhere' ruling).

### 2026-10-30T15:53:27.367Z - K Phase 0 done (76 stories + 4 app shots, deterministic; name-built action-type inventory 12 sites + 2 JSDoc incl. the PDF Viewer space bug) and K 1.1 implemented (55f5d6b0c: validated apps field, display-name rules, raw-input prototype-key guard). 4778 tests. K 1.1 review and K 1.2 (resolver + live hooks) dispatched.

### 2026-10-30T15:57:23.797Z - K 1.1 task review APPROVED: schema, K-D11 rules and the raw-input prototype-key guard verified with adversarial probes across object shapes; registration refuses an invalid apps map whole, consistent with the registry. Minors (more pinned cases, control characters refused, length messages) folded into the 1.2 worker's separate commit; the resolver must use Object.hasOwn.

### 2026-10-30T16:20:55.797Z - K 1.2 implemented (75b4813ef resolveClassicyAppIdentity + useClassicyAppIdentity, Object.hasOwn lookups; d86c53849 K 1.1 review minors). 4822 tests; mutation checks prove the store-free, snapshot-cache and hasOwn tests discriminate. K 1.2 review and K 2.1 (literal action types, PDF Viewer fix) dispatched.

### 2026-10-30T16:25:04.377Z - K 1.2 task review APPROVED: resolution rules, live hooks under StrictMode (re-registration and package switches update a mounted component, no render loop) and the store-free guarantee (fails on direct and transitive store imports) all verified by probes. The duplicated active-package subscriber and four minors folded into the 2.1 worker's separate commit.

### 2026-10-30T16:47:37.514Z - K 2.1 implemented (a896af93e literal action types for PDF Viewer, Movie Player, Picture Viewer, SimpleText; PDF Viewer's close now reaches its own reducer; generic paths pinned to the internal name; 91f1590f3 K 1.2 review items incl. one shared active-package subscriber replacing three copies). 4833 tests. K 2.1 review and K 2.2 dispatched.
