# Mac OS 8 Human Interface Guidelines — Classicy Compliance Audit

_Last updated: 2026-10-13_

## About this document

This is a recurring compliance audit of the Classicy component library against
Apple's **Mac OS 8 Human Interface Guidelines** (the "Platinum" HIG). It records,
per HIG chapter, the normative rules that apply to Classicy, the current state of
each, and the fixes applied.

### Sources

| Short name | Document | Role |
| --- | --- | --- |
| **HIGOS8** | _Mac OS 8 Human Interface Guidelines_, Apple Computer, 1997 (`resources/Apple_HIGOS8_Guidelines.pdf`, 142 pp.) | **Authoritative.** Supersedes HIGOS7 wherever they conflict. |
| **HIGOS7** | _Macintosh Human Interface Guidelines_, Apple Computer, 1995 (410 pp.) | Baseline. Fills in detail HIGOS8 omits (menu naming, Edit-menu items, ellipsis, scroll bars, text-entry behavior). |

### Citation scheme

Findings cite **HIGOS8 by chapter, topic, and page** — e.g. `HIGOS8 Ch.2 "Push
Buttons" (p.21)` — because that is self-documenting and survives in the repo.
HIGOS7 topics are cited by name. Earlier passes used sparse `HIG #N` numbers
(e.g. `#5`, `#15`, `#16`, `#187`, `#209`) from a checklist that was never
committed; those numbers are preserved where already in the code but are not
extended. `audit ch. N §M` in code comments refers to HIGOS8 chapters.

### Web-platform adaptations (intentional deviations, NOT findings)

Classicy runs in a browser, so a few HIG rules are deliberately adapted. These
are correct and must be preserved:

- **Close/Quit use ⌥W / ⌥Q, not ⌘W / ⌘Q.** In a browser ⌘W closes the tab and
  ⌘Q quits the browser, so those combinations can never reach the app. Control
  panels and apps surface Option-based equivalents instead (see `audit ch. 6 §35`).
- **⌘-based shortcuts** that the browser does not reserve (⌘Z/X/C/V/A in text
  fields) are used as the HIG specifies.

### Status legend

- ✅ **Compliant** — already conforms, no change needed.
- 🔧 **Fixed** — deviation found and corrected in this pass (commit cited).
- ⚠️ **Deferred** — real deviation, but out of scope for a code fix (needs art,
  product decision, or a larger refactor); tracked for a later pass.
- ➖ **N/A** — HIG feature with no Classicy surface.

---

## Chapter 2 — Control Guidelines

Normative checklist (HIGOS8 Ch.2) and component mapping:

| Control | HIG rule (summary) | Classicy component | Status |
| --- | --- | --- | --- |
| Push Buttons (p.21) | Min width (OK/Cancel 58×20px); default ring (outset 3px); normal/pressed/disabled; Return/Enter = default; ⌘. / Esc = Cancel; 8-tick highlight on key activation; ≥8px text-to-edge | `Button/` | _pending_ |
| Radio Buttons (p.24) | Groups of 2–7; exactly one on; on/off/mixed; click label activates; never initiates action | `RadioInput/` | _pending_ |
| Pop-Up Menu Buttons (p.26) | Shows current selection; double triangle; checkmark on current item; menu width ≥ widest label | `PopUpMenu/` | _pending_ |
| Checkboxes (p.27) | on/off/mixed; checkmark (or localizable X); avoid negative labels; click label toggles | `Checkbox/` | _pending_ |
| Bevel Buttons (p.29) | Bevels 2/3/4px (small/med/large); 7 states; can act as push/radio/checkbox/pop-up | `BevelButton/` | _pending_ |
| Sliders & Tick Marks (p.34) | Horizontal/vertical; directional or nondirectional indicator; ghost indicator; labeled ticks; live drag; not a scroll bar substitute | `Slider/` | _pending_ |
| Little Arrows (p.35) | Two opposed arrows; labelled; click = ±1 unit; press-hold auto-repeats; highlight while pressed | `TimePicker/ClassicyLittleArrows` | _pending_ |
| Clock Controls (p.36) | Edit-text + little arrows; ↑/↓ keys inc/dec focused field; can be inactive (display-only) | `DatePicker/`, `TimePicker/` | _pending_ |
| Disclosure Triangles (p.37) | Right = closed, down = open; ⌘→ opens / ⌘← closes in list views; rotate reveals detail | `Disclosure/`, `Triangle/` | _pending_ |
| List Boxes & Frames (p.39) | 2px frame; white bg; arrow-key nav; type-selection | `ListBox/` | _pending_ |
| Scroll Bars (p.40) | Position (not settings); solid-black active arrows; indicator uses accent color | `Window/` scrollbars | _pending_ |
| Edit Text Fields (p.41) | 2px frame; enabled/disabled; focus ring; password support | `Input/`, `TextEditor/`, `RichTextEditor/` | _pending_ |
| Static Text Fields (p.42) | Active vs disabled appearance | `ControlLabel/`, `Output/` | _pending_ |
| Tab Controls (p.42) | One row along top; 12/10pt labels; tucked 1px (panel) or inset 2px (modal dialog); global vs per-pane controls clearly labelled | `Tabs/` | _pending_ |
| Placards (p.46) | normal/pressed/disabled; info panel, bottom-left near h-scrollbar | `Placard/` | _pending_ |
| Image Wells (p.47) | 2px recessed frame; white fill; enabled/selected; drag-drop target; not a button | `ImageWell/` | _pending_ |
| Group Boxes (p.47) | Primary = 2px etched; secondary = 1px; titles: none/text/pop-up/checkbox | `ControlGroup/`, `Form/` | _pending_ |
| Separator Lines (p.50) | 2px engraved (line pixel + engrave pixel) | `Separator/` | _pending_ |
| Window Headers (p.50) | Beveled rectangle; list-view variant drops the content divider | `Window/` | _pending_ |
| Modeless Dialog Frames (p.51) | 2px border; active/inactive states | `Window/` | _pending_ |
| Progress Indicators (p.52) | Determinate (L→R) vs indeterminate (spinning striped cylinder); fixed height; switch indet→det when scope known; async/chasing arrows for background work | `ProgressBar/`, `Spinner/` | _pending_ |

### Findings — Chapter 2

_To be filled during the Chapter 2 audit._

---

## Chapter 3 — Dialog Box Guidelines

Normative checklist (HIGOS8 Ch.3):

- **Five types** (p.57): movable modal (preferred modal; title bar, no close/zoom
  box), modal (no move/resize, placard bg, beep on outside click), movable alert
  (red title-bar highlights), modal alert (red border around placard), modeless
  (close box far left, collapse box far right; title = menu item name w/o ellipsis).
- **Alert boxes** (p.60): icon + text + buttons only; ≤4 buttons (OK, Cancel, Help,
  one optional); **note** = talking-face icon, OK only; **caution** = warning
  triangle, OK/Continue + Cancel (OK default unless destructive → Cancel default);
  **stop** = octagon/hand, OK only; bold label + plain narrative.
- **Keyboard nav & focus** (p.66): Tab / Shift-Tab cycle; one focus ring at a time
  (lavender default); no ring needed if only one input.
- **Layout** (p.67): ≥4px between clickable items (6px preferred for focus rings);
  ≥4px item-to-edge; 16px between control groups; push button height 20px,
  OK/Cancel 58×20px, ≥8px text-to-edge inside a button; horizontally-placed
  buttons 12px apart and 12px from dialog edge; vertically stacked 10px apart;
  default = most likely action; action buttons lower-right (Western reading order).

### Findings — Chapter 3

_To be filled during the Chapter 3 audit._

---

## Chapter 4 — Menu Guidelines

Normative checklist (HIGOS8 Ch.4 + HIGOS7 menu detail):

- **Menu bar** (p.91): 3D Apple logo, beveled, etched dividers; Preferences at the
  **bottom of the Edit menu**; extended modifiers (⌃⇧⌥ + ⌘) with glyphs.
- **Help menu** (p.91): standard title, always the **rightmost** menu; items in
  order — About Help, Show Balloons, Help (current app), Shortcuts (current app).
- **Sticky menus** (p.92): click < double-click interval → menu sticks; press-hold
  → traditional; click item selects & closes; click outside closes w/o selection;
  command key closes & executes; auto-close after 15s.
- **Contextual menus** (p.93): ⌃-click / right-click; **never contain a command
  absent from the menu bar**; first item always Help (disabled if none, but shown);
  no default item; keep short, submenus ≤1 level.
- **HIGOS7 item detail**: trailing ellipsis (…) on commands that need more input
  before acting; standard Edit menu order Undo · [sep] · Cut/Copy/Paste/Clear ·
  Select All; dimmed (disabled) items; checkmark vs dash.

### Findings — Chapter 4

_To be filled during the Chapter 4 audit._

---

## Chapter 5 — Window Guidelines

Normative checklist (HIGOS8 Ch.5):

- **Platinum windows** (p.99): active window = darker frame + accent color;
  inactive = flat light-gray, receding; controls (close/size/zoom/collapse/scroll)
  beveled & highlighted; movable by dragging the drag region (gray frame).
- **Control placement** (p.101): **close box on the LEFT** of the title bar; **zoom
  box and collapse box on the RIGHT**, with the **zoom box just to the left of the
  collapse box**.
- **Collapsing / window-shade** (p.103): collapse box hides content, keeps title
  bar; click again restores; collapse/expand sound (user-disable via Appearance);
  ⌥-click collapse = collapse/expand ALL windows; optional double-click title bar
  to collapse.
- **Zoom boxes** (p.104): zoom to **ideal size**, toggling back to user size (NOT
  maximize); full / horizontal / vertical variants.
- Accent color affects scroll indicators, progress indicators, slider indicators,
  focus rings.

### Findings — Chapter 5

_To be filled during the Chapter 5 audit._

---

## Chapter 6 — Control Panel Guidelines

Normative checklist (HIGOS8 Ch.6):

- **Window** (p.109): one window = a modeless dialog box; preferred max 400×300,
  absolute max 492×340; must have a close box; **closing the window quits the
  control panel**.
- **Standard menus** (p.118): control panels are applications and generate their
  own menu bar (use custom menus sparingly):
  - **Apple**: `About <Panel Name>` as the first item.
  - **File**: `Close Window` (⌘W) and, as the final item, `Quit` (⌘Q) **always
    preceded by a separator**. Add `Save Settings` (⌘S) / `Revert to Saved
    Settings` only if the panel requires an explicit global save.
  - **Edit**: `Undo` (⌘Z) + separator; `Cut`/`Copy`/`Paste`/`Clear` (+ `Select All`)
    only when the panel has edit-text fields; `Preferences` last, preceded by a
    separator, only if it can't be a window button.
- **Settings** (p.122): changes take effect **immediately** unless disruptive;
  settings saved automatically on quit unless complicated/technical (then explicit
  Save/Revert + confirm-on-quit).
- **Multi-pane** (p.110): tabs / push buttons / scrolling icon list / pop-up menu.
- **Expand/contract** (p.115): labelled disclosure triangle (expands downward) or
  Show/Hide push button.
- **Assistance** (p.125): Help (?) button, help balloons, scriptable.

> Classicy adapts ⌘W/⌘Q to ⌥W/⌥Q (see web-platform note above).

### Findings — Chapter 6

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 6.1 | HIGH | Screen Saver panel had no `About` command or About box (never brought into the earlier §35 pass) | `ScreenSaverManager` | 🔧 Fixed |
| 6.2 | HIGH | Screen Saver panel lacked an Edit menu despite having edit-text fields (timeout spinner, options form) | `ScreenSaverManager` | 🔧 Fixed |
| 6.3 | MEDIUM | Screen Saver File menu lacked `Close Window` + the required divider before `Quit` | `ScreenSaverManager` | 🔧 Fixed |
| 6.4 | MEDIUM | Drive Setup File menu lacked `Close Window` (the `windowClose` handler was built but unused) | `DriveSetup` | 🔧 Fixed |
| 6.5 | MEDIUM | Sound panel shipped per-sound disable checkboxes bound to the global `"*"` flag — inert, labelled "not currently connected" | `SoundManager` | 🔧 Fixed |
| 6.6 | LOW | Drive Setup `Quit` lacked the `⌥Q` equivalent used by peer panels | `DriveSetup` | 🔧 Fixed |
| 6.7 | LOW | Drive Setup window was `collapsable` while every other panel is not | `DriveSetup` | 🔧 Fixed |
| — | — | ⌥W/⌥Q (vs ⌘W/⌘Q) on Close/Quit | all panels | ✅ Intentional web adaptation (see top) |

**Details & fixes**

- **6.1–6.3** (`ScreenSaverManager.tsx`): added `useClassicyAboutMenu`,
  `useClassicyEditMenu`, and `useClassicyWindowClose`; the File menu now reads
  `About Screen Saver` · `Close Window (⌥W)` · `—` · `Quit (⌥Q)`, an `Edit` menu
  is appended, and `{aboutWindow}` is rendered. Locked in by a new
  `ClassicyScreenSaverManager.hig.test.tsx`.
  _HIGOS8 Ch.6 "Standard Menus" (p.118), "The About Box" (p.126)._
- **6.4, 6.6, 6.7** (`DriveSetup.tsx`): `Close Window (⌥W)` inserted before the
  divider; `Quit` given `⌥Q`; `collapsable={false}` for family consistency.
  _HIGOS8 Ch.6 "Standard Menus" (p.118)._
- **6.5** (`SoundManager.tsx`): each per-sound checkbox now binds
  `checked={!disabled.includes("*") && !disabled.includes(item.id)}`. Playback
  already honoured per-sound entries (`playerCanPlayInterrupt`), so the control
  is now genuinely functional and applies immediately; the "not currently
  connected" notice and stale TODO were removed. _HIGOS8 Ch.6 "Settings" (p.122)._

**Verified already-compliant:** Appearance, Sound, and Date & Time panels'
window chrome (`resizable=false`, within the 492×340 ceiling, close box present),
immediate settings application, and the existing §35 / #209 About-hoist work.

---

## Summary

_Counts and commit references filled on completion._
