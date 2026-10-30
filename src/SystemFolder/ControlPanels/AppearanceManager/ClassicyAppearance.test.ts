import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyThemeMeasurements,
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_DERIVATIONS,
	CLASSICY_THEME_DERIVED_VARS,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	CLASSICY_THEME_NON_MEASUREMENT_VARS,
	classicyMeasurementVarName,
	classicyMeasurementVars,
	isReservedClassicyThemeVar,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
// A Part B parity guard: getThemeVars for every built-in theme, captured at
// c2da6d1c7 with the code from before the measurements walker replaced the
// explicit input emissions (`leaves getThemeVars unchanged …` below), plus
// the 35 named derivations (`CLASSICY_THEME_DERIVATIONS`) appended to each
// theme when they were added, Platinum's 95 knob variables (H 2.1) after
// them, H 5.1's hyperCard.itemPaddingY among them, and H 3.1's two
// focus-ring derivations (H-R5) appended at the end; at integration H-R19
// replaced that knob with the --layout-item-gap-half derivation, appended
// last, and the unread picker.wheelInset knob was dropped; at H 4.1's
// integration menuFrame.shadowOffset became shadowGap (H-R24), the scrollbar
// grip knobs were renamed thumbGrip* (H-R20) and balloonHelp.tailWidth was
// dropped (H-R22) (every other key and value unchanged each time).
// Regenerate it only for an intended change to the emitted variables, by
// running getThemeVars over getAllThemes() in a throwaway vitest file:
//   writeFileSync("src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.themeVars.baseline.json",
//     `${JSON.stringify(Object.fromEntries(getAllThemes().map((t) => [t.id, getThemeVars(t)])), null, "\t")}\n`)
// then `pnpm exec vitest run <that file>` and delete it; never regenerate to
// make an unintended difference pass.
import themeVarsBaseline from "./ClassicyAppearance.themeVars.baseline.json";

// Platinum's knob leaves beside the core five (H 2.1: 94 planned keys plus
// H-B1's pager.fontSize; H 5.1's hyperCard.itemPaddingY came and went,
// replaced by the --layout-item-gap-half derivation under H-R19; the unread
// picker.wheelInset was dropped; balloonHelp.tailWidth was dropped under
// H-R22).
const PLATINUM_KNOB_COUNT = 93;

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

	it("emits every Platinum knob family", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		expect(vars["--control-strip-cell-height"]).toBe("22px");
		expect(vars["--menu-frame-shadow-gap"]).toBe("0px");
		expect(vars["--menu-frame-shadow-offset"]).toBeUndefined();
		expect(vars["--pager-arrow-width"]).toBe("42px");
		expect(vars["--balloon-help-tail-offset"]).toBe("12px");
		expect(vars["--balloon-help-tail-width"]).toBeUndefined();
		expect(vars["--pop-up-slider-height"]).toBe("73px");
		expect(vars["--scrollbar-thumb-grip-width"]).toBe("7px");
		expect(vars["--scrollbar-thumb-grip-height"]).toBe("8px");
		expect(vars["--scrollbar-arrow-glyph-width"]).toBeUndefined();
		expect(vars["--hyper-card-handle-size"]).toBe("6px");
		expect(vars["--dialog-alert-min-width"]).toBe("280px");
		// H-B1 and H-R11.
		expect(vars["--pager-font-size"]).toBe("12px");
		expect(vars["--utility-title-bar-texture-width"]).toBe("4px");
		expect(vars["--utility-title-bar-texture-height"]).toBe("3px");
	});

	it("emits knobs for a theme persisted without them", () => {
		const theme = getTheme("default");
		const { controlStrip: _dropped, ...measurements } = theme.measurements;
		const vars = getThemeVars({
			...theme,
			measurements: measurements as ClassicyThemeMeasurements,
		}) as Record<string, string>;
		expect(vars["--control-strip-cell-height"]).toBe("22px");
		expect(vars["--control-strip-module-arrow-top"]).toBe("7px");
	});

	it("emits knobs and core inputs for a theme persisted with only part of a family", () => {
		const theme = getTheme("default");
		const vars = getThemeVars({
			...theme,
			measurements: {
				window: theme.measurements.window,
				pager: { cellHeight: 40 },
			} as unknown as ClassicyThemeMeasurements,
		}) as Record<string, string>;
		expect(vars["--pager-cell-height"]).toBe("40px");
		expect(vars["--pager-arrow-width"]).toBe("42px");
		expect(vars["--layout-item-gap"]).toBe("4px");
		expect(
			Object.values(vars).some((v) => /undefined|NaN/.test(String(v))),
		).toBe(false);
	});

	it("emits every named derivation for the default theme", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		const expected: Record<string, string> = {
			"--window-collapsed-height": "15px",
			"--window-utility-collapsed-height": "6px",
			"--window-frame-inset": "4.8px",
			"--window-zoom-margin": "8px",
			"--window-resize-inset": "5px",
			"--window-header-font-size": "12.11px",
			"--window-title-stripe-height": "15px",
			"--menu-bar-height": "30px",
			"--menu-min-width": "180px",
			"--menu-item-icon-size": "15px",
			"--menu-item-icon-gap": "6px",
			"--popup-height": "25.5px",
			"--popup-mini-size": "15.75px",
			"--popup-arrow-width": "21px",
			"--control-glyph-size": "15px",
			"--control-square-size": "24px",
			"--button-square-width": "48px",
			"--control-padding": "3px",
			"--control-padding-tight": "1.5px",
			"--control-padding-narrow": "2px",
			"--control-padding-loose": "4px",
			"--control-padding-wide": "9px",
			"--ui-font-size-small": "11.200000000000001px",
			"--ui-font-size-caption": "10.5px",
			"--ui-font-size-compact": "11.666666666666666px",
			"--ui-font-size-mini": "9.333333333333334px",
			"--ui-font-size-large": "21px",
			"--tab-height": "19.2px",
			"--tab-min-width": "48px",
			"--tab-min-width-large": "108px",
			"--slider-thumb-width": "24px",
			"--slider-thumb-height": "21px",
			"--desktop-icon-padding": "12px",
			"--desktop-icon-cell": "96px",
			"--desktop-icon-label-pad": "3px",
			"--focus-ring-width": "1px",
			"--focus-ring-inset": "3px",
			"--layout-item-gap-half": "2px",
		};
		for (const [k, v] of Object.entries(expected)) expect(vars[k], k).toBe(v);
		expect(Object.keys(expected)).toHaveLength(38);
	});

	it("derives from the inputs, not constants", () => {
		const theme = withDefaultThemeMetrics({
			...getTheme("default"),
			measurements: {
				...getTheme("default").measurements,
				window: {
					...getTheme("default").measurements.window,
					controlSize: 16,
					paddingSize: 8,
				},
			},
			typography: { ...getTheme("default").typography, uiSize: 12 },
			desktop: { ...getTheme("default").desktop, iconSize: 32 },
		});
		const vars = getThemeVars(theme) as Record<string, string>;
		expect(vars["--window-collapsed-height"]).toBe("20px");
		expect(vars["--menu-bar-height"]).toBe("40px");
		expect(vars["--popup-height"]).toBe("34px");
		expect(vars["--window-frame-inset"]).toBe("6.4px");
		expect(vars["--window-zoom-margin"]).toBe("10px");
		expect(vars["--window-resize-inset"]).toBe("7px");
		// Font sizes are emitted unrounded (`unrounded`): 12 * 0.8 is
		// 9.600000000000001 in JS, as in the calc() the readers replaced.
		expect(vars["--ui-font-size-small"]).toBe(`${12 * 0.8}px`);
		expect(vars["--ui-font-size-compact"]).toBe("10px");
		expect(vars["--desktop-icon-cell"]).toBe("64px");
		expect(vars["--desktop-icon-padding"]).toBe("8px");
	});

	it("keeps the pre-existing derivations unchanged", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		expect(vars["--control-row-height"]).toBe("18px");
		expect(vars["--edit-field-height"]).toBe("22px");
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

	// H-R5 (H 3.1): the focus ring's width and inset, named derivations of the
	// border (the rest of H 6.1's set lands with 6.1).
	it("emits the focus ring derivations", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		expect(vars["--focus-ring-width"]).toBe("1px");
		expect(vars["--focus-ring-inset"]).toBe("3px");
		const thick = getThemeVars(
			withDefaultThemeMetrics({
				...getTheme("default"),
				measurements: {
					...CLASSICY_DEFAULT_THEME_METRICS,
					window: { ...CLASSICY_DEFAULT_THEME_METRICS.window, borderSize: 2 },
				},
			}),
		) as Record<string, string>;
		expect(thick["--focus-ring-width"]).toBe("2px");
		expect(thick["--focus-ring-inset"]).toBe("6px");
	});

	// H-R19: half the item gap is one role with one name, read by HyperCard's
	// compact rows (and Drive Setup's list in H 6.1), not a family knob.
	it("emits half the item gap as --layout-item-gap-half", () => {
		for (const theme of getAllThemes()) {
			const vars = getThemeVars(theme) as Record<string, string>;
			expect(vars["--layout-item-gap-half"], theme.id).toBe("2px");
		}
		const wide = getThemeVars(
			withDefaultThemeMetrics({
				...getTheme("default"),
				measurements: {
					...CLASSICY_DEFAULT_THEME_METRICS,
					layout: { ...CLASSICY_DEFAULT_THEME_METRICS.layout, itemGap: 7 },
				},
			}),
		) as Record<string, string>;
		expect(wide["--layout-item-gap-half"]).toBe("3.5px");
		expect(
			Object.keys(getThemeVars(getTheme("default"))).filter(
				(k) =>
					k === "--hyper-card-item-padding-y" || k === "--picker-wheel-inset",
			),
		).toEqual([]);
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
		// window 6, control 3, button 3, groupBox 5, layout 3. They come
		// first; Platinum's knob variables (20 families, H 2.1) follow.
		const vars = classicyMeasurementVars(getTheme("default").measurements);
		expect(Object.keys(vars)).toHaveLength(20 + PLATINUM_KNOB_COUNT);
		expect(Object.fromEntries(Object.entries(vars).slice(0, 20))).toEqual({
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
		// Over the core five, so the count is the 20 core inputs plus the one
		// valid leaf (Platinum's own families would add PLATINUM_KNOB_COUNT).
		const vars = classicyMeasurementVars({
			...CLASSICY_DEFAULT_THEME_METRICS,
			"x:0;color:red": { cellHeight: 1 },
			ControlStrip: { cellHeight: 4 },
			controlStrip: { "a;b": 2, "": 3, CellHeight: 5, cellHeight: 22 },
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

describe("classicyMeasurementVars — name collisions", () => {
	const SINK_ID = "measurement-collision-test";
	const warnings = (): ClassicyLogEntry[] => {
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => {
				if (entry.level === "warn") entries.push(entry);
			},
		});
		return entries;
	};

	afterEach(() => {
		unregisterClassicyLogSink(SINK_ID);
		vi.restoreAllMocks();
	});

	it("a core input always wins over a package family with the same variable name", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries = warnings();
		const theme = getTheme("default");
		const measurements = {
			...theme.measurements,
			windowTitle: { barHeight: 40 },
		};
		expect(
			classicyMeasurementVars(measurements)["--window-title-bar-height"],
		).toBe("19px");
		expect(
			(getThemeVars({ ...theme, measurements }) as Record<string, string>)[
				"--window-title-bar-height"
			],
		).toBe("19px");
		expect(entries).toHaveLength(1);
		expect(entries[0].subsystem).toBe("ClassicyAppearance");
		expect(entries[0].message).toContain("windowTitle.barHeight");
		expect(entries[0].message).toContain("window.titleBarHeight");
	});

	it("the first of two colliding package families wins, warning once", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries = warnings();
		// The core five only: Platinum's own `menuFrame` and `menu` families
		// would put menuFrame first in key order.
		const measurements = {
			...CLASSICY_DEFAULT_THEME_METRICS,
			menu: { frameWidth: 3 },
			menuFrame: { width: 5 },
		} as ClassicyThemeMeasurements;
		expect(classicyMeasurementVars(measurements)["--menu-frame-width"]).toBe(
			"3px",
		);
		classicyMeasurementVars(measurements);
		expect(entries).toHaveLength(1);
		expect(entries[0].subsystem).toBe("ClassicyAppearance");
		expect(entries[0].message).toContain("menu.frameWidth");
		expect(entries[0].message).toContain("menuFrame.width");
	});

	it("a package leaf cannot make a reserved derivation name, warning once", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries = warnings();
		const theme = getTheme("default");
		const measurements = {
			...theme.measurements,
			menu: { minWidth: 400, frameWidth: 3 },
		};
		const vars = classicyMeasurementVars(measurements);
		expect(vars).not.toHaveProperty("--menu-min-width");
		expect(vars["--menu-frame-width"]).toBe("3px");
		classicyMeasurementVars(measurements);
		expect(
			(getThemeVars({ ...theme, measurements }) as Record<string, string>)[
				"--menu-min-width"
			],
		).toBe("180px");
		expect(entries).toHaveLength(1);
		expect(entries[0].subsystem).toBe("ClassicyAppearance");
		expect(entries[0].message).toContain("menu.minWidth");
		expect(entries[0].message).toContain("--menu-min-width");
	});
	// G13: every variable getThemeVars derives is reserved, so a package
	// leaf that would make one (`help.buttonWidth` → `--help-button-width`) is
	// skipped and the derivation stands. A name splits into a family (its
	// first segment) and a camelCase key (the rest), or into nothing when no
	// leaf makes it: a measurement name never puts a hyphen before a digit,
	// so `--color-system-01` has no leaf (`color.system01` makes
	// `--color-system01`), and no package can shadow it.
	const leafFor = (name: string): [string, string] | undefined => {
		const [family, ...rest] = name.slice(2).split("-");
		const key = rest
			.map((part, i) =>
				i === 0 ? part : part[0].toUpperCase() + part.slice(1),
			)
			.join("");
		return classicyMeasurementVarName(family, key) === name
			? [family, key]
			: undefined;
	};
	// The palette names no leaf can make: the numbered system and theme colors.
	const UNMAKEABLE = /^--color-(system|theme)-0[1-7]$/;
	const expectReserved = (names: readonly string[]) => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const theme = getTheme("default");
		const expected = getThemeVars(theme) as Record<string, string>;
		for (const name of names) {
			const leaf = leafFor(name);
			// Only the numbered colors may lack a leaf; any other name is tested.
			expect(leaf === undefined, name).toBe(UNMAKEABLE.test(name));
			if (!leaf) continue;
			const [family, key] = leaf;
			const measurements = {
				...theme.measurements,
				[family]: {
					...(theme.measurements[family] as object | undefined),
					[key]: 997,
				},
			} as ClassicyThemeMeasurements;
			expect(classicyMeasurementVars(measurements), name).not.toHaveProperty(
				name,
			);
			expect(
				(getThemeVars({ ...theme, measurements }) as Record<string, string>)[
					name
				],
				name,
			).toBe(expected[name]);
		}
	};

	// M7: a package family must not make Classicy's own root variables
	// (--classicy-layout-*, --classicy-art-*), which the desktop root sets
	// after the theme's, or whose unset fallbacks a stylesheet relies on.
	it("skips a package leaf that takes the --classicy- prefix", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries = warnings();
		const vars = classicyMeasurementVars({
			...getTheme("default").measurements,
			classicy: { artHalftone: 4, layoutGrowBoxCorner: 2 },
			classicyLayout: { iconGridOrigin: 3 },
			classic: { artHalftone: 5 },
		});
		expect(
			Object.keys(vars).filter((n) => n.startsWith("--classicy-")),
		).toEqual([]);
		expect(vars["--classic-art-halftone"]).toBe("5px");
		expect(entries.map((e) => e.message).join("\n")).toContain(
			"classicy.artHalftone",
		);
	});

	// H-R16: the --color- names are the palette's; no measurement family may
	// emit into them, whether or not getThemeVars sets that exact name.
	it("skips a package leaf that makes a --color- palette name (H-R16)", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries = warnings();
		const vars = classicyMeasurementVars({
			...CLASSICY_DEFAULT_THEME_METRICS,
			colorPicker: { wheelMax: 240 },
			color: { accent: 3 },
			colorful: { stripeWidth: 2 },
		} as ClassicyThemeMeasurements);
		expect(Object.keys(vars).filter((n) => n.startsWith("--color-"))).toEqual(
			[],
		);
		expect(vars["--colorful-stripe-width"]).toBe("2px");
		const messages = entries.map((e) => e.message).join("\n");
		expect(messages).toContain("colorPicker.wheelMax");
		expect(messages).toContain("color.accent");
		expect(messages).toContain("--color- prefix");
	});

	it("emits the color picker's knobs as --picker-* (H-R16)", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		expect(vars["--picker-wheel-max"]).toBe("240px");
		expect(vars["--picker-unit-width"]).toBe("14px");
		const inputs = classicyMeasurementVars(getTheme("default").measurements);
		expect(Object.keys(inputs).filter((n) => n.startsWith("--color-"))).toEqual(
			[],
		);
	});

	it("reserves every pre-existing derived variable against package leaves", () => {
		expect(CLASSICY_THEME_DERIVED_VARS).toHaveLength(15);
		expectReserved(CLASSICY_THEME_DERIVED_VARS);
	});

	it("reserves every named derivation against package leaves", () => {
		expectReserved(CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar));
	});

	it("reserves every palette, font and desktop variable against package leaves", () => {
		// getThemeVars sets them after the inputs, so a package leaf making one
		// (`desktop.iconSize` → `--desktop-icon-size`) would be overwritten
		// without a word: a package knob that can never take effect.
		expectReserved(CLASSICY_THEME_NON_MEASUREMENT_VARS);
	});

	it("lists only variables getThemeVars emits", () => {
		const vars = getThemeVars(getTheme("default")) as Record<string, string>;
		for (const name of [
			...CLASSICY_THEME_DERIVED_VARS,
			...CLASSICY_THEME_NON_MEASUREMENT_VARS,
		]) {
			expect(vars, name).toHaveProperty(name);
		}
	});

	it("reserves every variable getThemeVars sets beyond the measurement inputs", () => {
		// The other direction: a variable added to getThemeVars later fails
		// here until it is listed, and so reserved.
		for (const theme of getAllThemes()) {
			const inputs = classicyMeasurementVars(theme.measurements);
			const unreserved = Object.keys(getThemeVars(theme)).filter(
				(name) => !(name in inputs) && !isReservedClassicyThemeVar(name),
			);
			expect(unreserved, theme.id).toEqual([]);
		}
	});
});
