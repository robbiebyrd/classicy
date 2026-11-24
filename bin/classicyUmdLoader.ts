import type { Plugin } from "vite";

// Each package is "type": "module", so Node reads every .js file in it as an
// ES module, the UMD bundle too: `require()` of classicy.umd.js ran its
// factory with no `exports`, `module` or `require`, and it threw (story
// 0223-a0y). The bundle keeps its name, a public path (`./dist/*`) that CDN
// script tags load, and beside it ships a small CommonJS loader, the bundle's
// name with .cjs, which the exports map's `require` condition names under
// `node`: it runs the unchanged bundle as CommonJS, with only documented Node
// APIs. Browser bundlers resolve `require()` through `default`, the bundle
// itself, so none picks the loader.

/** The loader's file name for a UMD bundle: `classicy.umd.js` → `classicy.umd.cjs`. */
export const classicyUmdLoaderFile = (umdFile: string): string =>
	umdFile.replace(/\.js$/, ".cjs");

/** The loader's size limit, in bytes: it must stay a few lines. */
export const CLASSICY_UMD_LOADER_MAX_BYTES = 2048;

/**
 * The loader's source for the UMD bundle `umdFile` (a bare file name in the
 * same folder). The bundle runs in a CommonJS wrapper whose head is a line of
 * its own, offset away, so a stack trace from inside it names the bundle's
 * own file, lines and columns. Its `require` is the loader's, which resolves
 * from the same folder as the bundle's would.
 */
export const classicyUmdLoader = (umdFile: string): string =>
	[
		'"use strict";',
		`// Runs ${umdFile}, the UMD bundle, as CommonJS: in this "type": "module"`,
		"// package Node reads a .js file as an ES module (bin/classicyUmdLoader.ts).",
		'const { readFileSync } = require("node:fs");',
		'const { join } = require("node:path");',
		'const { runInThisContext } = require("node:vm");',
		`const file = join(__dirname, ${JSON.stringify(umdFile)});`,
		"const factory = runInThisContext(",
		'\t"(function (exports, require, module, __filename, __dirname) {\\n" +',
		'\t\treadFileSync(file, "utf8") +',
		'\t\t"\\n})",',
		"\t{ filename: file, lineOffset: -1 },",
		");",
		"factory.call(module.exports, module.exports, require, module, file, __dirname);",
		"",
	].join("\n");

/**
 * Emits the loader beside the UMD bundle `umdFile` in the build's UMD output.
 */
export function classicyUmdLoaderPlugin(umdFile: string): Plugin {
	return {
		name: "classicy-umd-loader",
		generateBundle(options) {
			if (options.format !== "umd") return;
			this.emitFile({
				type: "asset",
				fileName: classicyUmdLoaderFile(umdFile),
				source: classicyUmdLoader(umdFile),
			});
		},
	};
}

/**
 * Problems with the loader `loaderPath` that should run `umdFile`: it must
 * be exactly the loader this module writes (so it is tiny and names its
 * sibling), and `umdFile` must be beside it. `read` returns a file's text, or
 * null when it is missing.
 */
export function findClassicyUmdLoaderProblems(
	loaderPath: string,
	umdFile: string,
	read: (path: string) => string | null,
): string[] {
	const text = read(loaderPath);
	if (text === null)
		return [
			`${loaderPath}: missing -> the exports map's \`require\` condition names it; check classicyUmdLoaderPlugin in vite.config.ts (bin/classicyUmdLoader.ts).`,
		];
	const problems: string[] = [];
	if (text !== classicyUmdLoader(umdFile))
		problems.push(
			`${loaderPath}: is not the CommonJS loader for ${umdFile} -> it is written by classicyUmdLoaderPlugin (bin/classicyUmdLoader.ts), not by hand.`,
		);
	if (Buffer.byteLength(text) > CLASSICY_UMD_LOADER_MAX_BYTES)
		problems.push(
			`${loaderPath}: is ${Buffer.byteLength(text)} bytes, over ${CLASSICY_UMD_LOADER_MAX_BYTES} -> the loader runs the UMD bundle; it never carries code of its own.`,
		);
	const sibling = loaderPath.replace(/[^\\/]+$/, umdFile);
	if (read(sibling) === null)
		problems.push(
			`${loaderPath}: loads ${sibling}, which is missing -> the UMD bundle must ship beside its loader.`,
		);
	return problems;
}
