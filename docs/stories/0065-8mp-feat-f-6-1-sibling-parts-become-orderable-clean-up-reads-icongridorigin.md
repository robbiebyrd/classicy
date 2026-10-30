---
id: 0065-8mp
title: 'F 6.1: Sibling parts become orderable; clean-up reads iconGridOrigin'
purpose: Make alert icon/button order, the Disclosure label side and the Tabs strip position reachable by CSS alone, and make desktop clean-up fill the icon grid from the package's declared origin.
type: feat
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T20:32:12.590Z"
updated: "2026-10-30T04:31:53.199Z"
started: "2026-10-30T03:48:15.190Z"
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
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.layout.test.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.test.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.layout.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0064-fx9", "depends"]
  plans:
    - ["0010-743", "included", ["6.1"]]
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

# F 6.1: Sibling parts become orderable; clean-up reads iconGridOrigin

## Problem Statement

Audit §5: alert buttons carry no role attribute the CSS can order on (`ClassicyAlert.tsx:272-311`; `ClassicyAlert.scss:13-18, 68-74` are already flex rows); Disclosure's label side is a JSX branch (`ClassicyDisclosure.tsx:104-125`); the Tabs container is not flex (`ClassicyTabs.scss:28-33, 46-52`, row has `margin-bottom: calc(var(--window-border-size) * -1)`); desktop clean-up always fills from the right edge (`ClassicyDesktopIconContext.tsx:33-44`: `x = innerWidth − (iconSize*2 + pad)*col`, `y = (iconSize*2 + pad)*row + pad*4`; `cleanupDesktopIcons` at `:81-117`, reducer calls at `:143-152, 227, 288`).

This section (plan 0010-743 §6.1, umbrella 0002-ldj; §8.8 CSS-only slots plus the `desktop.iconGridOrigin` declaration) guarantees `data-classicy-role` on every non-help alert button and adds base `order` to icon/body only (button order stays array order with the default last), renders Disclosure as triangle-then-label with a `classicyDisclosureLabelLeft` class and an `order: -1` rule, gives Tabs a `stripPosition` prop and a flex-column container with a `classicyTabStripBottom` class, and threads a grid `origin` through `classicyDesktopIconGridPosition` / `cleanupDesktopIcons` from `getClassicyAppearanceLayout(ds.System.Manager.Appearance.packageId)`. Platinum's `top-right` reproduces today's formula byte for byte.

**Impact:** Without it the mirrored alert, Tabs, Disclosure and desktop stories (7.1) have nothing to flip, and `desktop.iconGridOrigin` is a dead declaration.

## Steps

### 1: Write the failing tests

`ClassicyDesktopIconContext.test.ts` (set `window.innerWidth = 1024; window.innerHeight = 768` via `Object.defineProperty`; iconSize 64, padding 16, cell 144):
```ts
it("top-right reproduces today's formula", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0)).toEqual([880, 64]));
it("top-left fills from the left edge", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "top-left")).toEqual([16, 64]));
it("bottom-right fills from the bottom", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-right")).toEqual([880, 560]));
it("bottom-left", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-left")).toEqual([16, 560]));
it("ClassicyDesktopIconCleanup uses the active package's origin", …) // store with packageId test-mirror (top-left), two visible icons → locations [16, 64] and [16, 208]
```
`ClassicyAlert.layout.test.tsx`: every `.classicyAlertButtons button:not(.classicyAlertHelpButton)` has a `data-classicy-role` in `{default, cancel, other}`; compiled `ClassicyAlert.scss` has `.classicyAlert .classicyAlertIcon` `order` `10`, `.classicyAlertBody` `20`, and no `float`. `ClassicyDisclosure.test.tsx` addition: `labelPosition="left"` → header has class `classicyDisclosureLabelLeft`, `header.lastElementChild` has class `classicyControlLabelHolder`, and the compiled rule `.classicyDisclosureLabelLeft > .classicyControlLabelHolder` has `order: -1`. `ClassicyTabs.layout.test.ts`: `rule(".classicyTabContainer").display === "flex"` with `flex-direction: column`; `rule(".classicyTabStripBottom .classicyTabButtonsRow").order === "1"`; a render with `stripPosition="bottom"` has the class on `.classicyTabContainer`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts src/SystemFolder/SystemResources/Alert src/SystemFolder/SystemResources/Disclosure src/SystemFolder/SystemResources/Tabs` — Expected: FAIL.

### 3: Alert: guarantee the role attribute; add the two `order` lines

`ClassicyAlert.tsx:298-308`: every non-help `ClassicyButton` carries `data-classicy-role={button.role === "default" ? "default" : button.role === "cancel" ? "cancel" : "other"}` (add only if Part A did not). `ClassicyAlert.scss:21-37`: add only `.classicyAlertIcon { order: 10 } .classicyAlertBody { order: 20 }` and declare no `order` for buttons (today's button order is the `resolvedButtons` array order with the default last, and any base `order` keyed on role would reorder a consumer's custom button list); a package flips buttons with `.classicyAlertButtons { flex-direction: row-reverse; justify-content: flex-start }` or with `order` on `[data-classicy-role]`.

### 4: Disclosure: one JSX order plus the class (`ClassicyDisclosure.tsx:104-125`, `.scss:7-12`)

The header always renders triangle then label, with class `classicyDisclosureLabelLeft` on `.classicyDisclosureHeader` when `labelPosition === "left"`; SCSS `.classicyDisclosureLabelLeft > .classicyControlLabelHolder { order: -1 }` (the header keeps `justify-content` start, so `order` — not `row-reverse` — keeps the pair at the left edge; `ClassicyControlLabel` root class is `classicyControlLabelHolder`, `ClassicyControlLabel.tsx:158-160`).

### 5: Tabs: `stripPosition` prop and flex column (`ClassicyTabs.tsx:27-29, 307`, `.scss:28-33, 46-52`)

`stripPosition?: "top" | "bottom"` (default `top`) → class `classicyTabStripBottom` on `.classicyTabContainer`; SCSS `.classicyTabContainer { display: flex; flex-direction: column; align-items: stretch }`, `.classicyTabStripBottom .classicyTabButtonsRow { order: 1; margin-bottom: 0; margin-top: calc(var(--window-border-size) * -1); align-items: flex-start }`; document the prop in the component's JSDoc.

### 6: Icons: `classicyDesktopIconGridPosition` with origin; reducer passes the declared origin (`ClassicyDesktopIconContext.tsx:33-44, 81-117, 143-152, 227, 288`)

`export const classicyDesktopIconGridPosition = (iconSize: number, iconPadding: number, col: number, row: number, origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = "top-right"): [number, number]` with `cell = iconSize * 2 + iconPadding`, `x = origin ends with "right" ? Math.floor(innerWidth − cell * col) : Math.floor(cell * (col − 1) + iconPadding)`, `y = origin starts with "top" ? Math.floor(cell * row) + iconPadding * 4 : Math.floor(innerHeight − cell * (row + 1)) − iconPadding * 4`; `cleanupDesktopIcons(theme, icons, origin = "top-right")`; the three reducer call sites pass `getClassicyAppearanceLayout(ds.System.Manager.Appearance.packageId).desktop.iconGridOrigin`. `createGrid` (26-31) is unchanged. Then parity: re-shoot `dialogs-alert--*`, `controls-disclosure--*`, `controls-tabs--*`, `desktop-desktop--*`, `desktop-desktopicon--*` → AE `0` (the Tabs flex-column switch must leave the −1 px overhang in place).

### 7: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/Alert src/SystemFolder/SystemResources/Disclosure src/SystemFolder/SystemResources/Tabs` — Expected: PASS, including `ClassicyDesktopIconEventHandler.test.ts:320-345` unchanged.

### 8: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/SystemResources/{Alert,Disclosure,Tabs,Desktop} && git commit -m "feat(layout): alert, disclosure and tabs parts orderable; desktop clean-up reads iconGridOrigin"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Alert src/SystemFolder/SystemResources/Disclosure src/SystemFolder/SystemResources/Tabs
- [ ] Every non-help alert button carries `data-classicy-role`; `.classicyAlertIcon`/`.classicyAlertBody` have `order` 10/20 and buttons none; `labelPosition="left"` is the `classicyDisclosureLabelLeft` class with `order: -1`; `stripPosition="bottom"` is the `classicyTabStripBottom` class on a flex-column container.
- [ ] `classicyDesktopIconGridPosition` returns `[880, 64]`, `[16, 64]`, `[880, 560]`, `[16, 560]` for the four origins at 1024×768 and `ClassicyDesktopIconCleanup` honors the active package's origin.

## Files

- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` - modify: data-classicy-role on every non-help button
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - modify: icon/body order
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx` - modify: single JSX order plus label-left class
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss` - modify: order rule for the left label
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx` - modify: stripPosition prop
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` - modify: flex column; bottom-strip order
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` - modify: grid origin parameter and reducer wiring
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts` - create: four-origin grid tests
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.layout.test.tsx` - create: role attribute and order tests
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.test.tsx` - modify: label-left class test
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.layout.test.ts` - create: flex column and strip class tests

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T04:27:21.676Z - F 6.1 implemented (f2e4faf38): alert/disclosure/tabs parts orderable, stripPosition prop, desktop clean-up reads iconGridOrigin store-free. 4074 tests; 30 alert/disclosure/tabs/desktop stories AE 0. Known: bottom tab strip art still points up (carried to 7.1). Task review dispatched.

### 2026-10-30T04:31:53.199Z - Task review: Needs fixes. Important: bottom-origin clean-up put row 4 at y=-16 (the plan's formula has no row cap). Controller ruling F-R5: cap rows for bottom origins, and createGrid counts columns with the real step (an older 80 px bug gave 11 columns at 1024 px). Minors: aria-hidden on the disclosure triangle svg, consistent vocabulary entries, shared compiled-CSS test helper. All sent to the F 7.1 worker as a separate commit. The G merge naming trap (cell vs step) is recorded in the carry-forward.
