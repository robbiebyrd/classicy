// Relative specifiers in a package's emitted type declarations. The packages
// are `"type": "module"`, so a host on `moduleResolution: node16` or
// `nodenext` reads each `.d.ts` as an ES module and resolves a relative
// specifier only with its extension: `export * from "./hooks"` resolves to
// nothing there, and every name behind it is missing (TS2305). The sources
// import without extensions (bundler resolution), so both builds, the core's
// and Platinum's, rewrite each relative specifier in their declarations to
// the `.js` file the module ships as (vite-plugin-dts `beforeWriteFile`), and
// both dist checks fail on any left without one.
//
// Plain erasable TypeScript: the dist checks import this file through Node's
// type stripping.

// A relative specifier in an import, an export, a side-effect import or an
// `import("…")` type: the keyword, the quote, the specifier (groups 2-4).
// Group 1 consumes a comment or any other string literal first, so a JSDoc
// example (`import appIcon from './icon.png'`, the core's ClassicyIcons) is
// never read as a specifier, and a `/*` inside a string opens no comment.
const RELATIVE_SPECIFIER =
	/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\3/g;

// What counts as already carrying an extension: a file a host can load.
const HAS_EXTENSION = /\.(?:[cm]?js|json|css)$/;

const posixJoin = (from: string, specifier: string): string => {
	const parts = from.split("/").slice(0, -1);
	for (const part of specifier.split("/")) {
		if (part === "..") parts.pop();
		else if (part !== ".") parts.push(part);
	}
	return parts.join("/");
};

/**
 * `code`, a declaration emitted for the source module `fromSource` (a path
 * with forward slashes, e.g. `src/index.ts`), with each extensionless
 * relative specifier given the `.js` its module ships as: `./hooks` →
 * `./hooks.js` when `isSource("src/hooks.ts")` (or `.tsx`), else
 * `./assets/art` → `./assets/art/index.js` for a folder's `index.ts(x)`.
 * A dotted module name keeps its dots (`./Window.view` → `./Window.view.js`).
 * Throws on a specifier that names no source module.
 */
export const withClassicyDeclarationExtensions = (
	code: string,
	fromSource: string,
	isSource: (path: string) => boolean,
): string =>
	code.replace(RELATIVE_SPECIFIER, (match, skip, keyword, quote, specifier) => {
		if (skip || HAS_EXTENSION.test(specifier)) return match;
		const target = posixJoin(fromSource, specifier);
		const resolved = [".ts", ".tsx"].some((ext) => isSource(`${target}${ext}`))
			? `${specifier}.js`
			: ["/index.ts", "/index.tsx"].some((ext) => isSource(`${target}${ext}`))
				? `${specifier}/index.js`
				: null;
		if (resolved === null)
			throw new Error(
				`${fromSource}: "${specifier}" names no module under ${fromSource.split("/")[0]}/ -> its declaration would not resolve.`,
			);
		return `${keyword}${quote}${resolved}${quote}`;
	});

/** The relative specifiers in a declaration's `code` that carry no extension. */
export const findClassicyExtensionlessSpecifiers = (code: string): string[] =>
	[...code.matchAll(RELATIVE_SPECIFIER)]
		.filter((match) => match[1] === undefined)
		.map((match) => match[4])
		.filter((specifier) => !HAS_EXTENSION.test(specifier));
