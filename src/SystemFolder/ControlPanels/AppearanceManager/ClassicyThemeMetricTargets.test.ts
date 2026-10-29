import { describe, expect, it } from "vitest";
import type { ClassicyAppearanceKnobs } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_METRIC_KEYS,
	CLASSICY_THEME_METRIC_TARGETS,
	getThemeMetric,
	getThemeMetricFamily,
	isThemeMetricFamilyTarget,
	isThemeMetricTarget,
	isValidThemeMetric,
	isValidThemeMetricFamily,
	setThemeMetric,
	setThemeMetricFamily,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";

/** Every number leaf of an object as "path=value" strings. */
const leaves = (value: unknown, path = ""): string[] => {
	if (typeof value === "number") return [`${path}=${value}`];
	if (value && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
			leaves(v, path ? `${path}.${k}` : k),
		);
	}
	return [];
};

describe("CLASSICY_THEME_METRIC_TARGETS", () => {
	it("has one target per metric key", () => {
		const keys = CLASSICY_THEME_METRIC_TARGETS.map((t) => t.target.metricKey);
		expect(new Set(keys)).toEqual(new Set(CLASSICY_THEME_METRIC_KEYS));
		expect(keys).toHaveLength(20);
		expect(CLASSICY_THEME_METRIC_KEYS).toHaveLength(20);
	});

	it("every target's cssVar is emitted by getThemeVars", () => {
		const vars = getThemeVars(getTheme("default"));
		for (const info of CLASSICY_THEME_METRIC_TARGETS) {
			expect(vars, info.cssVar).toHaveProperty(info.cssVar);
		}
	});

	it("get/set round-trip every key", () => {
		for (const metricKey of CLASSICY_THEME_METRIC_KEYS) {
			const theme = structuredClone(getTheme("default"));
			const before = leaves(theme.measurements);
			setThemeMetric(theme, { metricKey }, 42);
			expect(getThemeMetric(theme, { metricKey }), metricKey).toBe(42);
			const after = leaves(theme.measurements);
			const changed = after.filter((leaf) => !before.includes(leaf));
			expect(changed, metricKey).toHaveLength(1);
		}
	});

	it("isValidThemeMetric rejects below min, above max, NaN, strings", () => {
		const controlSize = { metricKey: "windowControlSize" } as const;
		expect(isValidThemeMetric(controlSize, 0)).toBe(false);
		expect(isValidThemeMetric(controlSize, 513)).toBe(false);
		expect(isValidThemeMetric(controlSize, Number.NaN)).toBe(false);
		expect(isValidThemeMetric(controlSize, "12")).toBe(false);
		expect(isValidThemeMetric(controlSize, 12)).toBe(true);
		expect(isValidThemeMetric({ metricKey: "buttonGap" }, 0)).toBe(true);
	});

	it("isThemeMetricTarget rejects unknown and prototype keys", () => {
		expect(isThemeMetricTarget({ metricKey: "buttonGap" })).toBe(true);
		expect(isThemeMetricTarget({ metricKey: "__proto__" })).toBe(false);
		expect(isThemeMetricTarget({ metricKey: "constructor" })).toBe(false);
		expect(isThemeMetricTarget({ metricKey: "nope" })).toBe(false);
		expect(isThemeMetricTarget({})).toBe(false);
	});
});

describe("the metric family form", () => {
	const knobs: ClassicyAppearanceKnobs = {
		controlStrip: {
			cellHeight: { label: "Cell height", min: 10, max: 40, default: 22 },
			tabWidth: { label: "Tab width", min: 0, max: 600, default: 12 },
		},
	};

	const withStrip = (): ClassicyTheme => {
		const theme = structuredClone(getTheme("default"));
		theme.measurements.controlStrip = { cellHeight: 22 };
		return theme;
	};

	it("accepts the family form", () => {
		expect(
			isThemeMetricFamilyTarget({ family: "controlStrip", key: "cellHeight" }),
		).toBe(true);
		expect(
			isThemeMetricFamilyTarget({ family: "window", key: "borderSize" }),
		).toBe(false);
		expect(isThemeMetricFamilyTarget({ family: "__proto__", key: "x" })).toBe(
			false,
		);
		expect(isThemeMetricFamilyTarget({ family: "constructor", key: "x" })).toBe(
			false,
		);
		expect(
			isThemeMetricFamilyTarget({ family: "controlStrip", key: "prototype" }),
		).toBe(false);
		expect(
			isThemeMetricFamilyTarget({ family: "ControlStrip", key: "cellHeight" }),
		).toBe(false);
		expect(isThemeMetricFamilyTarget({ family: "controlStrip" })).toBe(false);
		// The core form stays { metricKey } only.
		expect(
			isThemeMetricTarget({ family: "controlStrip", key: "cellHeight" }),
		).toBe(false);
	});

	it("family form get/set round-trips an existing knob", () => {
		const theme = withStrip();
		const target = { family: "controlStrip", key: "cellHeight" };
		expect(getThemeMetricFamily(theme, target)).toBe(22);
		expect(setThemeMetricFamily(theme, target, 30, knobs)).toBe(true);
		expect(getThemeMetricFamily(theme, target)).toBe(30);
	});

	it("family form never creates a key", () => {
		const theme = withStrip();
		const target = { family: "controlStrip", key: "nope" };
		expect(setThemeMetricFamily(theme, target, 30, knobs)).toBe(false);
		expect(Object.hasOwn(theme.measurements.controlStrip, "nope")).toBe(false);
		expect(getThemeMetricFamily(theme, target)).toBeNaN();
	});

	it("family form creates a declared knob the theme lacks", () => {
		const theme = structuredClone(getTheme("default"));
		const target = { family: "controlStrip", key: "cellHeight" };
		expect(getThemeMetricFamily(theme, target)).toBeNaN();
		expect(setThemeMetricFamily(theme, target, 30, knobs)).toBe(true);
		expect(theme.measurements.controlStrip).toEqual({ cellHeight: 30 });
	});

	it("family form refuses a value outside the knob's bounds or the schema's", () => {
		const cell = { family: "controlStrip", key: "cellHeight" };
		const tab = { family: "controlStrip", key: "tabWidth" };
		expect(isValidThemeMetricFamily(cell, 10, knobs)).toBe(true);
		expect(isValidThemeMetricFamily(cell, 40, knobs)).toBe(true);
		expect(isValidThemeMetricFamily(cell, 9, knobs)).toBe(false);
		expect(isValidThemeMetricFamily(cell, 41, knobs)).toBe(false);
		expect(isValidThemeMetricFamily(cell, Number.NaN, knobs)).toBe(false);
		expect(isValidThemeMetricFamily(cell, "30", knobs)).toBe(false);
		// The knob allows 600, the theme schema caps measurements at 512.
		expect(isValidThemeMetricFamily(tab, 512, knobs)).toBe(true);
		expect(isValidThemeMetricFamily(tab, 513, knobs)).toBe(false);
		// No package knobs: nothing is editable.
		expect(isValidThemeMetricFamily(cell, 30, undefined)).toBe(false);
		const theme = withStrip();
		expect(setThemeMetricFamily(theme, cell, 41, knobs)).toBe(false);
		expect(theme.measurements.controlStrip.cellHeight).toBe(22);
	});

	it.each([
		["null", null],
		["a number", 7],
		["an array", [22]],
	])("family form treats %s family as missing", (_name, family) => {
		const theme = structuredClone(getTheme("default"));
		(theme.measurements as Record<string, unknown>).controlStrip = family;
		const target = { family: "controlStrip", key: "cellHeight" };
		expect(() => getThemeMetricFamily(theme, target)).not.toThrow();
		expect(getThemeMetricFamily(theme, target)).toBeNaN();
		expect(() => setThemeMetricFamily(theme, target, 30, knobs)).not.toThrow();
		expect(setThemeMetricFamily(theme, target, 30, knobs)).toBe(false);
		expect(theme.measurements.controlStrip).toEqual(family);
	});

	it("family form reads a non-number leaf as NaN", () => {
		const theme = structuredClone(getTheme("default"));
		(theme.measurements as Record<string, unknown>).controlStrip = {
			cellHeight: "22",
		};
		expect(
			getThemeMetricFamily(theme, {
				family: "controlStrip",
				key: "cellHeight",
			}),
		).toBeNaN();
	});

	it("family form reads own knob properties only", () => {
		const inherited = Object.create(knobs) as ClassicyAppearanceKnobs;
		expect(
			isValidThemeMetricFamily(
				{ family: "controlStrip", key: "cellHeight" },
				30,
				inherited,
			),
		).toBe(false);
	});
});
