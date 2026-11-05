---
id: 0091-dxg
title: Release notes for the Appearance Packages release (PR 333)
purpose: Give hosts one place that lists every host-visible change in the Appearance Packages release before PR 333 merges.
type: chor
status: complete
priority: "2"
effort: S
created: "2026-10-30T19:15:20.925Z"
updated: "2026-11-05T00:52:09.324Z"
started: "2026-11-05T00:51:46.819Z"
completed: "2026-11-05T00:52:09.324Z"
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
    status: complete
  "2":
    status: complete
  "3":
    status: complete
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

- [x] A release note lists every host-visible change of the program with its migration step, and the owner has reviewed it.

## Files

- `README.md` - breaking-change sections
- `docs/AGENT-REFERENCE.md` - migration notes

## Work Log

### 2026-11-05T00:51:49.078Z - Started 2026-11-04 after 0082/0088 and the scanner landed (ab8b7d0d0): release notes on fu/0091 -> docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md. Note written (367d6e631 on fu/0091: 54 breaking / 57 APIs / 14 fixes / 8 tooling) plus doc-mismatch fixes 148c3f347 (assets export, sound.pack action, encode-color name).

### 2026-11-05T00:51:51.128Z - Review: Needs fixes (5 Important, 6 Minor). Important #3 was a product regression: strict-CSP hosts lost the Platinum fonts (no static font CSS since fonts.css was removed). Controller ruling: emit a static dist fonts stylesheet + verify:dist invariant + docs in this fix round (filed as its own story). Fix round: fu/0091 rebased onto 52b917046 (after the spelling sweep; the note says the drag-end detail is { kind, dropped, canceled }); a0a9ac8a7 (dist/classicy-platinum.fonts.css, verify:dist invariant 12, CSP Playwright proof) + 7db14055d (note fixes); gate 450 files / 5897 tests. Re-review Approved.

### 2026-11-05T00:51:53.309Z - Landed 52b917046..06380274b (d8e82d6e8 note, 63b76fff8 doc fixes, a0a9ac8a7 CSP fonts stylesheet, 7db14055d note fix round, 06380274b invariant-12 own-file check).

### 2026-11-05T00:52:05.909Z - Approved by owner 2026-11-04 21:03 UTC (docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md at 67805920e). The later follow-ups (table-resize-cancel, drag-lost-detail, lost-callbacks, press-canceled, press-ends) added small release-note lines after this approval: point the owner at the 67805920e..c4cdae72b diff of that file. Complete.
