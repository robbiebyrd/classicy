import path from "node:path";
import * as sass from "sass";

/**
 * Compiles a stylesheet through the sass API (`?inline` and plain SCSS
 * imports are empty under vitest), in `expanded` style: one selector of a list
 * per line and one declaration per line. `file` is relative to the repo root,
 * which is vitest's root (jsdom leaves `import.meta.url` a non-file URL).
 */
export const compileScss = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;

/**
 * The declarations of every top-level block headed by exactly `selector`
 * (a selector can head more than one block; later blocks win, as in the
 * cascade). Throws when no block matches.
 */
export const scssRule = (
	css: string,
	selector: string,
): Record<string, string> => {
	const blocks = [
		...css.matchAll(
			new RegExp(
				`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
				"gm",
			),
		),
	];
	if (blocks.length === 0) throw new Error(`rule not found: ${selector}`);
	const declarations: Record<string, string> = {};
	for (const block of blocks) {
		for (const line of block[1].split("\n")) {
			const colon = line.indexOf(":");
			if (colon === -1) continue;
			declarations[line.slice(0, colon).trim()] = line
				.slice(colon + 1)
				.trim()
				.replace(/;$/, "");
		}
	}
	return declarations;
};
