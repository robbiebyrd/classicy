import { describe, expect, it } from "vitest";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import type { ClassicyThemeMeasurements } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_DERIVATIONS,
	px3,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { classicyMeasurementVars } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

describe("CLASSICY_THEME_DERIVATIONS", () => {
	it("has 35 unique cssVars, each starting with --", () => {
		const names = CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar);
		expect(names).toHaveLength(35);
		expect(new Set(names).size).toBe(35);
		for (const name of names) {
			expect(name.startsWith("--"), name).toBe(true);
		}
	});

	it("every entry has a non-empty formula and doc", () => {
		for (const d of CLASSICY_THEME_DERIVATIONS) {
			expect(d.formula.trim(), d.cssVar).not.toBe("");
			expect(d.doc.trim(), d.cssVar).not.toBe("");
		}
	});

	it("no derivation name is a measurement input the Platinum defaults emit", () => {
		// Re-run when a package (Part H) adds measurement families.
		const inputs = Object.keys(
			classicyMeasurementVars(
				platinumJson.defaults.measurements as ClassicyThemeMeasurements,
			),
		);
		expect(inputs.length).toBeGreaterThan(0);
		const derived = CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar);
		expect(derived.filter((name) => inputs.includes(name))).toEqual([]);
	});
});

describe("px3", () => {
	it("px3 rounds to three decimals", () => {
		expect(px3(14 * 0.865)).toBe("12.11px");
		expect(px3((14 * 10) / 12)).toBe("11.667px");
		expect(px3(12)).toBe("12px");
	});
});
