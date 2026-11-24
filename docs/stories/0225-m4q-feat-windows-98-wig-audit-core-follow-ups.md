---
id: 0225-m4q
title: 'Windows 98 WIG audit: core follow-ups'
purpose: 'Give the Windows 98 Appearance Package the core behaviors and layout flags the Windows Interface Guidelines audit (docs/plans/windows-guidelines-audit.md) deferred, so the deferred findings close as the Platinum HIG audit''s did.'
type: feat
status: ready
priority: "3"
effort: L
created: "2026-11-24T23:50:00.000Z"
updated: "2026-11-24T23:50:00.000Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0223-ck1", "depends"]
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

# Windows 98 WIG audit: core follow-ups

## Problem Statement

The audit of `@classicy/appearance-windows98` against Microsoft's _Windows
Interface Guidelines_ (1995), `docs/plans/windows-guidelines-audit.md`, fixed
every deviation a package stylesheet or its theme data can fix, and landed the
small additive core hooks a package rule was waiting on (a state class, a part,
a custom property). What remains deferred needs behavior or structure only the
core owns: layout flags a package declares and the core reads, and behaviors
with no package surface at all. Each is recorded in the audit document's
"Deferred and proposed core changes" with the finding that wants it and, where
one exists, the package rule written and waiting.

The Platinum audit (`docs/plans/hig-audit.md`) closed every deferred finding in
later stories; this story is the same closure for Windows 98.

## Steps

### 1: Layout flags

Declared by `windows98.json`, read by the core through
`useClassicyAppearanceLayout` / `getClassicyAppearanceLayout`, validated by
`ClassicyAppearanceLayoutSchema`, each defaulting to today's behavior so
Platinum and System 7 change nothing:

- 6.5 `window.frameEdges: "move" | "resize"` (the frame's edges resize the
  window, with the resize cursors, as Windows' sizing border does).
- 6.6 `window.zoom: "standard" | "maximize"` (zoom fills the desktop under
  the menu bar).
- 7.6 / 14.4 `menuBar.idleTimeoutMs` (0 = never close an untouched menu).
- 7.10 / 6.2 / 8.7 `window.systemMenu: boolean` (Restore, Move, Size,
  Minimize, Maximize, Close on the title bar's and the title-bar icon's
  secondary click; Move and Close for modal and utility windows).
- 7.12 `menu.submenuDelayMs` (a hover-opened submenu's show and hide delay).
- 7.15 `menu.shortcutSpelling: "glyphs" | "names"` (`Ctrl+`, `Alt+`, `Shift+`
  in `ClassicyKbd`'s inline variant).
- 7.21 `tree.keys: "windows"` (a bare Right Arrow expands, Left collapses).
- 7.27 `balloonHelp.placement: "anchor" | "pointer"` (the tip below-right of
  the pointer, hidden on click).

### 2: Core behaviors

- 6.3 the title-bar icon's pop-up menu and double-click close.
- 6.10 snap-back during a live thumb drag past the bar's thickness.
- 6.11 auto-scroll of a scroll area under a file drag near its edge.
- 6.12 / 6.13 a split box at the end of a pane's scroll bar; closing a split
  by dragging to the end; a Split command driven by the arrow keys, Enter and
  Escape.
- 7.5 press-drag-release on menu titles (Mac OS 8 wants it too).
- 7.7 / 7.8 / 7.9 menu keyboard navigation with roving focus, Escape by
  levels, Escape closing a contextual menu, Shift+F10 and the ContextMenu key.
- 7.26 Up and Down Arrow on `ClassicySpinner`, and a `wrap` prop.
- 7.28 tooltips on the Control Strip's unlabeled cells.
- 8.11 the file dialogs' last directory and the control panels' last tab kept
  for the session.

### 3: Additive hooks still open

- 7.1 / 8.9 `accessKey` on menu items and control labels, rendered as a
  `data-classicy-part="access-key"` span the package underlines (deferred with
  the Mac keyboard adaptation: an underline that activates nothing misleads
  until Alt+letter works).
- 7.25 a `checkboxes` opt-in on a multiple-selection `ClassicyListBox`.
- 6.4 / 13.8 `inactive` on list boxes, tables and trees from
  `ClassicyWindowActiveContext` (a product decision first: Windows' own
  LISTBOX keeps its highlight unfocused).
- 14.5 a zone state or part on `ClassicyMeter`.

### 4: Product decisions and the chapters not yet audited

- 7.23 flat toolbar buttons (Windows 98's) against Figure 7.34's raised ones
  for a Windows 95 preset (needs a core variant hook).
- 14.3 High Contrast: a `forced-colors` block and the four High Contrast
  schemes as presets.
- Chapters 4, 5, 10 and 12 of the WIG (input, interaction techniques, system
  integration, user assistance): Ch.5's selection and transfer feedback and
  Ch.12's tooltip rules have a package surface.

## Acceptance Criteria

- Each flag and behavior taken lands with a test, defaults to today's behavior,
  and leaves Platinum's and System 7's rendering unchanged (the parity shots).
- The package rule waiting on each hook lands in the same release
  (`docs/plans/windows-guidelines-audit.md`, "Next pass").
- The audit document's finding flips from ⚠️ Deferred to 🔧 Fixed with the file
  named, and the "Deferred and proposed core changes" list shrinks to what is
  still open.

## Files

- `src/Appearance/ClassicyAppearancePackageSchema.ts`,
  `src/Appearance/ClassicyAppearancePackage.ts` (the layout flags)
- `src/SystemFolder/SystemResources/Window/`, `Menu/`, `ScrollArea/`,
  `SplitView/`, `Spinner/`, `Tree/`, `BalloonHelp/`, `ControlStrip/`,
  `FileDialog/`
- `packages/appearance/windows98/src/windows98.json`,
  `packages/appearance/windows98/src/styles/components/`
- `docs/plans/windows-guidelines-audit.md`, `docs/AGENT-REFERENCE.md`

## Work Log

- 2026-11-24: Opened from the audit's "Deferred and proposed core changes"
  (story 0223-ck1, PR #346).
