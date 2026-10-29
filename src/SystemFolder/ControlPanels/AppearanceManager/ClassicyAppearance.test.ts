import { describe, expect, it } from "vitest";
import {
	type ClassicyThemeMeasurements,
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	classicyMeasurementVars,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
// getThemeVars for every built-in theme, captured at c2da6d1c7 — before the
// measurements walker replaced the explicit input emissions.
import themeVarsBaseline from "./ClassicyAppearance.themeVars.baseline.json";

describe("getAllThemes", () => {
	it("returns an array", () => {
		expect(Array.isArray(getAllThemes())).toBe(true);
	});

	it("returns a non-empty array", () => {
		expect(getAllThemes().length).toBeGreaterThan(0);
	});

	it("each theme has required top-level fields", () => {
		const themes = getAllThemes();
		for (const theme of themes) {
			expect(theme).toHaveProperty("id");
			expect(theme).toHaveProperty("name");
			expect(theme).toHaveProperty("color");
			expect(theme).toHaveProperty("typography");
			expect(theme).toHaveProperty("measurements");
			expect(theme).toHaveProperty("desktop");
			expect(theme).toHaveProperty("sound");
		}
	});
});

describe("getTheme", () => {
	it("returns the matching theme for a known id", () => {
		const theme = getTheme("azul");
		expect(theme.id).toBe("azul");
		expect(theme.name).toBe("Azul");
	});

	it("returns the first theme as fallback for an unknown id", () => {
		const fallback = getTheme("this-theme-does-not-exist");
		const first = getAllThemes()[0];
		expect(fallback.id).toBe(first.id);
	});

	it("merges overrides into the returned theme", () => {
		const overrides = { typography: { ui: "Comic Sans" } };
		const theme = getTheme("default", overrides);
		expect(theme.typography.ui).toBe("Comic Sans");
	});

	it("deep-merges overrides without losing sibling properties", () => {
		const overrides = { typography: { ui: "Comic Sans" } };
		const theme = getTheme("default", overrides);
		// bodySize should still be present from the original
		expect(theme.typography.bodySize).toBeGreaterThan(0);
	});

	it("overrides do not mutate the original theme data", () => {
		const overrides = { typography: { ui: "Mutated Font" } };
		getTheme("default", overrides);
		// Calling again without overrides should return the original ui font
		const clean = getTheme("default");
		expect(clean.typography.ui).not.toBe("Mutated Font");
	});
});

describe("getThemeVars", () => {
	it("returns an object with --color-* keys", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		const colorKeys = Object.keys(vars).filter((k) => k.startsWith("--color-"));
		expect(colorKeys.length).toBeGreaterThan(0);
	});

	it("returns an object with --*-font keys", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		const fontKeys = Object.keys(vars).filter((k) => k.endsWith("-font"));
		expect(fontKeys.length).toBeGreaterThan(0);
	});

	it("all values are strings", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		for (const value of Object.values(vars)) {
			expect(typeof value).toBe("string");
		}
	});

	it("has at least 30 keys", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		expect(Object.keys(vars).length).toBeGreaterThanOrEqual(30);
	});

	it("contains the specific key --color-black", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		expect(vars).toHaveProperty("--color-black");
	});

	it("contains the specific key --ui-font", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		expect(vars).toHaveProperty("--ui-font");
	});

	it("contains the specific key --window-border-size", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		expect(vars).toHaveProperty("--window-border-size");
	});

	it("contains the specific key --desktop-icon-size", () => {
		const theme = getTheme("default");
		const vars = getThemeVars(theme);
		expect(vars).toHaveProperty("--desktop-icon-size");
	});

	it("emits every metric input and derivation for the default theme", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		// Inputs, 1:1 with measurements.<family>.<key>.
		expect(vars["--window-title-bar-height"]).toBe("19px");
		expect(vars["--window-utility-title-bar-height"]).toBe("10px");
		expect(vars["--control-height"]).toBe("20px");
		expect(vars["--control-label-gap"]).toBe("5px");
		expect(vars["--control-static-text-height"]).toBe("16px");
		expect(vars["--button-height"]).toBe("20px");
		expect(vars["--button-min-width"]).toBe("58px");
		expect(vars["--button-text-padding"]).toBe("8px");
		expect(vars["--button-gap"]).toBe("12px");
		expect(vars["--group-box-margin-side"]).toBe("10px");
		expect(vars["--group-box-margin-top"]).toBe("12px");
		expect(vars["--group-box-margin-bottom"]).toBe("10px");
		expect(vars["--group-box-title-pad"]).toBe("3px");
		expect(vars["--group-box-gap"]).toBe("12px");
		expect(vars["--layout-item-gap"]).toBe("4px");
		expect(vars["--layout-group-gap"]).toBe("16px");
		expect(vars["--layout-dialog-edge"]).toBe("12px");
		// Derived from the inputs.
		expect(vars["--control-frame-width"]).toBe("2px");
		expect(vars["--control-bevel-sm"]).toBe("2px");
		expect(vars["--control-bevel-md"]).toBe("3px");
		expect(vars["--control-bevel-lg"]).toBe("4px");
		expect(vars["--button-default-ring"]).toBe("3px");
		expect(vars["--control-row-height"]).toBe("18px");
		expect(vars["--edit-field-height"]).toBe("22px");
		expect(vars["--progress-height"]).toBe("12px");
		expect(vars["--help-button-width"]).toBe("20px");
		expect(vars["--help-button-height"]).toBe("21px");
		expect(vars["--layout-focus-gap"]).toBe("6px");
	});

	it("derives from borderSize", () => {
		const theme = withDefaultThemeMetrics({
			...getTheme("default"),
			measurements: {
				...CLASSICY_DEFAULT_THEME_METRICS,
				window: { ...CLASSICY_DEFAULT_THEME_METRICS.window, borderSize: 2 },
			},
		});
		const vars = getThemeVars(theme) as Record<string, string>;
		expect(vars["--control-frame-width"]).toBe("4px");
		expect(vars["--control-bevel-lg"]).toBe("8px");
		expect(vars["--button-default-ring"]).toBe("6px");
		expect(vars["--edit-field-height"]).toBe("24px");
		expect(vars["--help-button-height"]).toBe("22px");
	});

	// Owner decision D12 (docs/theming-audit.md §7): the --hig-* names are gone
	// outright — no deprecated aliases, nothing emitted under the old names.
	it("emits no --hig-* name at all", () => {
		for (const theme of getAllThemes()) {
			const higKeys = Object.keys(getThemeVars(theme)).filter((k) =>
				k.startsWith("--hig-"),
			);
			expect(higKeys, theme.id).toEqual([]);
		}
	});
});

describe("classicyMeasurementVars", () => {
	it("emits a package measurement family as kebab-case px variables", () => {
		const theme = getTheme("default");
		const measurements = {
			...theme.measurements,
			controlStrip: { cellHeight: 22, moduleWidth: 30 },
		};
		const vars = classicyMeasurementVars(measurements);
		expect(vars["--control-strip-cell-height"]).toBe("22px");
		expect(vars["--control-strip-module-width"]).toBe("30px");
		const themeVars = getThemeVars({ ...theme, measurements }) as Record<
			string,
			string
		>;
		expect(themeVars["--control-strip-cell-height"]).toBe("22px");
		expect(themeVars["--control-strip-module-width"]).toBe("30px");
	});

	it("the walker reproduces every input variable byte-identically", () => {
		// The 20 inputs getThemeVars emitted one by one before the walker:
		// window 6, control 3, button 3, groupBox 5, layout 3.
		expect(classicyMeasurementVars(getTheme("default").measurements)).toEqual({
			"--window-border-size": "1px",
			"--window-control-size": "12px",
			"--window-padding-size": "6px",
			"--window-scrollbar-size": "17px",
			"--window-title-bar-height": "19px",
			"--window-utility-title-bar-height": "10px",
			"--control-height": "20px",
			"--control-label-gap": "5px",
			"--control-static-text-height": "16px",
			"--button-min-width": "58px",
			"--button-text-padding": "8px",
			"--button-gap": "12px",
			"--group-box-margin-side": "10px",
			"--group-box-margin-top": "12px",
			"--group-box-margin-bottom": "10px",
			"--group-box-title-pad": "3px",
			"--group-box-gap": "12px",
			"--layout-item-gap": "4px",
			"--layout-group-gap": "16px",
			"--layout-dialog-edge": "12px",
		});
	});

	it("ignores non-numeric leaves", () => {
		const vars = classicyMeasurementVars({
			...getTheme("default").measurements,
			controlStrip: { cellHeight: "22", moduleWidth: 30 },
		} as unknown as ClassicyThemeMeasurements);
		expect(vars).not.toHaveProperty("--control-strip-cell-height");
		expect(vars["--control-strip-module-width"]).toBe("30px");
	});

	it("ignores families and keys that are not camelCase names", () => {
		const vars = classicyMeasurementVars({
			...getTheme("default").measurements,
			"x:0;color:red": { cellHeight: 1 },
			controlStrip: { "a;b": 2, "": 3, cellHeight: 22 },
		} as unknown as ClassicyThemeMeasurements);
		expect(
			Object.keys(vars).filter((name) => !/^--[a-z][a-z0-9-]*$/.test(name)),
		).toEqual([]);
		expect(vars["--control-strip-cell-height"]).toBe("22px");
		expect(Object.keys(vars)).toHaveLength(21);
	});

	it("a package family cannot override a variable getThemeVars sets itself", () => {
		const theme = getTheme("default");
		const vars = getThemeVars({
			...theme,
			measurements: {
				...theme.measurements,
				color: { black: 7 },
				help: { buttonWidth: 99 },
			},
		}) as Record<string, string>;
		expect(vars["--color-black"]).toBe("#000000");
		expect(vars["--help-button-width"]).toBe("20px");
	});

	it("leaves getThemeVars unchanged for every built-in theme", () => {
		const themes = getAllThemes();
		expect(themes.map((t) => t.id)).toEqual(Object.keys(themeVarsBaseline));
		for (const theme of themes) {
			expect(getThemeVars(theme), theme.id).toEqual(
				(themeVarsBaseline as Record<string, unknown>)[theme.id],
			);
		}
	});
});
