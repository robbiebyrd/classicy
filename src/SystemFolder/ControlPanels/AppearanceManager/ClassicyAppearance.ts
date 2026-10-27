import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import {
	intToPct,
	intToPx,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import {
	CLASSICY_DEPRECATED_METRIC_ALIASES,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { resolveWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import type { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyThemeSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import themesData from "../AppearanceManager/styles/themes.json";

export interface ClassicyStoreSystemAppearanceManager
	extends ClassicyStoreSystemManager {
	/** Built-in themes. Never mutated by edits — see `customThemes`. */
	availableThemes?: ClassicyTheme[];
	/**
	 * User-editable themes, kept apart from `availableThemes` so a persisted
	 * list never shadows the built-ins shipped by a newer build. The first
	 * colour/font/desktop edit made on a built-in forks it here as "Custom"
	 * (id `"custom"`); see `ClassicyCustomTheme.ts`. Absent in state persisted
	 * before custom themes existed.
	 */
	customThemes?: ClassicyTheme[];
	/** The theme in effect: a copy of a built-in or of a custom theme. */
	activeTheme: ClassicyTheme;
	/** Sprite key of the user's default alert sound (a `ClassicyAlert*` sound). */
	alertSound?: string;
	/**
	 * Maximum level of alert sounds, as a whole-number percentage (0–100,
	 * default 100). Scales the system volume for alerts only: an alert plays
	 * at system volume × alert volume.
	 */
	alertVolume?: number;
	/**
	 * Mac OS 8 "Smart Scrolling" (Appearance control panel). When `true`
	 * (default), both scroll arrows are grouped together at the end of each
	 * scrollbar; when `false`, they split to opposite ends (the classic
	 * arrangement). A global preference, not a per-theme setting.
	 */
	smartScrolling?: boolean;
}

export type ClassicyThemeColorPalette = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
];

export type ClassicyThemeColorsWindow = {
	border: number;
	borderOutset: number;
	borderInset: number;
	frame: number;
	title: number;
	document: number;
};

export type ClassicyThemeColors = {
	outline: number;
	select: number;
	highlight: number;
	black: number;
	white: number;
	alert: number;
	error: number;
	system: ClassicyThemeColorPalette;
	theme: ClassicyThemeColorPalette;
	window: ClassicyThemeColorsWindow;
};

export type ClassicyThemeTypography = {
	ui: string;
	uiSize: number;
	header: string;
	headerSize: number;
	body: string;
	bodySize: number;
	mono: string;
	monoSize: number;
	digital: string;
	digitalSize: number;
};

/**
 * Theme metrics, grouped per control family. Every value is a whole number of
 * CSS pixels. These are the *inputs*; `getThemeVars` derives the rest
 * (frames, bevels, edit-field height, …) from them. Platinum defaults live in
 * `CLASSICY_DEFAULT_THEME_METRICS` (`ClassicyThemeMetrics.ts`).
 */
export type ClassicyThemeMeasurementsWindow = {
	borderSize: number;
	controlSize: number;
	paddingSize: number;
	scrollbarSize: number;
	/** Document-window title bar height (HIGOS8: 19). */
	titleBarHeight: number;
	/** Utility (tool-palette) window title bar height (HIGOS8: 10). */
	utilityTitleBarHeight: number;
};

export type ClassicyThemeMeasurementsControl = {
	/** Standard control height: push buttons, pop-up menus, help button (20). */
	height: number;
	/** Gap between a checkbox/radio box and its label (5). */
	labelGap: number;
	/** Height of a line of static text (16). */
	staticTextHeight: number;
};

export type ClassicyThemeMeasurementsButton = {
	/** Minimum width of a standard push button such as OK/Cancel (58). */
	minWidth: number;
	/** Minimum text-to-border padding on each side (8). */
	textPadding: number;
	/** Horizontal gap between adjacent buttons (12). */
	gap: number;
};

export type ClassicyThemeMeasurementsGroupBox = {
	marginSide: number;
	marginTop: number;
	marginBottom: number;
	titlePad: number;
	/** Frame-to-frame gap between stacked group boxes (12). */
	gap: number;
};

export type ClassicyThemeMeasurementsLayout = {
	/** Minimum gap between clickable items (4). */
	itemGap: number;
	/** Gap between groups of controls (16). */
	groupGap: number;
	/** Button-to-dialog-edge margin (12). */
	dialogEdge: number;
};

export type ClassicyThemeMeasurements = {
	window: ClassicyThemeMeasurementsWindow;
	control: ClassicyThemeMeasurementsControl;
	button: ClassicyThemeMeasurementsButton;
	groupBox: ClassicyThemeMeasurementsGroupBox;
	layout: ClassicyThemeMeasurementsLayout;
};

export type ClassicyThemeDesktop = {
	iconSize: number;
	iconFontSize: number;
	backgroundImage: string;
	backgroundColor: number;
	backgroundSize: number | string;
	backgroundRepeat: string;
	backgroundPosition: string | number;
};

export type ClassicyTheme = {
	id: string;
	name: string;
	color: ClassicyThemeColors;
	typography: ClassicyThemeTypography;
	measurements: ClassicyThemeMeasurements;
	desktop: ClassicyThemeDesktop;
	sound: ClassicyThemeSound;
};

export const getThemeVars = (theme: ClassicyTheme) => {
	const m = theme.measurements;
	const border = m.window.borderSize;
	return {
		"--color-black": intToHex(theme.color.black),
		"--color-white": intToHex(theme.color.white),
		"--color-alert": intToHex(theme.color.alert),
		"--color-error": intToHex(theme.color.error),
		"--color-system-01": intToHex(theme.color.system[0]),
		"--color-system-02": intToHex(theme.color.system[1]),
		"--color-system-03": intToHex(theme.color.system[2]),
		"--color-system-04": intToHex(theme.color.system[3]),
		"--color-system-05": intToHex(theme.color.system[4]),
		"--color-system-06": intToHex(theme.color.system[5]),
		"--color-system-07": intToHex(theme.color.system[6]),
		"--color-theme-01": intToHex(theme.color.theme[0]),
		"--color-theme-02": intToHex(theme.color.theme[1]),
		"--color-theme-03": intToHex(theme.color.theme[2]),
		"--color-theme-04": intToHex(theme.color.theme[3]),
		"--color-theme-05": intToHex(theme.color.theme[4]),
		"--color-theme-06": intToHex(theme.color.theme[5]),
		"--color-theme-07": intToHex(theme.color.theme[6]),
		"--window-control-size": intToPx(theme.measurements.window.controlSize),
		"--window-border-size": intToPx(theme.measurements.window.borderSize),
		"--window-padding-size": intToPx(theme.measurements.window.paddingSize),
		"--window-scrollbar-size": intToPx(theme.measurements.window.scrollbarSize),
		// Stripe unit of the scrollbar arrow glyphs; scales with the scrollbar.
		"--window-scrollbar-arrow-size": intToPx(
			theme.measurements.window.scrollbarSize / 4,
		),
		// Classic Mac OS small-icon (SICN) size.
		"--icon-small-size": intToPx(16),
		// Classic Mac OS regular icon size (dialog icons, previews).
		"--icon-size-regular": intToPx(32),
		"--desktop-icon-size": intToPx(theme.desktop.iconSize),
		"--desktop-icon-font-size": intToPx(theme.desktop.iconFontSize),
		"--header-font": theme.typography.header,
		"--header-font-size": intToPx(theme.typography.headerSize),
		"--body-font": theme.typography.body,
		"--body-font-size": intToPx(theme.typography.bodySize),
		"--ui-font": theme.typography.ui,
		"--ui-font-size": intToPx(theme.typography.uiSize),
		"--mono-font": theme.typography.mono,
		"--mono-font-size": intToPx(theme.typography.monoSize),
		"--digital-font": theme.typography.digital,
		"--digital-font-size": intToPx(theme.typography.digitalSize),
		"--color-window-border": intToHex(theme.color.window.border),
		"--color-window-border-outset": intToHex(theme.color.window.borderOutset),
		"--color-window-border-inset": intToHex(theme.color.window.borderInset),
		"--color-window-frame": intToHex(theme.color.window.frame),
		"--color-window-title": intToHex(theme.color.window.title),
		"--color-window-document": intToHex(theme.color.window.document),
		"--color-outline": intToHex(theme.color.outline),
		"--color-select": intToHex(theme.color.select),
		"--color-highlight": intToHex(theme.color.highlight),
		"--desktop-background-image": `url(${theme.desktop.backgroundImage})`,
		"--desktop-background-color": intToHex(theme.desktop.backgroundColor),
		"--desktop-background-repeat": theme.desktop.backgroundRepeat,
		"--desktop-background-position": theme.desktop.backgroundPosition,
		"--desktop-background-size":
			typeof theme.desktop.backgroundSize === "number"
				? intToPct(theme.desktop.backgroundSize)
				: theme.desktop.backgroundSize,
		// --- Layout metrics (theme inputs under `measurements.<family>`; the
		// Platinum defaults are Mac OS 8 HIG Ch. 3 "Layout Guidelines").
		// Windows.
		"--window-title-bar-height": intToPx(m.window.titleBarHeight),
		"--window-utility-title-bar-height": intToPx(
			m.window.utilityTitleBarHeight,
		),
		// Controls.
		"--control-height": intToPx(m.control.height),
		"--control-label-gap": intToPx(m.control.labelGap),
		"--control-static-text-height": intToPx(m.control.staticTextHeight),
		// Push buttons (height is the standard control height).
		"--button-height": intToPx(m.control.height),
		"--button-min-width": intToPx(m.button.minWidth),
		"--button-text-padding": intToPx(m.button.textPadding),
		"--button-gap": intToPx(m.button.gap),
		// Group boxes.
		"--group-box-margin-side": intToPx(m.groupBox.marginSide),
		"--group-box-margin-top": intToPx(m.groupBox.marginTop),
		"--group-box-margin-bottom": intToPx(m.groupBox.marginBottom),
		"--group-box-title-pad": intToPx(m.groupBox.titlePad),
		"--group-box-gap": intToPx(m.groupBox.gap),
		// Generic spacing.
		"--layout-item-gap": intToPx(m.layout.itemGap),
		"--layout-group-gap": intToPx(m.layout.groupGap),
		"--layout-dialog-edge": intToPx(m.layout.dialogEdge),
		// --- Derived metrics: structural relationships, computed from the
		// inputs above so a theme that changes an input gets them for free.
		// A frame is two borders; bevels are 2/3/4 borders deep.
		"--control-frame-width": intToPx(border * 2),
		"--control-bevel-sm": intToPx(border * 2),
		"--control-bevel-md": intToPx(border * 3),
		"--control-bevel-lg": intToPx(border * 4),
		"--button-default-ring": intToPx(border * 3),
		// Height of a one-line control row (placard, list-box row).
		"--control-row-height": intToPx(m.window.controlSize * 1.5),
		// An edit field is a control plus its frame.
		"--edit-field-height": intToPx(m.control.height + border * 2),
		"--progress-height": intToPx(m.window.controlSize),
		"--help-button-width": intToPx(m.control.height),
		"--help-button-height": intToPx(m.control.height + border),
		// Preferred gap when focus rings show: the standard padding.
		"--layout-focus-gap": intToPx(m.window.paddingSize),
		// --- Deprecated `--hig-*` names, each a reference to its replacement.
		...Object.fromEntries(
			Object.entries(CLASSICY_DEPRECATED_METRIC_ALIASES).map(([old, next]) => [
				old,
				`var(${next})`,
			]),
		),
	};
};

/**
 * `themes.json` names its wallpapers; the bundler owns the URLs. Resolving once
 * here means every reader of a theme — `getTheme`, `getAllThemes`, and the
 * default app-manager state — gets a background image that actually loads.
 */
const resolvedThemes = (themesData as unknown as ClassicyTheme[]).map((theme) =>
	withDefaultThemeMetrics({
		...theme,
		desktop: {
			...theme.desktop,
			backgroundImage: resolveWallpaper(theme.desktop.backgroundImage),
		},
	}),
);

export const getAllThemes = (): ClassicyTheme[] => {
	return resolvedThemes;
};

export const getTheme = (theme: string, overrides?: object) => {
	const namedThemeData =
		resolvedThemes.find((t) => t.id === theme) || resolvedThemes[0];
	const updatedTheme = overrides
		? mergeDeep(
				structuredClone(namedThemeData) as Record<string, unknown>,
				overrides,
			)
		: namedThemeData;
	return updatedTheme as ClassicyTheme;
};

const mergeDeep = (
	target: Record<string, unknown>,
	...sources: unknown[]
): Record<string, unknown> => {
	if (!sources.length) {
		return target;
	}

	const source = sources.shift();

	const isObject = (item: unknown): item is Record<string, unknown> => {
		return item !== null && typeof item === "object" && !Array.isArray(item);
	};

	if (isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) {
					Object.assign(target, { [key]: {} });
				}
				if (isObject(target[key])) {
					mergeDeep(target[key] as Record<string, unknown>, source[key]);
				}
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
};
