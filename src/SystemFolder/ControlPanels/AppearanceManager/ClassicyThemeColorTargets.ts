import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * Every colour a theme exposes as a CSS variable, addressed by a flat,
 * typed target. This table is the single source the `ClassicyDesktopChangeColor`
 * reducer validates against and the Appearance Manager's Colors tab renders
 * from, so a new theme colour is added in exactly one place.
 *
 * Scalar keys are camelCase spellings of their CSS variable
 * (`--color-window-border-outset` → `windowBorderOutset`,
 * `--desktop-background-color` → `desktopBackground`). The two 7-colour
 * palettes are addressed as `{ colorKey: "system" | "theme", index: 0..6 }`,
 * where index 0 is `--color-system-01` / `--color-theme-01`.
 */
export const CLASSICY_THEME_COLOR_SCALAR_KEYS = [
	"black",
	"white",
	"alert",
	"error",
	"windowBorder",
	"windowBorderOutset",
	"windowBorderInset",
	"windowFrame",
	"windowTitle",
	"windowDocument",
	"outline",
	"select",
	"highlight",
	"desktopBackground",
] as const;

export type ClassicyThemeColorScalarKey =
	(typeof CLASSICY_THEME_COLOR_SCALAR_KEYS)[number];

export const CLASSICY_THEME_COLOR_PALETTE_KEYS = ["system", "theme"] as const;

export type ClassicyThemeColorPaletteKey =
	(typeof CLASSICY_THEME_COLOR_PALETTE_KEYS)[number];

/** Number of entries in each of the `system` and `theme` palettes. */
export const CLASSICY_THEME_COLOR_PALETTE_SIZE = 7;

export type ClassicyThemeColorPaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ClassicyThemeColorKey =
	| ClassicyThemeColorScalarKey
	| ClassicyThemeColorPaletteKey;

/** Addresses exactly one theme colour. `index` is required for the palettes
 * and must be absent for scalar keys. */
export type ClassicyThemeColorTarget =
	| { colorKey: ClassicyThemeColorScalarKey; index?: undefined }
	| {
			colorKey: ClassicyThemeColorPaletteKey;
			index: ClassicyThemeColorPaletteIndex;
	  };

/** Payload of `ClassicyDesktopChangeColor` (minus `type`). */
export type ClassicyThemeColorChange = ClassicyThemeColorTarget & {
	/** 24-bit RGB integer, 0x000000–0xFFFFFF. */
	color: number;
};

export type ClassicyThemeColorGroupId =
	| "base"
	| "system"
	| "theme"
	| "window"
	| "selection"
	| "desktop";

export const CLASSICY_THEME_COLOR_GROUPS: readonly {
	id: ClassicyThemeColorGroupId;
	label: string;
}[] = [
	{ id: "base", label: "Base" },
	{ id: "system", label: "System Palette" },
	{ id: "theme", label: "Theme Palette" },
	{ id: "window", label: "Window" },
	{ id: "selection", label: "Selection" },
	{ id: "desktop", label: "Desktop" },
];

export type ClassicyThemeColorTargetInfo = {
	target: ClassicyThemeColorTarget;
	/** The CSS custom property `getThemeVars` emits for this colour. */
	cssVar: string;
	/** Short label for the Colors tab (its group supplies the context). */
	label: string;
	group: ClassicyThemeColorGroupId;
};

const scalar = (
	colorKey: ClassicyThemeColorScalarKey,
	cssVar: string,
	label: string,
	group: ClassicyThemeColorGroupId,
): ClassicyThemeColorTargetInfo => ({
	target: { colorKey },
	cssVar,
	label,
	group,
});

const palette = (
	colorKey: ClassicyThemeColorPaletteKey,
): ClassicyThemeColorTargetInfo[] =>
	Array.from({ length: CLASSICY_THEME_COLOR_PALETTE_SIZE }, (_, i) => ({
		target: { colorKey, index: i as ClassicyThemeColorPaletteIndex },
		cssVar: `--color-${colorKey}-${String(i + 1).padStart(2, "0")}`,
		label: String(i + 1),
		group: colorKey,
	}));

/** All 28 editable theme colours, in Colors-tab order. */
export const CLASSICY_THEME_COLOR_TARGETS: readonly ClassicyThemeColorTargetInfo[] =
	[
		scalar("black", "--color-black", "Black", "base"),
		scalar("white", "--color-white", "White", "base"),
		scalar("alert", "--color-alert", "Alert", "base"),
		scalar("error", "--color-error", "Error", "base"),
		...palette("system"),
		...palette("theme"),
		scalar("windowBorder", "--color-window-border", "Border", "window"),
		scalar(
			"windowBorderOutset",
			"--color-window-border-outset",
			"Outset",
			"window",
		),
		scalar(
			"windowBorderInset",
			"--color-window-border-inset",
			"Inset",
			"window",
		),
		scalar("windowFrame", "--color-window-frame", "Frame", "window"),
		scalar("windowTitle", "--color-window-title", "Title", "window"),
		scalar("windowDocument", "--color-window-document", "Document", "window"),
		scalar("outline", "--color-outline", "Outline", "selection"),
		scalar("select", "--color-select", "Select", "selection"),
		scalar("highlight", "--color-highlight", "Highlight", "selection"),
		scalar(
			"desktopBackground",
			"--desktop-background-color",
			"Background",
			"desktop",
		),
	];

/** True for a 24-bit RGB integer (0x000000–0xFFFFFF). Rejects fractions,
 * negatives and NaN, which `intToHex` would turn into malformed CSS. */
export const isValidThemeColor = (value: unknown): value is number =>
	typeof value === "number" &&
	Number.isInteger(value) &&
	value >= 0 &&
	value <= 0xffffff;

const isScalarKey = (v: unknown): v is ClassicyThemeColorScalarKey =>
	(CLASSICY_THEME_COLOR_SCALAR_KEYS as readonly unknown[]).includes(v);

const isPaletteKey = (v: unknown): v is ClassicyThemeColorPaletteKey =>
	(CLASSICY_THEME_COLOR_PALETTE_KEYS as readonly unknown[]).includes(v);

/** Validates an untyped `{ colorKey, index }` pair as a colour target. */
export const isThemeColorTarget = (
	value: Readonly<Record<string, unknown>>,
): value is ClassicyThemeColorTarget => {
	if (isScalarKey(value.colorKey)) return value.index === undefined;
	if (isPaletteKey(value.colorKey)) {
		return (
			typeof value.index === "number" &&
			Number.isInteger(value.index) &&
			value.index >= 0 &&
			value.index < CLASSICY_THEME_COLOR_PALETTE_SIZE
		);
	}
	return false;
};

/** Reads the colour a target addresses. */
export const getThemeColor = (
	theme: ClassicyTheme,
	target: ClassicyThemeColorTarget,
): number => {
	const c = theme.color;
	switch (target.colorKey) {
		case "system":
		case "theme":
			return c[target.colorKey][target.index];
		case "black":
		case "white":
		case "alert":
		case "error":
		case "outline":
		case "select":
		case "highlight":
			return c[target.colorKey];
		case "windowBorder":
			return c.window.border;
		case "windowBorderOutset":
			return c.window.borderOutset;
		case "windowBorderInset":
			return c.window.borderInset;
		case "windowFrame":
			return c.window.frame;
		case "windowTitle":
			return c.window.title;
		case "windowDocument":
			return c.window.document;
		case "desktopBackground":
			return theme.desktop.backgroundColor;
	}
};

/**
 * A palette position as a guaranteed in-range integer index (0–6). Throws on
 * anything else rather than writing to an arbitrary key.
 */
const paletteSlot = (index: number): number => {
	if (
		!Number.isInteger(index) ||
		index < 0 ||
		index >= CLASSICY_THEME_COLOR_PALETTE_SIZE
	) {
		throw new RangeError(`Palette index out of range: ${index}`);
	}
	return index;
};

/** Writes `color` to the slot a target addresses, mutating `theme`. */
export const setThemeColor = (
	theme: ClassicyTheme,
	target: ClassicyThemeColorTarget,
	color: number,
): void => {
	const c = theme.color;
	// Every write names its property literally. The payload is validated
	// against an allowlist first (isThemeColorTarget), but spelling each slot
	// out means no part of an incoming action is ever used as a property name,
	// so not even a validation bug could reach `__proto__` or `constructor`.
	switch (target.colorKey) {
		case "system":
			c.system[paletteSlot(target.index)] = color;
			return;
		case "theme":
			c.theme[paletteSlot(target.index)] = color;
			return;
		case "black":
			c.black = color;
			return;
		case "white":
			c.white = color;
			return;
		case "alert":
			c.alert = color;
			return;
		case "error":
			c.error = color;
			return;
		case "outline":
			c.outline = color;
			return;
		case "select":
			c.select = color;
			return;
		case "highlight":
			c.highlight = color;
			return;
		case "windowBorder":
			c.window.border = color;
			return;
		case "windowBorderOutset":
			c.window.borderOutset = color;
			return;
		case "windowBorderInset":
			c.window.borderInset = color;
			return;
		case "windowFrame":
			c.window.frame = color;
			return;
		case "windowTitle":
			c.window.title = color;
			return;
		case "windowDocument":
			c.window.document = color;
			return;
		case "desktopBackground":
			theme.desktop.backgroundColor = color;
			return;
	}
};
