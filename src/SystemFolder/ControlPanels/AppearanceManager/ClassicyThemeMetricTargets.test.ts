import { describe, expect, it } from "vitest";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_METRIC_KEYS,
	CLASSICY_THEME_METRIC_TARGETS,
	getThemeMetric,
	isThemeMetricTarget,
	isValidThemeMetric,
	setThemeMetric,
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
