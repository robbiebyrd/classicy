---
id: 0153-k0e
title: '@classicy/classicy''s published declarations import a type from @mdxeditor/editor, a devDependency'
purpose: A host type-checks against Classicy's declarations without installing packages Classicy does not declare.
type: bugs
status: ready
priority: "2"
effort: S
created: "2026-11-06T17:39:26.037Z"
updated: "2026-11-06T17:39:31.690Z"
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
      - package.json
      - bin/check-host-types.ts
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# @classicy/classicy's published declarations import a type from @mdxeditor/editor, a devDependency

## Problem Statement

From 0151-0cc (2026-11-06; predates it). The core's emitted `.d.ts` files import a type from `@mdxeditor/editor`, which `package.json` lists only in `devDependencies`. A host without it gets that type as `any` under `skipLibCheck: true`, and a type error without `skipLibCheck`. Other dev-only imports may leak the same way.

**Impact:** Strict TypeScript hosts (no skipLibCheck) fail to type-check against 3.0.0.

## Steps

### 1: Failing check

Extend `bin/check-host-types.ts` (0151) with a run that installs nothing beyond the packages' declared `dependencies` and `peerDependencies` and type-checks without `skipLibCheck`; list every bare specifier imported by `dist/types/**/*.d.ts` that is not a declared dependency or peer.

### 2: Fix

For each leaked type: declare the dependency (or an optional peer) if hosts need it, or stop exporting the type that drags it in (inline a structural type, or mark the API internal). Decide per import and record why.

## Acceptance Criteria

- [ ] VERIFY: The host check passes without skipLibCheck using only the declared dependencies and peers, and fails if a declaration imports an undeclared package.
- [ ] VERIFY: Full gate green.

## Files

- `bin/check-host-types.ts` - a no-skipLibCheck, declared-deps-only run

## Work Log
