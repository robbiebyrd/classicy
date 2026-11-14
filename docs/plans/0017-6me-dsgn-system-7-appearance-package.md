---
id: 0017-6me
title: System 7 Appearance Package
type: dsgn
status: in_progress
priority: "2"
effort: XL
created: "2026-11-11T04:38:01.540Z"
updated: "2026-11-11T15:14:26.353Z"
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
---

# System 7 Appearance Package

## Summary

**Goal:** A second Appearance Package, `@classicy/appearance-system7`, that replicates the Mac OS System 7 look in two themes, black and white and color, with System 7 period icons, cursors and alert sounds, and the After Dark screen savers.

**Problem:** Classicy ships one look, Platinum (Mac OS 8). The 3.0 split made the look a package, but no second package exists, so nothing proves the core is look-neutral, and hosts cannot offer the System 7 look that most classic-Mac nostalgia means.

**Approach:** Build the package on the existing Appearance Package contract (package SCSS in `@layer classicy.package`, registered art, theme JSON presets, knobs, layout declarations), driven by the System 7 HIG (1995) and pixel measurements of its figures. One package, two themes: what differs between them is carried by theme colors where possible, and by a new per-theme art capability where colors cannot (icon families, the Apple menu glyph). Icons, cursors, sounds and the standard window color table are extracted from System 7.5 resources. A few core capabilities the look needs are added to the core first.

---

# Part 1 — Design

## Current State

The core is look-neutral since 3.0.0 (plan 0014): a package registers its stylesheet, themes, art, cursors, fonts, wallpapers, sounds and hooks; base component SCSS holds structure, and a few looks still live in base SCSS (radio, checkbox face, little arrows, input bevel, list selection). Assets resolve per package (active, then default package), never per theme. Arrangement is CSS `order` on `data-classicy-*` parts plus the package `layout` block (grow-box corner, menu-bar placement, icon grid origin). The twelve After Dark screen savers ship in Platinum and are offered only under `platinum` (plan 0016). Research: the two HIG reports linked as specs (System 7 HIG 1995; PDF page = printed page + 24) compare every element with Platinum, with measured pixels.

## Decisions

- **One package, `system7`, with two themes (black and white, color).** — Owner, 2026-11-10.
- **Add a per-theme art capability to the core where colors cannot carry a difference (icon families, the Apple glyph).** — Owner, 2026-11-10. Colors carry gray patterns, tints and frames; icon art cannot be recolored.
- **Icons are System 7 period icons, extracted from System 7.5 resources; the owner can extract from a list.** — Owner, 2026-11-11.
- **The After Dark savers are offered under System 7 too, from one source bundled into both packages.** — Owner, 2026-11-11 (option 1 over a third npm package).
- **No interface feedback sounds; alert sounds only.** — Period-accurate: System 7 had none (my call).
- **Behavior stays shared; the package changes look and arrangement only.** — Appearance Package contract (my call).

- **Fonts: reuse Platinum's vector ChicagoFLF and Geneva faces as byte-identical copies.** — Owner, 2026-11-11. Text cannot match 1-bit bitmaps pixel for pixel; chrome is compared against System 7.5 screenshots, text by eye.
- **Custom scroll bars: a Classicy scroll-bar component draws System 7's bars exactly in every browser, including the "document fits" and inactive states; Platinum stays pixel-identical.** — Owner, 2026-11-11.
- **Extraction: the owner exports finished files from an inventory; no converter is built.** — Owner, 2026-11-11.
- **A host loading only System 7 works: System 7 registers every system-art key and cursor role Classicy reads, drawing System 7-style versions of parts System 7 lacked; a test pins full coverage.** — My call (builder check): today those keys exist only in Platinum's tree, so a lone System 7 host would render blank art and void cursor declarations.
- **The alert-sound list comes from the active sound pack, not a hard-coded list of Platinum's sprite ids; each pack names its default alert.** — My call (builder check): System 7's alerts (Simple Beep default) have no ids today.
- **An icon leaf may carry a 16 px image, used for small renders; otherwise the 32 px image is scaled as today.** — My call (builder check): System 7 small icons (`ics#`/`ics8`) are distinct art.
- **The saver source stays in Platinum's `src/screenSavers/`; System 7's build bundles its registration module by relative import (a new, narrow boundary rule) and does not re-export the saver components.** — My call (builder check): a folder outside both packages, or a private workspace package, breaks the published declarations and `verify:host-types`.

### Rejected alternatives

- **Two packages, `system7` and `system7-color`, sharing SCSS.** — Owner chose one package with two themes.
- **A third npm package for the savers.** — Owner chose one source bundled into both packages.
- **Keeping today's icons for System 7.** — Owner wants period-appropriate icons.

## Design

### Package and themes

`packages/appearance/system7` mirrors Platinum's layout: `src/index.ts` registers assets, fonts, sounds, savers, then the package; `src/system7.json` holds `defaults`, `presets` (the two themes), `knobs`; `src/styles/system7.scss` is one `@layer classicy.package` block written with `classicy-package("system7")`; `src/assets/` holds art, icons, cursors, sounds, wallpapers. Package id `system7`, name "System 7". The package declares `layout` (grow box bottom-right, menu bar on the screen, icon grid origin as Platinum's unless the HIG says otherwise) and `defaultScreenSaver`.

### Per-theme art (core)

Today assets resolve per package (active, then default). Add theme-scoped variants: a package registers additional asset trees under a variant name (e.g. `registerClassicyAssets(kind, "system7", tree, { variant: "bw" })`), a theme names its variant (`theme.assetVariant?: string`, persisted with the theme, kept by custom-theme forks and theme files), and resolution becomes active package's variant tree → active package's base tree → default package. Applies to every asset kind (icons, system art, cursors, wallpapers by name). Published CSS variables (`--classicy-art-*`, `--classicy-cursor-*`) and `useClassicyAsset` follow the active theme's variant. The schema, theme files, persistence and the Appearance Manager carry the field; a theme naming an unregistered variant falls back to the base tree with one `classicyLog` warning.

### Other core capabilities

From the HIG research and the builder check:
1. **Custom scroll bars** (owner decision): a Classicy scroll-bar component replacing native `::-webkit-scrollbar` styling wherever windows, lists and tabs scroll, drawing arrows, track and thumb as parts a package styles, with states for inactive window and content-fits; Platinum restyles it to stay pixel-identical (parity AE 0).
2. **A 1-bit dither vocabulary** for text and lines — a mixin/mask in `src/Appearance/vocabulary` so a package can render dimmed text, dimmed controls and dotted dividers as a 50% checker, switched per theme by a theme knob.
3. **Fixed vs movable modal**: a part or state distinguishing them, so a package can omit the title bar on fixed modals.
4. **An `open` state on a pop-up menu's label and indicator.**
5. **The Help menu-bar cluster showing art in place of text.**
6. **Pack-driven alert sounds**: the alert list and default come from the active sound pack; the persisted `alertSound` keeps its id, falling back to the pack's default when the pack lacks it.
7. **Small icon images**: an icon leaf may carry a 16 px image.
8. **Knobs or derivations** the package needs (title-bar box gaps, menu divider height, alert icon inset), per the pixel-literal gate.
The base-layer looks the research found (radio, checkbox face, little arrows, input bevel, list selection) move into Platinum's package sheet where a System 7 override would otherwise fight them, keeping Platinum pixel-identical.

### Gray: pattern vs true gray

System 7 renders gray as a 50% pattern on 1-bit screens and as true gray on color screens (HIG p.207, p.260). The package draws every gray area (scroll tracks, slider channel, desktop, menu dividers, utility drag bars, disclosure-triangle fill) as a 2-color checker whose two colors are theme tokens: black and white in the B&W theme, one gray twice in the color theme. Dithers render from pixel-aligned raster tiles where CSS gradients moiré at fractional zoom, following Platinum's precedent.

### Window chrome

Flat white chrome: a 1 px black frame and a 1 px black drop shadow (offset 1 px) on windows, menus and pop-ups; no bevels, gray frames or contents border. Title bar 19 px: six 1 px racing stripes on alternate rows (black on white in B&W; #969897-ish gray on near-white with a lavender highlight/shadow pair in color), broken around the 11 px close box (left), zoom box (right) and the Chicago 12 title. No collapse box (the package hides it with existing arrangement rules). Inactive windows: no stripes, no boxes, gray frame (color). Size box bottom-right. Modal dialogs: double frame, no shadow, no title bar (fixed) — 1/2/2 px in B&W, 1 px + 3-step lavender band + 1 px in color. Values from the research reports; exact colors from the extracted `wctb`.

### Menus and controls

White menu bar with rounded screen corners; Apple menu glyph per theme (black apple in B&W, rainbow apple in color, via per-theme art); menu titles and items highlight by black inversion in both themes; dimmed items dithered (B&W) or true gray (color); separators dotted (B&W) or solid gray (color). Controls are flat 1 px black on white in both themes: push buttons 20 px high with ~4 px radius, the default ring 1 px white + 3 px black; checkbox and radio 12×12; pop-up with a 1 px drop shadow and an 11×6 triangle; scroll bar 16 px with outlined arrows at both ends and a square thumb, beveled lavender frame controls only in color. Text fields and lists flat; selection inverts. Chicago 12 throughout, Geneva 9 for icon labels (opaque white label, inverted when selected).

### Icons, cursors, sounds, window colors

An **inventory** (the first deliverable) lists every icon key the core and bundled apps read (the core icon tree in `ClassicyIcons.ts`, every `ClassicySystemArtKey`, every `ClassicyCursorRole`, the alert sounds), each with its System 7.5 source (file, resource type and id: `ICN#`/`icl8`/`ics#`/`ics8`, `CURS`, `snd `, `wctb`/`cctb`) and the exact file the owner exports: PNG at 32×32 and 16×16, 1-bit with transparency and 8-bit color; cursors as PNG plus hotspot; sounds as AIFF/WAV; window colors as hex values. The owner exports the finished files into the package's `src/assets/` (no converter). Color art is the base tree, 1-bit art the `bw` variant. Keys with no System 7 counterpart (apps newer than System 7) are listed with the fallback each uses, never an empty image. Sounds: the System 7.5 alert sounds as the package's sound pack (Simple Beep default; Indigo, Quack, Sosumi, Wild Eep, Droplet), built into sprites by the existing audio pipeline. Window colors: the Standard `wctb` values replace the measured PDF colors where they differ.

### Screen savers

The saver source stays in `packages/appearance/platinum/src/screenSavers/`. Its registration module registers every saver with `packages: ["platinum", "system7"]`; Platinum imports it as today, and System 7's build bundles the same module by relative import (the only Platinum path System 7 may import, pinned by a boundary test). System 7 does not re-export the saver components, so its declarations never reference Platinum's files. A host loading both packages registers the same ids twice with equal definitions, which is harmless. System 7 declares `defaultScreenSaver: "bouncing-ball"`. System 7's sheet carries its own reduced-motion pause rule for the savers, as Platinum's does; both dist checks list the saver art.

### Release

`@classicy/appearance-system7` is a new npm package: it needs the trusted-publishing bootstrap (`bin/npm-bootstrap-trusted-publishing.sh` with its manifest, run by the owner at most a day before merge), `push.yml` publishing it with the other two and syncing its version, the release wait step checking it, `verify:host-types` packing it, and README/AGENT-REFERENCE/release-notes coverage. Ships as a minor release (3.2.0): no commit message contains the major-bump keyword.

### Edge Cases

A theme forked from System 7 keeps its `assetVariant`; switching packages drops to the new package's base tree. A host loading only System 7 gets the savers, fonts and sounds it needs without Platinum. Hosts loading both packages register the savers twice (same ids, same definition). An icon key with no System 7 counterpart falls back to the core icon tree, never an empty image. Reduced-motion and the hidden pointer keep holding for savers under System 7 (System 7's sheet carries its own pause rule, as Platinum's does). 1-bit dithers at fractional zoom: raster tiles, not gradients.

## Testing

Unit tests for every core capability (per-theme asset resolution, persistence and theme files carrying `assetVariant`, the dither vocabulary, the scroll-bar component and its states, pack-driven alerts, small icon images, the new states and parts), package tests mirroring Platinum's (registration, full key coverage, assets read, dist checks, CSS scoping, no literals), Storybook stories for every element under both themes, and visual comparison against reference screenshots of System 7.5 (captured from an emulator such as Infinite Mac at 1x): window chrome, menus, dialogs and controls compared closely, text by eye (vector fonts). Platinum's parity stays AE 0 across every story: no core change may move one of its pixels.

## Scope

**In scope:**

- A new workspace package `packages/appearance/system7`, published as `@classicy/appearance-system7` at the core's version, peer-depending on `@classicy/classicy`, with its own build, `verify:dist`, tests and Storybook stories, mirroring Platinum's.
- Two themes in the package: **System 7** (black and white, 1-bit) and **System 7 Color** (the Standard lavender window colors).
- Every element the HIG reports cover: menu bar, pull-down, hierarchical and pop-up menus, document and utility windows (frame, drop shadow, title bar racing stripes, close, zoom and size boxes), scroll bars, modeless, movable modal and fixed modal dialogs, alerts, push buttons and the default ring, checkboxes, radio buttons, sliders, little arrows, disclosure triangles, text fields, list boxes, desktop icons and their labels, the desktop, the Control Strip and Appearance Manager as far as they render under the package.
- System 7 period icons (32×32 and 16×16, 1-bit and 8-bit color), cursors and alert sounds, exported by the owner from System 7.5 per an inventory, for every icon, system-art, cursor and sound key Classicy reads.
- Fonts: Chicago (ChicagoFLF) 12 for interface text, Geneva 9 for icon labels and small text, shipped by the package as byte-identical copies of Platinum's faces.
- A custom scroll-bar component in the core, styled by both packages.
- A per-theme art capability in the core, and the other core capabilities listed under Components.
- The After Dark screen savers offered under System 7 as well as Platinum, from one source bundled into both packages.
- Release plumbing for the new package: `push.yml` publishing and version sync, trusted-publishing bootstrap, dist checks, the host-types check, docs and release notes.

**Out of scope:**

- The Color control panel's other window tints (Gold, Green, Turquoise, …) — Owner: one package with two themes. The tint set can be added later as presets.
- Interface feedback sounds (clicks, menu sounds) — System 7 had none; the package ships alert sounds only and no feedback hooks.
- Behavior changes beyond the look (windows draggable only by the title bar, menu blink count settings) — Classicy's behavior is shared by all packages; only arrangement and look change per package.
- New savers, and System 7-only savers — Not requested.
- The Appearance Manager images the owner moved into Platinum's resources — Dropped from earlier work by the owner.

## Open Questions

- [ ] Exact window colors: confirm the Standard `wctb`/`cctb` values from the extracted System 7.5 resources before freezing the color theme's tokens (the PDF figures may be color-managed). — implementer
- [ ] Pressed close and zoom boxes, inactive 1-bit windows, scroll-thumb grip ridges, and other details the HIG does not show: settle each from System 7.5 running in an emulator. — implementer
- [ ] The owner's export of the inventory's files gates the asset tasks; the plan orders work so everything else proceeds meanwhile. — owner

