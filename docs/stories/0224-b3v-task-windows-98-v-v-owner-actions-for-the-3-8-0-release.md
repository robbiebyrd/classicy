---
id: 0224-b3v
title: 'Windows 98 V&V: owner actions for the 3.8.0 release'
purpose: Hold the owner-only actions for the first release of @classicy/appearance-windows98, so story 0223-ck1 closes on automated evidence.
type: task
status: ready
priority: "1"
effort: S
created: "2026-11-24T16:29:20.000Z"
updated: "2026-11-24T16:29:20.000Z"
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
    - ["0223-ck1", "depends"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Windows 98 V&V: owner actions for the 3.8.0 release

## Problem Statement

push.yml publishes over npm trusted publishing, which is configured per
package and only for a package that already exists on the registry (story
0156-tx7). `@classicy/appearance-windows98` has never been published, so an
owner of the npm organization creates it by hand before the release that
first publishes it, as was done for Platinum and System 7.

**Impact:** Without it the release workflow's publish of the new package
fails while the core, Platinum and System 7 publish.

## Steps

### 1: Bootstrap the package on npm

Logged in as an owner of the npm organization, with two-factor
authentication on and npm 11.15.0 or later, no more than a day before the
release (a new trusted publisher expires unless a publish uses it within two
days):

Command: `bin/npm-bootstrap-trusted-publishing.sh --publish packages/appearance/windows98/package.json`

It publishes `@classicy/appearance-windows98@0.0.0` under the `bootstrap`
dist-tag, deprecates it naming 3.8.0, and adds the push.yml trusted
publisher; re-running it is safe. Check `npm dist-tag ls
@classicy/appearance-windows98` a few minutes later.

### 2: Release

Merge the pull request; push.yml bumps every package to 3.8.0 (a `feat:`
commit), syncs the three Appearance Packages' versions and publishes all
four.

## Acceptance Criteria

- [ ] `npm view @classicy/appearance-windows98@3.8.0 version` prints `3.8.0`, and `npm view @classicy/appearance-windows98 dist-tags` shows `latest` on it.

## Files

- `bin/npm-bootstrap-trusted-publishing.sh` - run

## Work Log
