# System 7 HIG research: Controls, Icons, Color (for a System 7 Appearance Package)

Source: *Macintosh Human Interface Guidelines* (Apple, 1995), `packages/appearance/platinum/resources/Apple_HIGOS7_1995_Guidelines.pdf`.
**Page offset: PDF page = printed page + 24** (printed p.203 = PDF p.227). All "p.N" below are printed pages.

Method. I read the text with `pdftotext -layout` and looked at every figure in Ch. 7, 8 and 9, plus Ch. 5 Figures 5-28/5-30 (scroll bars) and Ch. 10 Figures 10-7/10-14/10-15 (selection and dragging). The figures are screen captures embedded at **1:1 screen pixels**, losslessly, so `pdfimages -png` gives the exact pixels. Every pixel measurement and hex color below comes from an ASCII dump of those rasters. Where a value is an inference rather than HIG text or a measured pixel, the report says so.

Most HIG figures are **System 7.5 color captures**, with tinged window frames. A few are 1-bit or grayscale captures (Figs 7-10, 7-11). There is no full black-and-white screenshot of scroll bars or a window frame in these chapters (see Open questions).

Shorthand: "S7" = System 7 as the HIG shows it; "P" = Platinum today.

---

## 0. Cross-cutting rules (Ch. 9 and Ch. 8)

| Rule | HIG | Consequence for the package |
|---|---|---|
| "The window background remains white on all systems." | p.258 | Window and dialog content is `#FFFFFF`. Platinum's dialog and control-panel face (`system-02`/`system-03` gray) does not exist in S7. |
| "On color screens, the racing stripes in the title bar and the scroll bars are gray. The user controls—close box, size box, zoom box, and scroll box—are colored… The borders of inactive windows are gray." | p.258 | Color is applied **only to the window frame, title bar, scroll bars and frame controls**. |
| Fig 9-2: "a dialog box with a colored frame, but black radio buttons and text." | p.259 | In the **color** variant, push buttons, checkboxes, radio buttons, little arrows, pop-ups, text fields and lists stay pure black on white, with no tint and no bevel. |
| "For display on color screens, use true gray wherever you previously used a 50 percent gray pattern." Also "true gray" for menu separators and dimmed menu items. | p.260; checklist p.353 | **The defining B&W-vs-color switch**: every 50% dither in 1-bit becomes a solid gray in color. |
| Highlighting: "On black-and-white screens, highlighting means turning white to black and black to white… On color screens… colors are darkened when selected, not reversed… The default for the highlight color is always black." | p.260 (also p.286) | Selection is inversion in B&W. In color, icons darken; the text highlight is the user's highlight color, which defaults to black. |
| Pointer "should remain black". | p.260 | Black arrow cursor in both variants. |
| "Keep black-and-white designs two-dimensional… Don't… mimic color effects, such as shadows, in black-and-white designs." | p.263, Fig 9-5 | **The B&W variant has no bevels at all.** |
| "The Macintosh has a light source at the upper-left corner of the screen and a two-dimensional appearance." | p.262; p.232 Fig 8-13 | Where color shading exists (frame controls), the highlight is top-left and the shadow is bottom-right. Drop shadows are lower-right. |
| "Always design for black and white first and then colorize." Color "should be used redundantly". | p.263 | The color variant must be the B&W structure with fills tinted, never a different structure. |
| "Colors look best against a background of neutral gray." "Beware of blue" for text and thin lines. | p.265 | The default color desktop is neutral gray (measured `#CACACA` in Figs 8-1/8-18). |

### Colors measured in the HIG's color figures (S7.5 default window "tinge")

These come from Figs 7-1, 7-18, 5-28, 5-30, 9-1, 9-2, 8-1 and 8-18. Captures differ by a few levels: Fig 9-1 has `#EAEAEA`/`#B3B3B3` where others have `#ECECEC`/`#A8A8A8`.

| Role | Hex | Where seen |
|---|---|---|
| Lightest tinge (frame highlight, title-bar left/top highlight, scroll-box highlight) | `#D6D8EA` | All color frames |
| Light tinge (title bar bottom edge, frame bottom) | `#B2B5D4` | Figs 9-1, 5-30 |
| Outline-triangle fill tinge | `#A8ABCE` | Fig 7-18 |
| Mid tinge (dialog frame band, scroll-box grip lines) | `#898BB2` | Figs 7-1, 7-18, 9-1 |
| Dark tinge (scroll-arrow outline, close/zoom box outline, scroll-box shadow) | `#46528B` | Figs 7-18, 9-1, 5-30 |
| Title-bar background | `#F5F5F5` | All |
| Scroll track base / arrow-box face | `#ECECEC` | Figs 7-18, 9-1 |
| Frame gray band (dialogs) | `#D8D8D8` | Figs 7-1, 7-4 |
| Scroll-box / close-box face | `#CDCDCD` | Figs 7-18, 9-1 |
| Racing stripes, track dither dots, inactive-arrow outline | `#A8A8A8` | All |
| Inactive window frame | `#828282` | Fig 5-30 |
| Inactive title text | `#B4B4B4` | Fig 5-30 |
| Desktop (color, default) | `#CACACA` (solid) | Figs 8-1, 8-18 |
| Black / white | `#000000` / `#FFFFFF` | Everywhere |

Platinum today: `platinum.json` `defaults.color` has `system` (7 grays, `#EEEEEE` to `#202020`) and `theme` (a 7-step lavender/blue ramp, `#EEEEEE`, `#CCCCFF`, `#9999FF`, `#6666CC`, `#333399`, `#000088`, `#000055`). The S7 tinge is a **desaturated periwinkle ramp** (`#D6D8EA` to `#46528B`). It maps onto the `theme` slots as a preset; it needs no new color targets.

---

## 1. Push buttons (and the default button)

**System 7** (p.204–207, Figs 7-1, 7-2, 7-3, 7-4; measured from Fig 7-1)
- "A button is a rounded rectangle that is named with text." "Standard button height is 20 pixels." "The standard width for OK and Cancel buttons is 59 pixels." (p.204–205)
- Measured: a 1-px black outline on a **white** face, corner radius about **4 px** (arc spans 4×4 px; row offsets 3,1,1,0). No bevel and no shadow, in color figures too.
- Label: "Button names usually appear in 12-point Chicago." (p.207)
- **Default button**: "draw an additional border of three black pixels, separated by a border of one white pixel, around it" (p.206). Measured in Fig 7-1: button outline, then a 1-px white gap, then a 3-px black ring. The ring's outer box is 28 px tall around a 20 px button, and the ring's corner is also rounded (about 5 px outer radius).
- **Pressed**: "the button highlights (inverts)" (p.205). Fig 7-2 measured: the interior fills black and the label turns white. The white gap and the black ring stay. Keyboard activation inverts "for eight ticks" (p.205).
- **Dimmed**: "On a black-and-white monitor, a dimmed button and its name are dithered to 50 percent gray. On color systems, dimmed items appear in true gray." (p.207) In the figures (7-4 "Delete", 7-11 "Eject"), the **frame stays solid black** and only the label is masked through a 1-px checkerboard. That is the Control Manager's grayed-text behavior, and it differs slightly from the text.

**Platinum today**: `styles/components/_Button.scss:9-43`, `_mixins.scss:154-219` (`platinum-window-depressable`, `-depressed`, `-depressable-default`). There is a gray `system-02` face with a two-step inset bevel. Pressed is `system-05` gray with white text. Disabled is `system-03` face with `system-05` text and border. The default ring is three box-shadow layers (system-04, system-02, black) reaching `--button-default-ring`. HIG8 p.20–21, Fig 2-3. The face font is Charcoal (`typography.ui`).

**Difference**: Flat white face instead of a bevel. Pressed is full **inversion** (black fill, white text) instead of a gray depressed bevel. The default ring is a 1 px white gap plus 3 px black, not Platinum's gray-banded ring. The font is Chicago 12, not Charcoal. The radius is about 4 px.

**B&W vs color**: Identical except the dimmed state: a 50% dithered label (and, per the text, frame) in B&W, true gray in color. Buttons are never tinted (Fig 9-2).

**Implementation note**: Package SCSS. Override the `platinum-window-*` equivalents with `border:1px solid black; background:white; border-radius:4px`. Use `.pressed`/`:active` for `background:black; color:white`. Use `.default` for `box-shadow: 0 0 0 1px white, 0 0 0 4px black`. Height 20 already matches `measurements.control.height` (20). `button.minWidth` is 58; S7 says 59. The dimmed dither needs a pattern (see §14).

---

## 2. Radio buttons

**System 7** (p.210–211, Figs 7-7, 7-8, 7-9; measured from Fig 7-8)
- A 12×12 px circle with a 1-px black outline and white fill. Selected: a **6×6 px solid black dot** (rounded, 4-px top and bottom rows) centered with a 2-px white gap. "The active setting has a dot in the middle of the button." (p.210)
- Labels in Chicago 12. Groups may be separated by "a dotted line around a group" (p.211). Fig 7-10 measured this as a 1-on/1-off dotted 1-px line.
- No color in the color variant (Fig 9-2).

**Platinum today**: Base `src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss:25-66` (the look still lives in base SCSS). It uses radial-gradient "pearl" shading from `system-01/02/05/07` and a soft box-shadow; checked is a dark radial gradient. HIG8 p.22.

**Difference**: Flat, with no gradients or shadow. A hard black dot instead of a shaded center.

**B&W vs color**: Same. Dimmed: in B&W the circle and label become a 50% dither, in color true gray (p.207 by extension; the HIG shows no dimmed radio).

**Implementation note**: Package SCSS overriding the base gradients. `classicy.package` beats `classicy.base`, so this works without base edits. The dot can be `radial-gradient(black 3px, white 3px)` inside a 12-px circle. A pixel-exact circle (the `4,2,1,1,0` staircase) needs **art** (SVG system art) if parity matters, because CSS `border-radius:50%` anti-aliases.

---

## 3. Checkboxes

**System 7** (p.211–213, Figs 7-10, 7-11, 7-12)
- "A checkbox is a square… When the option is on, an x appears in the box." (p.211)
- Measured: a **12×12 px square**, 1-px black border, white fill, square corners. Checked: **two 1-px diagonals running corner to corner** inside the border (an X that touches all four corners, Fig 7-10 "Italic"). It is not a ✓ glyph and not a typographic ×.
- Labels in Chicago 12. Dotted group boxes appear (Fig 7-10 "Style:" and "Justification:", dotted 1-px rectangles with the title breaking the line).

**Platinum today**: Base `Checkbox/ClassicyCheckbox.scss:1-41` uses a `system-03` gray face, a `content:'\2713'` check glyph with a text-shadow, and a `system-06` pressed face. The package adds a beveled border (`_Checkbox.scss:6-19`, `platinum-window-border`). `.classicyCheckboxX` is a "×" glyph (`ClassicyCheckbox.scss:48-55`). HIG8 Ch.2 Checkboxes p.25–28.

**Difference**: White face instead of gray, no bevel, an X of corner-to-corner diagonals instead of ✓, and a pressed state that inverts or highlights instead of gray. Pressed is not illustrated; the Toolbox highlights the box by thickening the frame, which is not in the HIG (open question).

**B&W vs color**: Same. Never tinted.

**Implementation note**: Package SCSS. The `::after` can draw the X with two `linear-gradient(to top right / to bottom right, transparent calc(50% - .5px), black, transparent calc(50% + .5px))` layers, or as registered **art** (crisper). The existing `classicyCheckboxX` glyph is not shaped right. 12 px equals `window.controlSize` (12).

---

## 4. Pop-up menus

**System 7** (Ch.4 p.86–88, Fig 4-46; measured from Figs 7-10, 7-12, 7-17)
- "The standard pop-up menu looks like a rectangle with a one-pixel border. It has a one-pixel drop shadow and contains a downward-pointing triangle." (p.87)
- Measured (Fig 7-12): an 18-px-tall box including the border, plus a 1-px black shadow on the right and bottom. The shadow starts 3 px in from the left and top ends. Square corners and a white face.
- Indicator: one **solid black down-triangle, 11 px wide × 6 px tall**, near the right edge, with no separator line and no arrow box.
- "Use… 12-point Chicago, plain in pop-up menus" (p.88).
- While open, "the triangle disappears", "its title is inverted", and the open menu "shows a checkmark next to the current selection" (p.87).

**Platinum today**: `_PopUpMenu.scss:9-24` uses `platinum-window-undepressable`: a rounded, beveled `system-02` face and a separate indicator showing the **double up/down arrows** art (`--classicy-art-popup-arrows`). HIG8 p.24.

**Difference**: Structural. S7 has one down-triangle and a square box with a 1-px drop shadow. P has a rounded beveled button with double arrows. S7 also inverts the label while open.

**B&W vs color**: Same (black on white). Dimmed: B&W 50% dither, color true gray.

**Implementation note**: Package SCSS (`border-radius:0; box-shadow:1px 1px 0 black; background:white`) plus **new art** for the single triangle, re-registered under the same system-art key `popup-arrows`. The 3-px shadow inset needs a pseudo-element if exact. Inverting the label while open needs the open state on the label (check that `ClassicyPopUpMenu` exposes `open` to the label; it may be a small structural need).

---

## 5. Scroll bars (Ch.5 p.158–165, Figs 5-28, 5-30; plus Figs 7-18, 9-1, 8-25)

**System 7**
- "A scroll bar is a light gray rectangle that has an arrow in a box at each end." The arrows sit **at each end** (split), the only S7 arrangement (p.158).
- Measured (color, Figs 7-18 and 9-1): the bar is **16 px wide including both 1-px black borders**, with 16×16 arrow boxes including borders.
  - **Gray area (color)**: a 25% dither of `#A8A8A8` dots on `#ECECEC` (pattern `abaaa` / `aaaba` on alternating rows). The HIG calls it "light gray".
  - **Arrow boxes (color)**: `#ECECEC` face, a 1-px white top-left highlight, a `#A8A8A8` bottom-right shadow, and a hollow arrow outlined in dark tinge `#46528B`, filled `#CDCDCD`, with a lavender `#D6D8EA` inner highlight.
  - **Scroll box (color)**: tinged. Dark-tinge `#46528B` border shadow, a `#D6D8EA` highlight, a `#CDCDCD` face, and centered **grip lines** in `#898BB2` (4 short lines, Fig 7-18). This matches Platinum's grip idea.
  - The size box at the corner is tinged too.
- **Inactive** (p.160, Fig 5-30): "If the document is no larger than the window, the scroll bars are inactive… the rectangles are outlined, but there is no gray area, no scroll box, and the arrows are hollow." Measured: a `#F4F4F4` face, arrows drawn as `#A8A8A8` outlines only. "If the document window is inactive… only the outline of the scroll bar as a whole should appear" (no arrows at all).
- **B&W** is inferred (no B&W scroll-bar capture in these chapters): the gray area is the 50% checkerboard pattern (p.260 "true gray wherever you previously used a 50 percent gray pattern"), the scroll box is white with a 1-px black border, and arrows are black outlines on white.

**Platinum today**: `_scrollbars.scss:65-191` and `232-314`. Default arrows are **grouped at the end** (Smart Scrolling), with split arrows as an option (`193-230`). The track is a `system-04` fill with an inset bevel (`157-175`). The thumb is a theme-ramp bevel with grip gradients (`233-314`). `--window-scrollbar-size` is 17 (`measurements.window.scrollbarSize`). HIG8 (scroll bars section, PDF p.40).

**Difference**: S7 always uses split arrows. The track is a flat pattern with no inset bevel. The size is 16, not 17. In B&W everything is flat 1-bit. In color the bevel exists only on arrows and thumb, tinted with the window tinge. The inactive state looks different: an empty white track and hollow gray arrows.

**B&W vs color**: Pattern vs dither-gray track. Flat white arrows and box vs tinge-beveled ones. Inactive arrows are 50% dithered vs `#A8A8A8`.

**Implementation note**: Package SCSS (WebKit pseudos as Platinum does). Always use the split arrangement (include Platinum's split-arrow rules unconditionally). `window.scrollbarSize` 16 is a theme measurement. The track pattern and arrow glyphs need **art** or CSS gradients (§14). An inactive-scroll-bar state ("document fits") is not expressible with `::-webkit-scrollbar`: the browser hides bars or shows a disabled track. Treat it as an open question or a structural capability.

---

## 6. Sliders (p.214–215, Figs 7-13, 7-14, 7-15)

**System 7**
- No Toolbox standard ("Controls Not Supported by the Macintosh Toolbox", p.214). The HIG shows the Sound and Brightness control panel sliders.
- Measured (Fig 7-15): a **vertical channel 13 px wide with fully rounded ends**, a 1-px black outline, filled with a **50% checkerboard** (1-px black/white). The indicator is a **21 × 11 px rounded capsule** with a double outline (an outer 1-px line, a 1-px white gap, then an inner 1-px line, white inside). Numeric labels 0–7 sit with tick dashes to the left, in Geneva 9-ish.
- Pure 1-bit even in color figures.

**Platinum today**: `_Slider.scss:1-156`. A **pentagon** pointer thumb (`$thumb-shape`, line 9) with stroke art (`--classicy-art-slider-thumb`), grip strikes art, and gradient faces. The base track is a rounded gradient with a box-shadow (`ClassicySlider.scss:38-66`). HIG8 p.32.

**Difference**: Structural. A capsule thumb instead of a pentagon pointer, no grip strikes, and a dithered track instead of a gradient track.

**B&W vs color**: The HIG shows no color slider. Inference: in color the 50% dither becomes true gray (p.260).

**Implementation note**: Package SCSS plus new art registered under the existing keys `sliderThumb` and `sliderStrikes` (strikes empty). The pentagon `clip-path` must be overridden to a capsule `border-radius`.

---

## 7. Little arrows (p.216–217, Figs 7-16, 7-17, 7-3)

**System 7**: Measured (Fig 7-17): an **11 px wide × 18 px tall** rectangle with 1-px black outline and clipped (1-px) corners, split into two halves with **solid black** up and down triangles (7 px base). There is no divider line. The value sits in a separate 1-px-bordered box to the left. "While the user clicks or presses the arrow, it is highlighted" (p.216). In S7 that means the pressed half inverts (inferred from p.205's highlighting convention). No color (Fig 9-2).

**Platinum today**: Base `LittleArrows/ClassicyLittleArrows.scss:13-41` uses a `system-02` face with box-shadow bevels per half, `system-04` pressed, and a theme-04 focus ring (`:102-103`). HIG8 p.33.

**Difference**: Flat white, solid black arrows, and an inverted pressed half instead of bevels.

**B&W vs color**: Same.

**Implementation note**: Package SCSS overriding base look declarations. Arrow glyph art if exact.

---

## 8. Outline (disclosure) triangles (p.218, Fig 7-18)

**System 7**: Measured: collapsed is a right-pointing triangle **6 px wide × 11 px tall**; expanded is a down-pointing triangle **11 wide × 6 tall** ("the triangle then rotates to point downward", p.218). It has a 1-px black outline. In color the interior is a **50% checker of `#A8ABCE` (tinge) and white**. The B&W interior is not shown; inference: white or 50% gray. No bevel.

**Platinum today**: Disclosure and Triangle components use Platinum's `triangle.svg` art (`assets/art/triangle.svg`) with a gray beveled look.

**Difference**: A tinge-dithered fill and pure 1-px outline. The S7 control is the Finder's list-view triangle.

**B&W vs color**: Tinge dither in color; inferred black outline on white or a 50% pattern in B&W.

**Implementation note**: New art for the triangle system-art key. A fill per variant means art per variant (see §14 on per-theme art).

---

## 9. Text entry fields (p.219–220, Figs 7-19, 7-17, 7-1)

**System 7**: Measured: a plain **1-px black rectangle**, square corners, white inside, no inset bevel, no shadow. 22 px tall in Fig 7-17 and 20 px in Fig 7-1, with text inset about 3 px. Selected text is **inverted** (black bar, white text, Fig 7-1). There is **no focus ring**: the HIG shows the active field only by its insertion point or selection.

**Platinum today**: Base `Input/ClassicyInput.scss:9-21` uses a black border plus a 2-px inset bevel (`system-05` / white). Focus adds a `theme-04` 2-px ring (`:20-21`). HIG8 Edit Text Fields (PDF p.41).

**Difference**: No bevel and no focus ring. The selection highlight is black (inversion).

**B&W vs color**: In B&W the highlight is inversion. In color the highlight is the Color control panel's highlight color, which defaults to black (p.260).

**Implementation note**: Package SCSS (`box-shadow:none`, focus ring off). The selection color comes from the theme (`color.select`/`highlight`) as long as a selected-text color token exists (open question). Dropping the focus ring is an accessibility trade-off. Consider keeping a subtle ring behind a knob.

---

## 10. Scrolling lists / list boxes (p.220–221, Fig 7-20, Fig 7-4)

**System 7**: A 1-px black frame (no bevel) with a standard scroll bar on the right. The selected row is **solid black with white text** (Fig 7-20 "Cougar Court", measured fully black 16-px rows). Text is in Geneva 9 or Chicago 12 depending on the list (Chooser uses Geneva). Long names are truncated **in the middle** with an ellipsis (p.221).

**Platinum today**: Base `ListBox/ClassicyListBox.scss:8-14` uses a black border with a box-shadow bevel. Selected uses `theme-04` (`:35-38`).

**Difference**: Selection is black inversion, not an accent color, and there is no bevel.

**B&W vs color**: The same black inversion in both figures. Color highlight would follow the user highlight color, which defaults to black (p.260).

**Implementation note**: Theme plus package SCSS. Map selection to a black/white token pair. Middle truncation is behavior, a structural capability not in the theme.

---

## 11. Icons (Ch.8 p.223–255)

**System 7**
- Sizes: "large (32-by-32 pixel) and small (16-by-16 pixel) icons, each available in three… versions: black and white (1-bit), 4-bit color, and 8-bit color", plus "an icon mask for each size" (p.234, Fig 8-17). Large icons appear on the desktop and in "by Icon" views. Small icons appear in the Application menu, menus and "by Small Icon" views (p.234–235, Fig 8-18).
- Table 8-1 (p.235): each monitor shows the best family the icon has, falling back to B&W.
- Drawing: "use an outline of one black pixel to create the icon border. Use a minimal number of black pixels" (p.238). For color, "leave the one-pixel black outline… and fill the icon in with color" (p.239, Figs 8-21/8-22). Use straight lines and 45° angles (p.231). Shadows fall lower-right (p.232). Only the **34 Apple icon colors** (Fig 8-23, p.240) darken on selection and tint on labeling (p.241–242).
- **Selected**: B&W "The Finder automatically inverts the black pixels and the white pixels" (p.238, Fig 8-19). On color, "the color decreases in brightness… On a color monitor, a black-and-white icon turns gray when selected" (p.241, Fig 8-25). The **label is inverted** (black box, white text) in both (Figs 8-1, 8-25, 10-7).
- **Open** (window open): measured in Fig 8-1 ("Workspace" disk), the icon silhouette is filled with a **dark pattern**: `#46528B` with black dots in a 1-in-4 dither (color). The B&W equivalent, inferred, is the classic gray-patterned silhouette.
- **Labeled** (Label menu): the icon is tinted toward the label color (p.242, Fig 8-26).
- **Labels**: measured, black **Geneva 9** text on an **opaque white** rectangle (1–2 px padding, 12 px tall) below the icon (Fig 8-1 "Island").
- **Dragging**: a **dotted outline** of the icon follows the pointer; the original stays selected (p.274, Fig 10-7).
- **Desktop**: the color figures show a **solid neutral gray `#CACACA`** desktop with icons in a right-hand column (Island at top, Trash at bottom right). The HIG does not specify the 1-bit desktop pattern; the classic default is the 50% gray checkerboard (open question).
- **Trash**: a 32×32 ribbed can with a lid (Fig 8-1). Empty is shown; full is not shown in these chapters.
- Standard family shapes (p.245–252): application (tilted page plus hand), document (page with turned-down upper-right corner), stationery (lower-right turned up plus a second page), query, edition (horizontal, double-dotted line), preferences (document plus radio buttons), extension (puzzle piece), control panel (square plus slider), movable resources (reversed document), keyboard icons (16×16, 1-bit plus 4-bit; B&W flags use black, 50% gray, 25% gray and diagonal stripes, Table 8-2 p.254).

**Platinum today**: Desktop icon size 48 (`platinum.json` `desktop.iconSize`), label font size 12 (`desktop.iconFontSize`), body font Geneva. Label background is **50% translucent white** (`Desktop/ClassicyDesktopIcon.scss:28-36`). Selected: `filter:brightness(50%)` on the art plus a 50%-black label (`:87-98`). Open: `backdrop-filter: grayscale(1) invert(1)` (`:74-85`). The halftone dither is drawn through the mask (`_DesktopIcon.scss:6-8`, `_Icon.scss`, `platinum-halftone`, `_mixins.scss:231-246`). The icon art is Platinum's own (core tree plus Platinum's `trash-empty.png`/`trash-full.png`).

**Difference**: 32-px icons, Geneva 9 labels, and **opaque** white/black labels. Selection in 1-bit is **pixel inversion**, not darkening; color selection is darkening (P's brightness 50% is close). The open state is a dark dither fill. Icon artwork must be the S7 families (1-bit for B&W, 8-bit for color). The desktop is solid gray (color) or a 50% pattern (B&W).

**B&W vs color**: This is the biggest asset split: 1-bit art with inversion vs 8-bit art with darkening, and a patterned vs solid gray desktop.

**Implementation note**:
- `desktop.iconSize` 32, `desktop.iconFontSize` 9, `typography.body` Geneva, and `desktop.backgroundColor` `#CACACA` are **theme data**.
- Opaque labels and inverted selected labels are **package SCSS**.
- B&W inversion of the art could be `filter: invert(1)` on the icon image, clipped by the mask. That is exact for 1-bit art.
- **Icon art is per package, not per theme** (asset registry `registerClassicyAssets(kind, packageId, …)`). A 1-bit tree for the B&W variant and an 8-bit tree for the color one therefore need either two packages or a new per-theme asset capability (§14).

---

## 12. Menus (as far as Ch.9 rules them)

**System 7**: "Use true gray in menus for the dotted separator lines between groups of items and for dimmed menu items" on color (p.260). In B&W these are 50% dotted lines and dithered text. Fig 8-18 shows a menu as a plain white rectangle with a 1-px black border and a 1-px drop shadow, with the highlighted item inverted (black, white text). Font: "the system font, which is 12-point Chicago" (Ch.4; exact page not pinned).

**Platinum today**: `platinum-menu-frame` (`_mixins.scss:17-60`): a black border, a white/system-04 bevel and a `system-07` 1-px shadow. Dividers are a `system-05` line over white (`:65-68`). Item highlight uses the theme accent.

**Difference**: No inner bevel. The divider is a single dotted (B&W) or gray (color) line. The highlight is black inversion.

**Implementation note**: Package SCSS. The `platinum-menu-frame` mixin equivalent is simpler. Covered in more depth by the menus chapter (out of scope here).

---

## 13. Window frame elements that Ch.9 colorizes (for completeness)

Measured from Figs 9-1 and 5-30 (color):
- **Title bar**: a `#F5F5F5` field with a lavender `#D6D8EA` top-left highlight and `#B2B5D4` bottom edge. **Six 1-px `#A8A8A8` stripes on alternate rows** (rows 4–14 of an 18-px bar). In B&W the stripes are black (p.258 "On color screens, the racing stripes… are gray").
- **Close and zoom boxes**: 11×11, inset (dark `#46528B` top-left edge, `#D6D8EA` bottom-right), `#CDCDCD` face. The zoom box carries the small-in-large box glyph.
- **Inactive window**: a `#828282` frame, no stripes, no close or zoom boxes, title text `#B4B4B4`, and scroll bars reduced to outlines (Fig 5-30).
- **Dialog frames (color)**: 1 px black, then 3 px of tinge bands (`#D6D8EA`, `#D8D8D8`, `#898BB2`), then 1 px black (Figs 7-1, 7-8 measured).

**Platinum today**: `_Window.scss`, `_WindowFrame.scss`, and the stripes art `title-bar-center.svg` (`platinum-title-bar-stripes`, `_mixins.scss:262+`).

**Implementation note**: Stripes and box glyphs are art keys already (`window-stripes`, `window-dither`, `zoom`, `collapse`). S7 has **no collapse box** (WindowShade was a control panel). That is a "hide a part" decision, which a package may make. The window chapter (Ch.5) is the authority here.

---

## 14. Platform mechanisms the two variants need (cross-cutting)

1. **50% pattern vs true gray.** A 2-color checker as CSS, `repeating-conic-gradient(var(--a) 0 25%, var(--b) 0 50%) 0 0 / 2px 2px`, renders a 1-bit dither when `--a`=black and `--b`=white, and solid gray when both tokens hold the same gray. Driving the pattern's two colors from theme color tokens lets **one stylesheet serve both variants as two theme presets** for track, slider channel, desktop and outline-triangle fills.
   - Caveat: the dither needs device-pixel alignment. At fractional zoom or DPR it moirés. Platinum moved to raster art for exactly this reason (E20/E21 rulings).
2. **Dimmed text in B&W** (text masked through a checker). Use `mask-image` with a checker on the label. Whether it applies is a per-variant switch, so it needs a **package knob** (a numeric measurement, e.g. `system7.dimDither: 1|0`) read in `calc()`/opacity, or a separate rule set.
3. **Per-variant art (icons, triangle fill, desktop pattern).** The asset registry is **per package**, not per theme. Wallpapers are per theme by filename, so a desktop pattern tile can be a theme wallpaper. Icons and system art cannot vary by theme today.
   - Options: (a) two packages, `system7` and `system7-color`, sharing SCSS. (b) A new capability: per-theme asset overrides, or a theme-level "depth" flag published on the desktop root as a data attribute for package CSS to key on. The `layout` block already publishes `data-classicy-*`, but per package, not per theme.
4. **No bevels anywhere in B&W.** All P bevel mixins collapse to plain 1-px black borders. In color, bevels appear **only** on frame controls (scroll arrows, scroll box, close/zoom/size boxes, dialog frame bands). Dialog controls stay flat in both variants (Fig 9-2).
5. **Base-layer looks to override.** Radio (`ClassicyRadioInput.scss`), checkbox face and glyph (`ClassicyCheckbox.scss`), little arrows, input bevel and list selection still hold look declarations in **base** SCSS. A System 7 package overrides them in `classicy.package`, which works but means more overrides than a clean base would need.

---

## Two variants: what concretely differs, per the HIG

| Element | Black and white (1-bit) | Color (4/8-bit) |
|---|---|---|
| Dimmed controls and menu items | Label (and per text, frame) **dithered 50% gray** (p.207, p.260) | **True gray** text (p.207, p.260) |
| Menu separators | Dotted 50% line | Solid true-gray line (p.260) |
| Selection: text and list rows | **Inversion** (black ↔ white) | Highlight color (user-set, **default black**, p.260) |
| Selection: icons | **Pixel inversion** of the icon plus an inverted label (p.238) | Icon **darkened** (34 icon colors only); a B&W icon turns gray; label inverted (p.241) |
| Icon artwork | 1-bit family (32×32 + 16×16, masks) | 8-bit family (4-bit fallback), black outline kept (p.234, p.239) |
| Window frame | Black frame, **black** racing stripes, white boxes | Gray stripes `#A8A8A8`, **tinged** frame and boxes (lavender ramp), gray inactive frames (p.258) |
| Scroll bars | 50% pattern track, white box, outline arrows (inferred) | Light-gray dither track, **tinge-beveled** arrows and grip-lined scroll box (Figs 9-1, 7-18) |
| Bevels and shadows | **None** ("keep B&W two-dimensional", p.263) | Only on frame controls; light from upper-left (p.262) |
| Push buttons, checkboxes, radios, little arrows, pop-ups, fields | Black on white, flat | **Identical**: black on white, flat (Fig 9-2, p.259) |
| Outline triangle fill | Unspecified (inferred white or 50%) | 50% dither of tinge `#A8ABCE` and white (Fig 7-18) |
| Desktop | 50% gray pattern (convention; HIG silent) | Solid neutral gray `#CACACA` (Figs 8-1, 8-18; "colors on gray", p.265) |
| Pointer | Black | Black (p.260) |
| Fonts | Chicago 12 (UI), Geneva 9 (icon labels, small text) | Same |

**Takeaway**: The variants differ in **frame and scroll-bar tint, gray rendering (pattern vs true gray), selection rendering and icon art**. Content controls are the same in both.

---

## Top 10 differences that most define the System 7 look (ranked)

1. **Flat 1-px black-on-white controls with no bevels**: buttons, checkboxes, radios, fields, pop-ups and lists, in both variants (p.204–221, Fig 9-2, p.263).
2. **Inversion as the universal highlight**: pressed buttons, selected text and list rows, inverted icon labels, menu items (p.205, p.260, p.286).
3. **Chicago 12 UI text and Geneva 9 small text** instead of Charcoal and Geneva 12 (p.207, p.88).
4. **The default button ring**: a 1-px white gap plus a 3-px solid black rounded ring (p.206, Fig 7-1).
5. **50% dither patterns in B&W ↔ true gray in color**: scroll track, dimmed text, slider channel, desktop (p.207, p.260).
6. **32×32 icons with opaque labels**: white label background, inverted when selected, and 1-bit pixel inversion vs color darkening (p.234, p.238, p.241).
7. **Scroll bars**: 16 px, arrows split at both ends, flat patterned track, and a distinct inactive state (outline only, hollow arrows) (p.158–160).
8. **The tinged color window frame**: lavender-gray ramp `#D6D8EA` to `#46528B`, gray `#A8A8A8` racing stripes, beveled boxes only on the frame, gray inactive frames (p.258, Fig 9-1).
9. **Pop-up menu as a square box with a 1-px drop shadow and a single black down-triangle**, label inverted while open (p.87).
10. **Checkbox X running corner to corner, a solid-dot radio, a capsule slider thumb on a dithered channel, black little arrows**: the small-control glyph set (Figs 7-8, 7-10, 7-15, 7-17).

---

## Open questions (HIG silent or ambiguous)

- **Dimmed button frame**: the text says "a dimmed button and its name are dithered". Figs 7-4 and 7-11 show only the **label** dithered and the frame solid black. Which should the B&W variant follow? The figures match the real Control Manager.
- **B&W scroll bar, window frame and title bar**: no 1-bit capture in Ch. 5, 7, 8 or 9. Track pattern (50% vs 25%), scroll-box look and arrow-glyph pixels need another source, such as Inside Macintosh or real System 7 captures.
- **Default 1-bit desktop pattern**: not stated. The color default in the figures is solid `#CACACA`.
- **The 4-bit color variant**: Table 8-1 implies a third depth. Should "color" mean 8-bit only?
- **Checkbox and radio pressed state**: the HIG gives no figure. The Toolbox thickens the outline (2 px); that is not documented here.
- **Highlight color** "default… always black" (p.260): the color figures' text selections are black, which matches. Does the package expose the user's highlight color as a theme color, and is there a selected-text foreground token among the 28 editable colors?
- **Outline-triangle fill in B&W** and **opened-icon pattern in B&W**: only color captures exist.
- **Inactive scroll bars** ("document fits, no gray area, hollow arrows"): native `::-webkit-scrollbar` cannot express "inactive but shown". Accept the browser's behavior, or build a custom scroll bar (structural)?
- **Focus rings**: S7 has none. Dropping them hurts keyboard accessibility. Keep a subtle one behind a knob?
- **Per-theme assets**: should B&W and color be one package with two presets (needs per-theme art or a depth flag) or two packages (duplicates registration but fits the current registry)? This is the key architectural decision.
- **Exact color values**: the hex values are measured from HIG raster captures, which vary slightly between figures. The S7 Color control panel's other window tinges (and their ramps) are not in the HIG.
