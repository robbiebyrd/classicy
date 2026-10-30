---
id: 0058-83a
title: 'E 6.1: One ClassicyWindowTitleBar for ClassicyWindow and ClassicyWindowFrame'
purpose: Give ClassicyWindow and ClassicyWindowFrame one shared title-bar component and SCSS mixin so a package skins one thing, then close Part E with the full parity shoot, docs and build verification.
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:28:02.193Z"
updated: "2026-10-30T05:44:23.281Z"
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
      - src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.test.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx
      - .playwright-mcp/parity/part-E/after/
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0057-yxq", "depends"]
  plans:
    - ["0009-agy", "included", ["6.1"]]
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

# E 6.1: One ClassicyWindowTitleBar for ClassicyWindow and ClassicyWindowFrame

## Problem Statement

Audit §5: `ClassicyWindow` (`ClassicyWindow.tsx:1683-1759`) and `ClassicyWindowFrame` (`ClassicyWindowFrame.tsx:51-60`) are two parallel title-bar implementations sharing no markup, so an Appearance Package must skin two things.

This section (plan 0009-agy §6.1, umbrella 0002-ldj; §9 Phase 5 item 5) extracts the window's title-bar DOM byte-for-byte into `ClassicyWindowTitleBar` and its SCSS into two mixins that both chromes include, keeping Part A's `data-classicy-control` attributes. `ClassicyWindowFrame` adopts the window title bar (named visual change (a): 19 px, `--ui-font-size` text, left/right stripe bands). It is Part E's last section, so it also runs the full parity shoot, writes the docs and verifies the build.

**Impact:** A package would keep skinning two title bars (Part F's control-box `order` and Part I's hooks would each need two sites), and Part E would end without its parity proof, docs or `dist` check.

## Steps

### 1: Write the failing tests

`ClassicyWindowTitleBar.test.tsx`:
```ts
it("renders close, zoom and collapse boxes only for the handlers given", () => { const { container } = render(<ClassicyWindowTitleBar title="T" onClose={vi.fn()} onCollapse={vi.fn()} />); expect(container.querySelector(".classicyWindowCloseBox")).not.toBeNull(); expect(container.querySelector(".classicyWindowZoomBox")).toBeNull(); expect(container.querySelector(".classicyWindowCollapseBox")).not.toBeNull(); });
it("hides the zoom box on a modal title bar even with onZoom", …);
it("keeps the Part A control attributes", () => { expect(container.querySelector('[data-classicy-control="close"]')).not.toBeNull(); });
it("renders the utility center band instead of title text", () => { render(<ClassicyWindowTitleBar title="Tools" variant="utility" />); expect(container.querySelector(".classicyWindowTitleText")).toBeNull(); expect(container.querySelector(".classicyWindowTitleCenter")).not.toBeNull(); });
it("fires onTitleDoubleClick and onTitleMouseDown from the title area", …);
```
`ClassicyWindowFrame.test.tsx:22-30`: the selector becomes `.classicyWindowTitleText`; add `it("draws the shared title bar", () => expect(container.querySelector(".classicyWindowFrame > .classicyWindowTitleBar")).not.toBeNull())`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.test.tsx src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx` — Expected: FAIL (module not found; frame selector null).

### 3: Implement `ClassicyWindowTitleBar.tsx` and the two SCSS mixins

`export type ClassicyWindowTitleBarProps = { title: string; icon?: string; hideIcon?: boolean; variant?: "document" | "utility"; modal?: boolean; onClose?: () => void; onZoom?: () => void; onCollapse?: (e: MouseEvent<HTMLDivElement>) => void; onCollapseKey?: () => void; onTitleMouseDown?: (e: MouseEvent<HTMLDivElement>) => void; onTitleDoubleClick?: () => void; className?: string }`; `export const ClassicyWindowTitleBar: FunctionalComponent<ClassicyWindowTitleBarProps>` renders byte-for-byte the DOM of `ClassicyWindow.tsx:1683-1759`: the close box when `onClose` is set, the zoom box when `onZoom && !modal`, the collapse box when `onCollapse` is set (Enter/Space on it calls `onCollapseKey ?? onCollapse`), the utility branch when `variant === "utility"`; carry over Part A's `data-classicy-control` attributes verbatim. Cut lines 1683-1759 into the component (handlers become props; the three `biome-ignore` comments move with their elements). `ClassicyWindowTitleBar.scss`: `@mixin classicy-window-title-bar` (the block `ClassicyWindow.scss:237-358` verbatim) and `@mixin classicy-window-title-bar-stripes` (`:88-131` verbatim, as rewritten by 2.1). `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Render it from `ClassicyWindow.tsx` and `ClassicyWindowFrame.tsx`

Window: `<ClassicyWindowTitleBar title={title} icon={icon} hideIcon={hideIcon} variant={windowType === "utility" ? "utility" : "document"} modal={modal === true} onClose={closable ? close : undefined} onZoom={zoomable ? toggleZoom : undefined} onCollapse={collapsable ? onCollapseBoxClick : undefined} onCollapseKey={toggleCollapse} onTitleMouseDown={onTitleMouseDown} onTitleDoubleClick={doubleClickTitleToCollapse ? toggleCollapse : undefined} />`. `ClassicyWindow.scss` replaces the two blocks with `@include title-bar.classicy-window-title-bar` inside `.classicyWindow` and `@include title-bar.classicy-window-title-bar-stripes` inside `.classicyWindowActive`, at the same positions, so the compiled rules are identical. `ClassicyWindowFrame.scss` includes both mixins inside `.classicyWindowFrame` and deletes `.classicyWindowFrameTitleBar`/`.classicyWindowFrameTitleText` (`:14-30`); `ClassicyWindowFrame.tsx` renders `<ClassicyWindowTitleBar title={title} hideIcon />`. The existing `ClassicyWindow.titlebar`, `.hig`, `.utility`, `.collapse`, `.beforeclose`, `.resizeSize` suites must stay green unchanged — they are the DOM-identity gate.

### 5: Run the window suites

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/WebViewer` — Expected: PASS with no test edited other than the two named in Step 1.

### 6: Full parity

Re-shoot every id in `stories.txt` into `after/`; `for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected `0` for every story except: `desktop-windowframe--*` (named change (a); run `compare before after diff.png` and confirm the highlighted pixels sit within the title-bar band, y ≤ 19 px below the frame's top border), zoomable window stories (change (b), zoom box only), and title-less center bands (change (c): re-run those with `-fuzz 1%` → `0`). Anything else: fix SCSS, never the screenshot.

### 7: Document

`docs/AGENT-REFERENCE.md`: add `ClassicyWindowTitleBar` props, the `--classicy-art-*` keys Platinum registers (1.1 + 4.1), `ClassicyPixelArt`'s `art` prop and `encode/decodeClassicyPixelArtRows`, `CLASSICY_MODIFIER_GLYPHS`/`keyboardShortcutModifiers`. `CLAUDE.md`: in the Theming section add one paragraph: Platinum art lives in `src/Appearance/Platinum/assets/` and is read via `var(--classicy-art-<key>)` masks or `::before` glyph content in `_glyphs.scss`; never embed a data URI or a text glyph in component code.

### 8: Lint, type-check, commit, final verification

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src/SystemFolder/SystemResources/Window src/index.ts docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "refactor(window): one ClassicyWindowTitleBar for ClassicyWindow and ClassicyWindowFrame"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer). Then `pnpm build:source` → PASS; `grep -c 'data:image/svg' dist/classicy.css` → 0; stop background dev servers.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window && grep -c 'data:image/svg' dist/classicy.css  # 0 after pnpm build:source
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [ ] `ClassicyWindow` and `ClassicyWindowFrame` both render `ClassicyWindowTitleBar`; the `.titlebar`, `.hig`, `.utility`, `.collapse`, `.beforeclose` and `.resizeSize` window suites pass unedited; `data-classicy-control` attributes are present.
- [ ] `docs/AGENT-REFERENCE.md` and `CLAUDE.md` document `ClassicyWindowTitleBar`, the Platinum art keys, the `art` prop and the modifier table.
- [ ] OWNER ruling E20: the title-bar stripe bands reach exact parity (AE 0, or at most 2 levels under named change (c)) on every band: titled sides, title-less center, red center, WindowFrame and windoid. Use four masked layers per band (or whatever structure the measurements prove exact) to remove E 2.1's interim drift (center 21, red 14, frame 13). Part E does not land until this holds.
- [ ] (Deferred from E 3.1 under G16; checked on the integration branch once both E and G have landed.) The _Icon.scss/_DesktopIcon.scss halftone is G's ::before masked by var(--classicy-art-halftone...) at 7% over --color-black; icon and desktop-icon stories are AE 0 on the merged tree; git grep -n -E 'data:image/svg|theme-halftone|encode-color' -- 'src/*.scss' prints nothing (drop G's built-in data: fallback in _mixins.scss, since Platinum always publishes the variable where package CSS applies, or exclude it explicitly here).

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.tsx` - create: shared title bar
- `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.scss` - create: title-bar and stripes mixins
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify: render ClassicyWindowTitleBar
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: blocks become mixin includes
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx` - modify: render ClassicyWindowTitleBar
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` - modify: include mixins, drop frame-only title rules
- `docs/AGENT-REFERENCE.md` - modify: Part E API additions
- `CLAUDE.md` - modify: one paragraph on package art
- `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.test.tsx` - create: component tests
- `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx` - modify: shared title-bar selectors
- `.playwright-mcp/parity/part-E/after/` - create: after screenshots

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
