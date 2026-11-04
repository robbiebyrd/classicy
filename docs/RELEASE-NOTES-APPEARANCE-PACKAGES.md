# Release notes: Appearance Packages

These notes cover the Appearance Packages release (pull request 333, which
merges `feat/AppearancePackages` into `main`). They list every change a host
can see, measured from the 2.1.x line (`main`), with the step each breaking
change needs. Longer material is linked from
[`AGENT-REFERENCE.md`](AGENT-REFERENCE.md) rather than repeated here.

## Summary

Classicy's look is now an **Appearance Package**. Classicy's own stylesheet
holds structure only (layout, sizing, state rules). The Platinum look, meaning
every bevel, border, gradient, piece of art, feedback sound, cursor and font,
is the Platinum package, which registers itself when you import `classicy`.
A second package can replace all of it at runtime:

- its stylesheet, scoped under the desktop root;
- its default theme and presets;
- its assets (icons, cursors, wallpapers, fonts, system art) and sound packs;
- its feedback hooks;
- where parts go (the grow box's corner, the menu bar's placement, the icon
  grid's origin);
- the name, icon and description each app is shown with.

Inside `ClassicyDesktop`, Platinum renders pixel-identical to 2.1.x, with
three named exceptions: error title bars, `ClassicyWindowFrame`'s title bar
and the Appearance Manager. Most migration work falls on hosts that:

- render components outside a desktop;
- write CSS against Classicy's class names, or keep global resets;
- compile Platinum's SCSS;
- override icons or sounds;
- run Vite's dev server.

Start with [Install and build](#install-and-build).

## Breaking changes

### Install and build

- **Vite's dev server must not pre-bundle classicy.** The fonts and art are
  now files in `dist/assets/`, referenced as
  `new URL("assets/…", import.meta.url)`. Vite's dependency pre-bundle
  (`node_modules/.vite/deps/`) breaks those URLs, so fonts and art come back
  as the SPA fallback page. *Who:* hosts that run Vite's dev server.
  *Migrate:*

  ```ts
  // vite.config.ts
  export default defineConfig({
    optimizeDeps: { exclude: ["classicy"] },
  })
  ```

  Any CommonJS dependency classicy pulls in may then need to go in
  `optimizeDeps.include`. Bundlers that handle
  `new URL(…, import.meta.url)` (a Vite production build, webpack 5, Rollup
  with a URL plugin) need no setting. With any other bundler (plain esbuild,
  Rollup without such a plugin), copy `dist/assets/` next to your bundle.
- **`classicy/fonts` is a no-op, and `classicy/dist/fonts.css` is gone.** The
  Platinum package registers its thirteen `.woff2` faces at runtime, as
  `<style id="classicy-fonts-platinum">`. *Migrate:* delete the import, or
  keep it (it still resolves, and does nothing). Replace any `<link>` to
  `fonts.css` with `classicy-platinum.fonts.css` if your CSP blocks inline
  styles (next item); otherwise remove it.
- **Strict-CSP hosts link three stylesheets.** A policy that blocks inline
  `<style>` blocks everything Classicy injects at runtime: the structure, the
  Platinum look and the Platinum fonts. `dist/classicy.css` no longer carries
  the look, and no linked file carried the fonts until now. A host that
  cannot allow inline `<style>` links all three, first in `<head>`, in this
  order:

  ```html
  <link rel="stylesheet" href="/node_modules/classicy/dist/classicy.css">
  <link rel="stylesheet" href="/node_modules/classicy/dist/classicy-platinum.css">
  <link rel="stylesheet" href="/node_modules/classicy/dist/classicy-platinum.fonts.css">
  ```

  Without the second file the desktop has structure but no look: no bevels,
  no art and no menu-item flash. Without the third, text falls back to the
  browser's fonts. `classicy-platinum.fonts.css` holds the same `@font-face`
  rules the runtime writes (Charcoal, ChicagoFLF, Geneva, AppleGaramond,
  Monaco and VCR OSD Mono, thirteen faces), unlayered, each pointing at its
  file in `dist/assets/`. Serve that folder beside the stylesheet, and allow
  it in `font-src`. All three are served by the existing `classicy/dist/*`
  export.
- **Browser floor: Chrome/Edge 120, Safari 16.2, Firefox 113.** Theme tints
  are `color-mix()` and icons use unprefixed `mask-image` with mask
  compositing. In an older engine those declarations are dropped: error title
  bars lose their tint, and icon overlays and art go missing.

### Cascade layers

- **Unlayered host CSS and every host layer now beat Classicy, whatever the
  specificity.** Classicy's stylesheet opens with
  `@layer classicy.base, classicy.package, classicy.user;` and puts its rules
  in `classicy.base` (structure) and `classicy.package` (the look). Because
  that statement comes first in `<head>`, a host `button { … }`, a reset, or
  Tailwind v4's Preflight (in `@layer base`) now restyles Classicy's
  controls. *Who:* hosts with global element rules or a layered CSS framework.
  *Migrate:* put overrides you mean in `@layer classicy.user { … }` or leave
  them unlayered, and put broad resets that must yield to Classicy in the
  reserved sublayer `classicy.base.host`. For Tailwind v4, **replace**
  `@import "tailwindcss";` with its granular form:

  ```css
  /* replaces @import "tailwindcss"; */
  @layer theme, base, components, utilities;
  @import "tailwindcss/theme.css" layer(theme);
  @import "tailwindcss/preflight.css" layer(classicy.base.host);
  @import "tailwindcss/utilities.css" layer(utilities);
  ```

  Adding a second Preflight import beside the shorthand does not help: the
  shorthand still loads its own copy into `base`. Details:
  [§1, "Cascade layers"](AGENT-REFERENCE.md#cascade-layers-overriding-classicy-styles).
- **Classicy ships no `!important`.** The screen saver's hidden-cursor rule is
  a layered rule now, so an unlayered host `* { cursor: … }` shows a pointer
  over a running screen saver. *Migrate:* scope host cursor rules, or put them
  in `classicy.base.host`.

### Components outside a desktop

- **A component rendered outside `ClassicyDesktop` gets base structure only,
  with no look.** The package's rules match only inside an element with
  `class="classicyDesktop"` and `data-classicy-appearance="<id>"`. Base
  structure still applies everywhere, and some of it shows: a
  `ClassicyButton` with `buttonShape="square"` keeps the base rounded
  corners, because the `border-radius: 0` that squares it is now package
  CSS. Classicy's stylesheets also read
  their sizes as `var(--x)` with no pixel fallback, and the art as
  `var(--classicy-art-<key>)`, so both the theme variables and the asset
  variables must be on that element. The open-icon halftone has no built-in
  fallback either. *Who:* hosts that render a lone `ClassicyButton`, a
  Storybook of their own, or tests that assert computed styles. *Migrate:*

  ```tsx
  function Standalone({ children }: { children: React.ReactNode }) {
    const assetVars = useClassicyAssetVars() // a hook: call it in the wrapper
    return (
      <div
        id="classicyDesktop" // keeps menus and balloons inside the wrapper
        className="classicyDesktop"
        data-classicy-appearance="platinum"
        style={{ ...getThemeVars(getTheme("default")), ...assetVars }}
      >
        {children}
      </div>
    )
  }
  ```

  Portals fall back to `document.body` when no `#classicyDesktop` exists, and
  get base structure only there.

### Class names, attributes and the DOM

- **State classes are bare names beside the root class.** Every class that
  folded a state into its name is gone, for example:
  - `classicyWindowActive` is now `.classicyWindow.active`;
  - `classicyButtonDepressed` is now `.classicyButton.pressed`;
  - `classicyTabButtonActive` is now `.classicyTabButton.selected`;
  - `classicyDesktopIconActiveAndOpen` is now `.classicyDesktopIcon.selected.open`.

  Some classes with no state in them were renamed too:
  - `classicyDesktopMenuAppleMenu` is now `classicyDesktopMenuApple`;
  - Drive Setup's `driveSetupList*` classes gained the prefix, as
    `classicyDriveSetupList*`;
  - the color picker's `classicyColorPickerSlider--<color>` modifiers are now
    `classicyColorPickerSlider<Color>`, such as
    `classicyColorPickerSliderRed`;
  - `block`, which an expanded window's contents carried, is gone with no
    replacement.

  *Who:* host CSS, end-to-end selectors and tests that name Classicy classes.
  *Migrate:* use the full old-to-new table in
  [§5, "Migrating to the shared vocabulary"](AGENT-REFERENCE.md#migrating-to-the-shared-vocabulary-breaking-change).
- **No `data-state`.** `ClassicyBevelButton`, `ClassicyPlacard` and
  `ClassicyImageWell` no longer set it, and the exported type
  `ClassicyBevelButtonState` is deleted. *Migrate:* select the state classes
  instead (`.checked`, `.pressed`, `.mixed`, `.disabled`, `.selected`, and
  `.open` while a bevel button's menu shows).
- **Generic state names can collide with host CSS.** The 15 states are
  `active`, `inactive`, `disabled`, `selected`, `pressed`, `focused`, `hover`,
  `collapsed`, `open`, `dragging`, `error`, `default`, `checked`, `mixed` and
  `expanded`. A host's global `.active { … }` or `.error { … }` now matches
  Classicy elements and, being unlayered, wins. *Migrate:* scope such rules to
  your own markup (`.my-nav .active`).
- **Removed classes.**
  - The global `.hidden` utility is gone. A collapsed window's contents are
    `.classicyWindowContents.collapsed`. *Migrate:* define your own `.hidden`
    if you relied on it.
  - `classicyWindowZoomed` is gone. It had no rule.
  - `classicyWindowInvisible` is gone. Nothing rendered it.
- **A `zIndex` in `style` is dropped** on `ClassicyWindow`, `ClassicyIcon` and
  `ClassicyDesktopIcon`, whose states own stacking. Every other `className`
  and `style` you pass is now merged onto the component's root
  ([§4.0.1](AGENT-REFERENCE.md#401-vocabulary-state-classes-part-attributes-passthrough-layers)).
- **Radio groups default to rows.** `ClassicyRadioInput`'s `align` defaults
  to `"rows"`, which is how every group already rendered: the documented
  `"columns"` default never applied. An explicit `align="columns"` now really
  stacks. Default groups no longer carry `classicyRadioInputGroupColumns`.
  *Migrate:* drop host selectors on that class, or pass `align="columns"`.
- **`ClassicyWindowFrame` draws the window's title bar.** It renders the
  shared `ClassicyWindowTitleBar`, 19 px tall and striped like a window's,
  with no control boxes, so the frame's body sits 6 px lower.
  `classicyWindowFrameTitleBar` and `classicyWindowFrameTitleText` are gone.
  *Migrate:* target `.classicyWindowFrame .classicyWindowTitleBar` and
  `.classicyWindowFrame .classicyWindowTitleText`.
- **Window control boxes have accessible names.** The close, zoom and
  collapse boxes are buttons named "Close", "Zoom" and "Collapse". They
  carry `data-classicy-control="close" | "zoom" | "collapse"`. *Migrate:*
  tests can query them by role and name; update accessibility snapshots.
- **The grow-box cursor is CSS.** `ClassicyWindow` no longer sets
  `document.body.style.cursor` while the pointer is over the grow box. The
  grip's own `cursor` rule reads `--classicy-cursor-resize-lr`.
- **`ClassicyDisclosure` has one DOM order**, triangle then label, for both
  label positions. A left label is moved first by CSS. Code that read a
  left-label header's `firstElementChild` as the label now gets the
  triangle. A non-interactive `ClassicyTriangle`'s `<svg>` is `aria-hidden`,
  so a disclosure or tree header's accessible name is its label alone. It was
  "More info Toggle" or "Toggle More info". *Migrate:* query
  `.classicyControlLabelHolder`, and update tests that match the old names.
- **Text glyphs are package CSS.** These are now empty `aria-hidden` spans
  that the package fills with `::before`/`::after` content:
  - the menu check and mixed dash;
  - the pop-up and combo-box check;
  - the bevel button's ▸ and ▾;
  - the placard's ▾;
  - the file input's ✕;
  - the HyperCard tools palette's ✓.

  Their `textContent` is `""`, and `getByText("✓")` finds nothing.
  *Migrate:* assert the state instead (`aria-checked`, `aria-pressed`, or the
  `checked`/`mixed`/`selected` classes).
- **Checkable roles.**
  - A `ClassicyMenuItem` with `checked` set (`true`, `false` or `"mixed"`) is
    `role="menuitemcheckbox"` with `aria-checked`.
  - A HyperCard tools-palette entry is `role="button"` with `aria-pressed`.
    It is a toggle: pressing the armed entry again disarms it.

  *Migrate:* `getByRole("menuitem", { name })` misses a checkable item; query
  `menuitemcheckbox`.
- **Caption colors are custom properties.** A QuickTime `captionStyle`
  reaches the cue as `--classicy-caption-fg`/`-bg` (and their `-alpha`
  properties), not as inline `color`/`background-color`. `style.color` reads
  `""`, and host CSS in `classicy.user` or unlayered now overrides the
  viewer's colors. *Migrate:* theme captions through
  `.quickTimePlayerCaptions:not(.quickTimePlayerCaptionsCustomStyle)` to keep
  the viewer's choice.
- **`ClassicyKbd` wraps each modifier glyph** in
  `<span class="classicyKbdModifier" data-classicy-part="modifier-<name>">`.
  The text is unchanged. *Migrate:* update DOM snapshots.
- **Menu-bar clusters are ordered by flex `order`**, not floats. The
  deprecated `ClassicyDesktopMenuWidgetSound`, mounted in a container that is
  not a flex row, now sits left instead of floating right.

### SCSS

- **`classicy/scss/*` is the vocabulary, and Platinum's partials moved.**
  `classicy/scss/*` now resolves to `vocabulary`, `layout`, `package` and
  `color`. Platinum's partials are at
  `classicy/appearance/platinum/scss/*` (`mixins`, `scrollbars`, `assets`),
  with every mixin renamed to kebab-case with a `platinum-` prefix:

  ```scss
  // before (2.1.x)
  @use "classicy/scss/appearance";
  .bar { @include appearance.platinumWindowControlBoxBorder; }
  // after
  @use "classicy/appearance/platinum/scss/mixins";
  .bar { @include mixins.platinum-window-control-box-border; }
  ```

  The full rename table is in
  [§5, "Migrating to Appearance Packages"](AGENT-REFERENCE.md#migrating-to-appearance-packages-breaking-change).
  Exceptions and removals:
  - `px-rect` and `no-select` moved to `classicy/scss/layout` as
    `classicy-px-rect` and `classicy-no-select`.
  - `scrollbars-inactive` is removed. It never drew in Classicy's own
    windows. If you used it on a scroller of your own, copy its rules from
    the 2.1.7 source.
  - `classicy/scss/themes.json` is gone: call `getAllThemes()`.
  - `classicy/scss/fonts` is gone: the package registers its fonts.
  - `classicy/appearance/platinum` (the JavaScript specifier) registers
    nothing. Importing `classicy` registers Platinum.
- **`platinum-halftone` takes a color token name.** It was
  `appearance.theme-halftone($color, $size)`. It is now
  `platinum-halftone($token, $size)`, where `$token` is a custom-property
  name such as `"--color-black"`, and it paints the dots on a `::before`
  child. The element it is included in gets `position: relative` and
  `isolation: isolate`. `encode-color` is removed, since no color is baked
  into a data URI anymore.
- **The `assets.$…` art variables are gone.** Read registered art as
  `var(--classicy-art-<key>)`. `classicy/appearance/platinum/scss/assets` now
  exports only `platinum-root-properties`.
- **The control-box and menu-divider mixins draw only the look.**
  - `platinum-window-control-box`, `platinum-window-control-box-depressable`
    and `platinum-menu-divider` no longer set the box's size, its
    `::before`/`::after` geometry or the divider's full-width stretch. Those
    are base structure now.
  - The control-box mixins draw their dither from
    `--classicy-art-window-dither`.

  *Migrate:* a host that includes these mixins on its own elements sets the
  sizes itself, and defines `--classicy-art-window-dither` outside a desktop
  (or accepts no dither).
- **Two mixins read knob variables only `getThemeVars` emits.**
  - `platinum-menu-frame` reads `--menu-frame-border-width`, `-bevel-width`,
    `-shadow-start`, `-shadow-gap` and `-shadow-width`.
  - `platinum-scrollbars` reads `--scrollbar-thumb-grip-width` and `-height`.
  - The inset shadows of the `platinum-window-*` and
    `platinum-depressable-*` mixins, and of the scroll-bar track, read
    `--control-frame-width` instead of computing `--window-border-size * -2`.

  *Migrate:* include these mixins only where `getThemeVars(theme)` is
  spread. A subtree that overrides only `--window-border-size` must override
  `--control-frame-width` too.

### Icons, system art and cursors

- **`ClassicyIcons` is a snapshot of the shipped Platinum tree.** It does not
  reflect later `registerClassicyIcons` calls (`ClassicyIcons.myApp.icon` is
  `undefined`). `registerClassicyIcons` now deep-merges, so registering one
  leaf keeps its siblings. *Migrate:* read icons with `useClassicyAsset`
  (in a component) or `resolveClassicyAsset` (elsewhere), at render or call
  time, never in a module-scope constant.
- **System art and cursors are no longer icons.** Registering these icon
  paths no longer changes what is drawn. *Migrate:* register the replacement
  instead:

  | Icon path you used to register | Register now |
  |---|---|
  | `system.alias` | `registerClassicySystemArt("platinum", { aliasBadge })` |
  | `system.apple` | `registerClassicySystemArt("platinum", { appleMenu })` |
  | `system.desktop.trashEmpty`, `trashFull` | `registerClassicySystemArt("platinum", { trashEmpty, trashFull })` |
  | `ui.helpButton` | `registerClassicySystemArt("platinum", { helpButton })` |
  | `classicy.logo` | `registerClassicySystemArt("platinum", { aboutLogo })` |
  | `system.macosSvg` | `registerClassicySystemArt("platinum", { startupLogo })` |
  | `ui.cursors.watch`, `hand`, `resizeLr`, `resizeUd`, `resizeU`, `resizeD`, `resizeL`, `resizeR` | `registerClassicyCursors("platinum", { watch, hand, … })` |

  The screen saver's built-in logos copy `classicy.logo` and
  `system.macosSvg` too; replace those with
  `registerClassicyScreenSaverLogo`. Details:
  [§5, "Migrating icon overrides"](AGENT-REFERENCE.md#migrating-icon-overrides-breaking-change).
- **The Control Strip and pop-up slider pixel-art constants are no longer
  exported.** These are `controlStripTab`, `controlStripCollapseGlyph`,
  `controlStripScrollLeft`, `controlStripScrollLeftDisabled`,
  `controlStripScrollRight`, `controlStripScrollRightDisabled`,
  `controlStripModuleArrow`, `popUpSliderTrack` and `popUpSliderThumb`.
  Each is now a system-art key of the same name, except the old
  `controlStripCollapseGlyph`, whose key is `controlStripCollapse`.
  *Migrate:*
  - Outside React, decode the registered rows:
    `decodeClassicyPixelArtRows(resolveClassicyAsset("systemArt", key, "platinum"))`
    returns the same `ClassicyPixelArtRows` (`readonly string[]`) the
    constant held. Leave out `"platinum"` to read the active package's art,
    which falls back to Platinum's.
  - In a component, read them with `useClassicyPixelArtRows(key)`, which
    follows the active package and later registrations.
  - Draw them with `<ClassicyPixelArt art={key} />`.
  - Replace them with
    `registerClassicySystemArt(packageId, { [key]: encodeClassicyPixelArtRows(rows) })`.
- **Seven icon paths are gone** from `ClassicyIcons` and the Platinum icon
  tree. `ClassicyIcons.system.bomb` is a type error and `undefined` at
  runtime, and `useClassicyAsset("icons", "system.bomb")` returns
  `undefined`. Nothing in Classicy drew any of them. *Who:* hosts that read
  one of these paths. *Migrate:*

  | Removed icon path | Replacement |
  |---|---|
  | `system.bomb` | None |
  | `system.files._229`, `system.files._232Messages` | None. Their image files never existed, so both were `""` in 2.1.x |
  | `ui.halftoneSmall` | None. The halftone Classicy draws is the system art `halftone`, a different image: an SVG dot cell that Platinum uses as a mask |
  | `ui.menuDropdownArrows` | The system art `popupArrows`: the same double arrow, filled with `currentColor` instead of `#221f20` |
  | `ui.stripe` | None. It is a diagonal hatch. The title-bar stripes are the system art `windowStripes`, a different, horizontal pattern |
  | `ui.tab` | Nearest: the system art `tabOutline`, the same tab shape drawn as an open outline in `currentColor` rather than filled |

  Read system art with `useClassicyAsset("systemArt", key)` or
  `resolveClassicyAsset("systemArt", key)`, or in CSS inside a desktop as
  `var(--classicy-art-<key>)` (`--classicy-art-popup-arrows`,
  `--classicy-art-tab-outline`). To keep an old path working, register your
  own image under it, for example
  `registerClassicyIcons({ system: { bomb } })`. The 2.1.7 images are in that
  release's source, under `assets/img/`.
- **`useClassicyCursor` takes a cursor role, and ten cursor names are gone.**
  `setCursor(name)` took any key of `ClassicyIcons.ui.cursors` (18 names). It
  now takes a `ClassicyCursorRole` (13 roles), read from the cursor registry
  at call time. These ten names are no longer accepted: `add`, `eyedropper`,
  `handCounting`, `highlight`, `menu`, `plus`, `rom`, `shortcut`, `spin` and
  `precision`. In TypeScript, `setCursor("eyedropper")` is a type error. In
  JavaScript it resets the page's cursor to the default instead.
  `registerClassicyCursors` takes only the 13 roles, so the ten cannot be
  registered back as roles. *Who:* hosts that call `setCursor` with one of
  the ten. *Migrate:*
  - The ten images still ship, in the Platinum icon tree at
    `ui.cursors.<name>`. Set the page's cursor yourself, and clear it when
    the operation ends:

    ```ts
    const src = resolveClassicyAsset("icons", "ui.cursors.eyedropper")
    document.body.style.cursor = src ? `url("${src}"), auto` : ""
    // when the operation ends
    document.body.style.cursor = ""
    ```

  - For a cursor over one element, write a CSS `cursor` rule with that image
    or your own, such as `cursor: url("/cursors/eyedropper.png"), auto`.
  - The other eight names (`hand`, `watch`, `resizeLr`, `resizeUd`,
    `resizeU`, `resizeD`, `resizeL` and `resizeR`) are roles, and `setCursor`
    still takes them. The roles add `arrow`, `ibeam`, `crosshair`,
    `resizeNwse` and `resizeNesw`. Platinum registers an image for `arrow`
    and the eight, not for the other four, so `setCursor("ibeam")` restores
    the default until a package registers one.
- **`ClassicyDefaultParadeIcons` is now a function,
  `getClassicyDefaultParadeIcons()`**, so the startup parade reads icons at
  call time. *Migrate:* call it.
- **Every asset `url()` Classicy writes is quoted.** Variables and styles
  that carry an asset are written `url("…")`. That covers
  `--classicy-icon-mask`, `--desktop-background-image` (`url("")` for a
  theme with no wallpaper), cursors, and `--classicy-art-*`. As a result, a
  `data:` SVG icon now keeps its mask. *Migrate:* tests that matched the
  unquoted text must expect the quotes.

### Sound

- **Sound packs replace the sound record.**
  - `ClassicySounds` and `loadSoundTheme` are removed.
  - A theme selects its pack with `sound.pack`, which replaces `sound.name`.
  - `ClassicySoundLoad` takes `{ pack }` (the pack object) instead of `{ file }`.

  *Who:* hosts that read `ClassicySounds`, called `loadSoundTheme`, or write
  theme JSON by hand. *Migrate:*
  - Register a pack with `registerClassicySoundPack` and name it in the
    theme's `sound.pack`.
  - Switch packs at runtime with
    `ClassicyDesktopChangeAppearanceOption { path: "sound.pack", value }`.

  Persisted state with `sound.name` is healed on load. A theme file that
  still uses `sound.name`, or names a pack that is not registered, is
  refused. Details: [§10](AGENT-REFERENCE.md#10-sound).
- **Feedback sounds belong to the package.** Control clicks, window sounds,
  menu sounds and the menu-item flash are Platinum's package hooks now, not
  component code. The error beep and the boot sound stay in the components.
  *Who:* a host that registers its own package, or renders components while
  no package with hooks is active. Those components are silent, and a menu
  item with no package flash runs its action after a 400 ms fallback.
  *Migrate:* in your package's `hooks`, compose `platinumAppearanceHooks`,
  which is frozen:
  `on: { ...platinumAppearanceHooks.on, Button: { ...platinumAppearanceHooks.on?.Button, press } }`.

### Themes, sizes and colors

- **Overriding an input variable no longer rescales derived sizes.**
  Stylesheets read 119 named sizes that `getThemeVars` computes from the
  theme, instead of `calc(var(--window-control-size) * N)`. Examples are
  `--menu-min-width`, `--popup-height`, `--window-collapsed-height` and
  `--ui-font-size-small`. So a host that sets `--window-control-size` or
  `--window-padding-size` on the desktop changes only that variable.
  *Migrate:* change the theme's measurement, or override the derived variable
  itself. AGENT-REFERENCE has a per-input table: §8, "Overriding sizes from
  a host", under
  [CSS custom properties](AGENT-REFERENCE.md#css-custom-properties).
- **Error title bars are `#ffcccc`**, `classicy-tint("--color-error", 80%)`,
  instead of `#f7cecd`, so they follow a theme's error color. This is the one
  intended color change under Platinum.
- **Computed colors serialize differently.** Theme tints and shades are
  `color-mix()`, so `getComputedStyle` returns `color(srgb …)` where it
  returned `rgb()`/`rgba()`. Pixels are unchanged. *Migrate:* tests that
  compare computed color strings compare the rendered color instead.
- **`POPUP_MENU_MAX_HEIGHT` is removed.** The pop-up menu's and combo box's
  height cap is the theme variable `--menu-pop-up-max-height` (Platinum
  `menu.popUpMaxHeight`, 300). `classicyPopUpMenuPlacement` takes the cap as
  an optional last argument, `maxHeightCap`. *Migrate:*
  `readClassicyThemeVar("--menu-pop-up-max-height", undefined, el)`, or pass
  your own cap.
- **Font sizes are bounded to 8–72 px.**
  - `ClassicyDesktopChangeFontSize` refuses any other value, with a warning.
  - `ClassicyThemeSchema` holds the five typography sizes and
    `desktop.iconFontSize` to the same range.
  - The Fonts tab clamps what you type.
  - A package knob whose key names a font size (`fontSize`, or a name
    ending in `FontSize`, such as `hyperCard.fontSize` or
    `appleGuide.bodyFontSize`) is held to the same range, in any family of
    any package: by the theme schema, by `ClassicyDesktopChangeMetric` (the
    knob's own range intersected with 8–72) and by the Options tab.
  - Persisted out-of-range sizes, core and knob, are clamped into 8–72 on
    load (`migrateClassicyState`).
  - `registerClassicyAppearancePackage` validates a package's `defaults`
    and `presets` with the same schema, so a package carrying a font-size
    knob outside 8–72 is not registered (logged as an error).

  *Who:* theme files with a size outside 8–72, a package font-size knob
  included, no longer load, and packages whose themes carry one no longer
  register. *Migrate:* edit those sizes into range.
- **Themes name their package.** `ClassicyTheme` has a required
  `package: string`.
  - Persisted themes are migrated on load.
  - `ClassicyDesktopLoadThemes` fills it in.
  - The theme schema defaults it to `"platinum"`, so older files load as
    Platinum.

  *Who:* TypeScript hosts that build literals of these types:
  - `ClassicyTheme`;
  - `ClassicyThemeWithPartialMetrics`, the input of
    `withDefaultThemeMetrics`, which requires `package` too;
  - `ClassicyStoreSystemAppearanceManager`, which gains a required
    `packageId` (typed state literals, such as a `defaultState` seed).

  *Migrate:* add `package: "platinum"` to a theme, or spread `getTheme(id)`.
  Add `packageId: "platinum"` (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`) to
  an Appearance Manager state literal.
- **`ClassicyDesktopLoadThemes` validates each theme.** Every entry is
  checked against `ClassicyThemeSchema`, as theme files and imports are. An
  entry with a font size outside 8–72, a bad color, a `backgroundImage` that
  is not a bundled wallpaper or plain http(s) URL, or that is not an object
  at all, is dropped with a warning naming its id and first issue; the rest
  load. A list with no valid entry leaves the theme list unchanged.
  Undeclared keys are stripped and a wallpaper filename is resolved to its
  asset URL. A theme for an unregistered package is still kept.

  *Who:* hosts that load hand-built themes. *Migrate:* fix the theme the
  warning names; `ClassicyThemeSchema.safeParse(theme)` reports every issue.
- **Theme files and imports need an installed package.**
  Loading a file, or dispatching `ClassicyDesktopImportTheme`, for a package
  that is not registered (Platinum always counts as installed) is refused
  through `Desktop.errorDialog`. A file that still uses `sound.name` is
  refused too (see [Sound](#sound)). Details:
  [Theme files](AGENT-REFERENCE.md#theme-files-save--load).
- **One Custom theme slot per package.** The first edit of a built-in forks
  it into its package's slot, `classicyCustomThemeSlotId(packageId)`:
  `"custom"` for Platinum and `custom-<packageId>` for any other.
  - A non-Platinum theme persisted under the legacy `"custom"` id is moved
    aside to `custom-2` (or the next free number) the first time a Platinum
    built-in forks. It keeps its name and data.
  - `ClassicyDesktopChangeTheme` searches the active package's themes first,
    so an id that two packages share resolves to the active package's theme.

  Details:
  [Custom themes and color edits](AGENT-REFERENCE.md#custom-themes-and-color-edits).
- **Package measurements cannot take reserved names.** Classicy skips a
  package measurement (with a warning) and refuses it as a knob when its
  variable would be one of these:
  - one of the 119 named derivations;
  - any variable `getThemeVars` sets after the measurement inputs;
  - a name starting `--classicy-` or `--color-`.

  For example, `menu.minWidth` would make `--menu-min-width`. *Who:*
  package authors. *Migrate:* rename the family or key.

### State, actions and behavior

- **`ClassicyWindowOpen` no longer treats `[0, 0]` as "no position".** A new
  window opens where its `position` says, `[0, 0]` included. *Migrate:* to
  have it cascaded (`30 + 10·n`), omit `position` or pass
  `autoPosition: true`. `ClassicyWindow` always sends a position (default
  `[110, 110]`), so its windows are unaffected.
- **PDF Viewer's close action type is fixed.** It dispatched
  `"ClassicyAppPDF ViewerCloseFile"`, with a space. It now dispatches
  `ClassicyAppPDFViewerCloseFile`. Bundled apps build no action type from a
  display name. *Migrate:* a host that matched the old string matches the
  new one.
- **Persisted state changed shape.** These changes are healed or applied
  automatically; no host step is needed:
  - New: `System.Manager.Appearance.packageId`, default `"platinum"`.
  - Every stored theme gains `package`, and custom themes take one slot per
    package (above).
  - A stored theme keeps only the package knob values a user changed.
  - `Desktop.errorDialog` is no longer persisted (as `systemDialog`
    already was not), so a reload never re-shows an open alert.
  - The transient window flags `resizing`, `dragging` and `moving` are
    stripped on save and on load, so a window saved mid-drag no longer jumps
    on the first mouse move.
- **Clean Up counts columns by the grid step** (the icon cell plus padding).
  A desktop with more icons than fit now wraps them to the first column
  instead of running them off-screen. With the default theme (48 px icons)
  in a 1024 × 768 window, Clean Up now fills 8 columns of 7 icons, all on
  screen. 2.1.x laid icons out in 16 columns there, and only 9 of them were
  on screen. Clean Up also starts from the active package's
  `desktop.iconGridOrigin`; for Platinum that is the top right, as before.
- **App records follow the code.**
  - `apps[id].name` and `icon` are refreshed from `ClassicyApp`'s props on
    every mount. A host `defaultState` seed still wins for a first session.
  - A desktop icon's balloon is stored only when `desktopIconBalloonHelp` is
    given. The manifest description is resolved at render and no longer
    copied into the record.
- **File-system adapters see one snapshot-hash change.** On the first save
  after upgrading, the derived Applications, Extensions and Control Strip
  Modules entries leave the persisted tree. They are no longer written to
  localStorage, `fs.snapshot()` or `onSnapshot`. *Migrate:* expect one hash
  change; nothing else differs.
- **A derived folder never overwrites a static entry.** Before, an app named
  like a user's file in Applications replaced that file. Now the file is kept
  and the app is listed beside it as `"<name> (<id>)"`, numbered `"… 2"` when
  that is taken too. Only Platinum's untouched seeded stand-ins (marked
  `_placeholder`) give way.
- **Finder's open-with routes to the app's own OpenFile case.** When an
  app's `registerApp` manifest declares `<prefix>OpenFile` in `actions`,
  Finder reduces that case with `{ app: { id }, path }`. Otherwise it uses
  the generic `ClassicyApp${name}OpenFile` queue (`data.openFiles`), as
  before. *Migrate:* declare the action to receive opens in your own reducer.
  - **Trust is required on hand-offs.** `routeClassicyAppOpenFile(ds, app,
    path, trust)` and `classicyFinderEventHandler(ds, action, trust)` take
    `trust`, and a missing value counts as untrusted.
  - **Plugin handlers receive the kernel's trust** as a third
    `AppEventHandler` argument, normalized by `classicyActionTrustOf`.
    *Migrate:* a handler that reduces another action on the original's
    behalf must forward the trust it received.
  - **Hosts that allowlist `ClassicyAppFinderOpenFile` for untrusted
    (HyperCard) actions** must also allowlist each target app's OpenFile
    type, plus `ClassicyAppMoviePlayerOpenDocument` for legacy QuickTime
    documents. A URL shortcut never opens from an untrusted action. Details:
    [§6](AGENT-REFERENCE.md#6-untrusted-actions-hypercard-script-safety)
    and
    [`registerApp`](AGENT-REFERENCE.md#app-manifest-registration--registerapp).
- **Movie Player, Picture Viewer and PDF Viewer come forward** when asked to
  open a file, a file already open included.
- **Two Appearance Manager tab hooks take new required props.**
  `useThemesTab` requires `packageId` and `packageName`, the active
  package's, which the tab names in its label. `useSoundTab` requires
  `soundPacks`, `soundPack` and `changeSoundPack`, for its new Sound Pack
  pop-up. *Who:* hosts that assemble their own Appearance Manager from these
  hooks. *Migrate:*
  - For `useThemesTab`, take `packageId` and `packageName` from
    `useActiveClassicyAppearancePackage()` (its `id` and `name`).
  - For `useSoundTab`, pass `soundPacks` as `{ id, name }` entries from
    `useClassicySoundPacks()`. The Appearance Manager lists the packs whose
    `packageId` is unset or the active package's. Pass `soundPack` as the
    active theme's `sound.pack`, and have `changeSoundPack` dispatch
    `ClassicyDesktopChangeAppearanceOption { path: "sound.pack", value }`.
- **Screen Saver options forms changed.** The schema-derived form is now
  `ClassicySchemaForm`.
  - A field without `.describe()` shows its humanized key ("Speed seconds"),
    not the raw key.
  - A number entry is clamped to the field's `.min()`/`.max()`, with a floor
    of 0 when there is no `.min()`, and rounded for `.int()`.

  *Who:* hosts with their own screen savers. *Migrate:* add `.describe(…)`
  to keep exact labels, and declare `.min()` for a field that may be
  negative.
- **`startClassicyFileDrag`'s returned function now ends a started drag as
  canceled**, rather than only detaching it. `onEnd` reports it with
  `canceled: true`.

## New APIs

Everything is exported from `classicy`. The links go to the full reference.

### Appearance Packages

- `registerClassicyAppearancePackage(pkg)`,
  `unregisterClassicyAppearancePackage(id)` (refuses `"platinum"`),
  `getClassicyAppearancePackage`, `listClassicyAppearancePackages`,
  `subscribeClassicyAppearancePackages`, `useClassicyAppearancePackages`,
  `useActiveClassicyAppearancePackage`, `resolveClassicyAppearancePackage`,
  `getRegisteredClassicyAppearancePackageOrDefault`.
  - Fields: `id`, `name`, `css`, `defaults`, `presets`, `knobs`, `options`,
    `layout`, `assets`, `sounds`, `apps` and `hooks`.
  - `ClassicyAppearancePackageSchema` validates the package, and
    `classicyKnobsToSchema` builds `options` from `knobs`.
  - [§8, "Appearance Packages"](AGENT-REFERENCE.md#appearance-packages).
- The active package is the persisted `System.Manager.Appearance.packageId`
  (default `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `"platinum"`), switched
  by the new action
  `ClassicyDesktopChangeAppearancePackage { packageId }`. The desktop root
  carries `data-classicy-appearance` with the resolved id.
  `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` is used while no package is
  registered.
- A package's CSS is one `@layer classicy.package { … }` block, written with
  the `classicy-package($id)` mixin from `classicy/scss/package` and injected
  as `<style id="classicy-appearance-<id>">`
  (`injectClassicyAppearanceStyles`). The Storybook-only `mirrored` and
  `renamed` packages are templates for a new package.
- `PLATINUM_APPEARANCE_PACKAGE_ID`, `platinumAppearanceHooks` and
  `platinumSoundPack` expose Platinum's own parts for reuse.
- Types: `ClassicyAppearancePackage` (the package object),
  `ClassicyAppearanceHooks` (its `hooks`) and `ClassicyAppearanceLayout` (its
  `layout`).
- `getActiveClassicyAppearancePackageId()` reads the active package's id at
  call time, outside React and without the store.
- Theme lists per package: `listClassicyPackageBuiltInThemes(pkg)` gives a
  package's defaults and presets, and
  `listClassicyPackageThemes(appearance, pkg)` gives the list the Appearance
  Manager shows (built-ins, host-loaded themes, then that package's custom
  themes).
- `withDefaultThemePackage(theme)` fills a missing `package` with
  `"platinum"`.

### Vocabulary

- `CLASSICY_STATE`, `classicyStateClasses`, `CLASSICY_COMPONENT` and
  `CLASSICY_PART_ATTRIBUTE` are generated from one JSON source. In SCSS,
  `classicy/scss/vocabulary` gives `$classicy-states` and `classicy-state()`,
  which fails at compile time on an unknown name.
- Part attributes:
  - `data-classicy-control` (`close`, `zoom`, `collapse`) on window control
    boxes;
  - `data-classicy-role` (`default`, `cancel`, `other`) on alert buttons;
  - `data-classicy-part` on menu-bar clusters and `ClassicyKbd` modifiers.

  `ClassicyMenuItem` takes `part` to set it.
- `className` and `style` pass through to the root of every exported
  component that has one.
- [§4.0.1](AGENT-REFERENCE.md#401-vocabulary-state-classes-part-attributes-passthrough-layers).

### Assets

- `registerClassicyAssets(kind, packageId, tree)`, with wrappers:
  - `registerClassicyIcons(tree, packageId?)`;
  - `registerClassicyCursors`;
  - `registerClassicyWallpapers`;
  - `registerClassicyFonts`;
  - `registerClassicySystemArt`.
- Reads: `resolveClassicyAsset`, `useClassicyAsset`, `useClassicyAssetTree`
  and `subscribeClassicyAssets`. A read looks in the active package, then in
  Platinum.
- `isClassicyAssetSource` checks every leaf. An unsafe scheme, or a
  character that could break out of a quoted `url("…")`, is skipped with a
  warning.
- `useClassicyAssetVars()` returns `--classicy-cursor-<role>` and
  `--classicy-art-<key>`, which `ClassicyDesktop` publishes on its root.
  `ClassicyCursorRole` has 13 roles, and `ClassicySystemArtKey` is a union of
  39 keys. `classicyAssetVarName(kind, key)` gives a cursor's or an art
  key's variable name.
- Pixel art: `encodeClassicyPixelArtRows`, `decodeClassicyPixelArtRows`,
  `useClassicyPixelArtRows` and `<ClassicyPixelArt art={key} />`.
- [§5, "Asset registries"](AGENT-REFERENCE.md#5-asset-registries) and
  [System art](AGENT-REFERENCE.md#system-art).

### Sound packs

- `registerClassicySoundPack`, `getClassicySoundPack`,
  `listClassicySoundPacks`, `subscribeClassicySoundPacks`,
  `useClassicySoundPacks` and `ClassicySoundPackSchema`.
- `CLASSICY_SOUND_SPRITE_IDS` lists the 41 sprite ids a pack should define.
  A sprite missing from the active pack plays from Platinum's.
  `classicySoundPackMissingSprites(pack)` lists the ones a pack lacks.
- The type `ClassicySoundPack`, and `CLASSICY_DEFAULT_SOUND_PACK_ID`
  (`"platinum"`).
- `pnpm build:audio` writes pack JSON with `id`, `name` and relative `src`.
- [§10](AGENT-REFERENCE.md#10-sound).

### Package hooks and events

- `useClassicyAppearance(component, state, ref?)` returns
  `{ className, style, attrs, emit }`, and 24 components call it on their
  root.
- A package's `hooks.decorate` adds classes, styles and `data-*`
  attributes. Its `hooks.on[component][event]` handlers react to 16 events
  (`CLASSICY_APPEARANCE_EVENTS`).
- Gestures that have both a pointer and a keyboard path carry
  `detail.input` (`"pointer" | "keyboard"`). Finder's outline drags emit
  `dragStart` with `{ kind: "file" }` and `dragEnd` with
  `{ kind: "file", dropped, canceled }`. `startClassicyFileDrag` takes
  `onStart`/`onEnd` callbacks, and `onEnd` receives a `ClassicyFileDragEnd`,
  `{ dropped, canceled }`.
- Handlers play sounds with `playClassicyAppearanceSound(sound, { interrupt? })`.
- [Package hooks](AGENT-REFERENCE.md#package-hooks).

### Layout

- A package's `layout` sets three things:
  - `window.growBoxCorner`, which corner holds the grow box;
  - `menuBar.placement`, `"screen"` or `"window"`; in window placement each
    window with an `appMenu` draws it in a `ClassicyWindowMenuBar`, and
    `--menu-bar-height` is `0px`;
  - `desktop.iconGridOrigin`, the corner Clean Up lays icons out from.
- Readers: `useClassicyAppearanceLayout()`, the store-free
  `getClassicyAppearanceLayout(packageId?)`, `classicyLayoutVars` and
  `classicyLayoutThemeVars`.
- `ClassicyAppearanceLayoutSchema` validates a `layout`, and
  `CLASSICY_DEFAULT_APPEARANCE_LAYOUT` is the default (Platinum's: grow box
  bottom right, screen menu bar, icon grid from the top right).
- The desktop root carries `data-classicy-grow-box`, `data-classicy-menu-bar`
  and `--classicy-layout-*`.
- `computeClassicyWindowResize` does resize math for any corner.
  `ClassicyWindowTitleBar` and `ClassicyWindowMenuBar` are exported.
  `ClassicyDesktopMenuBar` takes `placement` to override the package's.
- Alert buttons, disclosure labels, tab strips, title-bar boxes and
  menu-bar clusters can be reordered with CSS `order`. `ClassicyTabs`
  takes `stripPosition: "top" | "bottom"`.
- `classicyDesktopIconGridPosition(metrics, col, row, origin?)` places an
  icon on the grid from any origin.
- [Layout declarations](AGENT-REFERENCE.md#layout-declarations).

### Metrics, knobs and derivations

- Platinum's `defaults.measurements` gains 21 knob families (95 keys), such
  as `controlStrip`, `menuFrame`, `pager`, `balloonHelp`, `popUpSlider` and
  `scrollbar`. Each is emitted as `--<family>-<key>`. Theme files may carry
  them, and an exported theme carries all of them.
  - A stored theme keeps only the values a user changed. `getThemeVars`
    fills the rest from the theme's package.
- `ClassicyDesktopChangeMetric` gains a family form,
  `{ family, key, value }`, for package knobs. Supporting helpers:
  `isThemeMetricFamilyTarget`, `getThemeMetricFamily`,
  `setThemeMetricFamily`, `getThemeMetricFamilyKnob` and
  `getThemeMetricFamilyBounds`.
- `ClassicyDesktopChangeAppearanceOption { path, value }` sets one other
  theme value by dotted path, such as `"sound.pack"` or `"desktop.iconSize"`.
  It refuses a sound pack that belongs to another package. Supporting
  helpers: `parseClassicyAppearanceOptionPath`,
  `getClassicyAppearanceOption` and `applyClassicyAppearanceOption`.
- Derivations: `CLASSICY_THEME_DERIVATIONS` (119 entries),
  `CLASSICY_THEME_DERIVED_VARS`, `classicyThemeDerivations`,
  `isReservedClassicyThemeVar` and `classicyMeasurementVars`.
- `readClassicyThemeVar(name, fallback?, el?)` reads a size in JavaScript,
  and `classicyDefaultThemeVarPx` gives Platinum's value.
- Defaults:
  - `classicyThemeMeasurementDefaults(packageId)`.
  - `withDefaultThemeMetrics(theme, defaults?)` now takes the defaults to
    fill from. Called with one argument it still fills only the core five.
  - `withoutDefaultThemeMeasurements` is its inverse.
- Font-size bounds: `CLASSICY_THEME_FONT_SIZE_MIN`/`MAX`,
  `CLASSICY_THEME_FONT_SIZE_KEYS`, `isValidClassicyThemeFontSize` and
  `clampClassicyThemeFontSize`.
- Desktop icon grid: `classicyDesktopIconMetrics` and
  `readClassicyDesktopIconMetrics`.
- `ClassicyBevelButton`'s `popupAnchorInset` also accepts a function of the
  button, called each time the surface opens.
- [Upgrading: package knobs](AGENT-REFERENCE.md#upgrading-package-knobs-and-the-pixel-literal-purge-part-h)
  and [CSS custom properties](AGENT-REFERENCE.md#css-custom-properties).

### SCSS helpers

- `classicy/scss/color`: `classicy-tint`, `classicy-shade` and
  `classicy-alpha("--color-x", pct)`, which expand to `color-mix()`.
- `classicy/scss/layout`: `classicy-px-rect` and `classicy-no-select`.
- `classicy/scss/package`: `classicy-package($id)`.

### App display overrides

- A package's optional `apps` field shows any app, bundled or a host's,
  under another name, icon or description:

  ```ts
  apps: { "MoviePlayer.app": { name: "Media Player", icon, description } }
  ```

  It is display only. Ids, action types, routing, records, persisted state
  and analytics paths keep the app's own identity, but window titles reach
  analytics as drawn. Build nothing from a displayed name.
- `useClassicyAppIdentity(id, { name, icon })`,
  `useClassicyAppIdentityOverrides`, `resolveClassicyAppIdentity` and
  `classicyAppIdentityFrom`, all store-free, read the overrides.
  `ClassicyAppIdentityOverrideSchema` validates them.
- These surfaces show the display identity:
  - desktop app icons (label, image and balloon);
  - type-ahead and Arrange By Name;
  - the App Switcher and the Apple menu;
  - About boxes and the startup parade;
  - the control panels' and HyperCard's window titles;
  - Control Strip module labels (`classicyControlStripModuleLabel`);
  - the derived Applications, Extensions and Control Strip Modules folders
    (`classicyDerivedAppEntryNames`).
- Display names are 1–64 characters, checked by code point. Classicy
  refuses:
  - surrounding spaces, a leading `_`, and `:`;
  - control, bidi and invisible characters;
  - tag characters, Hangul fillers and variation selectors (VS16 after an
    emoji is allowed).
- Registration stores a frozen copy of `apps`, so
  `getClassicyAppearancePackage(id)` returns a copy for a package that
  declares them. Compare packages by `id`.
- [App display overrides](AGENT-REFERENCE.md#app-display-overrides).

### Appearance Manager

- The Appearance Manager has eight tabs: Themes, **Packages**, **Options**,
  Desktop, Colors, Fonts, **Metrics** and Sound.
  - Packages lists the registered packages.
  - Options shows the active package's knobs. Under Platinum that is six
    groups: Control strip, Menu frame, Pager, Balloon help, Pop up slider
    and Scrollbar (42 knobs).
  - Metrics edits the 20 core metrics.
  - Sound gains a Sound Pack pop-up.
- The Themes list follows the active package. Load Theme… switches to the
  file's package first.
- Tab hooks: `usePackagesTab`, `useOptionsTab`, `useMetricsTab`.
  `useThemesTab` and `useSoundTab` take new required props (see
  [State, actions and behavior](#state-actions-and-behavior)).
- [Appearance Manager tabs](AGENT-REFERENCE.md#appearance-manager-tabs).

### Forms, routing and other additions

- `ClassicySchemaForm` renders a nested zod object as form rows. Helpers:
  `classicySchemaFieldLabel`, `classicySchemaFieldId` and
  `unwrapClassicySchemaField`.
- Open-with routing: `routeClassicyAppOpenFile`,
  `resolveClassicyAppOpenFileType`, `classicyGenericOpenFileType` and
  `findAppEventHandlerPrefix`.
- Trust helpers: `checkClassicyActionTrust` and `classicyActionTrustOf`.
- `useClassicyMenuCloseOnOutsideMouseDown`, plus the shortcut helpers
  `CLASSICY_MODIFIER_GLYPHS`, `CLASSICY_MODIFIER_ORDER` and
  `keyboardShortcutModifiers`.

### Test-only exports

These four are exported for test suites, to reset module state between
tests. They are not for application code. The first three clear a registry,
Platinum's own registrations included. The fourth re-arms the once-only
warnings about derived folder names.

- `resetClassicyAppearancePackagesForTests`;
- `resetClassicyAssets`;
- `resetClassicySoundPacks`;
- `resetClassicyDerivedAppEntryNameWarnings`.

## Fixes

- **Tab strips in Firefox.** In the shipped `dist/classicy.css`, the
  desktop's Firefox scroll-bar fallback beat the tab scroller's
  `scrollbar-width: none`, so Firefox users of the built library saw a scroll
  bar under every tab strip. It is hidden everywhere now.
- **Finder's icon view.** It is laid out across the window again. A 2.1.x
  change had stacked every icon at the top left. The list view keeps its fix
  for wide tables.
- **Fresh boots no longer edit the default file system.** The live tree
  starts from a copy of `DefaultFSContent`, or of a host's
  `defaultFileSystem`. Before, edits on a fresh boot changed those objects,
  and Drive Setup's Initialize did not restore pristine defaults. Seed
  migrations insert a copy of their entry too.
- **`data:` SVG icons keep their mask** in browsers, and a package switch no
  longer leaves a stale mask (the quoted `url()` change above).
- **A user's file named like an app is no longer overwritten** by the derived
  Applications folder (above).
- **Font sizes typed in the Fonts tab** are clamped to what the field shows;
  values like 500 or -1 used to go through.
- **A pop-up slider dragged away and back to its starting value** now
  reports the return (`onChange` fires).
- **A slider's value readout follows `labelSize`**, as its label does. It was
  always drawn at the small size, so with the default (`"medium"`) it grows
  from `--ui-font-size-small` to `--ui-font-size`.
- **Screen saver and reduced motion.** Turning reduced motion off resumes only
  the animations it paused. Where `:has()` is unsupported, a fallback rule
  still hides the pointer over the saver.
- **File drags.** A drag whose source unmounts mid-drag ends as canceled,
  removes its outline and never drops.
- **Menu titles in balloon help.** A top-level menu title wrapped in balloon
  help is as wide as its title, not the whole bar.
- **Finder list rows** carry the `selected` class once, not twice.
- **`ClassicyButton` keeps a `className` you pass** (it used to drop it).
- **The Platinum arrow cursor** has its outline on every edge.
- **Security hardening.** The HyperCard script builder can no longer write to
  `Object.prototype` from stack data (CodeQL
  `js/prototype-polluting-assignment`). The Finder open-with trust fixes above
  close two allowlist bypasses: a legacy QuickTime document, and a URL
  shortcut that could reach `ClassicyDesktopOpenUrl`.

## Tooling and CI

None of this changes the published package's behavior.

- **CI.** `ci.yml` now runs these steps on every pull request and every push
  to `main`:
  - the vocabulary freshness check (`node bin/generate-vocabulary.ts --check`);
  - `pnpm lint`;
  - `tsc`;
  - the Storybook type-check (`pnpm storybook:typecheck`);
  - `pnpm test`;
  - a build of the library and the example app
    (`pnpm build:source && pnpm --filter classicy-example build`), so a
    broken consumer import or type error fails the pull request.
- **Runner pin.** Every workflow (`ci`, `push`, `pages`, `pr-preview`) runs
  on `ubuntu-26.04` instead of `ubuntu-latest`. This keeps the distro ffmpeg
  that builds the released audio sprites at 8.0.1.
- **Dependabot.** `.github/dependabot.yml` replaces the empty template with
  weekly npm and GitHub Actions updates:
  - security fixes (transitive ones included) come as one group;
  - minor and patch updates are grouped as production and development;
  - majors are left for a human.

  The open transitive alerts were cleared with lockfile updates and three
  raised `pnpm.overrides` (js-yaml, shell-quote, sharp), recorded with
  their reasons in
  [`DEPENDENCY-OVERRIDES.md`](DEPENDENCY-OVERRIDES.md).
- **CodeQL.** The four open alerts on the pull request are resolved: the
  prototype-polluting assignment above, and three incomplete-sanitization
  findings in tests.
- **Pixel and multiplier gates.** `pnpm lint` also runs
  `bin/check-pixel-literals.ts`. Classicy's stylesheets may hold no pixel
  literal (the allowlist is empty and must stay empty). Any
  `calc(var(--x) * N)`, `#{}` interpolation or factor chain other than ±1
  fails unless it is one of the 40 reasoned sites in
  `bin/multiplier-allowlist.json`.
- **Other gates.**
  - The literal-color sweep (`bin/classicyLiteralColorSweep.ts`).
  - A cross-file cascade guard: two stylesheets may not style one element at
    equal specificity with different values.
  - Tests that forbid `!important` and require every class in source to be
    declared in the vocabulary.
  - `verify:dist`, which checks the injected stylesheet, the layer order,
    the shipped art and font set, ASCII-only CSS, unlayered CSS, the
    published type declarations, and that `classicy-platinum.fonts.css`
    declares exactly the faces the runtime registers, each pointing at a
    file in `dist/assets/`.
- **Visual parity tooling.** `bin/parity/` (`pnpm parity:stories`,
  `parity:shoot`, `parity:app`, `parity:probe`, `parity:dump`,
  `parity:forced`, `parity:compare`) shoots Storybook and the example app
  with Playwright and compares the shots with ImageMagick. It also reports
  size differences, which `compare -metric AE` alone misses. It adds the
  dev dependency `playwright@1.57.0`. See
  [§15](AGENT-REFERENCE.md#15-visual-parity-checks-repository-tooling).
- **Repository helper.** `bin/git-clear-stale-lock.sh` safely clears an
  empty, abandoned `index.lock`.
