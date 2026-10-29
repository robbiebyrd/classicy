import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * `css` inside an `@layer <layer> { … }` block. Unchanged when it already
 * starts with `@layer <layer>` (a block or the order statement), so wrapping
 * twice is wrapping once.
 */
export const wrapInClassicyLayer = (
	css: string,
	layer = "classicy.base",
): string =>
	css.startsWith(`@layer ${layer}`) ? css : `@layer ${layer} {\n${css}\n}`;

const SCSS_ID = /\.scss(?:\?|$)/;
// `?raw` and `?url` imports are JS modules (a string, a URL), not CSS.
const NOT_CSS_QUERY = /[?&](?:raw|url)(?:[&=]|$)/;
// The example app's own stylesheets are host CSS and stay unlayered, even
// when its dev server compiles Classicy from source (example/vite.config.ts).
const EXAMPLE_DIR = `${path
	.resolve(path.dirname(fileURLToPath(import.meta.url)), "../example")
	.replace(/\\/g, "/")}/`;

const isClassicyComponentScss = (id: string): boolean => {
	if (!SCSS_ID.test(id) || NOT_CSS_QUERY.test(id)) return false;
	const file = id.split("?")[0].replace(/\\/g, "/");
	return (
		/(?:^|\/)src\//.test(file) &&
		!file.includes("/node_modules/") &&
		!file.startsWith(EXAMPLE_DIR)
	);
};

/**
 * Compiles every Classicy component stylesheet into the `classicy.base`
 * cascade layer (the order is declared by CLASSICY_LAYER_ORDER, which the
 * injected stylesheet starts with). No `enforce`: it runs in the normal
 * phase, after `vite:css` has compiled the SCSS to CSS and before
 * `vite:css-post` collects it, in the library build, the dev servers and
 * Storybook alike. One block per source file, so per-file rule order is
 * unchanged and every rule keeps its place relative to the others.
 */
export function classicyCssLayerPlugin(layer = "classicy.base"): Plugin {
	return {
		name: "classicy-css-layer",
		transform(code, id) {
			if (!isClassicyComponentScss(id) || code.startsWith(`@layer ${layer}`))
				return null;
			return { code: wrapInClassicyLayer(code, layer), map: null };
		},
	};
}
