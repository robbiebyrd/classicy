---
id: 0213-tdy
title: 'System 7: Simple Beep rendered by the real square-wave synthesizer'
purpose: Follow-up from plan 0018-dbd (System 7 Appearance Package), Phase 6.
type: impr
status: pending
priority: "5"
effort: S
created: "2026-11-12T14:16:14.607Z"
updated: "2026-11-12T14:16:14.607Z"
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

# System 7: Simple Beep rendered by the real square-wave synthesizer

## Problem Statement

From plan 0018-dbd task 4.2: Simple Beep is a format 1 snd of square-wave synthesizer commands; the export mixes a sine and a square by the timbre value because Apple did not document the waveform between timbre 0 and 254.

**Impact:** Simple Beep's timbre approximates the original.

## Steps

### 1: Find the square-wave synthesizer's waveform (the 7.5.5 System's snth resource or Sound Manager source/disassembly, or a 

Find the square-wave synthesizer's waveform (the 7.5.5 System's snth resource or Sound Manager source/disassembly, or a recording from the emulator)

### 2: Render Simple Beep with it and compare against an emulator recording

Render Simple Beep with it and compare against an emulator recording

## Acceptance Criteria

- [ ] VERIFY: Simple Beep matches an emulator recording of the original within a stated tolerance, or the source of the waveform is documented.

## Files

- `packages/appearance/system7/bin` - modify

## Work Log
