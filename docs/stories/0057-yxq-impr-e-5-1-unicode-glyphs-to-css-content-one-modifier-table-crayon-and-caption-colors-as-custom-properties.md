---
id: 0057-yxq
title: 'E 5.1: Unicode glyphs to CSS content, one modifier table, crayon and caption colors as custom properties'
purpose: Move every Unicode UI glyph out of JSX into Platinum CSS content, share one modifier-glyph table between Kbd and the shortcut helpers with one span per modifier, and lift the crayon, color-wheel and caption literal colors into custom properties.
type: impr
status: complete
priority: "2"
effort: L
created: "2026-10-28T20:27:13.259Z"
updated: "2026-10-30T07:43:53.771Z"
started: "2026-10-30T05:38:00.547Z"
completed: "2026-10-30T07:43:53.771Z"
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
      - src/Appearance/Platinum/styles/_glyphs.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx
      - src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx
      - src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx
      - src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
      - src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts
      - src/SystemFolder/SystemResources/Kbd/ClassicyKbd.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.scss
      - src/Appearance/Platinum/styles/_assets.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.glyphs.test.tsx
      - src/SystemFolder/SystemResources/Kbd/ClassicyKbd.test.tsx
      - src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts
      - src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0056-mdl", "depends"]
  plans:
    - ["0009-agy", "included", ["5.1"]]
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
---

# E 5.1: Unicode glyphs to CSS content, one modifier table, crayon and caption colors as custom properties

## Problem Statement

Audit §3.4: menu check/dash (`ClassicyMenu.tsx:382-385`), pop-up and combo-box checkmarks (`ClassicyPopUpMenu.tsx:30,590`, `ClassicyComboBox.tsx:36,472-473`), bevel-button and placard arrows (`ClassicyBevelButton.tsx:523`, `ClassicyPlacard.tsx:112-116`) and the FileInput ✕ (`:192-199`) are Unicode text nodes a package cannot respell; `ClassicyKbd.tsx:6-11` and `ClassicyKeyboardShortcut.ts:24-29` carry duplicate modifier tables joined into one text node. §3.3: `ClassicyColorPickerCrayon.tsx:32-59` has eleven `rgba()` literals, `ClassicyColorWheel.tsx:73` a `#ffffff` stroke, and `QuickTimeCaptionsOverlay.tsx:81-86` composes colors in JS.

This section (plan 0009-agy §5.1, umbrella 0002-ldj; §9 Phase 5 items 3–4) moves the glyph choice into Platinum's `_glyphs.scss` as `::before { content }` (the same font glyphs, so pixels are identical) with state classes from Part A on the gutters, exports one `CLASSICY_MODIFIER_GLYPHS` table that `ClassicyKbd` renders as one `data-classicy-part="modifier-<name>"` span per modifier with unchanged `textContent`, and lifts the literal colors into `--platinum-crayon-*`, `--platinum-color-wheel-crosshair` and `--classicy-caption-*` custom properties.

**Impact:** Without it the plan's acceptance criterion that no JSX text node contains `✓ – ▸ ▾ ✕` fails, the two modifier tables keep drifting, and a package cannot respell menu, pop-up or keyboard glyphs.

## Steps

### 1: Update the glyph-text assertions and write the failing tests

`ClassicyPopUpMenu.test.tsx:75` → `expect(current).toHaveClass("checked")`; `:79` → `.not.toHaveClass("checked")`. New `ClassicyMenu.glyphs.test.tsx`: `it("marks checked and mixed items with state classes and no text", …)` renders a menu with items `{ checked: true }`, `{ checked: "mixed" }`, `{ checked: false }` and expects the three `.classicyMenuItemCheck` spans to have classes `checked`, `mixed`, neither, and `textContent === ""` for all. `ClassicyKbd.test.tsx`: keep line 12's `toHaveTextContent("⇧⌘S")` and add `it("renders one addressable span per modifier", () => { const parts = kbd.querySelectorAll("[data-classicy-part^='modifier-']"); expect([...parts].map(p => p.getAttribute("data-classicy-part"))).toEqual(["modifier-shift", "modifier-command"]); })`. `ClassicyKeyboardShortcut.test.ts`: `expect(keyboardShortcutModifiers("Ctrl+Cmd+S")).toEqual(["control","command"])`, `expect(keyboardShortcutModifiers("F1")).toEqual([])`, `expect(CLASSICY_MODIFIER_GLYPHS.command).toBe("⌘")`. `ClassicyColorPicker.test.tsx`: `it("crayon facets read package custom properties", () => { expect(container.querySelector('polygon[fill="var(--platinum-crayon-facet-light)"]')).not.toBeNull(); expect(container.innerHTML).not.toMatch(/rgba\(/); })`. `QuickTimeCaptionsOverlay.test.tsx`: `it("publishes caption colors as custom properties", …)` → with `captionStyle` `{ color: 0xff0000, colorOpacity: 0.5, bgColor: 0, bgOpacity: 0.25, size: 100, font: "ui" }` the caption element's `style.getPropertyValue("--classicy-caption-fg")` is `"255, 0, 0"`, `--classicy-caption-fg-alpha` `"0.5"`, and `style.color` is `""`. FileInput: in the existing FileInput test file add `expect(screen.getByRole("button", { name: /Remove/ }).textContent).toBe("")` beside its remove-button test.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/{PopUpMenu,Menu,Kbd,ColorPicker,QuickTime,FileInput}` — Expected: FAIL on the new/changed cases.

### 3: Implement the shared modifier table in `ClassicyKeyboardShortcut.ts` and rewrite `ClassicyKbd.tsx`

`ClassicyKeyboardShortcut.ts` exports `CLASSICY_MODIFIER_GLYPHS = { control: "⌃", option: "⌥", shift: "⇧", command: "⌘" } as const`, `type ClassicyModifierName = keyof typeof CLASSICY_MODIFIER_GLYPHS`, `CLASSICY_MODIFIER_ORDER: readonly ClassicyModifierName[] = ["control","option","shift","command"]`, `keyboardShortcutModifiers(raw: string | undefined): ClassicyModifierName[]` (the set modifiers in canonical order); `formatKeyboardShortcut`/`keyboardShortcutParts` read the shared table. `ClassicyKbd` deletes its own table (`ClassicyKbd.tsx:6-11`) and renders, in both variants, `<span className="classicyKbdModifier" data-classicy-part={`modifier-${name}`}>{CLASSICY_MODIFIER_GLYPHS[name]}</span>` per modifier followed by the key text (keycaps: one `<kbd class="classicyKbdKeycap">` per part as today, the modifier span inside it); `textContent` is unchanged. Delete `MODIFIER_GLYPHS` from both files (`ClassicyKeyboardShortcut.ts:24-29` renamed/exported).

### 4: Remove the glyph text nodes in the six components and add `_glyphs.scss` to the Platinum package

`_glyphs.scss` (scoped by `classicy-package`) declares `.classicyMenuItemCheck.checked::before { content: "✓" }`, `.classicyMenuItemCheck.mixed::before { content: "–" }`, `.classicyPopUpMenuCheck.checked::before { content: "✓" }`, `.classicyBevelButtonArrowHorizontal::before { content: "▸" }`, `.classicyBevelButtonArrowVertical::before, .classicyPlacardArrow::before { content: "▾" }`, `.classicyFileInputRemoveGlyph::before { content: "✕" }`; base SCSS keeps every box (`display: inline-flex`, widths) and `ClassicyFileInput.scss` adds `.classicyFileInputRemoveGlyph { display: inline-block }`. TSX: `ClassicyMenu.tsx:383` span gets `className={classNames("classicyMenuItemCheck", classicyStateClasses({ checked: menuItem.checked === true, mixed: menuItem.checked === "mixed" }))}` and no children; PopUpMenu/ComboBox spans get `classicyStateClasses({ checked: isSelected })` and no children, `CHECKMARK` constants deleted; BevelButton/Placard arrow spans lose their text; FileInput renders `<span className="classicyFileInputRemoveGlyph" aria-hidden={true} />` inside the button (the `aria-label` stays the accessible name). Wire `_glyphs.scss` into the Platinum SCSS entry Part B created (the file that `@use`s `_mixins`, `_scrollbars`, `_assets`).

### 5: Move the crayon, wheel and caption colors to custom properties

`_assets.scss` (package root) declares `--platinum-crayon-outline: rgba(0,0,0,.4)`, `--platinum-crayon-facet-light: rgba(255,255,255,.25)`, `--platinum-crayon-facet-dark: rgba(0,0,0,.2)`, `--platinum-crayon-strip-dark: rgba(0,0,0,.22)`, `--platinum-crayon-strip-light: rgba(255,255,255,.22)`, `--platinum-crayon-gloss: rgba(255,255,255,.07)`, `--platinum-crayon-band: rgba(255,255,255,.48)`, `--platinum-crayon-line-1: rgba(0,0,0,.2)`, `--platinum-crayon-line-2: rgba(0,0,0,.14)`, `--platinum-crayon-end-outline: rgba(0,0,0,.28)`, `--platinum-color-wheel-crosshair: #ffffff` (Part G rewrites these with `classicy-alpha`); the crayon SVG uses `fill="var(--platinum-crayon-facet-light)"` etc. (inline SVG inherits custom properties); the wheel reads `getComputedStyle(canvas).getPropertyValue("--platinum-color-wheel-crosshair").trim() || "#ffffff"`. Captions: the overlay sets `--classicy-caption-fg: <r>, <g>, <b>`, `--classicy-caption-fg-alpha`, `--classicy-caption-bg`, `--classicy-caption-bg-alpha` (plus `fontFamily`/`fontSize` as today) and `QuickTimeCaptionsOverlay.scss` composes `.quickTimePlayerCaptionsCustomStyle { color: rgba(var(--classicy-caption-fg), var(--classicy-caption-fg-alpha)); background-color: rgba(var(--classicy-caption-bg), var(--classicy-caption-bg-alpha)) }`. `ClassicyColorPickerHSV.tsx:58-59` and `HLS.tsx:58-59` already set `--classicy-slider-track-from/to` from the picked color and stay as they are (data, not look).

### 6: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources` — Expected: PASS. Re-shoot `desktop-menu--*`, `controls-popupmenu--*`, `controls-combobox--*`, `controls-bevelbutton--*`, `controls-placard--*`, `controls-fileinput--*`, `controls-kbd--*`, `controls-colorpicker--*`; `compare -metric AE` → `0` (same font glyphs, same boxes).

### 7: Grep for leftovers

`git grep -nP '[✓–▸▾✕⌃⌥⇧⌘]' src --include='*.tsx' -- ':!*.test.tsx' ':!*.stories.tsx' ':!*Kbd*' ':!*KeyboardShortcut*' ':!*KeyboardEquivalent*'` — Expected: only doc comments (lines starting with `*` or `//`). Any JSX text hit is a missed site.

### 8: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src/SystemFolder/SystemResources src/Appearance/Platinum/styles && git commit -m "refactor(glyphs): menu, pop-up, bevel, placard and file-input glyphs come from package CSS; one modifier table"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Menu src/SystemFolder/SystemResources/Kbd src/SystemFolder/SystemResources/PopUpMenu
- [x] `ClassicyKbd` renders one `data-classicy-part="modifier-<name>"` span per modifier with unchanged `textContent`; both `MODIFIER_GLYPHS` tables are gone and `CLASSICY_MODIFIER_GLYPHS` is the single source.
- [x] The crayon SVG, color wheel and captions overlay contain no literal rgba()/hex; the values live in --classicy-color-picker-crayon-*, --classicy-color-picker-crosshair (declared by Platinum's root properties, rulings E8/E9; base components read no --platinum-* names) and --classicy-caption-*.
- [x] VERIFY: grep -n -P '[✓▸▾✕–]' src/SystemFolder/SystemResources/{Menu/ClassicyMenu,PopUpMenu/ClassicyPopUpMenu,ComboBox/ClassicyComboBox,BevelButton/ClassicyBevelButton,Placard/ClassicyPlacard,FileInput/ClassicyFileInput}.tsx src/SystemFolder/HyperCard/Editor/HyperCardToolsPalette.tsx | grep -v -E ':\s*(\*|//)'; test $? -eq 1   # no UI glyph rendered as text in the glyph sites (keyboardShortcut data strings and prose dashes elsewhere are data, per the 5.1 review)

## Files

- `src/Appearance/Platinum/styles/_glyphs.scss` - create: ::before glyph content
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` - modify: state classes on the check gutter, no text
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - modify: gutter box only
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` - modify: drop CHECKMARK
- `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx` - modify: drop CHECKMARK
- `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` - modify: arrow span without text
- `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx` - modify: arrow span without text
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx` - modify: remove-glyph span
- `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss` - modify: remove-glyph box
- `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts` - modify: CLASSICY_MODIFIER_GLYPHS, keyboardShortcutModifiers
- `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.tsx` - modify: one span per modifier
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx` - modify: fills read --platinum-crayon-*
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx` - modify: crosshair stroke from custom property
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss` - modify: no literal declarations
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.tsx` - modify: caption colors as custom properties
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.scss` - modify: compose color/background from the properties
- `src/Appearance/Platinum/styles/_assets.scss` - modify: --platinum-crayon-* and crosshair properties
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx` - modify: class assertions instead of text
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.glyphs.test.tsx` - create: state-class gutter test
- `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.test.tsx` - modify: modifier span test
- `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts` - modify: shared table tests
- `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx` - modify: crayon custom-property test
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.test.tsx` - modify: caption custom-property test

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T06:21:47.094Z - E 5.1 implemented: 996b265a9 (glyphs from package CSS; one modifier table), 94cbe7c09 (crayon tints fall back to transparent outside a package), bb51ebb3c (docs). 4098 tests; 67 stories and 14 opened surfaces AE 0; accessible names unchanged. Concerns under review: minified CSS ships raw UTF-8 glyphs with no @charset, one more text checkmark in HyperCardToolsPalette, menu items expose no aria-checked (pre-existing).

### 2026-10-30T06:29:20.106Z - Task review: Needs fixes. Important: the minified dist/classicy-platinum.css ships raw UTF-8 glyphs with no @charset (Vite's esbuild charset utf8); fix with esbuild charset ascii plus a verify:dist invariant. Minors: menu items get menuitemcheckbox + aria-checked, HyperCard palette check moves to package CSS with aria-pressed, caption-color precedence documented, crosshair follows package switches, Firefox parity. E is rebasing onto the integration branch (I, J, tooling) on land/part-e, then applying these fixes.

### 2026-10-30T07:43:53.598Z - Review fixes landed on land/part-e (rebased onto the integration branch with I and J): 74890cdf0 ASCII CSS build + verify:dist invariant 9; efb5a11f0 menuitemcheckbox + aria-checked; d07e99009 HyperCard palette check as package CSS with aria-pressed; 717358f28 caption precedence doc; ee5c44b67 crosshair follows package switches; 2adabdc06 Kbd parses once. 4531 tests; glyph stories AE 0 in Chromium and Firefox. Criteria 2 and 4 rewritten to intent (shortcut data strings are data; E8/E9 color-picker names). Controller rulings E23 (probe stories lose package-owned art by design) and E24 (submenu triangle to an image layer, Firefox 1-level drift).
