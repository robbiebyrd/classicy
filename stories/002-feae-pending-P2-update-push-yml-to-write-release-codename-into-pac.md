---
id: "002-feae"
title: "Update push.yml to write release codename into package.json"
status: pending
priority: P2
created: 2026-04-17T02:17:40.141Z
updated: 2026-04-17T02:17:40.141Z
dependencies: []
---

# Update push.yml to write release codename into package.json

## Problem Statement

Add a step after "Select release codename" that runs `npm pkg set release="..."` and commits+pushes the change with [skip ci] to prevent loop.

## Acceptance Criteria

- [ ] Implement as described

## Work Log

