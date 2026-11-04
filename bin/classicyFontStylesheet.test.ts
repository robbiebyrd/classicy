import { describe, expect, it } from "vitest";
// Registers the Platinum faces at runtime: the <style> the static file mirrors.
import "@/Appearance/Platinum/assets/platinumAssets";
import { PLATINUM_FONT_FACES } from "@/Appearance/Platinum/assets/platinumFonts.internal";
import {
	CLASSICY_PLATINUM_FONT_STYLESHEET,
	classicyEmittedFontFiles,
	classicyFontStylesheet,
	findClassicyFontStylesheetProblems,
} from "./classicyFontStylesheet";

const FILE = `dist/${CLASSICY_PLATINUM_FONT_STYLESHEET}`;
const emitted = (face: { file: string }) => `assets/${face.file}.woff2`;
const css = classicyFontStylesheet(PLATINUM_FONT_FACES, emitted);
const everyFile = () => true;

describe("classicyFontStylesheet", () => {
	it("is named after the package stylesheet it follows, outside the classicy-<name>.css namespace", () =>
		expect(CLASSICY_PLATINUM_FONT_STYLESHEET).toBe(
			"classicy-platinum.fonts.css",
		));

	it("holds the rules the runtime writes into <style id=classicy-fonts-platinum>, urls relative to dist", () => {
		const runtime =
			document.getElementById("classicy-fonts-platinum")?.textContent ?? "";
		expect(runtime.match(/@font-face/g)).toHaveLength(13);
		// The runtime's urls are the bundle's resolved asset URLs; the file's
		// are the emitted names relative to dist/. Nothing else may differ.
		const relative = runtime.replace(
			/url\("[^"]*\/([^"/]+\.woff2)"\)/g,
			'url("assets/$1")',
		);
		expect(css).toBe(`${relative}\n`);
	});

	it("declares all thirteen Platinum faces", () =>
		expect(css.match(/@font-face\{/g)).toHaveLength(13));

	it("is ASCII only and unlayered", () => {
		expect([...css].every((ch) => ch.charCodeAt(0) < 0x80)).toBe(true);
		expect(css).not.toContain("@layer");
	});

	it("uses each face's emitted file name", () =>
		expect(
			classicyFontStylesheet(
				[
					{
						family: "Geneva",
						file: "Geneva-bold-normal",
						weight: "bold",
						style: "normal",
					},
				],
				() => "assets/Geneva-bold-normal-a1b2.woff2",
			),
		).toBe(
			'@font-face{font-family:"Geneva";src:url("assets/Geneva-bold-normal-a1b2.woff2") format("woff2");font-weight:bold;font-style:normal;font-display:swap}\n',
		));

	it("throws naming a face whose file was not emitted", () =>
		expect(() =>
			classicyFontStylesheet(PLATINUM_FONT_FACES, (face) =>
				face.file === "Monaco-normal-normal" ? undefined : emitted(face),
			),
		).toThrow(/Monaco-normal-normal/));
});

describe("classicyEmittedFontFiles", () => {
	it("maps each Platinum font source to its emitted file name", () =>
		expect(
			classicyEmittedFontFiles([
				{
					fileName: "assets/Geneva-bold-normal.woff2",
					originalFileNames: [
						"src/Appearance/Platinum/assets/fonts/Geneva-bold-normal.woff2",
					],
				},
				{
					fileName: "assets/Monaco-normal-normal-x.woff2",
					originalFileNames: [
						"/repo/src/Appearance/Platinum/assets/fonts/Monaco-normal-normal.woff2",
					],
				},
				{
					fileName: "assets/grip.svg",
					originalFileNames: ["src/Appearance/Platinum/assets/art/grip.svg"],
				},
			]),
		).toEqual(
			new Map([
				["Geneva-bold-normal", "assets/Geneva-bold-normal.woff2"],
				["Monaco-normal-normal", "assets/Monaco-normal-normal-x.woff2"],
			]),
		));
});

describe("findClassicyFontStylesheetProblems", () => {
	const problems = (
		text: string | null,
		exists: (url: string) => boolean = everyFile,
	) =>
		findClassicyFontStylesheetProblems(FILE, text, PLATINUM_FONT_FACES, exists);

	it("passes the generated stylesheet", () =>
		expect(problems(css)).toEqual([]));

	it("passes it without the trailing newline, or with CRLF line ends", () => {
		expect(problems(css.trimEnd())).toEqual([]);
		expect(problems(css.replace(/\n/g, "\r\n"))).toEqual([]);
	});

	it("fails a missing file", () =>
		expect(problems(null)).toEqual([
			`${FILE}: missing -> check the font stylesheet in injectCssPlugin (vite.config.ts).`,
		]));

	it("fails a missing face, naming it", () => {
		const without = css
			.split("\n")
			.filter((rule) => !rule.includes("Monaco"))
			.join("\n");
		expect(problems(without)).toEqual([
			`${FILE}: no @font-face for "Monaco" normal normal, which the runtime registers.`,
		]);
	});

	it("fails an extra face, naming it", () =>
		expect(
			problems(
				`${css}@font-face{font-family:"Chicago";src:url("assets/Chicago.woff2") format("woff2");font-weight:normal;font-style:normal;font-display:swap}\n`,
			),
		).toEqual([
			`${FILE}: @font-face for "Chicago" normal normal, which the runtime does not register.`,
		]));

	it("fails a face whose url() names another face's file", () => {
		const swapped = css.replace(
			'url("assets/Monaco-normal-normal.woff2")',
			'url("assets/Charcoal-normal-normal.woff2")',
		);
		expect(swapped).not.toBe(css);
		expect(problems(swapped)).toEqual([
			`${FILE}: the @font-face for "Monaco" normal normal points at "assets/Charcoal-normal-normal.woff2", not its own file Monaco-normal-normal.woff2.`,
		]);
	});

	it("fails a duplicated face", () => {
		const first = css.split("\n")[0];
		expect(problems(`${first}\n${css}`)).toEqual([
			`${FILE}: more than one @font-face for "Charcoal" normal normal.`,
		]);
	});

	it.each([
		["font-display", "font-display:swap", "font-display:block"],
		["the format hint", ' format("woff2")', ""],
		[
			"the declaration order",
			"font-weight:normal;font-style:normal",
			"font-style:normal;font-weight:normal",
		],
	])("fails a face whose %s differs from the runtime's rule", (_name, from, to) => {
		const changed = css.replace(from, to);
		const prefix = `${FILE}: the @font-face for "Charcoal" normal normal is not the rule the runtime writes`;
		expect(
			problems(changed).map((problem) => problem.slice(0, prefix.length)),
		).toEqual([prefix]);
	});

	it("fails a url that does not resolve to a file in dist/assets", () =>
		expect(
			problems(css, (url) => url !== "assets/Geneva-bold-normal.woff2"),
		).toEqual([
			`${FILE}: url("assets/Geneva-bold-normal.woff2") does not resolve to a file in dist/assets.`,
		]));

	it.each([
		"../fonts/Geneva-bold-normal.woff2",
		"https://example.com/Geneva-bold-normal.woff2",
		"assets/../Geneva-bold-normal.woff2",
		"Geneva-bold-normal.woff2",
	])("fails a url outside dist/assets (%s)", (url) =>
		expect(
			problems(css.replace("assets/Geneva-bold-normal.woff2", url)),
		).toEqual([
			`${FILE}: url("${url}") does not resolve to a file in dist/assets.`,
		]));

	it("fails rules wrapped in a layer", () =>
		expect(problems(`@layer classicy.base{${css}}`)).toEqual([
			`${FILE}: holds something other than unlayered @font-face rules at offset 0 -> @font-face ignores layers; write the rules bare.`,
		]));

	it("fails another rule beside the faces", () =>
		expect(problems(`${css}.a{color:red}\n`)).toEqual([
			`${FILE}: holds something other than unlayered @font-face rules at offset ${css.length} -> @font-face ignores layers; write the rules bare.`,
		]));
});
