import { describe, expect, it } from "vitest";
// Registers Platinum's sound pack, which the Platinum themes used here name
// (`sound.pack` must name a registered pack).
import "@classicy/appearance-platinum";
// Platinum's wallpapers: the schema accepts a filename once it is registered.
import "@classicy/appearance-platinum";
import { platinumJson as platinum } from "@classicy/appearance-platinum";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { parseClassicyThemeFile } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	CLASSICY_THEME_FONT_SIZE_KEYS,
	CLASSICY_THEME_FONT_SIZE_MAX,
	CLASSICY_THEME_FONT_SIZE_MIN,
	clampClassicyThemeFontSize,
	isClassicyFontSizeMeasurementKey,
	isClassicyThemeFontSizeKey,
	isValidClassicyThemeFontSize,
	withClassicyThemeFontSizesClamped,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontSizes";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";

const platinumThemes = [
	platinum.defaults,
	...platinum.presets,
] as unknown as ClassicyTheme[];

/** Every font size a theme carries: the five typography sizes and the
 * desktop icon label size. */
const fontSizes = (theme: ClassicyTheme): number[] => [
	...CLASSICY_THEME_FONT_SIZE_KEYS.map((key) => theme.typography[key]),
	theme.desktop.iconFontSize,
];

describe("CLASSICY_THEME_FONT_SIZE_MIN / MAX", () => {
	it("are 8 and 72 px", () => {
		expect(CLASSICY_THEME_FONT_SIZE_MIN).toBe(8);
		expect(CLASSICY_THEME_FONT_SIZE_MAX).toBe(72);
	});

	it("cover every Platinum preset's font sizes with margin", () => {
		const all = platinumThemes.flatMap(fontSizes);
		expect(all.length).toBe(platinumThemes.length * 6);
		expect(Math.min(...all)).toBeGreaterThan(CLASSICY_THEME_FONT_SIZE_MIN);
		expect(Math.max(...all)).toBeLessThan(CLASSICY_THEME_FONT_SIZE_MAX);
	});
});

describe("CLASSICY_THEME_FONT_SIZE_KEYS", () => {
	it("are exactly the typography keys holding a size", () => {
		const sizeKeys = Object.keys(platinum.defaults.typography).filter((k) =>
			k.endsWith("Size"),
		);
		expect([...CLASSICY_THEME_FONT_SIZE_KEYS].sort()).toEqual(sizeKeys.sort());
	});

	it("isClassicyThemeFontSizeKey accepts only those keys", () => {
		for (const key of CLASSICY_THEME_FONT_SIZE_KEYS)
			expect(isClassicyThemeFontSizeKey(key)).toBe(true);
		for (const key of ["ui", "header", "iconFontSize", "size", 14, undefined])
			expect(isClassicyThemeFontSizeKey(key)).toBe(false);
	});
});

describe("isValidClassicyThemeFontSize", () => {
	it.each([8, 9, 13.5, 14, 72])("accepts %s", (value) => {
		expect(isValidClassicyThemeFontSize(value)).toBe(true);
	});

	it.each([
		-1,
		0,
		7.99,
		72.01,
		1e6,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		"14",
		null,
		undefined,
	])("refuses %s", (value) => {
		expect(isValidClassicyThemeFontSize(value)).toBe(false);
	});
});

describe("clampClassicyThemeFontSize", () => {
	it.each([
		[1, 8],
		[0, 8],
		[-5, 8],
		[14, 14],
		[500, 72],
	])("clamps %s to %s", (value, clamped) => {
		expect(clampClassicyThemeFontSize(value)).toBe(clamped);
	});

	it.each([
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	])("has no size for %s", (value) => {
		expect(clampClassicyThemeFontSize(value)).toBeUndefined();
	});
});

describe("the theme schema uses the same bounds", () => {
	const withSize = (patch: (t: ClassicyTheme) => void) => {
		const theme = structuredClone(getTheme("default"));
		patch(theme);
		return ClassicyThemeSchema.safeParse(theme).success;
	};

	describe.each(CLASSICY_THEME_FONT_SIZE_KEYS)("typography.%s", (key) => {
		it.each([
			[CLASSICY_THEME_FONT_SIZE_MIN, true],
			[CLASSICY_THEME_FONT_SIZE_MAX, true],
			[CLASSICY_THEME_FONT_SIZE_MIN - 1, false],
			[CLASSICY_THEME_FONT_SIZE_MAX + 1, false],
			[512, false],
		])("%s → %s", (value, ok) => {
			expect(
				withSize((t) => {
					t.typography[key] = value;
				}),
			).toBe(ok);
		});
	});

	it.each([
		[CLASSICY_THEME_FONT_SIZE_MIN, true],
		[CLASSICY_THEME_FONT_SIZE_MAX, true],
		[CLASSICY_THEME_FONT_SIZE_MIN - 1, false],
		[CLASSICY_THEME_FONT_SIZE_MAX + 1, false],
	])("desktop.iconFontSize %s → %s", (value, ok) => {
		expect(
			withSize((t) => {
				t.desktop.iconFontSize = value;
			}),
		).toBe(ok);
	});
});

describe("isClassicyFontSizeMeasurementKey", () => {
	it.each([
		"fontSize",
		"headerFontSize",
		"bodyFontSize",
		"iconFontSize",
		"titleFontSize",
	])("matches %s", (key) => {
		expect(isClassicyFontSizeMeasurementKey(key)).toBe(true);
	});

	it.each([
		"size",
		"cellHeight",
		"fontsize",
		"fontSizeStep",
		"fontSizes",
		"bodySize",
		"uiSize",
		"",
		12,
		null,
		undefined,
	])("does not match %s", (key) => {
		expect(isClassicyFontSizeMeasurementKey(key)).toBe(false);
	});
});

// A package knob whose key names a font size is held to the same 8–72 px as
// the typography sizes, decided by key name in any family of any package.
describe("the theme schema bounds font-size measurement keys", () => {
	const parse = (families: Record<string, Record<string, number>>) => {
		const theme = structuredClone(getTheme("default"));
		Object.assign(theme.measurements, families);
		return ClassicyThemeSchema.safeParse(theme);
	};

	it.each([
		["hyperCard", "fontSize", 0, "must be at least 8"],
		["appleGuide", "bodyFontSize", 400, "must be at most 72"],
		["pager", "fontSize", 7.99, "must be at least 8"],
		["appleGuide", "headerFontSize", 72.01, "must be at most 72"],
		["someVendorPkg", "titleFontSize", 100, "must be at most 72"],
	])("refuses %s.%s = %s", (family, key, value, message) => {
		const parsed = parse({ [family]: { [key]: value } });
		expect(parsed.success).toBe(false);
		expect(parsed.error?.issues).toContainEqual(
			expect.objectContaining({
				path: ["measurements", family, key],
				message,
			}),
		);
	});

	it.each([
		["hyperCard", "fontSize", 8],
		["appleGuide", "bodyFontSize", 72],
		["appleGuide", "headerFontSize", 13.5],
		["someVendorPkg", "titleFontSize", 8],
	])("accepts %s.%s = %s", (family, key, value) => {
		const parsed = parse({ [family]: { [key]: value } });
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(parsed.data?.measurements[family][key]).toBe(value);
	});

	it("leaves a key that is not a font size to the measurement bounds", () => {
		expect(parse({ pager: { cellHeight: 400 } }).success).toBe(true);
		expect(parse({ pager: { cellHeight: 0 } }).success).toBe(true);
		expect(parse({ pager: { cellHeight: 513 } }).success).toBe(false);
	});

	it("refuses a theme file carrying one, naming the knob", () => {
		const theme = structuredClone(getTheme("default"));
		Object.assign(theme.measurements, { hyperCard: { fontSize: 0 } });
		const result = parseClassicyThemeFile(
			JSON.stringify({ format: "classicy-theme", version: 1, theme }),
		);
		expect(result.ok).toBe(false);
		if (!result.ok)
			expect(result.error).toContain(
				"measurements.hyperCard.fontSize: must be at least 8",
			);
	});
});

describe("withClassicyThemeFontSizesClamped", () => {
	const outOfRange = (): ClassicyTheme => {
		const theme = structuredClone(getTheme("default"));
		theme.typography.uiSize = 400;
		theme.typography.bodySize = 0;
		theme.desktop.iconFontSize = 2;
		Object.assign(theme.measurements, {
			hyperCard: { fontSize: 0, handleSize: 6 },
			appleGuide: { headerFontSize: 13, bodyFontSize: 400 },
			someVendorPkg: { titleFontSize: 500 },
			pager: { cellHeight: 400, fontSize: 12 },
		});
		return theme;
	};

	it("clamps every font size, core and measurement, into 8–72", () => {
		const theme = withClassicyThemeFontSizesClamped(outOfRange());
		expect(theme.typography.uiSize).toBe(72);
		expect(theme.typography.bodySize).toBe(8);
		expect(theme.desktop.iconFontSize).toBe(8);
		expect(theme.measurements.hyperCard).toEqual({
			fontSize: 8,
			handleSize: 6,
		});
		expect(theme.measurements.appleGuide).toEqual({
			headerFontSize: 13,
			bodyFontSize: 72,
		});
		expect(theme.measurements.someVendorPkg).toEqual({ titleFontSize: 72 });
		// Not a font size: the measurement bounds are not this helper's.
		expect(theme.measurements.pager).toEqual({ cellHeight: 400, fontSize: 12 });
	});

	it("returns the same theme when every size is in range", () => {
		const theme = getTheme("default");
		expect(withClassicyThemeFontSizesClamped(theme)).toBe(theme);
	});

	it("is copy-on-write and idempotent", () => {
		const before = outOfRange();
		const snapshot = JSON.stringify(before);
		const once = withClassicyThemeFontSizesClamped(before);
		expect(JSON.stringify(before)).toBe(snapshot);
		expect(once).not.toBe(before);
		// Untouched branches are shared, not copied.
		expect(once.color).toBe(before.color);
		expect(once.measurements.window).toBe(before.measurements.window);
		expect(once.measurements.pager).toBe(before.measurements.pager);
		expect(withClassicyThemeFontSizesClamped(once)).toBe(once);
	});

	it("leaves values it cannot read as a size alone", () => {
		const theme = structuredClone(getTheme("default"));
		(theme.typography as Record<string, unknown>).uiSize = "14";
		theme.typography.bodySize = Number.NaN;
		Object.assign(theme.measurements, {
			hyperCard: { fontSize: null },
			broken: null,
		});
		expect(withClassicyThemeFontSizesClamped(theme)).toBe(theme);
	});
});

// Part H's knob families carry font sizes of their own (pager.fontSize,
// hyperCard.fontSize, appleGuide.headerFontSize and bodyFontSize). Their keys
// name a font size, so the schema, the reducer and the Options tab hold them
// to the shared font-size bounds; Platinum's own defaults and knob ranges must
// sit inside them, or its built-in themes would not export.
describe("Platinum's knob-family font sizes", () => {
	const measurements = platinum.defaults.measurements as Record<
		string,
		Record<string, number>
	>;
	const knobs = platinum.knobs as Record<
		string,
		Record<string, { min: number; max: number; default: number }>
	>;
	const fontSizeLeaves = Object.entries(measurements).flatMap(
		([family, keys]) =>
			Object.entries(keys)
				.filter(([key]) => isClassicyFontSizeMeasurementKey(key))
				.map(([key, value]) => ({ family, key, value })),
	);

	it("are the four Part H declares", () => {
		expect(
			fontSizeLeaves.map(({ family, key }) => `${family}.${key}`).sort(),
		).toEqual([
			"appleGuide.bodyFontSize",
			"appleGuide.headerFontSize",
			"hyperCard.fontSize",
			"pager.fontSize",
		]);
	});

	it("default to sizes within the shared bounds", () => {
		for (const { family, key, value } of fontSizeLeaves)
			expect(isValidClassicyThemeFontSize(value), `${family}.${key}`).toBe(
				true,
			);
	});

	it("offer an Options-tab range within the shared bounds", () => {
		const ranged = fontSizeLeaves.filter(
			({ family, key }) => knobs[family]?.[key] !== undefined,
		);
		expect(ranged.map(({ family, key }) => `${family}.${key}`)).toEqual([
			"pager.fontSize",
		]);
		for (const { family, key } of ranged) {
			const knob = knobs[family][key];
			expect(knob.min, `${family}.${key} min`).toBeGreaterThanOrEqual(
				CLASSICY_THEME_FONT_SIZE_MIN,
			);
			expect(knob.max, `${family}.${key} max`).toBeLessThanOrEqual(
				CLASSICY_THEME_FONT_SIZE_MAX,
			);
		}
	});
});
