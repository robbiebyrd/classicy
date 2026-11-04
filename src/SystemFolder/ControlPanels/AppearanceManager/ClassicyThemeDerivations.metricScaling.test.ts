import { describe, expect, it } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_DERIVATIONS,
	type ClassicyThemeDerivationInputs,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { px3 } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.internal";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	CLASSICY_THEME_METRIC_TARGETS,
	type ClassicyThemeMetricKey,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
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
	utilityTitleBar: number;
	itemGap: number;
	groupGap: number;
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
	// H-R28b: the title-bar cap offset, formerly read from --control-padding.
	// (The site negates it: calc((var(--window-padding-size) * -1) / 2).)
	["--window-title-cap-offset", ["padding"], (i) => i.padding / 2],
	// H-R29d: the H 2.1–6.1 derivations of an editable metric.
	[
		"--window-frame-inset-whole",
		["padding"],
		(i) => Math.floor(i.padding / 1.25),
	],
	["--layout-item-gap-half", ["itemGap"], (i) => i.itemGap / 2],
	// H 6.2b: the sites in H 6.1's files.
	[
		"--window-utility-control-box-size",
		["utilityTitleBar", "border"],
		// width/height clamp a negative calc() to 0.
		(i) => Math.max(0, i.utilityTitleBar - i.border * 4),
	],
	["--appearance-manager-swatch-label-gap", ["itemGap"], (i) => i.itemGap / 2],
	["--drive-setup-list-min-height", ["control"], (i) => i.control * 8],
	["--startup-screen-panel-gap", ["padding"], (i) => i.padding * 3],
	["--startup-screen-panel-padding-block", ["padding"], (i) => i.padding * 6],
	["--startup-screen-panel-padding-inline", ["padding"], (i) => i.padding * 8],
	["--startup-screen-extensions-inset", ["padding"], (i) => i.padding * 2],
	["--control-group-legend-overhang", ["ui"], (i) => (i.ui * 0.75 * 1.4) / 2],
	["--keyboard-equivalent-display-inset", ["groupGap"], (i) => i.groupGap * 2],
	["--slider-vertical-min-height", ["control"], (i) => i.control * 8],
	["--slider-tick-length", ["padding"], (i) => i.padding * 0.75],
	["--slider-tick-labels-height", ["ui"], (i) => i.ui * 1.2],
	["--table-sort-arrow-height", ["ui"], (i) => i.ui * 0.5],
	["--window-frame-body-padding", ["padding"], (i) => i.padding * 2],
];

// The rows H 6.2b added: every one is exact at three decimals for whole-pixel
// inputs, so px3 rounds nothing away from the calc() it replaced.
const H62B_ROWS = ROWS.slice(
	ROWS.findIndex(([v]) => v === "--window-utility-control-box-size"),
);

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
	utilityTitleBar: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowUtilityTitleBarHeight",
			value: 14,
		},
		value: 14,
	},
	itemGap: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "layoutItemGap",
			value: 6,
		},
		value: 6,
	},
	groupGap: {
		action: {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "layoutGroupGap",
			value: 20,
		},
		value: 20,
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
	utilityTitleBar: t.measurements.window.utilityTitleBarHeight,
	itemGap: t.measurements.layout.itemGap,
	groupGap: t.measurements.layout.groupGap,
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
	it("lists every H 6.2 name and the H-R29d pair, each a named derivation", () => {
		const derived = new Set(CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar));
		for (const [cssVar] of ROWS) expect(derived.has(cssVar), cssVar).toBe(true);
		expect(new Set(ROWS.map(([cssVar]) => cssVar)).size).toBe(79);
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

// The Metrics-tab key of each window and layout input; the font and desktop
// sizes have no Metrics-tab target and sweep 1–512 like the others' ceiling.
const METRIC_KEYS: Partial<Record<Metric, ClassicyThemeMetricKey>> = {
	control: "windowControlSize",
	padding: "windowPaddingSize",
	border: "windowBorderSize",
	utilityTitleBar: "windowUtilityTitleBarHeight",
	itemGap: "layoutItemGap",
	groupGap: "layoutGroupGap",
};
const rangeOf = (metric: Metric): readonly [number, number] => {
	const key = METRIC_KEYS[metric];
	const info = CLASSICY_THEME_METRIC_TARGETS.find(
		(t) => t.target.metricKey === key,
	);
	return info ? [info.min, info.max] : [1, 512];
};
// The default theme's inputs with one metric set to `v`, as the Inputs the
// rows read and as the derivation inputs getThemeVars passes.
const withInput = (
	t: ClassicyTheme,
	metric: Metric,
	v: number,
): [Inputs, ClassicyThemeDerivationInputs] => {
	const m = t.measurements;
	const i: Inputs = { ...inputsOf(t), [metric]: v };
	return [
		i,
		{
			measurements: {
				...m,
				window: {
					...m.window,
					controlSize: i.control,
					paddingSize: i.padding,
					borderSize: i.border,
					utilityTitleBarHeight: i.utilityTitleBar,
				},
				layout: { ...m.layout, itemGap: i.itemGap, groupGap: i.groupGap },
			},
			typography: { uiSize: i.ui },
			desktop: { iconSize: i.icon, iconFontSize: i.iconFont },
		},
	];
};

describe("H 6.2: each named multiplier equals its calc() at every whole-pixel value", () => {
	it.each(
		ROWS.map(([cssVar, metrics, calc]) => ({ cssVar, metrics, calc })),
	)("$cssVar", ({ cssVar, metrics, calc }) => {
		const derivation = CLASSICY_THEME_DERIVATIONS.find(
			(d) => d.cssVar === cssVar,
		);
		expect(derivation, cssVar).toBeDefined();
		const theme = getTheme("default");
		const exact = H62B_ROWS.some(([v]) => v === cssVar);
		for (const metric of metrics) {
			const [min, max] = rangeOf(metric);
			for (let v = min; v <= max; v++) {
				const [rowInputs, inputs] = withInput(theme, metric, v);
				const want = calc(rowInputs);
				const got = derivation?.compute(inputs) ?? Number.NaN;
				expect(asVar(cssVar, got), `${cssVar} at ${metric} ${v}`).toBe(
					asVar(cssVar, want),
				);
				// H 6.2b's sites: px3 drops nothing the calc() kept.
				if (exact)
					expect(
						Math.abs(Number.parseFloat(asVar(cssVar, got)) - want),
						`${cssVar} at ${metric} ${v} rounds`,
					).toBeLessThan(1e-9);
			}
		}
	});
});

// H 6.2b review m2: the sweep above varies only the metrics a row lists, so a
// derivation that also read another metric would still pass it. Each name must
// hold still while every metric it does not list sweeps its whole range.
describe("H 6.2: each named multiplier reads only the metrics it lists", () => {
	const ALL_METRICS = Object.keys(EDITS) as Metric[];
	it.each(
		ROWS.map(([cssVar, metrics, calc]) => ({ cssVar, metrics, calc })),
	)("$cssVar", ({ cssVar, metrics, calc }) => {
		const derivation = CLASSICY_THEME_DERIVATIONS.find(
			(d) => d.cssVar === cssVar,
		);
		expect(derivation, cssVar).toBeDefined();
		const theme = getTheme("default");
		const want = asVar(cssVar, calc(inputsOf(theme)));
		const moved: string[] = [];
		for (const metric of ALL_METRICS.filter((m) => !metrics.includes(m))) {
			const [min, max] = rangeOf(metric);
			for (let v = min; v <= max; v++) {
				const [, inputs] = withInput(theme, metric, v);
				const got = asVar(cssVar, derivation?.compute(inputs) ?? Number.NaN);
				if (got !== want) moved.push(`${metric} ${v}: ${got}`);
			}
		}
		expect(moved, `${cssVar} follows a metric it does not list`).toEqual([]);
	});
});

// H-R29d: the stripe period derives from a knob, progressBar.stripeWidth, that
// no tab edits; a theme file sets it. The period must follow every width a
// theme file can carry, through the file's own round trip.
describe("--progress-bar-stripe-period follows progressBar.stripeWidth", () => {
	const withStripeWidth = (stripeWidth: number): ClassicyTheme => {
		const theme = getTheme("default");
		return {
			...theme,
			measurements: { ...theme.measurements, progressBar: { stripeWidth } },
		};
	};

	it("is twice the stripe width at every whole-pixel width", () => {
		for (let w = 1; w <= 512; w++) {
			const vars = getThemeVars(withStripeWidth(w)) as Record<string, string>;
			expect(vars["--progress-bar-stripe-width"], `width ${w}`).toBe(`${w}px`);
			expect(vars["--progress-bar-stripe-period"], `width ${w}`).toBe(
				px3(w * 2),
			);
		}
	});

	it("follows a stripe width loaded from a theme file", () => {
		const loaded = parseClassicyThemeFile(
			exportClassicyTheme(withStripeWidth(7)),
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		const vars = getThemeVars(loaded.theme) as Record<string, string>;
		expect(vars["--progress-bar-stripe-period"]).toBe("14px");
		expect(
			(getThemeVars(getTheme("default")) as Record<string, string>)[
				"--progress-bar-stripe-period"
			],
		).toBe("20px");
	});
});
