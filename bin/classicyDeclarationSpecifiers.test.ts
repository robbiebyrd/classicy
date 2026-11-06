import { describe, expect, it } from "vitest";
import {
	findClassicyExtensionlessSpecifiers,
	withClassicyDeclarationExtensions,
} from "./classicyDeclarationSpecifiers";

// A `"type": "module"` package's declarations are ES modules to a host on
// `moduleResolution: node16`/`nodenext`, which resolves a relative specifier
// only with its extension: `export * from "./hooks"` resolves to nothing, and
// every name it re-exports is missing (TS2305). The Platinum build rewrites
// each relative specifier to the `.js` the module ships as (or its folder's
// `index.js`); the package's verify-dist fails on any left without one.

const SOURCES = new Set([
	"src/hooks.ts",
	"src/assets/platinumAssets.ts",
	"src/assets/sounds/platinum.ts",
	"src/assets/art/index.ts",
	"src/Window.view.tsx",
]);
const isSource = (path: string) => SOURCES.has(path);

describe("withClassicyDeclarationExtensions", () => {
	it("gives each relative specifier the .js its module ships as", () =>
		expect(
			withClassicyDeclarationExtensions(
				[
					"import { A } from './hooks';",
					'export * from "./assets/platinumAssets";',
					"export * from './assets/sounds/platinum';",
					"type B = import('./hooks').B;",
					'import "./hooks";',
				].join("\n"),
				"src/index.ts",
				isSource,
			),
		).toBe(
			[
				"import { A } from './hooks.js';",
				'export * from "./assets/platinumAssets.js";',
				"export * from './assets/sounds/platinum.js';",
				"type B = import('./hooks.js').B;",
				'import "./hooks.js";',
			].join("\n"),
		));

	it("resolves from the declaring file's folder, parent folders included", () =>
		expect(
			withClassicyDeclarationExtensions(
				"export { a } from '../../hooks';",
				"src/assets/sounds/platinum.ts",
				isSource,
			),
		).toBe("export { a } from '../../hooks.js';"));

	// A dotted module name keeps its dots: ".view" is not an extension.
	it("adds .js after a dotted module name", () =>
		expect(
			withClassicyDeclarationExtensions(
				"export * from './Window.view';",
				"src/index.ts",
				isSource,
			),
		).toBe("export * from './Window.view.js';"));

	it("points a folder at its index.js", () =>
		expect(
			withClassicyDeclarationExtensions(
				"export * from './assets/art';",
				"src/index.ts",
				isSource,
			),
		).toBe("export * from './assets/art/index.js';"));

	it("leaves package specifiers and specifiers with an extension alone", () => {
		const code = [
			"import { ClassicyTheme } from '@classicy/classicy';",
			"import type { X } from './hooks.js';",
			"import data from './platinum.json';",
		].join("\n");
		expect(
			withClassicyDeclarationExtensions(code, "src/index.ts", isSource),
		).toBe(code);
	});

	it("throws on a relative specifier that names no module", () =>
		expect(() =>
			withClassicyDeclarationExtensions(
				"export * from './gone';",
				"src/index.ts",
				isSource,
			),
		).toThrow(/src\/index\.ts: "\.\/gone" names no module under src\//));
});

describe("findClassicyExtensionlessSpecifiers", () => {
	it("names each relative specifier without an extension", () =>
		expect(
			findClassicyExtensionlessSpecifiers(
				[
					"export * from './hooks';",
					"export * from './hooks.js';",
					"import { T } from '@classicy/classicy';",
					"type B = import('../x').B;",
					"export * from './Window.view';",
				].join("\n"),
			),
		).toEqual(["./hooks", "../x", "./Window.view"]));

	it("finds none in declarations that carry their extensions", () =>
		expect(
			findClassicyExtensionlessSpecifiers(
				"export * from './hooks.js';\nexport * from './a/index.js';",
			),
		).toEqual([]));
});
