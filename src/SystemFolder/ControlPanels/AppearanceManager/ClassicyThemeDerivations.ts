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

/**
 * The Platinum proportions every stylesheet and the window geometry share,
 * named once so a theme that changes an input moves them all. `getThemeVars`
 * emits each as `cssVar` (rounded by `px3`, except the `unrounded` font
 * sizes), after the measurement inputs, so
 * the names are reserved: a package measurement that would make one is
 * skipped by `classicyMeasurementVars`.
 *
 * Equal formulas are kept as separate entries on purpose (the 1.25× glyph,
 * collapsed-height, stripe and menu-icon sizes; the 2× square and thumb
 * widths; the 1.75× arrow and thumb heights; the 4× button and tab widths):
 * each has its own structural reason, and a package may want them apart.
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
		doc: "Inset of the window content from its outer frame (ClassicyWindow.scss).",
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
		doc: "Window title text size, slightly smaller than the UI font (ClassicyWindow.scss, ClassicyWindowFrame.scss).",
		compute: (i) => ui(i) * 0.865,
		unrounded: true,
	},
	{
		cssVar: "--window-title-stripe-height",
		formula: "window.controlSize * 1.25",
		doc: "Height of the ridged stripe band either side of the window title (ClassicyWindow.scss).",
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
		doc: "Wide padding around framed content (ClassicyPopUpMenu.scss, ClassicyTabs.scss, ClassicyWindowFrame.scss).",
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
		doc: "Width of the keyboard focus outline drawn inside a control (ClassicyControlStrip.scss, ClassicyColorPicker.scss, ClassicyPopUpSlider.scss).",
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
		doc: "Half the item gap: the vertical padding of a compact list row, such as HyperCard's palette entries and add-action pop-up (HyperCard.scss). One role, one name (H-R19).",
		compute: (i) => i.measurements.layout.itemGap / 2,
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
