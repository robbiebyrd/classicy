---
id: 0062-sxu
title: 'F 3.1: Control-box order, hideable stripes, grip position by attribute'
purpose: Make the window's close, zoom and collapse boxes addressable by order on data-classicy-control, keep the stripe spans hideable, and position the grow-box grip by the desktop's data-classicy-grow-box attribute.
type: feat
status: pending
priority: "2"
effort: S
created: "2026-10-28T20:30:04.823Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0061-pic", "depends"]
  plans:
    - ["0010-743", "included", ["3.1"]]
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

# F 3.1: Control-box order, hideable stripes, grip position by attribute

## Problem Statement

Audit §5: the title bar's boxes all share the wrapper class `.classicyWindowControlBox` (`ClassicyWindow.tsx:1689-1758`, the flex items of `.classicyWindowTitleBar`, `ClassicyWindow.scss:242-243`), so CSS can only reorder them with fragile `nth-child`; the grip is pinned bottom-right by `right`/`bottom: var(--window-border-size)` (`:374-385`).

This section (plan 0010-743 §3.1, umbrella 0002-ldj; §8.8 "CSS-only" slots) guarantees Part A's `data-classicy-control` sits on the wrapper (the flex item), declares explicit base `order`s that match today's DOM order (close 10, title 20, zoom 30, collapse 40), adds grip rules keyed on the desktop root's `data-classicy-grow-box` for the three other corners, and pins that the stripe spans carry no `!important` display so a package can hide them. Pixels are unchanged for Platinum.

**Impact:** Without it a package cannot put the close box on the right or move the grip (7.1's mirrored window story), and 4.1's resize math would move a grip the CSS still draws bottom-right.

## Steps

### 1: Write the failing tests

`ClassicyWindow.layout.test.ts` (sass-compiled `ClassicyWindow.scss`, `rule()` helper):
```ts
it("orders the title-bar parts explicitly", () => { expect(rule('<title bar selector> [data-classicy-control="close"]').order).toBe("10"); expect(rule("<title bar selector> .classicyWindowTitle").order).toBe("20"); expect(rule('<title bar selector> [data-classicy-control="zoom"]').order).toBe("30"); expect(rule('<title bar selector> [data-classicy-control="collapse"]').order).toBe("40"); });
it("moves the grip by the desktop's grow-box attribute", () => { const bl = rule('[data-classicy-grow-box="bottom-left"] <resizer selector>'); expect(bl.left).toBe("var(--window-border-size)"); expect(bl.right).toBe("auto"); const tl = rule('[data-classicy-grow-box="top-left"] <resizer selector>'); expect(tl.top).toBe("var(--window-border-size)"); expect(tl.bottom).toBe("auto"); });
it("stripe spans can be hidden by a package", () => { expect(css).not.toMatch(/classicyWindowTitle(Left|Center|Right)[^}]*display:[^;]*!important/); });
```
`ClassicyWindow.titlebar.test.tsx` addition: `it("tags each control wrapper", () => { for (const c of ["close","zoom","collapse"]) expect(container.querySelector(`.classicyWindowControlBox[data-classicy-control="${c}"]`)).not.toBeNull(); })` (use the suite's existing render helper at `:105-112`). Read `<title bar selector>` / `<resizer selector>` off the compiled stylesheet with the same `rule()` helper the resizer test uses.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx` — Expected: FAIL (`order` undefined; wrapper selector null when A tagged the inner box).

### 3: Put `data-classicy-control` on the wrappers

`ClassicyWindow.tsx:1690, 1732, 1746` (or the same three wrappers in `ClassicyWindowTitleBar.tsx` once Part E lands): `<div className="classicyWindowControlBox" data-classicy-control="close">` etc.; keep A's inner attribute if present.

### 4: Add the `order` and grip rules to `ClassicyWindow.scss`

Inside the title-bar block (after `:251`): `[data-classicy-control="close"] { order: 10 }`, `.classicyWindowTitle { order: 20 }`, `[data-classicy-control="zoom"] { order: 30 }`, `[data-classicy-control="collapse"] { order: 40 }`. After the resizer rule (`:385`): `[data-classicy-grow-box="bottom-left"] & { left: var(--window-border-size); right: auto }`, `[data-classicy-grow-box="top-right"] & { top: var(--window-border-size); bottom: auto }`, `[data-classicy-grow-box="top-left"] & { left: var(--window-border-size); right: auto; top: var(--window-border-size); bottom: auto }` (`&` = the resizer; the attribute is on the desktop root). The stripe spans need no base change.

### 5: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources/Window` — Expected: PASS. Re-shoot `desktop-window--*`; `compare -metric AE` → `0`.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/SystemResources/Window && git commit -m "feat(window): control boxes and grip addressable by data-classicy-control and data-classicy-grow-box"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts
- [ ] Each `.classicyWindowControlBox` wrapper carries `data-classicy-control`; base `order` is close 10, title 20, zoom 30, collapse 40; the grip moves with `[data-classicy-grow-box]` for the three other corners.
- [ ] No `display … !important` on `.classicyWindowTitleLeft/Center/Right`.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: control-box order defaults, grip position by attribute
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify: data-classicy-control on the wrappers
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts` - create: compiled-CSS order and grip tests
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx` - modify: wrapper attribute test

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
