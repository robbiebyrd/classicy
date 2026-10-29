// Shape checks for Appearance Package CSS, shared by classicyCssLayerPlugin
// (which must leave a package's own `@layer classicy.package { … }` block
// alone) and bin/check-dist-imports.mjs invariant 7 (which proves the shipped
// package CSS is that one block, never nested in `classicy.base`). No imports
// and only erasable TypeScript: check-dist-imports.mjs loads this file
// straight into Node.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** An optional leading `@charset`, then an optional layer order statement. */
const PRELUDE = /^\s*(?:@charset "[^"]*";\s*)?(?:@layer [^{};]+;\s*)?/;

/**
 * The index of the `}` closing the `{` at `open`, or -1. Braces inside CSS
 * strings and comments do not count.
 */
const matchingBrace = (css: string, open: number): number => {
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		const ch = css[i];
		if (ch === '"' || ch === "'") {
			for (i++; i < css.length && css[i] !== ch; i++) if (css[i] === "\\") i++;
		} else if (ch === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			if (end === -1) return -1;
			i = end + 1;
		} else if (ch === "{") depth++;
		else if (ch === "}" && --depth === 0) return i;
	}
	return -1;
};

/**
 * True when `css` is exactly one `@layer <layer> { … }` block, optionally
 * after a `@charset` and a layer order statement, with nothing but
 * whitespace after it. `<layer>` must match exactly: `classicy.packages` and
 * `classicy.package.x` are not `classicy.package`.
 */
export const isSingleClassicyLayerBlock = (
	css: string,
	layer: string,
): boolean => {
	const rest = css.slice((PRELUDE.exec(css)?.[0] ?? "").length);
	const head = new RegExp(`^@layer ${escapeRegExp(layer)}\\s*\\{`).exec(rest);
	if (!head) return false;
	const close = matchingBrace(rest, head[0].length - 1);
	return close !== -1 && rest.slice(close + 1).trim() === "";
};

const PACKAGE_LAYER = "classicy.package";
const PACKAGE_BLOCK = /@layer\s+classicy\.package\s*\{/g;
const PACKAGE_SCOPE = "data-classicy-appearance";
// What may sit between a string's opening quote and its package block: the
// layer order statement, then whitespace or `\n` escapes.
const LITERAL_PREFIX = /^(?:@layer [^{};"'`]+;(?:\s|\\n)*)?$/;
// The tail of a `classicy.base` block's opening, raw or minified.
const OPENS_BASE_BLOCK = /@layer\s+classicy\.base\s*\{(?:\s|\\n)*$/;
const QUOTES = new Set(['"', "'", "`"]);

const isEscaped = (source: string, at: number): boolean => {
	let backslashes = 0;
	for (let i = at - 1; i >= 0 && source[i] === "\\"; i--) backslashes++;
	return backslashes % 2 === 1;
};

/** The JS string literal's text, escapes decoded. */
const decodeLiteral = (body: string): string =>
	body.replace(
		/\\(?:x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|(\r\n|[\s\S]))/g,
		(_m, hex: string, codePoint: string, unit: string, ch: string) => {
			const code = hex ?? codePoint ?? unit;
			if (code !== undefined) return String.fromCodePoint(parseInt(code, 16));
			const simple: Record<string, string> = {
				n: "\n",
				r: "\r",
				t: "\t",
				b: "\b",
				f: "\f",
				v: "\v",
				"0": "\0",
				"\n": "",
				"\r\n": "",
			};
			return simple[ch] ?? ch;
		},
	);

/**
 * Every package block in a bundle must start a JS string (after at most the
 * layer order statement) that holds exactly one `classicy.package` block —
 * the `?inline` stylesheet the package registers. One nested in a
 * `classicy.base` block (the layer plugin wrapped it) sits in
 * `classicy.base.classicy.package`, below every base rule.
 */
const bundleProblems = (file: string, source: string): string[] => {
	const problems: string[] = [];
	for (const match of source.matchAll(PACKAGE_BLOCK)) {
		const at = match.index ?? 0;
		let start = at - 1;
		while (
			start >= 0 &&
			!(QUOTES.has(source[start]) && !isEscaped(source, start))
		)
			start--;
		const prefix = source.slice(start + 1, at);
		if (OPENS_BASE_BLOCK.test(prefix)) {
			problems.push(
				`${file}: a @layer ${PACKAGE_LAYER} block is nested inside classicy.base -> check classicyCssLayerPlugin.`,
			);
			continue;
		}
		if (start < 0 || !LITERAL_PREFIX.test(prefix)) {
			problems.push(
				`${file}: a @layer ${PACKAGE_LAYER} block does not start its stylesheet string -> package CSS must be a stylesheet of its own.`,
			);
			continue;
		}
		const quote = source[start];
		let end = start + 1;
		while (
			end < source.length &&
			!(source[end] === quote && !isEscaped(source, end))
		)
			end++;
		if (
			!isSingleClassicyLayerBlock(
				decodeLiteral(source.slice(start + 1, end)),
				PACKAGE_LAYER,
			)
		)
			problems.push(
				`${file}: a package stylesheet is not exactly one @layer ${PACKAGE_LAYER} block -> rules outside it would land in no package layer.`,
			);
	}
	return problems;
};

export type ClassicyPackageCssInput = {
	/** The CSS order statement, `CLASSICY_LAYER_ORDER`. */
	layerOrder: string;
	/** Every emitted JS file, as source text. */
	bundles: ReadonlyArray<{ file: string; source: string }>;
	/** The library stylesheet: dist/classicy.css and each bundle's injected text. */
	baseStylesheets: ReadonlyArray<{ file: string; css: string }>;
	/** Emitted package stylesheets for strict-CSP hosts (dist/classicy-<id>.css). */
	packageStylesheets: ReadonlyArray<{ file: string; css: string }>;
};

/**
 * Check-dist invariant 7: package CSS ships as `@layer classicy.package`
 * blocks of their own, never nested inside `classicy.base`, and the library
 * stylesheet carries no package look. One message per problem; empty when
 * the invariant holds (including when no package CSS has shipped).
 */
export const findClassicyPackageCssProblems = ({
	layerOrder,
	bundles,
	baseStylesheets,
	packageStylesheets,
}: ClassicyPackageCssInput): string[] => [
	...bundles.flatMap(({ file, source }) => bundleProblems(file, source)),
	...baseStylesheets.flatMap(({ file, css }) =>
		new RegExp(PACKAGE_BLOCK.source).test(css) || css.includes(PACKAGE_SCOPE)
			? [
					`${file}: the library stylesheet carries package look (a @layer ${PACKAGE_LAYER} block or a ${PACKAGE_SCOPE} selector) -> package rules belong in the package's own CSS.`,
				]
			: [],
	),
	...packageStylesheets.flatMap(({ file, css }) =>
		css.startsWith(`${layerOrder}\n`) &&
		isSingleClassicyLayerBlock(css.slice(layerOrder.length), PACKAGE_LAYER)
			? []
			: [
					`${file}: must be "${layerOrder}" then exactly one @layer ${PACKAGE_LAYER} block.`,
				],
	),
];
