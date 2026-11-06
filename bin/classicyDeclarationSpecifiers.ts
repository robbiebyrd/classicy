// Relative specifiers in a package's emitted type declarations. The packages
// are `"type": "module"`, so a host on `moduleResolution: node16` or
// `nodenext` reads each `.d.ts` as an ES module and resolves a relative
// specifier only with its extension: `export * from "./hooks"` resolves to
// nothing there, and every name behind it is missing (TS2305). The sources
// import without extensions (bundler resolution), so both builds, the core's
// and Platinum's, rewrite each relative specifier in their declarations to
// the `.js` file the module ships as (vite-plugin-dts `beforeWriteFile`), and
// both dist checks fail on any left without one. It also names the packages
// a declaration imports (`findClassicyBareSpecifiers`), each of which a host
// must have installed (bin/check-host-types.ts).
//
// Plain erasable TypeScript: the dist checks import this file through Node's
// type stripping.
import { existsSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

// A relative specifier in an import, an export, a side-effect import or an
// `import("…")` type: the keyword, the quote, the specifier (groups 2-4).
// Group 1 consumes a comment or any other string literal first, so a JSDoc
// example (`import appIcon from './icon.png'`, the core's ClassicyIcons) is
// never read as a specifier, and a `/*` inside a string opens no comment.
const RELATIVE_SPECIFIER =
	/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\3/g;

// A package specifier (`react`, `react/jsx-runtime`, `@scope/pkg`, `node:fs`)
// in the same positions, or in a `/// <reference types="…" />` directive,
// which group 1 leaves alone for group 2 to read; every other comment and
// string literal is consumed by group 1 as above (story 0153-k0e: a JSDoc
// line quoting "pointer" names no package).
const BARE_SPECIFIER =
	/(\/\*[\s\S]*?\*\/|\/\/(?!\/[ \t]*<reference\s)[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|^[ \t]*\/\/\/[ \t]*<reference\s+types\s*=\s*)(["'])([^"'./#][^"']*)\3/gm;

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

/** The package specifiers a declaration's `code` imports, in order. */
export const findClassicyBareSpecifiers = (code: string): string[] =>
	[...code.matchAll(BARE_SPECIFIER)]
		.filter((match) => match[1] === undefined)
		.map((match) => match[4]);

/** The package a specifier names: `@scope/pkg/sub` → `@scope/pkg`, `pkg/sub` → `pkg`. */
export const classicyPackageOfSpecifier = (specifier: string): string =>
	specifier
		.split("/")
		.slice(0, specifier.startsWith("@") ? 2 : 1)
		.join("/");

/**
 * vite-plugin-dts's `beforeWriteFile` for the package at `root`, whose
 * declarations are written under `<root>/<outDir>` from sources under
 * `<root>/<entryRoot>`: each `.d.ts` goes through
 * `withClassicyDeclarationExtensions`, resolved against the sources on disk.
 * The core's dts keeps `src/` in its declaration paths (`entryRoot` "");
 * Platinum's strips it (`entryRoot: "src"`).
 */
export const classicyDeclarationExtensionsWriter =
	({
		root,
		outDir = "dist/types",
		entryRoot = "",
	}: {
		root: string;
		outDir?: string;
		entryRoot?: string;
	}) =>
	(
		filePath: string,
		content: string,
	): { filePath: string; content: string } | undefined => {
		if (!filePath.endsWith(".d.ts")) return undefined;
		const declared = relative(join(root, outDir), filePath)
			.split(sep)
			.join("/");
		return {
			filePath,
			content: withClassicyDeclarationExtensions(
				content,
				posix.join(entryRoot, declared.replace(/\.d\.ts$/, ".ts")),
				(source) => existsSync(join(root, source)),
			),
		};
	};
