---
id: 0139-vni
title: '0015 V&V: owner actions and checks for the 3.0.0 release'
purpose: Hold the owner-only actions and human checks for plan 0015-kxa, so implementation stories close on automated evidence.
type: task
status: ready
priority: "1"
effort: S
created: "2026-11-05T19:55:21.066Z"
updated: "2026-11-06T20:00:47.558Z"
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

- [x] [MANUAL] Create the free npm organization `classicy` on npmjs.com.
- [ ] [MANUAL] Make sure the `NPM_TOKEN` secret can publish `@classicy/*` (a granular token that lists the organization, or a classic automation token).
- [ ] [MANUAL] Approve the new release-note entries (4.2).
- [ ] [MANUAL] Merge the classicy-web and rt911 PRs (5.1, 5.2) when ready, per their PR notes.
- [ ] [MANUAL] Merge PR 333 with the major-bump keyword recorded in 4.1, so both packages publish as 3.0.0.
- [ ] [MANUAL] After both 3.0.0 packages are live, run `npm deprecate classicy "Renamed to @classicy/classicy. See https://github.com/robbiebyrd/classicy#readme"`.
- [ ] [MANUAL] V&V: in the example app and on classicy-web, the desktop looks and sounds as before (boot chime, button clicks, menu hover), the Appearance Manager's Themes tab shows Platinum's icon, a saved custom theme with a wallpaper survives the upgrade, and a host with Platinum removed shows the stop screen.

## Work Log

### 2026-11-06T16:41:56.357Z - 2026-11-06 (owner): 0139 is no longer tied to the plans. Unlinked from plan 0015-kxa, and plan 0015's Phase 6 progress section removed, so 0014 and 0015 close when their implementation sections do; this checklist (npm org, token, merges, deprecate, hands-on V&V) stays open on its own.

### 2026-11-06T19:57:55.430Z - 2026-11-06: owner created the free npm organization classicy; it is accessible with the owner's npm tokens. Criterion 2 is still open: the repo secret NPM_TOKEN was last set 2026-01-27, before the org existed. A classic Automation token covers new orgs automatically; a granular token from then cannot list classicy and must be edited or replaced (Organizations: classicy, read and write) before PR 333 merges, or the 3.0.0 publish fails.

### 2026-11-06T19:59:14.823Z - 2026-11-06: owner states the repo's NPM_TOKEN is a classic Automation token connected to GitHub, which publishes to every org the account belongs to, classicy included; criterion 2 ticked on that basis. push.yml publishes with NODE_AUTH_TOKEN from this secret.

### 2026-11-06T20:00:47.558Z - 2026-11-06: criterion 2 reopened. The owner clarified the release uses npm trusted publishing (OIDC), not an automation token. Trusted publishers are configured per package on that package's npmjs.com settings, so @classicy/classicy and @classicy/appearance-platinum (not yet on npm) cannot have one before their first publish; push.yml's first 3.0.0 publish would then authenticate with NODE_AUTH_TOKEN = secrets.NPM_TOKEN (last set 2026-01-27, likely expired under npm's 2025 token limits). Also push.yml publishes with pnpm 10.26, whose OIDC publish support is unconfirmed (pnpm's docs confirm it in 11.x). Tracked as a release-blocking story.
