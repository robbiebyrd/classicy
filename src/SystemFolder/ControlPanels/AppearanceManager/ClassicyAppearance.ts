import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import {
	intToPct,
	intToPx,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";
import type { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyThemeSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import themesData from "../AppearanceManager/styles/themes.json";

export interface ClassicyStoreSystemAppearanceManager
	extends ClassicyStoreSystemManager {
	availableThemes?: ClassicyTheme[];
	activeTheme: ClassicyTheme;
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

export type ClassicyThemeMeasurementsWindow = {
	borderSize: number;
	controlSize: number;
	paddingSize: number;
	scrollbarSize: number;
};

export type ClassicyThemeMeasurements = {
	window: ClassicyThemeMeasurementsWindow;
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
		// --- HIG dialog layout metrics (Mac OS 8 HIG, Ch. 3 "Layout Guidelines").
		// Fixed pixel values from the guidelines, exposed as tokens so controls
		// and dialogs can lay out to the HIG grid instead of ad-hoc spacing.
		// Push buttons.
		"--hig-button-height": intToPx(20),
		"--hig-button-min-width": intToPx(58), // standard OK/Cancel width
		"--hig-button-text-padding": intToPx(8), // min text-to-border each side
		"--hig-button-default-ring": intToPx(3), // default-button ring outset
		"--hig-button-gap-h": intToPx(12), // horizontal gap between buttons
		"--hig-button-gap-v": intToPx(10), // vertical stack gap between buttons
		"--hig-dialog-edge": intToPx(12), // button-to-dialog-edge
		// Generic spacing.
		"--hig-item-gap": intToPx(4), // min gap between clickable items
		"--hig-item-gap-focus": intToPx(6), // preferred gap when focus rings show
		"--hig-group-gap": intToPx(16), // gap between groups of controls
		// Checkboxes & radio buttons.
		"--hig-control-box": intToPx(12), // 12x12 box / circle
		"--hig-control-height": intToPx(18), // full control height
		"--hig-control-label-gap": intToPx(5), // box-to-label
		// Pop-up menus & edit fields.
		"--hig-popup-height": intToPx(20),
		"--hig-editfield-height": intToPx(22),
		// Group boxes.
		"--hig-groupbox-margin-side": intToPx(10),
		"--hig-groupbox-margin-top": intToPx(12),
		"--hig-groupbox-margin-bottom": intToPx(10),
		"--hig-groupbox-title-pad": intToPx(3),
		// Indicators & misc controls.
		"--hig-progress-height": intToPx(12),
		"--hig-static-text-height": intToPx(16),
		"--hig-disclosure-text-gap": intToPx(5),
		"--hig-help-button-width": intToPx(20),
		"--hig-help-button-height": intToPx(21),
		// Frames & bevels (2px frame shared by list box, edit text, image well,
		// primary group box, separator, modeless dialog frame).
		"--hig-frame-width": intToPx(2),
		"--hig-bevel-sm": intToPx(2),
		"--hig-bevel-md": intToPx(3),
		"--hig-bevel-lg": intToPx(4),
		// Windows.
		"--hig-titlebar-height": intToPx(19), // document window title bar
		"--hig-titlebar-height-utility": intToPx(10), // utility (tool-palette) title bar
	};
};

export const getAllThemes = (): ClassicyTheme[] => {
	return themesData as unknown as ClassicyTheme[];
};

export const getTheme = (theme: string, overrides?: object) => {
	const namedThemeData =
		themesData.find((t) => t.id === theme) || themesData[0];
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
