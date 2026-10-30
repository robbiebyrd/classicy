---
id: 0066-874
title: 'F 7.1: Storybook mirrored stories, Playwright position checks, final parity and docs'
purpose: Prove every arrangement slot with a Storybook-only mirrored appearance package and six Mirrored stories checked by Playwright position expressions, then close Part F with the full parity shoot, docs and build verification.
type: chor
status: complete
priority: "2"
effort: L
created: "2026-10-28T20:33:07.123Z"
updated: "2026-10-30T05:58:29.081Z"
started: "2026-10-30T04:27:30.845Z"
completed: "2026-10-30T05:58:29.081Z"
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
      - storybook/.storybook/MirroredPackage.ts
      - storybook/.storybook/mirrored.scss
      - storybook/.storybook/ClassicyDecorators.tsx
      - storybook/.storybook/helpers.tsx
      - storybook/.storybook/preview.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx
      - src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.stories.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.stories.tsx
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx
      - src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx
      - docs/AGENT-REFERENCE.md
      - CLAUDE.md
      - storybook/.storybook/MirroredPackage.test.ts
      - .playwright-mcp/parity/part-F/after/
      - .playwright-mcp/parity/part-F/mirrored.txt
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0065-8mp", "depends"]
  plans:
    - ["0010-743", "included", ["7.1"]]
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

# F 7.1: Storybook mirrored stories, Playwright position checks, final parity and docs

## Problem Statement

Umbrella 0002-ldj scopes the program's proof of arrangement as "one mirrored Storybook story per surface (part F)" rather than a second shipped package; audit §9 Phase 5 item 6 asks for mirrored stories (close box right, grip bottom-left, menu bar in window) as the proof the slots work.

This section (plan 0010-743 §7.1) registers a Storybook-only `mirrored` package (`layout` flipped on all three declarations, CSS flipping `order` on the part attributes), teaches the `withClassicy` decorator (`ClassicyDecorators.tsx:52-105`) a `parameters.classicy.appearancePackage` switch, adds six `Mirrored` stories, records a Playwright position expression per story, re-shoots the full parity set, documents the slots and runs the build gates. It is Part F's last section, so the plan's final verification is folded in.

**Impact:** Without it the arrangement slots have no end-to-end proof, the parity gate for Part F is never closed, and `docs/AGENT-REFERENCE.md`/`CLAUDE.md` do not describe layout declarations or the mirrored template a second package starts from.

## Steps

### 1: Write the failing Storybook smoke test

`storybook/.storybook/MirroredPackage.test.ts` (vitest runs it from the root config if `storybook/**` is included; otherwise put it at `src/Appearance/MirroredPackage.test.ts` importing from `../../storybook/.storybook/MirroredPackage`): `it("registers the mirrored package with flipped layout", () => { import "./MirroredPackage"; expect(getClassicyAppearancePackage("mirrored")?.layout).toEqual({ window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } }); expect(getClassicyAppearancePackage("mirrored")?.css).toMatch(/\[data-classicy-appearance="mirrored"\]/); })`.

### 2: Run it to verify it fails

`pnpm exec vitest run MirroredPackage` — Expected: FAIL (module not found).

### 3: Implement `MirroredPackage.ts`, `mirrored.scss`, the decorator parameter and `mirroredParameters`

`MirroredPackage.ts` registers `{ id: "mirrored", name: "Mirrored (Storybook test)", css: mirroredCss, defaults: { ...getTheme("default"), id: "mirrored-default", name: "Mirrored", package: "mirrored" }, layout: { window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } } }` where `mirroredCss` is `import mirroredCss from "./mirrored.scss?inline"`. `mirrored.scss` = `@use "@/Appearance/vocabulary/package"; @include package.classicy-package("mirrored") { [data-classicy-control="close"] { order: 50 } [data-classicy-control="zoom"] { order: 5 } [data-classicy-control="collapse"] { order: 6 } .classicyWindowTitleLeft, .classicyWindowTitleRight, .classicyWindowTitleCenter { display: none } .classicyAlertTop { flex-direction: row-reverse } .classicyAlertButtons { flex-direction: row-reverse; justify-content: flex-start } .classicyDesktopMenu > [data-classicy-part="switcher"] { order: 1; margin-right: auto } .classicyDesktopMenu > [data-classicy-part="extensions"] { margin-left: 0 } .classicyTabContainer .classicyTabButtonsRow { order: 1; margin-bottom: 0; margin-top: calc(var(--window-border-size) * -1) } .classicyDisclosureHeader > .classicyControlLabelHolder { order: -1 } }`. Decorator: `context.parameters.classicy?.appearancePackage` (string) → desktop path dispatches `ClassicyDesktopChangeAppearancePackage { packageId }` right after `resetClassicyStore` and sets `activeTheme.package`; plain path sets `data-classicy-appearance={packageId}` on the frame div and computes vars from `{ ...getTheme(themeId), package: packageId }`. `helpers.tsx` exports `mirroredParameters = { ...desktopParameters, classicy: { ...desktopParameters.classicy, appearancePackage: "mirrored" } }`. Import `./MirroredPackage` from `preview.tsx` so it registers once per Storybook session. If the alias `@/Appearance/vocabulary/package` is not resolvable from `storybook/.storybook`, add it to `storybook/.storybook/main.ts` `viteFinal.resolve.alias`.

### 4: Add the six `Mirrored` stories

Each `export const Mirrored: Story = { ...Default, parameters: mirroredParameters }` in `Desktop/Window` (close box right, grip bottom-left, stripes hidden), `Dialogs/Alert` (icon right, default button leftmost), `Desktop/Desktop` (no screen bar; mounts a `ClassicyApp` with one `ClassicyWindow appMenu={[{ id: "file", title: "File", menuChildren: […] }]}` and two desktop icons; icons from the left), `Desktop/MenuBar` (passes `placement="screen"` so the flipped clusters show), `Controls/Tabs` (strip under the panel), `Controls/Disclosure` (label left by CSS).

### 5: Playwright position checks

With Storybook running, for each mirrored story run `browser_evaluate` and record the array into `.playwright-mcp/parity/part-F/mirrored.txt`; every entry must be `true`:
- `desktop-window--mirrored`: `(() => { const w = document.querySelector('.classicyWindow'); const r = w.getBoundingClientRect(); const c = w.querySelector('[data-classicy-control="close"]').getBoundingClientRect(); const t = w.querySelector('.classicyWindowTitleText').getBoundingClientRect(); const g = w.querySelector('.classicyWindowResizer').getBoundingClientRect(); return [c.left > t.right, Math.abs(g.left - r.left) < 4, Math.abs(g.bottom - r.bottom) < 4, getComputedStyle(w.querySelector('.classicyWindowTitleLeft')).display === 'none']; })()`
- `dialogs-alert--mirrored`: `(() => { const bs = [...document.querySelectorAll('.classicyAlertButtons button')].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left); const i = document.querySelector('.classicyAlertIcon').getBoundingClientRect(); const b = document.querySelector('.classicyAlertBody').getBoundingClientRect(); return [bs[0].dataset.classicyRole === 'default', i.left >= b.right]; })()`
- `desktop-desktop--mirrored`: `(() => { const root = document.querySelector('.classicyDesktop'); const bar = document.querySelector('.classicyWindow .classicyWindowMenuBar'); const tb = document.querySelector('.classicyWindow .classicyWindowTitleBar').getBoundingClientRect(); const icon = document.querySelector('.classicyDesktopIcon').getBoundingClientRect(); return [document.querySelector('.classicyDesktopMenuBar') === null, root.dataset.classicyMenuBar === 'window', bar !== null && Math.abs(bar.getBoundingClientRect().top - tb.bottom) < 4, icon.left < 200]; })()`
- `desktop-menubar--mirrored`: `(() => { const q = p => document.querySelector(`[data-classicy-part="${p}"]`).getBoundingClientRect(); return [q('switcher').right <= q('apple').left]; })()`
- `controls-tabs--mirrored`: `(() => { const row = document.querySelector('.classicyTabButtonsRow').getBoundingClientRect(); const holder = document.querySelector('.classicyTabsHolder').getBoundingClientRect(); return [row.top >= holder.bottom - 2]; })()`
- `controls-disclosure--mirrored`: `(() => { const l = document.querySelector('.classicyDisclosureHeader .classicyControlLabelHolder').getBoundingClientRect(); const t = document.querySelector('.classicyDisclosureHeader svg').getBoundingClientRect(); return [l.right <= t.left]; })()`
A `false` is a slot that does not work: fix the component or `mirrored.scss`, not the expression.

### 6: Final parity

Re-shoot every id in `stories.txt` into `after/` and `for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done` → `0` for every story (the `--mirrored` ids are new and have no `before/`; shoot them into `after/` for the record).

### 7: Document

`docs/AGENT-REFERENCE.md`: a "Layout declarations" subsection (the three keys, their CSS variables and root attributes, `useClassicyAppearanceLayout`/`getClassicyAppearanceLayout`), the part attributes a package may `order`, `ClassicyTabs.stripPosition`, `ClassicyWindowMenuBar`, `computeClassicyWindowResize`. `CLAUDE.md` Theming section: one paragraph — arrangement is CSS `order` on `data-classicy-control`/`data-classicy-role`/`data-classicy-part` plus the package's `layout` block read by `useClassicyAppearanceLayout()`; the Storybook `mirrored` package is the proof and the template for a new package.

### 8: Lint, type-check, commit; final verification

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add storybook/.storybook src docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "test(storybook): mirrored appearance package proves every arrangement slot"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer). Then `pnpm build:source` → PASS and `pnpm build:storybook` → PASS; stop background dev servers.

## Acceptance Criteria

- [x] VERIFY: pnpm exec vitest run MirroredPackage && cat .playwright-mcp/parity/part-F/mirrored.txt  # every entry true
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source && pnpm build:storybook
- [x] Six `--mirrored` stories exist (Window, Alert, Desktop, MenuBar, Tabs, Disclosure), driven by the registered `mirrored` package whose `layout` is `bottom-left` / `window` / `top-left`.
- [x] `docs/AGENT-REFERENCE.md` has the "Layout declarations" subsection and `CLAUDE.md` the arrangement paragraph.

## Files

- `storybook/.storybook/MirroredPackage.ts` - create: mirrored package registration
- `storybook/.storybook/mirrored.scss` - create: order flips, hidden stripes
- `storybook/.storybook/ClassicyDecorators.tsx` - modify: appearancePackage parameter
- `storybook/.storybook/helpers.tsx` - modify: mirroredParameters
- `storybook/.storybook/preview.tsx` - modify: import MirroredPackage
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx` - modify: Mirrored story
- `src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx` - modify: Mirrored story
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.stories.tsx` - modify: Mirrored story
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.stories.tsx` - modify: Mirrored story with placement screen
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx` - modify: Mirrored story
- `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx` - modify: Mirrored story
- `docs/AGENT-REFERENCE.md` - modify: Layout declarations subsection
- `CLAUDE.md` - modify: arrangement paragraph
- `storybook/.storybook/MirroredPackage.test.ts` - create: registration smoke test
- `.playwright-mcp/parity/part-F/after/` - create: after screenshots
- `.playwright-mcp/parity/part-F/mirrored.txt` - create: Playwright position results

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T05:32:01.628Z - F 7.1 implemented (a85512323) with the F 6.1 review fixes (3a4d0352a, F-R5 grid caps, triangle aria-hidden, vocabulary), the F 5.1 fix re-review minors (ceb58236c), the carry-forward fixes (5fc369358: grip edges follow the corner, extension portal follows placement, balloon titles sized by content) and the mirrored stories. 4098 tests; build:source + build:storybook green; 48/48 Platinum stories AE 0; all Playwright position checks true. Task review dispatched.

### 2026-10-30T05:58:24.495Z - F 7.1 review fixes landed as 2a9b6522e: F-R6 (mirrored package registers only in the six mirrored story files; verified per story in fresh pages), JSDoc corrections, short-viewport icon clamp, docs. 4100 tests; 48/48 AE 0; mirrored stories unchanged. Complete; F's whole-branch final review follows.
