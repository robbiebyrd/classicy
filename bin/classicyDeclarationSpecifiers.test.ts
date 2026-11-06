import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	classicyDeclarationExtensionsWriter,
	classicyPackageOfSpecifier,
	findClassicyBareSpecifiers,
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

	// The core's ClassicyIcons.d.ts documents `import appIcon from
	// './icon.png'` in its JSDoc (0151-0cc): no host resolves a comment.
	it("leaves comments and string literals alone", () => {
		const code = [
			"/**",
			" * import appIcon from './icon.png';",
			" */",
			"// export * from './gone';",
			'export declare const GLOB = "src/**/*.png";',
			"export declare const NOTE = \"import from './gone'\";",
			"type B = import('./hooks').B;",
			"/* closes the glob's would-be comment */",
		].join("\n");
		expect(
			withClassicyDeclarationExtensions(code, "src/index.ts", isSource),
		).toBe(code.replace("import('./hooks')", "import('./hooks.js')"));
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

	it("names none in a comment or a string literal", () =>
		expect(
			findClassicyExtensionlessSpecifiers(
				[
					"/** import appIcon from './icon.png'; */",
					"// export * from './gone';",
					"export declare const NOTE = 'export * from \"./gone\"';",
					"export * from './hooks';",
				].join("\n"),
			),
		).toEqual(["./hooks"]));

	it("finds none in declarations that carry their extensions", () =>
		expect(
			findClassicyExtensionlessSpecifiers(
				"export * from './hooks.js';\nexport * from './a/index.js';",
			),
		).toEqual([]));
});

// The packages a declaration imports: each must be one a host installs
// beside it (bin/check-host-types.ts, story 0153-k0e).
describe("findClassicyBareSpecifiers", () => {
	it("names each package specifier, type references included", () =>
		expect(
			findClassicyBareSpecifiers(
				[
					'/// <reference types="node" />',
					"import { Howl } from 'howler';",
					'export type { T } from "@scope/pkg/sub";',
					"type A = import('analytics').DetachListeners;",
					'import "side-effect";',
					"import { a } from './hooks.js';",
					"import { b } from '../up';",
					"import { c } from '#internal';",
				].join("\n"),
			),
		).toEqual([
			"node",
			"howler",
			"@scope/pkg/sub",
			"analytics",
			"side-effect",
		]));

	it("names none in a comment or a string literal", () =>
		expect(
			findClassicyBareSpecifiers(
				[
					"/**",
					' * Test helper: forget the last press, so each test starts from "pointer".',
					" */",
					"/** import { MDXEditor } from '@mdxeditor/editor'; */",
					"// import { Howl } from 'howler';",
					"export declare const NOTE = \"import from 'zod'\";",
					'declare module "ambient" {}',
					'/// <reference path="./local.d.ts" />',
					"import type { Z } from 'zod';",
				].join("\n"),
			),
		).toEqual(["zod"]));
});

describe("classicyPackageOfSpecifier", () => {
	it("is the package a specifier names, its subpath dropped", () =>
		expect(
			[
				"react",
				"react/jsx-runtime",
				"@mdxeditor/editor",
				"@scope/pkg/deep/path",
				"node:fs",
			].map(classicyPackageOfSpecifier),
		).toEqual([
			"react",
			"react",
			"@mdxeditor/editor",
			"@scope/pkg",
			"node:fs",
		]));
});

// The one vite-plugin-dts `beforeWriteFile` both builds use: the core keeps
// `src/` in its declaration paths (dist/types/src/…), Platinum's dts strips
// it (entryRoot "src", dist/types/…).
describe("classicyDeclarationExtensionsWriter", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-declaration-writer-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "src/a"), { recursive: true });
	writeFileSync(join(root, "src/a/hooks.ts"), "");
	writeFileSync(join(root, "src/index.ts"), "");

	it("resolves from the source path under the declaration's own path (the core)", () =>
		expect(
			classicyDeclarationExtensionsWriter({ root })(
				join(root, "dist/types/src/index.d.ts"),
				"export * from './a/hooks';",
			),
		).toEqual({
			filePath: join(root, "dist/types/src/index.d.ts"),
			content: "export * from './a/hooks.js';",
		}));

	it("resolves from the source path under entryRoot (Platinum)", () =>
		expect(
			classicyDeclarationExtensionsWriter({ root, entryRoot: "src" })(
				join(root, "dist/types/a/hooks.d.ts"),
				"export * from '../index';",
			),
		).toEqual({
			filePath: join(root, "dist/types/a/hooks.d.ts"),
			content: "export * from '../index.js';",
		}));

	it("leaves other files alone", () =>
		expect(
			classicyDeclarationExtensionsWriter({ root })(
				join(root, "dist/types/src/index.d.ts.map"),
				"export * from './a/hooks';",
			),
		).toBeUndefined());

	it("throws on a specifier that names no source module", () =>
		expect(() =>
			classicyDeclarationExtensionsWriter({ root, entryRoot: "src" })(
				join(root, "dist/types/index.d.ts"),
				"export * from './a/hooks';\nexport * from './gone';",
			),
		).toThrow(/src\/index\.ts: "\.\/gone" names no module/));
});
