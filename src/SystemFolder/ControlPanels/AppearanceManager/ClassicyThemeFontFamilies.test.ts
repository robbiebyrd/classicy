import { describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	classicyFontFamilyVarName,
	classicyFontFamilyVars,
	isClassicyFontStack,
	listClassicyThemeFontFamilies,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontFamilies";
import {
	classicyMeasurementVars,
	isReservedClassicyThemeVar,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Package fonts (`typography.families`): a theme's own fonts beside the core
// typography, emitted as `--package-font-<name>` with `-size` and `-weight`.
// Windows 98 holds each scheme's caption, small caption, menu, message box
// and icon fonts there (SHELL2.INF); no Platinum or System 7 theme has any,
// so neither emits one.

describe("classicyFontFamilyVars", () => {
	it("emits each family's stack, its size in px and its weight", () => {
		expect(
			classicyFontFamilyVars({
				caption: { font: "Arial, sans-serif", size: 12, weight: 700 },
				smallCaption: { font: '"Small Fonts", Arial', size: 9 },
				icon: { font: "Arial", weight: 400 },
			}),
		).toEqual({
			"--package-font-caption": "Arial, sans-serif",
			"--package-font-caption-size": "12px",
			"--package-font-caption-weight": "700",
			"--package-font-small-caption": '"Small Fonts", Arial',
			"--package-font-small-caption-size": "9px",
			"--package-font-icon": "Arial",
			"--package-font-icon-weight": "400",
		});
		expect(classicyFontFamilyVarName("smallCaption")).toBe(
			"--package-font-small-caption",
		);
	});

	it("emits nothing for a missing or malformed family, or one whose stack could break out of its declaration", () => {
		expect(classicyFontFamilyVars(undefined)).toEqual({});
		expect(classicyFontFamilyVars([])).toEqual({});
		// JSON's `__proto__` is an own key, as a parsed theme file's would be.
		expect(
			classicyFontFamilyVars(
				JSON.parse(
					`{"__proto__":{"font":"Arial"},${JSON.stringify({
						Bad: { font: "Arial" },
						menu: { font: "Arial; } body { color: red" },
						message: "Arial",
						status: { font: "Arial", size: 200, weight: 750 },
					}).slice(1)}`,
				),
			),
		).toEqual({ "--package-font-status": "Arial" });
		// An object that is not plain (another prototype) emits nothing.
		expect(
			classicyFontFamilyVars(
				Object.create({ menu: { font: "Arial" } }) as unknown,
			),
		).toEqual({});
	});

	it("keeps the first of two families that make one variable, warning once", () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		const vars = classicyFontFamilyVars({
			smallCaption: { font: "Arial", size: 9 },
			smallCaptionSize: { font: "Tahoma" },
		});
		expect(vars["--package-font-small-caption-size"]).toBe("9px");
		classicyFontFamilyVars({
			smallCaption: { font: "Arial", size: 9 },
			smallCaptionSize: { font: "Tahoma" },
		});
		expect(
			log.mock.calls.filter(
				([level, , message]) =>
					level === "warn" && String(message).includes("Package fonts"),
			),
		).toHaveLength(1);
		log.mockRestore();
	});

	// The namespace is reserved, as `--package-color-` is: no measurement
	// makes a `--package-font-*` variable.
	it("reserves the --package-font- prefix against measurements", () => {
		expect(isReservedClassicyThemeVar("--package-font-menu")).toBe(true);
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		const vars = classicyMeasurementVars({
			...getTheme("default").measurements,
			packageFont: { menu: 3 },
		} as Parameters<typeof classicyMeasurementVars>[0]);
		expect(vars).not.toHaveProperty("--package-font-menu");
		log.mockRestore();
	});

	it("is emitted by getThemeVars only for a theme that has families", () => {
		const platinum = getThemeVars(getTheme("default"));
		expect(
			Object.keys(platinum).filter((name) =>
				name.startsWith("--package-font-"),
			),
		).toEqual([]);
		const theme = getTheme("default");
		expect(
			getThemeVars({
				...theme,
				typography: {
					...theme.typography,
					families: { menu: { font: "Arial", size: 13, weight: 700 } },
				},
			}),
		).toMatchObject({
			"--package-font-menu": "Arial",
			"--package-font-menu-size": "13px",
			"--package-font-menu-weight": "700",
		});
	});
});

describe("listClassicyThemeFontFamilies", () => {
	it("lists the declared fonts first, labeled, then the theme's others by name", () => {
		expect(
			listClassicyThemeFontFamilies(
				{
					families: {
						icon: { font: "Arial" },
						extra: { font: "Tahoma" },
						caption: { font: "Arial", size: 12 },
						bad: { font: "x;" },
					},
				},
				{
					caption: { label: "Active title bar" },
					icon: { label: "Icon" },
					missing: { label: "Not in the theme" },
				},
			).map(({ name, label }) => [name, label]),
		).toEqual([
			["caption", "Active title bar"],
			["icon", "Icon"],
			["extra", "extra"],
		]);
		expect(listClassicyThemeFontFamilies({})).toEqual([]);
	});
});

describe("ClassicyThemeSchema: typography.families", () => {
	const theme = getTheme("default");
	const withFamilies = (families: unknown) => ({
		...theme,
		typography: { ...theme.typography, families },
	});

	it("keeps valid families, and a theme without them stays without", () => {
		const parsed = ClassicyThemeSchema.safeParse(
			withFamilies({ caption: { font: "Arial", size: 12, weight: 700 } }),
		);
		expect(parsed.success).toBe(true);
		expect(parsed.data?.typography.families).toEqual({
			caption: { font: "Arial", size: 12, weight: 700 },
		});
		expect(
			ClassicyThemeSchema.parse(theme).typography.families,
		).toBeUndefined();
	});

	it.each([
		["an unsafe stack", { menu: { font: "Arial; color: red" } }],
		["a size out of bounds", { menu: { font: "Arial", size: 7 } }],
		["a weight between the hundreds", { menu: { font: "Arial", weight: 650 } }],
		["a name that is not camelCase", { Menu: { font: "Arial" } }],
	])("refuses %s", (_, families) => {
		expect(ClassicyThemeSchema.safeParse(withFamilies(families)).success).toBe(
			false,
		);
	});

	it("checks a stack as the core fonts are checked", () => {
		expect(isClassicyFontStack('"Times New Roman", Times, serif')).toBe(true);
		expect(isClassicyFontStack("url(x)")).toBe(false);
		expect(isClassicyFontStack(" ")).toBe(false);
	});
});
