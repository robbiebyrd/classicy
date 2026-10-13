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
| Push Buttons (p.21) | Min width (OK/Cancel 58×20px); default ring (outset 3px); normal/pressed/disabled; Return/Enter = default; ⌘. / Esc = Cancel; 8-tick highlight on key activation; ≥8px text-to-edge | `Button/` | see Findings |
| Radio Buttons (p.24) | Groups of 2–7; exactly one on; on/off/mixed; click label activates; never initiates action | `RadioInput/` | see Findings |
| Pop-Up Menu Buttons (p.26) | Shows current selection; double triangle; checkmark on current item; menu width ≥ widest label | `PopUpMenu/` | see Findings |
| Checkboxes (p.27) | on/off/mixed; checkmark (or localizable X); avoid negative labels; click label toggles | `Checkbox/` | see Findings |
| Bevel Buttons (p.29) | Bevels 2/3/4px (small/med/large); 7 states; can act as push/radio/checkbox/pop-up | `BevelButton/` | see Findings |
| Sliders & Tick Marks (p.34) | Horizontal/vertical; directional or nondirectional indicator; ghost indicator; labeled ticks; live drag; not a scroll bar substitute | `Slider/` | see Findings |
| Little Arrows (p.35) | Two opposed arrows; labelled; click = ±1 unit; press-hold auto-repeats; highlight while pressed | `TimePicker/ClassicyLittleArrows` | see Findings |
| Clock Controls (p.36) | Edit-text + little arrows; ↑/↓ keys inc/dec focused field; can be inactive (display-only) | `DatePicker/`, `TimePicker/` | see Findings |
| Disclosure Triangles (p.37) | Right = closed, down = open; ⌘→ opens / ⌘← closes in list views; rotate reveals detail | `Disclosure/`, `Triangle/` | see Findings |
| List Boxes & Frames (p.39) | 2px frame; white bg; arrow-key nav; type-selection | `ListBox/` | see Findings |
| Scroll Bars (p.40) | Position (not settings); solid-black active arrows; indicator uses accent color | `Window/` scrollbars | see Findings |
| Edit Text Fields (p.41) | 2px frame; enabled/disabled; focus ring; password support | `Input/`, `TextEditor/`, `RichTextEditor/` | see Findings |
| Static Text Fields (p.42) | Active vs disabled appearance | `ControlLabel/`, `Output/` | see Findings |
| Tab Controls (p.42) | One row along top; 12/10pt labels; tucked 1px (panel) or inset 2px (modal dialog); global vs per-pane controls clearly labelled | `Tabs/` | see Findings |
| Placards (p.46) | normal/pressed/disabled; info panel, bottom-left near h-scrollbar | `Placard/` | see Findings |
| Image Wells (p.47) | 2px recessed frame; white fill; enabled/selected; drag-drop target; not a button | `ImageWell/` | see Findings |
| Group Boxes (p.47) | Primary = 2px etched; secondary = 1px; titles: none/text/pop-up/checkbox | `ControlGroup/`, `Form/` | see Findings |
| Separator Lines (p.50) | 2px engraved (line pixel + engrave pixel) | `Separator/` | see Findings |
| Window Headers (p.50) | Beveled rectangle; list-view variant drops the content divider | `Window/` | see Findings |
| Modeless Dialog Frames (p.51) | 2px border; active/inactive states | `Window/` | see Findings |
| Progress Indicators (p.52) | Determinate (L→R) vs indeterminate (spinning striped cylinder); fixed height; switch indet→det when scope known; async/chasing arrows for background work | `ProgressBar/`, `Spinner/` | see Findings |

### Findings — Chapter 2

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 2.1 | MEDIUM | On-state mark was reversed: `×` by default, checkmark only when `isDefault`. The checkmark is the standard mark; `×` is a localization opt-in. | `Checkbox` | 🔧 Fixed |
| 2.2 | LOW | Mixed state only painted its dash when also `:checked`; mixed is a distinct third state and must always show. | `Checkbox` | 🔧 Fixed |
| 2.3 | LOW | A radio group could render with zero buttons on when none was pre-marked. | `RadioInput` | 🔧 Fixed |
| 2.4 | LOW | Little-arrow buttons responded only to the mouse; Enter/Space did nothing. | `TimePicker/ClassicyLittleArrows` | 🔧 Fixed |
| 2.8 | MEDIUM | Multi-line edit field suppressed all focus indication (`outline:none;box-shadow:none`). | `TextEditor` | 🔧 Fixed |
| 2.9 | LOW | Static-text output had no disabled (dimmed) appearance. | `Output` | 🔧 Fixed |
| 2.11 | LOW | Edit fields rounded their corners on focus and carried an invalid `outline` shorthand; the Rich editor also grew by 2em margin+padding on focus. | `Input`, `RichTextEditor` | 🔧 Fixed |
| 2.12 | LOW | Table row selection used a fixed near-black instead of the Appearance selection color. | `Table` | 🔧 Fixed |
| 2.6 | MEDIUM | List box frame was a 1px bevel vs the documented 2px `--hig-frame-width`. | `ListBox` | 🔧 Fixed |
| 2.7 | MEDIUM | Edit-text frame was 1px vs the documented 2px `--hig-frame-width`. | `Input`,`TextEditor`,`RichTextEditor` | 🔧 Fixed |
| 2.5 | LOW | Pop-up list opens below/above the button rather than aligning the current item at the button level. | `PopUpMenu` | ⚠️ Deferred |
| 2.10 | LOW | Tab labels use the 14px app UI font, not the HIG 12pt/10pt sizes. | `Tabs` | ⚠️ Deferred |

**Details & fixes**

- **2.1/2.2** (`ClassicyCheckbox.scss`, `.tsx`): base `:checked` mark is now the
  checkmark `✓`; the `×` moved to an opt-in `.classicyCheckboxX` variant exposed
  via a new `mark?: "check" | "x"` prop; the mixed dash now paints on the class
  alone (compound selector wins on source order) so it shows whether or not the
  box is also checked. _HIGOS8 Ch.2 "Checkboxes" (p.27-28)._
- **2.3** (`ClassicyRadioInput.tsx`): initial selection falls back to the first
  button when none is pre-marked, and the native `<input>` is now controlled
  from the `check` state so the native checked state matches the Platinum ring.
  _HIGOS8 Ch.2 "Radio Buttons" (p.24)._ New test added.
- **2.4** (`ClassicyLittleArrows.tsx`): Enter/Space on a focused arrow steps the
  value (OS key-repeat handles holding). _HIGOS8 Ch.2 "Little Arrows" (p.35)._
- **2.8** (`ClassicyTextEditor.scss`): focus now draws an inset ring instead of
  suppressing all focus indication. _HIGOS8 Ch.2 "Edit Text Fields" (p.41)._
- **2.9** (`ClassicyOutput.tsx/.scss`): added a `disabled` prop that dims the
  field (and its label). _HIGOS8 Ch.2 "Static Text Fields" (p.42)._
- **2.11** (`ClassicyInput.scss`, `ClassicyRichTextEditor.scss`): focus keeps the
  field rectangular and drops the invalid `outline` shorthand; the Rich editor no
  longer reflows by 2em on focus. _HIGOS8 Ch.2 "Edit Text Fields" (p.41)._
- **2.12** (`ClassicyTable.scss`): selected rows use `--color-select` (matching
  `ClassicyTree`) so selection tracks the Appearance accent color. _HIGOS8 Ch.2._
- **2.6, 2.7** (`ClassicyListBox.scss`, `ClassicyInput.scss`,
  `ClassicyTextEditor.scss`, `ClassicyRichTextEditor.scss`): the list box and
  edit-text controls now carry the same 2px recessed frame as the image well
  (1px black border + a 2px **inset** bevel using `--hig-frame-width`), so they
  match the controls the token was designed for. Verified by screenshot against
  the ImageWell reference in Storybook (preinstalled Chromium): the frame reads
  as a proper Platinum recess and — because the extra depth is an `inset`
  box-shadow, not a wider border — there is **no layout shift**. _HIGOS8 Ch.2
  "List Boxes and Frames" (p.39), "Edit Text Fields and Frames" (p.41)._

**Deferred (recommended as a design-reviewed follow-up)**

- **2.5**: the current combobox-style drop is a reasonable, if non-literal,
  rendering; literal current-item alignment is a larger change for little gain.
- **2.10**: Classicy uses a consistent 14px UI type scale throughout; forcing
  12/10px tabs would clash with the app's own scale — needs a type-scale decision.

**Verified already-compliant:** Push Buttons (58×20 min, default ring, 3 states,
Return/Esc/⌘. delegated to the dialog layer), Bevel Buttons (2/3/4px bevels, all
seven states), Sliders (ghost indicator, labelled ticks, live drag), Pop-up
(current selection + double triangle + checkmark), Clock Controls, Disclosure
Triangles (right=closed/down=open, ⌘←/⌘→), Placard, Image Well, Group Boxes
(primary 2px etched / secondary 1px, all four title styles), Separator (2px
engraved), Progress Indicators (determinate / indeterminate / chasing arrows).

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

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 3.1 | HIGH | Alert focused the first button (Cancel in a caution alert) while the default ring was on Continue, so Return fired Cancel. | `Alert` + `useFocusTrap` | 🔧 Fixed |
| 3.2 | MEDIUM | The standard (movable-modal) file dialog rendered a title-bar close box. | `FileDialog` | 🔧 Fixed |
| 3.3 | MEDIUM | The About box had no default button and no key dismissed it. | `AboutWindow` | 🔧 Fixed |
| 3.4 | LOW | The "New Folder" prompt is a `ClassicyAlert` containing a text input — alerts may contain only icon/text/buttons. | `FileDialog` | ⚠️ Deferred |

**Details & fixes**

- **3.1** (`ClassicyAlert.tsx`, `useKeyboardEquivalents.ts`): `useFocusTrap` gained
  an `initialFocusRef`, and the alert now focuses the resolved default button on
  open so focus coincides with the default ring and Return activates the default.
  New test: a caution alert focuses Continue, not Cancel. _HIGOS8 Ch.3 "Keyboard
  Navigation and Focus" (p.66), "Default Buttons" (p.23)._
- **3.2** (`ClassicyFileDialog.tsx`): the window is now `closable={false}` (no
  close box). Because the window couples close-box rendering to modal-Escape
  (`onModalCancel` only cancels when closable), Escape/⌘-period cancel is handled
  by an inner, `open`-gated `useKeyboardEquivalents` on the dialog body — it fires
  before the window's handler and `preventDefault`s the beep (the same pattern
  alerts use). The existing "cancels on Escape" test still passes. _HIGOS8 Ch.3
  "Movable Modal Dialog Boxes" (p.59)._
- **3.3** (`ClassicyAboutWindow.tsx`): OK is now the default button and Return /
  Escape dismiss the box (routed through the OK button's own click). New tests.
  _HIGOS8 Ch.3 (p.23/p.57)._

**Deferred**

- **3.4**: turning the New Folder prompt into a proper movable-modal dialog
  (edit field + Cancel/Create) is a self-contained follow-up; it currently works
  as an alert-with-input, which is the HIG-shape violation to revisit.

**Verified already-compliant:** the `--hig-*` spacing tokens (12px button gap,
10px vertical stack, 12px dialog edge, 4/6/16px item/focus/group gaps, 20px
button height, 58px OK/Cancel, 3px default ring, 8px text padding); alert
severity icons (note=info, caution=triangle, stop=octagon); right-aligned button
rows with the default rightmost; the Replace caution alert making Cancel the
default per the data-loss rule; Tab/Shift-Tab focus trapping; movable alerts'
red title bar vs non-movable alerts' red content border.

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

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 4.1 | MEDIUM | The standard Edit-menu builder had no way to place a Preferences command at the bottom (OS 8 standardized that position). | `useClassicyEditMenu` | 🔧 Fixed |
| 4.5 | LOW | Menu items supported only a boolean checkmark — no dash for a partial/mixed attribute. | `ClassicyMenu` | 🔧 Fixed |
| 4.4 | LOW | "About This Computer" carried an invented `⌃S` keyboard equivalent. | `AppManager` systemMenu | 🔧 Fixed |
| 4.2 | MEDIUM | Close/Quit display `⌥W`/`⌥Q` rather than `⌘W`/`⌘Q`. | all control panels | ✅ Intentional (web adaptation) |
| 4.3 | LOW | "About Balloon Help…" carries a trailing ellipsis though it only opens an info window. | Help menu | ✅ Matches shipped OS 8.0 |
| 4.6 | LOW | Edit-menu Undo is always enabled and never names the action. | `useClassicyEditMenu` | ⚠️ Deferred |

**Details & fixes**

- **4.1** (`ClassicyAppMenuHooks.tsx`): `useClassicyEditMenu(idPrefix,
  preferencesItem?)` now appends a divider + the supplied Preferences item at the
  bottom of the Edit menu. Additive — existing callers are unchanged. _HIGOS8
  Ch.4 "Menu Bar Changes" (p.91)._
- **4.5** (`ClassicyMenu.tsx`): `checked` widened to `boolean | "mixed"`; a mixed
  item renders the HIG dash (–). _HIGOS7 "Checkmarks and Dashes in Menus"._
- **4.4** (`ClassicyAppManager.ts`): removed the invented `⌃S` from the Apple-menu
  About item (real Mac OS has none); the chord is no longer registered. Menu-bar
  test updated to assert its absence. _HIGOS8 Ch.4._

**Intentional / not changed**

- **4.2**: `⌥W`/`⌥Q` is the documented web adaptation (⌘W/⌘Q are browser-reserved)
  — see the web-platform note at the top.
- **4.3**: Mac OS 8.0 actually shipped "About Balloon Help…" with the ellipsis, so
  this is kept to match the real OS (and existing tests assert it). The HIG-prose
  "no ellipsis on info windows" rule yields to the shipping-OS precedent here.

**Deferred**

- **4.6**: a context-aware "Undo <action>" / dimmed "Can't Undo" rides the
  browser's native field undo, which doesn't expose the pending action; a
  faithful relabel needs an undo model and is out of scope for this pass.

**Verified already-compliant:** sticky-menu behavior (click-to-open, click-out
dismiss, 15s auto-close), Edit-menu item set & order, keyboard-glyph formatting
and modifier order (⌃⌥⇧⌘), dimmed disabled items, contextual-menu offset /
overflow-flip / mandatory disabled Help first item / no default item / no
cross-activation, HIG #209 About-in-Apple-menu hoisting, ellipsis present on
"Open…/Save As…" and absent on About/Close/Quit.

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

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 5.1 | MEDIUM | A full zoom filled the whole desktop (maximize) rather than zooming to an ideal/standard size. | `Window` | 🔧 Fixed |
| 5.2 | LOW | Platinum scroll arrows render grouped at one end rather than split to opposite ends. | `AppearanceManager/scrollbars.scss` | ⚠️ Deferred |

**Details & fixes**

- **5.1** (`ClassicyWindow.tsx`): the HIG is explicit that an app "should never
  simply assume that the standard state should be as large as the screen."
  `computeStandardRect`'s full-zoom branch now (a) uses a new optional
  `idealSize` prop when provided, else (b) fits the current content (inner scroll
  extent + the window's chrome), and only (c) falls back to filling the desktop
  when no usable measurement exists — all clamped to `[minimum, desktop]`. The
  un-zoom restore path is unchanged. New test. _HIGOS8 Ch.5 "Zoom Boxes" (p.104)._

**Deferred**

- **5.2**: both scroll arrows are declared on `::-webkit-scrollbar-button:start`,
  so they stack at one end. Splitting them to opposite ends is constrained by
  WebKit's pseudo-element model, and the grouped arrangement is itself a
  legitimate (if non-default) Platinum Appearance option — low value, revisit
  with the broader scrollbar styling.

**Verified already-compliant:** close box on the LEFT; zoom box on the RIGHT just
left of the collapse box; title-bar pinstripes only when active; inactive windows
dim their controls/title and flatten scroll bars; the collapse box (plus
option-click-all and double-click-title) reduces the window to its title bar;
un-zoom restores the pre-zoom user rect; the grow handle sits bottom-right; scroll
bars render on the right and bottom.

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

This pass audited every Classicy control, dialog, menu, window and control panel
against HIGOS8 (chapters 2–6), applied the fixes below, and recorded the rest as
intentional web adaptations or deferred follow-ups.

| Chapter | 🔧 Fixed | ⚠️ Deferred | ✅ Intentional / shipped-OS | Commit |
| --- | --- | --- | --- | --- |
| 2 — Controls | 10 | 2 | — | `7b10d2f`, `16338a3bb` |
| 3 — Dialog Boxes | 3 | 1 | — | `d208aac` |
| 4 — Menus | 3 | 1 | 2 | `c530cda` |
| 5 — Windows | 1 | 1 | — | `30e4aea` |
| 6 — Control Panels | 7 | — | 1 | `898670f` |
| **Total** | **24** | **5** | **3** | |

All fixes keep the full suite green (`pnpm lint`, `pnpm exec tsc --noEmit`, and
the vitest suite), and each fixed or changed behavior is covered by a new or
existing test. Deferred items are visual-fidelity or larger-refactor follow-ups
documented in each chapter's findings; the intentional items are the browser
`⌥W`/`⌥Q` adaptation and the shipped-OS "About Balloon Help…" ellipsis.

### Deferred follow-ups (recommended next pass)

- **2.5** — align the pop-up list's current item at the button level.
- **2.10** — a 12/10pt tab-label type scale (needs a type-scale decision).
- **3.4** — turn the New Folder prompt into a movable-modal dialog (not an alert).
- **4.6** — context-aware "Undo <action>" / "Can't Undo" labelling.
- **5.2** — split the grouped Platinum scroll arrows to opposite ends.
