---
id: 0018-dbd
title: 'System 7 Appearance Package: implementation'
type: impl
status: pending
priority: "2"
effort: XL
created: "2026-11-11T05:11:08.451Z"
updated: "2026-11-11T05:11:08.451Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - docs/superpowers/specs/2026-11-11-system7-hig-menus-windows-dialogs.md
    - docs/superpowers/specs/2026-11-11-system7-hig-controls-icons-color.md
  plans:
    - ["0017-6me", "parent"]
progress:
  "1":
    status: pending
  "1.1":
    status: pending
  "1.2":
    status: pending
  "1.3":
    status: pending
  "1.4":
    status: pending
  "1.5":
    status: pending
  "1.6":
    status: pending
  "2":
    status: pending
  "2.1":
    status: pending
  "2.2":
    status: pending
  "2.3":
    status: pending
  "3":
    status: pending
  "3.1":
    status: pending
  "3.2":
    status: pending
  "3.3":
    status: pending
  "3.4":
    status: pending
  "3.5":
    status: pending
  "3.6":
    status: pending
  "3.7":
    status: pending
  "3.8":
    status: pending
  "4":
    status: pending
  "4.1":
    status: pending
  "4.2":
    status: pending
  "5":
    status: pending
  "5.1":
    status: pending
  "5.2":
    status: pending
---

# System 7 Appearance Package: implementation

## Summary

**Goal:** Ship `@classicy/appearance-system7` (System 7 and System 7 Color themes) with the core capabilities it needs, period assets, and release plumbing, leaving Platinum pixel-identical.

**Problem:** Design plan 0017-6me: Classicy has one Appearance Package; System 7 needs a second, plus core capabilities (per-theme art, custom scroll bars, dither vocabulary, pack-driven alerts, small icon images, modal/pop-up/help states).

**Approach:** Phase 1 adds the core capabilities, each proven by tests and Platinum parity AE 0. Phase 2 delivers the asset inventory to the owner and builds the package skeleton and release plumbing. Phase 3 builds the look element by element against System 7.5 reference screenshots, both themes. Phase 4 lands the owner-exported assets. Phase 5 documents and verifies.

---

# Part 2 — Implementation

## Constraints

- Design plan 0017-6me is the binding authority; the two HIG research specs hold the measured values (HIG PDF page = printed page + 24).
- Platinum must stay pixel-identical: every task touching the core or Platinum runs parity (`pnpm parity:shoot`/`parity:compare` from the static Storybook build) and keeps AE 0 on all stories.
- System 7 imports the core only as `@classicy/classicy`; the only Platinum path it may import is the saver registration module (boundary test).
- Repo rules (CLAUDE.md): no pixel literals or literal colors in package SCSS (knobs, derivations, `--color-*` tokens); no `!important`; classicyLog for diagnostics; assets read at render; barrels generated; American English; base SCSS is structure, looks live in the package layer.
- Release is a minor (3.2.0): no commit message contains the major-bump keyword; the new npm package needs the owner's trusted-publishing bootstrap at most a day before merge.
- Assets are the owner's export (no converter); asset tasks wait on it and everything else proceeds meanwhile.
- Never `git stash`, `git checkout -- <path>`, `git restore`, or `rm` outside a `mktemp -d` scratch directory; work in a worktree, never the owner's ~/classicy checkout.

## Phase 1: Core capabilities

### 1.1: Per-theme asset variants

**Files:**
- Modify: `src/Appearance/ClassicyAssetRegistry.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`

**Depends on:** none

**Interfaces:**
- Produces: `registerClassicyAssets(kind, packageId, tree, options?: { variant?: string })`; `ClassicyTheme.assetVariant?: string`; resolution: active package's variant tree (the active theme's `assetVariant`) → its base tree → default package. `useClassicyAsset`, `useClassicyAssetTree`, `resolveClassicyAsset` and the published `--classicy-art-*`/`--classicy-cursor-*` variables follow it.

- [ ] **Step 1: Failing tests** — variant leaf wins over base; base fills a key the variant lacks; default package fills a key the package lacks; switching theme switches art and published variables; `assetVariant` survives persistence, custom-theme fork, theme file export/import (schema); an unregistered variant warns once and uses the base tree.
- [ ] **Step 2: Implement, then confirm Platinum parity AE 0 and the suites** — `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager`
- [ ] **Step 3: Commit** — `git commit -m "feat(appearance): themes can select an asset variant of their package"`

### 1.2: Small icon images

**Depends on:** none

**Interfaces:**
- Produces: An icon tree leaf may be `{ src: string, small?: string }` (or the plain string as today); `ClassicyIcon` and every small render (`--icon-small-size` sites) use `small` when present.

- [ ] **Step 1: Failing tests** — a leaf with `small` renders the small image at 16 px and the large one at 32 px; a plain-string leaf scales as today; per-theme variants carry `small` too.
- [ ] **Step 2: Implement; parity AE 0** — `pnpm exec vitest run src/SystemFolder/SystemResources src/Appearance`
- [ ] **Step 3: Commit** — `git commit -m "feat(icons): an icon may carry its own 16 px image"`

### 1.3: Pack-driven alert sounds

**Depends on:** none

**Interfaces:**
- Produces: A sound pack declares its alert sprite ids and default alert; the Sound tab, `ClassicyAlertSound` and `DEFAULT_ALERT_SOUND` read the active pack; a persisted `alertSound` the pack lacks falls back to the pack's default without being rewritten. Platinum's pack declares its seven alerts and Sosumi.

- [ ] **Step 1: Failing tests** — the Sound tab lists the active pack's alerts; switching package switches the list; the stored choice is never overwritten; Platinum behavior unchanged.
- [ ] **Step 2: Implement** — `pnpm exec vitest run src/SystemFolder/ControlPanels packages/appearance/platinum/src/assets/sounds`
- [ ] **Step 3: Commit** — `git commit -m "feat(sound): alert sounds come from the active sound pack"`

### 1.4: Dither vocabulary and small structural states

**Depends on:** none

**Interfaces:**
- Produces: A vocabulary mixin (`classicy-dither-text`, `classicy-dither-line`, in `src/Appearance/vocabulary`) masking text/lines with a 50% checker, gated by a theme knob; a fixed-modal marker (part attribute or state) on dialogs without a title bar; an `open` state on the pop-up menu's label and indicator; the Help menu-bar cluster able to render art (system art key) in place of its title text.

- [ ] **Step 1: Failing tests** — vocabulary test and a compiled-mixin test; the fixed-modal marker on fixed modals only; `open` present while the pop-up is open; help cluster renders the art when registered, text otherwise.
- [ ] **Step 2: Implement; parity AE 0** — `pnpm test --maxWorkers=3`
- [ ] **Step 3: Commit** — `git commit -m "feat(appearance): dither vocabulary, fixed-modal, pop-up open and help-art hooks"`

### 1.5: Custom scroll bars

**Depends on:** none

**Interfaces:**
- Produces: A `ClassicyScrollArea` (name the builder's) used wherever windows, lists, tabs and text areas scroll: draws arrows (both ends), track and thumb as `data-classicy-part` parts packages style; states `inactive` (window inactive) and `fits` (content fits); keyboard, wheel, drag and arrow-press repeat behavior; accessible (`role`, focus). Native scroll bars are hidden where it is used.

- [ ] **Step 1: Failing tests** — thumb size and position follow content; arrow press repeats (little-arrows pattern); dragging the thumb scrolls; wheel scrolls; `fits` when content fits; `inactive` with the window; lost pointer stream ends a drag (onClassicyPointerStreamLost).
- [ ] **Step 2: Implement the component and adopt it in Window, lists, tabs, text areas**
- [ ] **Step 3: Platinum restyles it to match today's bars; parity AE 0 on every story** — `pnpm build:storybook && pnpm parity:shoot --port <p> --mid --out <dir> && pnpm parity:compare`
- [ ] **Step 4: Commit** — `git commit -m "feat(scroll): Classicy draws its own scroll bars"`

### 1.6: Move base-layer looks into Platinum

**Depends on:** none

- [ ] **Step 1: Move the look declarations the research found in base SCSS (radio, checkbox face and glyph, little arrows, input bevel, list selection) into Platinum's component partials; base keeps structure**
- [ ] **Step 2: Parity AE 0; cascade and literal gates green** — `pnpm lint && pnpm test --maxWorkers=3`
- [ ] **Step 3: Commit** — `git commit -m "refactor(appearance): radio, checkbox, little-arrow, input and list looks move to Platinum"`

## Phase 2: Inventory, package skeleton and release plumbing

### 2.1: Asset inventory for the owner

**Files:**
- Create: `docs/system7-asset-inventory.md`

**Depends on:** none

- [ ] **Step 1: Write the inventory** — every icon key (core icon tree, bundled apps), every `ClassicySystemArtKey`, every `ClassicyCursorRole`, the alert sounds and the `wctb`/`cctb` window colors: each with its System 7.5 source (file, resource type and id), or a fallback for keys with no System 7 counterpart; and the exact export: PNG 32×32 and 16×16, 1-bit with transparency and 8-bit color, file names and target paths under `packages/appearance/system7/src/assets/`; cursors PNG + hotspot; sounds AIFF/WAV; colors as hex. A test checks the inventory names every key the core reads.
- [ ] **Step 2: Commit and hand the inventory to the owner** — `git commit -m "docs: System 7 asset inventory"`

### 2.2: Package skeleton

**Files:**
- Create: `packages/appearance/system7/package.json`
- Create: `packages/appearance/system7/vite.config.ts`
- Create: `packages/appearance/system7/vitest.config.ts`
- Create: `packages/appearance/system7/bin/verify-dist.mjs`
- Create: `packages/appearance/system7/src/index.ts`
- Create: `packages/appearance/system7/src/system7.json`
- Create: `packages/appearance/system7/src/styles/system7.scss`
- Create: `packages/appearance/system7/README.md`

**Depends on:** none

- [ ] **Step 1: Failing tests mirroring Platinum's** — source imports only `@classicy/classicy` (plus the saver module); one registry; package exports and manifest; registration of package `system7` with themes System 7 and System 7 Color (assetVariant `bw` on the former), fonts as byte-identical copies, layout, `defaultScreenSaver`; full system-art and cursor key coverage (placeholder art until Phase 4, listed).
- [ ] **Step 2: Implement; wire workspace, tsconfig/vitest/Storybook/example aliases, the gates' scan roots, both dist checks, `verify:host-types`** — `pnpm build:source && pnpm test --maxWorkers=3`
- [ ] **Step 3: Commit** — `git commit -m "feat(system7): the System 7 Appearance Package skeleton"`

### 2.3: Release plumbing

**Files:**
- Modify: `.github/workflows/push.yml`
- Modify: `bin/npm-bootstrap-trusted-publishing.sh`
- Modify: `bin/check-host-types.ts`

**Depends on:** none

- [ ] **Step 1: Failing tests** — push.yml syncs, builds, checks trusted publishing for and publishes `@classicy/appearance-system7`, and the wait step waits for it; the bootstrap script's default manifests include it.
- [ ] **Step 2: Implement** — `pnpm exec vitest run bin`
- [ ] **Step 3: Commit** — `git commit -m "ci(release): publish @classicy/appearance-system7"`

## Phase 3: The System 7 look

### 3.1: Reference screenshots

**Depends on:** none

- [ ] **Step 1: Capture System 7.5 references** — in an emulator (e.g. Infinite Mac) at 1x, in 1-bit and in color: a document window active and inactive, utility window, menu bar and pull-down, hierarchical and pop-up menus, modeless, movable modal and fixed modal dialogs, an alert, buttons, checkboxes, radios, sliders, little arrows, disclosure triangles, text field, list, scroll bars (fits, inactive), desktop icons selected and not; plus pressed close/zoom boxes and other HIG gaps. Store under `.playwright-mcp/parity/system7/reference/` with an index.
- [ ] **Step 2: Commit the index (not the screenshots)** — `git commit -m "docs: System 7.5 reference screenshot index"`

### 3.2: Windows

**Depends on:** 2.2, 3.1

- [ ] **Step 1: Stories under both themes; package SCSS for frame, drop shadow, title bar stripes and boxes, inactive state, utility windows, size box; compare with references; Platinum parity AE 0**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): windows"`

### 3.3: Menus and menu bar

**Depends on:** 2.2, 3.1

- [ ] **Step 1: Menu bar (rounded corners, Apple glyph per theme, help art), pull-down, hierarchical, pop-up, highlight inversion, dimmed and separators per theme; compare; parity**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): menus"`

### 3.4: Dialogs, alerts and buttons

**Depends on:** 2.2, 3.1

- [ ] **Step 1: Modeless, movable modal, fixed modal (double frame, no title bar), alerts, push buttons and the default ring; compare; parity**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): dialogs, alerts and buttons"`

### 3.5: Controls

**Depends on:** 2.2, 3.1

- [ ] **Step 1: Checkbox, radio, pop-up, slider, little arrows, disclosure triangle, text field, list (selection inversion), dimmed states per theme; compare; parity**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): controls"`

### 3.6: Scroll bars

**Depends on:** 1.5, 2.2, 3.1

- [ ] **Step 1: System 7 styling of the scroll-bar parts: 16 px, outlined arrows both ends, dotted track per theme, square thumb (grip ridges per references), fits and inactive states; compare**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): scroll bars"`

### 3.7: Desktop, icons, Control Strip, Appearance Manager

**Depends on:** 2.2, 3.1

- [ ] **Step 1: Desktop pattern per theme, icon labels (Geneva 9, opaque, inverted), selected/open icon states (B&W invert, color darken), Control Strip and Appearance Manager under System 7; compare**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): desktop, icons, Control Strip and Appearance Manager"`

### 3.8: Screen savers under System 7

**Depends on:** 2.2

- [ ] **Step 1: Platinum's saver registration lists both packages; System 7 bundles it (boundary test), adds its reduced-motion pause rule, lists the saver art in its dist check; tests for a System 7-only host**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): the After Dark savers under System 7"`

## Phase 4: Assets (after the owner's export)

### 4.1: Icons, system art and cursors

**Depends on:** 1.1, 1.2, 2.1, 2.2

- [ ] **Step 1: Register the exported color art as the base tree and 1-bit art as the `bw` variant (32 and 16 px), every system-art key and cursor role; tests: every inventory entry registered, files read, byte-identical in dist**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): System 7 icons, art and cursors"`

### 4.2: Sounds and window colors

**Depends on:** 1.3, 2.1, 2.2

- [ ] **Step 1: Sound pack from the exported alerts (sprites via the audio pipeline, Simple Beep default); color theme tokens from the `wctb`/`cctb` values; re-compare color references**
- [ ] **Step 2: Commit** — `git commit -m "feat(system7): alert sounds and the Standard window colors"`

## Phase 5: Docs and verification

### 5.1: Docs and release notes

**Depends on:** none

- [ ] **Step 1: CLAUDE.md, AGENT-REFERENCE §8 (per-theme variants, scroll-bar parts, dither vocabulary, pack alerts, small icons, System 7), README, the System 7 README, docs/RELEASE-NOTES-3.2.md**
- [ ] **Step 2: Commit** — `git commit -m "docs: the System 7 Appearance Package"`

### 5.2: Verification

**Depends on:** none

- [ ] **Step 1: Full gate (lint, tsc, storybook typecheck, vocabulary, color sweep, tests, build:source with all dist checks and host types, build:storybook, example build); Platinum parity AE 0; System 7 stories against the references; example app with System 7 only and with both packages (switching themes and packages, savers, sounds, persisted state)** — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm storybook:typecheck && pnpm test --maxWorkers=3 && pnpm build:source && pnpm build:storybook && pnpm --filter classicy-example build`

## Acceptance Criteria

- [ ] `@classicy/appearance-system7` registers package `system7` with the System 7 and System 7 Color themes, every system-art key and cursor role, period icons at both sizes and depths, alert sounds and the savers; a System 7-only host works.
- [ ] System 7 stories match the System 7.5 references (chrome closely, text by eye) in both themes.
- [ ] Per-theme asset variants, custom scroll bars, the dither vocabulary, pack-driven alerts, small icon images and the modal/pop-up/help hooks are in the core, tested and documented.
- [ ] Platinum parity AE 0 on every story; full gate green; the release publishes three packages at 3.2.0.
