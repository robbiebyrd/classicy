import platinumJson from "@/Appearance/Platinum/platinum.json";
import type {
	ClassicyThemeDesktop,
	ClassicyThemeMeasurements,
	ClassicyThemeTypography,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { intToPx } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import { px3 } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.internal";

/** The theme inputs a named derivation may read. */
export type ClassicyThemeDerivationInputs = {
	measurements: ClassicyThemeMeasurements;
	typography: Pick<ClassicyThemeTypography, "uiSize">;
	desktop: Pick<ClassicyThemeDesktop, "iconSize" | "iconFontSize">;
};

/**
 * One named proportion of the Platinum layout: the CSS variable it is
 * emitted as, the formula in words, what reads it and why, and the
 * computation over the theme inputs (in CSS pixels).
 */
export type ClassicyThemeDerivation = {
	cssVar: string;
	formula: string;
	doc: string;
	compute: (i: ClassicyThemeDerivationInputs) => number;
	/**
	 * Emit the computed value unrounded (`intToPx`) instead of through `px3`.
	 * Set on the font sizes: the stylesheets they replaced computed
	 * `calc(var(--ui-font-size) / 1.5)` at full precision, and a rounded
	 * `9.333px` moves the computed `font-size` (`9.33333px`) that the
	 * Platinum parity baseline pins.
	 */
	unrounded?: true;
};

const control = (i: ClassicyThemeDerivationInputs): number =>
	i.measurements.window.controlSize;
const padding = (i: ClassicyThemeDerivationInputs): number =>
	i.measurements.window.paddingSize;
const border = (i: ClassicyThemeDerivationInputs): number =>
	i.measurements.window.borderSize;
const ui = (i: ClassicyThemeDerivationInputs): number => i.typography.uiSize;
// A package knob, not a core input: `getThemeVars` heals the theme from the
// package floor before deriving, so Platinum's band is the fallback for a
// caller that derives from unhealed measurements.
const stripeWidth = (i: ClassicyThemeDerivationInputs): number =>
	i.measurements.progressBar?.stripeWidth ??
	platinumJson.defaults.measurements.progressBar.stripeWidth;

/**
 * The Platinum proportions every stylesheet and the window geometry share,
 * named once so a theme that changes an input moves them all. `getThemeVars`
 * emits each as `cssVar` (rounded by `px3`, except the `unrounded` font
 * sizes), after the measurement inputs, so
 * the names are reserved: a package measurement that would make one is
 * skipped by `classicyMeasurementVars`.
 *
 * Equal formulas are kept as separate entries on purpose: each name is one
 * role (H-R6), and a package may want two roles apart (for example the 1.25×
 * glyph, collapsed-height, stripe and menu-icon sizes; docs/AGENT-REFERENCE.md
 * §8 lists every group).
 */
export const CLASSICY_THEME_DERIVATIONS: readonly ClassicyThemeDerivation[] = [
	{
		cssVar: "--window-collapsed-height",
		formula: "window.controlSize * 1.25",
		doc: "Height of a collapsed (window-shaded) document window, the title bar alone (ClassicyWindow.scss).",
		compute: (i) => control(i) * 1.25,
	},
	{
		cssVar: "--window-utility-collapsed-height",
		formula: "window.controlSize * 0.5",
		doc: "Height of a collapsed utility window, whose title bar is the thin palette strip (ClassicyWindow.scss).",
		compute: (i) => control(i) * 0.5,
	},
	{
		cssVar: "--window-frame-inset",
		formula: "window.paddingSize / 1.25",
		doc: "Inset of the window content from its outer frame (ClassicyWindow.scss; a window frame reads it rounded down, --window-frame-inset-whole).",
		compute: (i) => padding(i) / 1.25,
	},
	{
		cssVar: "--window-zoom-margin",
		formula: "window.paddingSize + window.borderSize * 2",
		doc: "Gap a zoomed window keeps from the desktop edges: the padding plus a frame (ClassicyWindow.tsx zoom).",
		compute: (i) => padding(i) + border(i) * 2,
	},
	{
		cssVar: "--window-resize-inset",
		formula: "max(0, window.paddingSize - window.borderSize)",
		doc: "Slack added to a window's size while resize-dragging, the padding inside the border, so the pointer stays over the grow box (ClassicyWindow.tsx resize). Never negative: the window's reader would discard a negative value for the default theme's.",
		compute: (i) => Math.max(0, padding(i) - border(i)),
	},
	{
		cssVar: "--window-header-font-size",
		formula: "typography.uiSize * 0.865",
		doc: "Window title text size, slightly smaller than the UI font (ClassicyWindow.scss).",
		compute: (i) => ui(i) * 0.865,
		unrounded: true,
	},
	{
		cssVar: "--window-title-stripe-height",
		formula: "window.controlSize * 1.25",
		doc: "Height of the ridged stripe band either side of the window title (ClassicyWindowTitleBar.scss).",
		compute: (i) => control(i) * 1.25,
	},
	{
		cssVar: "--menu-bar-height",
		formula: "window.controlSize * 2.5",
		doc: "Height of the screen menu bar, which windows may not be dragged or zoomed under (ClassicyWindow.tsx).",
		compute: (i) => control(i) * 2.5,
	},
	{
		cssVar: "--menu-min-width",
		formula: "window.controlSize * 15",
		doc: "Minimum dropdown width (ClassicyMenu.scss).",
		compute: (i) => control(i) * 15,
	},
	{
		cssVar: "--menu-item-icon-size",
		formula: "window.controlSize * 1.25",
		doc: "Size of the small icon beside a menu item title (ClassicyMenu.scss).",
		compute: (i) => control(i) * 1.25,
	},
	{
		cssVar: "--menu-item-icon-gap",
		formula: "window.controlSize * 0.5",
		doc: "Gap between a menu item's icon and its title (ClassicyMenu.scss).",
		compute: (i) => control(i) * 0.5,
	},
	{
		cssVar: "--popup-height",
		formula: "window.controlSize * 2.125",
		doc: "Height of a pop-up menu button (ClassicyPopUpMenu.scss).",
		compute: (i) => control(i) * 2.125,
	},
	{
		cssVar: "--popup-mini-size",
		formula: "window.controlSize * 1.3125",
		doc: "Width and height of the mini (arrow-only) pop-up menu (ClassicyPopUpMenu.scss).",
		compute: (i) => control(i) * 1.3125,
	},
	{
		cssVar: "--popup-arrow-width",
		formula: "window.controlSize * 1.75",
		doc: "Width of the arrow box at the end of a pop-up menu button (ClassicyPopUpMenu.scss).",
		compute: (i) => control(i) * 1.75,
	},
	{
		cssVar: "--control-glyph-size",
		formula: "window.controlSize * 1.25",
		doc: "Size of the small glyph inside a control, such as little arrows or a progress or list icon (ClassicyLittleArrows.scss, ClassicyProgressBar.scss).",
		compute: (i) => control(i) * 1.25,
	},
	{
		cssVar: "--control-square-size",
		formula: "window.controlSize * 2",
		doc: "Side of a square icon-only control, such as a toolbar or spinner button (ClassicyButtonToolbar.scss, ClassicySpinner.scss).",
		compute: (i) => control(i) * 2,
	},
	{
		cssVar: "--button-square-width",
		formula: "window.controlSize * 4",
		doc: "Width of a square push or bevel button (ClassicyButton.scss, ClassicyBevelButton.scss).",
		compute: (i) => control(i) * 4,
	},
	{
		cssVar: "--control-padding",
		formula: "window.paddingSize * 0.5",
		doc: "Standard inner padding of a control, half the window padding (most control stylesheets).",
		compute: (i) => padding(i) * 0.5,
	},
	{
		cssVar: "--control-padding-tight",
		formula: "window.paddingSize / 4",
		doc: "Tightest inner padding, for dense toolbar and title-bar parts (ClassicyButtonToolbar.scss, ClassicyWindow.scss).",
		compute: (i) => padding(i) / 4,
	},
	{
		cssVar: "--control-padding-narrow",
		formula: "window.paddingSize / 3",
		doc: "Narrow inner padding for compact controls (ClassicyPlacard.scss, ClassicyPopUpMenu.scss, ClassicyTabs.scss).",
		compute: (i) => padding(i) / 3,
	},
	{
		cssVar: "--control-padding-loose",
		formula: "window.paddingSize / 1.5",
		doc: "Loose inner padding for list and placard content (ClassicyListBox.scss, ClassicyPlacard.scss, ClassicyTabs.scss).",
		compute: (i) => padding(i) / 1.5,
	},
	{
		cssVar: "--control-padding-wide",
		formula: "window.paddingSize * 1.5",
		doc: "Wide padding around framed content (ClassicyPopUpMenu.scss, ClassicyTabs.scss).",
		compute: (i) => padding(i) * 1.5,
	},
	{
		cssVar: "--ui-font-size-small",
		formula: "typography.uiSize * 0.8",
		doc: "Small UI text, such as labels and table cells (ClassicyControlGroup.scss, ClassicyTable.scss, ClassicyPopUpMenu.scss).",
		compute: (i) => ui(i) * 0.8,
		unrounded: true,
	},
	{
		cssVar: "--ui-font-size-caption",
		formula: "typography.uiSize * 0.75",
		doc: "Caption text, such as menu keyboard equivalents and meter labels (ClassicyMenu.scss, ClassicyKbd.scss, ClassicyMeter.scss).",
		compute: (i) => ui(i) * 0.75,
		unrounded: true,
	},
	{
		cssVar: "--ui-font-size-compact",
		formula: "typography.uiSize * 10 / 12",
		doc: "Compact text for tab titles and placards (ClassicyTabs.scss, ClassicyPlacard.scss).",
		compute: (i) => (ui(i) * 10) / 12,
		unrounded: true,
	},
	{
		cssVar: "--ui-font-size-mini",
		formula: "typography.uiSize / 1.5",
		doc: "Mini text inside small buttons (ClassicyButton.scss, ClassicyBevelButton.scss, ClassicyButtonToolbar.scss).",
		compute: (i) => ui(i) / 1.5,
		unrounded: true,
	},
	{
		cssVar: "--ui-font-size-large",
		formula: "typography.uiSize * 1.5",
		doc: "Large text for the large tab style (ClassicyTabs.scss).",
		compute: (i) => ui(i) * 1.5,
		unrounded: true,
	},
	{
		cssVar: "--tab-height",
		formula: "window.controlSize * 4 / 2.5",
		doc: "Height of a tab (ClassicyTabs.scss).",
		compute: (i) => (control(i) * 4) / 2.5,
	},
	{
		cssVar: "--tab-min-width",
		formula: "window.controlSize * 4",
		doc: "Minimum width of a tab (ClassicyTabs.scss).",
		compute: (i) => control(i) * 4,
	},
	{
		cssVar: "--tab-min-width-large",
		formula: "window.controlSize * 9",
		doc: "Minimum width of a large-style tab (ClassicyTabs.scss).",
		compute: (i) => control(i) * 9,
	},
	{
		cssVar: "--slider-thumb-width",
		formula: "window.controlSize * 2",
		doc: "Width of a slider thumb (ClassicySlider.scss).",
		compute: (i) => control(i) * 2,
	},
	{
		cssVar: "--slider-thumb-height",
		formula: "window.controlSize * 1.75",
		doc: "Height of a slider thumb (ClassicySlider.scss).",
		compute: (i) => control(i) * 1.75,
	},
	{
		cssVar: "--desktop-icon-padding",
		formula: "desktop.iconSize / 4",
		doc: "Padding around a desktop icon inside its grid cell, and so the icon grid's origin: read by the desktop Clean Up and the Finder icon view (ClassicyDesktopIconContext.tsx, ClassicyFileBrowserUtils.ts); no stylesheet reads it (the alias badge's iconSize / 4 stays a one-off).",
		compute: (i) => i.desktop.iconSize / 4,
	},
	{
		cssVar: "--desktop-icon-cell",
		formula: "desktop.iconSize * 2",
		doc: "Width of one desktop and icon-view grid cell, icon plus label room (ClassicyDesktopIcon.scss; the grid pitch in ClassicyDesktopIconContext.tsx, ClassicyFileBrowserUtils.ts). The plain ClassicyIcon stylesheet keeps its own iconSize * 2: its size prop sets --desktop-icon-size per icon, which a root-derived cell would not follow.",
		compute: (i) => i.desktop.iconSize * 2,
	},
	{
		cssVar: "--desktop-icon-label-pad",
		formula: "desktop.iconFontSize / 4",
		doc: "Padding inside an icon's label box (ClassicyDesktopIcon.scss, ClassicyIcon.scss).",
		compute: (i) => i.desktop.iconFontSize / 4,
	},
	{
		cssVar: "--focus-ring-width",
		formula: "window.borderSize",
		doc: "Width of the keyboard focus outline drawn around or inside a control, such as a link's focus ring (ClassicyControlStrip.scss, ClassicyColorPicker.scss, ClassicyPopUpSlider.scss, ClassicyLink.scss).",
		compute: (i) => border(i),
	},
	{
		cssVar: "--focus-ring-inset",
		formula: "window.borderSize * 3",
		doc: "How far the keyboard focus outline sits inside a control's edge, clear of its frame and bevel (ClassicyControlStrip.scss, ClassicyColorPicker.scss).",
		compute: (i) => border(i) * 3,
	},
	{
		cssVar: "--layout-item-gap-half",
		formula: "layout.itemGap / 2",
		doc: "Half the item gap: the vertical padding of a compact list row, such as HyperCard's palette entries and add-action pop-up and Drive Setup's list cells (HyperCard.scss, DriveSetupList.scss). One role, one name (H-R19).",
		compute: (i) => i.measurements.layout.itemGap / 2,
	},
	{
		cssVar: "--control-corner-radius",
		formula: "window.borderSize * 2",
		doc: "Corner radius of a small rounded control, such as a keyboard key cap (ClassicyKbd.scss).",
		compute: (i) => border(i) * 2,
	},
	{
		cssVar: "--window-shadow-offset",
		formula: "window.borderSize * 2",
		doc: "How far a window frame's hard drop shadow falls right and down (ClassicyWindowFrame.scss).",
		compute: (i) => border(i) * 2,
	},
	{
		cssVar: "--window-frame-inset-whole",
		formula: "floor(window.paddingSize / 1.25)",
		doc: "The window frame inset rounded down to a whole pixel: how far a window frame's title bar sits inside the frame's border, so the frame's body stays on the pixel grid (ClassicyWindowFrame.scss).",
		compute: (i) => Math.floor(padding(i) / 1.25),
	},
	{
		cssVar: "--progress-bar-stripe-period",
		formula: "progressBar.stripeWidth * 2",
		doc: "Repeat of an indeterminate progress bar's barber-pole stripes: a white band and a theme band, each progressBar.stripeWidth wide, so the bands and the period can never disagree (ClassicyProgressBar.scss, H-R27b).",
		compute: (i) => stripeWidth(i) * 2,
	},
	{
		cssVar: "--window-max-height-reserve",
		formula: "window.controlSize * 4 + window.paddingSize",
		doc: "Height a document window leaves free of its container: its max-height is 100% minus this (ClassicyWindow.scss).",
		compute: (i) => control(i) * 4 + padding(i),
	},
	{
		cssVar: "--window-contents-chrome-height",
		formula: "window.controlSize + window.paddingSize * 1.5",
		doc: "Height a window's contents box gives up to the title bar and frame: the contents are 100% minus this (ClassicyWindow.scss, ClassicyWindowMenuBar.scss).",
		compute: (i) => control(i) + padding(i) * 1.5,
	},
	{
		cssVar: "--window-contents-header-chrome-height",
		formula: "window.controlSize * 3 + window.paddingSize",
		doc: "The same, for contents under a window header strip (ClassicyWindow.scss, ClassicyWindowMenuBar.scss).",
		compute: (i) => control(i) * 3 + padding(i),
	},
	{
		cssVar: "--window-modal-contents-chrome-height",
		formula: "window.controlSize * 2 + window.paddingSize",
		doc: "The same, for a modal window's contents (ClassicyWindow.scss).",
		compute: (i) => control(i) * 2 + padding(i),
	},
	{
		cssVar: "--window-utility-contents-chrome-height",
		formula: "window.controlSize * 0.25 + window.paddingSize * 1.5",
		doc: "The same, for a utility window's contents under its thin title strip (ClassicyWindow.scss).",
		compute: (i) => control(i) * 0.25 + padding(i) * 1.5,
	},
	{
		cssVar: "--window-placard-end-reserve",
		formula: "window.controlSize * 3.5",
		doc: "Room a window-frame placard leaves at the bottom-right for the grow box and the horizontal scroll bar: its max-width is 100% minus this (ClassicyWindow.scss).",
		compute: (i) => control(i) * 3.5,
	},
	{
		cssVar: "--window-modal-title-reserve",
		formula: "window.controlSize * 5",
		doc: "Room a modal window's title leaves beside it: its width is 100% minus this (ClassicyWindow.scss).",
		compute: (i) => control(i) * 5,
	},
	{
		cssVar: "--window-menu-bar-height",
		formula: "window.controlSize * 1.75",
		doc: "Height of a window's own menu bar (menu-bar placement `window`) unless a host or package sets --classicy-window-menu-bar-height (ClassicyWindowMenuBar.scss).",
		compute: (i) => control(i) * 1.75,
	},
	{
		cssVar: "--ui-font-size-xlarge",
		formula: "typography.uiSize * 2",
		doc: "The Large text size of the text controls: control labels and the text editor (ClassicyControlLabel.scss, ClassicyTextEditor.scss).",
		compute: (i) => ui(i) * 2,
		unrounded: true,
	},
	{
		cssVar: "--control-label-spacing",
		formula: "window.controlSize / 2",
		doc: "Space between a control and its own label: ClassicyControlLabel's margins and gaps, and a radio button's label (ClassicyControlLabel.scss, ClassicyRadioInput.scss). Not control.labelGap, the label column gap of a control group.",
		compute: (i) => control(i) / 2,
	},
	{
		cssVar: "--radio-mark-width",
		formula: "window.controlSize / 3",
		doc: "Border width that draws a checked radio button's dot, in proportion to the button (ClassicyRadioInput.scss).",
		compute: (i) => control(i) / 3,
	},
	{
		cssVar: "--radio-mixed-mark-top",
		formula: "window.controlSize / 2.5",
		doc: "Top offset of a mixed radio button's dash inside the button (ClassicyRadioInput.scss).",
		compute: (i) => control(i) / 2.5,
	},
	{
		cssVar: "--radio-mixed-mark-height",
		formula: "window.controlSize / 4",
		doc: "Height of a mixed radio button's dash (ClassicyRadioInput.scss).",
		compute: (i) => control(i) / 4,
	},
	{
		cssVar: "--radio-mixed-mark-border",
		formula: "window.controlSize / 8",
		doc: "Border width of a mixed radio button's dash (ClassicyRadioInput.scss).",
		compute: (i) => control(i) / 8,
	},
	{
		cssVar: "--checkbox-x-mark-font-size",
		formula: "typography.uiSize * 1.25",
		doc: "Size of the localized checkbox's X mark glyph (ClassicyCheckbox.scss).",
		compute: (i) => ui(i) * 1.25,
		unrounded: true,
	},
	{
		cssVar: "--checkbox-x-mark-line-height",
		formula: "typography.uiSize * 0.65",
		doc: "Line height that seats the localized checkbox's X mark in the box (ClassicyCheckbox.scss).",
		compute: (i) => ui(i) * 0.65,
		unrounded: true,
	},
	{
		cssVar: "--balloon-help-font-size",
		formula: "typography.uiSize * 0.85",
		doc: "Text size of a help balloon (ClassicyBalloonHelp.scss).",
		compute: (i) => ui(i) * 0.85,
		unrounded: true,
	},
	{
		cssVar: "--quick-time-time-font-size",
		formula: "typography.uiSize * 0.85",
		doc: "Text size of the QuickTime controller's time readout (QuickTimeMovieEmbed.scss).",
		compute: (i) => ui(i) * 0.85,
		unrounded: true,
	},
	{
		cssVar: "--quick-time-control-icon-size",
		formula: "window.controlSize * 0.875",
		doc: "Side of the QuickTime controller's button glyphs (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.875,
	},
	{
		cssVar: "--quick-time-volume-track-inset",
		formula: "window.paddingSize * 0.75",
		doc: "Inline inset of the QuickTime volume slider's track (QuickTimeMovieEmbed.scss).",
		compute: (i) => padding(i) * 0.75,
	},
	{
		cssVar: "--finder-about-font-size",
		formula: "typography.uiSize * 0.8571",
		doc: "Body text size of About This Computer (FinderAboutThisComputer.scss).",
		compute: (i) => ui(i) * 0.8571,
		unrounded: true,
	},
	{
		cssVar: "--finder-about-title-font-size",
		formula: "typography.uiSize * 1.8571",
		doc: "Size of the Mac OS title on About This Computer's banner (FinderAboutThisComputer.scss).",
		compute: (i) => ui(i) * 1.8571,
		unrounded: true,
	},
	{
		cssVar: "--finder-about-heading-font-size",
		formula: "typography.uiSize * 1.0714",
		doc: "Size of About This Computer's version and memory headings (FinderAboutThisComputer.scss).",
		compute: (i) => ui(i) * 1.0714,
		unrounded: true,
	},
	{
		cssVar: "--finder-about-copyright-font-size",
		formula: "typography.uiSize * 0.7857",
		doc: "Size of About This Computer's copyright line (FinderAboutThisComputer.scss).",
		compute: (i) => ui(i) * 0.7857,
		unrounded: true,
	},
	{
		cssVar: "--menu-item-padding-inline",
		formula: "window.paddingSize * 1.25",
		doc: "Inline padding of a menu item (ClassicyMenu.scss).",
		compute: (i) => padding(i) * 1.25,
	},
	{
		cssVar: "--slider-thumb-corner-radius",
		formula: "window.borderSize * 1.5",
		doc: "Corner radius of the nondirectional (rounded-rectangle) slider thumb (Platinum _Slider.scss).",
		compute: (i) => border(i) * 1.5,
	},
	{
		cssVar: "--tab-scroll-arrow-size",
		formula: "window.controlSize / 3",
		doc: "Size of the triangle in a tab strip's scroll arrows, regular and small tabs (ClassicyTabs.scss).",
		compute: (i) => control(i) / 3,
	},
	{
		cssVar: "--tab-scroll-arrow-size-large",
		formula: "window.controlSize / 2.25",
		doc: "Size of the triangle in a large tab strip's scroll arrows (ClassicyTabs.scss).",
		compute: (i) => control(i) / 2.25,
	},
	{
		cssVar: "--tab-min-width-medium",
		formula: "window.controlSize * 7",
		doc: "Minimum width of a regular (medium) tab, between --tab-min-width (small) and --tab-min-width-large (ClassicyTabs.scss).",
		compute: (i) => control(i) * 7,
	},
	{
		cssVar: "--tab-height-large",
		formula: "window.controlSize * 3",
		doc: "Height of a large-style tab, beside --tab-height (ClassicyTabs.scss).",
		compute: (i) => control(i) * 3,
	},
	{
		cssVar: "--tab-large-padding-top",
		formula: "window.paddingSize * 0.75",
		doc: "Top padding of a large-style tab's label (ClassicyTabs.scss).",
		compute: (i) => padding(i) * 0.75,
	},
	{
		cssVar: "--assistant-header-gap",
		formula: "window.controlSize * 0.5",
		doc: "Gap between the Assistant header's icon and its title (ClassicyAssistant.scss).",
		compute: (i) => control(i) * 0.5,
	},
	{
		cssVar: "--assistant-accessory-icon-medium",
		formula: "window.controlSize * 1.75",
		doc: "Side of the Assistant's medium accessory icon (ClassicyAssistant.scss).",
		compute: (i) => control(i) * 1.75,
	},
	{
		cssVar: "--assistant-accessory-icon-large",
		formula: "window.controlSize * 2.5",
		doc: "Side of the Assistant's large accessory icon, taller than its header (ClassicyAssistant.scss).",
		compute: (i) => control(i) * 2.5,
	},
	{
		cssVar: "--button-toolbar-square-button-width",
		formula: "window.controlSize * 3",
		doc: "Width of a square bevel button in a button toolbar (ClassicyButtonToolbar.scss).",
		compute: (i) => control(i) * 3,
	},
	{
		cssVar: "--desktop-icon-label-gap",
		formula: "desktop.iconFontSize / 2",
		doc: "Gap between a desktop icon's image and its label (ClassicyDesktopIcon.scss).",
		compute: (i) => i.desktop.iconFontSize / 2,
	},
	{
		cssVar: "--disclosure-triangle-offset",
		formula: "window.controlSize / 2",
		doc: "How far a disclosure triangle is pulled back into its row's start (ClassicyTriangle.scss).",
		compute: (i) => control(i) / 2,
	},
	{
		cssVar: "--file-browser-list-icon-spacing",
		formula: "desktop.iconSize / 16",
		doc: "Margin around a list-view row's icon and padding of its label (ClassicyFileBrowserViewTable.scss).",
		compute: (i) => i.desktop.iconSize / 16,
	},
	{
		cssVar: "--menu-sub-menu-offset-block",
		formula: "window.paddingSize * 4",
		doc: "How far a submenu is pulled up over its parent item (ClassicyMenu.scss).",
		compute: (i) => padding(i) * 4,
	},
	{
		cssVar: "--menu-sub-menu-offset-inline",
		formula: "window.paddingSize * 2",
		doc: "How far a submenu is pulled sideways over its parent menu (ClassicyMenu.scss).",
		compute: (i) => padding(i) * 2,
	},
	{
		cssVar: "--picker-swatch-size",
		formula: "window.controlSize * 2.5",
		doc: "Side of the color picker's swatch button (ClassicyColorPicker.scss).",
		compute: (i) => control(i) * 2.5,
	},
	{
		cssVar: "--picker-layout-gap",
		formula: "window.paddingSize * 2",
		doc: "Gap between the color picker's RGB/CMYK rows and beside its wheel (ClassicyColorPicker.scss).",
		compute: (i) => padding(i) * 2,
	},
	{
		cssVar: "--quick-time-undocked-video-inset",
		formula: "window.borderSize * 4",
		doc: "Height an undocked QuickTime video gives up inside its holder (QuickTimeMovieEmbed.scss).",
		compute: (i) => border(i) * 4,
	},
	{
		cssVar: "--quick-time-controls-end-reserve",
		formula: "window.controlSize * 2",
		doc: "Room the QuickTime controller's controls leave at their end (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 2,
	},
	{
		cssVar: "--quick-time-volume-bar-length",
		formula: "window.controlSize * 5",
		doc: "Length of the QuickTime volume slider (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 5,
	},
	{
		cssVar: "--quick-time-volume-bar-offset",
		formula: "window.controlSize * 1.75",
		doc: "Offset that seats the turned QuickTime volume slider over its button (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 1.75,
	},
	{
		cssVar: "--quick-time-thumb-rise",
		formula: "window.controlSize * 0.5",
		doc: "How far a QuickTime slider thumb rises over its track (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.5,
	},
	{
		cssVar: "--quick-time-thumb-shift-inline",
		formula: "window.controlSize * 0.25",
		doc: "Inline shift that centers a QuickTime slider thumb on its value (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.25,
	},
	{
		cssVar: "--quick-time-volume-track-top",
		formula: "window.controlSize * 0.25",
		doc: "Top offset of the QuickTime volume slider's track (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.25,
	},
	{
		cssVar: "--quick-time-progress-track-top",
		formula: "window.controlSize * 0.25",
		doc: "How far the QuickTime progress track is raised (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.25,
	},
	{
		cssVar: "--quick-time-progress-track-height",
		formula: "window.controlSize * 0.75",
		doc: "Height of the QuickTime progress track (QuickTimeMovieEmbed.scss).",
		compute: (i) => control(i) * 0.75,
	},
	{
		cssVar: "--radio-offset-top",
		formula: "window.controlSize / 2",
		doc: "Top offset of a radio button in its row (ClassicyRadioInput.scss).",
		compute: (i) => control(i) / 2,
	},
	{
		cssVar: "--tab-gap",
		formula: "window.paddingSize * 2",
		doc: "Gap between tabs in a tab strip (ClassicyTabs.scss).",
		compute: (i) => padding(i) * 2,
	},
	{
		cssVar: "--tab-padding-inline",
		formula: "window.paddingSize * 3",
		doc: "Inline padding of a regular tab's label (ClassicyTabs.scss).",
		compute: (i) => padding(i) * 3,
	},
	{
		cssVar: "--tab-scroll-button-min-width",
		formula: "window.controlSize * 3",
		doc: "Minimum width of a tab strip's scroll-arrow tab (ClassicyTabs.scss).",
		compute: (i) => control(i) * 3,
	},
	{
		cssVar: "--tab-small-row-indent",
		formula: "window.controlSize / 2",
		doc: "Start indent of a small tab strip's row (ClassicyTabs.scss).",
		compute: (i) => control(i) / 2,
	},
	{
		cssVar: "--tab-small-padding-inline",
		formula: "window.paddingSize * 2",
		doc: "Inline padding of a small tab's label (ClassicyTabs.scss).",
		compute: (i) => padding(i) * 2,
	},
	{
		cssVar: "--tab-small-icon-size",
		formula: "window.controlSize * 0.75",
		doc: "Side of a small tab's icon (ClassicyTabs.scss).",
		compute: (i) => control(i) * 0.75,
	},
	{
		cssVar: "--tab-large-padding-inline",
		formula: "window.paddingSize * 4",
		doc: "Inline padding of a large tab's label (ClassicyTabs.scss).",
		compute: (i) => padding(i) * 4,
	},
	{
		cssVar: "--text-editor-height-inset",
		formula: "window.borderSize * 4",
		doc: "Height a text editor's textarea gives up inside its frame (ClassicyTextEditor.scss).",
		compute: (i) => border(i) * 4,
	},
	{
		cssVar: "--text-editor-auto-min-height",
		formula: "window.controlSize * 3",
		doc: "Minimum height of an auto-height text editor (ClassicyTextEditor.scss).",
		compute: (i) => control(i) * 3,
	},
	{
		cssVar: "--time-picker-period-min-width",
		formula: "typography.uiSize * 4",
		doc: "Minimum width of a time picker's AM/PM field, room for its text (ClassicyTimePicker.scss).",
		compute: (i) => ui(i) * 4,
	},
	{
		cssVar: "--window-title-cap-offset",
		formula: "window.paddingSize / 2",
		doc: "How far the end box before each title-bar stripe band is pulled back into the title bar's padding (ClassicyWindowTitleBar.scss). Its own role, not --control-padding (H-R28b).",
		compute: (i) => padding(i) / 2,
	},
	{
		cssVar: "--window-utility-control-box-size",
		formula: "max(0, window.utilityTitleBarHeight - window.borderSize * 4)",
		doc: "Side of a utility window's (windoid's) close and collapse boxes: its title bar less two borders above and two below (the Platinum package's _Window.scss). Never negative, as the width and height it replaced clamped a negative calc() to 0.",
		compute: (i) =>
			Math.max(0, i.measurements.window.utilityTitleBarHeight - border(i) * 4),
	},
	{
		cssVar: "--appearance-manager-swatch-label-gap",
		formula: "layout.itemGap / 2",
		doc: "Gap between a color swatch and the short label centered over it in the Appearance Manager's Colors tab (ClassicyAppearanceManager.Colors.scss). Not --layout-item-gap-half's row-padding role (H 6.2a acceptance).",
		compute: (i) => i.measurements.layout.itemGap / 2,
	},
	{
		cssVar: "--drive-setup-list-min-height",
		formula: "window.controlSize * 8",
		doc: "Minimum height of Drive Setup's volume list, so an empty list still shows a few rows (DriveSetupList.scss).",
		compute: (i) => control(i) * 8,
	},
	{
		cssVar: "--startup-screen-panel-gap",
		formula: "window.paddingSize * 3",
		doc: "Gap between the startup screen's logo box and its progress bar (ClassicyStartupScreen.scss).",
		compute: (i) => padding(i) * 3,
	},
	{
		cssVar: "--startup-screen-panel-padding-block",
		formula: "window.paddingSize * 6",
		doc: "Top and bottom padding of the startup screen's panel (ClassicyStartupScreen.scss).",
		compute: (i) => padding(i) * 6,
	},
	{
		cssVar: "--startup-screen-panel-padding-inline",
		formula: "window.paddingSize * 8",
		doc: "Left and right padding of the startup screen's panel (ClassicyStartupScreen.scss).",
		compute: (i) => padding(i) * 8,
	},
	{
		cssVar: "--startup-screen-extensions-inset",
		formula: "window.paddingSize * 2",
		doc: "How far the startup extension icon parade sits in from the screen's sides and bottom edge (ClassicyStartupScreen.scss).",
		compute: (i) => padding(i) * 2,
	},
	{
		cssVar: "--control-group-legend-overhang",
		formula: "typography.uiSize * 0.75 * 1.4 / 2",
		doc: "Half a group box legend's line box (caption size, line-height 1.4): the part of a title that overhangs above the frame. A labeled group reserves it above its border; a stack subtracts it so the HIG frame-to-frame distance holds (ClassicyControlGroup.scss).",
		compute: (i) => (ui(i) * 0.75 * 1.4) / 2,
	},
	{
		cssVar: "--keyboard-equivalent-display-inset",
		formula: "layout.groupGap * 2",
		doc: "Inline margin of the combination box in the keyboard-equivalent dialog, which centers it under the prompt (ClassicyKeyboardEquivalent.scss).",
		compute: (i) => i.measurements.layout.groupGap * 2,
	},
	{
		cssVar: "--slider-vertical-min-height",
		formula: "window.controlSize * 8",
		doc: "Minimum length of a vertical slider's track (ClassicySlider.scss).",
		compute: (i) => control(i) * 8,
	},
	{
		cssVar: "--slider-tick-length",
		formula: "window.paddingSize * 0.75",
		doc: "Length of a slider's tick mark; the tick rail is this plus the border the ticks hang from (ClassicySlider.scss).",
		compute: (i) => padding(i) * 0.75,
	},
	{
		cssVar: "--slider-tick-labels-height",
		formula: "typography.uiSize * 1.2",
		doc: "Height of a slider's tick-label row, one UI-font line (ClassicySlider.scss).",
		compute: (i) => ui(i) * 1.2,
	},
	{
		cssVar: "--table-sort-arrow-height",
		formula: "typography.uiSize * 0.5",
		doc: "Height of a table column header's sort arrow, half the UI font (ClassicyTable.scss).",
		compute: (i) => ui(i) * 0.5,
	},
	{
		cssVar: "--window-frame-body-padding",
		formula: "window.paddingSize * 2",
		doc: "Padding of a window frame's body around its content (ClassicyWindowFrame.scss).",
		compute: (i) => padding(i) * 2,
	},
];

/**
 * Every named derivation for `i`, as `cssVar` → pixel string: `px3`-rounded,
 * or unrounded for the `unrounded` font sizes.
 */
export const classicyThemeDerivations = (
	i: ClassicyThemeDerivationInputs,
): Record<string, string> =>
	Object.fromEntries(
		CLASSICY_THEME_DERIVATIONS.map((d) => {
			const value = d.compute(i);
			return [d.cssVar, d.unrounded ? intToPx(value) : px3(value)];
		}),
	);

/**
 * The variables `getThemeVars` derived before the named proportions existed
 * (frames, bevels, the edit-field height, the classic icon sizes, …). With
 * `CLASSICY_THEME_DERIVATIONS` and the palette, font and desktop variables
 * (`CLASSICY_THEME_NON_MEASUREMENT_VARS`) they make up the reserved names
 * (`isReservedClassicyThemeVar`): a package measurement that would make one
 * is skipped by `classicyMeasurementVars`, so it can never silently shadow a
 * derivation.
 */
export const CLASSICY_THEME_DERIVED_VARS: readonly string[] = [
	"--window-scrollbar-arrow-size",
	"--icon-small-size",
	"--icon-size-regular",
	"--button-height",
	"--control-frame-width",
	"--control-bevel-sm",
	"--control-bevel-md",
	"--control-bevel-lg",
	"--button-default-ring",
	"--control-row-height",
	"--edit-field-height",
	"--progress-height",
	"--help-button-width",
	"--help-button-height",
	"--layout-focus-gap",
];
