// Package color families (plan 0018-dbd, Batch F-b): named colors an
// Appearance Package declares beside the 28 core colors, under
// `theme.color.families.<family>.<key>`, emitted as
// `--package-color-<family>-<key>`.
import { afterEach, describe, expect, it } from "vitest";
// The core default theme names Platinum's sound pack, which a registered
// package's themes must name a registered pack for.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_PACKAGE_COLOR_VAR_PREFIX,
	classicyColorFamilyVarName,
	classicyColorFamilyVars,
	classicyThemeColorFamilyDefaults,
	getThemeColorFamily,
	isDeclaredThemeColorFamily,
	isThemeColorFamilyTarget,
	setThemeColorFamily,
	withDefaultThemeColorFamilies,
	withoutDefaultThemeColorFamilies,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorFamilies";
import { CLASSICY_THEME_COLOR_TARGETS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import {
	classicyMeasurementVars,
	isReservedClassicyThemeVar,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const PACK = "color-family-test";

const baseTheme = (): ClassicyTheme => ({
	...structuredClone(CLASSICY_CORE_DEFAULT_THEME),
	id: "cf-default",
	package: PACK,
});

const familyPack = (): ClassicyAppearancePackage => {
	const defaults = baseTheme();
	defaults.color.families = {
		grayRamp: { step2: 0x222222, step8: 0x888888 },
		ink: { triangle: 0x9999ff },
	};
	return {
		id: PACK,
		name: "Color Family Test",
		css: "",
		defaults,
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
		colorFamilies: {
			grayRamp: {
				label: "Gray Ramp",
				colors: { step2: { label: "2" }, step8: { label: "8" } },
			},
			ink: { label: "Ink", colors: { triangle: { label: "Triangle" } } },
		},
	};
};

const captureLog = () => {
	const entries: ClassicyLogEntry[] = [];
	registerClassicyLogSink({
		id: "color-family-test",
		onLog: (entry) => entries.push(entry),
	});
	return entries;
};

afterEach(() => {
	unregisterClassicyLogSink("color-family-test");
	if (getClassicyAppearancePackage(PACK)) {
		unregisterClassicyAppearancePackage(PACK);
	}
});

describe("package color variable names", () => {
	it("are --package-color-<family>-<key>, kebab-cased", () => {
		expect(CLASSICY_PACKAGE_COLOR_VAR_PREFIX).toBe("--package-color-");
		expect(classicyColorFamilyVarName("grayRamp", "step2")).toBe(
			"--package-color-gray-ramp-step2",
		);
		expect(classicyColorFamilyVarName("ink", "triangleChecker")).toBe(
			"--package-color-ink-triangle-checker",
		);
	});

	it("never collide with a core color variable", () => {
		for (const info of CLASSICY_THEME_COLOR_TARGETS) {
			expect(info.cssVar.startsWith(CLASSICY_PACKAGE_COLOR_VAR_PREFIX)).toBe(
				false,
			);
		}
	});

	it("are reserved, so no measurement family can make one", () => {
		expect(isReservedClassicyThemeVar("--package-color-gray-ramp-step2")).toBe(
			true,
		);
		const entries = captureLog();
		const vars = classicyMeasurementVars({
			...CLASSICY_CORE_DEFAULT_THEME.measurements,
			packageColor: { grayRampStep2: 3 },
		});
		expect(vars).not.toHaveProperty("--package-color-gray-ramp-step2");
		expect(entries.some((e) => e.level === "warn")).toBe(true);
	});
});

describe("classicyColorFamilyVars", () => {
	it("emits every valid leaf as a hex color", () =>
		expect(
			classicyColorFamilyVars({
				grayRamp: { step2: 0x222222, step8: 0x888888 },
				ink: { triangle: 0x9999ff },
			}),
		).toEqual({
			"--package-color-gray-ramp-step2": "#222222",
			"--package-color-gray-ramp-step8": "#888888",
			"--package-color-ink-triangle": "#9999ff",
		}));

	it("emits nothing for an absent or malformed families map", () => {
		expect(classicyColorFamilyVars(undefined)).toEqual({});
		expect(classicyColorFamilyVars(null)).toEqual({});
		expect(classicyColorFamilyVars([1, 2])).toEqual({});
		expect(classicyColorFamilyVars({ ink: 3 })).toEqual({});
	});

	it("skips bad names and values that are not 24-bit colors", () => {
		const families = {
			ink: {
				ok: 0x010203,
				fraction: 1.5,
				negative: -1,
				tooBig: 0x1000000,
				text: "#ffffff",
				nan: Number.NaN,
				"Bad-Key": 0x111111,
			},
			"Bad Family": { a: 0x111111 },
			constructor: { a: 0x111111 },
		};
		expect(classicyColorFamilyVars(families)).toEqual({
			"--package-color-ink-ok": "#010203",
		});
	});

	it("keeps the first of two leaves that make one variable, and logs it once", () => {
		const entries = captureLog();
		const families = {
			grayRamp: { stepA: 0x111111 },
			gray: { rampStepA: 0x222222 },
		};
		expect(classicyColorFamilyVars(families)).toEqual({
			"--package-color-gray-ramp-step-a": "#111111",
		});
		classicyColorFamilyVars(families);
		expect(
			entries.filter((e) => e.message.includes("--package-color-gray-ramp")),
		).toHaveLength(1);
	});
});

describe("getThemeVars and color families", () => {
	it("emits a theme's families beside the 28 core colors, which stay as they are", () => {
		const plain = baseTheme();
		const withFamilies = baseTheme();
		withFamilies.color.families = { ink: { triangle: 0x9999ff } };
		const before = getThemeVars(plain) as Record<string, string>;
		const after = getThemeVars(withFamilies) as Record<string, string>;
		expect(after["--package-color-ink-triangle"]).toBe("#9999ff");
		const { "--package-color-ink-triangle": _added, ...rest } = after;
		expect(rest).toEqual(before);
	});

	it("completes a theme from its registered package's families", () => {
		registerClassicyAppearancePackage(familyPack());
		const vars = getThemeVars(baseTheme()) as Record<string, string>;
		expect(vars["--package-color-gray-ramp-step2"]).toBe("#222222");
		expect(vars["--package-color-ink-triangle"]).toBe("#9999ff");
	});
});

describe("classicyThemeColorFamilyDefaults", () => {
	it("is the registered package's defaults.color.families", () => {
		registerClassicyAppearancePackage(familyPack());
		expect(classicyThemeColorFamilyDefaults(PACK)).toEqual({
			grayRamp: { step2: 0x222222, step8: 0x888888 },
			ink: { triangle: 0x9999ff },
		});
	});

	it("is undefined for a package that is not registered: its colors are its own", () => {
		expect(classicyThemeColorFamilyDefaults(PACK)).toBeUndefined();
		expect(classicyThemeColorFamilyDefaults("nope")).toBeUndefined();
	});
});

describe("withDefaultThemeColorFamilies", () => {
	const defaults = {
		grayRamp: { step2: 0x222222, step8: 0x888888 },
		ink: { triangle: 0x9999ff },
	};

	it("fills a theme saved before a family existed, key by key", () => {
		const theme = baseTheme();
		theme.color.families = { grayRamp: { step2: 0x123456, extra: 0x010101 } };
		const filled = withDefaultThemeColorFamilies(theme, defaults);
		expect(filled.color.families).toEqual({
			grayRamp: { step2: 0x123456, step8: 0x888888, extra: 0x010101 },
			ink: { triangle: 0x9999ff },
		});
		// Never mutated.
		expect(theme.color.families).toEqual({
			grayRamp: { step2: 0x123456, extra: 0x010101 },
		});
	});

	it("replaces a leaf that is not a color", () => {
		const theme = baseTheme();
		theme.color.families = {
			grayRamp: { step2: -4 as number, step8: 0x888888 },
			ink: { triangle: 0x9999ff },
		};
		expect(
			withDefaultThemeColorFamilies(theme, defaults).color.families?.grayRamp
				.step2,
		).toBe(0x222222);
	});

	it("returns the same theme when it is complete or there are no defaults", () => {
		const theme = baseTheme();
		theme.color.families = structuredClone(defaults);
		expect(withDefaultThemeColorFamilies(theme, defaults)).toBe(theme);
		const plain = baseTheme();
		expect(withDefaultThemeColorFamilies(plain, undefined)).toBe(plain);
	});
});

describe("withoutDefaultThemeColorFamilies", () => {
	const defaults = {
		grayRamp: { step2: 0x222222, step8: 0x888888 },
		ink: { triangle: 0x9999ff },
	};

	it("drops leaves equal to the defaults, and families and maps it empties", () => {
		const theme = baseTheme();
		theme.color.families = {
			grayRamp: { step2: 0x222222, step8: 0x777777 },
			ink: { triangle: 0x9999ff },
			own: { x: 0x010101 },
		};
		expect(
			withoutDefaultThemeColorFamilies(theme, defaults).color.families,
		).toEqual({ grayRamp: { step8: 0x777777 }, own: { x: 0x010101 } });
		const all = baseTheme();
		all.color.families = structuredClone(defaults);
		expect(
			withoutDefaultThemeColorFamilies(all, defaults).color,
		).not.toHaveProperty("families");
	});

	it("returns the same theme when there is nothing to drop", () => {
		const theme = baseTheme();
		expect(withoutDefaultThemeColorFamilies(theme, defaults)).toBe(theme);
		theme.color.families = { grayRamp: { step2: 0x010101 } };
		expect(withoutDefaultThemeColorFamilies(theme, defaults)).toBe(theme);
		expect(withoutDefaultThemeColorFamilies(theme, undefined)).toBe(theme);
	});
});

describe("color family targets", () => {
	const declared = familyPack().colorFamilies;

	it("accepts measurement-style names and refuses the rest", () => {
		expect(isThemeColorFamilyTarget({ family: "grayRamp", key: "step2" })).toBe(
			true,
		);
		for (const target of [
			{ family: "Gray", key: "step2" },
			{ family: "grayRamp", key: "step-2" },
			{ family: "__proto__", key: "x" },
			{ family: "constructor", key: "x" },
			{ family: "grayRamp", key: "prototype" },
			{ family: 3, key: "x" },
			{ key: "x" },
		]) {
			expect(isThemeColorFamilyTarget(target), JSON.stringify(target)).toBe(
				false,
			);
		}
	});

	it("is declared only when the package's colorFamilies names it", () => {
		expect(
			isDeclaredThemeColorFamily(declared, { family: "ink", key: "triangle" }),
		).toBe(true);
		expect(
			isDeclaredThemeColorFamily(declared, { family: "ink", key: "nope" }),
		).toBe(false);
		expect(
			isDeclaredThemeColorFamily(declared, { family: "nope", key: "triangle" }),
		).toBe(false);
		expect(
			isDeclaredThemeColorFamily(undefined, { family: "ink", key: "triangle" }),
		).toBe(false);
		expect(
			isDeclaredThemeColorFamily(declared, {
				family: "ink",
				key: "toString",
			}),
		).toBe(false);
	});

	it("reads and writes through own properties, creating the family", () => {
		const theme = baseTheme();
		expect(
			getThemeColorFamily(theme, { family: "ink", key: "triangle" }),
		).toBeNaN();
		expect(
			setThemeColorFamily(theme, { family: "ink", key: "triangle" }, 0x9999ff),
		).toBe(true);
		expect(theme.color.families).toEqual({ ink: { triangle: 0x9999ff } });
		expect(getThemeColorFamily(theme, { family: "ink", key: "triangle" })).toBe(
			0x9999ff,
		);
		expect(
			getThemeColorFamily(theme, { family: "ink", key: "constructor" }),
		).toBeNaN();
	});

	it("refuses a bad color, a bad target and a family that is not an object", () => {
		const theme = baseTheme();
		expect(
			setThemeColorFamily(theme, { family: "ink", key: "triangle" }, 1.5),
		).toBe(false);
		expect(
			setThemeColorFamily(theme, { family: "__proto__", key: "x" }, 0),
		).toBe(false);
		theme.color.families = { ink: 4 as unknown as Record<string, number> };
		expect(
			setThemeColorFamily(theme, { family: "ink", key: "triangle" }, 0),
		).toBe(false);
		expect(theme.color.families).toEqual({ ink: 4 });
	});
});

describe("ClassicyAppearancePackageSchema: colorFamilies", () => {
	const parse = (pkg: ClassicyAppearancePackage) =>
		ClassicyAppearancePackageSchema.safeParse(pkg);

	it("accepts declared families that the defaults carry", () =>
		expect(parse(familyPack()).success).toBe(true));

	it("refuses a declared color the defaults do not carry", () => {
		const pkg = familyPack();
		pkg.colorFamilies = {
			...pkg.colorFamilies,
			ink: {
				label: "Ink",
				colors: { triangle: { label: "T" }, missing: { label: "M" } },
			},
		};
		expect(parse(pkg).success).toBe(false);
	});

	it("refuses bad family and key names, and a theme family holding a non-color", () => {
		const badName = familyPack();
		badName.colorFamilies = {
			"Gray Ramp": { label: "x", colors: { step2: { label: "2" } } },
		};
		expect(parse(badName).success).toBe(false);
		const badValue = familyPack();
		(
			badValue.defaults.color.families as Record<string, Record<string, number>>
		).ink.triangle = 0x1000000;
		expect(parse(badValue).success).toBe(false);
	});
});
