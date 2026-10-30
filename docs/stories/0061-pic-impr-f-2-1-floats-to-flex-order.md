---
id: 0061-pic
title: 'F 2.1: Floats to flex + order'
purpose: Lay the menu bar out as a flex row whose six clusters are placed by order on their data-classicy-part attribute, so a package can rearrange it without touching DOM order or fighting floats.
type: impr
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:29:34.870Z"
updated: "2026-10-30T00:28:05.735Z"
started: "2026-10-30T00:28:04.107Z"
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
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0060-ez9", "depends"]
  plans:
    - ["0010-743", "included", ["2.1"]]
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
---

# F 2.1: Floats to flex + order

## Problem Statement

Audit §5: the menu bar's right cluster is `float: right` plus DOM order (`ClassicyDesktopMenuBar.scss:48-56,67-70`, `Widgets/Time/ClassicyDesktopMenuWidgetTime.scss:2`; items are `.classicyMenuItem { float: left }`, `ClassicyMenu.scss:112-114`), and a comment at `ClassicyDesktopMenuBar.tsx:361-362` relies on render order to land Extensions left of the clock — floats defeat CSS `order`. Today's visual order, left to right: Apple, app menus, Help, Extensions, Clock, App Switcher.

This section (plan 0010-743 §2.1, umbrella 0002-ldj; §9 Phase 5 item 6) makes `.classicyDesktopMenu` a flex row with `align-items: flex-start` (floats are top-aligned own-height boxes), places each cluster by `order` on Part A's `data-classicy-part` (`apple` 10, `app` 20, `help` 30, `extensions` 40 + `margin-left: auto`, `clock` 50, `switcher` 60) and deletes the three `float: right` declarations.

**Impact:** Without it a package cannot move the Apple menu, clock or switcher (7.1's mirrored menu bar story has nothing to flip), and the headless-bar work in 5.1 would still inherit float-dependent layout.

## Steps

### 1: Write the failing tests

`ClassicyDesktopMenuBar.layout.test.tsx` — style half compiles `ClassicyDesktopMenuBar.scss`, `ClassicyMenu.scss` and the Time widget SCSS with `sass.compile`:
```ts
it("lays the bar out with flex and order, no floats", () => { const bar = rule(".classicyDesktopMenu"); expect(bar.display).toBe("flex"); expect(bar["align-items"]).toBe("flex-start"); expect(rule('.classicyDesktopMenu > [data-classicy-part="extensions"]')["margin-left"]).toBe("auto"); for (const [part, order] of [["apple","10"],["app","20"],["help","30"],["extensions","40"],["clock","50"],["switcher","60"]]) expect(rule(`.classicyDesktopMenu > [data-classicy-part="${part}"]`).order).toBe(order); expect(menuBarCss + timeCss).not.toMatch(/float: right/); });
```
DOM half renders `<ClassicyDesktopMenuBar />` inside the providers the existing `ClassicyDesktopMenuBar.test.tsx:36-60` uses: `it("tags every cluster", () => { for (const part of ["apple","help","switcher","extensions","clock"]) expect(container.querySelector(`.classicyDesktopMenu > [data-classicy-part="${part}"]`)).not.toBeNull(); })` and, with an app menu published, `app` too.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx` — Expected: FAIL (`display` is `inline-block`; floats present).

### 3: Rewrite `ClassicyDesktopMenuBar.scss:18-31, 48-56, 67-70` and `ClassicyDesktopMenuWidgetTime.scss:2`

`.classicyDesktopMenu { display: flex; flex-direction: row; align-items: flex-start; width: 100%; box-sizing: border-box }` (other declarations unchanged: keep `padding: 0 var(--window-control-size)`, the radius, background and shadow verbatim); `.classicyDesktopMenu > * { float: none }`; `order` by part: `[data-classicy-part="apple"] { order: 10 }`, `app` 20, `help` 30, `extensions` 40 plus `margin-left: auto`, `clock` 50, `switcher` 60; the three `float: right` declarations are deleted. Rewrite the DOM comment at `ClassicyDesktopMenuBar.tsx:361-362` ("order via data-classicy-part; see ClassicyDesktopMenuBar.scss").

### 4: Confirm the cluster attributes sit on the flex items

If `attributes.txt` (Phase 0) shows a part attribute on a descendant rather than on the direct child `li`/`ul` of `.classicyDesktopMenu`, move it to the direct child (`ClassicyMenuItem.className` cannot carry attributes: extend the item's `<li>` at `ClassicyMenu.tsx:340-374` to spread `menuItem.part ? { "data-classicy-part": menuItem.part } : {}` and set `part` on the Apple, Help and switcher items at `:279-284, 298-299`).

### 5: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar` — Expected: PASS. Re-shoot `desktop-menubar--*`, `desktop-menubar-extension--*`, `desktop-desktop--*`, `desktop-app--*` into `after/`; `compare -metric AE` → `0`. A non-zero means an item's height changed under stretch — `align-items: flex-start` is the fix, never the screenshot.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/SystemResources/Desktop/MenuBar src/SystemFolder/SystemResources/Menu && git commit -m "refactor(menubar): flex clusters ordered by data-classicy-part instead of floats"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: git grep -n 'float: right' src/SystemFolder/SystemResources/Desktop/MenuBar  # expect no output
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx
- [ ] The six clusters are direct flex children of `.classicyDesktopMenu` with `order` 10/20/30/40/50/60 and `extensions` carries `margin-left: auto`.

## Files

- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss` - modify: flex bar, order per cluster, floats removed
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss` - modify: drop float: right
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - modify: comment; part attributes on direct children if needed
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx` - create: compiled-CSS and DOM cluster tests

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T00:28:05.735Z - Started on feat/appearance-part-f (worktree part-f) at BASE f95309251 (F 1.1 approved). The brief is the part-f ledger task-2.1-brief.md. The first commit is test-only: the F 1.1 review's minor carry-forwards. Parity: port 6025 against the shared post-B baseline.
