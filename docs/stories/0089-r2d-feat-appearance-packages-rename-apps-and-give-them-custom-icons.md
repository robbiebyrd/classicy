---
id: 0089-r2d
title: Appearance packages rename apps and give them custom icons
purpose: Let an appearance package give any app, by id, its own display name and icon, shown everywhere the app is displayed, without changing the app's internal identity.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-30T14:45:18.135Z"
updated: "2026-10-30T21:40:17.204Z"
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

### 2026-10-30T17:14:12.335Z - K 2.2 implemented (5417971f7 loadApp refreshes code-derived identity, records never hold display data, persistence guard; 27f18eb3a K 2.1 review fixes: real routing pins proven by mutation, bidi/invisible-character guard). 4847 tests. K 2.2 review plus K 3.1, 3.2, 3.3, 3.4 dispatched in parallel worktrees (disjoint files).

### 2026-10-30T17:43:46.100Z - K 3.2 implemented (f6362c4d0 on k/3.2: App Switcher and Apple menu show display names/icons); in review. Its parity check found that K 2.2's loadApp refresh changed Finder's switcher icon (system.macos to system.mac); ruling K-R1 restores system.macos at integration.

### 2026-10-30T17:49:08.308Z - K 2.2 review fixes landed (28d19d169, pushed): TV icon override in the persistence guard (mutants M3/M4 now fail), U+200E/U+200F/U+061C/U+2060/U+00AD refused, Finder's fallback OpenFile site pinned. K 2.2 complete. K 3.3 (7a3a38ada) and 3.4 (71c479555) implemented, in review; rulings K-R2 (strip label only when overridden) and K-R3 (dedupe the collision warning) recorded.

### 2026-10-30T17:51:02.307Z - K 3.2 review: Approved (no Critical/Important; 4 minors carried to the 3.x integration). K 3.1 (b5ea0b64c) implemented, in review; it closes the 2.2 balloon gap. K-R1 Finder switcher-icon fix dispatched on feat/appearance-part-k.

### 2026-10-30T17:58:01.286Z - K 3.3 review: Needs fixes (warning floods; an app's own name could displace another app's override; a static file could be overwritten; derived entries with display names reach localStorage and adapter snapshots). Rulings K-R4 (reserve static and own names; fall back to '<own name> (<id>)') and K-R5 (strip _derived entries at the persistence boundary) recorded; 3.3 fix round running. K 3.4 review: Needs fixes, its one Important resolved by K-R5; test hardening carried to the integration.

### 2026-10-30T18:01:59.935Z - K 3.1 review: Needs fixes (test-only: analytics display-name leak and type-select drive exclusion unpinned; code correct, 2.2 balloon gap closed). 3.1 fix round running.

### 2026-10-30T18:25:21.650Z - K 3.1 review fixes in (77477f2e0 on k/3.1): analytics and drive type-select pinned, all seven mutants now fail; the empty-label balloon title now matches the label fallback. Accepted for integration. K-R1 fix pushed (7e74758e0, 80/80 parity shots AE 0). K 3.2 and 3.4 cherry-picked onto feat/appearance-part-k; gate running.

### 2026-10-30T18:40:01.027Z - K 3.3 fix round (36ca95f22) re-review: Approved. Derived entries no longer persist (K-R5), and no user file is lost, including files inside derived folders. K-R7 extends K-R4 to the Control Strip Modules folder at integration. All four 3.x tasks now approved; integration next.

### 2026-10-30T19:59:23.483Z - K 4.1 implemented (45476c34f, 7c98d0697 on k/4.1): control panels and HyperCard follow display identity in window titles, proxy icons and About titles. Ruling K-R8: stored menus keep the internal About title, resolved by item id at render. In review.

### 2026-10-30T20:04:46.791Z - K 4.1 review: Approved (a probe renamed all 15 bundled apps and found no display data in persisted state). Ruling K-R9: the About helper retitles only 'About <internal name>'. Integrates after the 3.x step.

### 2026-10-30T20:35:23.420Z - K 3.x integrated and pushed (3b8767ebc): 3.3 cherry-picked (one test-file conflict plus a silent duplicate declaration, both resolved), carry-forward minors and K-R7 applied, 19 mutants all killed, 417 files / 4957 tests, 80/80 parity AE 0. K 4.1 integration (with K-R9) and story 0096-4hh (user-file data loss) running in parallel.

### 2026-10-30T21:05:05.004Z - K 4.1 integrated and pushed (acda16223): K-R9 (the window bar retitles only 'About <own name>'), HyperCard added to the About-title tests, a two-level nesting case; 9 mutants, 418 files / 4994 tests, 80/80 parity AE 0. K section 4 complete. K 5.1 (the Storybook 'renamed' proof and Playwright checks) started.

### 2026-10-30T21:33:47.213Z - K 5.1 implemented (7764bb143): the Storybook 'renamed' package (Movie Player as Media Player, TV as Television) with 43/43 real-browser checks true (every surface, both localStorage keys after write+flush, live switch and back); persistence test mutation-proved; 420 files / 4999 tests; 80/80 Platinum parity AE 0. In review. Filed 0097-p8k: Storybook never loads Movie Player's reducer.

### 2026-10-30T21:40:17.204Z - K 5.1 review: Needs fixes. The story alone never shows 'About Media Player' or the About box (the check script imported Movie Player's module and opened a document itself), and the Control Strip check passed without opening the panel or exercising a module tied to a renamed app (K-D7/K-R2). Lazy registration, persistence and parity verified. Fix round running.
