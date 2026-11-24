import { createRequire } from "node:module";
import type { Plugin } from "vite";

// Dependencies whose `browser` export condition runs browser code when the
// module loads, so a library build (which resolves `browser`) carries it to the
// top level of the bundle, and importing the bundle without a DOM throws
// (story 0223-a0y). decode-named-character-reference, which @mdxeditor/editor
// reaches through micromark, maps `browser` to index.dom.js, whose first
// statement is `document.createElement("i")`; its `default`, index.js, decodes
// from the character-entities table instead and runs anywhere.
export const CLASSICY_NODE_ENTRY_PACKAGES: readonly string[] = [
	"decode-named-character-reference",
];

/**
 * Resolves each named package to the entry Node's own resolver picks from the
 * importing file (its `exports` map's `node` or `default` condition, never
 * `browser`), so a bundle that carries it imports in Node. Only a bare import
 * of the package itself is redirected; every other specifier is left to Vite.
 */
export function classicyNodeEntryPlugin(
	packages: readonly string[] = CLASSICY_NODE_ENTRY_PACKAGES,
): Plugin {
	return {
		name: "classicy-node-entry",
		enforce: "pre",
		resolveId(source, importer) {
			if (!importer || importer.startsWith("\0") || !packages.includes(source))
				return null;
			const [file] = importer.split("?");
			return createRequire(file).resolve(source);
		},
	};
}
