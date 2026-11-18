# System 7 vs Platinum: Menus, Windows, Dialog Boxes

Research for a System 7 Appearance Package (1-bit and color variants).
Sources: *Macintosh Human Interface Guidelines* (1995), chapters 4 Menus
(printed p.49), 5 Windows (p.131) and 6 Dialog Boxes (p.175); the Mac OS 8 HIG
(1997); Platinum's source in `packages/appearance/platinum/src/` and the core.

## Method and conventions

- **Page offset.** In the System 7 HIG, PDF page = printed page + 24 (printed
  p.49 is PDF 73, p.131 is PDF 155, p.175 is PDF 199). In the OS 8 HIG, the PDF
  page equals the printed page. Every "p.N" below is a printed page.
- **Pixel measurements.** Most figure screenshots are embedded at native
  screen resolution. I extracted them with `pdfimages -png` and dumped them
  pixel by pixel (one image pixel = one screen pixel). Two checks confirm the
  scale: the measured title bar is 19 px, the height the HIG text gives on
  p.138, and the close box is 11 px, its known size. Values marked
  "(measured)" come from these dumps. The figures they come from are 4-14
  (p.63), 5-4 (p.136), 5-30 (p.160), 6-4 (p.180), 6-8 (p.186), 6-14 (p.190),
  6-17 (p.194) and 6-21 (p.197). Hex colors are as printed in the PDF. Treat
  them as close to the 1995 default "Standard" window color set, not exact
  RGB, because the PDF may be color-managed.
- "B&W" means the 1-bit variant. "Color" means color or gray-scale screens,
  which the HIG groups together.

---

## 1. Menu bar

**System 7** (p.52–55, figs 4-2, 4-3, 4-5; measured from fig 4-14):
- A white bar 20 px tall: 19 white rows over a 1 px black bottom line. It has
  no bevel and no top line. The screen's black rounded corners (about 5 px
  radius) sit over the bar's two top ends (figs 4-3, 4-4).
- The menu bar layout is: Apple menu, then application menus, then the Help,
  Keyboard (optional) and Application menus on the right. The titles of the
  Apple, Help, Keyboard and Application menus are icons, not words (p.52).
  The Help title is a speech balloon with a "?" (fig 4-2).
- Titles are set in Chicago 12 (p.60, p.74).
- The Apple logo is the six-color rainbow apple on color screens (fig 4-14,
  color: yellow, orange, red, magenta, purple, blue pixels) and a solid black
  apple on B&W screens (fig 4-14, B&W).
- **Open title:** the title is inverted, a solid black block with white text.
  This is the same in B&W and color (figs 4-6, 4-8, 4-14). The block fills the
  19 white rows and stops at the bar's bottom line (measured).
- **Dimmed title:** "If all the operations in a given menu are currently
  unavailable … dim the title by drawing it in gray" (p.54, fig 4-5).
- "You must continue to highlight the menu title until the operation is
  complete" (p.56). For an item that opens a modal dialog box, unhighlight the
  title (p.57).
- An application that needs attention gets a diamond mark beside its name in
  the Application menu, and its small icon alternates with the Application
  menu icon in the bar (p.71, fig 4-25).

**Platinum today:** A gray `--color-system-02` bar with an inset bevel and a
black drop shadow, rounded top corners of `--window-control-size`
(`src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss:42-45`).
Note that these rules live in the *base* sheet. An open or hovered title uses
`--color-theme-04` with white text
(`src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss:131-134, 200`, base).
OS 8 adds "a three-dimensional Apple logo, beveled edges, and anti-aliased
corners" (HIG8 p.91). Platinum's Help title is text, and in OS 8 it is always
the last menu on the left (HIG8 p.92).

**Difference:** White flat bar vs gray beveled bar. Black inverted highlight
vs accent color. Rainbow or black flat apple vs 3D apple. An icon Help title
vs the word "Help". Chicago vs Charcoal.

**B&W vs color:** The only difference the HIG shows is the Apple logo. The
bar, highlight and title text are black and white in both.

**Implementation note:**
- Existing mechanisms cover most of it. The package stylesheet can override
  the base bar background, box-shadow and radius, and the theme-04 highlight,
  because `classicy.package` beats all of `classicy.base`. Register the apple
  art per variant.
- `menuBar.placement: "screen"` and the `data-classicy-part` cluster order
  (apple, app, help, switcher, extensions, clock) express the layout as is.
- The highlight color should be a theme token, not a literal: map
  theme-04 to black, or add a menu-highlight token.
- **Possibly new:** a Help title drawn as an icon (balloon "?") in place of
  text. Check whether the help cluster can show art instead of its label
  without changing the component.

## 2. Pull-down menu frame and shadow

**System 7** (fig 4-8 p.58; measured from fig 4-14 p.63):
- The menu hangs from the menu bar's bottom line; it has no top border of its
  own.
- A 1 px black border runs down the left, right and bottom. A 1 px black drop
  shadow sits outside the right and bottom edges, so the right edge reads as
  2 px of black (measured).
- The face is **white**, with no bevel.
- Items are Chicago 12 (p.60), on a **16 px item pitch** (measured). Item text
  starts 15 px inside the left border, which leaves the mark (check) column.
- Keyboard equivalents are right-aligned in the form "⌘N" (fig 4-8).

**Platinum today:** `platinum-menu-frame` (`_mixins.scss:17-60`): a 1 px
black border; a white highlight on the top and left; a `system-04` edge on the
bottom and right; a 1 px `system-07` shadow starting 1 px in (`menuFrame`
knobs in `platinum.json:92-98`). The face is `--color-system-02` gray. Menus
use Charcoal (`platinum.json:34`).

**Difference:**
- S7 has a white face and no bevel; Platinum has a gray face with a 1 px bevel.
- S7's shadow is black; Platinum's is dark gray (`system-07`).
- An S7 pull-down shares its top line with the menu bar.

**B&W vs color:** The frame is the same in both (black border, black shadow,
white face).

**Implementation note:** Use the existing knobs: `menuFrame.bevelWidth: 0`, a
white face and a black shadow color, in a System 7 mixin of the same shape.
The "no top border on a pull-down" detail is probably expressible in package
CSS, because the menu-bar dropdown is a distinct selector. Contextual menus
and submenus keep a full border.

## 3. Menu item highlight, flash, dimmed items

**System 7** (p.56, p.60, fig 4-11):
- A tracked item is highlighted by **inversion**: black background, white text
  (figs 4-11, 4-34, 4-36). This is the same in B&W and color.
- "When the user releases the mouse button while an item is highlighted, the
  item blinks briefly, the menu disappears" (p.56).
- "When a menu item is unavailable, it is displayed in gray letters. When a
  user moves the pointer over the dimmed item, it isn't highlighted" (p.60).
- On B&W screens, dimmed text is drawn through a 50% dither, so the letters
  look stippled. The "Revert" item in fig 4-14 (B&W) shows this. On color
  screens dimmed text is a solid gray (fig 4-14, color).
- Menu behavior is press-drag-release only. Sticky menus arrived in OS 8
  (HIG8 p.92-93).

**Platinum today:**
- Hover and open use `--color-theme-04` (lavender) with white text
  (`ClassicyMenu.scss:131-134`).
- The flash is a 3-blink `classicyMenuItemFlashKeyframes`, theme-04 and
  system-02 alternating, 0.25 s (`_Menu.scss:195-233`), run by the MenuItem
  press hook (`hooks.ts`).
- A disabled item's hover is reset to transparent (`ClassicyMenu.scss:223-225`).

**Difference:** Black/white inversion vs an accent color. The flash alternates
black and white, not accent and gray.

**B&W vs color:**
- Dimmed text is stippled in B&W and gray in color.
- The highlight is identical in both.

**Implementation note:**
- **Existing:** recolor the flash keyframes in the package and drive them by
  hooks (`hooks.on.MenuItem`). The highlight is a CSS override.
- **New technique needed:** B&W dimmed text has no vocabulary yet. Options are
  a 50% checker mask or `background-clip: text` with a checkerboard pattern,
  or a registered `ditherText` art key. The same need recurs in dimmed
  buttons, dimmed window titles and dimmed dialog borders (§24).
- **Note:** Classicy menus are sticky (`ClassicyBevelButton` and the menu-bar
  behavior). Strict S7 press-drag-release is a behavior change, not a look.
  Leave it as is.

## 4. Menu dividers

**System 7** (p.62–63, fig 4-14): "On color and gray-scale screens, a gray
line serves as the divider. For display on black-and-white screens, a dotted
line appears" (p.62). Measured:
- B&W: a 1 px line of alternating black and white pixels across the full
  inner width. It touches the left border.
- Color: one solid 1 px gray line (#c0c0c0 as printed).
- In both, the divider takes a full 16 px item slot, with the line at the
  middle row.
- Keyboard-menu script groups are "separated by dotted or gray lines" (p.126),
  and the type-in pop-up custom item likewise (p.92).

**Platinum today:** An etched pair, `system-05` over white
(`platinum-menu-divider`, `_mixins.scss:62-68`), sized in base
`ClassicyMenu.scss`.

**Difference:**
- S7 uses one line, not an etched pair.
- S7's B&W line is dotted.
- The S7 divider slot is taller: the full item height.

**B&W vs color:** Dotted black in B&W, solid gray in color.

**Implementation note:** **Existing:** a package mixin. Draw the dotted line
with a 2 px `repeating-linear-gradient` or a 1-row dither art key; use the
`classicy-alpha`/token rules, never literals. The divider *height* is base
structure (`ClassicyMenu.scss`). Check whether a knob controls it. If not, a
small measurement knob is needed, because a package should not fight base
sizing with extra rules.

## 5. Menu marks and text styles

**System 7** (p.64–75):
- Checkmark (✓) for a setting in effect; dash (–) for a partial setting
  (figs 4-17 to 4-20). The ellipsis is a single character, typed Option-;
  (p.67).
- A diamond mark in the Application menu for notification (p.71).
- A Style menu may show items in their own style (Bold, Italic, Outline,
  Shadow). The Size menu outlines installed and TrueType sizes (p.73, p.123,
  fig 4-15).
- A submenu is "a triangle facing right" (p.79, fig 4-36): a solid black
  triangle at the right edge.
- Scrolling-menu indicators are solid black up and down triangles, centered
  (p.78, figs 4-34, 4-35).

**Platinum today:**
- Check ✓ and dash – are font glyphs (`_Menu.scss:241-247`).
- The submenu triangle is art (`submenuArrow`, `triangle.svg`,
  `_Menu.scss:186-190`).

**Difference:** Essentially none in shape. The glyphs render in Chicago, not
Charcoal, so they look different.

**B&W vs color:** Same in both.

**Implementation note:** **Existing:** register a System 7 `submenuArrow` if
the triangle's proportions differ. The style-preview items (Outline, Shadow)
depend on the font. A bitmap-faithful Chicago lacks outline and shadow
synthesis; CSS `text-shadow` can fake them.

## 6. Hierarchical menus

**System 7** (p.79–82, figs 4-36, 4-40):
- A submenu appears "after a brief delay" beside its parent item. Its top row
  aligns with the parent item, and it overlaps the parent menu's right edge
  (fig 4-36).
- Only one level of submenu is allowed: "Never use more than one level of
  submenus" (p.82).
- The submenu frame matches the pull-down frame: white face, 1 px border,
  drop shadow (fig 4-36).

**Platinum today:** Same mechanism. The `classicySubMenu` frame is
`platinum-menu-frame` (`_Menu.scss:161-163`).

**Difference:** Frame look only (§2). The one-level rule is guidance, not
rendering.

**Implementation note:** Existing.

## 7. Scrolling menus

**System 7** (p.78–79, figs 4-34, 4-35): When a menu is taller than the
screen, a down-pointing triangle sits at the bottom. An up-pointing triangle
appears at the top once scrolling starts. Each indicator takes one item row.

**Platinum today:** `menu.popUpMaxHeight: 300` (`platinum.json:204-206`).
Scroll indicators depend on the core. Verify that the core draws them; they
may be native overflow scrolling.

**Difference:** The shape of the indicators, if the core draws them.

**Implementation note:** Probably existing, or a core gap shared with
Platinum (Platinum has the same indicators in OS 8).

## 8. Pop-up menus

**System 7** (p.82–91, figs 4-41, 4-46, 4-47, 4-49):
- "The standard pop-up menu looks like a rectangle with a one-pixel border.
  It has a one-pixel drop shadow and contains a downward-pointing triangle
  similar to the triangle used to indicate a scrolling menu" (p.87).
- The face is white and the title (label) sits to the left (p.82). The
  triangle is a solid black down triangle at the right (fig 4-46).
- On press, "the triangle disappears and the other choices appear. When the
  mouse button is released, the triangle reappears" (p.87).
- "While the menu is open, its title is inverted" (p.87): the label becomes a
  black block with white text (fig 4-47 steps 2–3).
- The open menu places the current item over the control, with a checkmark on
  it (figs 4-42, 4-47).
- "Ideally, it should be the same width when it's open as when it's closed …
  In no case … narrower" (p.89).
- Use the same font closed and open: "It's best to use 12-point Chicago,
  plain" (p.88). 9-point is allowed in rare cases.
- Type-in pop-up (p.91–92, figs 4-51, 4-52): a text box joined to the pop-up.
  A typed value not in the list becomes the first item, separated by "a gray
  or dotted line".
- No hierarchical pop-ups; no keyboard equivalents in pop-ups (p.86).

**Platinum today:** A raised, rounded bevel control on a gray `system-02`
face (`platinum-window-undepressable`, `_mixins.scss:154-162`). The indicator
is a **double arrow** (`popupArrows`, `down-arrow.svg`; `_PopUpMenu.scss:319-335`).
A check marks the current item (`_PopUpMenu.scss:340-342`).

**Difference:**
- Flat white rectangle with a 1 px black shadow vs a gray bevel.
- Single down triangle vs a double arrow.
- Square corners vs rounded.
- The S7 label inverts while the menu is open; Platinum has no such state.
- The S7 triangle hides while the menu is open.

**B&W vs color:** The HIG shows no difference.

**Implementation note:**
- **Existing:** recolor through the package; register a `popupArrows` art of
  a single triangle.
- **Probably new or a check:** inverting the *label* while open needs the
  open state to reach the label element (`:has(.open)` on a shared wrapper
  works if the label shares a parent with the control). Hiding the triangle
  while open needs an open state class on the control.

## 9. Tear-off menus and palettes

**System 7** (p.92–97, figs 4-53 to 4-58):
- A tear-off menu detaches when dragged "three pixels away from the menu bar"
  (p.93).
- "Tear-off menus have a drag region with a 25 percent black-and-white
  pattern and a close box" (p.95). The drag region is a thin bar across the
  top with a small close box (figs 4-53, 4-55).
- Tear-offs float above document windows. Palettes show the current tool
  highlighted (inverted) or outlined (p.96).

**Platinum today:** No tear-off menus. Palettes are utility windows (§18).

**Difference:** The S7 tear-off is a utility window with the 25% drag bar.

**Implementation note:** Tear-off behavior would be a new core capability and
is out of scope for a look package. The palette look reuses the utility
window (§18).

---

## 10. Document window frame and drop shadow

**System 7** (p.134–136, figs 5-2 to 5-4; measured from figs 5-4, 6-4):
- A **1 px black frame** around the whole window, plus a **1 px black drop
  shadow** on the right and bottom.
- The shadow is offset 1 px: its first pixel is one row below the window's
  top-right corner and one column right of its bottom-left corner. So the
  right and bottom edges read as 2 px of black.
- There is no inner bevel and no gray frame. The content area is white on all
  systems (p.135).
- The window moves only by its title bar: "The user moves a window by
  dragging its title bar" (p.154). There is no side drag region.

**Platinum today:**
- `platinum-window-border` (`_mixins.scss:81-84`): a border in
  `--color-window-border`, plus `platinum-window-box-shadow` (`:70-74`): an
  inner bevel (system-05, window-border-outset) and a 1 px black outer shadow.
- `platinum-window-inner-border` puts a second border and bevel on the
  contents (`:111-114`, `_Window.scss:55-57`).
- OS 8 has "a narrow gray frame around all sides of the content region" that
  works as the drag region (HIG8 p.100).

**Difference:** S7 has no inner bevel, no gray drag frame and no contents
border. The 1 px black shadow already matches.

**B&W vs color:** The frame and shadow are black in both, while the window is
active. Inactive differs (§17).

**Implementation note:**
- **Existing:** package mixins without the bevel layers.
- The thin S7 frame (1 px versus Platinum's frame plus bevel) depends on
  window-chrome knobs: `window.borderSize` and the derived
  `--window-frame-inset` / chrome heights in `getThemeVars`. Verify those
  derivations allow a 1 px total frame, with contents flush against the
  border and the scroll bars overlapping the frame line.
- **Possibly new:** if the drag area is the whole frame in core behavior,
  restricting dragging to the title bar is behavioral. It is optional; the
  look does not depend on it.

## 11. Title bar (stripes, title, height)

**System 7** (p.138–139, figs 5-2, 5-4; measured from fig 6-4 B&W and color):
- **Height:** 19 px including the top frame line and the 1 px line under the
  bar. "make sure the title bar is at least 19 pixels high, the height of a
  document window title bar" (p.138).
- **Racing stripes:** six 1 px horizontal lines on alternate rows (rows 4, 6,
  8, 10, 12 and 14 counting the top frame line as row 0).
  - B&W: black lines on white. They begin 1 px inside the left frame and stop
    1 px before the right frame.
  - The stripes break for the close box and the zoom box, with 1 px of
    background on each side of each box.
  - They also break around the title, leaving about 6–7 px of background on
    each side of the text.
- **Color (measured):**
  - The bar is beveled. A 1 px light lavender highlight (#d8daea) runs along
    the top and left inside the frame; a 1 px lavender-gray shadow (#bbbeda)
    runs along the bottom and right.
  - The face is near-white (#f4f5f5) and the stripes are mid gray (#969897).
  - "On color screens, the scroll bars and the racing stripes in the title bar
    are gray" (p.135).
- **Title:** Chicago 12, black, centered on the stripes. It is clipped (the
  HIG gives no clipping rule) and drawn on a background gap.
- **Window colors** are user-selectable in the Color control panel (Standard,
  Gold, Green, Turquoise, Red, Pink, Blue, Gray, Black & White; fig 5-5,
  p.137). The tints affect frames and controls.

**Platinum today:**
- `titleBarHeight: 19` (`platinum.json:51`).
- Stripes are art (`windowStripes`, `title-bar-center.svg`) on center and
  side bands (`platinum-title-bar-stripes`, `_mixins.scss:262-290`; active in
  `_Window.scss:95-97`).
- Band margins are `--window-padding-size` (`ClassicyWindowTitleBar.scss:91-110`).
- Title text uses Charcoal.

**Difference:**
- S7 stripes are 1 px solid lines, not Platinum's beveled pinstripe art.
- The S7 B&W bar has no bevel at all.
- The color bar has the lavender highlight and shadow pair.
- The gaps between stripes, boxes and title differ: S7 uses 1 px around the
  boxes and about 6 px around the title.

**B&W vs color:** Black on white vs gray on near-white with a lavender bevel.

**Implementation note:**
- **Existing:** register `windowStripes` art per variant, a 2 px-period
  repeating tile, so the stripe *period* survives any band width. Do the bevel
  in package CSS.
- **Check:** the band margins come from `--window-padding-size` (6 px in
  Platinum). The 1 px box gaps need the control-box margin and padding
  (`ClassicyWindowTitleBar.scss:118-124` uses `--window-border-size`) and the
  `column-gap: var(--control-bevel-lg)` to be overridable. Override them in
  the package or turn them into knobs. Do not use pixel literals; the pixel
  gate forbids them.
- **Optional, as theme data:** the Color control panel's window tints could
  be presets of the color variant.

## 12. Close box

**System 7** (p.152, fig 5-22, fig 5-4; measured):
- 11 × 11 px at the left of the title bar. Its outer square starts 8 px in
  from the frame's inner edge (the stripes run 6 px before it) and sits on
  stripe rows 4–14.
- B&W: a 1 px black square with a white inside, no glyph (fig 6-4, B&W).
- Color, an engraved well:
  - The outer ring is dark blue-gray (#3d4885) on the top and left and light
    lavender (#d8daea) on the bottom and right.
  - Inside it sits a raised square: light top-left and dark bottom-right
    edges.
  - The fill is gray (#bebfbf).
- Hidden when the window is inactive (p.140).

**Platinum today:**
- `window.controlSize: 12` (`platinum.json:48`).
- `platinum-window-control-box-depressable`: a 135° gradient face, a dither
  art layer at 25% opacity blended by luminosity, a black border and an inset
  bevel (`_mixins.scss:116-152`).
- Pressed: a darker gradient (`:140-144`).
- Order is close 10, title 20, zoom 30, collapse 40
  (`ClassicyWindowTitleBar.scss:33-43, 63`).

**Difference:**
- 11 px vs 12 px.
- B&W is a plain empty square; color is an engraved well rather than a
  gradient with dither.

**B&W vs color:** As above.

**Implementation note:** **Existing:** set `controlSize: 11` (a knob); draw
the faces in package CSS and drop the dither layer. The pressed state is not
in the HIG (see open questions). The arrangement is unchanged: close at left,
order 10.

## 13. Zoom box

**System 7** (p.168, fig 5-38; measured from fig 5-4):
- 11 × 11 px at the right end of the title bar, with the same gaps as the
  close box. It is the *only* box on the right.
- Glyph: a smaller square inside, in the upper-left corner, drawn with its
  right and bottom edges, as nested squares.
- B&W: black lines on white. Color: the same engraved well as the close box,
  with the inner square in dark blue-gray lines.
- "The user must drag or resize a window at least seven pixels to cause a
  change in the user state" (p.168).

**Platinum today:** Zoom (order 30) sits left of the collapse box (order 40).
The glyph is `zoomGlyph` art (`_Window.scss:39-44`). OS 8 adds horizontal and
vertical zoom variants (HIG8 p.104-105).

**Difference:** No collapse box to its right. Different glyph art.

**Implementation note:** **Existing:** register `zoomGlyph` art and hide the
collapse box (see §19). The zoom box then lands at the far right with no
reordering.

## 14. Size box (grow box)

**System 7** (fig 5-2, fig 5-4, p.156; measured):
- The size box fills the 15 × 15 px square where the vertical and horizontal
  scroll bars meet, at the lower right. It is bounded by the scroll bars' 1 px
  lines.
- Glyph: two overlapping squares, a small one at upper left and a larger one
  at lower right.
- Color: blue-gray (#455289) outlines, lavender fill, on a near-white cell.
- B&W: black outlines on white.
- Resizing draws a dotted outline, with the upper-left corner anchored (p.156,
  fig 5-26).
- Hidden on inactive windows (p.140).

**Platinum today:** `layout.window.growBoxCorner: "bottom-right"`
(`platinum.json:1995-1998`). The grip is diagonal-line art (`windowGrip`,
`resizer.svg`; `_Window.scss:51-53`), hidden when dimmed (`:136-138`).

**Difference:** Glyph shape (overlapping squares vs diagonal grip). In S7 the
grow box is a *cell* of the scroll-bar grid with its own outline.

**Implementation note:** **Existing:** register `windowGrip` art. **Check:**
the cell outline (1 px lines on its top and left, from the scroll bars) may
already appear where both scroll bars exist. A window with no scroll bars
still shows the size box with its lines (not shown in these chapters; see open
questions).

## 15. Scroll bars

**System 7** (p.158–164, figs 5-4, 5-28, 5-30, 5-32; measured):
- **Width:** 16 px including the 1 px outline. The outline overlaps the
  window frame on the outer edge.
- **Arrows:** one arrow at each end, so up at top and down at bottom (fig
  5-28). They are not paired.
  - Each arrow sits in a 15 × 15 cell divided from the track by a 1 px black
    line.
  - The arrow is an outlined "house" arrow (a triangle on a stem).
  - Color: blue-gray outline (#455289), lavender fill (#bcbfda), white
    top-left highlight and gray (#a5a5a5) bottom-right edge in the cell.
  - B&W: a black outline on white.
- **Gray area (track):**
  - Color: a 25% dot pattern, #b4b4b4 on #ececec, one dot in every 4 pixels
    on alternate rows.
  - B&W: the same 25% black-on-white pattern ("ltGray").
  - "A scroll bar is a light gray rectangle" (p.158).
- **Scroll box (thumb):** a 15 px square.
  - Color: beveled, with a gray (#828282) top-left edge, a lavender inner
    highlight, a blue-gray (#4a558b) bottom-right edge, a #cdcdcd fill, and
    ridged grip lines in the middle (fig 5-4 shows "|||" on a horizontal
    thumb, "≡" on a vertical one).
  - B&W: a white square with a black outline (implied; not shown enlarged).
- **Inactive scroll bars** (document fits the window): "the rectangles are
  outlined, but there is no gray area, no scroll box, and the arrows are
  hollow (their outlines appear)" (p.160, fig 5-30). In color the hollow
  arrows are gray outlines on a flat #f4f4f4 track (measured).
- **Inactive window:** "don't show the elements of the scroll bar at all; only
  the outline of the scroll bar as a whole should appear" (p.160).
- **Additions:** a split bar 5 px high at the top of the vertical bar or left
  of the horizontal bar (p.170, figs 5-40, 5-41). A status or page indicator
  may sit left of the horizontal bar (p.161–162).
- **Dragging the thumb:** it snaps back when the pointer leaves "by a little
  more than the width of the scroll box" (p.165).

**Platinum today:**
- `window.scrollbarSize: 17` (`platinum.json:50`).
- Arrows are drawn as gradient-stripe triangles (`_scrollbars.scss`).
- The thumb grip is set by `scrollbar.thumbGripWidth/Height` knobs
  (`platinum.json:126-129`).
- Platinum has the OS 8 "Smart Scrolling" arrangement options.

**Difference:**
- 16 px vs 17 px.
- House-shaped outlined arrows vs solid triangles.
- A 25% dotted track vs Platinum's gray track.
- One arrow at each end only.
- The inactive and inactive-window states hide the elements entirely.

**B&W vs color:** Pattern and arrow colors as above.

**Implementation note:**
- **Existing for the look:** the `scrollbarSize` knob, and package overrides
  of the `_scrollbars.scss` mixins. Draw the 25% track as a tiny registered
  pattern art (as with `halftone`) or a gradient.
- **Check for the states:** whether the core exposes (a) "document fits"
  (disabled) and (b) the inactive window state to scroll-bar selectors.
  `:where(.classicyWindow).inactive` exists, so (b) is CSS.
- **Risk:** if the scroll bars are native `::-webkit-scrollbar` pseudo
  elements, Firefox cannot draw the pattern, house arrows or inactive
  hiding. Platinum already faces this.

## 16. Window move and resize feedback

**System 7** (p.133, p.154–157, figs 5-24, 5-26):
- Moving: "As the user drags, a dotted outline of the window moves with the
  pointer until the user releases" (p.154).
- Resizing: a dotted outline follows the lower-right corner (p.156).
- Command-drag moves an inactive window without activating it (p.155).

**Platinum today:** A dotted outline drag and resize (`_Window.scss:117-128`,
`border: var(--control-padding-tight) dotted`).

**Difference:** None in concept. The S7 outline is a 1 px gray-pattern
(dotted) rectangle.

**Implementation note:** Existing.

## 17. Inactive window appearance

**System 7** (p.139–141, figs 5-3, 5-8, 5-9, 5-30):
- "The close box, zoom box, size box, scroll box, and stripes in the title bar
  disappear. Don't display the scroll bars and their associated controls …
  the lines that outline the area of the scroll bar itself should remain
  visible" (p.140).
- The title stays, drawn in gray on color screens (fig 5-8, "untitled"
  grayed).
- "The borders of inactive windows are gray and appear to recede into the
  background so that the active window's black frame emphasizes its position"
  (p.135).
- Measured from fig 5-30 (color): the frame and title-bar line are #828282
  gray. The drop shadow stays black. The scroll-bar outline lines stay black.
  The title bar is plain white with no stripes and no bevel.
- Don't show a selection in an inactive window (fig 5-9). A secondary
  selection may be an outline in B&W or gray in color (p.140).

**Platinum today:**
- The base sheet dims every inactive window with
  `filter: contrast(0.6) brightness(1.25)`
  (`src/SystemFolder/SystemResources/Window/ClassicyWindow.scss:450`, base).
- Control boxes go to `opacity: 0` (`ClassicyWindowTitleBar.scss:121`).
- The stripes are only drawn when `.active` (`_Window.scss:95-97`).

**Difference:** S7 recolors only the frame (gray) and the title, and empties
the scroll bars. A whole-window contrast filter would gray the white content
and the black shadow, which S7 never does.

**B&W vs color:** The HIG shows only the color case. On a 1-bit screen there
is no gray frame (see open questions).

**Implementation note:**
- **Existing:** the package can set `filter: none` on `.inactive` and recolor
  the border and title, because the package layer beats base.
- The 1-bit variant needs a decision on whether the frame stays black or uses
  a 50% dither. The dither would need an image border or pattern art.
- **Note:** the base filter is "look in base". Consider moving it into
  Platinum, as the CLAUDE.md package rules do for other looks.

## 18. Utility (floating) windows and palettes

**System 7** (p.137–138, fig 5-6; also p.95 for tear-offs):
- "Most utility windows don't have titles. The standard drag region at the top
  of utility windows is 11 pixels high" (p.138).
- A titled utility window has a title bar at least 19 px high: "Fill the title
  bar with a 25 percent pattern. Don't use racing stripes in a utility window
  title bar. You can include a close box and a zoom box" (p.138).
- Utility windows float above documents and hide when their application is in
  the background (p.138). They come after document windows in the display
  order (p.145, fig 5-13).

**Platinum today:**
- `window.utilityTitleBarHeight: 10` (`platinum.json:52`).
- The texture is art (`windowUtilityTexture`, a 4 × 3 tile of radial
  gradients; `_Window.scss:80-91`; `utilityTitleBar` knobs, `platinum.json:191-194`).
- OS 8 uses a crosshatch drag region (HIG8 p.102).

**Difference:**
- 11 px vs 10 px.
- A 25% black-on-white dot pattern (in color, gray on white) vs Platinum's
  crosshatch.
- The S7 utility close box is smaller (fig 4-55); its exact size is not
  given.

**B&W vs color:** The pattern is black on white in B&W. The color
appearance is not specified (see open questions).

**Implementation note:** Existing knobs and art: `utilityTitleBarHeight: 11`,
and register `windowUtilityTexture` as a 4 × 4 25% dot tile with
`utilityTitleBar.textureWidth/Height = 4`.

## 19. Parts Platinum has that System 7 lacks (windows)

- **Collapse box** (WindowShade): new in OS 8 (HIG8 p.103). The S7 HIG has
  none. WindowShade existed in System 7.5 only as a double-click on the title
  bar.
  - **Implementation:** hide `[data-classicy-control="collapse"]` in the
    package. This is allowed: "a package only reorders or hides". Collapsing
    stays reachable by other routes, such as a title double-click, if the core
    has one.
- **Gray drag frame on all sides** and a **beveled contents border**: hide or
  zero them through package CSS and knobs (§10).
- **Window header bevel** (`classicyWindowHeader`, `_Window.scss:60-70`) and
  placards: these are OS 8 controls. The S7 equivalent of a header is a plain
  1 px separator line, for example the Finder list header (not in these
  chapters).
- **Red movable-alert title bar** (`_Alert.scss:255-257`, HIG8 p.61): S7 has
  no movable alert. Use plain stripes, or treat it as a movable modal.
- **Sticky menus** and **contextual menus**: OS 8 additions (HIG8 p.92–93).
  The S7 look still applies to the contextual menu frame.

---

## 20. Window display order and positions

**System 7** (p.143–152):
- New windows open at the upper left of the screen, each one "below and to
  the right of its predecessor" (p.147, fig 5-15).
- Untitled windows are titled "untitled", then "untitled 2", and so on
  (p.142–143).
- Dialogs and alerts are "horizontally centered … with one-fifth of the
  vertical desktop area (not including the menu bar) above it" (p.150, fig
  5-19). A dialog for a document is placed over its window, leaving one-fifth
  of the document visible above it (p.151, fig 5-20).
- Layers from bottom to top: documents and modeless dialogs; floating windows;
  modal and movable modal dialogs (p.144–146).

**Platinum today:** The core cascades windows at `30 + 10·n` (G18 in
CLAUDE.md). Modal placement is the core's (`ClassicyWindow.centering`
tests).

**Difference:** These are behavior rules, not look rules. The one-fifth
vertical placement may differ from the core's centering.

**Implementation note:** A shared core behavior, not a package concern. Note
it only if parity is wanted.

---

## 21. Modeless dialog box

**System 7** (p.178–181, figs 6-2 to 6-5):
- "A modeless dialog box looks like a window without a size box, zoom box, or
  scroll bars" (p.178). Its frame and title bar match the document window:
  stripes, close box, 1 px frame plus drop shadow (measured from fig 6-4).
- "A modeless dialog box always has a close box; don't implement buttons to
  make the window disappear" (p.180).
- The title is the menu command without its ellipsis (p.179).
- It is dimmed like an inactive window (fig 6-3, the right Info window: gray
  title, no stripes).

**Platinum today:** A document window with close and **collapse** boxes:
"a close box on the far left … and a collapse box on the far right" (HIG8
p.64).

**Difference:** No collapse box. Frame differences as in §10–11.

**B&W vs color:** Fig 6-4 shows both. The color version has the lavender
bevel and the engraved close box (measured).

**Implementation note:** Existing (`zoomable={false}`, `resizable={false}`);
hide collapse as in §19.

## 22. Movable modal dialog box

**System 7** (p.185–188, figs 6-7 to 6-11; measured from fig 6-8):
- "adds a title bar with racing stripes to the standard modal dialog box
  window. A movable modal dialog box does not have a close box or zoom box"
  (p.186).
- Measured, B&W:
  - A title bar with the six stripes, spanning from 2 px inside the frame to
    2 px before it. There is no box gap, because there are no boxes.
  - Below the title bar the **modal double frame** continues down the sides
    and bottom: 1 px outer black, 2 px white, 2 px black inner line. The inner
    2 px line also runs directly under the title bar.
  - **No drop shadow.**
- Measured, color: the title bar as in §11 (lavender bevel, gray stripes).
  Below it, the color modal frame bands of §23.
- Clicking another window of the same application plays the alert sound
  (p.185).

**Platinum today:** A modal window stays movable unless `type="error"`
(`ClassicyWindow.tsx:304-311`). The modal title bar class is
`classicyWindowTitleBarModal` (`ClassicyWindowTitleBar.tsx:22, 89`). Modal
contents get a black top border and the Platinum box-shadow
(`ClassicyWindow.scss:237-245`; `_Window.scss:72-74`).

**Difference:**
- S7 adds the double frame and drops the drop shadow.
- The title bar stripes run the full width.

**Implementation note:** Existing structure (the modal title bar exists). The
double frame can be layered borders or box-shadows on the window and the
modal contents, recolored per variant. **Check:** there is no drop shadow on
modal windows, while the core's modal rules may add one through Platinum's
mixins only.

## 23. Modal dialog box (fixed)

**System 7** (p.188–193, figs 6-12 to 6-16; measured from fig 6-14):
- "Modal dialog boxes are framed by a double-outline border that doesn't
  include a drag region. The outer line is one pixel thick and the inner line
  is two pixels thick. A modal dialog box cannot be moved or resized" (p.190).
- **B&W (measured):** 1 px black, then **2 px white**, then **2 px black**,
  then the white content. No title bar and no drop shadow.
- **Color (measured):** 1 px black, then a **3 px band** of
  #d8daea (light) / #d0d2d1 (mid) / #999db7 (dark), in the same order on all
  four sides (concentric, not a bevel), then **1 px black**, then the white
  content. "Users can change the colors of standard dialog boxes by using the
  Color control panel" (p.177).
- Content is white. Dialog text is 12-point (system font) (p.176).

**Platinum today:**
- OS 8 modal dialogs "display their content on a placard-like background"
  (HIG8 p.60). They have a gray face; bevels are excluded from measurement
  (HIG8 p.67).
- `ClassicyWindowContentsModal` has a `--color-window-frame` background
  (`ClassicyWindow.scss:237-245`).
- Classicy modal windows still render a title bar (`classicyWindowTitleBarModal`).

**Difference:**
- A white content area vs a gray placard face.
- A double outline vs a bevel.
- No title bar at all on a fixed S7 modal.

**B&W vs color:** The B&W inner line is 2 px. In color it is 1 px, with the
3-step band between it and the outer line.

**Implementation note:**
- **Existing:** frame and colors in package CSS; content background through
  `--classicy-window-contents-bg`.
- **Possibly new:** hiding the title bar for a *fixed* modal (an `error`-type
  or unmovable modal) needs a selector that tells fixed from movable modals.
  Check for a state class such as `type="error"` or a non-movable modal flag
  on the root. Otherwise the package cannot hide the bar only for fixed
  modals.

## 24. Stacked modal dialogs

**System 7** (p.192, fig 6-16): "make sure that the first dialog box (the one
in the background) is dimmed … You dim the dialog box by dimming the border and
buttons, and by unhighlighting any text selection." In fig 6-16 the background
dialog's buttons and list text are drawn in gray, or stippled, and the
foreground alert keeps its black frame.

**Platinum today:** The modal scrim (`classicyWindowModalScrim`,
`ClassicyWindow.scss:343-357`) and the inactive filter.

**Difference:** S7 dims the *underlying dialog's* border and controls, not
the screen.

**B&W vs color:** B&W needs the dither-text technique from §3 for dimmed
buttons and borders.

**Implementation note:** The inactive state applies to the background modal
window, so this is existing CSS plus the dither technique (§3).

## 25. Alert boxes

**System 7** (p.193–196, figs 6-17 to 6-20, 5-23):
- "An alert box contains only an icon, text, and buttons" (p.193). It uses the
  standard modal double-outline frame (fig 6-17, both variants).
- **Note alert:** "the talking face icon" (p.194). Usually one OK button.
- **Caution alert:** "the triangle with an exclamation point" (p.195). Always
  two buttons; OK or Continue is the default unless data is at risk.
- **Stop alert:** "the hexagon with an open hand" (p.196). Usually one OK
  button.
- **Message text:** one style throughout, Chicago 12 bold-looking (system
  font) (figs 6-18 to 6-20).
- **Save changes alert** (p.201–202, fig 6-25; also p.102–104):
  - Caution icon.
  - Buttons Save (default, lower right), Cancel to its left, and Don't Save
    left-aligned with the message text.
  - Centered horizontally on the screen, or over the active window on a large
    screen (fig 4-65).
- Alerts are not movable and have no title.

**Platinum today:**
- OS 8 alerts "feature two distinct styles of text display. The box's label
  appears in the boldfaced version of the system font, while the narrative
  below it appears in the plain text version of the small system font" (HIG8
  p.61).
- Up to four buttons, including Help (HIG8 p.61).
- A movable variant with red title stripes (`_Alert.scss:255-257`).

**Difference:**
- S7 uses a single text style, not a bold label plus a small narrative.
- S7 has no movable alert and no Help button.
- Icons: the S7 note icon is the "talking face", which OS 8 also used. The
  S7 stop and caution icons are 1-bit black glyphs (figs 6-19, 6-20).

**B&W vs color:** The frame differs as in §23. The figures show the icons in
black and white only, and the color variant uses the same icons.

**Implementation note:**
- **Existing:** alert icons are swappable assets in the per-package icon
  registry. The frame is the modal frame.
- **Check:** whether `ClassicyAlert` renders the label and narrative as
  separate elements whose styles a package can make identical. If both come
  from props, set the same font and size on both in package CSS.

## 26. Push buttons and the default button ring (in dialogs)

**System 7** (figs 6-4, 6-8, 6-14, 6-17, 6-21; measured from fig 6-4 B&W):
- A push button is a **rounded rectangle with a 1 px black outline and a white
  face** (about 4 px corner radius), labeled in Chicago 12.
- The **default button** has a **3 px black ring** outside the button,
  separated from it by **1 px of white**. The ring is rounded concentric with
  the button, about 7–8 px outer radius (measured).
- In color, the button and ring stay black on white (figs 6-8, 6-14, 6-17).
- Button behavior is detailed in chapter 7 (p.205–206), outside these
  chapters.

**Platinum today:**
- A raised gray bevel button (`platinum-window-depressable`,
  `_mixins.scss:154-185`).
- The default ring is three box-shadow layers: system-04 1 px, system-02 to
  `--control-frame-width`, black to `--button-default-ring` (3 px)
  (`_Button.scss:272-288`).

**Difference:**
- A white flat face and 1 px outline vs a gray bevel.
- The S7 ring is solid black 3 px with a 1 px white gap, where Platinum's has
  gray inner layers.

**B&W vs color:** The same in both.

**Implementation note:** Existing: box-shadow layers recolored (white gap,
black ring) in the package. The pressed state (inverted: black face, white
text) is a chapter 7 topic.

## 27. Dialog layout spacing

**System 7** (p.196–197, fig 6-21): "A = 13 white pixels, B = 23 white
pixels". Measured from fig 6-21:
- The alert icon (32 × 32) sits **23 px** from the inner frame line on the
  left and **13 px** from the top.
- The message text starts about 23 px right of the icon.
- Buttons sit **13 px** from the right and bottom inner edges.
- There are 13 px between the text block and the button row, and the gap
  between buttons is also given as 13 px (labeled A).
- "Place the action button in the lower-right corner with the Cancel button to
  its left" (p.196).

**Platinum today:**
- `layout.dialogEdge: 12`, `button.gap: 12` (`platinum.json:59-75`).
- `dialog.alertMinWidth/MaxWidth` and similar (`platinum.json:171-180`).

**Difference:** 13 vs 12 px. The icon inset is 23 px.

**Implementation note:** Existing knobs (`layout.dialogEdge`, `button.gap`).
An alert-icon inset may need its own knob if the alert layout derives it from
`dialogEdge`.

## 28. Keyboard focus on scrolling lists in dialogs

**System 7** (p.198, fig 6-22): "When a scrolling list is the active element
in a dialog box, its visual indicator is a rectangular border of two black
pixels, which is separated from the list by one pixel of white space." No ring
is drawn when the list is the only keyboard target (p.199).

**Platinum today:** OS 8 focus rings use the accent color (HIG8 p.100,
"focus rings").

**Difference:** A black 2 px border with a 1 px white gap vs the accent focus
ring.

**B&W vs color:** The same in both.

**Implementation note:** Existing: the focus ring is a package CSS look. Use
outline plus outline-offset, or box-shadow layers.

---

## Ranked: the 10 differences that most define the System 7 look

1. **Flat white chrome with a 1 px black frame and a 1 px black drop shadow**:
   no bevels, no gray drag frame, no gray faces, on windows, menus and pop-ups
   (§2, §10, §8).
2. **Title bar of six 1 px racing stripes**: black on white in B&W, gray on
   near-white with a lavender highlight in color. The stripes break cleanly
   around the 11 px boxes and the title (§11).
3. **Two title-bar boxes, close at left and zoom at right, with no collapse
   box**. In color the boxes are engraved lavender and blue-gray wells; in B&W
   they are empty squares (§12, §13, §19).
4. **Black inverted highlighting**: menu titles, menu items, the pop-up label
   while open, and the menu flash, in both variants (§1, §3, §8).
5. **The modal double-outline frame**: 1/2/2 px in B&W, 1 px plus a 3-step
   lavender band plus 1 px in color. White content and no shadow (§22, §23).
6. **Chicago 12 everywhere**: menus, titles, pop-ups, dialog and alert text,
   buttons (p.60, p.88, p.176).
7. **The scroll bar**: 16 px wide, a 25% dotted gray track, outlined "house"
   arrows at each end, a square thumb. Elements disappear on inactive windows
   and when the document fits (§15).
8. **White menu bar** with rounded black screen corners, a rainbow apple
   (color) or black apple (B&W), and icon titles for Help and Application
   (§1).
9. **Push buttons**: white rounded rectangles with a 1 px outline. The default
   button has a 3 px black ring with a 1 px white gap (§26).
10. **B&W-specific dithering**: dotted menu dividers, stippled dimmed text,
    25% patterns in scroll tracks and utility drag bars (§3, §4, §15, §18).

## New capabilities likely needed (beyond package CSS, art and knobs)

- **Dithered or stippled text and lines for the 1-bit variant** (dimmed menu
  items, dimmed buttons, stacked-dialog dimming). There is no vocabulary for
  it today. It could be a registered pattern art plus a mixin; no core change
  if done as a mask.
- **A selector that tells fixed modals from movable modals**, so a package can
  hide the title bar on fixed modals only (§23).
- **An open state reaching the pop-up's label and indicator**: label inversion
  and the triangle hiding while open (§8).
- **Help menu title as an icon** in the menu bar (§1), if the help cluster
  cannot already show art in place of its text.
- **Scroll-bar states:** inactive-window hiding and "document fits" hollow
  arrows. Check that the core exposes them to CSS. Firefox styling of native
  scroll bars is a known limit (§15).
- **Possibly knobs** for the menu divider slot height (§4), the title-bar box
  gaps and column gap (§11), and the alert icon inset (§27), if they are not
  already themable. The pixel gate forbids literals, so these must be knobs or
  derivations.

## Open questions (the HIG is silent or ambiguous)

1. **Inactive windows in 1-bit.** The HIG shows only color: a gray #828282
   frame and gray title. On a 1-bit screen, is the frame black, and is the
   title black or dithered? (p.135, p.140, fig 5-8.)
2. **Pressed states of the close and zoom boxes.** They are not described. In
   real System 7, the B&W close box shows a "starburst" when pressed and the
   color box darkens. That is from memory, not the HIG; needs a source.
3. **Pressed and disabled push buttons** are deferred to chapter 7
   (p.205–206). Out of this report's scope.
4. **Exact color values.** The PDF figures may be color-managed (#f4f5f5 vs
   the expected #EEEEEE face, #3d4885 vs #4a558b for the same blue-gray in two
   figures). Confirm the 1995 "Standard" window color table (`wctb`) values
   from Inside Macintosh or a real system before freezing tokens.
5. **Scroll-box grip ridges.** Fig 5-4 (p.136) shows ridges on the color
   thumb. Is that the 7.5 look or the 7.0 look? The B&W thumb is never shown
   enlarged.
6. **Utility window close box size, and the color utility drag pattern.**
   Neither is given; fig 4-55 suggests a smaller box (p.95, p.138).
7. **Size box on a window without scroll bars.** Not covered in these
   chapters.
8. **Menu shadow on pop-ups and submenus.** Is the right-edge shadow offset
   1 px from the top, as on windows, or does it start at the top row, as on
   pull-downs hanging from the bar? Only pull-downs were measured.
9. **Title text clipping and truncation**, and the exact gap around the title
   (measured about 6–7 px, not specified).
10. **Number of blinks for a chosen menu item** ("blinks briefly", p.56). In
    real System 7 this is set by the Menu Blinking setting in General
    Controls (default 3); confirm.
11. **Menu-bar corner radius.** The rounded screen corners appear in figures
    but the radius is not stated (measured about 5 px).
12. **Window tints from the Color control panel** (fig 5-5, p.137). Are they
    in scope for the color variant as presets?
