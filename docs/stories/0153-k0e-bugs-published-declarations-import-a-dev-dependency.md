---
id: 0153-k0e
title: '@classicy/classicy''s published declarations import a type from @mdxeditor/editor, a devDependency'
purpose: A host type-checks against Classicy's declarations without installing packages Classicy does not declare.
type: bugs
status: complete
priority: "1"
effort: S
created: "2026-11-06T17:39:26.037Z"
updated: "2026-11-06T18:30:30.810Z"
started: "2026-11-06T17:47:52.573Z"
completed: "2026-11-06T18:30:30.810Z"
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

- [x] VERIFY: The host check passes without skipLibCheck using only the declared dependencies and peers, and fails if a declaration imports an undeclared package.
- [x] VERIFY: Full gate green.

## Files

- `bin/check-host-types.ts` - a no-skipLibCheck, declared-deps-only run

## Work Log

### 2026-11-06T17:47:09.023Z - 2026-11-06, from 0151's Fable review (confidence 82): bin/check-host-types.ts (classicyHostDependencies, :90-103) links @types/<name> from the checkout for every dependency and peer even when that @types package is only a devDependency (@types/howler, @types/he, @types/use-analytics), and sets skipLibCheck: true in every mode (:78), so missing published types become any. With real-host links only and skipLibCheck: false the packed core fails twice under every resolution: ClassicyRichTextEditor.d.ts TS2307 '@mdxeditor/editor' (devDependency) and ClassicySoundManagerUtils.d.ts TS7016 'howler' (no @types/howler for hosts). Fix both (e.g. @types/howler to dependencies; MDXEditorMethods off the public surface or @mdxeditor/editor an optional peer), link @types only when declared, then add a skipLibCheck: false mode (bundler) in the same change. Also fold the duplicated beforeWriteFile bodies (vite.config.ts:219-233 and packages/appearance/platinum/vite.config.ts:85-103) into a factory in bin/classicyDeclarationSpecifiers.ts.

### 2026-11-06T18:30:22.889Z - Landed at fcb254bce (dd129afaf, a8f2b2ec3, fcb254bce on eee3032a9). The host check links only declared deps/peers (@types only when declared), adds bundler-lib-check (skipLibCheck: false), and fails on any undeclared package a packed declaration imports. Three leaks fixed: @mdxeditor/editor off the public surface (new exported ClassicyRichTextEditorMethods, structurally equal to MDXEditorMethods, drift pinned by a tsc-checked type test); @types/howler to dependencies; @types/react an optional peer. beforeWriteFile folded into classicyDeclarationExtensionsWriter. Gate 494 files / 7191 tests; Platinum 23/314 + build + verify:dist. Fable review: no findings, ready to land (packed manifests verified, four host modes pass, fold byte-identical over 330 declarations, lockfile only moves @types/howler, libc: 63).
