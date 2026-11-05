---
id: 0139-vni
title: '0015 V&V: owner actions and checks for the 3.0.0 release'
purpose: Hold the owner-only actions and human checks for plan 0015-kxa, so implementation stories close on automated evidence.
type: task
status: pending
priority: "1"
effort: S
created: "2026-11-05T19:55:21.066Z"
updated: "2026-11-05T20:17:38.107Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0136-tis", "depends"]
    - ["0137-dm7", "depends"]
    - ["0138-cj4", "depends"]
  plans:
    - ["0015-kxa", "included"]
progress:
  "1":
    status: pending
---

# 0015 V&V: owner actions and checks for the 3.0.0 release

## Problem Statement

Plan 0015-kxa Phase 6: the actions only the owner can take (npm organization, token, merges, deprecation) and the human V&V checks for the 3.0.0 release.

## Steps

### 1: Owner actions and checks

Work through the acceptance criteria below; each is ticked when done.

## Acceptance Criteria

- [ ] [MANUAL] Create the free npm organization `classicy` on npmjs.com.
- [ ] [MANUAL] Make sure the `NPM_TOKEN` secret can publish `@classicy/*` (a granular token that lists the organization, or a classic automation token).
- [ ] [MANUAL] Approve the new release-note entries (4.2).
- [ ] [MANUAL] Merge the classicy-web and rt911 PRs (5.1, 5.2) when ready, per their PR notes.
- [ ] [MANUAL] Merge PR 333 with the major-bump keyword recorded in 4.1, so both packages publish as 3.0.0.
- [ ] [MANUAL] After both 3.0.0 packages are live, run `npm deprecate classicy "Renamed to @classicy/classicy. See https://github.com/robbiebyrd/classicy#readme"`.
- [ ] [MANUAL] V&V: in the example app and on classicy-web, the desktop looks and sounds as before (boot chime, button clicks, menu hover), the Appearance Manager's Themes tab shows Platinum's icon, a saved custom theme with a wallpaper survives the upgrade, and a host with Platinum removed shows the stop screen.

## Work Log
