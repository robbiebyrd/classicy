// Shape checks for Appearance Package CSS, shared by classicyCssLayerPlugin
// (which must leave a package's own `@layer classicy.package { … }` block
// alone) and bin/check-dist-imports.mjs invariant 7 (which proves the shipped
// package CSS is that one block, never nested in `classicy.base`). No imports
// and only erasable TypeScript: check-dist-imports.mjs loads this file
// straight into Node.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The index after the whitespace (a BOM included) and complete top-level
 * `/* … *\/` comments starting at `from`. Sass keeps loud comments in
 * expanded output, and they are not rules.
 */
const skipTrivia = (css: string, from: number): number => {
	let i = from;
	for (;;) {
		while (i < css.length && /\s/.test(css[i])) i++;
		if (!css.startsWith("/*", i)) return i;
		const end = css.indexOf("*/", i + 2);
		if (end === -1) return i;
		i = end + 2;
	}
};

const CHARSET = /@charset "[^"]*";/y;

/**
 * Where the prelude a layered stylesheet may open with ends: trivia, an
 * optional `@charset`, then at most one `layerOrder` statement (exactly that
 * text, no other `@layer …;`), each followed by trivia. `hasOrder` says
 * whether the order statement was there.
 */
const readPrelude = (
	css: string,
	layerOrder: string,
): { end: number; hasOrder: boolean } => {
	let i = skipTrivia(css, 0);
	CHARSET.lastIndex = i;
	if (CHARSET.test(css)) i = skipTrivia(css, CHARSET.lastIndex);
	const hasOrder = css.startsWith(layerOrder, i);
	if (hasOrder) i = skipTrivia(css, i + layerOrder.length);
	return { end: i, hasOrder };
};

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
 * True when `css` is exactly one `@layer <layer> { … }` block. Before it may
 * come a `@charset` and at most one `layerOrder` statement (that exact text:
 * any other `@layer …;` is a rule outside the block); around them, and after
 * the block, only whitespace, a BOM and `/* … *\/` comments. `<layer>` must
 * match exactly: `classicy.packages` and `classicy.package.x` are not
 * `classicy.package`.
 */
export const isSingleClassicyLayerBlock = (
	css: string,
	layer: string,
	layerOrder: string,
): boolean => {
	const head = new RegExp(`@layer ${escapeRegExp(layer)}\\s*\\{`, "y");
	head.lastIndex = readPrelude(css, layerOrder).end;
	if (!head.test(css)) return false;
	const close = matchingBrace(css, head.lastIndex - 1);
	return close !== -1 && skipTrivia(css, close + 1) === css.length;
};

const PACKAGE_LAYER = "classicy.package";
const PACKAGE_BLOCK = /@layer\s+classicy\.package\s*\{/g;
const PACKAGE_SCOPE = "data-classicy-appearance";
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
const bundleProblems = (
	file: string,
	source: string,
	layerOrder: string,
): string[] => {
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
		const decodedPrefix = decodeLiteral(prefix);
		if (OPENS_BASE_BLOCK.test(prefix)) {
			problems.push(
				`${file}: a @layer ${PACKAGE_LAYER} block is nested inside classicy.base -> check classicyCssLayerPlugin.`,
			);
			continue;
		}
		// Only what may open a package stylesheet (the same prelude rule as
		// isSingleClassicyLayerBlock) may precede the block in its string.
		if (
			start < 0 ||
			readPrelude(decodedPrefix, layerOrder).end !== decodedPrefix.length
		) {
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
				layerOrder,
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
	...bundles.flatMap(({ file, source }) =>
		bundleProblems(file, source, layerOrder),
	),
	...baseStylesheets.flatMap(({ file, css }) =>
		new RegExp(PACKAGE_BLOCK.source).test(css) || css.includes(PACKAGE_SCOPE)
			? [
					`${file}: the library stylesheet carries package look (a @layer ${PACKAGE_LAYER} block or a ${PACKAGE_SCOPE} selector) -> package rules belong in the package's own CSS.`,
				]
			: [],
	),
	...packageStylesheets.flatMap(({ file, css }) =>
		readPrelude(css, layerOrder).hasOrder &&
		isSingleClassicyLayerBlock(css, PACKAGE_LAYER, layerOrder)
			? []
			: [
					`${file}: must be "${layerOrder}" then exactly one @layer ${PACKAGE_LAYER} block.`,
				],
	),
];
