// The core theme floor (H-R13, plan 0014-ahm "A core floor that is not
// Platinum"): the core five and every structural knob, owned by the core and
// equal to Platinum's values, so a theme of any package emits what base
// stylesheets and components read, and Platinum renders as it did.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import "@classicy/appearance-platinum";
import { platinumJson } from "@classicy/appearance-platinum";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	CLASSICY_CORE_DEFAULT_THEME,
	CLASSICY_CORE_MEASUREMENT_DEFAULTS,
} from "@/Appearance/ClassicyCoreTheme";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	classicyMeasurementVarName,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

const CORE_FIVE = ["window", "control", "button", "groupBox", "layout"];

// The knobs only Platinum's own partials read (AGENT-REFERENCE §8,
// "Structural: no"): Platinum's look, never the core's.
const LOOK_ONLY = [
	"controlStrip.bevelWidth",
	"menuFrame.borderWidth",
	"menuFrame.bevelWidth",
	"menuFrame.shadowWidth",
	"menuFrame.shadowStart",
	"menuFrame.shadowGap",
	"scrollbar.thumbGripWidth",
	"scrollbar.thumbGripHeight",
	"utilityTitleBar.textureWidth",
	"utilityTitleBar.textureHeight",
	"quickTime.captionShadowBlur",
	// Platinum's slider, drawn from HIGOS8 Figure 2-17 (_Slider.scss).
	"slider.pixel",
	"slider.channel",
	"slider.thumbAlong",
	"slider.thumbAcross",
	"slider.thumbRise",
	"slider.tickWidth",
	"slider.tickHeight",
];

const platinumMeasurements = platinumJson.defaults.measurements as Record<
	string,
	Record<string, number>
>;

/** `family.key` for every leaf of a measurements object. */
const leaves = (measurements: object): string[] =>
	Object.entries(measurements).flatMap(([family, keys]) =>
		Object.keys(keys as object).map((key) => `${family}.${key}`),
	);

const leaf = (measurements: object, path: string): unknown => {
	const [family, key] = path.split(".");
	return (measurements as Record<string, Record<string, unknown>>)[family]?.[
		key
	];
};

/** The knob-families table in AGENT-REFERENCE §8: `family.key` → structural. */
const documentedKnobs = (): Map<string, boolean> => {
	const doc = readFileSync("docs/AGENT-REFERENCE.md", "utf8");
	const rows = new Map<string, boolean>();
	for (const line of doc.split("\n")) {
		const cells = line.split("|").map((cell) => cell.trim());
		// | `family.key` | `--var` | value | Options tab | Structural | Read by |
		if (cells.length !== 8) continue;
		const name = /^`([a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*)`$/.exec(cells[1]);
		if (!name || !/^`--[a-z-]+`$/.test(cells[2])) continue;
		if (cells[5] !== "yes" && cells[5] !== "no") continue;
		rows.set(name[1], cells[5] === "yes");
	}
	return rows;
};

const isDeepFrozen = (value: unknown): boolean =>
	value === null ||
	typeof value !== "object" ||
	(Object.isFrozen(value) && Object.values(value).every(isDeepFrozen));

describe("CLASSICY_CORE_MEASUREMENT_DEFAULTS", () => {
	it("pins every value to Platinum's defaults.measurements", () => {
		for (const path of leaves(CLASSICY_CORE_MEASUREMENT_DEFAULTS)) {
			expect(
				leaf(CLASSICY_CORE_MEASUREMENT_DEFAULTS, path),
				`${path} differs from platinum.json`,
			).toBe(leaf(platinumMeasurements, path));
		}
	});

	it("holds the core five exactly as CLASSICY_DEFAULT_THEME_METRICS", () => {
		for (const family of CORE_FIVE) {
			expect(CLASSICY_CORE_MEASUREMENT_DEFAULTS[family]).toEqual(
				(CLASSICY_DEFAULT_THEME_METRICS as Record<string, unknown>)[family],
			);
		}
	});

	it("holds exactly the knobs AGENT-REFERENCE §8 marks structural", () => {
		const documented = documentedKnobs();
		expect(documented.size).toBe(103);
		const structural = [...documented]
			.filter(([, isStructural]) => isStructural)
			.map(([path]) => path)
			.sort();
		expect(structural).toHaveLength(85);
		const knobs = leaves(CLASSICY_CORE_MEASUREMENT_DEFAULTS)
			.filter((path) => !CORE_FIVE.includes(path.split(".")[0]))
			.sort();
		expect(knobs).toEqual(structural);
		// The table covers every Platinum knob, so none escapes the split.
		expect(
			leaves(platinumMeasurements)
				.filter((path) => !CORE_FIVE.includes(path.split(".")[0]))
				.sort(),
		).toEqual([...documented.keys()].sort());
	});

	it("leaves out every look-only knob", () => {
		const documented = documentedKnobs();
		expect([...documented].filter(([, s]) => !s).map(([path]) => path)).toEqual(
			LOOK_ONLY,
		);
		for (const path of LOOK_ONLY) {
			expect(leaf(CLASSICY_CORE_MEASUREMENT_DEFAULTS, path), path).toBe(
				undefined,
			);
		}
	});

	it("is frozen all the way down", () => {
		expect(isDeepFrozen(CLASSICY_CORE_MEASUREMENT_DEFAULTS)).toBe(true);
	});
});

describe("CLASSICY_CORE_DEFAULT_THEME", () => {
	it("is Platinum's defaults without the wallpaper and the look-only knobs", () => {
		const expected = structuredClone(platinumJson.defaults) as unknown as {
			desktop: { backgroundImage: string };
			measurements: Record<string, Record<string, number>>;
		};
		expected.desktop.backgroundImage = "";
		for (const path of LOOK_ONLY) {
			const [family, key] = path.split(".");
			delete expected.measurements[family][key];
			if (Object.keys(expected.measurements[family]).length === 0)
				delete expected.measurements[family];
		}
		expect(CLASSICY_CORE_DEFAULT_THEME).toEqual(expected);
		expect(CLASSICY_CORE_DEFAULT_THEME.id).toBe("default");
		expect(CLASSICY_CORE_DEFAULT_THEME.package).toBe("platinum");
	});

	it("measures with the floor itself, and is frozen all the way down", () => {
		expect(CLASSICY_CORE_DEFAULT_THEME.measurements).toBe(
			CLASSICY_CORE_MEASUREMENT_DEFAULTS,
		);
		expect(isDeepFrozen(CLASSICY_CORE_DEFAULT_THEME)).toBe(true);
	});

	it("is plain data: its module imports nothing from Platinum", () => {
		const source = readFileSync("src/Appearance/ClassicyCoreTheme.ts", "utf8");
		expect(source).not.toMatch(/from\s+["'][^"']*Platinum/);
		expect(source).not.toMatch(/(from|import)\s+["'][^"']*platinum\.json/);
		// Its one value import is the default package id.
		const valueImports = [
			...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/gms),
		].map((match) => match[1]);
		expect(valueImports).toEqual(["@/Appearance/ClassicyAppearanceDefaults"]);
	});
});

describe("themes with no package registered", () => {
	const platinum = getClassicyAppearancePackage("platinum");

	afterEach(() => {
		if (platinum && !getClassicyAppearancePackage("platinum"))
			registerClassicyAppearancePackage(platinum);
	});

	it("getAllThemes and getTheme read the registered packages", () => {
		expect(platinum).toBeDefined();
		const ids = getAllThemes().map((t) => t.id);
		expect(ids).toEqual(platinumJson.presets.map((t) => t.id));
		getAllThemes().forEach((theme, i) => {
			expect(theme).toBe(platinum?.presets?.[i]);
		});
		expect(getTheme("bondi")).toBe(
			platinum?.presets?.find((t) => t.id === "bondi"),
		);
		expect(getTheme("default")).toBe(platinum?.defaults);
	});

	it("getAllThemes is the core default theme alone", () => {
		resetClassicyAppearancePackagesForTests();
		expect(getAllThemes()).toEqual([CLASSICY_CORE_DEFAULT_THEME]);
		expect(getAllThemes()[0]).toBe(CLASSICY_CORE_DEFAULT_THEME);
		expect(getTheme("default")).toBe(CLASSICY_CORE_DEFAULT_THEME);
		expect(getTheme("bondi")).toBe(CLASSICY_CORE_DEFAULT_THEME);
	});

	it("getThemeVars emits what Platinum's default emits, but the look-only knobs", () => {
		const today = getThemeVars(getTheme("default")) as Record<string, string>;
		resetClassicyAppearancePackagesForTests();
		const floor = getThemeVars(getTheme("default") as ClassicyTheme) as Record<
			string,
			string
		>;
		const lookOnly = LOOK_ONLY.map((path) => {
			const [family, key] = path.split(".");
			return classicyMeasurementVarName(family, key);
		});
		for (const name of lookOnly) expect(today).toHaveProperty(name);
		const expected = Object.fromEntries(
			Object.entries(today).filter(
				([name]) =>
					!lookOnly.includes(name) && name !== "--desktop-background-image",
			),
		);
		const { "--desktop-background-image": _wallpaper, ...rest } = floor;
		expect(rest).toEqual(expected);
		for (const name of lookOnly) expect(floor).not.toHaveProperty(name);
	});
});
