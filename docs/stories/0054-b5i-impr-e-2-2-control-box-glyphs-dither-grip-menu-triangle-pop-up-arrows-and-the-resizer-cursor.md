---
id: 0054-b5i
title: 'E 2.2: Control-box glyphs, dither, grip, menu triangle, pop-up arrows and the resizer cursor'
purpose: Make the zoom/collapse glyphs, control-box dither, grow-box grip, submenu triangle and pop-up indicator read registered package art, and move the resizer cursor choice from JS into CSS.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:24:32.303Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/Appearance/Platinum/styles/_mixins.scss
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss
      - src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts
      - src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0053-e1n", "depends"]
  plans:
    - ["0009-agy", "included", ["2.2"]]
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

# E 2.2: Control-box glyphs, dither, grip, menu triangle, pop-up arrows and the resizer cursor

## Problem Statement

Audit §2.2 and §3.3: the collapse and zoom glyphs (`ClassicyWindow.scss:342, 350-352`), the grow-box grip (`:394-399`), the control-box corner dither (`platinumWindowControlBox` `&:before`, `appearance.scss:128-132`), the submenu triangle (`ClassicyMenu.scss:227-229`) and the pop-up indicator (`ClassicyPopUpMenu.scss:116-119`) are base64 images with baked color, and `ClassicyWindow.tsx:1833-1834` picks the resize cursor in JS.

This section (plan 0009-agy §2.2, umbrella 0002-ldj) draws the single-color glyphs as masks over `--color-black`, keeps the four-gray grip and six-gray luminosity dither as package images (no single-color mask equivalent), and moves the cursor to `cursor: var(--classicy-cursor-resize-lr), auto` on the resizer. The zoom glyph's `#231f20` becoming `--color-black` is named visual change (b), confined to the zoom box.

**Impact:** Leaves data URIs in the window, menu and pop-up stylesheets and a JS cursor choice, so the plan's `git grep 'data:image'` and `setCursor` acceptance criteria fail and no package can swap those glyphs.

## Steps

### 1: Write the failing tests

Append to `ClassicyWindow.art.test.ts`:
```ts
it("zoom and collapse glyphs are masks over --color-black", () => { const z = rule("<zoom box selector>::after"); expect(z["mask-image"]).toBe("var(--classicy-art-zoom-glyph)"); expect(z["mask-position"]).toBe("top left"); expect(z["background-color"]).toBe("var(--color-black)"); expect(z.opacity).toBe("0.65"); expect(rule("<collapse box selector>::after")["mask-image"]).toBe("var(--classicy-art-collapse-glyph)"); });
it("grip and dither are package images with unchanged geometry", () => { const g = rule("<resizer selector>"); expect(g["background-image"]).toBe("var(--classicy-art-window-grip)"); expect(g["background-size"]).toBe("calc(var(--window-control-size) - (var(--window-border-size) * 2))"); });
```
In `ClassicyWindow.resizer.test.ts` add `it("asks for the package's horizontal resize cursor", () => { expect(rule(<the resizer selector line 136 uses>).cursor).toBe("var(--classicy-cursor-resize-lr), auto"); })`. `ClassicyMenu.art.test.ts` (compile `ClassicyMenu.scss` and `ClassicyPopUpMenu.scss`): `expect(rule(".classicyMenuItemChildMenuIndicator::after")["mask-image"]).toBe("var(--classicy-art-submenu-arrow)")`, `mask-position` `right center`; `expect(rule(".classicyPopUpMenuIndicator")["mask-image"]).toBe("var(--classicy-art-popup-arrows)")`, `mask-size` `45%`; both css strings contain no `data:image`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts` — Expected: FAIL on the new cases only.

### 3: Rewrite the six SCSS sites

Glyph pseudo-elements: `background-color: var(--color-black); mask-image: var(--classicy-art-<key>); mask-repeat: no-repeat; mask-position: <old background-position>` (collapse/zoom keep `opacity: .65`). Grip and dither stay images: `background-image: var(--classicy-art-window-grip)` / `var(--classicy-art-window-dither)` with every other longhand unchanged. Sites: zoom/collapse (`ClassicyWindow.scss:340-354`), grip (`:394`), dither (`_mixins.scss` `platinum-window-control-box` `&:before`: `no-repeat`, `cover`, `mix-blend-mode: luminosity`, `opacity: .25`), submenu arrow (`ClassicyMenu.scss:227`: `1em` box, `no-repeat`, `right center`), pop-up indicator (`ClassicyPopUpMenu.scss:116`: `no-repeat`, `center`, `45%`); delete every `@use` of the old assets module these files still carry; add `.classicyWindowResizer { cursor: var(--classicy-cursor-resize-lr), auto; }` beside `:374-400`.

### 4: Delete the JS cursor choice in `ClassicyWindow.tsx:1833-1834`

Remove the `onMouseEnter={() => setCursor("resizeLr")}` / `onMouseLeave={() => setCursor()}` pair; `grep -n setCursor src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` → if empty, remove the `useClassicyCursor` call and import.

### 5: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu src/SystemFolder/SystemResources/PopUpMenu` — Expected: PASS.

### 6: Parity

Re-shoot `desktop-window--*`, `desktop-menu--*`, `controls-popupmenu--*`, `desktop-windowframe--*`; `compare -metric AE` → `0` everywhere except `desktop-window--default` / other zoomable window stories, where the only permitted difference is inside the zoom box (verify with `compare before after diff.png` and inspect: the highlighted pixels lie within the 12×12 zoom box).

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src/SystemFolder/SystemResources/{Window,Menu,PopUpMenu} src/Appearance/Platinum/styles && git commit -m "refactor(appearance): window glyphs, grip, dither and menu arrows read registered package art"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: git grep -n 'data:image/svg' src/SystemFolder --include='*.scss' -- ':!src/SystemFolder/SystemResources/Slider' ':!src/SystemFolder/SystemResources/Tabs' ':!src/SystemFolder/SystemResources/Icon' ':!src/SystemFolder/SystemResources/Desktop'  # expect no output
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts
- [ ] `ClassicyWindow.tsx` no longer calls `setCursor`; the resizer's cursor is `var(--classicy-cursor-resize-lr), auto` in CSS.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: glyph masks, grip image, resizer cursor
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify: drop setCursor handlers
- `src/Appearance/Platinum/styles/_mixins.scss` - modify: dither via --classicy-art-window-dither
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` - modify: submenu arrow mask
- `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` - modify: pop-up indicator mask
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts` - modify: glyph, grip and dither assertions
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts` - modify: cursor assertion
- `src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts` - create: menu and pop-up mask assertions

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
