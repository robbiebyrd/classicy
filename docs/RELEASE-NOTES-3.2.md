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
structural hooks, and packages may now declare colors of their own.
Platinum looks the same but for its slider, whose grays are now HIGOS8's
own (below): several looks that sat in the core's base layer moved into
Platinum's stylesheet, and one inline color left `ClassicyControlGroup`
(see "Behavior change", below).

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

System 7 arranges an alert's buttons as its HIG does (p.201): a button that
is neither the default nor Cancel, such as Don't Save, stands at the left,
under the message text, apart from Cancel and the default button at the
lower right. Hosts keep listing the buttons in any order; Platinum still
draws them in the list's order. A chosen menu item blinks three times,
System 7's default (`system7AppearanceHooks` sets the count), where
Platinum's flashes twice.

**Mixing versions of the two Appearance Packages is unsupported.** Install
`@classicy/classicy`, `@classicy/appearance-platinum` and
`@classicy/appearance-system7` at one version and bump them together. Both
packages register the screen savers from one module and share the Logo
saver's image registry; with an older Platinum beside System 7 the savers
can end up offered under `platinum` only, or the two Logo registries
diverge, so a logo registered through Platinum's
`registerClassicyScreenSaverLogo` may never show.

## New in the core

- **Package color families.** A package may declare colors beyond the 28
  core colors, which do not change: values in its themes under
  `color.families.<family>.<key>` (24-bit integers), labels in its
  `colorFamilies` metadata (`ClassicyAppearanceColorFamilies`, like
  `knobs`). Each is emitted as `--package-color-<family>-<key>`
  (`classicyColorFamilyVars`; the prefix is reserved, so no measurement can
  make one). A stylesheet reads one with a core color as fallback
  (`var(--package-color-…, var(--color-…))`), for a theme of another
  package, which emits none. A theme saved before a family existed is completed from its
  package's defaults (`withDefaultThemeColorFamilies`,
  `classicyThemeColorFamilyDefaults`); a theme of an unregistered package is
  kept whole. The Appearance Manager's Colors tab lists the active package's
  families after the core groups, and `ClassicyDesktopChangeColor` takes a
  second form, `{ family, key, color }`, for a declared color (it forks a
  built-in into its Custom theme, as color edits do). Persistence stores a
  theme without the family colors equal to its package's defaults, as it
  does knob values; theme files keep them (`ClassicyThemeSchema`
  `color.families`), and a 3.1 host loading such a file drops them.
  `AGENT-REFERENCE.md` §8, "Package color families".
- **Selected icon images.** `registerClassicySelectedIconImages(packageId,
  { [image]: selectedImage }, { variant? })` registers the image a selected
  icon draws in place of an icon image while the package's base look (or,
  with `variant`, that variant's) is active.
  `resolveClassicyIconImage` and `useClassicyIconImage` take a third
  argument, `selected`. A selected `ClassicyIcon` or desktop icon draws the
  registered image and marks its mask pair with the new `SelectedImage`
  part class (`classicyIconSelectedImage`,
  `classicyDesktopIconSelectedImage`) so the package can drop its own
  selected look; without an entry nothing changes. System 7 uses it for its
  color icons.
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
  packageId?, variant?)` takes an explicit variant (`""` for the base tree
  alone); `resolveClassicyThemeAsset(kind, path, theme)` resolves for a
  theme that need not be the active one, such as a preview, at its own
  variant. A variant the package never registers is warned about once per
  page and draws the base tree; a variant registration none of whose leaves
  is accepted registers nothing.
  Wallpapers, fonts and `registerClassicyIcons` take no variant.
- **Icons with their own 16 px image.** An `icons` leaf may be `{ src,
  small? }` as well as a URL. `resolveClassicyAsset` and `useClassicyAsset`
  still return a URL (`src`), so props and persisted records keep plain
  strings; `resolveClassicyIcon(path)` returns the leaf. Small surfaces call
  `resolveClassicyIconImage(src, px | true)` / `useClassicyIconImage`, which
  return the leaf's `small` when drawn at `CLASSICY_SMALL_ICON_SIZE` (16) or
  less. Menu items, list boxes, pop-up menus, the file browser's list view,
  the window title bar's proxy icon, menu bar extensions, Control Strip
  modules (the new `ClassicyBevelButton` prop `iconSmall`, for a surface
  whose stylesheet draws the icon at 16 px: it picks the image and never
  sizes the icon), `ClassicyIcon`
  and desktop icons at 16 px or less draw it. A leaf without `small` scales
  as before.
- **List-view icon sizes.** A theme may give the file browser's list view
  its own icon size per step, the optional measurements
  `fileBrowserList.smallIconSize`, `mediumIconSize` and `largeIconSize`
  (px; `LIST_VIEW_ICON_SIZE_VARS` names their variables, and
  `listViewIconSize` takes the size as a third argument), and its own row
  pitch, `fileBrowserList.rowPadding` (the space above and below a row's
  icon and label). A step with no size keeps `desktop.iconSize` scaled, and
  a theme with no `rowPadding` keeps the icon spacing all round. A list
  with no `listViewOptions` draws the medium step's size when the theme
  gives one, else 18 px as before. System 7 sets `mediumIconSize: 16`: its
  list view draws the 16 px small icons unscaled. Platinum sets both (see
  "Other changes you may notice").
- **Alert sounds come from the sound pack.** `ClassicySoundPack` gains
  `alerts` (`{ value, label }[]`, the alerts the Sound tab lists) and
  `defaultAlert`. A pack without `alerts` takes the default pack's
  (Platinum's), as it takes its other sprites; `alerts: []` means none.
  Platinum's pack declares its seven, Sosumi by default. The alert played is
  the stored choice when the active pack offers it, else the pack's default;
  the stored choice is never rewritten. New store-free readers:
  `classicyPackAlerts`, `classicyPackDefaultAlert`,
  `resolveClassicyAlertSound` and `playingClassicySoundPack` (the pack that
  plays for a theme's `sound.pack`: that pack, else the default). A pack
  that declares `alerts` need not define the contract's alert ids, only its
  own (`classicySoundPackMissingSprites`).
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
- **Packages declare scroll-on-release.** The package `layout` gains an
  optional `scrollBar` group (optional keys, so existing packages validate
  unchanged). `scrollBar.thumbDrag: "onRelease"` leaves a dragged thumb in
  place while a drag outline, the new part `scroll-drag-outline`
  (`.classicyScrollBarDragOutline`), follows the pointer, and scrolls on
  release. A pointer more than the theme's `--scroll-bar-snap-back` (else
  the bar's own thickness, "the width of the scroll box") past the bar's
  own pixels on any side (System 7: 24, measured on 7.5.5) snaps the
  outline back over the thumb, and a release there scrolls nothing. Escape or a lost pointer stream cancels the drag, and the keys
  and the wheel wait while it is held. `"live"`, the default, scrolls as
  the thumb moves, as before.
- **Long menus scroll by indicators.** A `ClassicyPopUpMenu` or
  `ClassicyComboBox` list too long for its space no longer shows the
  browser's scroll bar, and a `ClassicyMenu` list (a pull-down, a
  submenu, a contextual menu) too long for the screen below it no longer
  runs off it: it is capped there (`classicyMenuListScrolls`, and the new
  `ClassicyMenu` prop `open`). As Mac OS menus do (HIG7 pp.78 and 83), an
  indicator lies over the first or last row while items are hidden past
  that end, and the list scrolls a row at a time while the pointer rests
  on it; the wheel and the keyboard still scroll it, and an aligned pop-up
  never opens with its selection under an indicator. The indicators are
  the new parts `menu-scroll-up` and `menu-scroll-down`
  (`.classicyPopUpMenuScrollArrow`), drawn by the package: Platinum a black
  triangle on the menu's face, System 7 its pop-up triangle.
- **Packages keep the bars in the fits state.** `scrollBar.fitsBars:
  "shown"` keeps both bars of a document window and the vertical bar of a
  `ClassicyListBox` or Standard File's list drawn while the content fits,
  in the `fits` state (no thumb). `"hidden"`, the default, draws them only
  while the content overflows, as before. The new `ClassicyWindow` prop
  `fitsScrollBars` decides per window: it defaults to the declaration for a
  resizable, non-utility window, and the Movie Player, Picture Viewer and
  HyperCard card windows pass `false`. `useClassicyFitsScrollBars()` and
  `useClassicyFitsBarPolicy(keep?)` read the declaration for your own
  scrollers. `ClassicyTextEditor` gains `fitsScrollBars` (default `false`)
  for a document editor that fills its window; SimpleText's plain-text
  window passes the declaration.
- **Platinum's ghost indicator stays behind the pointer (HIGOS8 p.34).**
  The package `layout` gains an optional `slider` group: `slider.thumbDrag:
  "onRelease"`, which Platinum declares, keeps a `ClassicySlider`'s
  indicator where it was while its `ghost` follows the pointer, and changes
  the value once, on release (`onChangeFunc` then `onCommitFunc`); a lost
  pointer stream drops it. `"live"`, the default, moves both with the
  pointer, as before. A slider without `ghost` drags live under either, so
  the color picker's sliders and every other live control are unchanged.
  On a vertical slider the ghost now travels up its track (it drew at the
  top) and is lit like its indicator, and on either it moves by whole
  pixels, so its art is never resampled.
- **A press on a slider's thumb never moves it.** A mouse or pen press on
  `ClassicySlider` is now the slider's own: the browser's range drag is
  stopped (the press's `mousedown` default is prevented; its `pointerdown`,
  `mousedown` and `mouseup` still reach the page, so open menus close) and
  the value follows the pointer's travel from where it pressed. In Firefox
  a press anywhere on the thumb used to move it under the pointer, so
  pressing a vertical slider's thumb could change the value by a step. A
  press on the track still puts the thumb under the pointer. The input
  captures the pointer; a drag that loses it, or sees a move with the
  button up, ends where it is. During a mouse or pen drag `onChangeFunc`
  receives a synthetic `input` event (the value is set through the
  input's prototype setter), and the `change` event on a release that moved
  the value is dispatched by hand. Touch, the keyboard and the wheel stay
  the browser's.
- **Packages may center windows on whole pixels.** The package `layout`
  gains an optional `window.centering`: `"exact"`, the default, centers a
  window opened at a symbolic `"center"` (an alert, a dialog) at half the
  free space, on a half pixel when that space is odd, as before;
  `"wholePixel"` rounds it, on first paint and on every re-center.
  `resolvePosition` takes it as an optional fourth argument. System 7 sets
  it; Platinum does not, so its windows land where they did.
- **Optional core knob `menuBar.bandHeight`.** `--menu-bar-height` is the
  knob when a theme sets it to zero or more (a negative band is ignored),
  else `window.controlSize × 2.5` as before; it has no floor value, so
  Platinum's band still follows its control size.
- **Cursor hotspots.** `registerClassicyCursors` accepts `{ src, hotspot:
  [x, y] }` (whole numbers, 0–127), published as
  `--classicy-cursor-<role>-hotspot` and returned by
  `resolveClassicyCursorHotspot(role)`. The hotspot belongs to the image:
  never hotspot an image another package shares. The split view, the window
  grow box and the PDF viewer's pan tool read it, falling back to `8 8`.
- **A fixed modal that is not an alert: `ClassicyWindow`'s `movable`.**
  `movable={false}` on a `modal` window makes a modal dialog box the user
  cannot move (HIGOS8 p.60), such as Standard File, Print or Page Setup,
  without the alert semantics `type="error"` brings: it does not beep when it
  opens, draws the ordinary modal scrim and stacks in the modal-front band.
  It defaults to `true` (a movable modal dialog box, as before), does nothing
  on a non-modal window (a development build logs a warning, once per
  window), and an error modal stays fixed, beeping and red whatever it says.
  Platinum and System 7 draw it with no title bar (HIGOS8 figure 3-3), so
  pass `closable={false}` and `collapsable={false}`; Platinum's fixed alert
  keeps its red title bar.
- **Self-padding dialogs carry a class.** A modal's inner area
  (`.classicyWindowContentsModalInner`) carries
  `classicyWindowContentsSelfPadded` while its content pads its own root:
  `ClassicyAlert`, `ClassicyInputDialog`, `ClassicyKeyboardEquivalentDialog`
  and `ClassicyForm layout="dialog"`. Content says so through the new
  `useClassicyWindowSelfPadding(enabled?, rootRef?)` hook, or the
  `<ClassicyWindowSelfPadding rootRef>` wrapper for a component that renders
  the window itself; a host's own self-padding dialog content may use
  either. With `rootRef` the claim holds only while that element is the
  window's content root (a direct child of its inner area), so a nested or
  portaled claimant leaves the inset alone; without it a claim covers the
  window's whole content. System 7 keys its dialog inset on the class
  instead of `:has()`, so those dialogs get one inset in Firefox 113–120
  too. Platinum does not read it.
- **Small structural hooks**: the root class `classicyWindowModalFixed` on a
  fixed modal (a modal `ClassicyWindow` of `type="error"` or with
  `movable={false}`, which cannot be dragged); the `open` state on a pop-up
  menu's label holder and indicator while its menu is open; the system-art
  key `helpMenuTitle`, which, when registered, draws the menu bar's Help
  title as an image; and `ClassicyMenuItem.imageAlt`, the alt text of an
  item drawn as its image alone (it keeps "Help" as that title's accessible
  name, and the Apple menu's art is now named "Apple"). An item with no
  `title` carries its `imageAlt` as the `title` of its analytics events, so
  the Apple menu's and the art Help menu's `hover` and `selected` events
  name them, where their `title` was undefined.

- **The Application menu's Hide commands** (HIG7 p.127). The App Switcher
  lists Hide <app>, Hide Others and Show All, each dimmed when it would do
  nothing, a divider, then each open application by its small icon, the
  front one checked beside its icon. New actions `ClassicyAppHide` and
  `ClassicyAppHideOthers` (`{ app: { id } }`) and `ClassicyAppShowAll` set
  an app's new `hidden` flag: its `ClassicyApp` container is `hidden` (a
  modal window and its scrim, portaled outside it, hide too), its windows
  stay mounted, and the next shown app takes the menu bar; an app that takes
  focus in any way (a window opening or focused included) is shown again.
  The flag is session state: it is not persisted. A menu item that is both `checked` and
  has an `icon`/`image` now draws both, the mark first (before, the mark
  replaced the icon).
- **Standard File parts.** `ClassicyFileOpenDialog` and
  `ClassicyFileSaveDialog` always render System 7.5's extra parts: the
  volume's small icon and name (`classicyFileOpenDialogVolume`), Eject
  (always dimmed), Desktop (goes to the volume with id `"desktop"`, as
  `desktopVolume(fs)` builds) and a line (`<hr
  class="classicyFileOpenDialogDivider">`). The base sheet hides all four,
  so Platinum's dialog is unchanged; a package shows and places them. A
  package's new optional `layout.fileDialog.frame: "fixed"` draws the box as
  a fixed modal dialog, and the optional theme knobs `fileDialog.width` and
  `height` size it (else 440 x 400). A save box's body also carries
  `classicyFileDialogSaveBody`.
- **The small UI text's family.** A theme may name it in the optional
  `typography.uiSmall` (theme files carry it), emitted as `--ui-font-small`
  only when set. Small control labels and the slider's readout and tick
  labels read `var(--ui-font-small, var(--ui-font))`; a theme without it
  keeps the UI family.
- **A table's sorted column.** `ClassicyTable` marks the sorted column's
  body cells `classicyTableCellSorted` and publishes the sorted header's
  place on its root as `--classicy-table-sorted-start` and
  `--classicy-table-sorted-width` (`0px` with nothing sorted). The root now
  always carries those two inline custom properties.
- **No empty font element.** A package whose every font face an earlier
  package shares and writes (System 7 registered after Platinum) no longer
  leaves an empty `<style id="classicy-fonts-<id>">`; one written before is
  removed when its last face is taken over.

## Base looks moved into Platinum

Base component SCSS is structure only, so these looks moved from the core's
base layer into Platinum's stylesheet: radio buttons, checkboxes, little
arrows, text inputs, list boxes and trees, the spinner, the date and time
pickers, the combo box's indicator, the control group's frames, and the
pop-up menu's (the dimmed box's gradient, the button's focus ring, the
indicator's divider, rounded corners and bevel, and the open menu's frame,
face, items, highlight and group titles), and the slider's (the channel's
border, shading and bevel, the dimmed filter, the ghost's translucency, and
the ticks' and their labels' ink). Platinum draws them exactly as before
(the slider's then redrawn, below).
The Platinum channel reads the new `--classicy-slider-track` first, an image
that replaces its shading: the color picker sets it on its channel sliders,
and a host may set it on a slider or an ancestor. A host that ships its own Appearance Package now draws them itself;
until it does, they show their structure only, as every other component
already did under a package with no look.

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

- **One Logo saver warning, whichever package logs it.** With Platinum and
  System 7 both loaded, a stock Logo saver logo whose icon no package
  registers logs its warning once, not once per package's copy of the
  registry: the copies share the record of what they warned about.
- **Platinum's slider draws HIGOS8's grays.** Platinum declares the HIG's
  16-step gray ramp as a package color family, `grayRamp` (the Colors tab's
  new "Gray Ramp" group, 14 swatches). The slider's channel border is
  #222222 (was #202020, `--color-system-07`), its etch and fill the ramp's
  #AAAAAA (unchanged), the tick mark's shadow #888888 (was #808080), and the
  ghost indicator is Figure 2-17's: opaque, in the ramp's grays (an #888888
  outline, white, #DDDDDD and #BBBBBB faces; over the channel's border rows
  #444444 to #DDDDDD, the channel showing through), drawn under the
  indicator as Figure 2-17 draws it (with a ghost, the slider marks its
  track layer `classicySliderHasGhost`, and Platinum draws the channel on
  `.classicySliderTrackLayer::before` and the ghost at `z-index: -1`
  there), where it was the indicator in system grays
  at 75% opacity over everything. A host that styled the ghost's opacity
  sets it on `.classicySliderGhost` again. Under a theme of another package
  the slider draws its pre-3.2 grays.
- **Platinum's list view matches HIGOS8.** The Finder list view (and any
  `ClassicyFileBrowser` in `display="list"`) draws its default icon step at
  16 px, the small icon's own size, in 18 px rows a 1 px line apart, as
  HIGOS8 Figure 2-24 (p.38) and Figure 2-43 (p.51) show: a 19 px row pitch.
  It was an 18 px icon (0.375 × the 48 px desktop icon) on a 25 px pitch.
  The Small and Large steps keep their icon sizes (12 and 32 px); Small
  keeps its 19 px pitch, and Large's goes from 39 to 35. Both are theme
  data, `fileBrowserList.mediumIconSize` and `fileBrowserList.rowPadding`:
  a theme file that sets them to 18 and 3 draws the old list. A host that
  sized list rows from the old pitch should measure again.
- **Scroll bars are drawn in every browser.** Firefox now shows Platinum's
  full bars (arrows, track and thumb) instead of the thin `scrollbar-color`
  fallback. The scrolling element of a window's contents, a list box or a
  table is now an inner `.classicyScrollAreaViewport` (list box and table
  roots also carry `classicyScrollArea`): a host stylesheet that styled their
  native scroll bars or set their `overflow` targets the viewport, or the
  parts above.
- **`ClassicyScrollArea` internals.** One layout measurement per scroll
  frame (the render a scroll causes no longer measures again); the content
  observer ignores attributes that cannot move the content (`aria-*`,
  `tabindex`, `data-*`) and leaves text changes to the resize observer where
  the browser has one; a `renderViewport` scroller that remounts keeps being
  watched; a held track that the pointer leaves pages toward where it comes
  back. `viewportRef` is typed `Ref<HTMLElement>`, so a `<textarea>` viewport's
  ref type-checks (a widening: existing `HTMLDivElement` refs still do).
- **The default state seeds no `alertSound`.** A first session plays the
  active pack's default alert. `Appearance.alertSound` was already optional;
  read the alert in effect with `resolveClassicyAlertSound(pack, stored)`.
- **`useSoundTab` takes an optional `alerts`.** Called as in 3.1, the
  Appearance Manager's Sound tab hook lists the alerts of the sound pack that
  plays for the active theme (`classicyPackAlerts(pack)`), so no change is
  needed. Pass `alerts` to list others. Its `alertSound` is the alert in
  effect.
- **Deprecated**: `CLASSICY_ALERT_SOUNDS` and `DEFAULT_ALERT_SOUND` are
  Platinum's values, kept for existing imports; read the active pack with
  `classicyPackAlerts` and `classicyPackDefaultAlert` instead.
- **The Control Strip's Sound and Screen Saver modules** read their glyphs
  from the icon registry when they render, so a package's icons show there.
- **A core icon URL draws as the active package's icon.**
  `resolveClassicyIconImage` / `useClassicyIconImage`, which every icon
  surface calls, now map a URL the default package registers for an icon key
  (the core's, `ClassicyIcons.*`) to the image the active theme draws for
  that key, variant included, before picking the small image. So the derived
  Applications, Extensions and Control Strip Modules folders, the module
  files, the seeded folders and Finder's drive icon on the desktop show
  System 7's icons under System 7 (its 1-bit art under "System 7", its color
  art under "System 7 Color"), and follow a switch, with no rebuild and no
  change to what is stored. Under Platinum every icon draws as before.
  Another package's URL draws unchanged; a host that wants an image drawn as
  is under every package passes its own URL rather than the core's. New
  folders, the derived folders' own icons, a module file's default icon, the
  Desktop Folder's desktop icons and the Open and Save dialogs' volumes now
  hold the core's URL rather than the active package's, so the stored tree
  is the same under every package and an open dialog never keeps another
  package's art. `iconImageByType(type, packageId?)` takes an optional
  package (default: the active one).
- **More icons draw through `ClassicyIconImage`.** `ClassicyTree`'s
  `leftIcon` and `rightIcon` (the Open and Save lists), `ClassicyTabs`' tab
  icons, `ClassicyComboBox`'s option icons, `ClassicyInputDialog`'s icon,
  `ClassicyAboutWindow`'s app icon, `ClassicyAssistant`'s label and accessory
  icons and the startup screen's extension parade drew a plain `<img>`; they
  now follow the active package as above and draw an icon's small image
  where they are small (tree rows, standard and small tabs, combo box
  options, the assistant's label icon and `sm` accessory). Under Platinum,
  whose icons have no small images, they draw as before.
- **Vertical sliders lay out.** A vertical `ClassicySlider` no longer takes
  its height from the viewport: in a container with no set height its track
  is `--slider-vertical-min-height` long (`controlSize × 8`, 96 px under
  Platinum), and given a height it grows to fill it. Its value readout (and
  its label, when it has one) now fits inside that height, where the readout
  used to spill below the container. With `tickInterval` set its ticks run
  beside the track, not under it, and `tickLabels` sit beside their ticks.
  A vertical slider stays centered in its container, and its track is
  nudged onto the pixel grid (by under half a pixel, as a submenu is) where
  centering leaves it on a fraction of one.
- **Visual fix: Platinum's slider now matches the HIGOS8 figures: Figs.
  2-18 and 2-19 at rest, Fig. 2-17 pressed.** The channel is the at-rest
  figures': an etched #AAAAAA row, a dark border (`--color-system-07`),
  three flat #AAAAAA rows, a dark border and a white row, with one-pixel
  pixel-art ends, 7 px thick in every state (it was a 6 px gray cylinder).
  The indicator is their 15 x 16 pixel-art indicator in the theme's
  lavender ramp (`--color-theme-01` to `-07`), lit from the top left, its
  flat side 3 px past the channel and its point 6 px past it whichever way
  it points (it was a 21 x 21 silver pentagon); pressed, the same art with
  every ink a step down the ramp, Fig. 2-17's tone (that figure is 2-18's
  slider resampled a row and a column larger, so only its tone is taken).
  The nondirectional knob is the same indicator without its point,
  centered on the channel, the highlighted one is drawn pressed, and the
  ghost indicator is the indicator in grays. Tick marks are Figure 2-18's
  3 x 8 etched marks, the row after the indicator's point. A vertical
  slider's channel is the same art turned, as the 1996 draft's Figure 13
  draws it (the etch on its left), and its left-pointing indicator is
  Figure 13's, lit from the top left like the down one rather than turned
  with it; the up- and right-pointing indicators, which no figure draws,
  follow the same lighting. A horizontal slider's input is now 19 px tall
  (it was 21), and a vertical one 19 px wide. Firefox's thumb corner
  radius (its UA sheet's 0.5em, which clipped the art round) is reset in
  the base sheet, for every package, and the base sheet now paints the
  thumb above the tick rail (it used to paint under a tick where it
  overhung the input). Every Platinum slider looks
  different, including the Appearance Manager's Sound tab and the color
  picker's channel sliders, which keep their own fills
  (`--classicy-slider-track`). The new knobs are the `slider` family
  (AGENT-REFERENCE §8, "Package knob families"), and every placement is
  derived from them. The pre-3.2 thumb's art keys (`sliderThumb`,
  `sliderThumbRect`, `sliderStrikes`) stay registered, and the
  `platinum-slider-thumb` mixin stays in Platinum's `_Slider.scss` for
  hosts that `@use` it; Platinum no longer draws with them.
- **The Desktop tab offers None.** The Appearance Manager's Patterns pop-up
  lists None first: it removes the desktop picture
  (`ClassicyDesktopChangeBackground` with `""`), so the desktop shows its
  solid color, which the Colors tab sets. A theme with no picture (most of
  Platinum's color themes) now reads None there, where it read Default, and
  the preview shows the desktop color in place of the default picture.
  Platinum frames the preview, picture or color, in its recessed content
  frame. `getThemeVars` emits `--desktop-background-image: none` for a
  theme with no picture, or one that resolves to none, where it emitted
  `url("")`, which a browser resolves to the page's own URL.
- **Aligned pop-up menus stay on whole pixels.** An open pop-up slid back
  above the screen's bottom margin is placed on a whole pixel even when its
  measured height is fractional, its top rounded down so the far edge stays
  inside the margin.
- **Platinum's sound sprites are re-encoded.** `platinum.ogg`, `platinum.m4a`
  and `platinum.mp3` are now the bit-exact encode of the same sources by
  mise's ffmpeg 8.0.1 as built on Linux against the distro's libvorbis and
  libmp3lame, where a forced rebuild (`CLASSICY_AUDIO_FORCE=1 pnpm
  build:audio`) reproduces them byte for byte. A build linked against other
  encoder libraries (Homebrew's on macOS) may encode the ogg and mp3
  differently, and the stamp keeps an unforced build from rewriting them. Their sprite map (`platinum.json`) and
  `platinum.ac3` are unchanged; every sound starts and lasts as before, and
  sounds the same (the m4a decodes to the same samples, the ogg and mp3 differ
  by encoder rounding, about -79 and -55 dBFS RMS). A host bundler that
  names assets by content hash gives the three files new URLs, so a browser
  fetches them once.
- **Fonts are written once when both packages load.** `ClassicyFontFace`
  takes an optional `file`; faces of two packages with the same family,
  weight, style and `file` share one `@font-face` rule, written in the
  element of the package that registered it first. Platinum and System 7
  name theirs, so a host loading both writes System 7's five faces (copies
  of Platinum's) once: `<style id="classicy-fonts-system7">` is empty when
  Platinum registered first, and Platinum's element lacks those five when
  System 7 did. A strict-CSP host linking Platinum's fonts stylesheet may
  leave System 7's out.
- **Optional core knob `uiText.smallFontSize`.** `--ui-font-size-small` is
  the knob when a theme sets it to a positive number, else
  `typography.uiSize × 0.8` as before (Platinum sets none). System 7's
  themes set 9, so its small text is 9 px, not 9.6 px (the size only: the
  family is unchanged).
- **Release workflow**: `push.yml` syncs System 7's version, checks its
  trusted publisher and publishes it with the other two.

- **Platinum's list view per HIGOS8 Figs. 2-24 and 2-43.** The sorted
  column of a list (the Finder's list view and every `ClassicyTable`) is a
  step darker, `--color-system-02`, in its cells and below the last row, a
  white line still between rows; a selected row of a generic table keeps its
  highlight across it. Folders in a list draw Platinum's own 16 px small
  folder, cut pixel for pixel from Fig. 2-24, where the 32 px folder was
  scaled. Host stylesheets that set a table container's `background` see
  the stripe through `background-image`.
- **System 7, from new 7.5.5 captures.** Standard File is the fixed modal
  box 7.5.5 draws (`*-755-dialog-standardfile-layout.png`): the folder
  pop-up with no label over the list, the disk's icon and name at the top
  right, and the button column Eject, Desktop, a dotted line, Cancel and
  Open, placed by the new `fileDialog` knobs (QuickTime's Preview area is not
  drawn). The Application menu's title is the front application's small icon
  alone, 34 px wide and 6 px from the screen's edge (`menuBar.endInset` 6,
  `switcherTitleStart`/`End` 9), its menu right-aligned under it. The Finder
  list view's rows are white with no line between them, 18 px apart
  (`fileBrowserList.rowPadding` 1). Small control labels and the slider's
  ticks and readout draw in Geneva (`typography.uiSmall`). The Control Strip
  docked right is a pixel wider, as 7.5.5 draws it
  (`*-755-controlstrip-right.png`).

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
4. If you call `useSoundTab` directly, nothing changes; it lists the playing
   pack's alerts unless you pass `alerts`.
5. If you re-register a Platinum saver under your package, add your id to
   its existing `packages` rather than replacing them.
