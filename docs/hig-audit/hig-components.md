# Mac OS 8 HIG — UI Component Specification Database

Every UI component/topic defined in the **Mac OS 8 Human Interface Guidelines**
("Platinum" HIG, Apple Computer, Inc., 9/2/97), with its specification distilled
from the source PDF (`Apple_HIGOS8_Guidelines.pdf`). This is the reference
"database"; the Classicy comparison lives in [`classicy-audit.md`](./classicy-audit.md).

Each entry records: **Purpose**, **Appearance**, **States**, **Behavior**, and
**Key rules**. Pixel values are quoted from the HIG where the document states them.

---

## Chapter 2 — Control Guidelines

### 1. Push Buttons
- **Purpose:** Rounded rectangle labeled with text; performs instantaneous actions (completing a dialog operation, acknowledging an error).
- **Appearance:** Rounded rectangle with a text label. A default button shows a coordinated ring around it.
- **States:** normal, pressed (highlighted), disabled. The default-button ring persists across all three.
- **Behavior:** Mousedown highlights; tracks the mouse while held (off = unhighlight, back = re-highlight); releasing off-button does nothing. Keyboard-equivalent activation highlights ~8 ticks (~1/8 s). Default button triggered by Return/Enter (no effect if no default). Cancel maps to Command-period and Esc.
- **Key rules:** Dialogs/control panels should have a default button (the most likely choice); if the likely choice is destructive, make Cancel the default.

### 2. Radio Buttons
- **Purpose:** Present mutually-exclusive settings; never initiate actions. Always in groups (2 to ~7; minimum 2).
- **Appearance:** Circular; "on" shown by a center dot. Groups visually separated (separator lines / group boxes).
- **States:** on / off / mixed, each across normal, pressed, disabled. Mixed = selection contains multiple on-values.
- **Behavior:** Click button OR its label to activate. Activating one turns off the previously-on button. Mixed clears when a concrete choice is made.
- **Key rules:** Exactly one "on" per group; mutually exclusive; separate multiple groups with ample space.

### 3. Pop-Up Menu Buttons
- **Purpose:** Single control showing the current selection; choosing an item changes an application state aspect.
- **Appearance:** Current-selection text on the left, **double up/down triangle** on the right. Menu width ≥ the largest text portion of the button.
- **States:** normal (before use); when pressed, a menu opens with the current choice **highlighted and checkmarked**.
- **Behavior:** Press to open, drag over items, release on an item to select (updates button text); release outside = no change. Current selection appears at the button's level; other items positioned relative to it. Sub-double-click-time release = sticky menu.
- **Key rules:** Menu ≥ largest text width; current item checkmarked in the open menu.

### 4. Checkboxes
- **Purpose:** Square + label; binary (on/off) choice.
- **Appearance:** Square box with adjacent label. On = **checkmark (default)** or "X" (localization fallback); off = unmarked. Mixed state for ranges containing both on and off.
- **States:** on / off / mixed across normal, pressed, disabled.
- **Behavior:** Independent of one another; any number on/off/mixed simultaneously. Click box or label to toggle.
- **Key rules:** Avoid negative labels. Group with white space, separator lines, or group boxes.

### 5. Bevel Buttons
- **Purpose:** Rectangular beveled-edge control giving a 3-D look; can display text, icon, or picture. Can behave as a push button, radio button, checkbox, or pop-up (menu or slider). Common in tool palettes/toolbars.
- **Appearance:** Three bevel widths — **small = 2 px, medium = 3 px, large = 4 px**; bevel width sets apparent height. Configurable text+image placement.
- **States:** **Seven** — five active (off; pressed-was-off; on; pressed-was-on; mixed) plus two disabled (disabled-off, disabled-on). Under platinum both pressed states look identical.
- **Behavior:** As a push button, pops back up after click and reverts to off if the pointer leaves while held. As a pop-up, click-and-hold beyond double-click-time reveals a menu; small/large, horizontal/vertical pop-up arrows available.
- **Key rules:** Bevel width selectable per button; the behavior mode determines interaction.

### 6. Sliders and Tick Marks
- **Purpose:** Slider bar showing a range plus an indicator; drag to set a value. Do NOT use a scroll bar for settings.
- **Appearance:** Horizontal or vertical. Indicator can point any direction or be nondirectional. A **ghost indicator** (copy) is dragged along to show pointer position. Optional tick marks; count and fraction-per-mark configurable; drawn per slider direction.
- **States:** dragging shows the ghost indicator; live-feedback ("live dragging") supported.
- **Behavior:** Drag the indicator to change value. Label tick marks (graphics/text) to show direction of increase.
- **Key rules:** Label tick marks; don't substitute a scroll bar for a slider.

### 7. Little Arrows
- **Purpose:** Two opposite-pointing arrows (up/down) to increment/decrement values in a series. Has a label naming the related content.
- **Appearance:** The two-arrow control.
- **States:** normal, up depressed, down depressed, disabled.
- **Behavior:** Clicking an arrow changes the value by one unit; holding continuously changes until release; the pressed arrow is highlighted. Unit of change is content-dependent (e.g. 1 year, multiples of 32K).
- **Key rules:** Provide a content label; unit of change is content-dependent.

### 8. Clock Controls
- **Purpose:** Combines an edit text field with a little-arrows control (the Date & Time control panel implementation).
- **Appearance:** Boxed edit-text field showing a date/time value with an adjacent up/down little-arrows control.
- **States:** active (editable) and inactive (displays but disallows changes).
- **Behavior:** Keyboard nav/focus; when focused, Up/Down-Arrow keys act like clicking the little arrows. Direct typing supported.
- **Key rules:** Can be made inactive to display a value without allowing edits.

### 9. Disclosure Triangles
- **Purpose:** Disclose information elaborating a window's primary content. Two uses: expand a dialog/control panel; Finder list-view outline triangle that expands folder contents inline.
- **Appearance:** Points right when collapsed; rotates to point down when expanded. Sits next to a folder icon in list view.
- **States:** collapsed (right) / expanded (down). Rotates down even when the expanded folder is empty.
- **Behavior:** Click toggles. In list view, **Command-Right opens, Command-Left closes**; apps that offer list-view expand/collapse SHOULD provide these equivalents.
- **Key rules:** Clicking again restores the collapsed state and rotates the triangle back to right.

### 10. List Boxes and Frames
- **Purpose:** Complete scrolling-list solution: up to two embedded scroll bars plus a scrolling list box; keyboard nav + type-selection.
- **Appearance:** White background; **two-pixel-wide rectangular frame** whose inside lines share the outside lines of the scroll bar(s). Frame is also available as a separate control for compliance.
- **States:** standard list; frame enabled/disabled.
- **Behavior:** Arrow keys move one item at a time; **type selection** — typing the leading character(s) of an item's name selects it.
- **Key rules:** Don't use for choices in a limited range (use sliders there).

### 11. Scroll Bars
- **Purpose:** View areas larger than the window; show the relative position of the visible portion. Not for changing settings (use a slider).
- **Appearance:** Shaded gray rectangle with a black arrow in a box at each end; inside the track, an indicator (scroll box) shows relative position. Platinum: **arrows solid black when active**; the **indicator takes the color set in the Appearance control panel**.
- **States:** active (solid black arrows) vs inactive.
- **Behavior:** Arrows at each end; indicator shows position; length ~ data amount; indicator ~ window position over the document.
- **Key rules:** Don't substitute a scroll bar for a slider.

### 12. Edit Text Fields and Frames
- **Purpose:** Rectangular area to enter/modify text; supports focus and password entry.
- **Appearance:** Field shown with a label. **Edit-text frame is two pixels wide**; available separately to make non-standard fields compliant.
- **States:** active/enabled and disabled (frame has enabled and disabled states).
- **Behavior:** The app provides editing services; supports keyboard focus and password entry.
- **Key rules:** Frame is a separate control for compliance. See "Edit Text Field Layout."

### 13. Static Text Fields
- **Purpose:** Embed static (unchangeable) text in dialog boxes.
- **Appearance:** Plain text.
- **States:** active and disabled (dimmed).
- **Behavior:** Non-interactive display text.
- **Key rules:** See "Static Text Field Layout."

### 14. Tab Controls
- **Purpose:** Present information in a multi-page (folder-tab) format.
- **Appearance:** **One row of tabs along the top**; labeled with names and/or icons; 12-pt and 10-pt label fonts. Content area = "pane." In a **control panel**, pane sides are "tucked" under the content edge by **one pixel**; in a **modal dialog**, the pane's left/right are inset **two pixels**.
- **States:** selected tab highlights and shows its page; unselected tabs.
- **Behavior:** Click a tab to select its pane. Controls inside may be global (all panes) or embedded (active pane only); the distinction must be unambiguous.
- **Key rules:** Single top row only. Push buttons/scroll bars may appear inside a tab control.

### 15. Placards
- **Purpose:** Information display or background fill for a control area. Familiar use: a small info panel at the bottom of a window, left of the horizontal scroll bar (may host a pop-up menu, e.g. magnification level).
- **Appearance:** Small rectangular beveled/platinum panel.
- **States:** normal, pressed, disabled.
- **Behavior:** Primarily static info display; may host a pop-up menu when extended.
- **Key rules:** Typical placement is bottom-left of the window, adjacent to the horizontal scroll bar.

### 16. Image Wells
- **Purpose:** Display non-text visual content (icons/pictures); can be a drag-and-drop target.
- **Appearance:** **Two-pixel-wide rectangular frame**, recessed appearance, **white background fill** (distinguishes it from bevel buttons).
- **States:** enabled and selected.
- **Behavior:** Passive display + optional drag/drop target.
- **Key rules:** Do NOT use in place of push buttons or bevel buttons.

### 17. Group Boxes
- **Purpose:** Associate, isolate, and distinguish groups of related items in a dialog; may embed radio buttons, checkboxes, pop-up menus.
- **Appearance:** **Primary** border = 2 px etched (1 px white next to 1 px dark gray); **secondary** = 1 px border. Four titling options: untitled, text title, pop-up-menu title, checkbox title.
- **States:** static.
- **Behavior:** Visual grouping container.
- **Key rules:** Title base aligns with the inside white border line, ≥3 px each side of title text. Interior spacing: 10 px sides/bottom, 12 px top to first item. Don't substitute a secondary box for a primary one.

### 18. Separator Lines
- **Purpose:** Separate groups of controls in dialog boxes; an Appearance-compliant alternative to a raw QuickDraw line.
- **Appearance:** **Two pixels wide.** Horizontal: top pixel = line, bottom pixel = engraved. Vertical: left pixel = line, right pixel = engraved.
- **States:** static.
- **Behavior:** Non-interactive.
- **Key rules:** Intended for dialog-box content regions.

### 19. Window Headers
- **Purpose:** Present information about a window's contents (familiar from the Finder, usable in document windows). Distinct from the title bar.
- **Appearance:** A **beveled rectangle** whose outside lines share the inside lines of the document window and the scroll-bar arrows. A **list-view header** variant removes the line separating the header from the content area.
- **States:** follows window active/inactive.
- **Behavior:** Informational region below the title bar.
- **Key rules:** Bevel aligns with window inner lines and scroll arrows.

### 20. Modeless Dialog Frames
- **Purpose:** Used in the content region of a modeless dialog box; an Appearance-compliant way to distinguish modeless dialogs from other windows.
- **Appearance:** A rectangle with a **two-pixel-wide border** sharing the inside lines of the document window.
- **States:** active and inactive.
- **Behavior:** Decorative content-region frame.
- **Key rules:** Border shares the document window's inside lines.

### 21. Progress Indicators
- **Purpose:** Inform about duration or capacity. Two bar types (determinate, indeterminate) plus **asynchronous ("chasing") arrows** for background processes with no dialog.
- **Appearance:** Both bars have **fixed height, variable width** (height 12 px). Determinate = a filled bar moving left→right. Indeterminate = a **striped cylinder that spins** (barber-pole). Async arrows = a small spinning-arrows animation.
- **States:** determinate (value-driven), indeterminate (animated), async-arrows (multiple states).
- **Behavior:** Switch indeterminate→determinate once the scope becomes known. Determinate for known scope (file copy); indeterminate for unknown duration (establishing a connection).
- **Key rules:** Reserve indeterminate for when determinate is clearly inappropriate.

---

## Chapter 3 — Dialog Box Guidelines

### 22. About Dialog Boxes
- **Purpose:** Specialized window identifying the app (icon, name, copyright, OK).
- **Appearance:** App icon + name + copyright line + OK button (no dedicated Ch.3 metrics).
- **States:** modal-style window.
- **Behavior:** Dismissed by a button.
- **Key rules:** Text indicates the command/condition that summoned it.

### 23. Movable Modal Dialog Boxes
- **Purpose:** Modal dialog with a draggable title bar; the user may switch apps without closing it. **Preferred** over fixed modal in most cases.
- **Appearance:** Title bar present, but **no close box and no zoom box** — the cue that it is movable yet must be answered. Title preferred, not required.
- **States:** modal to the active app.
- **Behavior:** Modal, movable, app-switchable.
- **Key rules:** Omit close/zoom boxes.

### 24. Modal Dialog Boxes
- **Purpose:** Put the user in a mode; suspend other actions in the app until dismissed via its buttons.
- **Appearance:** Placard-like background; **cannot be moved or resized**; no close box.
- **States:** modal.
- **Behavior:** Clicking outside → **system beep**, nothing else. Dismiss only via buttons.
- **Key rules:** Use sparingly; prefer a movable modal.

### 25. Alert Boxes
- **Purpose:** Special modal dialogs conveying warnings/errors with a severity icon.
- **Appearance:** Only icon, text, and buttons — no other controls. Up to 4 buttons (OK, Cancel, Help, one optional). Two text styles: **bold system-font label** + **plain small-system-font narrative**. Standard alerts auto-size and auto-position.
- **Types/States:** **Note** (talking-face icon; usually OK only + optional Help); **Caution** (triangle + "!"; OK/Continue + Cancel + optional Help; OK/Continue default unless it risks data loss); **Stop** (octagon + open hand; OK only + optional Help). Movable alert = red title-bar highlights; non-movable alert = red border around the placard content region.
- **Behavior:** Close only by clicking a button.
- **Key rules:** Contains only icon/text/buttons; make the button verbs specific.

### 26. Modeless Dialog Boxes
- **Purpose:** Accept input and allow repeated actions while open without inhibiting activity (Find/Replace, Get Info).
- **Appearance:** Like a document window without size box, zoom box, or scroll bars. **Close box far left, collapse box far right** of the title bar. May omit the close box only for an ongoing-process status (e.g. Finder copy).
- **States:** active/inactive; collapsible; closable.
- **Behavior:** Movable; clicking a window behind it brings that window forward; may stay open when unused; multiple can be open at once.
- **Key rules:** Preset controls to sensible defaults; show an insertion point in the first edit field.

### 27. Keyboard Navigation and Focus
- **Purpose:** Full keyboard operability of dialog controls.
- **Appearance:** Focus indicated by a **focus ring** around the active control (platinum default lavender, user-configurable in the Appearance control panel). Only one focus ring at a time; if there is a single keyboard control, no ring is needed.
- **Behavior:** Tab cycles forward through keyboard-accepting elements; Shift-Tab backward. Return/Enter triggers the default button; Command-period/Esc triggers Cancel.
- **Key rules:** Default button = the most-likely action (not necessarily lower-right).

### 28. Layout Guidelines
Concrete dialog-layout metrics (spec-only reference numbers):
- **Regions:** modal/movable-modal content region excludes bevels; modeless content region includes the bevel inside the black line.
- **Spacing:** min 4 px between clickable items (prefer 6 px for focus rings); min 4 px item-to-window-edge (utility windows may go to 1 px); 16 px between groups of controls.
- **Push buttons:** height **20 px**; default ring outset 3 px (not counted in size); min 8 px text-to-border each side; standard OK/Cancel = **20 × 58 px**; vertical stack gap 10 px; horizontal gap 12 px; 12 px button-to-dialog-edge.
- **Bevel buttons:** min 12 px horizontal gap; 6 px button-bottom-to-title.
- **Checkboxes/radios:** box/circle **12 × 12 px**; 5 px box-to-label; box bottom 2 px below baseline; full control height 18 px; min vertical gap 6 px; horizontal gap min 12 px.
- **Pop-up menu buttons:** height 20 px (18 px with small system font); vertical gap 6 px; 4 px between an edit field and its pop-up.
- **Group boxes:** 2 px border (1 px white + 1 px dark gray); side margins 10 px, top 12 px, bottom 10 px; 3 px each side of title.
- **Edit text fields:** height 22 px (or 20 px aligned to pop-ups); vertical stack gap 6 px.
- **Progress indicators:** height 12 px, variable width.
- **Disclosure triangles:** 5 px triangle-to-text.
- **Static text fields:** height 16 px (12-pt Chicago); 5 px to the labeled item.
- **List boxes:** 6 px from title baseline to the black line.
- **Help buttons:** **21 px high × 20 px wide** bevel button; standard help icon; lower-left preferred, upper-right alternative.
- **Fonts:** Chicago as the metric basis (12-pt Chicago = 16 px height); small system font = Geneva 10; emphasized small system font for headings.

---

## Chapter 4 — Menu Guidelines

### 29. Menu Bar
- **Purpose:** Global menu bar under platinum appearance.
- **Appearance:** 3-D Apple logo, beveled edges, anti-aliased corners; menu dividers have an etched appearance.
- **States:** titles highlight when open.
- **Behavior:** Extended modifiers (Control/Shift/Option + Command) with glyphs; Preferences standardized to the bottom of the Edit menu; the **Help icon** is a standard menu title, always the last menu from the left. Help items in order: About Help, Show Balloons, Help (current app), Shortcuts.
- **Key rules:** Help menu always rightmost; Preferences at the bottom of Edit.

### 30. Sticky Menus
- **Purpose:** Release-and-browse menus; a click shorter than the double-click interval leaves the menu "stuck" open without holding.
- **Behavior:** Move to an item and click to select & close; hierarchical sub-menus are also sticky when their parent is highlighted; click outside closes with no selection; a command key closes & executes; **auto-close after 15 seconds** of no selection.
- **Key rules:** Sticky behavior coexists with the traditional press-and-hold model.

### 31. Contextual Menus
- **Purpose:** Control-click / right-button pop-up of common commands for the clicked item.
- **Appearance/Behavior:** Upper-left corner offset **1 px right and 1 px down** from the click; if too wide, flip to the upper-right corner offset 1 px left/down; long menus scroll. Behaves as a sticky menu, except hovering off it onto a standard menu does not open that menu.
- **Key rules:** **First item is always a Help item** (disabled if no help, but always shown); items are a small subset also reachable from the menu bar; **no default item**; keep short; sub-menus one level max; never include a command that is disabled elsewhere.

---

## Chapter 5 — Window Guidelines

### 32. Windows (Platinum Appearance)
- **Purpose:** Platinum document/utility windows.
- **Appearance:** White content area; frame in grays/color; user controls (close/size/zoom/collapse/scroll) beveled/3-D. **Inactive** window borders flat light gray (recede); **active** window darker frame + colored accents. Drag region = a narrow gray frame **around all sides** (drag from anywhere in it). Document title bar ~**19 px**. Utility title bar ≥19 px with a crosshatch top; tool-palette bevel buttons 22 × 22 with 16 × 16 icons.
- **States:** active vs inactive.
- **Behavior:** Accent colors (scroll/progress/slider indicators, focus rings) set via the Appearance control panel.
- **Key rules:** Active window emphasized; inactive recedes.

### 33. Collapsing a Window (WindowShade)
- **Purpose:** Collapse box hides the content region; the title bar stays visible and active; click again to restore.
- **States:** normal vs collapsed.
- **Behavior:** Collapse/expand plays a **sound** (user-disable via Appearance). A collapsed window can be moved/closed/activated. **Option-click** the collapse box collapses ALL windows; option-click a collapsed one expands ALL. Optional **double-click title bar to collapse** (Appearance checkbox); the collapse box still works when enabled.
- **Key rules:** Multiple windows may be collapsed at once.

### 34. Zoom Boxes
- **Purpose:** Zoom box on the right of the title bar, **just left of the collapse box**.
- **States:** active/inactive; toggles between **standard state** (ideal size for content) and **user state** (previous user size).
- **Behavior/Variants:** **full** (traditional), **horizontal** (extend right), **vertical** (extend down only).
- **Key rules:** Compute the standard state from content; remember the user state.

---

## Chapter 6 — Control Panel Guidelines

### 35. Control Panels
- **Purpose:** A utility accessible through a modeless dialog box; configure global/hardware settings.
- **Window:** One window per panel = a modeless dialog; must have a **close box** (closing quits); preferred max **400 × 300**, absolute max **492 × 340**; keep most settings in the window.
- **Multi-pane navigation:** tab controls (fixed pane count), push-button group, scrolling icon list, or pop-up menu. Expand/contract infrequent settings via a labeled **disclosure triangle** (or Show/Hide push button).
- **Icons/Fonts:** based on the standard control-panel icon (slider on left/bottom); fonts per Font Guidelines.
- **Menus:** Control panels are apps (`appc`) with their own menus — Apple: "About &lt;name&gt;" first; File: Close Window (⌘W) + Quit (⌘Q) preceded by a separator; Edit: Undo (⌘Z) + Cut/Copy/Paste/Clear/Select All (if edit fields); Preferences last in Edit. Support contextual menus.
- **Settings:** Changes take effect **immediately** unless disruptive; auto-save on quit unless complex (then explicit Save/Revert + confirm-on-quit-with-unsaved).
- **About box:** logo / name / version / description / credits / copyright / OK.
