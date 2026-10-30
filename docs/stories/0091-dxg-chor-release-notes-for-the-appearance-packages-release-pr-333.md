---
id: 0091-dxg
title: Release notes for the Appearance Packages release (PR 333)
purpose: Give hosts one place that lists every host-visible change in the Appearance Packages release before PR 333 merges.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-30T19:15:20.925Z"
updated: "2026-10-30T19:15:20.925Z"
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
      - README.md
      - docs/AGENT-REFERENCE.md
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# Release notes for the Appearance Packages release (PR 333)

## Problem Statement

The program's host-visible changes are scattered across the README breaking-change sections, AGENT-REFERENCE migration notes and part ledgers. PR 333 needs one release note before it merges. Items collected so far:
- the halftone breaking change;
- the Firefox tab-scrollbar fix;
- Part J's migration notes;
- the radio group's new default (rows);
- the removed art keys and the art-key union (E25);
- the glyph, role and caption changes;
- Part H's knob families and Options-tab groups;
- Part K's app identity overrides, including a one-time adapter snapshot-hash change on the first save after upgrade (K-R5) and the refusal of more invisible characters in display names;
- the Dependabot configuration;
- the CodeQL fixes.

The "white-follows-theme stripes" item is withdrawn (E25).

**Impact:** Without one note, hosts upgrading miss breaking changes.

## Steps

### 1: Collect

Walk every landed part's ledger, migration notes and README sections, and list each host-visible change with its migration step.

### 2: Write

Draft the release note: breaking changes first, then new APIs, then fixes.

### 3: Review

Check it against the merged diff of PR 333.

## Acceptance Criteria

- [ ] A release note lists every host-visible change of the program with its migration step, and the owner has reviewed it.

## Files

- `README.md` - breaking-change sections
- `docs/AGENT-REFERENCE.md` - migration notes

## Work Log
