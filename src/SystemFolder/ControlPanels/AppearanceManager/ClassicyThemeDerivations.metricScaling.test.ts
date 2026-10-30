import { describe, expect, it } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_THEME_DERIVATIONS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { px3 } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.internal";
import {
	type ActionMessage,
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

// H-R25: a multiplier of a user-editable metric (the Metrics tab's window
// sizes, the Fonts tab's UI size, the desktop icon sizes) is named as a
// derivation, never a fixed knob, so it keeps scaling when a user edits the
// metric. Each row is a variable H 6.2 named, the metrics it reads, and the
// stylesheet calc() it replaced, as a function of the inputs.
type Inputs = {
	control: number;
	padding: number;
	border: number;
	ui: number;
	icon: number;
	iconFont: number;
};
type Metric = keyof Inputs;

const ROWS: readonly [string, readonly Metric[], (i: Inputs) => number][] = [
	// H 6.2a, first pass.
	[
		"--window-max-height-reserve",
		["control", "padding"],
		(i) => i.control * 4 + i.padding,
	],
	[
		"--window-contents-chrome-height",
		["control", "padding"],
		(i) => i.control * 1 + i.padding * 1.5,
	],
	[
		"--window-contents-header-chrome-height",
		["control", "padding"],
		(i) => i.control * 3 + i.padding,
	],
	[
		"--window-modal-contents-chrome-height",
		["control", "padding"],
		(i) => i.control * 2 + i.padding,
	],
	[
		"--window-utility-contents-chrome-height",
		["control", "padding"],
		(i) => i.control * 0.25 + i.padding * 1.5,
	],
	["--window-placard-end-reserve", ["control"], (i) => i.control * 3.5],
	["--window-modal-title-reserve", ["control"], (i) => i.control * 5],
	["--window-menu-bar-height", ["control"], (i) => i.control * 1.75],
	["--ui-font-size-xlarge", ["ui"], (i) => i.ui * 2],
	["--control-label-spacing", ["control"], (i) => i.control / 2],
	["--radio-mark-width", ["control"], (i) => i.control / 3],
	["--radio-mixed-mark-top", ["control"], (i) => i.control / 2.5],
	["--radio-mixed-mark-height", ["control"], (i) => i.control / 4],
	["--radio-mixed-mark-border", ["control"], (i) => i.control / 8],
	["--checkbox-x-mark-font-size", ["ui"], (i) => i.ui * 1.25],
	["--checkbox-x-mark-line-height", ["ui"], (i) => i.ui * 0.65],
	["--balloon-help-font-size", ["ui"], (i) => i.ui * 0.85],
	["--quick-time-time-font-size", ["ui"], (i) => i.ui * 0.85],
	["--quick-time-control-icon-size", ["control"], (i) => i.control * 0.875],
	["--quick-time-volume-track-inset", ["padding"], (i) => i.padding * 0.75],
	["--finder-about-font-size", ["ui"], (i) => i.ui * 0.8571],
	["--finder-about-title-font-size", ["ui"], (i) => i.ui * 1.8571],
	["--finder-about-heading-font-size", ["ui"], (i) => i.ui * 1.0714],
	["--finder-about-copyright-font-size", ["ui"], (i) => i.ui * 0.7857],
	["--menu-item-padding-inline", ["padding"], (i) => i.padding * 1.25],
	["--slider-thumb-corner-radius", ["border"], (i) => i.border * 1.5],
	["--tab-scroll-arrow-size", ["control"], (i) => i.control / 3],
	["--tab-scroll-arrow-size-large", ["control"], (i) => i.control / 2.25],
	["--tab-min-width-medium", ["control"], (i) => i.control * 7],
	["--tab-height-large", ["control"], (i) => i.control * 3],
	["--tab-large-padding-top", ["padding"], (i) => i.padding * 0.75],
	// H-R25: the former component knobs.
	["--assistant-header-gap", ["control"], (i) => i.control * 0.5],
	["--assistant-accessory-icon-medium", ["control"], (i) => i.control * 1.75],
	["--assistant-accessory-icon-large", ["control"], (i) => i.control * 2.5],
	["--button-toolbar-square-button-width", ["control"], (i) => i.control * 3],
	["--desktop-icon-label-gap", ["iconFont"], (i) => i.iconFont / 2],
	["--disclosure-triangle-offset", ["control"], (i) => i.control / 2],
	["--file-browser-list-icon-spacing", ["icon"], (i) => i.icon / 16],
	["--menu-sub-menu-offset-block", ["padding"], (i) => i.padding * 4],
	["--menu-sub-menu-offset-inline", ["padding"], (i) => i.padding * 2],
	["--picker-swatch-size", ["control"], (i) => i.control * 2.5],
	["--picker-layout-gap", ["padding"], (i) => i.padding * 2],
	["--quick-time-undocked-video-inset", ["border"], (i) => i.border * 4],
	["--quick-time-controls-end-reserve", ["control"], (i) => i.control * 2],
	["--quick-time-volume-bar-length", ["control"], (i) => i.control * 5],
	["--quick-time-volume-bar-offset", ["control"], (i) => i.control * 1.75],
	["--quick-time-thumb-rise", ["control"], (i) => i.control * 0.5],
	["--quick-time-thumb-shift-inline", ["control"], (i) => i.control * 0.25],
	["--quick-time-volume-track-top", ["control"], (i) => i.control * 0.25],
	["--quick-time-progress-track-top", ["control"], (i) => i.control * 0.25],
	["--quick-time-progress-track-height", ["control"], (i) => i.control * 0.75],
	["--radio-offset-top", ["control"], (i) => i.control / 2],
	["--tab-gap", ["padding"], (i) => i.padding * 2],
	["--tab-padding-inline", ["padding"], (i) => i.padding * 3],
	["--tab-scroll-button-min-width", ["control"], (i) => i.control * 3],
	["--tab-small-row-indent", ["control"], (i) => i.control / 2],
	["--tab-small-padding-inline", ["padding"], (i) => i.padding * 2],
	["--tab-small-icon-size", ["control"], (i) => i.control * 0.75],
	["--tab-large-padding-inline", ["padding"], (i) => i.padding * 4],
	["--text-editor-height-inset", ["border"], (i) => i.border * 4],
	["--text-editor-auto-min-height", ["control"], (i) => i.control * 3],
	["--time-picker-period-min-width", ["ui"], (i) => i.ui * 4],
];

// How a user edits each metric, and the non-default value it is set to.
const EDITS: Record<Metric, { action: ActionMessage; value: number }> = {
	control: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowControlSize",
			value: 16,
		},
		value: 16,
	},
	padding: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowPaddingSize",
			value: 8,
		},
		value: 8,
	},
	border: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowBorderSize",
			value: 2,
		},
		value: 2,
	},
	ui: {
		action: {
			type: "ClassicyDesktopChangeFontSize",
			fontType: "uiSize",
			fontSize: 18,
		},
		value: 18,
	},
	icon: {
		action: {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconSize",
			value: 32,
		},
		value: 32,
	},
	iconFont: {
		action: {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconFontSize",
			value: 16,
		},
		value: 16,
	},
};

const inputsOf = (t: ClassicyTheme): Inputs => ({
	control: t.measurements.window.controlSize,
	padding: t.measurements.window.paddingSize,
	border: t.measurements.window.borderSize,
	ui: t.typography.uiSize,
	icon: t.desktop.iconSize,
	iconFont: t.desktop.iconFontSize,
});

// The calc() result, as getThemeVars writes it: unrounded for the font
// sizes, three decimals otherwise.
const UNROUNDED = new Set(
	CLASSICY_THEME_DERIVATIONS.filter((d) => d.unrounded).map((d) => d.cssVar),
);
const asVar = (cssVar: string, n: number) =>
	UNROUNDED.has(cssVar) ? `${n}px` : px3(n);

const edited = (metric: Metric): ClassicyTheme => {
	const ds: ClassicyStore = mergeClassicyState(DefaultAppManagerState, {});
	classicyDesktopEventHandler(ds, EDITS[metric].action);
	return ds.System.Manager.Appearance.activeTheme;
};

describe("H-R25: the named multipliers follow the metrics a user edits", () => {
	it("lists every H 6.2 name, each a named derivation", () => {
		const derived = new Set(CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar));
		for (const [cssVar] of ROWS) expect(derived.has(cssVar), cssVar).toBe(true);
		expect(new Set(ROWS.map(([cssVar]) => cssVar)).size).toBe(62);
	});

	it.each(
		Object.keys(EDITS) as Metric[],
	)("editing %s rescales every variable that reads it, as its calc() did", (metric) => {
		const theme = edited(metric);
		const inputs = inputsOf(theme);
		expect(inputs[metric], "the edit reached the active theme").toBe(
			EDITS[metric].value,
		);
		const before = getThemeVars(getTheme("default")) as Record<string, string>;
		const after = getThemeVars(theme) as Record<string, string>;
		const rows = ROWS.filter(([, metrics]) => metrics.includes(metric));
		expect(rows.length, metric).toBeGreaterThan(0);
		for (const [cssVar, , calc] of rows) {
			expect(after[cssVar], cssVar).toBe(asVar(cssVar, calc(inputs)));
			expect(after[cssVar], `${cssVar} moved`).not.toBe(before[cssVar]);
		}
	});
});
