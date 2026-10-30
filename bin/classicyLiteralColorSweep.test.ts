import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	classicyLiteralColorHits,
	findClassicyLiteralColors,
} from "./classicyLiteralColorSweep.ts";

describe("findClassicyLiteralColors (the G 1.2 sweep)", () => {
	it("finds no literal color in the repository's SCSS", () =>
		expect(findClassicyLiteralColors(process.cwd())).toEqual([]));
});

describe("classicyLiteralColorHits", () => {
	const hits = (file: string, source: string) =>
		classicyLiteralColorHits(file, source).map((hit) => hit.line);

	it("flags hex, rgb(a) and bare white/black, with their line numbers", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					".a {",
					"  color: #c00;",
					"  background: rgba(0, 0, 0, 0.5);",
					"  border-color: white;",
					"  border: 1px groove rgb(239, 239, 239);",
					"  fill: var(--color-black);",
					"}",
				].join("\n"),
			),
		).toEqual([2, 3, 4, 5]));

	it("flags hsl(), lab(), lch(), oklch() and spaced rgb() literals", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					".a {",
					"  color: hsl(0 100% 50%);",
					"  color: hsla(120, 50%, 50%, 0.5);",
					"  color: oklch(0.6 0.1 30);",
					"  color: lab(50% 40 59.5);",
					"  color: lch(52% 72 56);",
					"  color: rgb( 0, 0, 0);",
					"  color: rgb(.5 .5 .5);",
					"  color: color(display-p3 1 0 0);",
					"  color: color-mix(in srgb, var(--color-black) 50%, transparent);",
					"}",
				].join("\n"),
			),
		).toEqual([2, 3, 4, 5, 6, 7, 8, 9]));

	it("flags CSS named colors beyond white and black", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					".a {",
					"  color: gray;",
					"  border: 1px solid silver;",
					"  outline-color: Red;",
					"  background: linear-gradient(to right, lavender, transparent);",
					"  color: currentColor;",
					"  transition: color 0.2s;",
					"  --tan-ish: var(--color-system-03);",
					"  .classicyColorPickerSliderRed { order: 1; }",
					"}",
				].join("\n"),
			),
		).toEqual([2, 3, 4, 5]));

	it("exempts only the fallback, not the rest of its line", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					".a { color: var(--x, #fff); }",
					".b { color: var(--x, #fff); background: #000; }",
					".c { color: var(--x, rgba(0, 0, 0, 0.5)); }",
					".d { color: var(--x, var(--y, red)); border-color: gray; }",
				].join("\n"),
			),
		).toEqual([2, 4]));

	it("skips comments, keyword and hex fallbacks, data URIs and white-space", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					"// a black line comment",
					".e { color: var(--color-black); } // the gray lip",
					"/* Otherwise white in Chrome */",
					"/* a block",
					"   comment, still white */",
					".a { color: var(--color-black, black); }",
					".b { color: var(--color-alert, #f00); }",
					".c { background: url(\"data:image/svg+xml,<svg fill='%23000'/>\"); }",
					".d { white-space: nowrap; }",
				].join("\n"),
			),
		).toEqual([]));

	it("skips the color helpers' own definitions and the screen savers", () => {
		const line = ".a { color: #123456; }";
		expect(hits("src/Appearance/vocabulary/_color.scss", line)).toEqual([]);
		expect(
			hits("src/SystemFolder/Extensions/ScreenSaver/x/X.scss", line),
		).toEqual([]);
	});

	it("exempts only the color picker's art declarations", () => {
		const picker =
			"src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss";
		expect(
			hits(
				picker,
				[
					"  background: #0e0906;",
					"    inset var(--control-frame-width) var(--control-frame-width) 0 rgba(255, 255, 255, 0.06),",
					"    inset calc(var(--window-border-size) * -2) calc(var(--window-border-size) * -2) 0 rgba(0, 0, 0, 0.55);",
					"  background: linear-gradient(to bottom, #bbbbbb, #888888);",
					"  border-top: var(--control-frame-width) solid #d4d4d4;",
					".classicyColorPickerSliderRed     { @include color-track(#000000, #ff0000); }",
					"  color: #123456;",
					"  background: #0e0906; color: red;",
				].join("\n"),
			),
		).toEqual([7, 8]);
		expect(
			hits(
				"src/SystemFolder/SystemResources/ColorPicker/Other.scss",
				"  background: #0e0906;",
			),
		).toEqual([1]);
	});
});

describe("G12: package custom properties", () => {
	// A planted tree, the shape Part E gives Platinum's _assets.scss.
	const root = mkdtempSync(join(tmpdir(), "classicy-literal-sweep-"));
	const plant = (file: string, source: string) => {
		mkdirSync(dirname(join(root, file)), { recursive: true });
		writeFileSync(join(root, file), source);
	};
	plant(
		"src/Appearance/Platinum/styles/_assets.scss",
		[
			":root {",
			"  --platinum-stripe-dark: #787878;",
			"  --platinum-stripe-red-light: #f9dada;",
			"  --platinum-stripe-red-dark:#ef8c89;",
			"  --other-stripe: #787878;",
			"  color: #787878;",
			"  --classicy-color-picker-crayon-outline: rgba(0,0,0,.4);",
			"  --classicy-color-picker-crosshair: #ffffff;",
			"  --platinum-stripe-dark: #787878; color: #000;",
			"}",
		].join("\n"),
	);
	plant(
		"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
		".a { --platinum-stripe-dark: #787878; }\n",
	);
	plant(
		"src/Appearance/vocabulary/_planted.scss",
		":root { --vocabulary-x: #787878; }\n",
	);
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	// Part E's package values for component-interface variables
	// (--classicy-color-picker-*) are package data too, so every custom
	// property a package folder declares is exempt; its property rules are
	// not, nor is the rest of a declaration's line.
	it("exempts a custom-property declaration under src/Appearance/<Package>/ only", () =>
		expect(
			findClassicyLiteralColors(root).map((hit) => `${hit.file}:${hit.line}`),
		).toEqual([
			"src/Appearance/Platinum/styles/_assets.scss:6",
			"src/Appearance/Platinum/styles/_assets.scss:9",
			"src/Appearance/vocabulary/_planted.scss:1",
			"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss:1",
		]));
});
