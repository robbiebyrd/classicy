---
id: 0225-m4q
title: 'Windows 98 WIG audit: core follow-ups'
purpose: 'Give the Windows 98 Appearance Package the core behaviors and layout flags the Windows Interface Guidelines audit (docs/plans/windows-guidelines-audit.md) deferred, so the deferred findings close as the Platinum HIG audit''s did.'
type: feat
status: complete
priority: "3"
effort: L
created: "2026-11-24T23:50:00.000Z"
updated: "2026-11-25T23:00:00.000Z"
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
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
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
"Deferred and proposed core changes" (now "Core changes and what remains") with the finding that wants it and, where
one exists, the package rule written and waiting.

The Platinum audit (`docs/plans/hig-audit.md`) closed every deferred finding in
later stories; this story is the same closure for Windows 98.

## Steps

Every follow-up below was delivered on branch
`claude/macos-ui-components-audit-li9fxm` (PR #346), each as an optional layout
key only `windows98.json` declares, an optional prop or a class only the
Windows 98 package reads, so Platinum, System 7 and Storybook's `mirrored`
package draw and behave as before. The audit document,
`docs/plans/windows-guidelines-audit.md`, records every finding's status by
commit ("Status after the Windows 98 completion program").

### 1: Layout flags

- ✅ 6.5 `window.frameEdges: "move" | "resize"`: 2e45e70d8 (shell step 7).
- ✅ 6.6 `window.zoom: "standard" | "maximize"`: 4b8d16bef (shell step 6;
  Maximize takes the work area, desktop less the menu bar's and taskbar's
  bands), with `window.titleDoubleClick: "zoom"`.
- ✅ 7.6 / 14.4 `menuBar.idleTimeoutMs` (0 = never): 08d728581 (lane 2, L2-A).
- ✅ 7.10 / 6.2 / 8.7 `window.systemMenu: boolean`: 63ebc2f3f (shell step 9;
  Move and Close on a modal, Move, Size and Close on a palette).
- ✅ 7.12 `menu.submenuDelayMs`: 08d728581 (Windows 98 400).
- ✅ 7.15 `menu.shortcutSpelling: "glyphs" | "names"`: ce8bde683 (lane 2, L2-B).
- ✅ 7.21 `tree.keys: "windows"`: 3ed578659 (lane 2, L2-C).
- ✅ 7.27 `balloonHelp.placement: "anchor" | "pointer"`: 3ed578659.

### 2: Core behaviors

- ✅ 6.3 the title-bar icon's pop-up menu and double-click close: 63ebc2f3f.
- ✅ 6.10 snap-back during a live thumb drag (`scrollBar.liveSnapBack`,
  `snapBackScale`): 03c039b38 (lane 2, L2-D).
- ✅ 6.11 auto-scroll of a scroll area under a file drag: 03c039b38 (every
  package; Mac OS 8's and System 7's Finders did too).
- ✅ 6.12 / 6.13 the split box, closing a split by dragging to the end, the
  keyboard Split mode (ClassicySplitView `splittable`): 03c039b38.
- ✅ 7.5 press-drag-release on menu titles: 08d728581 (every package).
- ✅ 7.7 / 7.8 / 7.9 menu keyboard navigation (`menu.keys`), Escape by levels,
  Escape on a contextual menu, Shift+F10 and the context-menu key
  (`keyboard.contextMenuKey`): 08d728581, gated by lane 2's review 70494a489.
- ✅ 7.26 Up and Down Arrow on `ClassicySpinner`, and `wrap`: 3ed578659.
- ✅ 7.28 tooltips on the status area's icons, which replace the Control
  Strip's cells under the shell: b86689686 (shell step 13), 0c937b0e7 (step
  16, no strip drawn).
- ✅ 8.11 the file dialogs' last folder and the control panels' last tab for
  the session: d70d4c7aa (lane 2, L2-E).

### 3: Additive hooks still open

- ✅ 7.1 / 8.9 `accessKey` on menu items and control labels, the
  `data-classicy-part="access-key"` span the package underlines, with Alt+letter
  working (`menu.accessKeys`): ce8bde683, gated by 70494a489; push buttons, check
  boxes, option buttons, tabs and the bundled letters: 7470e0537 (lane 4, L4-H1).
- ✅ 7.25 `checkboxes` on a multiple-selection `ClassicyListBox`: 3ed578659.
- ✅ 6.4 / 13.8 `inactive` on trees, tables and icons from
  `ClassicyWindowActiveContext` (the list box keeps Hilight, as Windows'
  LISTBOX does): 3ed578659.
- ✅ 14.5 the meter's zones, drawn by the package from the zone classes the
  meter already carried (no core change needed): 3ed578659.

### 4: Product decisions and the chapters not yet audited

- ✅ 7.23 Windows 95's raised toolbar buttons in its preset and Windows 98's
  flat ones elsewhere, from a package knob (`toolbar.restBevel`; no core
  variant hook needed): 376c49cb5 (lane 2, L2-F).
- ✅ 14.3 High Contrast: a `forced-colors` block and the twelve High Contrast
  schemes (four schemes in three sizes) from Windows 98 SE's SHELL2.INF:
  376c49cb5.
- ✅ The chapters not yet audited: every remaining chapter and appendix (Ch.1,
  2, 4, 5, 9, 10, 11, 12 and Appendices A, B, D and E) is now in the audit
  document, 171 findings. Lane 4 (be51df8bd … 41de137d5, review 2b38e1f69),
  lane 3 (Windows 98 SE's art, 104ebd968, a206f0031, ced950214, 1c4f133f1,
  review cf4e1bc7a) and the shell (plan 0020-w98, steps 1–21 and E1–E4, with
  the integration's wiring of lane 4's modules, 3a30ada87 and 1ed1b21f7)
  closed 145 of them in full and 8 in part, and made one ➖ (1.20, the
  Control Strip's position, which has no surface under the shell).
- Not delivered: the shell addendum's section B requirements (B1, B3–B16,
  B18–B21, and the rest of B2 and B19), which own the 17 second-pass findings
  still open (4.13, 4.20, 4.21, 5.41, 5.42, 5.43, 9.4, 10.11, 10.12, 10.13,
  10.16, 10.17, 10.21, 10.24, 11.5, B.7, B.9) and the open halves of 1.6, 1.9,
  1.11, 4.4, 10.18, 12.1, A.10 and B.11. Reason, from the shell's step E4:
  "These are 21 separate shell requirements, each about the size of a plan
  step (several need new layout keys, new art assets or lane-2 menu
  infrastructure). They do not fit in this step's session alongside E4. Each
  still needs its own step; none is half-done in the tree." 6.9 stays a
  product decision (Windows 95/98's disabled bar kept over the 1995 text).

## Acceptance Criteria

- ✅ Each flag and behavior taken lands with a test, defaults to today's
  behavior, and leaves Platinum's and System 7's rendering unchanged (each
  lane's result records its isolation check and the other packages' test
  runs; the shell's step 21 shot the parity set). The changes every package
  sees are named in the audit and the release notes: one Help menu
  (ec433430a, as HIGOS8 p.92 and HIG7 p.125 have it), press-drag-release on
  menu titles and auto-scroll under a file drag.
- ✅ The package rule waiting on each hook landed in the same commit as the
  hook (7.1's underline in ce8bde683, 7.25's check boxes in 3ed578659).
- ✅ The audit document's findings flip from ⚠️ Deferred to 🔧 Fixed with the
  commit named, and its "Core changes and what remains" lists only what is
  still open.

## Files

- `src/Appearance/ClassicyAppearancePackageSchema.ts`,
  `src/Appearance/ClassicyAppearancePackage.ts` (the layout flags)
- `src/SystemFolder/SystemResources/Window/`, `Menu/`, `ScrollArea/`,
  `SplitView/`, `Spinner/`, `Tree/`, `BalloonHelp/`, `ControlStrip/`,
  `FileDialog/`, `Taskbar/`
- `packages/appearance/windows98/src/windows98.json`,
  `packages/appearance/windows98/src/styles/components/`
- `docs/plans/windows-guidelines-audit.md`, `docs/AGENT-REFERENCE.md`

## Work Log

- 2026-11-24: Opened from the audit's "Deferred and proposed core changes"
  (story 0223-ck1, PR #346).
- 2026-11-25: Delivered by the Windows 98 shell (plan 0020-w98) and lanes 2, 3
  and 4, merged into the PR branch (c8cfe6180) and wired (3a30ada87,
  1ed1b21f7, 29a022f86). Every step's item is done; the shell addendum's
  section B stays open with the reason above.
