import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import {
	CLASSICY_CORE_DEFAULT_THEME,
	CLASSICY_CORE_MEASUREMENT_DEFAULTS,
} from "@/Appearance/ClassicyCoreTheme";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// The 1-bit dither vocabulary (plan 0018-dbd §1.4, design 0017-6me "Gray:
// pattern vs true gray"). A package draws dimmed text, dimmed controls and
// dotted rules with these; the theme's `dither.tileSize` knob turns the
// checker on (a tile size, 1-bit themes) or off (0, plain ink).

const LOAD = { loadPaths: ["src"] };
const compile = (body: string) =>
	sass.compileString(
		`@use "Appearance/vocabulary/dither" as d;\n.x { ${body} }`,
		LOAD,
	).css;

const MASK = [
	"  mask-image: var(--classicy-art-dither-checker), linear-gradient(var(--color-black), var(--color-black));",
	"  mask-size: var(--dither-tile-size), auto;",
	"  mask-repeat: repeat, no-repeat;",
	"  mask-composite: exclude;",
];

describe("src/Appearance/vocabulary/_dither.scss", () => {
	it("classicy-dither-mask masks the element through the checker, switched by the tile size", () =>
		expect(compile("@include d.classicy-dither-mask;")).toBe(
			[".x {", ...MASK, "}"].join("\n"),
		));

	it("classicy-dither-text inks the text with the token, through the checker", () =>
		expect(compile('@include d.classicy-dither-text("--color-black");')).toBe(
			[".x {", "  color: var(--color-black);", ...MASK, "}"].join("\n"),
		));

	it("classicy-dither-line paints the rule with the token, through the checker", () =>
		expect(
			compile('@include d.classicy-dither-line("--color-system-05");'),
		).toBe(
			[
				".x {",
				"  background-color: var(--color-system-05);",
				...MASK,
				"}",
			].join("\n"),
		));

	it("holds no literal color and no pixel literal", () => {
		const css = compile(
			'@include d.classicy-dither-text("--color-black"); @include d.classicy-dither-line("--color-black");',
		);
		expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
		expect(css).not.toMatch(
			/(?<![-\w])(black|white|gray|grey|transparent)(?![-\w])/,
		);
		expect(css).not.toMatch(/\d(px)\b/);
	});

	it.each([
		["a bare name", "color-black"],
		["a literal color", "black"],
	])("rejects %s as the ink", (_name, ink) => {
		for (const mixin of ["classicy-dither-text", "classicy-dither-line"]) {
			expect(() =>
				compile(`@include d.${mixin}(${JSON.stringify(ink)});`),
			).toThrow(/custom-property name/);
			expect(() => compile(`@include d.${mixin}(${ink});`)).toThrow(
				/custom-property name/,
			);
		}
	});

	it("emits no CSS of its own", () =>
		expect(
			sass.compileString(`@use "Appearance/vocabulary/dither";`, LOAD).css,
		).toBe(""));

	it("is served at @classicy/classicy/scss/dither", () => {
		const importer = new sass.NodePackageImporter(
			path.resolve(process.cwd(), "example"),
		);
		expect(
			sass.compileString(
				'@use "pkg:@classicy/classicy/scss/dither";\n.a { @include dither.classicy-dither-mask; }',
				{ importers: [importer] },
			).css,
		).toContain("mask-composite: exclude");
	});
});

describe("the dither switch (theme knob dither.tileSize)", () => {
	const withTile = (tileSize: number): ClassicyTheme =>
		({
			...CLASSICY_CORE_DEFAULT_THEME,
			measurements: {
				...CLASSICY_CORE_DEFAULT_THEME.measurements,
				dither: { tileSize },
			},
		}) as ClassicyTheme;

	it("is off in the core floor, so a package draws plain ink unless it opts in", () => {
		expect(CLASSICY_CORE_MEASUREMENT_DEFAULTS.dither).toEqual({ tileSize: 0 });
		expect(
			(getThemeVars(CLASSICY_CORE_DEFAULT_THEME) as Record<string, string>)[
				"--dither-tile-size"
			],
		).toBe("0px");
	});

	it("is on for a theme whose tile size is a checker's", () =>
		expect(
			(getThemeVars(withTile(2)) as Record<string, string>)[
				"--dither-tile-size"
			],
		).toBe("2px"));

	it("follows the theme back off", () =>
		expect(
			(getThemeVars(withTile(0)) as Record<string, string>)[
				"--dither-tile-size"
			],
		).toBe("0px"));
});
