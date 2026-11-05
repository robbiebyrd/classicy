---
id: 0088-sz9
title: Move structural declarations out of Platinum look mixins into base SCSS (Part B R10 follow-up)
purpose: 'Keep a component''s structure when no appearance package styles it: control boxes, menu dividers and depressable ::after geometry must not collapse with Platinum CSS off.'
type: impr
status: complete
priority: "3"
effort: M
created: "2026-10-30T03:00:59.046Z"
updated: "2026-11-05T00:51:28.615Z"
started: "2026-11-04T00:12:59.482Z"
completed: "2026-11-05T00:51:28.615Z"
tags:
  - follow-up
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/styles/_mixins.scss
      - storybook/.storybook/ClassicyAppearanceProbe.tsx
      - docs/AGENT-REFERENCE.md
  stories:
    - ["0049-cdo", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
---

# Move structural declarations out of Platinum look mixins into base SCSS (Part B R10 follow-up)

## Problem Statement

Part B ruling R10 left a few structural declarations inside Platinum's look mixins (`src/Appearance/Platinum/styles/_mixins.scss` and the component partials): window control-box `width`/`height`, menu-divider sizing and the depressable `::after` geometry. Base SCSS is supposed to carry structure and packages only the look. Part I's probe package (I 4.1, the `AppearanceHooks` stories) renders with Platinum CSS off, and these three surfaces collapse there; the probe note names this as a known caveat. Filed per Part I ruling 8.

**Impact:** A third-party appearance package must re-declare these structural sizes, or its windows, menus and depressable controls lose their geometry, which breaks the package contract that base SCSS carries structure.

## Steps

### 1: Inventory

List every structural declaration (box size, positioning, pseudo-element geometry that is not a look) still inside a `platinum-*` mixin or Platinum component partial, starting with the three named in R10.

### 2: Failing no-package test

Render a window, a menu with a divider and a depressable control under a package with empty CSS (as the I 4.1 probe does) and assert the structural sizes match Platinum's; it fails today.

### 3: Move into base

Move each declaration into the component's base SCSS (`@layer classicy.base`), keeping in the package layer every Platinum rule that must still override it. Update the `platinum.css.test.ts` mixin pins in the same commit.

### 4: Parity and docs

Every Storybook story compares AE 0 against a fresh baseline. Drop the R10 caveat from the probe note and update AGENT-REFERENCE's package-authoring section.

## Acceptance Criteria

- [x] A no-package render keeps control-box, menu-divider and depressable `::after` geometry (unit test).
- [x] No structural declaration named in Part B ruling R10 remains inside a Platinum look mixin.
- [x] Every pre-existing story compares AE 0, and the probe note no longer carries the R10 caveat.

## Files

- `src/Appearance/Platinum/styles/_mixins.scss` - drop structural declarations
- `storybook/.storybook/ClassicyAppearanceProbe.tsx` - drop the R10 caveat
- `docs/AGENT-REFERENCE.md` - package-authoring note

## Work Log

### 2026-11-03T23:47:01.060Z - Scheduled by the owner (2026-11-03). Wave 3: starts as soon as H 6.2b finishes, because it edits the Platinum styles 6.2b is rewriting; it lands after Part H.

### 2026-11-04T00:13:01.936Z - Wave 3 started in its own worktree from land/part-h 2b481f62b (Part H through 6.2b); it lands after Part H.

### 2026-11-05T00:51:06.533Z - Implemented (8fe6fb022 on fu/0088, from land/part-h 2b481f62b): control-box, windoid-box and menu-divider structure moved into base; with no package the boxes are 12x12 (were 13x0); ClassicyStructureWithoutPackage.test.tsx 7/7 (6/7 failed on the base). Parity: every non-probe shot pixel-identical, computed styles and forced states identical; the 23 probe shots differ only because the probe note reflows (identical with the new note on the old SCSS). 5 mutants killed. Accepted. Release note: hosts using the Platinum control-box or menu-divider mixins on their own elements must now set the sizes. The scroll-bar gutter stays in the package on purpose (Chromium's ::-webkit-scrollbar behavior).

### 2026-11-05T00:51:25.341Z - Landed as f2a30c37b with 0082-lgo (93aa968fe..ab8b7d0d0, pushed). Gate on 0afb185bc: 449 files / 5851 tests; parity 324/348 AE 0, the 24 being the ruled probe-note reflow. Complete.
