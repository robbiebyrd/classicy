import { builtinModules } from "node:module";
import type { Plugin } from "vite";
import { classicyBundleSpecifiers } from "./classicyBundleSpecifiers.ts";

// Rollup renders `import.meta.url`, and an asset's URL (`new URL("x",
// import.meta.url)`), in a UMD bundle with a Node branch,
// `require('u' + 'rl').pathToFileURL(…)`, which esbuild's minifier folds into
// a static `require("url")`: a browser bundler that bundles the UMD bundle
// (esbuild's) then fails to resolve `url` (story 0223-a0y). This rewrites
// each into a call of a function declared inside the UMD factory, at its
// end, which reaches Node's url module with `process.getBuiltinModule` (Node
// 20.16 and 22.3 on; `require()` as a whole needs 20.19 or 22.12,
// CLASSICY_UMD_LOADER_NODE_FLOOR), named so the call is exactly as long as
// what it replaces: every other character keeps its line and column, so the
// source map stays right (only the factory's closing `}));` moves). Never at
// the bundle's top level: a `<script>` page would get it as a global, and a
// top-level declaration makes every global lookup in the bundle slow under
// the CommonJS loader's eval (findClassicyUmdTopLevelDeclarations).

/** The function the UMD bundle calls for Node's url module. */
export const CLASSICY_UMD_NODE_URL = "$classicyUrl";

// `require("url")`, `require('url')` or Rollup's own `require('u' + 'rl')`.
const NODE_URL_REQUIRE = /\brequire\((?:"url"|'url'|'u' ?\+ ?'rl')\)/g;
const CALL = `${CLASSICY_UMD_NODE_URL}()`;
const HELPER = `function ${CLASSICY_UMD_NODE_URL}(){return process.getBuiltinModule("node:url")}`;

/**
 * The UMD bundle `code` with each `require` of Node's url module replaced by
 * `$classicyUrl()` (padded with spaces to the same length) and the function
 * declared at the end of the UMD factory, just before its closing `}));`.
 * Code that requires no url module is returned unchanged; code that does but
 * does not end with the factory's `}));` (before any source map comment)
 * throws, since the function would land outside it.
 */
export function classicyUmdNodeUrl(code: string): string {
	let found = false;
	const replaced = code.replace(NODE_URL_REQUIRE, (match) => {
		found = true;
		return CALL.padEnd(match.length, " ");
	});
	if (!found) return code;
	const marker = replaced.lastIndexOf("\n//# sourceMappingURL=");
	const body = marker === -1 ? replaced : replaced.slice(0, marker);
	const end = body.lastIndexOf("}));");
	if (end === -1 || body.slice(end + 4).trim() !== "")
		throw new Error(
			`the UMD bundle does not end with its factory's "}));", so ${CLASSICY_UMD_NODE_URL} cannot be declared inside it -> check the UMD output and bin/classicyUmdNodeUrl.ts.`,
		);
	return `${body.slice(0, end)};${HELPER}${replaced.slice(end)}`;
}

/** Applies `classicyUmdNodeUrl` to each chunk of the UMD output. */
export function classicyUmdNodeUrlPlugin(): Plugin {
	return {
		name: "classicy-umd-node-url",
		generateBundle(options, bundle) {
			if (options.format !== "umd") return;
			for (const output of Object.values(bundle))
				if (output.type === "chunk")
					try {
						output.code = classicyUmdNodeUrl(output.code);
					} catch (error) {
						this.error(
							`${output.fileName}: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
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

/**
 * verify:dist's problems with what a UMD bundle declares at its top level
 * (`parse` is Rollup's, vite's `parseAst`): every function, class, variable
 * or import there. On a `<script>` page each is a global, and under the
 * CommonJS loader's eval one makes every global name the bundle reads a slow
 * lookup (story 0223-a0y): the bundle is its UMD wrapper and the style
 * injector, both expressions.
 */
export function findClassicyUmdTopLevelDeclarations(
	file: string,
	source: string,
	// Rollup's ESTree program (vite's parseAst).
	parse: (code: string) => { body: ReadonlyArray<object> },
): string[] {
	type TopLevel = {
		type: string;
		id?: { name?: string } | null;
		declarations?: ReadonlyArray<{ id?: { name?: string } }>;
	};
	return (parse(source).body as ReadonlyArray<TopLevel>)
		.filter(
			(node) =>
				node.type !== "ExpressionStatement" && node.type !== "EmptyStatement",
		)
		.map((node) => {
			const names = node.declarations
				? node.declarations.map((d) => d.id?.name ?? "?").join(", ")
				: (node.id?.name ?? "?");
			return `${file}: declares ${names} at its top level (${node.type}) -> a <script> page gets it as a global, and the CommonJS loader's eval slows every global name the bundle reads; keep it inside the UMD factory (bin/classicyUmdNodeUrl.ts).`;
		});
}
