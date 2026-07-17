# Mac OS 8 HIG → Classicy Audit

Each HIG component ([spec database](./hig-components.md)) compared against
Classicy's implementation. Status legend:

- **Full** — component exists and honors the HIG's essentials (deviations noted with ⚠).
- **Partial** — component exists but is missing meaningful HIG behavior/appearance.
- **Missing** — no Classicy component implements this HIG element.

> **Note on pixel fidelity:** Classicy sizes controls from theme CSS variables
> (`--window-control-size`, `--window-border-size`, `--window-padding-size`,
> injected at runtime from `themes.json`), not hard-coded pixels. HIG pixel-exact
> claims (2 px frames, 19 px title bars, 20 px buttons, 12 px controls) therefore
> can't be statically verified and are flagged "theme-scaled / unverifiable."

## Status summary

| # | HIG component | Status | Classicy mapping |
| --- | --- | --- | --- |
| 1 | Push Buttons | **Partial** | `Button/ClassicyButton` |
| 2 | Radio Buttons | **Full** ⚠ | `RadioInput/ClassicyRadioInput` |
| 3 | Pop-Up Menu Buttons | **Partial** | `PopUpMenu/ClassicyPopUpMenu` |
| 4 | Checkboxes | **Full** ⚠ | `Checkbox/ClassicyCheckbox` |
| 5 | Bevel Buttons | **Missing** | — |
| 6 | Sliders and Tick Marks | **Partial** | `Slider/ClassicySlider` |
| 7 | Little Arrows | **Full** ⚠ | `Spinner/ClassicySpinner` |
| 8 | Clock Controls | **Partial** | `TimePicker`, `DatePicker` |
| 9 | Disclosure Triangles | **Partial** | `Triangle`, `Disclosure` |
| 10 | List Boxes and Frames | **Partial** | `Tree`, `File/…ViewTable` |
| 11 | Scroll Bars | **Partial** (Full visual) | `styles/scrollbars.scss` |
| 12 | Edit Text Fields and Frames | **Full** ⚠ | `Input/ClassicyInput` |
| 13 | Static Text Fields | **Full** ⚠ | `ControlLabel/ClassicyControlLabel` |
| 14 | Tab Controls | **Partial** | `Tabs/ClassicyTabs` |
| 15 | Placards | **Missing** | — |
| 16 | Image Wells | **Missing** | — |
| 17 | Group Boxes | **Partial** | `ControlGroup/ClassicyControlGroup` |
| 18 | Separator Lines | **Partial** | `Menu/ClassicyMenu` (`<hr>` only) |
| 19 | Window Headers | **Partial** | `Window` (`header` prop) |
| 20 | Modeless Dialog Frames | **Missing** | — |
| 21 | Progress Indicators | **Partial** | `ProgressBar/ClassicyProgressBar` |
| 22 | About Dialog Boxes | **Full** ⚠ | `AboutWindow/ClassicyAboutWindow` |
| 23 | Movable Modal Dialog Boxes | **Partial** | `Window` (`modal`, non-error) |
| 24 | Modal Dialog Boxes | **Partial** | `Window` (`modal` + `type=error`) |
| 25 | Alert Boxes | **Partial** | `Desktop` dialogs + `.classicyWindowRed` |
| 26 | Modeless Dialog Boxes | **Partial** | `Window` (generic) |
| 27 | Keyboard Navigation and Focus | **Partial** | focus-ring styling across controls |
| 28 | Layout Guidelines | **Partial** | theme tokens only |
| 29 | Menu Bar | **Partial** | `Desktop/MenuBar/ClassicyDesktopMenuBar` |
| 30 | Sticky Menus | **Partial** | `Menu/ClassicyMenu` |
| 31 | Contextual Menus | **Partial** | `ContextualMenu/*` |
| 32 | Windows (Platinum) | **Partial** | `Window/ClassicyWindow` |
| 33 | Collapsing a Window | **Partial** | `Window` (collapse box) |
| 34 | Zoom Boxes | **Partial** | `Window` (zoom box) |
| 35 | Control Panels | **Partial** | `ControlPanels/*` |

**Tally:** Full 6 · Partial 25 · Missing 4 (of 35). ⚠ = Full with a noted deviation.

---

## Chapter 2 — Controls

### 1. Push Buttons — Partial
- **Matches:** rounded rectangle; three states (normal, pressed `platinumWindowDepressed`, disabled); `isDefault` ring treatment; press sounds; focus outline; `aria-pressed`.
- **Gaps:** no keyboard equivalents — Return/Enter don't activate the default button, Command-period/Esc aren't wired to Cancel; no ~8-tick keyboard-activation highlight; mouse-tracking (leave-to-cancel) relies on native `:active` rather than explicit handling.

### 2. Radio Buttons — Full ⚠
- **Matches:** group API with shared `name`; single-selection enforced; circular button with center dot; on/off/mixed + disabled; click button or label; never initiates action.
- **Gaps:** no enforcement of the 2–7 (min 2) group-size guideline; mixed doesn't auto-clear on selection (consumer-driven); no built-in separator/group-box between groups.

### 3. Pop-Up Menu Buttons — Partial
- **Matches:** current selection on the left, indicator on the right; selecting updates + fires `onChangeFunc`; placeholder/disabled/sizes/focus ring; release-outside = no change.
- **Gaps:** built on a native `<select>`, so the open menu is the browser's — **no checkmark/highlight on the current item, and it doesn't open at the button's level**; indicator is a single down-arrow, not the HIG **double up/down triangle**; no sticky-menu / drag-to-select; "menu ≥ largest text width" not enforced.

### 4. Checkboxes — Full ⚠
- **Matches:** square box + label; click box or label; on/off/mixed/disabled; independent instances; pressed feedback + focus outline.
- **Gaps:** **mark inversion** — the default "on" mark is an "X" (`\00D7`) and the checkmark (`\2713`) is only the `Default` variant; the HIG makes the **checkmark the default** and "X" the localization fallback; mixed uses a text hyphen rather than the platinum mixed glyph.

### 5. Bevel Buttons — Missing
- No beveled-edge control at all (repo-wide `bevel` search = 0 hits). Absent: 2/3/4-px bevel widths, the seven-state model, icon/picture/text-placement options, and the push/radio/checkbox/pop-up mode system. `ClassicyButton`'s `square` + `depressed` could seed a substitute but is not a bevel button.

### 6. Sliders and Tick Marks — Partial
- **Matches:** slider bar + draggable downward-pointing "shield" thumb; tick marks (`tickInterval`, `snapToTicks`, ≤51 marks); live drag (`onChangeFunc`) + commit-on-release (`onCommitFunc`); distinct thumb states; grooved track; value label.
- **Gaps:** **horizontal only** (no vertical); fixed downward indicator (not "any direction / nondirectional"); **no ghost indicator** (shadow copy dragged with the pointer); **tick marks unlabeled** (HIG stresses labeling direction of increase).

### 7. Little Arrows — Full ⚠
- **Matches:** two opposite-pointing arrows beside a value field; single click = ±1; press-and-hold repeats (100 ms) until release; optional content label; min/max clamping.
- **Gaps:** pressed-arrow highlight not explicitly styled; holds **escalate ×10 every 3 s** (non-HIG acceleration — HIG describes only continuous single-unit change); fuses field+arrows into a spinner (HIG's little arrows attach to a separate content area); `classicySpinnerDefault` is empty (no `isDefault` effect).

### 8. Clock Controls — Partial
- **Matches:** boxed edit-text field with per-part typing; Up/Down-Arrow key increments the focused part (matches key = arrow-click); inactive via `disabled`; clamping + leap-year validation; am/pm pop-up.
- **Gaps:** **no visible little-arrows widget** — only keyboard arrows, so mouse-only users can't increment (primary gap); Date and Time are separate components (no unified single clock control); no repeat-on-hold; DatePicker API inconsistent with TimePicker (ignores `ref`, no `prefillValue`).

### 9. Disclosure Triangles — Partial
- **Matches:** faithful layered-SVG platinum triangle; stepped rotation (`steps(4,end)`, 0.125 s) right→down; click toggle; controlled/uncontrolled; `aria-expanded`; Enter/Space; used both standalone and in Tree/FileBrowser.
- **Gaps:** **missing Command-Right / Command-Left** list-view keyboard equivalents the HIG explicitly requires; in Tree/Disclosure the triangle is `interactive={false}` (parent row handles keys, still no Command-arrows).

### 10. List Boxes and Frames — Partial
- **Matches:** FileBrowser table = scrolling list with white bg, row-selection highlight, sortable/resizable bevel-headers; Tree = indented outline with per-branch triangles + icons; scrolling via window `overflow:auto` + themed scrollbars.
- **Gaps:** **no type-selection** (typing a name to select); **no arrow-key item navigation** in the table (mouse-only); no unified **2-px list-box frame** whose inner lines coincide with the scroll bar's outer lines.

### 11. Scroll Bars — Partial (Full visual)
- **Matches:** black-arrow-in-a-box glyphs, **solid black when active**, pressed inset bevel; **thumb takes the Appearance/theme accent color** (`scrollbars-themed()` → `--color-theme-*`) — directly honors the platinum rule; platinum inset track; inactive variant hides thumb/flattens arrows.
- **Gaps:** both arrows placed at the **start** end (double-arrow-at-one-end, not one-arrow-per-end of Fig 2-26 — defensible but non-canonical); purely `-webkit-` (no Firefox styling); source typo `width: var(--window-scrollbar-size) v;`; no proportional thumb-length logic (native sizing).

### 12. Edit Text Fields and Frames — Full ⚠
- **Matches:** rectangular field + optional label; platinum 2-px-style inset frame; active/disabled; **password entry** (`type` prop); focus + `onEnterFunc`.
- **Gaps:** focus style uses a rounded `border-radius` + glow (modern/Aqua-ish) rather than the strict platinum 2-px focus frame; the frame isn't exposed as a separate standalone "edit text frame" control.

### 13. Static Text Fields — Full ⚠
- **Matches:** static non-editable text; active vs disabled (dimmed `--color-system-05`); size variants; associates via `htmlFor`.
- **Gaps:** the component doubles as an interactive label (`role="button"`, `tabIndex=0`, Enter/Space) — a pure static field should be non-focusable, but here every label is a tab stop; `@media (max-width:480px){display:none}` can hide required static text.

### 14. Tab Controls — Partial
- **Matches:** single top row of authentic folder-tab trapezoids (`clip-path`, 3-sided 2-px stroke); selected tab highlights and merges into the pane; pane 2-px border; inactive panes hidden; tab sounds.
- **Gaps:** **no keyboard support** (mouse-only; no `role="tab"`/arrow traversal); **icons on tabs unsupported** (HIG allows names and icons); no "tucked 1 px" (control panel) vs "inset 2 px" (modal) pane distinction; no global-vs-pane-embedded control distinction.

### 15. Placards — Missing
- No placard component. No bottom-of-window info panel adjacent to the horizontal scroll bar, no normal/pressed/disabled states, no pop-up extension. (A `.classicyWindowPlacard` modal style exists but is unrelated.)

### 16. Image Wells — Missing
- No image-well control. Absent: the 2-px recessed white-filled frame, enabled/selected states, and the drag-target primitive.

### 17. Group Boxes — Partial
- **Matches:** semantic `<fieldset>`+`<legend>`; `groove` border at `2 × --window-border-size` (etched-2px look); optional title on the border; interior padding.
- **Gaps:** **no primary vs secondary distinction** (only one border style; the 1-px secondary variant is missing); titling limited to text/untitled (**no pop-up-menu title or checkbox title**); border color hard-coded via `groove` rather than the 1-px-white/1-px-dark-gray pair; interior spacing theme-scaled, not the HIG 10/12 px.

### 18. Separator Lines — Partial
- **Matches:** a 2-tone engraved separator exists **inside menus** (`<hr>`: `--color-system-04` border + light `box-shadow`).
- **Gaps:** only implemented as a menu spacer — **no reusable/standalone separator-line control** for dialog content regions; no vertical variant; width is theme-scaled, not asserted 2 px.

### 19. Window Headers — Partial
- **Matches:** dedicated header region below the title bar (`header` prop), beveled (`platinumWindowHeaderBorder`: light top/side, dark bottom, inset shadow); dims when inactive; sticky at content top.
- **Gaps:** **no list-view header variant** (borderless bottom); header is a free-form `ReactNode` (doesn't present standardized content info; no header chasing-arrows slot); bevel dimensions theme-scaled.

### 20. Modeless Dialog Frames — Missing
- No modeless-dialog frame control. No 2-px content-region border variant distinguishing a modeless dialog, no active/inactive frame states. The existing `modal` window framing is the opposite case.

### 21. Progress Indicators — Partial
- **Matches:** **determinate** native `<progress>` with value-driven glossy platinum fill (left→right); **indeterminate** animated 45° `repeating-linear-gradient` barber-pole; fixed-height platinum-bordered track; optional label.
- **Gaps:** **asynchronous ("chasing") arrows" not implemented**; no built-in indeterminate→determinate switch when scope becomes known; indeterminate is a flat translating gradient, not a rounded spinning cylinder.

---

## Chapter 3 — Dialog Boxes

### 22. About Dialog Boxes — Full ⚠
- **Matches:** app icon + name (`<h1>`) + copyright + OK button; opens `modal`, self-focuses; wrapped in `ClassicyWindow`; close/resize/zoom/collapse disabled; auto-size.
- **Gaps:** modal-but-not-error → remains draggable (effectively a movable modal); OK is click-only (no keyboard dismiss); copyright text hardcoded rather than app-supplied.

### 23. Movable Modal Dialog Boxes — Partial
- **Matches:** a `modal` window that is not `type="error"` is draggable → movable-modal behavior (About uses this).
- **Gaps:** no distinct named API (emergent from `modal` + non-error `type`); no enforcement that a movable modal omits close/zoom (set manually); no true app-level modality/app-switch semantics.

### 24. Modal Dialog Boxes — Partial
- **Matches:** `modal` + `type="error"` disables dragging → non-movable modal; modal windows portal to `#classicyDesktop` and render active; Desktop dialogs add a `.classicyDesktopDialogOverlay` scrim; error modal plays `ClassicySoundPlayError` on open.
- **Gaps:** the enforcing scrim is applied by **Desktop's own dialogs**, not by `ClassicyWindow` — a bare `modal` window has **no backdrop and doesn't block** other windows; no "beep on outside click"; modality is visual, not input-trapping.

### 25. Alert Boxes — Partial
- **Matches:** an error/caution modal exists (icon + message + buttons only); `.classicyWindowRed` reproduces the non-movable-alert **red border**; empty-trash dialog ≈ a caution alert (Cancel default + OK); default-button styling.
- **Gaps:** **no first-class Alert component and no note/caution/stop typing**; no severity icon set (talking-face / triangle / stop-octagon) wired to type; no bold-label + plain-narrative two-tier text; no Help button; no auto-size/position; no movable-alert red-title-bar variant; destructive action labeled "OK" rather than a specific verb.

### 26. Modeless Dialog Boxes — Partial
- **Matches:** a normal window is inherently modeless (movable, collapsible, closable, focus/blur, click-behind-to-focus); close box far left, collapse box on the right; multiple windows coexist; `ColorPickerDialog` is a working example.
- **Gaps:** no explicit "modeless dialog" abstraction (compose a window + disable `resizable`/`scrollable` manually); zoom box appears unless disabled (HIG modeless has none); no "no close box for ongoing process" convention; no auto-preset/insertion-point in the first field.

### 27. Keyboard Navigation and Focus — Partial
- **Matches:** themeable focus rings (`outline: var(--color-outline)`) on buttons/inputs/checkboxes/radios/pop-ups/tree/color-picker (analogous to the configurable lavender ring); native DOM Tab order via `tabIndex={0}`; default button has a distinct `classicyButtonDefault` style.
- **Gaps:** **`isDefault` is purely cosmetic** — no Return/Enter→default and no Esc/Command-period→Cancel binding anywhere; no focus trap / managed Tab cycle in modals (Tab can leave the dialog); no auto-focus of the first field.

### 28. Layout Guidelines — Partial
- **Matches:** a shared token system exists — `--window-border-size` (1 px), `--window-padding-size` (6 px), `--window-control-size` (12 px, coincidentally the HIG 12-px control primitive); button padding/margins derive from these.
- **Gaps:** **none of the HIG's concrete dialog metrics exist as tokens or enforced sizes** — 20 px button height, 20 × 58 OK/Cancel, 3 px default-ring outset, 8 px button text padding, 10/12 px button gutters, 18 px checkbox height, 22 px edit-field height, 16 px static-text height, 21 × 20 Help button, 16 px group spacing; buttons auto-size from font+padding rather than to standard rectangles; no content-vs-structure-region distinction; no Chicago/Geneva metric basis.

---

## Chapter 4 — Menus

### 29. Menu Bar — Partial
- **Matches:** 3-D Apple logo; beveled bar (inset+drop shadow, rounded top corners); etched dropdown dividers; data-driven structure (apple/system → app menus → trailing widgets).
- **Gaps:** **no standard Help menu** (no About Help / Show Balloons / Shortcuts) — the rightmost slot is the App Switcher (an 8.5+ construct); Preferences-at-bottom-of-Edit not enforced; `keyboardShortcut` is free-form text with **no modifier glyphs and no functional dispatch**; the existing "Show Balloons" store toggle isn't surfaced in a Help menu.

### 30. Sticky Menus — Partial
- **Matches:** click opens and the menu stays open with nothing held; hover opens siblings once the bar is active; sub-menus equally sticky; click-outside closes with no selection; item selection blinks then closes then executes.
- **Gaps:** **no 15-second idle auto-close**; no command-key-closes-and-executes (ties to the missing keyboard-equivalent engine).

### 31. Contextual Menus — Partial
- **Matches:** right-click / Control-click invocation with native menu suppressed; single portal-rendered menu; sticky; click-outside closes; documented target-precedence (target > window > app > desktop); no default action on dismiss; sub-menu left/right flip.
- **Gaps:** **positioning deviates** — HIG = +1 px right/down of the click; Classicy offsets **up-left by [10,10]**; **no right-edge flip for the root menu** (wide menus can overflow); **no mandatory Help first item** (HIG requires a Help item as #1 always).

---

## Chapter 5 — Windows

### 32. Windows (Platinum Appearance) — Partial
- **Matches:** platinum frame + bevel; white content; beveled depressable control boxes; **active vs inactive** treatment (inactive dims + hides control boxes + flat scrollbars; active raises z-index + darkens title); pinstripe title bar + red/error variant; bottom-right resizer with cursor.
- **Gaps:** **drag region is title-bar-only** (HIG allows dragging from the narrow frame on all sides); title-bar height theme-scaled (unverifiable vs 19 px); **no utility-window / tool-palette class** (no crosshatch top, no left-side title bar, no 22 × 22 bevel-button palette); only `default`/`error` `type` handled.

### 33. Collapsing a Window — Partial
- **Matches:** collapse box toggles content, title bar remains; collapse/expand **sounds**; **double-click title bar collapses** and the box still works; collapsed window stays movable/closable/focusable with preserved position.
- **Gaps:** **no option-click collapse-all / expand-all**; double-click-to-collapse is always on (HIG makes it an Appearance checkbox); collapse sound isn't gated by a specific Appearance preference (only global sound disable).

### 34. Zoom Boxes — Partial
- **Matches:** zoom box on the right, DOM-ordered **before** the collapse box (so it sits to its left, per HIG); active/inactive via shared control-box styling; toggles with maximize/minimize sounds; un-collapses first.
- **Gaps:** **no standard-vs-user-state logic** (zoom is a fixed near-fullscreen rect, not an ideal size computed from content); **no horizontal/vertical zoom variants** (full only).

---

## Chapter 6 — Control Panels

### 35. Control Panels — Partial
- **Matches:** each panel is a single modeless window (`modal={false}`) with a **close box** (closing quits); multi-pane via **tab controls** (Appearance Manager); **disclosure triangle** for infrequent settings (Sound Manager); changes take effect **immediately**; settings persist to localStorage (auto-save); About box via `useClassicyAboutMenu`; per-theme fonts.
- **Gaps:** **window sizes exceed HIG maxima** (Appearance & Sound `[500,0]` > 492-px absolute max; Date/Time `[350,265]` is fine); **menu structure non-compliant** — File has only Quit (no Close ⌘W, no separator, no shortcuts), "About" is under Help not the Apple menu, no Edit menu despite edit fields, no Preferences-in-Edit; no keyboard-equivalent engine; Sound Manager's per-sound disable UI is explicitly **non-functional**; standard control-panel icon motif + About-box required contents unverified.

---

## Cross-cutting findings & priorities

**Strengths.** Classicy is strong on **platinum visual fidelity** — bevels, control
boxes, active/inactive window treatment, pinstripe title bars, etched menu
dividers, folder-tab shapes, theme-accent scrollbar thumbs, and collapse/zoom
sounds are all faithful.

**The dominant gap is keyboard + menu semantics**, recurring across many
components:

1. **No functional keyboard-equivalent engine.** `isDefault` is cosmetic;
   Return/Enter never triggers the default button and Esc/Command-period never
   triggers Cancel (affects Push Buttons, Keyboard Nav, Alerts, all dialogs).
   Menu `keyboardShortcut` strings are display-only with no dispatch and no
   modifier glyphs.
2. **Missing list/tab/disclosure keyboard nav** — type-selection and arrow-key
   item traversal in list boxes; Command-arrow disclosure in list views; arrow
   traversal + ARIA roles on tabs.
3. **Menu-bar conventions** — no standard Help menu; control-panel Apple/File/Edit
   menu structure (About-in-Apple, Close ⌘W, Preferences-in-Edit) not followed.

**Four missing components:** Bevel Buttons, Placards, Image Wells, Modeless
Dialog Frames.

**High-value smaller fixes:**
- Checkbox mark inversion (checkmark should be the default, "X" the fallback).
- Pop-Up Menu Button should render a Mac-style menu (checkmark on current item,
  double up/down triangle) instead of a native `<select>`.
- Group Boxes need a primary/secondary (2-px etched vs 1-px) distinction.
- Alert Boxes need note/caution/stop typing with the matching severity icons.
- Clock Controls need a visible little-arrows widget for mouse users.
- Control-panel windows should respect the 492 × 340 size ceiling.
- Contextual menu should offset +1 px down-right (not up-left) and flip near the
  right edge.

**Suggested priority order:** (1) keyboard-equivalent engine for default/Cancel
buttons and menus; (2) the four missing controls; (3) the high-value small fixes
above; (4) a shared HIG dialog-layout token set to move pixel metrics from
"theme-scaled/approximate" toward the HIG grid.
