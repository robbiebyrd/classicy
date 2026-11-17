---
id: 0217-etx
title: 'System 7: windows and dialogs match the 7.5 references'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), task 5.2 verification.
type: impr
status: pending
priority: "4"
effort: M
created: "2026-11-17T09:19:06.271Z"
updated: "2026-11-17T09:19:06.271Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  plans:
    - ["0018-dbd", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
---

# System 7: windows and dialogs match the 7.5 references

## Problem Statement

The 5.2 verification compared every System 7 window, scroll-bar, dialog and alert story with the 7.5 references and confirmed 17 mismatches: the title bar's title gap (with no zoom box, and when the leftover width is odd), the scroll-bar track pattern's phase, the Views window's zoom box, the Standard File pop-up's width and contents, dimmed rows' icons, folder icon and volume name placement, the Save box name field, the alert text block, alert and button widths, the Copy dialog's Stop button and the fixed modal's button column.

## Steps

### 1: Title bar

The title and its stripe gap match 7.5 in every box combination.

### 2: Scroll bars and windows

Track pattern phase and the Views window frame match.

### 3: Standard File and Save

Pop-up, list rows, volume name and name field match.

### 4: Alerts and dialogs

Text block, widths, Stop button and button column match.

## Acceptance Criteria

- [ ] [MANUAL] Each verified finding is fixed (its part AE 0 against the 7.5 reference, text by eye) or the report gives the specific technical reason it cannot be, Platinum and core parity stay AE 0 except shots the report names, and the full gate passes.

## Work Log
