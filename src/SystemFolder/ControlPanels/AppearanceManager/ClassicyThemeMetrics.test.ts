import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	type ClassicyThemeWithPartialMetrics,
	classicyMeasurementVarName,
	classicyMeasurementVars,
	classicyThemeMeasurementDefaults,
	isReservedClassicyThemeVar,
	withDefaultThemeMetrics,
	withDefaultThemeMetricsList,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

/** A default theme carrying only the four pre-metrics window keys. */
const windowOnlyTheme = (): ClassicyThemeWithPartialMetrics => ({
	...getTheme("default"),
	measurements: {
		window: {
			borderSize: 1,
			controlSize: 12,
			paddingSize: 6,
			scrollbarSize: 17,
		},
	},
});

describe("CLASSICY_DEFAULT_THEME_METRICS", () => {
	it("defaults match the spec", () => {
		expect(CLASSICY_DEFAULT_THEME_METRICS).toEqual({
			window: {
				borderSize: 1,
				controlSize: 12,
				paddingSize: 6,
				scrollbarSize: 17,
				titleBarHeight: 19,
				utilityTitleBarHeight: 10,
			},
			control: { height: 20, labelGap: 5, staticTextHeight: 16 },
			button: { minWidth: 58, textPadding: 8, gap: 12 },
			groupBox: {
				marginSide: 10,
				marginTop: 12,
				marginBottom: 10,
				titlePad: 3,
				gap: 12,
			},
			layout: { itemGap: 4, groupGap: 16, dialogEdge: 12 },
		});
	});
});

describe("withDefaultThemeMetrics", () => {
	it("fills every missing group with the Platinum defaults", () => {
		const filled = withDefaultThemeMetrics(windowOnlyTheme());
		expect(filled.measurements).toEqual(CLASSICY_DEFAULT_THEME_METRICS);
	});

	it("keeps values that are present", () => {
		const theme = windowOnlyTheme();
		theme.measurements = { ...theme.measurements, control: { height: 30 } };
		const filled = withDefaultThemeMetrics(theme);
		expect(filled.measurements.control.height).toBe(30);
		expect(filled.measurements.control.labelGap).toBe(5);
		expect(filled.measurements.window.borderSize).toBe(1);
	});

	it("returns the same reference when complete", () => {
		const theme = getTheme("default");
		expect(withDefaultThemeMetrics(theme)).toBe(theme);
	});

	it("does not mutate a partial input", () => {
		const theme = windowOnlyTheme();
		const before = JSON.stringify(theme);
		withDefaultThemeMetrics(theme);
		expect(JSON.stringify(theme)).toBe(before);
	});

	it("is idempotent", () => {
		const once = withDefaultThemeMetrics(windowOnlyTheme());
		const twice = withDefaultThemeMetrics(once);
		expect(twice).toBe(once);
		expect(twice.measurements).toEqual(once.measurements);
	});

	it("every built-in theme is complete", () => {
		for (const theme of getAllThemes()) {
			expect(withDefaultThemeMetrics(theme)).toBe(theme);
		}
	});

	it("keeps a package measurement family when filling the core groups", () => {
		const theme = windowOnlyTheme();
		theme.measurements = {
			...theme.measurements,
			controlStrip: { cellHeight: 22, moduleWidth: 30 },
		};
		const filled = withDefaultThemeMetrics(theme);
		expect(filled.measurements.controlStrip).toEqual({
			cellHeight: 22,
			moduleWidth: 30,
		});
		expect(filled.measurements.layout).toEqual(
			CLASSICY_DEFAULT_THEME_METRICS.layout,
		);
	});
});

describe("classicyMeasurementVars", () => {
	it("classicyMeasurementVars kebab-cases family and key", () =>
		expect(
			classicyMeasurementVars({
				controlStrip: { cellHeight: 22, moduleWidth: 30 },
				popUpSlider: { trackLeft: 4 },
				window: { borderSize: 1 },
			} as never),
		).toEqual({
			"--control-strip-cell-height": "22px",
			"--control-strip-module-width": "30px",
			"--pop-up-slider-track-left": "4px",
			"--window-border-size": "1px",
		}));

	it("classicyMeasurementVars skips non-number leaves", () =>
		expect(
			classicyMeasurementVars({
				x: { a: "no", b: Number.NaN, c: 2 },
			} as never),
		).toEqual({ "--x-c": "2px" }));
});

// The families Platinum adds beside the core five, in platinum.json order
// (H 2.1, with H-B1's pager.fontSize and H-R11's utilityTitleBar).
const PLATINUM_KNOB_FAMILIES = [
	"controlStrip",
	"menuFrame",
	"pager",
	"balloonHelp",
	"popUpSlider",
	"scrollbar",
	"hyperCard",
	"finder",
	"appleGuide",
	"picker",
	"dialog",
	"controlPanel",
	"progressBar",
	"utilityTitleBar",
	"crashScreen",
	"boot",
	"helpButton",
	"quickTime",
	"menu",
	"table",
];

// A package shaped like Storybook's Test Pack: a partial controlStrip (one
// Platinum key, one of its own) and a family Platinum does not have.
const PARTIAL_PACK_ID = "partial-pack";
const partialPack = (): ClassicyAppearancePackage => {
	const base = getTheme("default");
	return {
		id: PARTIAL_PACK_ID,
		name: "Partial Pack",
		css: "",
		defaults: {
			...base,
			id: PARTIAL_PACK_ID,
			name: "Partial Pack",
			package: PARTIAL_PACK_ID,
			measurements: {
				...base.measurements,
				window: { ...base.measurements.window, borderSize: 2 },
				controlStrip: { cellHeight: 30, tabWidth: 12 },
				menuBar: { barHeight: 20 },
			},
		},
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
	};
};

describe("classicyThemeMeasurementDefaults", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(PARTIAL_PACK_ID);
	});

	it("classicyThemeMeasurementDefaults carries the Platinum knob families", () => {
		const d = classicyThemeMeasurementDefaults("platinum");
		expect(d.controlStrip.cellHeight).toBe(22);
		expect(d.menuFrame.shadowOffset).toBe(2);
		expect(d.pager.arrowWidth).toBe(42);
		expect(d.balloonHelp.tailWidth).toBe(20);
		expect(d.popUpSlider.height).toBe(73);
		expect(d.scrollbar.arrowGlyphWidth).toBe(7);
		expect(d.window.borderSize).toBe(1);
	});

	it("classicyThemeMeasurementDefaults falls back to Platinum for an unknown package", () =>
		expect(
			classicyThemeMeasurementDefaults("nope").controlStrip.cellHeight,
		).toBe(22));

	it("is platinum.json's defaults.measurements for Platinum, an unknown package and no package", () => {
		for (const id of ["platinum", "nope", undefined]) {
			expect(classicyThemeMeasurementDefaults(id), String(id)).toEqual(
				platinumJson.defaults.measurements,
			);
		}
	});

	it("carries the core five and every Platinum family", () =>
		expect(Object.keys(classicyThemeMeasurementDefaults("platinum"))).toEqual([
			...Object.keys(CLASSICY_DEFAULT_THEME_METRICS),
			...PLATINUM_KNOB_FAMILIES,
		]));

	it("merges a package's partial family key by key over Platinum's", () => {
		registerClassicyAppearancePackage(partialPack());
		const d = classicyThemeMeasurementDefaults(PARTIAL_PACK_ID);
		// The package's own values win, its own keys and families are kept…
		expect(d.controlStrip.cellHeight).toBe(30);
		expect(d.controlStrip.tabWidth).toBe(12);
		expect(d.menuBar).toEqual({ barHeight: 20 });
		expect(d.window.borderSize).toBe(2);
		// …and every Platinum key it leaves out comes from Platinum.
		for (const key of Object.keys(
			platinumJson.defaults.measurements.controlStrip,
		)) {
			expect(typeof d.controlStrip[key], key).toBe("number");
		}
		expect(Object.keys(d.controlStrip)).toHaveLength(15);
		expect(d.pager.arrowWidth).toBe(42);
	});

	it("every Platinum family and key makes an unreserved variable", () => {
		for (const [family, keys] of Object.entries(
			classicyThemeMeasurementDefaults("platinum"),
		)) {
			for (const key of Object.keys(keys)) {
				const name = classicyMeasurementVarName(family, key);
				expect(isReservedClassicyThemeVar(name), name).toBe(false);
			}
		}
	});

	it("every Platinum value is a whole number of pixels within 0–512", () => {
		for (const [family, keys] of Object.entries(
			classicyThemeMeasurementDefaults("platinum"),
		)) {
			for (const [key, value] of Object.entries(keys)) {
				expect(Number.isInteger(value), `${family}.${key}`).toBe(true);
				expect(value, `${family}.${key}`).toBeGreaterThanOrEqual(0);
				expect(value, `${family}.${key}`).toBeLessThanOrEqual(512);
			}
		}
	});

	it("getAllThemes resolves knobs when ClassicyThemeMetrics is the first module loaded", async () => {
		vi.resetModules();
		try {
			await import(
				"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics"
			);
			const { getAllThemes } = await import(
				"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
			);
			expect(getAllThemes()[0].measurements.controlStrip.cellHeight).toBe(22);
		} finally {
			vi.resetModules();
		}
	}, 60_000);
});

describe("withDefaultThemeMetrics with package defaults", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(PARTIAL_PACK_ID);
	});

	it("withDefaultThemeMetrics(theme, defaults) fills knob families and keeps present values", () => {
		const t = withDefaultThemeMetrics(
			{
				...getTheme("default"),
				measurements: {
					...CLASSICY_DEFAULT_THEME_METRICS,
					controlStrip: { cellHeight: 30 },
				},
			},
			classicyThemeMeasurementDefaults("platinum"),
		);
		expect(t.measurements.controlStrip.cellHeight).toBe(30);
		expect(t.measurements.controlStrip.moduleWidth).toBe(30);
		expect(t.measurements.pager.arrowWidth).toBe(42);
	});

	it("keeps a family's own extra keys and unknown families while filling", () => {
		const theme: ClassicyThemeWithPartialMetrics = {
			...getTheme("default"),
			measurements: {
				...CLASSICY_DEFAULT_THEME_METRICS,
				controlStrip: { cellHeight: 30, tabWidth: 12 },
				menuBar: { barHeight: 20 },
			},
		};
		const t = withDefaultThemeMetrics(
			theme,
			classicyThemeMeasurementDefaults("platinum"),
		);
		expect(t.measurements.controlStrip.tabWidth).toBe(12);
		expect(t.measurements.menuBar).toEqual({ barHeight: 20 });
		expect(Object.keys(t.measurements.controlStrip)).toHaveLength(15);
	});

	it("replaces a non-numeric knob value and a family that is not an object", () => {
		const t = withDefaultThemeMetrics(
			{
				...getTheme("default"),
				measurements: {
					...CLASSICY_DEFAULT_THEME_METRICS,
					controlStrip: { cellHeight: Number.NaN, moduleWidth: "30" },
					pager: 5,
				},
			},
			classicyThemeMeasurementDefaults("platinum"),
		);
		expect(t.measurements.controlStrip.cellHeight).toBe(22);
		expect(t.measurements.controlStrip.moduleWidth).toBe(30);
		expect(t.measurements.pager.arrowWidth).toBe(42);
	});

	it("is copy-on-write: the same theme back once complete, the input never mutated", () => {
		const defaults = classicyThemeMeasurementDefaults("platinum");
		const partial: ClassicyThemeWithPartialMetrics = {
			...getTheme("default"),
			measurements: { ...CLASSICY_DEFAULT_THEME_METRICS },
		};
		const before = JSON.stringify(partial);
		const once = withDefaultThemeMetrics(partial, defaults);
		expect(once).not.toBe(partial);
		expect(JSON.stringify(partial)).toBe(before);
		expect(withDefaultThemeMetrics(once, defaults)).toBe(once);
		for (const theme of getAllThemes()) {
			expect(withDefaultThemeMetrics(theme, defaults), theme.id).toBe(theme);
		}
	});

	it("withDefaultThemeMetricsList fills each theme from its own package's defaults", () => {
		registerClassicyAppearancePackage(partialPack());
		// Typed as complete themes (as the store types its lists) while
		// carrying only the core five.
		const bare = (pkg: string) =>
			({
				...getTheme("default"),
				package: pkg,
				measurements: { ...CLASSICY_DEFAULT_THEME_METRICS },
			}) as ReturnType<typeof getTheme>;
		const complete = getTheme("default");
		const themes = [bare("platinum"), bare(PARTIAL_PACK_ID), complete];
		const filled = withDefaultThemeMetricsList(themes, (t) =>
			classicyThemeMeasurementDefaults(t.package),
		);
		expect(filled[0].measurements.controlStrip.cellHeight).toBe(22);
		expect(filled[1].measurements.controlStrip.cellHeight).toBe(30);
		expect(filled[1].measurements.controlStrip.moduleWidth).toBe(30);
		expect(filled[2]).toBe(complete);
		const again = withDefaultThemeMetricsList(filled, (t) =>
			classicyThemeMeasurementDefaults(t.package),
		);
		expect(again).toBe(filled);
	});

	it("a Test Pack-shaped theme with a partial controlStrip still gets all 14 strip variables", () => {
		registerClassicyAppearancePackage(partialPack());
		const base = getTheme("default");
		const vars = getThemeVars({
			...base,
			package: PARTIAL_PACK_ID,
			measurements: {
				...CLASSICY_DEFAULT_THEME_METRICS,
				controlStrip: { cellHeight: 30, tabWidth: 12 },
			},
		} as typeof base) as Record<string, string>;
		const strip = Object.keys(vars).filter((name) =>
			name.startsWith("--control-strip-"),
		);
		for (const key of Object.keys(
			platinumJson.defaults.measurements.controlStrip,
		)) {
			expect(vars, key).toHaveProperty(
				classicyMeasurementVarName("controlStrip", key),
			);
		}
		expect(strip).toHaveLength(15);
		expect(vars["--control-strip-cell-height"]).toBe("30px");
		expect(vars["--control-strip-tab-width"]).toBe("12px");
		expect(vars["--control-strip-module-width"]).toBe("30px");
	});
});
