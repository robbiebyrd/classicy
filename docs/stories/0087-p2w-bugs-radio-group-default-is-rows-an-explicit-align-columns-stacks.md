---
id: 0087-p2w
title: Radio group default is rows; an explicit align="columns" stacks
purpose: Make ClassicyRadioInput's default and its align prop work as documented, without changing how any existing radio group looks.
type: bugs
status: complete
priority: "3"
effort: XS
created: "2026-10-30T01:49:48.719Z"
updated: "2026-10-30T04:10:13.935Z"
started: "2026-10-30T01:50:14.508Z"
completed: "2026-10-30T04:10:13.935Z"
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
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss
      - src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx
      - docs/AGENT-REFERENCE.md
  stories:
    - ["0086-u2p", "depends"]
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Radio group default is rows; an explicit align="columns" stacks

## Problem Statement

`ClassicyRadioInput` documents `align="columns"` (stacked) as its default (`ClassicyRadioInput.tsx:108`), but `.classicyRadioInputGroupColumns { flex-direction: column }` comes BEFORE `.classicyRadioInputGroup { flex-direction: row }` at equal specificity (`ClassicyRadioInput.scss:1-10`), so every group renders in rows and `align="columns"` never works. Found by the Part J final review (ui minor 3). Owner decision (2026-10-30): keep today's look. The default becomes `"rows"`, the CSS order is fixed so an explicit `align="columns"` stacks, and the story and docs say rows is the default.

**Impact:** A host that asks for a stacked radio group gets a row. The Storybook story and the docs describe a default that never renders.

## Steps

### 1: Failing tests

A compiled-CSS test shows the columns rule wins over the group rule (it follows it, or has higher specificity). A render test shows the default group has no columns class and `align="columns"` adds it.

### 2: Fix default and CSS order

Change the `align` default to `"rows"`, and move `.classicyRadioInputGroupColumns` after `.classicyRadioInputGroup` (or write it as `:where(.classicyRadioInputGroup).classicyRadioInputGroupColumns`). Update the story comments, the story args and AGENT-REFERENCE. Parity: every radio-using story and app screen stays AE 0.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/RadioInput
- [x] Every existing radio group renders identically (AE 0 on controls-radioinput--* and the post-b stories that contain radio groups), and an explicit align="columns" stacks.

## Files

- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.tsx` - default align rows
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss` - columns rule after the group rule
- `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.stories.tsx` - story args and comments
- `docs/AGENT-REFERENCE.md` - documented default

## Work Log

### 2026-10-30T03:10:52.788Z - Implemented on fix/tooling-typecheck (8e0044bfb): align defaults to "rows", columns rule ordered after the group rule so align="columns" stacks; old Columns story renamed Default, new Columns story stacks; docs updated. Every existing radio story AE 0; the new Columns story is an intended change (no valid baseline).
