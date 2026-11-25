import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLATINUM_FONT_FACES } from "../../../platinum/src/assets/platinumFonts.internal";
import { SYSTEM7_FONT_FACES } from "../../../system7/src/assets/system7Fonts.internal";
import {
	WINDOWS98_FONT_FACES,
	WINDOWS98_FONT_FAMILY,
} from "./windows98Fonts.internal";

// Windows 98's interface face (docs/windows98-asset-inventory.md, "Fonts"):
// MS Sans Serif was a bitmap font no browser loads, so the package ships
// 98.css's pixel recreation of it, lou's FontStruct "MS Sans Serif" and "MS
// Sans Serif Bold" (CC BY-SA 3.0), registered under the family the themes
// name first, with the readme and license files their license asks to travel
// with them.

const FONTS = path.join(import.meta.dirname, "fonts");
const NOTICES = [
	"font-bold-license.txt",
	"font-bold-readme.txt",
	"font-license.txt",
	"font-readme.txt",
];

describe("Windows 98's fonts", () => {
	it("are Pixelated MS Sans Serif, regular and bold, beside their four notices", () => {
		expect(
			WINDOWS98_FONT_FACES.map(({ family, weight, style }) =>
				[family, weight, style].join(" "),
			),
		).toEqual([
			"Pixelated MS Sans Serif normal normal",
			"Pixelated MS Sans Serif bold normal",
		]);
		expect(readdirSync(FONTS).sort()).toEqual(
			[
				...WINDOWS98_FONT_FACES.map(({ file }) => `${file}.woff2`),
				...NOTICES,
			].sort(),
		);
	});

	it("are woff2 files", () => {
		for (const { file } of WINDOWS98_FONT_FACES)
			expect(
				readFileSync(path.join(FONTS, `${file}.woff2`)).toString(
					"latin1",
					0,
					4,
				),
				file,
			).toBe("wOF2");
	});

	// The stack every theme gives the interface resolves to the package's own
	// face before any host font; the monospaced stacks (Fixedsys first) name
	// faces the host supplies.
	it("are the family every theme names first for its interface text", async () => {
		const { default: json } = await import("../windows98.json");
		for (const theme of [json.defaults, ...json.presets])
			for (const key of ["ui", "header", "body"] as const)
				expect(
					/^"([^"]+)"/.exec(theme.typography[key])?.[1],
					`${theme.id} ${key}`,
				).toBe(WINDOWS98_FONT_FAMILY);
	});

	// No face is another package's: the faces are Windows 98's alone, and no
	// `@font-face` rule is shared with Platinum or System 7.
	it("share no family or file with another package", () => {
		for (const other of [...PLATINUM_FONT_FACES, ...SYSTEM7_FONT_FACES]) {
			expect(other.family).not.toBe(WINDOWS98_FONT_FAMILY);
			for (const { file } of WINDOWS98_FONT_FACES)
				expect(other.file).not.toBe(file);
		}
	});

	// CC BY-SA 3.0 and the readmes: "If you redistribute the font file in this
	// archive, it must be accompanied by all the other files from this
	// archive". Each readme names its face's FontStruct page, each license
	// the license.
	it.each([
		["font-readme.txt", "font-license.txt", "1384746", "MS Sans Serif"],
		[
			"font-bold-readme.txt",
			"font-bold-license.txt",
			"1384862",
			"MS Sans Serif Bold",
		],
	])("keeps %s and %s with their face", (readme, license, id, name) => {
		const readmeText = readFileSync(path.join(FONTS, readme), "utf8");
		const licenseText = readFileSync(path.join(FONTS, license), "utf8");
		expect(readmeText).toContain(
			`https://fontstruct.com/fontstructions/show/${id}`,
		);
		expect(readmeText).toContain("must be accompanied by all");
		expect(licenseText).toContain(`The FontStruction “${name}”`);
		expect(licenseText).toContain(
			"http://creativecommons.org/licenses/by-sa/3.0/",
		);
	});

	// The package README's "Asset sources" names each face, its original and
	// its notices, and its license.
	it("are credited in the package README with their notices and license", () => {
		const readme = readFileSync(
			path.resolve(import.meta.dirname, "../../README.md"),
			"utf8",
		);
		for (const { file } of WINDOWS98_FONT_FACES)
			expect(readme, file).toContain(`| \`${file}.woff2\` |`);
		for (const notice of NOTICES) expect(readme, notice).toContain(notice);
		expect(readme).toContain(
			"[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)",
		);
	});

	it("registers them as <style id=classicy-fonts-windows98>, one @font-face each", async () => {
		await import("./windows98Assets");
		const css =
			document.getElementById("classicy-fonts-windows98")?.textContent ?? "";
		expect(css.match(/@font-face/g)).toHaveLength(WINDOWS98_FONT_FACES.length);
		for (const { family, file, weight, style } of WINDOWS98_FONT_FACES)
			expect(css).toMatch(
				new RegExp(
					`font-family:"${family}";src:url\\("[^"]*/fonts/${file}\\.woff2"\\) format\\("woff2"\\);font-weight:${weight};font-style:${style}`,
				),
			);
	}, 30_000);
});
