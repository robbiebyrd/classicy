import type { Plugin } from "vite";

// Each package is "type": "module", so Node reads every .js file in it as an
// ES module, the UMD bundle too: `require()` of classicy.umd.js ran its
// factory with no `exports`, `module` or `require`, and it threw (story
// 0223-a0y). The bundle keeps its name, a public path (`./dist/*`) that CDN
// script tags load, and beside it ships a small CommonJS loader, the bundle's
// name with .cjs, which the exports map's `require` condition names under
// `node`: it runs the unchanged bundle as CommonJS. Browser bundlers resolve
// `require()` through `default`, the bundle itself, so none picks the loader;
// they should `import` the ES build (story 0223-a0y).

/** The loader's file name for a UMD bundle: `classicy.umd.js` → `classicy.umd.cjs`. */
export const classicyUmdLoaderFile = (umdFile: string): string =>
	umdFile.replace(/\.js$/, ".cjs");

/** The loader's size limit, in bytes: it must stay a few lines. */
export const CLASSICY_UMD_LOADER_MAX_BYTES = 4096;

/** The Node releases `require()` needs: the UMD bundle reaches Node's url
 * module with `process.getBuiltinModule` (bin/classicyUmdNodeUrl.ts). */
export const CLASSICY_UMD_LOADER_NODE_FLOOR = "Node 20.16, 22.3 or later";

/**
 * The loader's source for `packageName`'s UMD bundle `umdFile` (a bare file
 * name in the same folder). It reads the bundle and runs it with a strict
 * direct `eval` inside a function whose parameters are CommonJS's
 * (`exports`, `require`, `module`, `__filename`, `__dirname`), the source
 * ending in a `//# sourceURL` of the bundle's file URL (V8 drops a source URL
 * holding whitespace, so a plain path under `Application Support` or
 * `First Last` named no file). So the bundle runs in the realm of whoever
 * required the loader (a test runner's sandbox, Jest's, included), a stack
 * trace names the bundle's own file, lines and columns, and
 * `--enable-source-maps` maps it through the bundle's source map (Node maps
 * generated code with a source URL). Strict, so nothing the bundle declares
 * at its top level lands in the function's scope, which would make every
 * global name the bundle reads a slow dynamic lookup (story 0223-a0y). Where
 * code generation from strings is disallowed
 * (`--disallow-code-generation-from-strings`) it compiles the bundle with
 * `vm.runInThisContext` instead, in the main realm and without source maps.
 * Its `require` is the loader's, which resolves from the same folder as the
 * bundle's would. A bundle missing beside it (a bundler copied the loader
 * alone into a server bundle) throws an error that says so, and so does a
 * Node older than CLASSICY_UMD_LOADER_NODE_FLOOR.
 */
export const classicyUmdLoader = (
	umdFile: string,
	packageName: string,
): string =>
	`// ${packageName}'s CommonJS entry: runs ${umdFile}, the UMD bundle beside it, as
// CommonJS, since in this "type": "module" package Node reads a .js file as an
// ES module (bin/classicyUmdLoader.ts in the Classicy repository).
function classicyUmdRun(exports, require, module, __filename, __dirname) {
	"use strict";
	eval(arguments[5]);
}
(function (file) {
	if (typeof process.getBuiltinModule !== "function")
		throw new Error(
			${JSON.stringify(`${packageName}: require() needs ${CLASSICY_UMD_LOADER_NODE_FLOOR} (process.getBuiltinModule); this is Node `)} +
				process.version +
				${JSON.stringify(`. Upgrade Node, or import ${packageName} (the ES build).`)},
		);
	var source;
	try {
		source = require("node:fs").readFileSync(file, "utf8");
	} catch (error) {
		if (error && error.code === "ENOENT")
			throw new Error(
				${JSON.stringify(`${packageName}: its UMD bundle, `)} +
					file +
					${JSON.stringify(`, is missing beside its CommonJS loader. A bundler copied the loader into a server bundle without the bundle: keep @classicy/* external in a server bundle that require()s them, or import them (the ES build).`)},
				{ cause: error },
			);
		throw error;
	}
	var args = [module.exports, require, module, file, __dirname];
	try {
		eval("");
	} catch (_disallowed) {
		return require("node:vm")
			.runInThisContext(
				'(function (exports, require, module, __filename, __dirname) {"use strict";\\n' +
					source +
					"\\n})",
				{ filename: file, lineOffset: -1 },
			)
			.apply(module.exports, args);
	}
	args.push(
		source +
			"\\n//# sourceURL=" +
			require("node:url").pathToFileURL(file).href,
	);
	classicyUmdRun.apply(module.exports, args);
})(require("node:path").join(__dirname, ${JSON.stringify(umdFile)}));
`;

/**
 * Emits `packageName`'s loader beside the UMD bundle `umdFile` in the build's
 * UMD output.
 */
export function classicyUmdLoaderPlugin(
	umdFile: string,
	packageName: string,
): Plugin {
	return {
		name: "classicy-umd-loader",
		generateBundle(options) {
			if (options.format !== "umd") return;
			this.emitFile({
				type: "asset",
				fileName: classicyUmdLoaderFile(umdFile),
				source: classicyUmdLoader(umdFile, packageName),
			});
		},
	};
}

/**
 * Problems with `packageName`'s loader `loaderPath` that should run
 * `umdFile`: it must
 * be exactly the loader this module writes (so it is tiny and names its
 * sibling), and `umdFile` must be beside it. `read` returns a file's text, or
 * null when it is missing.
 */
export function findClassicyUmdLoaderProblems(
	loaderPath: string,
	umdFile: string,
	packageName: string,
	read: (path: string) => string | null,
): string[] {
	const text = read(loaderPath);
	if (text === null)
		return [
			`${loaderPath}: missing -> the exports map's \`require\` condition names it; check classicyUmdLoaderPlugin in vite.config.ts (bin/classicyUmdLoader.ts).`,
		];
	const problems: string[] = [];
	if (text !== classicyUmdLoader(umdFile, packageName))
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
