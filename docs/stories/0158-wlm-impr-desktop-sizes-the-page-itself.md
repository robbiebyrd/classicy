---
id: 0158-wlm
title: The desktop fills the page without the host sizing html, body and its mount element
purpose: A host mounts the desktop and it fills the window, with no CSS to write.
type: impr
status: in_progress
priority: "1"
effort: S
created: "2026-11-06T20:03:49.422Z"
updated: "2026-11-06T20:03:56.889Z"
started: "2026-11-06T20:03:56.889Z"
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
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss
      - README.md
      - docs/AGENT-REFERENCE.md
      - docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# The desktop fills the page without the host sizing html, body and its mount element

## Problem Statement

Owner (2026-11-06): rather than documenting `html, body, #root { height: 100%; margin: 0; }`, Classicy should size the page itself. `ClassicyDesktop` is `height: 100%`, so with an unsized mount element the page is white with only a menu bar (found by 4.3's real host; 2.x behaved the same).

**Impact:** Every new host hits a blank page until they find the CSS.

## Steps

### 1: Failing check

A scratch host (the 4.3 recipe: Vite + React, both packed tarballs, mount element with no CSS) renders a desktop shorter than the viewport today; a Playwright check measures `.classicyDesktop` height against the viewport. Also a unit/CSS test on the compiled base stylesheet for the new rule.

### 2: Size the ancestors from Classicy's base layer

In a core SCSS compiled into `@layer classicy.base`, add zero-specificity rules: `:where(html, body)` and `:where(:has(.classicyDesktop))` (every ancestor of a desktop) get `height: 100%`, and body `margin: 0` (justify, or leave margin to the host). Any host rule (unlayered or in a host layer) still wins, so a host that sizes its own container keeps it; check an embedded desktop inside a fixed-size container is unchanged. Handle the browser floor: `:has()` is Firefox 121+, but the floor is Firefox 113: keep a non-`:has` fallback that still works for the common full-page case (e.g. `html, body` plus the desktop itself `min-height: 100dvh` only when it is a direct child of body or the mount element, or a JS-free alternative), or report the gap. No `!important`, no bare px, no literal colors.

### 3: Docs and parity

Remove the sized-container sentence from the release notes' Summary, README and AGENT-REFERENCE; add a release-note line that the desktop now sizes its page. Full parity round: Storybook stories render inside decorators, so any change there must be explained or prevented (scope the rule so Storybook's own wrappers are unaffected, or show AE 0).

## Acceptance Criteria

- [ ] VERIFY: A scratch host with no CSS of its own shows a desktop filling the viewport (Chromium, and Firefox if available); a host that sizes its container keeps its size.
- [ ] VERIFY: Parity 445/445 AE 0 (or every difference explained and accepted by the controller), no doc tells a host to size html/body/the mount element, full gate green.

## Files

- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss` - base-layer ancestor sizing

## Work Log
