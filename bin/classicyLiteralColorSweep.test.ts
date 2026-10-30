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

	it("skips comments, keyword and hex fallbacks, data URIs and white-space", () =>
		expect(
			hits(
				"src/SystemFolder/X/X.scss",
				[
					"// a black line comment",
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

	it("skips the color helpers' own definitions and the exempt paths", () => {
		const line = ".a { color: #123456; }";
		expect(hits("src/Appearance/vocabulary/_color.scss", line)).toEqual([]);
		expect(
			hits("src/SystemFolder/Extensions/ScreenSaver/x/X.scss", line),
		).toEqual([]);
		expect(
			hits("src/SystemFolder/SystemResources/ColorPicker/X.scss", line),
		).toEqual([]);
	});
});

describe("G12: package-private constants", () => {
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

	it("exempts a --<package>-* declaration under src/Appearance/<Package>/ only", () =>
		expect(
			findClassicyLiteralColors(root).map((hit) => `${hit.file}:${hit.line}`),
		).toEqual([
			"src/Appearance/Platinum/styles/_assets.scss:5",
			"src/Appearance/Platinum/styles/_assets.scss:6",
			"src/Appearance/vocabulary/_planted.scss:1",
			"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss:1",
		]));
});
