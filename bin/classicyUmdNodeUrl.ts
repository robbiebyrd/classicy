import { builtinModules } from "node:module";
import type { Plugin } from "vite";
import { classicyBundleSpecifiers } from "./classicyBundleSpecifiers.ts";

// Rollup renders `import.meta.url`, and an asset's URL (`new URL("x",
// import.meta.url)`), in a UMD bundle with a Node branch,
// `require('u' + 'rl').pathToFileURL(…)`, which esbuild's minifier folds into
// a static `require("url")`: a browser bundler that bundles the UMD bundle
// (esbuild's) then fails to resolve `url` (story 0223-a0y). This rewrites
// each into a call of a function declared at the end of the bundle, which
// reaches Node's url module with `process.getBuiltinModule` (Node 20.16 and
// 22.3 on), named so the call is exactly as long as what it replaces: every
// other character keeps its line and column, so the source map stays right.

/** The function the UMD bundle calls for Node's url module. */
export const CLASSICY_UMD_NODE_URL = "$classicyUrl";

// `require("url")`, `require('url')` or Rollup's own `require('u' + 'rl')`.
const NODE_URL_REQUIRE = /\brequire\((?:"url"|'url'|'u' ?\+ ?'rl')\)/g;
const CALL = `${CLASSICY_UMD_NODE_URL}()`;
const HELPER = `function ${CLASSICY_UMD_NODE_URL}(){return process.getBuiltinModule("node:url")}`;

/**
 * The UMD bundle `code` with each `require` of Node's url module replaced by
 * `$classicyUrl()` (padded with spaces to the same length) and the function
 * declared on a line of its own before the source map comment, or after the
 * code. Code that requires no url module is returned unchanged.
 */
export function classicyUmdNodeUrl(code: string): string {
	let found = false;
	const replaced = code.replace(NODE_URL_REQUIRE, (match) => {
		found = true;
		return CALL.padEnd(match.length, " ");
	});
	if (!found) return code;
	const marker = replaced.lastIndexOf("\n//# sourceMappingURL=");
	return marker === -1
		? `${replaced}\n${HELPER}\n`
		: `${replaced.slice(0, marker)}\n${HELPER}${replaced.slice(marker)}`;
}

/** Applies `classicyUmdNodeUrl` to each chunk of the UMD output. */
export function classicyUmdNodeUrlPlugin(): Plugin {
	return {
		name: "classicy-umd-node-url",
		generateBundle(options, bundle) {
			if (options.format !== "umd") return;
			for (const output of Object.values(bundle))
				if (output.type === "chunk")
					output.code = classicyUmdNodeUrl(output.code);
		},
	};
}

/**
 * verify:dist's problems with a UMD bundle's Node built-ins: one per
 * `require()` of one (`url`, `node:url`, …), which a browser bundler that
 * bundles the UMD bundle cannot resolve.
 */
export function findClassicyUmdNodeBuiltinProblems(
	file: string,
	source: string,
): string[] {
	const builtins = [
		...new Set(
			classicyBundleSpecifiers(source).filter(
				(specifier) =>
					specifier.startsWith("node:") || builtinModules.includes(specifier),
			),
		),
	];
	return builtins.map(
		(specifier) =>
			`${file}: requires Node's "${specifier}" -> a browser bundler that bundles the UMD bundle cannot resolve it; reach it through process.getBuiltinModule (classicyUmdNodeUrlPlugin, bin/classicyUmdNodeUrl.ts).`,
	);
}
