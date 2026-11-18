---
id: 0205-hay
title: 'Release workflow: tidy the manifest naming'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package).
type: chor
status: complete
priority: "4"
effort: XS
created: "2026-11-12T14:13:06.050Z"
updated: "2026-11-12T14:59:28.962Z"
started: "2026-11-12T14:13:46.423Z"
completed: "2026-11-12T14:59:28.962Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Release workflow: tidy the manifest naming

## Problem Statement

From plan 0018-dbd task 2.3: the release workflow and bootstrap script use `manifest_name` inconsistently, and a push.yml comment still describes two publishes (there are three packages).

**Impact:** Misleading release tooling text.

## Steps

### 1: Use one meaning of manifest_name throughout

Use one meaning of manifest_name throughout

### 2: Update the push.yml comment to the three packages

Update the push.yml comment to the three packages

## Acceptance Criteria

- [x] VERIFY: The release tooling names its packages consistently, and its tests pass.

## Files

- `.github/workflows/push.yml` - modify
- `bin/npm-bootstrap-trusted-publishing.sh` - modify

## Work Log
