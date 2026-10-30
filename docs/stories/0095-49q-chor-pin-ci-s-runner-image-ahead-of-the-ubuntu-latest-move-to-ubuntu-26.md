---
id: 0095-49q
title: Pin CI's runner image ahead of the ubuntu-latest move to Ubuntu 26
purpose: Keep CI reproducible when GitHub moves ubuntu-latest to Ubuntu 26.
type: chor
status: pending
priority: "3"
effort: XS
created: "2026-10-30T19:15:34.073Z"
updated: "2026-10-30T19:15:34.073Z"
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
      - .github/workflows/ci.yml
      - .github/workflows/push.yml
      - .github/workflows/pages.yml
      - .github/workflows/pr-preview.yml
progress:
  "1":
    status: pending
  "2":
    status: pending
---

# Pin CI's runner image ahead of the ubuntu-latest move to Ubuntu 26

## Problem Statement

GitHub annotates runs: "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026." All four workflows use `runs-on: ubuntu-latest`. CI deliberately uses the distro ffmpeg package (CLAUDE.md), whose version changes with the image.

**Impact:** Builds can change under us with no commit, including audio sprite generation.

## Steps

### 1: Pin or verify

Pin `ubuntu-24.04` or move to Ubuntu 26 deliberately: run CI, build:audio and the Pages deploy on the new image, then switch.

### 2: Document

Record the choice in the workflow comments.

## Acceptance Criteria

- [ ] Every workflow names an explicit runner image, and CI is green on it.

## Files

- `.github/workflows/ci.yml` - runs-on
- `.github/workflows/push.yml` - runs-on
- `.github/workflows/pages.yml` - runs-on
- `.github/workflows/pr-preview.yml` - runs-on

## Work Log
