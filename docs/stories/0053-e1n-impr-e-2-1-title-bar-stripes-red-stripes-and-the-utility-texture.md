---
id: 0053-e1n
title: 'E 2.1: Title-bar stripes, red stripes and the utility texture'
purpose: Draw the window title-bar stripes, the red error stripes and the utility crosshatch from masked package art over theme colors instead of base64 images with baked hex.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:23:54.842Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/styles/_assets.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0052-44l", "depends"]
  plans:
    - ["0009-agy", "included", ["2.1"]]
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
---

# E 2.1: Title-bar stripes, red stripes and the utility texture

## Problem Statement

Audit §2.2 / §1.2: the title-bar stripes (`#fff`/`#787878`), the red stripes (`#ef8c89`/`#f9dada`) and the utility crosshatch (`#ccc` with radial alpha layers) are base64 SVGs consumed at `ClassicyWindow.scss:101,106-107,117,126,202-216,680-682`, `ClassicyWindowFrame.scss:19-20` and `ClassicyAlert.scss:92-106`; no theme or package can recolor them.

This section (plan 0009-agy §2.1, umbrella 0002-ldj) replaces each with a `::before`/`::after` pseudo-element whose `mask-image` is the registered art and whose `background-color` is a theme or Platinum custom property, mirroring every old `background-*` longhand with the same `mask-*` value so the raster is unchanged. The stripe caps are deleted if Phase 0 measured them at `0px` (they never painted).

**Impact:** The stripes are the most visible Platinum art; if this story is skipped `_assets.scss` cannot drop its data URIs (acceptance criterion of the plan) and 6.1 cannot move the stripe block into the shared title-bar mixin.

## Steps

### 1: Write the failing style tests

`ClassicyWindow.art.test.ts` compiles `ClassicyWindow.scss`, `ClassicyWindowFrame.scss` and `ClassicyAlert.scss` with `sass.compile` (the `rule()` helper from `ClassicyWindow.resizer.test.ts:33-60`):
```ts
it("draws the active stripes as a masked dark layer over a light ground", () => { const el = rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter"); expect(el["background-color"]).toBe("var(--platinum-stripe-light)"); const before = rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter::before"); expect(before["mask-image"]).toBe("var(--classicy-art-window-stripes)"); expect(before["mask-size"]).toBe("auto 100%"); expect(before["background-color"]).toBe("var(--platinum-stripe-dark)"); });
it("keeps the 99.8% stripe scale on the side bands", () => { expect(rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleLeft::before")["mask-size"]).toBe("auto 99.8%"); });
it("red windows use the red mask and colors", () => { const b = rule(".classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter::before"); expect(b["mask-image"]).toBe("var(--classicy-art-window-stripes-red)"); expect(b["background-color"]).toBe("var(--platinum-stripe-red-dark)"); });
it("utility texture is two masked radial layers at 4px 3px", () => { const s = rule(".classicyWindowUtility .classicyWindowTitleCenter::before"); expect(s["mask-image"]).toBe("var(--classicy-art-window-utility-shade)"); expect(s["mask-size"]).toBe("4px 3px"); expect(rule(".classicyWindowUtility .classicyWindowTitleCenter::after")["mask-image"]).toBe("var(--classicy-art-window-utility-highlight)"); });
it("no stylesheet embeds stripe art any more", () => { for (const css of [windowCss, frameCss, alertCss]) expect(css).not.toMatch(/data:image\/svg\+xml/); });
```
Adjust the selector strings to the exact nesting the compiled output prints (Part A reordered the file); the assertions on values are the contract.

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts` — Expected: FAIL (`mask-image` undefined, data URIs present).

### 3: Declare the Platinum stripe custom properties in `src/Appearance/Platinum/styles/_assets.scss`

Replace the 13 `$…: url(...)` variables with the four declarations on the package root (inside the `classicy-package("platinum")` scope): `--platinum-stripe-light: var(--color-white)`, `--platinum-stripe-dark: #787878`, `--platinum-stripe-red-light: #f9dada`, `--platinum-stripe-red-dark: #ef8c89` (the HIG stripe grays are not theme tokens; Part G may re-derive them). Keep a comment naming HIGOS8 Figure 3-1 and the original hex values.

### 4: Rewrite the stripe consumers (Window active 101-129, red 202-216, WindowFrame 19-20, Alert 92-106)

Locate each post-Part-B with `git grep -n 'assets\.\$'`. Pattern, applied identically to `.classicyWindowTitleCenter`, `.classicyWindowTitleLeft`, `.classicyWindowTitleRight` under the active/red/frame/alert selectors: the element gets `position: relative; background-color: var(--platinum-stripe-light)` and `&::before { content: ""; position: absolute; inset: 0; pointer-events: none; background-color: var(--platinum-stripe-dark); mask-image: var(--classicy-art-window-stripes); mask-repeat: repeat; mask-position: 0 0; mask-size: <the value the old background-size had: auto 100% for center, auto 99.8% for left/right, auto where none was set> }`. Red variants swap the two custom properties and the mask key.

Caps: per the Phase 0 gate result `["0px","0px"]`, delete the `&:after`/`&:before` cap blocks (Window 109-128, 210-216, Alert 100-106) outright — they never painted. Fallback (only if the gate measured a non-zero height): keep the pseudo boxes with their exact `position/top/right/left/float/width/display` declarations, give each `background-color: var(--platinum-stripe-light)` plus `mask-image: var(--classicy-art-window-stripes-cap-left|right)` and register `windowStripesCapLeft/Right` (+ `Red`) masks of the opaque pixels (3×12: left cap even rows x0-2 and odd rows x1-2; right cap even rows x0-1 and odd rows x0-2) in 1.1's map; the dark rows then come from a `repeating-linear-gradient(to bottom, transparent 0 1px, var(--platinum-stripe-dark) 1px 2px)` background-image on the same pseudo.

### 5: Rewrite the utility texture (Window 677-688)

`.classicyWindowUtility .classicyWindowTitleCenter { background-color: var(--color-system-03); &::before { mask-image: var(--classicy-art-window-utility-shade); background-color: var(--color-black) } &::after { mask-image: var(--classicy-art-window-utility-highlight); background-color: var(--color-white) } }` both with `mask-repeat: repeat; mask-size: 4px 3px; inset: 0; position: absolute`, replacing lines 680-682 and the `content: none` at 684-687. Remove the `!important`s only if Part A left them; never add new ones.

### 6: Run tests, then parity for the window stories

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert` — Expected: PASS. Then re-shoot `desktop-window--*`, `dialogs-alert--*`, `desktop-windowframe--*` into `.playwright-mcp/parity/part-E/after/` and `compare -metric AE before/<id>.png after/<id>.png null:` → `0` for every window and alert story. WindowFrame stories may differ (named change (a)) only once 6.1 lands; at this step they must still be `0`. A non-zero elsewhere means a `mask-*` longhand does not mirror its old `background-*` twin — fix the SCSS, never the screenshot.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance/Platinum/styles src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert && git commit -m "refactor(window): draw title-bar stripes and utility texture from masked package art"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts
- [ ] `_assets.scss` declares `--platinum-stripe-light/dark` and `--platinum-stripe-red-light/dark` on the package root and holds no `url(` data URI.
- [ ] Every stripe and utility pseudo-element mirrors the old `background-*` longhands with the same `mask-*` values (`auto 100%`, `auto 99.8%`, `4px 3px`).

## Files

- `src/Appearance/Platinum/styles/_assets.scss` - modify: data URIs out, --platinum-stripe-* in
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: stripes, red stripes, utility texture via masks
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` - modify: frame stripes via mask
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` - modify: movable-alert red stripes via masks
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts` - create: compiled-CSS assertions

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
