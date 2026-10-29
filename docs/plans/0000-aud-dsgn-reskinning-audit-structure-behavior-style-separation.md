---
id: 0000-aud
title: Re-skinning Audit — Structure / Behavior / Style Separation
type: dsgn
status: ready
priority: "2"
effort: XL
created: "2026-10-28T19:37:20.795Z"
updated: "2026-10-28T19:40:02.175Z"
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/superpowers/specs/2026-10-27-theme-metrics-design.md
  plans:
    - ["0001-1t9", "blocks"]
    - ["0002-ldj", "blocks"]
    - ["0003-7x7", "blocks"]
    - ["0004-vqt", "blocks"]
    - ["0005-1b3", "blocks"]
    - ["0006-dy6", "blocks"]
    - ["0007-1sl", "blocks"]
    - ["0008-j5l", "blocks"]
    - ["0009-agy", "blocks"]
    - ["0010-743", "blocks"]
    - ["0011-v9t", "blocks"]
    - ["0012-pt9", "blocks"]
---

# Re-skinning Audit — Structure / Behavior / Style Separation

## Summary

**Goal:** Classicy grows user-selectable **Appearance Packages** that can make the UI look like a different desktop (Windows 3.11, Solaris, IRIX), with the Platinum look it ships today becoming the first package.

**Problem:** The Platinum look is baked into the wrong layers: SCSS encodes it as fixed ratios on tokens and compile-time mixins, art is base64 SVG with baked hex, the icon registry shallow-merges and 37 module-scope captures never see a registration, the sound manager ignores the theme, part arrangement is fixed in JSX/JS order, and 158 `!important`s and ~331 pixel literals fight any override. A theming design has to cut along these seams, and nobody had inventoried them.

**Approach:** Audit `src/` (excluding `Extensions/ScreenSaver/savers/**`, where art is intentionally per-saver) for how cleanly it separates **structure** (DOM shape), **behavior** (JS logic) and **style** (SCSS / assets); record the owner's decisions D1–D24; state the target architecture they imply; lay out a nine-phase work plan. The contents of this plan are captured by plans 0001–0012 (see *9. Work plan — coverage by plan* under Design): 0001 is Phase 0, 0002 is the program design and shared contract split out of §8, and 0003–0012 are implementation parts A–J. Audited 2026-10-27; decisions taken the same day.

---

# Part 1 — Design

## Current State

_Date: 2026-10-27. Scope: `src/` excluding `Extensions/ScreenSaver/savers/**` (saver art is intentionally per-saver)._

_Status: findings (§1–§6) are the audit as surveyed. §7 records the owner's
decisions (2026-10-27, all questions answered the same day), §8 the target
architecture those decisions imply, §9 the work plan, §10 the record of the
questions and their answers. The first slice of §9 (theme metrics,
folding `--hig-*`) is already in flight on the `worktree-theme-metrics`
branch; §7 D12 amends that slice._

**Terminology.** This document says **Appearance Package** (synonyms used
earlier: theme pack, theme package) for the user-selectable unit. A
*developer* imports and composes **Classicy** components; a *user* selects an
**Appearance Package**. The look this codebase ships today is the **Platinum**
Appearance Package.

### Purpose

Classicy will grow Appearance Packages that can make the UI look like a
different desktop (e.g. Windows 3.11, Solaris or IRIX). This audit does not
compare operating systems. It measures how cleanly the codebase already
separates **structure** (DOM shape), **behavior** (JS logic) and **style**
(SCSS / assets), and inventories every place where the Platinum look is baked
into the wrong layer. The output is the list of seams a theming design has to
cut along.

Paths are relative to `src/SystemFolder/`. `SR/` = `SystemResources/`,
`CP/` = `ControlPanels/`.

### 1. What exists today

#### 1.1 The theme pipeline

```
themes.json ──► ClassicyTheme (TS type + zod ClassicyThemeSchema)
                     │
                     ▼
          getThemeVars(theme)           CP/AppearanceManager/ClassicyAppearance.ts:118
                     │  ~117 CSS custom properties
                     ▼
   <div class="classicyDesktop" style={vars}>   SR/Desktop/ClassicyDesktop.tsx:608
                     │
                     ▼
   component SCSS reads var(--…) directly, or through
   appearance.scss mixins (platinum*), scrollbars.scss, assets.scss
```

A theme is one JSON object with five sections: `color`, `typography`,
`measurements`, `desktop`, `sound`. It is validated (zod), persisted, fork-able
into a Custom theme, and importable/exportable as a file. This is a good,
already-public contract and should be the base a pack extends rather than
something to replace.

#### 1.2 What a theme can change today

| Dimension | Themeable? | How |
|---|---|---|
| 28 colors (7 system grays, 7 accents, 6 window colors, 8 scalars) | Yes | `--color-*` |
| 5 font stacks + sizes | Yes | `--*-font`, `--*-font-size` |
| 4 window metrics (border, control, padding, scrollbar) | Yes, but **never exercised** | `--window-*` |
| Desktop wallpaper / color / tiling | Yes | `--desktop-background-*` |
| Desktop icon size / label size | Yes | `--desktop-icon-*` |
| Sound set | Nominally | `sound.name` → `ClassicySounds[name]` |
| Bevel **shape** and **depth** | No | fixed in `appearance.scss` mixins |
| Title-bar stripes, resize grip, control-box dither | No | base64 SVG with baked hex in `assets.scss` |
| Scrollbar arrow / thumb shape | No | gradient-stripe mixins in `scrollbars.scss` |
| Menu check / submenu / pop-up glyphs | No | Unicode in TSX, or `assets.$triangle` |
| Icons, cursors, boot art, Apple logo, Trash, alias badge | No / partial | see §4 |
| Layout metrics (`--hig-*`, 36 tokens) | No → **in flight** | constants in `getThemeVars`; becoming `measurements.<family>` inputs on `worktree-theme-metrics` (see §9 Phase 0) |
| Arrangement (control order, menu bar location, grip corner) | No | JSX order / JS math, see §5 |

Two facts frame everything:

- **All 21 built-in themes share one `measurements` block and one `system`
  palette** (verified: 1 distinct measurement set, 1 distinct system palette,
  2 typography sets). Built-in themes vary only the accent ramp and wallpaper.
  Geometry variation through tokens has never been tested, so assume it is
  broken in places until proven otherwise.
- **The `--hig-*` tokens are emitted beside the theme tokens but are not theme
  data.** They are `intToPx(constant)` in `ClassicyAppearance.ts:183-222`.
  A pack cannot change button height, group-box margins or title-bar height.
  (Being fixed: `docs/superpowers/specs/2026-10-27-theme-metrics-design.md`.)

---

### 2. Style layer: SCSS discipline

96 SCSS files, ~8.7k lines. Overall verdict: **the core controls hard-code
almost nothing, but they encode Platinum as fixed *ratios* on tokens and as
compile-time mixins**. color and border width follow the theme; shape, depth
and proportion do not.

#### 2.1 Hard-coded colors (leaks, not intentional art)

| Location | Value | Note |
|---|---|---|
| `SR/Window/ClassicyWindow.scss:198`, `SR/Alert/ClassicyAlert.scss:88` | `#f7cecd !important` | error title-bar pink, duplicated |
| `SR/ControlGroup/ClassicyControlGroup.scss:31` | `groove rgb(239,239,239)` | browser derives etch shades from a fixed gray |
| `SR/FileInput/ClassicyFileInput.scss:31` | `#c00` | should be `--color-error` |
| `SR/Icon/ClassicyIcon.scss:34,95,118`, `SR/Desktop/ClassicyDesktopIcon.scss:36,93,116` | `rgba(255,255,255,.5)`, `rgba(0,0,0,.5)` | selection / drag overlays, duplicated |
| `CP/AppearanceManager/styles/scrollbars.scss:163-171` | `rgba(0,0,0,.25)`, `rgba(255,255,255,.25)` | track shading |
| `Finder/FinderAboutThisComputer.scss:30,53,83` | `#999`, `rgba(255,255,255,.5)` | |
| `WebViewer/WebViewer.scss:6` | `white` | |
| `SR/Icon/ClassicyIcon.scss:57`, `ClassicyDesktopIcon.scss:55` | `theme-halftone(#000000)` | color compiled into a data URI |

Intentional and fine: ColorPicker crayon/track colors (data), `var(--x, #hex)`
fallbacks in HyperCard and DriveSetup.

**Tokens no theme supplies** (fallback always wins): `--color-theme-hover`
(`SR/Placard/ClassicyPlacard.scss:109`), `--color-theme-selection`
(`SR/ImageWell/ClassicyImageWell.scss:41,48`), `--color-theme-1` (typo for
`-01`) and `--box-border-size` (`CP/DriveSetup/DriveSetupList.scss:17,79`).

#### 2.2 Compile-time art that cannot follow a runtime theme

- `CP/AppearanceManager/styles/assets.scss` — 13 base64 SVG variables with
  **baked hex colors**: title-bar stripes (`#fff`/`#787878`), red stripes
  (`#ef8c89`/`#f9dada`), utility crosshatch (`#ccc`), resizer grip
  (`#797979`…`#fff`), corner dither (6 grays), zoom/collapse/triangle/down-arrow
  glyphs (black). Consumed by Window, WindowFrame, Alert, Menu, PopUpMenu and
  the `platinumWindowControlBox` mixin.
- `SR/Slider/ClassicySlider.scss:25,30,35` and `SR/Tabs/ClassicyTabs.scss:26`
  — inline SVG thumb/tab outlines with `stroke='black'`; Slider also pulls an
  external `assets/img/ui/slider-strikes.svg`.
- `appearance.scss:225-237` `encode-color` + `theme-halftone` use `sass:color`
  at compile time.
- No `@extend`, no `lighten/darken/mix` — good.

#### 2.3 The mixin layer is 100 % Platinum

`appearance.scss` exports 20 mixins/functions. Every one except `no-select`
and `encode-color` draws a Platinum bevel, frame or control box via stacked
`box-shadow`/`px-rect` layers. `scrollbars.scss` adds 10 more, all Platinum.
Three components re-implement their own bevels locally (`ControlStrip:23-60`,
`Slider:39`, `ColorPicker:251`).

Consumers reach the mixins by **relative `@use` path**
(`../../ControlPanels/AppearanceManager/styles/appearance`, 40 files). The
package also exports `./scss/*` pointing at the same directory, and the
example app `@use 'classicy/scss/appearance'`s it — so **the mixin names are
already public API**. (§7 D16: that API is allowed to break; the `platinum*`
names move into the Platinum package and the generic names replace them.)

#### 2.4 Magic multipliers

~100 distinct `calc(var(--token) * N)` combinations. The non-trivial ones are
the real Platinum proportions, e.g.:

- `--window-control-size * 1.25 / 1.5 / 1.3125 / 1.75 / 2.125 / 2.5 / 3.5 / 15`
  (collapsed height, title bar, menu rows, pop-up height, menu min-width …)
- `--ui-font-size * 0.865 / 0.75 / 0.8 / 0.65 / 10⁄12 / 0.8571 / 1.8571`
- `--window-padding-size / 1.25 / 1.5 / 3 / 4`

Each is a hidden design constant. Title-bar height is defined **twice and
inconsistently**: `control * 1.5` = 18px (`ClassicyWindow.scss:244`) vs
`--hig-titlebar-height` = 19px (`:600`).

#### 2.5 Bare pixel literals

333 `Npx` literals (re-measured 2026-10-28: 283 bare + 50 `var(--x, Npx)` fallbacks). Worst offenders:
`ControlStrip` 84 (pixel-matched to HIG Fig. 6-15 by design), `HyperCard` 40,
`FinderAboutThisComputer` 20, `appearance.scss` 19 (menu frame), `Pager` 17,
`ColorPicker` 16, `AppleGuide` 12, `BalloonHelp` 9, `scrollbars.scss` 8,
`PopUpSlider` 7. Core controls (Button, Menu, Tabs, Slider, Checkbox, Radio,
Window) have 0–2 each.

#### 2.6 `!important` and cascade order

158 total; `ClassicyWindow.scss` alone has **62**. Root cause: every window
state class (`Active`, `Inactive`, `Collapsed`, `Dragging`, `Red`, …) is
declared *before* the base `.classicyWindow` rule at line 222, so each needs
`!important` to win. Other patterns: a mixin that itself sets `!important`
sizes (`platinumWindowControlBox`) forcing callers to escalate; `DesktopIcon
.scss:141` admits an escalation chain on `mask-size`.

#### 2.7 Cross-component selector coupling

A component's SCSS styling another component's classes, which a per-component
skin would have to know about:

- Alert → Window title-bar internals (`ClassicyAlert.scss:86-105`), duplicating
  `.classicyWindowRed`
- AppleGuide → Window, Assistant
- Window → Placard; ControlGroup → ControlLabel/Input/PopUpMenu/Button
- ControlStrip, ButtonToolbar, HelpButton → BevelButton internals
- FileBrowserViewTable → Table/Triangle; FileDrag → Icon/DesktopIcon
- Menu → Separator; ColorPicker → Slider range-track pseudo-elements

#### 2.8 Naming and state expression

- Dominant: `classicy<Component><Part>` / `classicy<Component><State>`, ~88
  state-like class names. Exceptions: kebab (`classicyWindowFrameEdge-top`),
  BEM (`driveSetupList__row--selected`, `classicyColorPickerSlider--red`,
  `select--disabled`), unprefixed app classes, one typo
  (`.classicyDesktopMenuAppleMenu`).
- **State is overwhelmingly class-based.** `data-state` is used only by
  BevelButton, Placard, ImageWell (ControlStrip styles BevelButton's). Exactly one `[aria-*]` selector exists
  (`ControlStrip.scss:226`). `aria-pressed`, `aria-selected`, `aria-expanded`,
  `aria-disabled` are emitted but never styled against.
- Look and state are fused in the same class: `.classicyWindowActive` carries
  z-index **and** the stripe assets; `.classicyWindowRed` carries stacking,
  border color, pink and red assets.

#### 2.9 Delivery constraint

`classicy.css` is one compiled blob injected as `<style id="classicy-styles">`
by every bundle (`bin/classicyStyleInjector.ts`). There is no `@layer`, no
per-component CSS entry, no way for a consumer to *omit* the Platinum rules. A
pack today can only pile overrides on top (and fight the 157 `!important`s).
§7 D15 settles the model: packages are compiled in and switched at runtime,
so every installed package's CSS ships and is scoped by a root attribute.

---

### 3. behavior layer: JS that knows the look

#### 3.1 JS reading / assuming visual geometry (`SR/Window/ClassicyWindow.tsx`)

| Line | Assumption | Source |
|---|---|---|
| 57, 120, 160, 1316 | `menuBarHeight = 30` (four copies) | hard-coded |
| 41 | 4px drag threshold | hard-coded |
| 958-959, 1098-1099 | `+ 5` chrome fudge in resize width | hard-coded |
| 1316-1317 | zoom `margin = 8` | hard-coded |
| 1371-1386 | zoom-to-fit queries `.classicyWindowContentsInner` by class | class-coupled |
| 1492-1499 | skips resize while collapsed because CSS forces ~24px | implicit CSS knowledge |
| 101-114 | chrome size via `getComputedStyle` padding+border | **good pattern** |
| 596-599 vs 684-689 | initial centering uses content-box, re-centering uses outer rect | inconsistent |

`SR/BalloonHelp/useClassicyBalloonHelp.tsx:27-33` reads `--window-control-size`
via `getPropertyValue` — the right way to do it when JS must know a metric.

Outside the window: Finder, FileDrag and Alert select on `.classicyWindow` /
title-bar classes.

#### 3.2 JS that computes styling from theme data instead of CSS

- `SR/App/ClassicyApp.tsx:160-180` builds a base16 palette from
  `activeTheme.color` for the debug JSON viewer.
- `SR/File/ClassicyFileBrowserViewIcons.tsx`, `SR/Desktop/ClassicyDesktopIconContext.tsx`,
  `SR/File/ClassicyFileBrowser.tsx:232` read `activeTheme.desktop.iconSize` for
  grid lattice math (legitimate: layout needs the number, but it bypasses the
  CSS var and will diverge if a pack sets icon size another way).

#### 3.3 Inline styles from JS (62 sites)

Almost all are dynamic layout (position/size) or per-instance CSS variables
(`--classicy-window-contents-bg`, `--classicy-icon-mask`,
`--classicy-slider-track-from/to`, `--classicy-control-strip-bottom`,
`--classicy-tick-left`) — acceptable. The theme-visual leaks are:
`ClassicyWindow.tsx:1833` picks a **named cursor asset** in JS;
`ColorPickerCrayon`/`HSV`/`HLS` and `QuickTimeCaptionsOverlay` carry literal
colors (data/overlay, low priority).

#### 3.4 Art in TSX

- **PixelArt rows** (theme-colored, fixed shape): `SR/ControlStrip/ClassicyControlStripArt.ts`
  (7 glyphs), `SR/PopUpSlider/ClassicyPopUpSliderArt.ts` (2).
- **Inline procedural SVG**: `ProgressBar` chasing arrows (`:45-62`),
  `Triangle` (5 polygons), `ColorPickerCrayon`, `useClassicyBalloonHelp`.
- **Unicode glyphs as UI art**: `Menu.tsx:384` (`–`, `✓`), `PopUpMenu.tsx:30`
  and `ComboBox.tsx:36` (`✓`), `BevelButton.tsx:523` (`▸`/`▾`),
  `Placard.tsx:114` (`▾`), `FileInput.tsx:198` (`✕`), `Kbd.tsx:7-10` and
  `Menu/ClassicyKeyboardShortcut.ts:25-28` (`⌃⌥⇧⌘`, duplicated tables, joined
  into one text node so CSS cannot respell them).
- **Raster via JSX**: `LittleArrows` uses `<img src={ClassicyIcons.ui.menuDropdownArrowUp}>`
  flipped with CSS.

---

### 4. Asset layer: registries and hard wires

#### 4.1 Icons (`CP/AppearanceManager/ClassicyIcons.ts`)

- Eager `import.meta.glob` over `assets/img/icons/**` and `ui/**`; nested
  object, 297 icon + 27 ui leaves; missing file silently resolves to `""`.
- **`registerClassicyIcons` is a shallow `Object.assign`** (`:42-48`).
  Registering `{ system: { alias } }` — which `ClassicyDesktopIcon.tsx:124`
  tells users to do — **replaces the entire `system` namespace** (~200 entries).
- **39 module-scope captures** (37 in components, 2 in stories) (`const x = ClassicyIcons.a.b` at import time)
  never see a later registration, including the menu-bar Apple logo
  (`SR/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx:29`), `system.macos`
  (`ClassicyDesktop.tsx:88`, `ClassicyAppManager.ts:49`), the parade defaults,
  and every QuickTime control.
- Direct `@img/` imports bypassing the registry: CrashScreen sad-mac,
  PDFViewer search/hand, PictureViewer sample; plus relative imports in
  AppearanceManager (`./resources/*.png`).
- Registry entries with no consumer: `ui.stripe`, `ui.tab`,
  `ui.menuDropdownArrows`, `ui.halftoneSmall`, `system.bomb`.

#### 4.2 Cursors

Two paths: `SR/Cursor/useClassicyCursor.ts` (registry, runtime) and raw
relative `url()` in `SplitView.scss:52-74` and `PDFViewerDocument.scss:37-44`
(not swappable). No default-arrow cursor; no theme field.

#### 4.3 Sounds

- `ClassicySounds` is a mutable exported object with one entry, `platinum`;
  no register function. Schema refines `sound.name` against it.
- `sound.name` is applied **only** on `switchTheme` / theme import
  (`ClassicyAppearanceManager.tsx:114-207`). `ClassicySoundManagerProvider`
  boots with `ClassicySounds.platinum` unconditionally
  (`ClassicySoundManagerUtils.tsx:130-143`), ignoring the persisted theme.
- 41 sprite ids (`"ClassicyWindowOpen"` …), dispatched from ~140 sites across
  components; a replacement set must keep the same ids. `bin/make_audio_sprites.sh` already
  supports one sprite per `assets/sounds/<name>/` directory.

#### 4.4 Fonts

Base64 `@font-face` in `styles/fonts.scss`, split out to `classicy/fonts`.
Theme picks any stack string; a pack can add a family only by loading its own
`@font-face` host-side. The Fonts tab list is hard-coded
(`ClassicyAppearanceManager.Fonts.tsx:9-16`).

#### 4.5 Wallpapers

`ClassicyWallpapers.ts` globs `*.png` only (the one `.jpg` is skipped); themes
store bare filenames resolved by `resolveWallpaper`; any http(s)/data URL
passes through. Picker list is a mutable array, no register API.

#### 4.6 System art

| Asset | Mechanism | Swappable |
|---|---|---|
| Startup logo / wordmark / pre-boot | props on `ClassicyBootSequence` + registry at render | Yes |
| Extension parade defaults | module-scope capture | No (adds via store only) |
| Crash screen sad-mac | direct `@img` import | No |
| Apple menu logo | module-scope capture | **No** |
| Trash full/empty, alias badge, help button, About art | registry at render | Partial (namespace replace) |
| Window stripes, grip, dither, zoom/collapse glyphs | `assets.scss` base64 | No |
| QuickTime control art | module captures + SCSS `url()` | No |
| ControlStrip / PopUpSlider pixel art | TS row arrays | Shape no, color yes |

#### 4.7 Bundling

`build.lib` inlines **every** asset as a `data:` URI (~78 % of the JS is
base64 per the comment in `vite.config.ts`). A pack shipping its own icon set
would double that unless assets become external or lazily loaded.

---

### 5. Structure layer: arrangement baked into JSX / JS

Marked **JSX** (fixed by order/nesting), **JS** (computed), **CSS** (already
re-arrangeable).

| Surface | Decision | Layer |
|---|---|---|
| Desktop | Menu bar at screen top; it is simply the first child (`ClassicyDesktop.tsx:636`); window menus publish to the store and the bar renders them | JSX — an in-window menu bar needs a new slot |
| Menu bar | Order `[Apple, …app, Help, AppSwitcher]` (`ClassicyDesktopMenuBar.tsx:291-301`); "About" relocated into Apple menu | JS |
| Menu bar | Right cluster via `float:right` + DOM order; a comment relies on render order to place Extensions left of Time | CSS, but floats defeat `order` |
| Menu bar | Clock format M/D/Y, 12/24h | JS |
| Window title bar | Order close → title → zoom → collapse; all boxes share wrapper class `.classicyWindowControlBox`, no role attribute on wrapper | JSX (CSS `order` possible only via fragile `:has`/`nth-child`) |
| Window | Stripe spans `TitleLeft/Center/Right` are dedicated DOM | JSX (hide with CSS) |
| Window | Grow box bottom-right: position CSS, but resize math assumes top-left anchor + bottom-right grip (`:958, 1098, 1003-1030`) | JS |
| Window | Which boxes exist (modal hides zoom, utility hides title) | JS |
| Window | Two parallel title-bar implementations: `ClassicyWindow` and `ClassicyWindowFrame` share no markup | JSX |
| Alert | Icon left of body (flex siblings) | CSS |
| Alert | Button order from array; buttons carry no role class/attribute, only the default is identifiable | JS |
| Alert | Default-button resolution precedence | JS (correctly behavioral) |
| Button / Checkbox / Radio / PopUp | Label position via `labelPositionClass` → flex-direction | **CSS (good pattern)** |
| Button | `className` accepted in type but overwritten by the spread order (`ClassicyButton.tsx:166-180`) | bug |
| BevelButton | `data-state` + `data-mode`, className merged | **good pattern** |
| Menu | Check/dash glyph in JSX; check *replaces* icon (either/or) | JS / JSX |
| Menu | Submenu arrow `::after` asset; flip side via JS class | CSS / JS |
| Kbd | Modifier glyph table + canonical order; inline variant is one text node | JS |
| Tabs | Strip before panels, container not flex; horizontal-only scroll math | JSX / JS |
| Disclosure | Label side is a JSX branch (not a class) | JSX |
| Desktop icon | Label below (flex column) | CSS |
| Desktop icon | Clean-up grid fills from the **right** edge (`ClassicyDesktopIconContext.tsx:26-44, 81-115`) | JS |
| Control Strip | Right-dock mirrored with CSS `order` + `scaleX(-1)` | **CSS (best example in repo)** |
| Control Strip | Dock edge chosen by pointer x; drag grow direction | JS |
| Boot | `ClassicyStartupScreen` fuses art, layout, 50 ms timer, parade maths, boot sound, session flag; a custom `bootScreen` loses all of it | JSX + JS |

`className`/`style` passthrough is inconsistent: ~20 components merge
`className`; ~30 (Window, Alert, Checkbox, Radio, Slider, ProgressBar, Tabs,
Menu, Desktop, MenuBar, Input, ListBox, …) accept neither.

---

### 6. Good patterns already in the codebase (build on these)

1. **Token pipeline** — JSON → zod → `getThemeVars` → inline vars on the
   desktop root. Runtime switch, no rebuild, persisted, fork-able.
2. **`ClassicyThemeColorTargets`** — one table drives reducer validation and
   the Colors tab UI. Extend the same idea to metrics and assets.
3. **`labelPositionClass`** — a prop selects a class; CSS owns the arrangement.
4. **BevelButton / Placard `data-state`** — state as attribute, look in CSS.
5. **Control Strip right-dock** — a mirrored arrangement done purely in CSS.
6. **`ClassicyPixelArt`** — pixel-exact art that still recolors with tokens.
7. **`classicyWindowChromeSize` via `getComputedStyle`** and
   **`useClassicyBalloonHelp` reading a CSS var** — JS asking CSS for the
   number instead of hard-coding it.
8. **Registries with `useSyncExternalStore`** (Control Strip modules, screen
   savers, file-system adapters) — the model an icon/sound/cursor registry
   should follow.
9. **`sound.name` in theme JSON** and the per-directory sprite build — the
   sound-pack hook already half exists.

## Decisions

Each decision names the finding it settles. Where the guidance overturns an
earlier call, the earlier call is struck here so the plan has one truth.

- **D1 — Two name spaces.** Functional components and bare functional styling stay `Classicy`/`classicy`. Anything that encodes a look is named by its package: `Platinum`/`platinum`. A developer imports Classicy; a user selects an Appearance Package. — _Settles:_ §2.3 (`platinum*` mixins are the only implementation), §4.3 (`ClassicySounds.platinum`), naming in §2.8
- **D2 — An Appearance Package is a JavaScript module plus a JSON file.** The module ships every resource needed to render Classicy components visually (styles, art, fonts, sounds, cursors, code). The JSON declares the defaults a user may customize: sizes, colors, preferences. The bar for a good package: as much as possible lives in the JSON; the module is base styling plus added functionality. — _Settles:_ §8 Q1 (was open)
- **D3 — Packages receive events from components** and may alter them, e.g. a package button wants its own behavior and styling after a click. — _Settles:_ New requirement; relates to §3.3, §5
- **D4 — Every package registers with Classicy** through one call. — _Settles:_ §4 (five unrelated registries today)
- **D5 — Cursor, Wallpaper, Font and Sound packs register custom items** the way icons do today, as parts of an Appearance Package. — _Settles:_ §4.2, §4.4, §4.5, §4.3
- **D6 — System art becomes registrable and replaceable.** Current assets are registered as Platinum items. — _Settles:_ §4.6, §4.1 (37 module-scope captures)
- **D7 — Sound themes load on the fly** , selectable from theme JSON and from a registered Sound pack. A Sound pack is a JSON file with web URLs to its audio. — _Settles:_ §4.3 (boot path ignores the theme; no register call)
- **D8 — Extract all art and inline styles from TSX/JS.** Assets live in the package. — _Settles:_ §3.3, §3.4, §2.2
- **D9 — No bare pixel literals.** Replace with theme variables or values calculated from them. — _Settles:_ §2.5 (331 literals)
- **D10 — No hard-coded colors.** Use the color tokens; add Tailwind-style tint and opacity variants of each token so a component never needs a literal. — _Settles:_ §2.1
- **D11 — Group the magic multipliers.** Fold as many as possible into shared named derivations, or find alternative calculations that coincide so they can share one name. — _Settles:_ §2.4 (~100 combinations)
- **D12 — The `--hig-*` variables are gone.** ~~Keep them for one minor version as `var(--new)` aliases~~ (metrics spec, "Deprecated aliases"). The in-flight slice drops `CLASSICY_DEPRECATED_METRIC_ALIASES` and emits nothing under the old names. — _Settles:_ §1.2, metrics spec
- **D13 — Combine the style vocabulary across components** wherever the same idea appears in two components under two names. — _Settles:_ §2.7, §2.8
- **D14 — Platinum is the default package and always ships with Classicy.** — _Settles:_ §8 Q1
- **D15 — Packages switch at runtime but are compiled into the application.** No lazy download of a package; the host imports every package it offers. — _Settles:_ §8 Q2 (was open), §2.9
- **D16 — Backwards compatibility is not required.** The `classicy/scss/*` mixin names, `--hig-*`, `sound.name`, the theme-file layout and `registerClassicyIcons`'s shape may all change. — _Settles:_ §8 Q4
- **D17 — Resources may be external.** A package may point at remote URLs; theme JSON accepts an `http(s)` URL or embedded base64 `data:` for any asset. — _Settles:_ §8 Q6, §4.7
- **D18 — A package may modify any style of any Classicy component and participate in its state and display.** — _Settles:_ §2.9, §5
- **D19 — One selector vocabulary for JavaScript and CSS/SCSS.** Common component states are tagged with a common class name usable from both. — _Settles:_ §2.8 (class vs `data-state` vs `aria-*`)
- **D20 — Shared state classes are bare** and sit beside the component root: `.classicyButton.pressed`. Same string from `CLASSICY_STATE.pressed` in JS. — _Settles:_ §8.6, §10 Q1
- **D21 — "Any style" includes arrangement.** A package may move parts: control-box order and side, grow-box corner, menu bar inside windows, Tabs strip position, label sides. — _Settles:_ §5, §10 Q2
- **D22 — Packages live at `src/Appearance/<Package>/`** , exported as `classicy/appearance/<package>`. — _Settles:_ §10 Q3
- **D23 — Event handlers may both perform side effects and return decorations** that Classicy applies on the next render. — _Settles:_ §8.5, §10 Q4
- **D24 — The 21 built-in themes become Platinum presets.** — _Settles:_ §8.1, §10 Q5

Nothing is open after this guidance; §10 keeps the questions with their
answers for the record.

### Rejected alternatives

- **Keep the `--hig-*` names for one minor version as `var(--new)` aliases** (metrics spec, "Deprecated aliases") — struck by D12 and D16: the in-flight slice drops `CLASSICY_DEPRECATED_METRIC_ALIASES` and emits nothing under the old names, and backwards compatibility is not required.
- **Packages as lazily downloaded bundles** — D15: packages are compiled into the application and switched at runtime; the host imports every package it offers.

## Design

What D1–D19 imply, stated once so the phases in §9 can refer to it.

### 8.1 Naming

| Today | Target | Rule |
|---|---|---|
| `platinumButtonBevel`, `platinumWindowControlBox`, … (`appearance.scss`, 20 mixins; `scrollbars.scss`, 10) | **Vocabulary** mixins named for the role, e.g. `classicy-control-raised`, `classicy-control-sunken`, `classicy-window-frame`, `classicy-menu-frame`, `classicy-focus-ring`, `classicy-scrollbar-thumb`; the **Platinum implementation** of each lives in the package under `platinum-*` | D1, D13 |
| `styles/assets.scss`, `styles/appearance.scss`, `styles/scrollbars.scss` in `CP/AppearanceManager/` | `src/Appearance/Platinum/` (package root); the vocabulary (`src/Appearance/vocabulary/`) is Classicy-owned | D1, D2 |
| `ClassicySounds.platinum` | the Platinum Sound pack, registered by the Platinum package | D1, D7 |
| `ClassicyIcons` default tree, `ClassicyWallpapers` array, bundled `@font-face` | Platinum items registered by the package into Classicy registries | D5, D6 |
| 21 entries in `themes.json` | 21 **presets** of the Platinum package (they differ only by accent ramp and wallpaper, §1.2) | D2, D24 |

`classicy/scss/*` keeps exporting, but exports the vocabulary; the Platinum
mixins are reachable as `classicy/appearance/platinum`. Consumers using
`platinum*` names must update (D16).

### 8.2 Package shape

```
src/Appearance/Platinum/            (D22)
  index.ts            registerClassicyAppearancePackage({ … })   (side-effect import)
  platinum.json       id, name, defaults (color/typography/measurements/desktop/
                      sound/cursor/…), presets[], options schema (zod → JSON)
  styles/             SCSS compiled to one CSS string, injected on register as
                      <style id="classicy-appearance-platinum">, every rule
                      scoped under [data-classicy-appearance="platinum"]
  assets/             art, cursors, wallpapers, fonts, sound sprite JSON+audio
  hooks.ts            component event handlers (D3), optional
```

- The **JSON** is the user-facing contract. Everything in it is editable in
  the Appearance control panel (schema-driven form, the `ScreenSaverConfigForm`
  pattern) and persisted the way the active theme is today. A package adds
  its own knobs (e.g. `measurements.controlStrip.*`) and its SCSS reads them
  as CSS variables; that is how pixel-matched art (Control Strip, §2.5) sheds
  its literals without losing precision (D9).
- The **module** registers: styles, assets into each registry (§8.3), a sound
  pack (§8.4), event hooks (§8.5). The active package id lives in the store
  (`Appearance.packageId`, default `"platinum"`), is written to the desktop
  root as `data-classicy-appearance`, and switching is an attribute flip plus
  a theme-var recompute (D15).
- A package is **compiled in**: the host imports it at entry (Platinum is
  imported by `ClassicyDesktop`'s own graph, so it is always present, D14).
  All installed packages' CSS ships; scoping by the root attribute keeps them
  from fighting, and `@layer classicy.base, classicy.package, classicy.user`
  lets a package win over base without `!important` (D18, §2.6).
- Base CSS (Classicy-owned) holds **structure only**: box model, flex,
  positioning, `display`, masks' geometry. Look (colors, bevels, art, radii,
  stripes) lives in the package layer. The test: with no package registered,
  every component still lays out correctly and is merely unstyled.

### 8.3 One registry pattern for every asset kind

Icons, cursors, wallpapers, fonts, sounds and system art all follow the
registry model the codebase already uses for Control Strip modules and screen
savers (§6 item 8):

- `registerClassicy<Kind>(packageId, items)` **deep-merges** into a namespace
  per package; the active package's namespace is consulted first, then
  Platinum (always present), then nothing. This fixes the `registerClassicyIcons`
  shallow-merge wipe (§4.1).
- Readers are **render-time**: `useClassicy<Kind>()` subscribes with
  `useSyncExternalStore`; SCSS reads `var(--classicy-<kind>-<name>)` emitted by
  the package. The 37 module-scope captures and the direct `@img` imports go
  (§4.1, §4.6).
- An item is a URL string: an imported asset, an `http(s)` URL, or a `data:`
  URI (D17). Validation only checks that it is one of those three.
- Fonts register `{ family, src: url | data, weight?, style? }` and Classicy
  writes the `@font-face`; the Fonts tab lists the registry, not a literal
  array (§4.4). Wallpapers register `{ name, src }`; the `.jpg` glob gap closes
  as a side effect (§4.5). Cursors register by role (`arrow`, `watch`, `hand`,
  `resizeLr`, …) and the SCSS `url()`s in SplitView/PDFViewer become
  `var(--classicy-cursor-resize-lr)` (§4.2).

### 8.4 Sound packs

A Sound pack **is** today's `SoundData` with URLs instead of bundler-resolved
paths: `{ id, name, src: ["https://…/pack.ogg", …], sprite: { ClassicyWindowOpen: [start, len], … } }`.
`registerClassicySoundPack(pack)` adds it to a live registry; the theme-schema
`refine` checks the registry at parse time, not a frozen object; the Sound
manager boots from the persisted theme's `sound.pack` and switches when it
changes (§4.3). `bin/make_audio_sprites.sh` writes the pack JSON with relative
`src` so a pack can be hosted anywhere. The ~140 sprite ids are the contract a
pack must satisfy; missing ids fall through to Platinum.

### 8.5 Events and display participation

Each component calls one hook, `useClassicyAppearance("Button", state)`,
which (a) returns `{ className, style, attrs }` contributed by the active
package for that component and state, merged onto the root, and (b) emits
lifecycle events (`press`, `release`, `open`, `close`, `focus`, `blur`, …) to
handlers the package registered with `on("Button", "press", handler)`. A
handler may perform side effects (play a sound, start an animation) **and**
return decorations `{ className?, style?, attrs? }` that Classicy merges on
the next render (D23); returning nothing is the side-effect-only case. This is
how a package "participates in state/display" (D18) and "receives events"
(D3) without Classicy knowing any particular look. Platinum's first use: window-collapse and menu-flash
feedback that today live in component code.

### 8.6 Vocabulary: one source for JS and CSS

A single generated source (`ClassicyVocabulary.json` → `ClassicyVocabulary.ts`
and `_vocabulary.scss`, produced by the same `generate-*` step as barrels)
defines:

- **Root and part classes**: `classicy<Component>`, `classicy<Component><Part>`.
- **Shared state classes**, identical across components: `active`, `inactive`,
  `disabled`, `selected`, `pressed`, `focused`, `hover`, `collapsed`, `open`,
  `dragging`, `error`, `default`, `checked`, `mixed`, `expanded`. A component
  adds the shared class beside its root class; a package targets
  `.classicyButton.<state>` in SCSS and `querySelector` with the same string
  from `CLASSICY_STATE.pressed` in JS (D19).
- **Part attributes** where order matters: `data-classicy-control="close|zoom|collapse"` on window control boxes, `data-classicy-role="default|cancel|other"` on alert buttons, so CSS can address them without `nth-child` (§5).

`aria-*` keeps being emitted for accessibility; it is not the styling
contract. The audit's existing `classicyWindowActive`-style classes either map
to a shared state or stay as component-specific parts. The spelling is the
bare form (D20): the vocabulary generator rejects a state name that matches
any root or part class, which is the only collision Classicy controls; host
pages that style `.pressed` globally are on their own.

### 8.7 Colors and numbers

- **color variants without JS**: `getThemeVars` keeps emitting one variable
  per token; two SCSS helpers in the vocabulary, `classicy-tint($token, $pct)`
  and `classicy-alpha($token, $pct)`, expand to `color-mix(in srgb, var(--token), white $pct)`
  and `color-mix(in srgb, var(--token) $pct, transparent)`. Every literal in
  §2.1 becomes one of these (D10). `color-mix` is baseline since 2023.
- **Named derivations instead of multipliers**: the metrics slice already
  turns `control × 1.5` into `--control-row-height`. Phase 6 inventories the
  ~100 combinations, names each real proportion once in `getThemeVars`
  (menu row height, pop-up height, collapsed window height, small/large UI
  font steps, …), and rewrites SCSS to read the name. Coincidences are grouped
  where the relationship is structural and kept separate where a package
  would want them independent (same rule as the metrics spec) (D11).
- **Pixel literals**: every one becomes a theme variable, a derivation, or a
  package-JSON metric (D9). The 55 `var(--x, Npx)` fallbacks lose their
  fallback once Platinum always supplies the variable.

### 8.8 Arrangement slots (D21)

A package rearranges parts through CSS wherever the parts are already
siblings, and through a small set of **layout declarations** in its JSON
where JS must agree with CSS:

- **CSS-only** (needs part attributes from §8.6, then `order` / flex
  direction): title-bar control order and side, Alert icon and button order,
  Disclosure and label sides, Tabs strip position, menu-bar clusters (floats
  replaced by flex + `order`, §5), desktop-icon label side.
- **Declared** (`layout` block in the package JSON, read by both
  `getThemeVars` and the JS that does geometry): `window.growBoxCorner`
  (`"bottom-right" | "bottom-left" | …`; the resize math anchors the opposite
  corner, §5), `menuBar.placement` (`"screen" | "window"`; `ClassicyDesktop`
  gains a window-level menu-bar slot and `ClassicyWindow` renders the app's
  published menus there), `desktop.iconGridOrigin` (clean-up fills from the
  declared edge, §5 `ClassicyDesktopIconContext`).
- **Existence** of parts (which control boxes a modal/utility window has)
  stays behavioral and in Classicy; a package may hide a part with CSS but
  not add one.

The Control Strip right-dock (§6 item 5) is the template: arrangement as a
CSS `order` flip, JS reading one declared value.

### 9. Work plan — coverage by plan

| Audit section | Captured by | Part |
|---|---|---|
| §9 Phase 0 — Theme metrics | 0001-1t9 (impl, complete; merged to `main` as `4515f5096`) | — |
| §8 Target architecture → program design and shared contract | 0002-ldj (dsgn) | — |
| §9 Phase 1 — Vocabulary and cascade hygiene | 0003-7x7 | A |
| §9 Phase 2 — Package core and the Platinum package | 0005-1b3 | B |
| §9 Phase 3 — Asset registries and system art | 0007-1sl | C |
| §9 Phase 4 — Sound packs | 0008-j5l | D |
| §9 Phase 5 items 1–5 — Art extraction and title-bar unification | 0009-agy | E |
| §9 Phase 5 item 6 — Arrangement slots | 0010-743 | F |
| §9 Phase 6 items 1, 2, 4 — Colors, derivations and JS geometry | 0004-vqt | G |
| §9 Phase 6 item 3 — Pixel-literal purge | 0011-v9t | H |
| §9 Phase 7 — Package events and display participation | 0006-dy6 | I |
| §9 Phase 8 — Appearance control panel | 0012-pt9 | J |

Each of those plans links back here with `included`; this plan `blocks` on all of them. The dependency graph between the parts is in 0002-ldj (*Part plans and dependency graph*).

Phases are ordered by dependency, not by size. Each phase is shippable on its
own and leaves built-ins pixel-identical unless it says otherwise. Finding
references point back to §1–§6.

#### Phase 0 — Theme metrics (in flight, `worktree-theme-metrics`)

Spec: `docs/superpowers/specs/2026-10-27-theme-metrics-design.md`. Four
commits landed (defaults/normalizer, emission, persisted-state healing,
metric target table). Remaining: the SCSS rename (Task 6).

Amendments from D12 and D16:
- Delete `CLASSICY_DEPRECATED_METRIC_ALIASES` and the spread that emits them
  in `getThemeVars`; emit no `--hig-*` name at all. Rewrite the spec's
  "Deprecated aliases" paragraph to say so.
- Task 6 renames every SCSS consumer to the new names directly (no alias map
  to bridge through); `docs/AGENT-REFERENCE.md` lists only the new names.
- Keep the one visual unification (title bar 19 px, single source).

#### Phase 1 — Vocabulary and cascade hygiene

Prerequisite for every later phase because packages target these names.

1. Add the generated vocabulary (§8.6): JSON source, TS + SCSS outputs,
   `generate-vocabulary` wired before `generate-barrels`.
2. Apply shared state classes to every component that has a state today
   (~88 state-like names, §2.8). Convert the three `data-state` users and the
   one `[aria-*]` selector to the same convention. Fix BEM strays and the
   `.classicyDesktopMenuAppleMenu` typo.
3. `className` and `style` passthrough on the ~30 components that accept
   neither; fix the `ClassicyButton` spread-order bug (§5).
4. Reorder `ClassicyWindow.scss` so state rules follow the base rule; remove
   `!important` wherever order now wins (62 → target 0). Un-`!important` the
   `platinumWindowControlBox` mixin sizes. Repeat for the other 95 sites.
5. Add `data-classicy-control` / `data-classicy-role` part attributes (§8.6).
6. Fix the dead selectors and phantom tokens listed in §2.1 and the window
   sweep: empty `classicyWindowZoomed`, undefined `block`, `--color-theme-1`,
   `--box-border-size`, `--color-theme-hover`, `--color-theme-selection`.
   Correction (part A, task 6): the empty `classicyWindowZoomed` rule and the
   undefined `block` class were dead and are removed. `classicyWindowInvisible`
   is not live either: `ClassicyWindow` renders its root only while the window
   is open (`const windowContent = !ws.closed && (…)`) but adds the class only
   when `ws.closed`, so the class is never in the DOM. It is parked as a
   follow-up (drop the class and its rule, or drop the render guard); part A
   does not change window behavior.

#### Phase 2 — Package core and the Platinum package

1. `registerClassicyAppearancePackage` (D4) with a live registry
   (`useSyncExternalStore`), `Appearance.packageId` in the store (default
   `"platinum"`), `ClassicyDesktopChangeAppearancePackage` action, root
   attribute `data-classicy-appearance` (D15).
2. Package CSS injection on register (`<style id="classicy-appearance-<id>">`),
   `@layer classicy.base, classicy.package, classicy.user` declared once by
   the base injector (§8.2).
3. Create `src/Appearance/Platinum/` and move `appearance.scss`,
   `scrollbars.scss`, `assets.scss` into it. Split each mixin into a
   vocabulary name (Classicy) and a Platinum implementation (§8.1). Every
   component SCSS includes the vocabulary mixin; the package supplies the look.
   Three local bevel re-implementations (ControlStrip, Slider, ColorPicker,
   §2.3) move to the package.
4. Theme JSON gains `package` (id) and the Platinum JSON absorbs `themes.json`
   as `presets`. `ClassicyThemeSchema` validates against the active package's
   options schema. Theme files carry the package id; importing a theme for an
   uninstalled package is refused with a message.
5. `package.json` exports: `./scss/*` → vocabulary; `./appearance/platinum` →
   the package. Update `example/` and Storybook.

**Visual change allowed:** none. Verification: the 126-shot parity set from
Phase 0 (`.playwright-mcp/parity`, `compare.js`).

#### Phase 3 — Asset registries and system art

1. One registry implementation parameterized by kind (§8.3); deep merge; per-
   package namespaces; Platinum fallback.
2. Icons: re-point `registerClassicyIcons` at it; convert the 37 module-scope
   captures and 5 direct `@img`/relative imports to render-time reads (§4.1).
   Delete the 5 unconsumed entries.
3. System art (§4.6): Apple menu logo, crash-screen sad-mac, parade defaults,
   Trash full/empty, alias badge, help button, About art, QuickTime controls,
   boot art — all registered by Platinum, all read at render (D6).
4. Cursors by role (§4.2); SCSS `url()`s → CSS variables; add the default
   arrow.
5. Wallpapers and fonts as registries (§4.4, §4.5); Fonts tab and wallpaper
   picker read the registry.
6. Asset values accept imported URL, `http(s)` URL, or `data:` (D17). Bundling
   (§4.7): package assets are emitted as files, not inlined (`assetsInlineLimit`
   0 for `src/Appearance/**`), so a second package does not double the bundle.

#### Phase 4 — Sound packs

1. `registerClassicySoundPack` and the live registry; `ClassicySounds` becomes
   the Platinum pack registered by the package (§8.4).
2. `sound.name` → `sound.pack`; schema `refine` reads the registry.
3. `ClassicySoundManagerProvider` boots from the persisted theme's pack and
   switches on change, loading remote `src` on the fly (D7).
4. `bin/make_audio_sprites.sh` emits pack JSON with relative `src`; document
   the sprite-id contract and the Platinum fallback for missing ids.

#### Phase 5 — Extract art and inline styles (D8)

1. `assets.scss` base64 SVGs → SVG files in the Platinum package using
   `currentColor` / CSS variables, applied via `mask-image` so they recolor
   (§2.2). Slider/Tabs inline SVGs likewise.
2. PixelArt rows (Control Strip, PopUpSlider) → package data files; the
   `ClassicyPixelArt` renderer stays in Classicy (§3.4).
3. Unicode glyphs (menu check/dash, pop-up arrows, FileInput ✕, Kbd modifier
   table) → `::before` content or masked assets supplied by the package;
   `Kbd` and `ClassicyKeyboardShortcut` share one modifier table and render
   one span per modifier so CSS can respell them.
4. `ClassicyWindow.tsx:1833` cursor choice → cursor role; ColorPicker and
   captions-overlay literal colors → data variables (§3.3).
5. Unify `ClassicyWindow` and `ClassicyWindowFrame` title bars so a package
   skins one thing (§5: two parallel title-bar implementations).
6. **Arrangement slots** (§8.8, D21): convert the menu bar's float layout to
   flex + `order`; make Disclosure's label side a class; give Tabs a strip-
   position class; add the `layout` block to the package JSON; make the
   grow-box resize math read `window.growBoxCorner`; add the window-level
   menu-bar slot for `menuBar.placement: "window"`; make desktop clean-up
   read `desktop.iconGridOrigin`. Platinum declares today's values, so
   built-ins stay pixel-identical. Storybook gets one "mirrored" story per
   surface (close box right, grip bottom-left, menu bar in window) as the
   proof the slots work.

#### Phase 6 — Colors and numbers (D9, D10, D11)

1. `classicy-tint` / `classicy-alpha` helpers; replace every literal in §2.1
   and the Finder/WebViewer/ColorPicker stragglers.
2. Multiplier inventory → named derivations in `getThemeVars`; rewrite the
   ~100 `calc(var(--x) * N)` sites. Where two multipliers reach the same value
   by different routes, pick the structural one and document it beside the
   derivation.
3. Pixel-literal purge: 331 → 0. Pixel-matched surfaces (Control Strip,
   menu frame, Pager, Balloon Help) get package-JSON metrics; everything else
   reads theme variables or derivations.
4. JS geometry (§3.1): the four `menuBarHeight = 30` copies, the `+5`
   fudge, the zoom margin and the collapsed-height assumption read CSS
   variables (the `useClassicyBalloonHelp` pattern) or measured rects (§3.1).

#### Phase 7 — Package events and display participation (D3, D18)

1. `useClassicyAppearance(component, state)` in every component root (§8.5);
   `on(component, event, handler)` on the package.
2. Move Platinum-specific feedback that lives in component code into Platinum
   hooks (first candidates: window collapse/zoom feedback, menu-item flash,
   button press sound).
3. Storybook story per component showing the package hook surface.

#### Phase 8 — Appearance control panel

1. Packages tab: choose the active package among those registered.
2. Options form generated from the active package's JSON schema (sizes,
   colors, preferences) — the Colors/Fonts/Desktop tabs become views over
   the same schema; a Metrics tab arrives for free (metrics spec follow-on).
3. Presets list from the package; Save/Load Theme carry the package id.

#### Deferred (not in this plan)

- Reloading built-in presets on hydrate (persisted `availableThemes` freezes
  them; named in the metrics spec as a separate design).

### 10. Questions and answers (record)

Asked after the first round of guidance; answered by the owner the same day.

1. **Shared state class spelling** — bare class beside the root
   (`.classicyButton.pressed`). → D20.
2. **Does "modify any style" include arrangement?** — Yes. → D21, §8.8,
   Phase 5 item 6.
3. **Package location and export path** — `src/Appearance/<Package>/`,
   `classicy/appearance/<package>`. → D22.
4. **Event handler return shape** — both side effects and returned
   decorations. → D23, §8.5.
5. **Built-in themes as Platinum presets** — yes. → D24.

## Testing

Every phase is shippable on its own and leaves the built-in themes pixel-identical unless it says otherwise. The regression gate is the 126-shot Storybook screenshot parity set from Phase 0 (`.playwright-mcp/parity`, `compare.js`; Storybook `iframe.html?id=<id>&viewMode=story` at 1024×768 compared with ImageMagick), re-shot per part. Unit tests (vitest/jsdom) cover every exported function and reducer case, and style tests assert the emitted CSS variables; registries are tested through the `useSyncExternalStore` path with a render that re-registers. `pnpm lint`, `pnpm exec tsc --noEmit -p .` and `pnpm test` run before every commit, as CI does. The per-part test steps live in plans 0003–0011.

## Scope

**In scope:**

- `src/` excluding `Extensions/ScreenSaver/savers/**`
- The findings in §1–§6, the decisions in §7, the target architecture in §8 and the nine phases in §9, including arrangement (D21)
- Breaking the `classicy/scss/*` mixin names, `--hig-*`, `sound.name`, the theme-file layout and the shape of `registerClassicyIcons` (D16)

**Out of scope:**

- Comparing operating systems — the audit measures how cleanly the codebase separates structure, behavior and style, not what any desktop looks like
- Screen-saver art under `Extensions/ScreenSaver/savers/**` — intentionally per-saver
- Reloading built-in presets on hydrate — persisted `availableThemes` freezes them; named in the metrics spec as a separate design
- A second shipped package (Windows 3.11, IRIX) — the program's proof is one mirrored Storybook story per surface (part F) and the structure-only test (part B), not a second package
