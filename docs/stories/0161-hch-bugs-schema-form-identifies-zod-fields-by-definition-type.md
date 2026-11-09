---
id: 0161-hch
title: Schema form identifies zod fields by definition type
purpose: Plan 0016-vbq section 1.1.
type: bugs
status: pending
priority: "2"
effort: S
created: "2026-11-09T19:24:30.422Z"
updated: "2026-11-09T19:24:30.422Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
---

# Schema form identifies zod fields by definition type

## Problem Statement

Plan 0016-vbq §1.1 (Schema form identifies zod fields by definition type). Spec: docs/superpowers/specs/2026-11-09-screen-savers-in-appearance-packages-design.md. Interfaces: {"produces": "`classicyZodType(schema: unknown): string | undefined` exported from ClassicySchemaFormFields.ts (reads `schema._zod?.def?.type ?? schema.def?.type`); `unwrapClassicySchemaField` and every field branch use it instead of `instanceof`."}

**Impact:** Part of moving the screen savers into the Appearance Package.

## Steps

### 1: Write the failing test

`renders every field of a schema built by another zod instance`: build `z.looseObject({ speed: z.number().min(1).max(10).default(5), trails: z.boolean().default(true), color: z.enum(["red","blue"]).default("red"), label: z.string().optional() })` with a zod module instance that is not the core's (import it through a distinct module id, e.g. `vi.importActual` of a re-export file under `src/__tests__/` with `vi.resetModules()`, or another route that makes `instanceof` against the core's `z` false; assert that precondition first), render `ClassicySchemaForm` and `ClassicyScreenSaverConfigForm` for a saver using it, and expect a slider, checkbox, pop-up and text field. Same test with the core's zod stays green.

### 2: Confirm it fails

Expected: the foreign-schema case renders no fields. Command: `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.foreignZod.test.tsx`

### 3: Implement `classicyZodType` and replace every `instanceof z.Zod*` in the three files

Implement `classicyZodType` and replace every `instanceof z.Zod*` in the three files

### 4: Confirm it passes, with the existing SchemaForm, Options-tab and config-form tests

Command: `pnpm exec vitest run src/SystemFolder/SystemResources/SchemaForm src/SystemFolder/Extensions/ScreenSaver src/SystemFolder/ControlPanels/AppearanceManager`

### 5: Commit

Command: `git commit -m "fix(schema-form): identify zod fields by definition type, not instanceof"`

## Acceptance Criteria

- [ ] VERIFY: The section's tests pass and `pnpm lint` and `pnpm exec tsc --noEmit -p .` are clean.

## Files

- `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.tsx` - modify
- `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields.ts` - modify
- `src/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm.tsx` - modify
- `src/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm.foreignZod.test.tsx` - modify

## Work Log
