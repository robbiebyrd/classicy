import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { isSingleClassicyLayerBlock } from "./classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Exactly the shape this module emits: an optional order statement, then one
// `@layer <layer> { … }` block holding the whole file. Anything else --
// `@layer classicy.base.x {…}`, `@layer classicy.basement {…}` -- is CSS to wrap.
const wrapped = (layer: string) =>
	new RegExp(
		`^(?:${escapeRegExp(CLASSICY_LAYER_ORDER)}\\n)?@layer ${escapeRegExp(layer)} \\{\\n[\\s\\S]*\\n\\}$`,
	);

// The layers CLASSICY_LAYER_ORDER declares: classicy.base, classicy.package,
// classicy.user.
const DECLARED_LAYERS = CLASSICY_LAYER_ORDER.replace(/^@layer\s+|;$/g, "")
	.split(",")
	.map((name) => name.trim());

// Nothing to layer: wrapped, it would only add an empty `@layer` block.
const isBlank = (css: string): boolean => css.trim() === "";

/**
 * True when `css` must not be wrapped into `layer`: it is blank, it already
 * is this module's own wrapper, or it is exactly one block of another declared layer
 * -- an Appearance Package's `?inline` stylesheet, compiled to one
 * `@layer classicy.package { … }` block. Wrapped again, that block would sit
 * in `classicy.base.classicy.package`, under every base rule. The layer name
 * matches exactly (`classicy.packages`, `classicy.package.x` are wrapped), and
 * anything outside the one block but a `@charset`, the order statement and
 * comments (a second block, a stray rule, another `@layer …;`) is wrapped.
 */
const isLayered = (css: string, layer: string): boolean =>
	isBlank(css) ||
	wrapped(layer).test(css) ||
	DECLARED_LAYERS.some(
		(name) =>
			name !== layer &&
			isSingleClassicyLayerBlock(css, name, CLASSICY_LAYER_ORDER),
	);

/**
 * `css` inside an `@layer <layer> { … }` block. Unchanged when it already is
 * exactly such a block (optionally after the layer order statement), so
 * wrapping twice is wrapping once, when it is exactly one block of another
 * declared layer (a package stylesheet), or when it is blank.
 */
export const wrapInClassicyLayer = (
	css: string,
	layer = "classicy.base",
): string => (isLayered(css, layer) ? css : `@layer ${layer} {\n${css}\n}`);

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** One source-map VLQ field. */
const vlq = (n: number): string => {
	let value = n < 0 ? (-n << 1) | 1 : n << 1;
	let out = "";
	do {
		let digit = value & 31;
		value >>>= 5;
		if (value > 0) digit |= 32;
		out += BASE64[digit];
	} while (value > 0);
	return out;
};

/**
 * The source map of `css` moved down `shift` whole lines (the wrapper's
 * prefix ends in a newline, so columns are unchanged; the closing `}` is
 * appended on a line of its own). One segment per input character, so the
 * map is exact wherever the previous step's (Sass's) map points, however
 * Vite chains it. Written here rather than with MagicString, which is not
 * a dependency of this package.
 */
export const classicyLineShiftMap = (
	css: string,
	shift: number,
	source: string,
): { version: 3; sources: string[]; names: string[]; mappings: string } => {
	const lines: string[] = Array.from({ length: shift }, () => "");
	let previousLine = 0;
	let previousColumn = 0;
	css.split("\n").forEach((text, line) => {
		const segments: string[] = [];
		let generatedColumn = 0;
		for (let column = 0; column < text.length; column++) {
			segments.push(
				vlq(column - generatedColumn) +
					vlq(0) +
					vlq(line - previousLine) +
					vlq(column - previousColumn),
			);
			generatedColumn = column;
			previousLine = line;
			previousColumn = column;
		}
		lines.push(segments.join(","));
	});
	return {
		version: 3,
		sources: [source],
		names: [],
		mappings: lines.join(";"),
	};
};

// Classicy's own sources: this repository's src/ (the plugin file lives in
// bin/). Excludes the example app's and node_modules' stylesheets, which are
// host CSS and stay unlayered.
const SRC_DIR = `${path
	.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src")
	.replace(/\\/g, "/")}/`;
const SCSS_ID = /\.scss(?:\?|$)/;
// `?raw` and `?url` imports are JS modules (a string, a URL), not CSS.
const NOT_CSS_QUERY = /[?&](?:raw|url)(?:[&=]|$)/;

const isClassicyComponentScss = (id: string): boolean => {
	if (!SCSS_ID.test(id) || NOT_CSS_QUERY.test(id)) return false;
	const file = id.split("?")[0].replace(/\\/g, "/");
	return file.startsWith(SRC_DIR);
};

/**
 * Compiles every Classicy component stylesheet into the `classicy.base`
 * cascade layer, `?inline` ones included; a stylesheet that is exactly one
 * block of another declared layer (a package's `classicy.package` sheet) is
 * left as it is. No `enforce`: it runs in the normal phase, after `vite:css`
 * has compiled the SCSS to CSS and before `vite:css-post` collects it, in the
 * library build, the dev servers and Storybook alike. One block per source
 * file, so per-file rule order is unchanged and every rule keeps its place
 * relative to the others.
 *
 * The layer order (CLASSICY_LAYER_ORDER) must be declared before any other
 * sheet names a layer, or a host sheet parsed first that names
 * `classicy.user` would rank it below `classicy.base`. `transformIndexHtml`
 * prepends it as `<style id="classicy-layer-order">` to every HTML page Vite
 * serves or builds (Storybook's preview iframe, the example's dev server).
 * When serving, every wrapped file also starts with it, for pages with no
 * HTML entry (repeating the statement is a no-op). A build declares it once,
 * first, instead: the dist injector and prependLayerOrder (vite.config.ts).
 */
export function classicyCssLayerPlugin(layer = "classicy.base"): Plugin {
	let serving = false;
	return {
		name: "classicy-css-layer",
		configResolved(config) {
			serving = config.command === "serve";
		},
		transformIndexHtml() {
			return [
				{
					tag: "style",
					attrs: { id: "classicy-layer-order" },
					children: CLASSICY_LAYER_ORDER,
					injectTo: "head-prepend",
				},
			];
		},
		transform(code, id) {
			if (!isClassicyComponentScss(id) || isLayered(code, layer)) return null;
			const css = wrapInClassicyLayer(code, layer);
			const out = serving ? `${CLASSICY_LAYER_ORDER}\n${css}` : css;
			// Only whole lines go before the input: the order statement when
			// serving, then the block's opening `@layer … {` line.
			const shift = serving ? 2 : 1;
			return { code: out, map: classicyLineShiftMap(code, shift, id) };
		},
	};
}
