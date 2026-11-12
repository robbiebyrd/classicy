# Release notes: 3.2

A second Appearance Package, System 7, ships beside Platinum, with the core
capabilities it needed. These notes list every change a host can see,
measured from 3.1.x, with the step each change needs. The API is described in
[`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) (§5 "Asset registries", §8
"Theming" and its "System 7" section, §10 "Sound").

## Summary

`@classicy/appearance-system7` draws System 7.5 in black and white and in
color, with System 7.5's own icons, art, cursors, desktop pattern and alert
sounds, and the same twelve screen savers as Platinum. To draw it, the core
gained per-theme asset variants, 16 px icon images, alert sounds chosen by
the sound pack, a dither vocabulary, its own scroll bars and a few small
structural hooks. Platinum looks the same: several looks that sat in the
core's base layer moved into Platinum's stylesheet, and one inline color
left `ClassicyControlGroup` (see "Behavior change", below).

## New: the System 7 Appearance Package

Install it with the core, at the same version, alone or beside Platinum:

```sh
pnpm add @classicy/classicy @classicy/appearance-system7
# or, with both looks:
pnpm add @classicy/classicy @classicy/appearance-platinum @classicy/appearance-system7
```

Import it once, at your app's entry:

```tsx
import '@classicy/appearance-system7'
```

It registers two themes, **System 7** (id `system7`, black and white, the
package's defaults) and **System 7 Color** (id `system7-color`, the Standard
window colors from System 7.5's `wctb` and `cctb` tables), its fonts (the
Chicago, Geneva and Monaco faces Platinum ships), its icons, art, cursors and
wallpapers, its sound pack (`system7`) and the screen savers. It exports
`SYSTEM7_APPEARANCE_PACKAGE_ID`, `system7Json` (typed `System7Json`),
`system7SoundPack` and `system7AppearanceHooks`. Its strict-CSP stylesheets
are `@classicy/appearance-system7/classicy-system7.css` and
`@classicy/appearance-system7/classicy-system7.fonts.css`, linked after the
core's like Platinum's. A Vite host adds it to `optimizeDeps.exclude`. See
[its README](../packages/appearance/system7/README.md).

**Mixing versions of the two Appearance Packages is unsupported.** Install
`@classicy/classicy`, `@classicy/appearance-platinum` and
`@classicy/appearance-system7` at one version and bump them together. Both
packages register the screen savers from one module and share the Logo
saver's image registry; with an older Platinum beside System 7 the savers
can end up offered under `platinum` only, or the two Logo registries
diverge, so a logo registered through Platinum's
`registerClassicyScreenSaverLogo` may never show.

## New in the core

- **Per-theme asset variants.** `registerClassicyAssets(kind, packageId,
  tree, { variant })`, and `registerClassicyCursors` and
  `registerClassicySystemArt` with the same last argument
  (`ClassicyAssetRegistrationOptions`), register an extra tree for a named
  variant of a package (`CLASSICY_ASSET_VARIANT_NAME`: a letter or digit,
  then letters, digits, `_` or `-`, at most 64). A theme selects one with
  `assetVariant` (`ClassicyTheme.assetVariant`, kept by the schema, theme
  files, persistence and custom-theme forks). A key the variant lacks comes
  from the package's base tree, then the default package's. The variant
  applies only while the active theme belongs to the drawn package, and
  readers re-render on a theme switch. `resolveClassicyAsset(kind, path,
  packageId?, variant?)` takes an explicit variant. A variant the package
  never registers is warned about once per page and draws the base tree.
  Wallpapers, fonts and `registerClassicyIcons` take no variant.
- **Icons with their own 16 px image.** An `icons` leaf may be `{ src,
  small? }` as well as a URL. `resolveClassicyAsset` and `useClassicyAsset`
  still return a URL (`src`), so props and persisted records keep plain
  strings; `resolveClassicyIcon(path)` returns the leaf. Small surfaces call
  `resolveClassicyIconImage(src, px | true)` / `useClassicyIconImage`, which
  return the leaf's `small` when drawn at `CLASSICY_SMALL_ICON_SIZE` (16) or
  less. Menu items, list boxes, pop-up menus, the file browser's list view,
  the window title bar's proxy icon, menu bar extensions, Control Strip
  modules (the new `ClassicyBevelButton` prop `iconSmall`), `ClassicyIcon`
  and desktop icons at 16 px or less draw it. A leaf without `small` scales
  as before.
- **Alert sounds come from the sound pack.** `ClassicySoundPack` gains
  `alerts` (`{ value, label }[]`, the alerts the Sound tab lists) and
  `defaultAlert`. A pack without `alerts` takes the default pack's
  (Platinum's), as it takes its other sprites; `alerts: []` means none.
  Platinum's pack declares its seven, Sosumi by default. The alert played is
  the stored choice when the active pack offers it, else the pack's default;
  the stored choice is never rewritten. New store-free readers:
  `classicyPackAlerts`, `classicyPackDefaultAlert` and
  `resolveClassicyAlertSound`. A pack that declares `alerts` need not define
  the contract's `ClassicyAlert*` sprites, only its own
  (`classicySoundPackMissingSprites`).
- **The dither vocabulary**, `@classicy/classicy/scss/dither`:
  `classicy-dither-mask`, `classicy-dither-text($on)` and
  `classicy-dither-line($on)` draw dimmed text, dimmed controls and dotted
  rules through a checker. The theme switches them with the new knob
  `dither.tileSize` (`--dither-tile-size`; 0, plain ink, in the core floor
  and Platinum), and the tile is the new system-art key `ditherChecker`
  (`--classicy-art-dither-checker`), which a package may also declare on its
  package root. Every theme now emits `--dither-tile-size`.
- **`ClassicyScrollArea`: Classicy draws its own scroll bars.** Content
  scrolls natively in a viewport whose own bars are hidden, and the bars are
  DOM parts an Appearance Package draws: `data-classicy-part` `scrollbar`,
  `scroll-arrow-start`, `scroll-track`, `scroll-arrow-end`, `scroll-thumb`
  and `scroll-corner`, with the new state `fits` on a bar with nothing to
  scroll, `pressed` on a held arrow or track, `dragging` on a dragged thumb,
  and `inactive` while the window is inactive (read from the new
  `ClassicyWindowActiveContext`, or the `inactive` prop). Arrows and the
  track repeat while held, pausing while the pointer is off the part. The
  thumb's length honors the package's `min-height`/`max-height` (vertical) or
  `min-width`/`max-width` (horizontal), px lengths only, so equal limits fix
  it. Windows, list boxes, tables (new prop `ClassicyTable.scrollable`),
  text editors, split-view panes, the Assistant, file dialogs, the color
  picker and other scrolling surfaces use it. The thumb and bar math is
  exported (`computeClassicyScrollThumb`, `computeClassicyScrollBars`).
- **Optional core knob `menuBar.bandHeight`.** `--menu-bar-height` is the
  knob when a theme sets it, else `window.controlSize × 2.5` as before; it
  has no floor value, so Platinum's band still follows its control size.
- **Cursor hotspots.** `registerClassicyCursors` accepts `{ src, hotspot:
  [x, y] }` (whole numbers, 0–127), published as
  `--classicy-cursor-<role>-hotspot` and returned by
  `resolveClassicyCursorHotspot(role)`. The hotspot belongs to the image:
  never hotspot an image another package shares. The split view, the window
  grow box and the PDF viewer's pan tool read it, falling back to `8 8`.
- **Small structural hooks**: the root class `classicyWindowModalFixed` on a
  fixed modal (a modal `ClassicyWindow` of `type="error"`, which cannot be
  dragged); the `open` state on a pop-up menu's label holder and indicator
  while its menu is open; the system-art key `helpMenuTitle`, which, when
  registered, draws the menu bar's Help title as an image; and
  `ClassicyMenuItem.imageAlt`, the alt text of an item drawn as its image
  alone (it keeps "Help" as that title's accessible name).

## Base looks moved into Platinum

Base component SCSS is structure only, so these looks moved from the core's
base layer into Platinum's stylesheet: radio buttons, checkboxes, little
arrows, text inputs, list boxes and trees, the spinner, the date and time
pickers, the combo box's indicator and the control group's frames. Platinum
draws them exactly as before. A host that ships its own Appearance Package
now draws them itself; until it does, they show their structure only, as
every other component already did under a package with no look.

Platinum's `_scrollbars.scss` (published as
`@classicy/appearance-platinum/scss/scrollbars`) gains the mixins that draw
`ClassicyScrollArea`'s parts. Its native-bar rules stay, for a host's own
scrollers.

## Behavior change: `ClassicyControlGroup`'s title background

`ClassicyControlGroup` no longer sets an inline `background-color:
var(--color-system-03)` behind its legend. Without the `backgroundColor`
prop, the active Appearance Package paints the face there: Platinum does, so
Platinum hosts see no change. A host with its own package, or one that
relied on the inline color, adds a rule (or passes `backgroundColor`):

```scss
.classicyControlGroupLegend {
  background-color: var(--color-system-03);
}
```

## The screen savers under both packages

Platinum's twelve savers are now offered under `platinum` and `system7`
(`packages: ["platinum", "system7"]`), and both packages name
`defaultScreenSaver: "bouncing-ball"`. System 7 bundles Platinum's saver
registration module and its stylesheet index, so a host loading System 7
alone gets the savers, and it exports none of them: import saver components
and the Logo registry from `@classicy/appearance-platinum`. A host loading
both registers each id twice with equal definitions, which is harmless. The
Logo registry's state now lives on `globalThis`, so both bundles share one
list.

A host that re-registers a saver to offer it under its own package keeps
the ids the saver already names:

```diff
 const fish = getClassicyScreenSaver('fish')
-if (fish) registerClassicyScreenSaver({ ...fish, packages: ['platinum', 'my-package'] })
+if (fish) registerClassicyScreenSaver({ ...fish, packages: [...(fish.packages ?? []), 'my-package'] })
```

## Other changes you may notice

- **Scroll bars are drawn in every browser.** Firefox now shows Platinum's
  full bars (arrows, track and thumb) instead of the thin `scrollbar-color`
  fallback. The scrolling element of a window's contents, a list box or a
  table is now an inner `.classicyScrollAreaViewport` (list box and table
  roots also carry `classicyScrollArea`): a host stylesheet that styled their
  native scroll bars or set their `overflow` targets the viewport, or the
  parts above.
- **The default state seeds no `alertSound`.** A first session plays the
  active pack's default alert. `Appearance.alertSound` was already optional;
  read the alert in effect with `resolveClassicyAlertSound(pack, stored)`.
- **`useSoundTab` takes `alerts`.** The Appearance Manager's Sound tab hook
  now requires `alerts` (the pop-up's list, `classicyPackAlerts(pack)`), and
  its `alertSound` is the alert in effect. A host that builds its own panel
  from `useSoundTab` passes it.
- **Deprecated**: `CLASSICY_ALERT_SOUNDS` and `DEFAULT_ALERT_SOUND` are
  Platinum's values, kept for existing imports; read the active pack with
  `classicyPackAlerts` and `classicyPackDefaultAlert` instead.
- **The Control Strip's Sound and Screen Saver modules** read their glyphs
  from the icon registry when they render, so a package's icons show there.
- **Release workflow**: `push.yml` syncs System 7's version, checks its
  trusted publisher and publishes it with the other two.

## Upgrade

1. Bump `@classicy/classicy` and `@classicy/appearance-platinum` together to
   3.2.0. To use System 7, add `@classicy/appearance-system7` at 3.2.0 and
   import it at your entry; keep every Classicy package at one version.
2. With a Vite dev server, add `@classicy/appearance-system7` to
   `optimizeDeps.exclude` when you load it. Under a strict CSP, link its two
   stylesheets after the core's.
3. If you ship your own Appearance Package, draw the looks that moved into
   Platinum (above), the control group's legend face, and, if you want them
   styled, the scroll-bar parts.
4. If you call `useSoundTab` directly, pass `alerts`.
5. If you re-register a Platinum saver under your package, add your id to
   its existing `packages` rather than replacing them.
