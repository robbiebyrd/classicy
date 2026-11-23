import { describe, expect, it } from "vitest";
import {
	type ClassicyRawSourceMap,
	classicySourceMapTextPlugin,
	classifyClassicyMapSource,
	findClassicySourceMapTextProblems,
	stripClassicySourceMapText,
} from "./classicySourceMapText";

// Published source maps keep Classicy's own source text only (plan 0019-fb7
// Part 1): third-party modules and embedded assets lose theirs, while
// `sources`, `names` and `mappings` stay, so traces still name the file.

const OWN = "../src/index.ts";
const VENDOR =
	"../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js";
const ASSET = "../assets/img/ui/earth.webp?inline";
const OTHER = "\0commonjsHelpers.js";

const map = (
	sources: string[],
	sourcesContent: Array<string | null>,
	extra: Partial<ClassicyRawSourceMap> = {},
): ClassicyRawSourceMap => ({
	version: 3,
	file: "classicy.es.js",
	sources,
	sourcesContent,
	names: ["a", "b"],
	mappings: "AAAA,CAAC;ACAA",
	...extra,
});

describe("classifyClassicyMapSource", () => {
	it("classifies node_modules paths as vendor", () => {
		expect(classifyClassicyMapSource(VENDOR, "export const z = 1;")).toBe(
			"vendor",
		);
		expect(
			classifyClassicyMapSource(
				"../node_modules/.pnpm/pdfjs-dist@6.2.108/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?classicy-deflate",
				"export default new Uint8Array([1, 2]);",
			),
		).toBe("vendor");
		expect(
			classifyClassicyMapSource("..\\node_modules\\zod\\index.js", null),
		).toBe("vendor");
	});

	it("classifies embedded assets", () => {
		expect(classifyClassicyMapSource(ASSET, 'export default "data:a"')).toBe(
			"asset",
		);
		expect(
			classifyClassicyMapSource(
				"../src/a.ts",
				'export default "data:image/png;base64,AA"',
			),
		).toBe("asset");
		expect(
			classifyClassicyMapSource(
				"../src/assets/sounds/platinum/platinum.ogg?no-inline",
				'export default "__VITE_ASSET__x__"',
			),
		).toBe("asset");
		expect(
			classifyClassicyMapSource("../assets/img/icons/system/macos.SVG", null),
		).toBe("asset");
		expect(
			classifyClassicyMapSource(
				"../packages/appearance/platinum/src/a.png?no-inline",
				'export default "__VITE_ASSET__x__"',
			),
		).toBe("asset");
		// The extension decides, whatever the query: an SVG is an image.
		expect(
			classifyClassicyMapSource("../src/foo.svg?raw", 'export default "<svg>"'),
		).toBe("asset");
	});

	it("classifies Classicy sources as own", () => {
		expect(classifyClassicyMapSource(OWN, "export {};")).toBe("own");
		expect(
			classifyClassicyMapSource(
				"../../platinum/src/screenSavers/Logo/x.ts",
				"export {};",
			),
		).toBe("own");
		// A query makes nothing an asset: a package stylesheet imported
		// `?inline`, a `?url` or `?raw` import of Classicy's text stay own.
		expect(
			classifyClassicyMapSource(
				"../src/assets/pixelart/popup-slider-thumb.txt?raw",
				'export default "..77.."',
			),
		).toBe("own");
		expect(
			classifyClassicyMapSource(
				"../src/x.scss?inline",
				'export default "@layer classicy.package{}"',
			),
		).toBe("own");
		expect(
			classifyClassicyMapSource("../src/x.ts?url", 'export default "x"'),
		).toBe("own");
	});

	it("leaves virtual helpers alone", () => {
		expect(classifyClassicyMapSource(OTHER, "export {};")).toBe("other");
		// Rollup relativizes a virtual id like any other: ../../\0id.
		expect(
			classifyClassicyMapSource("../../\0commonjsHelpers.js", "export {};"),
		).toBe("other");
	});
});

describe("stripClassicySourceMapText", () => {
	it("strips vendor and asset text and keeps the rest", () => {
		const input = map([OWN, VENDOR, ASSET, OTHER], ["a", "b", "c", "d"]);
		const before = structuredClone(input);
		const output = stripClassicySourceMapText(input);
		expect(output.sourcesContent).toEqual(["a", null, null, "d"]);
		expect(output.sources).toEqual(before.sources);
		expect(output.names).toEqual(before.names);
		expect(output.mappings).toBe(before.mappings);
		expect(output.version).toBe(3);
		expect(output.file).toBe("classicy.es.js");
		expect(output.x_google_ignoreList).toEqual([1]);
		// A new map: the input is untouched.
		expect(input).toEqual(before);
	});

	it("merges the ignore list", () => {
		const sources = [OWN, VENDOR, OWN, OWN, OWN, VENDOR];
		const output = stripClassicySourceMapText(
			map(sources, ["a", "b", "c", "d", "e", "f"], {
				x_google_ignoreList: [3, 1],
			}),
		);
		expect(output.x_google_ignoreList).toEqual([1, 3, 5]);
	});

	it("keeps keys it does not know", () => {
		const output = stripClassicySourceMapText(
			map([OWN], ["a"], { sourceRoot: "", debugId: "x" }),
		);
		expect(output.sourceRoot).toBe("");
		expect(output.debugId).toBe("x");
	});
});

describe("findClassicySourceMapTextProblems", () => {
	const FILE = "classicy.es.js.map";
	const problemsOf = (input: ClassicyRawSourceMap) =>
		findClassicySourceMapTextProblems(JSON.stringify(input), FILE);

	it("reports each problem", () => {
		const clean = stripClassicySourceMapText(
			map([OWN, VENDOR, ASSET, OTHER], ["a", "b", "c", "d"]),
		);
		expect(problemsOf(clean)).toEqual([]);

		const cases: Array<[string, ClassicyRawSourceMap, string]> = [
			[
				"vendor text",
				map([OWN, VENDOR], ["a", "b"], { x_google_ignoreList: [1] }),
				VENDOR,
			],
			["asset text", map([OWN, ASSET], ["a", "c"]), ASSET],
			[
				"own text null",
				map([OWN, VENDOR], [null, null], {
					x_google_ignoreList: [1],
				}),
				OWN,
			],
			[
				"own text missing",
				map([VENDOR, OWN], [null], {
					x_google_ignoreList: [0],
				}),
				OWN,
			],
			["missing ignore entry", map([OWN, VENDOR], ["a", null]), VENDOR],
		];
		for (const [name, input, source] of cases) {
			const problems = problemsOf(input);
			expect(problems, name).toHaveLength(1);
			expect(problems[0], name).toContain(FILE);
			expect(problems[0], name).toContain(source);
		}

		const bad = findClassicySourceMapTextProblems("{not json", FILE);
		expect(bad).toHaveLength(1);
		expect(bad[0]).toContain(FILE);
	});

	it("a src/ module recognized as an asset only by its content is stripped, and the gate reports it", () => {
		// Fails safe: once its text is gone nothing tells it from Classicy's
		// own code, so the gate fails loudly and names the fix.
		const DATA = "../src/a.ttf";
		const stripped = stripClassicySourceMapText(
			map([OWN, DATA], ["a", 'export default "data:font/ttf;base64,AA"']),
		);
		expect(stripped.sourcesContent).toEqual(["a", null]);
		const problems = problemsOf(stripped);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain(FILE);
		expect(problems[0]).toContain(DATA);
		expect(problems[0]).toContain("CLASSICY_MAP_ASSET_EXTENSIONS");
	});
});

describe("classicySourceMapTextPlugin", () => {
	it("the plugin rewrites .js.map assets only", () => {
		const plugin = classicySourceMapTextPlugin();
		expect(plugin.name).toBe("classicy-source-map-text");
		expect(plugin.enforce).toBe("post");

		const raw = map([OWN, VENDOR], ["a", "b"]);
		const text = JSON.stringify(raw);
		const chunkMap = structuredClone(raw);
		const bundle = {
			"a.js.map": { type: "asset", fileName: "a.js.map", source: text },
			"b.js.map": {
				type: "asset",
				fileName: "b.js.map",
				source: new TextEncoder().encode(text),
			},
			"a.css.map": { type: "asset", fileName: "a.css.map", source: text },
			"a.js": { type: "chunk", fileName: "a.js", code: "x", map: chunkMap },
		} as Record<string, { source?: string | Uint8Array; map?: unknown }>;
		const context = {
			error: (message: string) => {
				throw new Error(message);
			},
		};
		const hook = plugin.generateBundle as unknown as (
			this: typeof context,
			options: unknown,
			bundle: unknown,
		) => void;
		hook.call(context, {}, bundle);

		const expected = stripClassicySourceMapText(raw);
		for (const name of ["a.js.map", "b.js.map"]) {
			const source = bundle[name].source;
			const json =
				typeof source === "string" ? source : new TextDecoder().decode(source);
			expect(JSON.parse(json), name).toEqual(expected);
		}
		expect(bundle["a.css.map"].source).toBe(text);
		expect(bundle["a.js"].map).toEqual(raw);
	});
});
