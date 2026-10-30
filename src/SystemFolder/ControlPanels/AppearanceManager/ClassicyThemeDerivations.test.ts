import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import type { ClassicyThemeMeasurements } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_DERIVATIONS,
	CLASSICY_THEME_DERIVED_VARS,
	classicyThemeDerivations,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { px3 } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.internal";
import {
	CLASSICY_THEME_NON_MEASUREMENT_VARS,
	classicyMeasurementVars,
	isReservedClassicyThemeVar,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

describe("CLASSICY_THEME_DERIVATIONS", () => {
	it("has 37 unique cssVars, each starting with --", () => {
		const names = CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar);
		expect(names).toHaveLength(37);
		expect(new Set(names).size).toBe(37);
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

	it("no reserved name is a measurement input the Platinum defaults emit", () => {
		// Re-run when a package (Part H) adds measurement families. Covers the
		// named derivations, the earlier derived variables and the palette,
		// font and desktop variables: a core input with a reserved name would
		// be skipped by the walker, silently.
		const inputs = Object.keys(
			classicyMeasurementVars(
				platinumJson.defaults.measurements as ClassicyThemeMeasurements,
			),
		);
		expect(inputs.length).toBeGreaterThan(0);
		const reserved = [
			...CLASSICY_THEME_DERIVATIONS.map((d) => d.cssVar),
			...CLASSICY_THEME_DERIVED_VARS,
			...CLASSICY_THEME_NON_MEASUREMENT_VARS,
		];
		expect(reserved.every(isReservedClassicyThemeVar)).toBe(true);
		expect(reserved.filter((name) => inputs.includes(name))).toEqual([]);
		expect(inputs.filter(isReservedClassicyThemeVar)).toEqual([]);
	});

	it("every file a doc names as a reader reads the variable", () => {
		// The docs are Part H's map of who reads what: a file named there that
		// no longer reads the variable is a stale entry.
		const files = new Map<string, string[]>();
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) walk(full);
				else files.set(entry.name, [...(files.get(entry.name) ?? []), full]);
			}
		};
		walk(path.resolve(process.cwd(), "src"));
		const stale: string[] = [];
		for (const d of CLASSICY_THEME_DERIVATIONS) {
			for (const name of d.doc.match(/[\w.]+\.(?:scss|tsx|ts)\b/g) ?? []) {
				const found = files.get(name) ?? [];
				expect(found, `${d.cssVar}: ${name}`).toHaveLength(1);
				if (!readFileSync(found[0], "utf8").includes(d.cssVar)) {
					stale.push(`${d.cssVar}: ${name}`);
				}
			}
		}
		expect(stale).toEqual([]);
	});
});

describe("px3", () => {
	it("px3 rounds to three decimals", () => {
		expect(px3(14 * 0.865)).toBe("12.11px");
		expect(px3((14 * 10) / 12)).toBe("11.667px");
		expect(px3(12)).toBe("12px");
	});
});

describe("classicyThemeDerivations", () => {
	const inputs = {
		measurements: platinumJson.defaults
			.measurements as ClassicyThemeMeasurements,
		typography: { uiSize: 14 },
		desktop: { iconSize: 48, iconFontSize: 12 },
	};

	it("emits the font sizes unrounded, as the calc() they replaced computed", () => {
		const vars = classicyThemeDerivations(inputs);
		expect(vars["--ui-font-size-compact"]).toBe(`${(14 * 10) / 12}px`);
		expect(vars["--ui-font-size-mini"]).toBe(`${14 / 1.5}px`);
		const unrounded = CLASSICY_THEME_DERIVATIONS.filter((d) => d.unrounded).map(
			(d) => d.cssVar,
		);
		expect(unrounded).toEqual([
			"--window-header-font-size",
			"--ui-font-size-small",
			"--ui-font-size-caption",
			"--ui-font-size-compact",
			"--ui-font-size-mini",
			"--ui-font-size-large",
		]);
	});

	it("rounds every other derivation to three decimals", () => {
		const vars = classicyThemeDerivations({
			...inputs,
			measurements: {
				...inputs.measurements,
				window: { ...inputs.measurements.window, paddingSize: 7 },
			},
		});
		expect(vars["--control-padding-narrow"]).toBe("2.333px");
	});

	// The Metrics tab allows padding 0 with border 1: the inset is 0 then, not
	// a negative value the window's reader would discard for Platinum's 5.
	it("never makes --window-resize-inset negative", () => {
		const vars = classicyThemeDerivations({
			...inputs,
			measurements: {
				...inputs.measurements,
				window: {
					...inputs.measurements.window,
					paddingSize: 0,
					borderSize: 1,
				},
			},
		});
		expect(vars["--window-resize-inset"]).toBe("0px");
		expect(classicyThemeDerivations(inputs)["--window-resize-inset"]).toBe(
			"5px",
		);
	});
});
