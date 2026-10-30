---
id: 0083-v8n
title: 'V&V: Human verification and validation for the Appearance Packages program'
purpose: Collect every manual, human-performed acceptance check from the Appearance Packages stories in one ticket, so the implementation stories can close on automated evidence alone.
type: task
status: pending
priority: "2"
effort: XL
created: "2026-10-29T20:12:05.516Z"
updated: "2026-10-30T01:56:28.910Z"
tags:
  - vnv
  - manual
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  stories:
    - ["0010-f28", "depends"]
    - ["0012-3av", "depends"]
    - ["0014-2b5", "depends"]
    - ["0017-ih7", "depends"]
    - ["0030-2t0", "depends"]
    - ["0039-63e", "depends"]
    - ["0040-gok", "depends"]
    - ["0041-dyu", "depends"]
    - ["0042-pbp", "depends"]
    - ["0044-uvc", "depends"]
    - ["0045-1c6", "depends"]
    - ["0046-ukg", "depends"]
    - ["0047-mst", "depends"]
    - ["0048-fpx", "depends"]
    - ["0049-cdo", "depends"]
    - ["0050-ryq", "depends"]
    - ["0051-532", "depends"]
    - ["0053-e1n", "depends"]
    - ["0054-b5i", "depends"]
    - ["0055-l4q", "depends"]
    - ["0056-mdl", "depends"]
    - ["0057-yxq", "depends"]
    - ["0058-83a", "depends"]
    - ["0059-2t4", "depends"]
    - ["0061-pic", "depends"]
    - ["0062-sxu", "depends"]
    - ["0063-n9x", "depends"]
    - ["0064-fx9", "depends"]
    - ["0065-8mp", "depends"]
    - ["0066-874", "depends"]
    - ["0067-opx", "depends"]
    - ["0068-02e", "depends"]
    - ["0069-fiu", "depends"]
    - ["0070-yf7", "depends"]
    - ["0071-h9m", "depends"]
    - ["0072-fjm", "depends"]
    - ["0073-wte", "depends"]
    - ["0074-zpv", "depends"]
    - ["0075-uev", "depends"]
    - ["0076-4sb", "depends"]
    - ["0078-nc6", "depends"]
    - ["0079-vn4", "depends"]
    - ["0080-xy4", "depends"]
    - ["0081-ww6", "depends"]
    - ["0082-lgo", "depends"]
  plans:
    - ["0002-ldj", "included"]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
  "8":
    status: pending
  "9":
    status: pending
---

# V&V: Human verification and validation for the Appearance Packages program

## Problem Statement

The Appearance Packages program (umbrella plan 0002-ldj, parts A–J) gave many stories a [MANUAL] acceptance criterion. These are Storybook pixel-parity compares (`compare -metric AE` = 0 against each part's `before/` baselines), example-app walkthroughs and listening passes. A person has to perform them, and most can only run after Part B lands. Keeping them inside the implementation stories held those stories open after their code was done.

The 50 open checks below were moved here verbatim from 45 stories. Each criterion starts with the story it came from, and every source story links here. The 11 manual checks already performed stay ticked in their original stories.

**Impact:** Without one owner and one list, the human checks get lost between parts, and a visual or audible regression ships backed only by unit tests.

## Steps

### 1: Part A: Vocabulary and cascade hygiene (landed)

Run the 1 manual check from 0082-lgo now (landed). Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 2: Part B: Package core and Platinum

Run the 3 manual checks from 0039-63e, 0040-gok, 0041-dyu once B 6 is done, before B lands. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 3: Part D: Sound packs (landed)

Run the 1 manual check from 0030-2t0 now (landed). Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 4: Part E: Art extraction and title bar

Run the 8 manual checks from 0051-532, 0053-e1n, 0054-b5i, 0055-l4q, 0056-mdl, 0057-yxq, 0058-83a after E rebases onto the landed B. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 5: Part F: Arrangement slots

Run the 8 manual checks from 0059-2t4, 0061-pic, 0062-sxu, 0063-n9x, 0064-fx9, 0065-8mp, 0066-874 after F is built on G. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 6: Part G: Colors, derivations and JS geometry

Run the 5 manual checks from 0010-f28, 0012-3av, 0014-2b5, 0017-ih7 after G rebases onto the landed B. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 7: Part H: Pixel-literal purge

Run the 9 manual checks from 0067-opx, 0068-02e, 0069-fiu, 0070-yf7, 0071-h9m, 0072-fjm, 0073-wte, 0074-zpv after H is built on B and G. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 8: Part I: Package events and display

Run the 8 manual checks from 0042-pbp, 0044-uvc, 0045-1c6, 0046-ukg, 0047-mst, 0048-fpx, 0049-cdo, 0050-ryq after I rebases onto the landed B. Tick each criterion below as it passes; a failure becomes a bug story linked here.

### 9: Part J: Appearance control panel

Run the 7 manual checks from 0075-uev, 0076-4sb, 0078-nc6, 0079-vn4, 0080-xy4, 0081-ww6 after J rebases onto the landed B. Tick each criterion below as it passes; a failure becomes a bug story linked here.

## Acceptance Criteria

- [ ] [MANUAL] **0082-lgo (Part A follow-ups)**: (h) The parity procedure adds one mid-time check for animated stories, since animations are currently frozen at t=0.
- [ ] [MANUAL] **0039-63e (B 4.3)**: Every story in .playwright-mcp/parity/part-b/stories.txt compares with AE 0 before vs after.
- [ ] [MANUAL] **0040-gok (B 5.1)**: In the running example the desktop root carries data-classicy-appearance="platinum", #classicy-appearance-platinum sits right after #classicy-styles, and switching Default → Azul → Default logs no console errors.
- [ ] [MANUAL] **0041-dyu (B 6)**: Every story in stories.txt compares AE 0 before vs after; no background dev server is left running.
- [ ] [MANUAL] **0030-2t0 (D 4.1)**: In the example app the boot chime plays once, Default → Azul → Default keeps button clicks sounding with no console warning, persisted state carries `"pack":"platinum"`, and a volume of 40 survives a theme switch.
- [ ] [MANUAL] **0051-532 (E 0)**: `stories.txt` lists every story under the twenty title prefixes named in Step 1 and `before/` holds one 1024×768 PNG per id.
- [ ] [MANUAL] **0051-532 (E 0)**: `caps.txt` records the two pseudo-element heights measured on `desktop-window--default`.
- [ ] [MANUAL] **0053-e1n (E 2.1)**: `compare -metric AE` is `0` for every `desktop-window--*`, `dialogs-alert--*` and `desktop-windowframe--*` story against `before/`.
- [ ] [MANUAL] **0054-b5i (E 2.2)**: `compare -metric AE` is `0` for every re-shot story except zoomable windows, whose only differing pixels lie inside the 12×12 zoom box (named change (b)).
- [ ] [MANUAL] **0055-l4q (E 3.1)**: `compare -metric AE` is `0` for every `controls-slider--*`, `controls-tabs--*`, `controls-icon--*`, `desktop-desktopicon--*` and `desktop-desktop--*` story.
- [ ] [MANUAL] **0056-mdl (E 4.1)**: `compare -metric AE` is `0` for every `desktop-controlstrip--*`, `controls-popupslider--*` and `system-pixelart--*` story.
- [ ] [MANUAL] **0057-yxq (E 5.1)**: `compare -metric AE` is `0` for every re-shot menu, pop-up, combo-box, bevel-button, placard, file-input, kbd and color-picker story.
- [ ] [MANUAL] **0058-83a (E 6.1)**: Parity: AE `0` for every story in `stories.txt` except the three named changes — WindowFrame title-bar band (a), zoom box (b), title-less stripe band at `-fuzz 1%` (c) — each confined to its stated region.
- [ ] [MANUAL] **0059-2t4 (F 0)**: `stories.txt` lists every story under the nine title prefixes and `before/` holds one 1024×768 PNG per id.
- [ ] [MANUAL] **0059-2t4 (F 0)**: `attributes.txt` records the grep hits for the six cluster parts, three control attributes and the alert role attribute (or notes which are missing).
- [ ] [MANUAL] **0061-pic (F 2.1)**: `compare -metric AE` is `0` for every `desktop-menubar--*`, `desktop-menubar-extension--*`, `desktop-desktop--*` and `desktop-app--*` story.
- [ ] [MANUAL] **0062-sxu (F 3.1)**: `compare -metric AE` is `0` for every `desktop-window--*` story.
- [ ] [MANUAL] **0063-n9x (F 4.1)**: `compare -metric AE` is `0` for every `desktop-window--*` story and a 40 px grip drag in `desktop-window--default` keeps `left/top` and grows width/height by 40 (±1).
- [ ] [MANUAL] **0064-fx9 (F 5.1)**: `compare -metric AE` is `0` for every `desktop-desktop--*`, `desktop-window--*` and `desktop-app--*` story.
- [ ] [MANUAL] **0065-8mp (F 6.1)**: `compare -metric AE` is `0` for every `dialogs-alert--*`, `controls-disclosure--*`, `controls-tabs--*`, `desktop-desktop--*` and `desktop-desktopicon--*` story.
- [ ] [MANUAL] **0066-874 (F 7.1)**: Every Playwright position expression in Step 5 records `true`, and `compare -metric AE` is `0` for every pre-existing story in `stories.txt`.
- [ ] [MANUAL] **0010-f28 (G 0)**: `dialogs-alert--stop` title bar measures `rgb(247, 206, 205)` and the value is noted for G 4.
- [ ] [MANUAL] **0012-3av (G 1.2)**: Icon, DesktopIcon and ControlGroup stories compare AE 0; only error-styled alert stories differ, and only inside the title bar.
- [ ] [MANUAL] **0014-2b5 (G 2.2)**: Window, Menu, MenuBar, PopUpMenu, Tabs, Button and Placard stories compare AE 0 against the G 0 baseline.
- [ ] [MANUAL] **0017-ih7 (G 4)**: Every parity story compares AE 0 except the named error-alert title bars, whose diff is confined to the title bar (compare loop over .playwright-mcp/parity/part-G).
- [ ] [MANUAL] **0017-ih7 (G 4)**: In the example app `--menu-bar-height` resolves to `30px`, a zoomed window lands at [8, 38], and the Apple menu is 180 px wide, with no console errors.
- [ ] [MANUAL] **0067-opx (H 0)**: Every before-screenshot shows the surface fully rendered (no blank frames, no loading state).
- [ ] [MANUAL] **0068-02e (H 1.1)**: The seeded allowlist lists only SCSS files under `src/` (none under `savers/`), and the ControlStrip entry is 88.
- [ ] [MANUAL] **0069-fiu (H 2.1)**: `platinum.json` carries all 21 knob families on `defaults.measurements` and on every preset, and the Platinum `options` schema lists each family with `.describe()` labels.
- [ ] [MANUAL] **0070-yf7 (H 3.1)**: Every `desktop-controlstrip--*` story compares AE 0 before vs after (collapsed, right-docked and pressed-module included).
- [ ] [MANUAL] **0071-h9m (H 4.1)**: `desktop-menu--*`, `controls-pager--*`, `controls-balloonhelp--*`, `controls-popupslider--*` and `desktop-window--*` stories compare AE 0 before vs after.
- [ ] [MANUAL] **0072-fjm (H 5.1)**: `extensions-appleguide--*`, `controls-colorpicker--*` and the four example-app screens compare AE 0 before vs after.
- [ ] [MANUAL] **0073-wte (H 6.1)**: Only the two `--classicy-control-strip-*, 0px` instance fallbacks remain in `src/**/*.scss`; `ClassicyControlLabel.scss:77` keeps its `@media` breakpoint with the explanatory comment.
- [ ] [MANUAL] **0074-zpv (H 7.1)**: Every Phase 0 story and app screen compares AE 0 before vs after; the example app's `--control-strip-cell-height` reads `22px` and the Control Strip, menus, balloons and pager look unchanged.
- [ ] [MANUAL] **0074-zpv (H 7.1)**: AGENT-REFERENCE §8 has the knob-families table and gate paragraph; CLAUDE.md has the Theming sentence; plan 0000-aud (the audit) §2.5 and §9 Phase 6 item 3 carry 'Done' lines.
- [ ] [MANUAL] **0042-pbp (I 0)**: Each before PNG is a 1024×768 capture taken after networkidle + 500 ms.
- [ ] [MANUAL] **0044-uvc (I 2.1)**: controls-button*, controls-bevelbutton*, controls-checkbox*, controls-radioinput*, controls-popupmenu*, controls-combobox*, controls-input* and controls-listbox* stories compare AE 0 before vs after.
- [ ] [MANUAL] **0045-1c6 (I 2.2)**: controls-slider*, controls-placard*, controls-tabs*, controls-disclosure*, controls-tree*, controls-table*, controls-link* and controls-fileinput* stories compare AE 0 before vs after.
- [ ] [MANUAL] **0046-ukg (I 2.3)**: desktop-window*, desktop-desktop*, desktop-desktopicon*, desktop-menu*, desktop-menubar*, desktop-controlstrip*, dialogs-alert*, dialogs-assistant* and controls-icon* stories compare AE 0 before vs after.
- [ ] [MANUAL] **0047-mst (I 3.1)**: In the example app the click sprites play on push buttons, bevel buttons and radio items with no sound-bridge warning in the console.
- [ ] [MANUAL] **0048-fpx (I 3.2)**: desktop-window*, desktop-menu*, desktop-menubar*, dialogs-alert* and controls-contextualmenu* stories compare AE 0 before vs after.
- [ ] [MANUAL] **0049-cdo (I 4.1)**: controls-button--appearance-hooks renders unstyled with a magenta outline; pressing turns it green and logs Button.press / Button.release / Button.click in the Actions panel.
- [ ] [MANUAL] **0050-ryq (I 5)**: Every pre-existing story compares AE 0 before vs after; no background dev server is left running.
- [ ] [MANUAL] **0075-uev (J 0)**: The Screen Saver panel screenshot shows the Flying Toasters options form fully rendered.
- [ ] [MANUAL] **0076-4sb (J 1.1)**: `extensions-screensaver--*` stories and `app-screensaver-panel` compare AE 0 before vs after.
- [ ] [MANUAL] **0078-nc6 (J 3.1)**: In the example app the Packages tab lists Platinum checked with seven swatches, and the Options tab shows the Platinum knob groups from the `options` schema; the tab strip scrolls when eight tabs exceed 480 px.
- [ ] [MANUAL] **0079-vn4 (J 4.1)**: In the example app, changing Buttons → Gap to 20 on the Metrics tab widens dialog button spacing and switches the theme pop-up to Custom.
- [ ] [MANUAL] **0080-xy4 (J 5.1)**: In the example app the Sound tab lists Platinum as the sound pack and Load Theme… with a file whose `package` is `irix` shows the stop alert without changing the theme.
- [ ] [MANUAL] **0081-ww6 (J 6.1)**: Every J 0 screenshot except `app-appearance-*` compares AE 0 before vs after; all nine `system-appearancemanager--*` stories render without console errors.
- [ ] [MANUAL] **0081-ww6 (J 6.1)**: AGENT-REFERENCE lists the new action, the metric family form, `ClassicySchemaForm` and the eight tabs; CLAUDE.md has the schema-form paragraph; plan 0000-aud (the audit) §9 Phase 8 carries a 'Done' line.
- [ ] [MANUAL] Part I 3.2: in the example app with sound unmuted, hover through a menu and into a submenu. Each item plays one hover sound, exactly as before 3.2 (the extra hover dispatches that used to bubble to parent items, always refused by the sound manager, are gone).

## Work Log
