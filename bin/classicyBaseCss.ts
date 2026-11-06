// Shape checks for the library stylesheet (dist/classicy.css and the text the
// entry bundles inject), run by bin/check-dist-imports.mjs invariants 10 and
// 11. Every component rule must sit in a `@layer classicy.base` block: an
// unlayered rule beats every layer, the package's and the host's
// `classicy.user` included, so one stray rule between the blocks would
// outrank every Appearance Package. No imports and only erasable TypeScript:
// check-dist-imports.mjs loads this file straight into Node.

const BASE_BLOCK = /@layer\s+classicy\.base\s*\{/y;
const CHARSET = /@charset\s*"[^"]*"\s*;/y;

/** The index just past the comment opening at `i` (or the end). */
const commentEnd = (css: string, i: number): number => {
	const end = css.indexOf("*/", i + 2);
	return end === -1 ? css.length : end + 2;
};

/**
 * The index just past the top-level item starting at `i`: a statement
 * (through its `;`) or a block (through the `}` matching its first `{`).
 * Strings, comments and escapes never end it.
 */
const itemEnd = (css: string, i: number): number => {
	let depth = 0;
	for (let j = i; j < css.length; j++) {
		const ch = css[j];
		if (ch === "\\") j++;
		else if (ch === "/" && css[j + 1] === "*") j = commentEnd(css, j) - 1;
		else if (ch === '"' || ch === "'") {
			for (j++; j < css.length && css[j] !== ch; j++) if (css[j] === "\\") j++;
		} else if (ch === "{") depth++;
		else if (ch === "}") {
			if (--depth <= 0) return j + 1;
		} else if (ch === ";" && depth === 0) return j + 1;
	}
	return css.length;
};

const snippet = (text: string): string => {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length > 60 ? `${flat.slice(0, 57)}...` : flat;
};

/**
 * Problems with the library stylesheet `css` (named `file` in the messages):
 * one per top-level item that is not a `@layer classicy.base { … }` block,
 * the layer order statement `layerOrder` or a `@charset`. Whitespace, a BOM
 * and comments between them are fine.
 */
export const findClassicyUnlayeredCss = (
	file: string,
	css: string,
	layerOrder: string,
): string[] => {
	const problems: string[] = [];
	let i = 0;
	while (i < css.length) {
		const ch = css[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (css.startsWith("/*", i)) {
			i = commentEnd(css, i);
			continue;
		}
		const end = itemEnd(css, i);
		BASE_BLOCK.lastIndex = i;
		CHARSET.lastIndex = i;
		const allowed =
			BASE_BLOCK.test(css) ||
			(CHARSET.test(css) && CHARSET.lastIndex === end) ||
			css.slice(i, end) === layerOrder;
		if (!allowed)
			problems.push(
				`${file}: unlayered CSS outside the @layer classicy.base blocks: "${snippet(css.slice(i, end))}" -> every component stylesheet must be an .scss file under src/, which classicyCssLayerPlugin compiles into @layer classicy.base.`,
			);
		i = end;
	}
	return problems;
};

/** True when `text` holds nothing but whitespace (a BOM is one to `\s`) and comments. */
const isTrivia = (text: string): boolean =>
	text.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, "").replace(/\s/g, "") === "";

/**
 * Problems with the plain .css files under src: one per file that holds any
 * CSS. The layer plugin only wraps .scss, so a .css file's rules would ship
 * unlayered and beat every Classicy layer.
 */
export const findClassicyPlainCssFiles = (
	files: { path: string; text: string }[],
): string[] =>
	files
		.filter(({ text }) => !isTrivia(text))
		.map(
			({ path }) =>
				`${path}: a plain .css file with rules -> its CSS would sit outside every Classicy layer; write it as .scss (classicyCssLayerPlugin wraps only .scss in @layer classicy.base).`,
		);
