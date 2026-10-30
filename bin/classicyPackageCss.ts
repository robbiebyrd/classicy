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

const missingPackageStylesheet = (file: string) =>
	`${file}: carries no non-empty @layer ${PACKAGE_LAYER} stylesheet -> the entry bundle must register Platinum's look (check src/Appearance/Platinum/index.ts and its platinum.scss?inline import).`;
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
): { problems: string[]; stylesheets: string[] } => {
	const problems: string[] = [];
	const stylesheets: string[] = [];
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
		const css = decodeLiteral(source.slice(start + 1, end));
		if (!isSingleClassicyLayerBlock(css, PACKAGE_LAYER, layerOrder))
			problems.push(
				`${file}: a package stylesheet is not exactly one @layer ${PACKAGE_LAYER} block -> rules outside it would land in no package layer.`,
			);
		else if (isScopedPackageStylesheet(css, layerOrder)) stylesheets.push(css);
	}
	return { problems, stylesheets };
};

/**
 * True when the one layer block `css` holds (isSingleClassicyLayerBlock
 * passed) has nothing but trivia between its braces: what an Appearance
 * Package with no component look compiles to.
 */
const isEmptyLayerBlock = (css: string, layerOrder: string): boolean => {
	const open = css.indexOf("{", readPrelude(css, layerOrder).end);
	return skipTrivia(css, open + 1) === matchingBrace(css, open);
};

/**
 * A package's own stylesheet with a look in it: exactly one non-empty
 * `classicy.package` block whose rules are scoped under
 * `[data-classicy-appearance=…]`.
 */
const isScopedPackageStylesheet = (css: string, layerOrder: string): boolean =>
	isSingleClassicyLayerBlock(css, PACKAGE_LAYER, layerOrder) &&
	!isEmptyLayerBlock(css, layerOrder) &&
	css.includes(PACKAGE_SCOPE);

/** `css` from its layer block on: the prelude (charset, order statement) dropped. */
const stylesheetBody = (css: string, layerOrder: string): string =>
	css.slice(readPrelude(css, layerOrder).end).trimEnd();

export type ClassicyPackageCssInput = {
	/** The CSS order statement, `CLASSICY_LAYER_ORDER`. */
	layerOrder: string;
	/** Every emitted JS file, as source text. */
	bundles: ReadonlyArray<{ file: string; source: string }>;
	/** The library stylesheet: dist/classicy.css and each bundle's injected text. */
	baseStylesheets: ReadonlyArray<{ file: string; css: string }>;
	/** Emitted package stylesheets for strict-CSP hosts (dist/classicy-<id>.css). */
	packageStylesheets: ReadonlyArray<{ file: string; css: string }>;
	/**
	 * Bundles that must each carry at least one non-empty package stylesheet
	 * (the entry bundles, which register Platinum). A layer statement
	 * (`@layer classicy.package;`), an empty block, or a block whose rules
	 * are not scoped under `[data-classicy-appearance=…]` does not count.
	 */
	requiredBundles?: ReadonlyArray<string>;
	/**
	 * Package stylesheet files that must be among `packageStylesheets`
	 * (dist/classicy-platinum.css, linked by strict-CSP hosts), each a
	 * non-empty scoped package stylesheet whose block is, byte for byte, the
	 * package string every required bundle injects.
	 */
	requiredPackageStylesheets?: ReadonlyArray<string>;
};

/**
 * Each required package stylesheet file: present, a non-empty scoped package
 * stylesheet, and the same block every required bundle that carries one
 * injects (the file is emitted from that very string).
 */
const packageFileProblems = (
	file: string,
	packageStylesheets: ReadonlyArray<{ file: string; css: string }>,
	injected: ReadonlyArray<{ file: string; stylesheets: string[] }>,
	layerOrder: string,
): string[] => {
	const css = packageStylesheets.find((sheet) => sheet.file === file)?.css;
	if (css === undefined)
		return [
			`${file}: missing -> injectCssPlugin (vite.config.ts) emits it from the package's ?inline stylesheet; strict-CSP hosts link it.`,
		];
	if (!isScopedPackageStylesheet(css, layerOrder))
		return [
			`${file}: carries no non-empty @layer ${PACKAGE_LAYER} stylesheet scoped under [${PACKAGE_SCOPE}=…].`,
		];
	const body = stylesheetBody(css, layerOrder);
	return injected
		.filter(
			({ stylesheets }) =>
				stylesheets.length > 0 &&
				!stylesheets.some(
					(sheet) => stylesheetBody(sheet, layerOrder) === body,
				),
		)
		.map(
			(bundle) =>
				`${file}: differs from the package stylesheet ${bundle.file} injects -> emit it from the same ?inline string.`,
		);
};

/**
 * Check-dist invariant 7: package CSS ships as `@layer classicy.package`
 * blocks of their own, never nested inside `classicy.base`; every required
 * bundle carries a non-empty one; every required package stylesheet file is
 * that same stylesheet; and the library stylesheet carries no package look.
 * One message per problem; empty when the invariant holds.
 */
export const findClassicyPackageCssProblems = ({
	layerOrder,
	bundles,
	baseStylesheets,
	packageStylesheets,
	requiredBundles = [],
	requiredPackageStylesheets = [],
}: ClassicyPackageCssInput): string[] => {
	const checked = bundles.map(({ file, source }) => ({
		file,
		...bundleProblems(file, source, layerOrder),
	}));
	return [
		...checked.flatMap(({ file, problems, stylesheets }) =>
			stylesheets.length === 0 && requiredBundles.includes(file)
				? [...problems, missingPackageStylesheet(file)]
				: problems,
		),
		...requiredBundles
			.filter((file) => !bundles.some((bundle) => bundle.file === file))
			.map(missingPackageStylesheet),
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
		...requiredPackageStylesheets.flatMap((file) =>
			packageFileProblems(
				file,
				packageStylesheets,
				checked.filter((bundle) => requiredBundles.includes(bundle.file)),
				layerOrder,
			),
		),
	];
};

/** The entry bundles: each registers Platinum, so each must ship its look. */
export const CLASSICY_ENTRY_BUNDLES = ["classicy.es.js", "classicy.umd.js"];

/**
 * The bundles invariant 7 requires a package stylesheet in. With named files
 * (check-dist-imports.mjs's arguments), the entry bundles among them, matched
 * by basename; otherwise both entry bundles, as `inDist` places them.
 */
export const requiredClassicyPackageBundles = (
	named: ReadonlyArray<string>,
	inDist: (file: string) => string,
): string[] =>
	named.length
		? named.filter((file) =>
				CLASSICY_ENTRY_BUNDLES.includes(file.split(/[\\/]/).pop() ?? ""),
			)
		: CLASSICY_ENTRY_BUNDLES.map(inDist);

/** The package stylesheet files dist must hold: Platinum's, for strict-CSP hosts (R5). */
export const CLASSICY_PACKAGE_STYLESHEETS = ["classicy-platinum.css"];

/**
 * The package stylesheet files invariant 7 requires: with named files, those
 * of them that are one, matched by basename; otherwise all of them in dist,
 * as `inDist` places them.
 */
export const requiredClassicyPackageStylesheets = (
	named: ReadonlyArray<string>,
	inDist: (file: string) => string,
): string[] =>
	named.length
		? named.filter((file) =>
				CLASSICY_PACKAGE_STYLESHEETS.includes(file.split(/[\\/]/).pop() ?? ""),
			)
		: CLASSICY_PACKAGE_STYLESHEETS.map(inDist);

// An Appearance Package's stylesheet module, as the library build loads it:
// `src/Appearance/<Package>/styles/<name>.scss?inline` (Platinum's index.ts
// imports `./styles/platinum.scss?inline`). Not under node_modules, and not a
// Sass partial (`_name.scss`), which is never a stylesheet of its own.
const PACKAGE_STYLESHEET_MODULE =
	/\/src\/Appearance\/[^/]+\/styles\/([^/_][^/]*)\.scss\?inline$/;
// The name must be lowercase kebab-case: it becomes dist/classicy-<name>.css,
// and check-dist-imports.mjs only recognizes such files (invariant 7).
const PACKAGE_STYLESHEET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// What vite:css-post turns an `?inline` stylesheet into in a build.
const INLINE_CSS_MODULE = /^export default ("(?:[^"\\]|\\.)*");?\s*$/;

/**
 * The package stylesheet files to emit (dist/classicy-<name>.css), one per
 * package stylesheet module among `modules` (each module's id and final
 * transformed code), holding the CSS string that module exports: the same
 * string the bundle injects at runtime. Throws when such a module's name is
 * not lowercase kebab-case, when it is not a plain string export, or when two
 * would write the same file.
 */
export const classicyPackageStylesheets = (
	modules: Iterable<{ id: string; code: string | null }>,
): Array<{ fileName: string; css: string }> => {
	const files = new Map<string, { id: string; css: string }>();
	for (const { id, code } of modules) {
		const path = id.replace(/\\/g, "/");
		const name = PACKAGE_STYLESHEET_MODULE.exec(path)?.[1];
		if (name === undefined || path.includes("/node_modules/")) continue;
		if (!PACKAGE_STYLESHEET_NAME.test(name))
			throw new Error(
				`${id}: a package stylesheet's name must be lowercase kebab-case (it is emitted as dist/classicy-<name>.css); rename ${name}.scss.`,
			);
		const literal = code === null ? undefined : INLINE_CSS_MODULE.exec(code);
		if (!literal)
			throw new Error(
				`${id}: expected \`export default "<css>"\` (vite:css-post's ?inline module), got ${JSON.stringify(code?.slice(0, 80))}.`,
			);
		const fileName = `classicy-${name}.css`;
		const clash = files.get(fileName);
		if (clash)
			throw new Error(
				`${clash.id} and ${id} would both be emitted as ${fileName}.`,
			);
		files.set(fileName, { id, css: JSON.parse(literal[1]) as string });
	}
	return [...files].map(([fileName, { css }]) => ({ fileName, css }));
};
