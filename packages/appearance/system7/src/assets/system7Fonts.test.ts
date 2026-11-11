import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLATINUM_FONT_FACES } from "../../../platinum/src/assets/platinumFonts.internal";
import { SYSTEM7_FONT_FACES } from "./system7Fonts.internal";

// System 7's faces are byte-identical copies of Platinum's (design 0017-6me,
// "Fonts": reuse Platinum's vector ChicagoFLF and Geneva; Monaco too, which
// the themes name for mono and digital text), so a host loading
// both packages gets one set of glyphs whichever stylesheet a face comes from.

const FONTS = path.join(import.meta.dirname, "fonts");
const PLATINUM_FONTS = path.resolve(
	import.meta.dirname,
	"../../../platinum/src/assets/fonts",
);

describe("System 7's fonts", () => {
	it("are ChicagoFLF, Geneva's three faces and Monaco, nothing else", () => {
		expect(SYSTEM7_FONT_FACES.map(({ family }) => family)).toEqual([
			"ChicagoFLF",
			"Geneva",
			"Geneva",
			"Geneva",
			"Monaco",
		]);
		expect(readdirSync(FONTS).sort()).toEqual(
			SYSTEM7_FONT_FACES.map(({ file }) => `${file}.woff2`).sort(),
		);
	});

	it("are Platinum's faces, descriptors included", () => {
		for (const face of SYSTEM7_FONT_FACES)
			expect(PLATINUM_FONT_FACES).toContainEqual(face);
	});

	it.each(
		SYSTEM7_FONT_FACES.map(({ file }) => `${file}.woff2`),
	)("ships %s byte for byte as Platinum does", (file) =>
		expect(
			readFileSync(path.join(FONTS, file)).equals(
				readFileSync(path.join(PLATINUM_FONTS, file)),
			),
		).toBe(true));

	// Every family a theme names first is a face the package ships.
	it("ships the first family of every font stack the themes name", async () => {
		const { default: json } = await import("../system7.json");
		const families = new Set(SYSTEM7_FONT_FACES.map(({ family }) => family));
		for (const theme of json.presets)
			for (const key of ["ui", "header", "body", "mono", "digital"] as const)
				expect(families, `${theme.id} ${key}`).toContain(
					/^"([^"]+)"/.exec(theme.typography[key])?.[1],
				);
	});

	it("registers them as <style id=classicy-fonts-system7>, one @font-face each", async () => {
		await import("./system7Assets");
		const css =
			document.getElementById("classicy-fonts-system7")?.textContent ?? "";
		expect(css.match(/@font-face/g)).toHaveLength(SYSTEM7_FONT_FACES.length);
		for (const { family, weight, style } of SYSTEM7_FONT_FACES)
			expect(css).toMatch(
				new RegExp(
					`font-family:"${family}";src:url\\("[^"]+"\\) format\\("woff2"\\);font-weight:${weight};font-style:${style}`,
				),
			);
	}, 30_000);
});
