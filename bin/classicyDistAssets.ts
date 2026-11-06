// What a library build's dist/assets holds, and what its bundles inline.
// Package assets ship as files under their source name (assetFileNames:
// assets/[name][extname], unhashed), so a dist check pins the exact set:
// every file it expects, and nothing else. A count floor would let a
// legitimate deletion fail the build and an addition hide that many missing
// files. The Platinum package's verify-dist expects its fonts, art, cursors,
// wallpapers and sprites; the core's check-dist-imports.mjs expects none of
// any workspace package's files, as files or inlined (plan 0015-kxa §3.4).
//
// Plain erasable TypeScript: the dist checks import this file through Node's
// type stripping.

/**
 * Compares the file names a dist check expects (`expected`) with what
 * dist/assets holds (`shipped`). `missing` is expected files dist lacks,
 * `extra` is dist files nothing expects; both sorted.
 */
export const compareClassicyAssetNames = (
	expected: ReadonlyArray<string>,
	shipped: ReadonlyArray<string>,
): { missing: string[]; extra: string[] } => {
	const want = new Set(expected);
	const have = new Set(shipped);
	return {
		missing: [...want].filter((name) => !have.has(name)).sort(),
		extra: [...have].filter((name) => !want.has(name)).sort(),
	};
};

/**
 * Each `files` entry a bundle carries inlined as base64, as `{ bundle, path }`.
 * Vite's lib mode inlines a raster or audio file as `data:<type>;base64,`
 * followed by the whole file's base64, so the whole of it is searched for:
 * files of one format share long stretches (a PNG's signature and IHDR, an
 * exporter's XMP packet, an mp3's silent frames), and a slice of one would
 * match another. An SVG is inlined URL-encoded, not as base64, and is not
 * found here (the core's import-graph test keeps the core from reaching a
 * package's source).
 */
export const findClassicyInlinedFiles = (
	bundles: ReadonlyArray<{ file: string; source: string }>,
	files: ReadonlyArray<{ path: string; bytes: Uint8Array }>,
): Array<{ bundle: string; path: string }> => {
	const encoded = files
		.filter(({ bytes }) => bytes.length > 0)
		.map(({ path, bytes }) => ({
			path,
			base64: Buffer.from(bytes).toString("base64"),
		}));
	return bundles.flatMap(({ file, source }) =>
		encoded
			.filter(({ base64 }) => source.includes(base64))
			.map(({ path }) => ({ bundle: file, path })),
	);
};

const ASSET_URL = /new URL\("(assets\/[^"]*)"/g;

/**
 * The bundle's `new URL("assets/…", import.meta.url)` references, each once
 * in order of appearance, and those naming no file in `shipped` (the names
 * in dist/assets).
 */
export const findClassicyStrayAssetUrls = (
	source: string,
	shipped: ReadonlyArray<string>,
): { refs: string[]; stray: string[] } => {
	const refs = [...new Set([...source.matchAll(ASSET_URL)].map((m) => m[1]))];
	const have = new Set(shipped);
	return {
		refs,
		stray: refs.filter((ref) => !have.has(ref.slice("assets/".length))),
	};
};

// What only an Appearance Package's build emits: fonts, sound sprites, a
// package's font stylesheet (classicy-<id>.fonts.css) and its entry shim
// (Platinum's appearance-platinum.js, gone from the core in 3.0).
const PACKAGE_ONLY_ASSET = /\.(?:woff2?|ttf|otf|ogg|m4a|mp3|ac3|wav|caf)$/i;
const PACKAGE_ONLY_DIST_FILE = /^(?:classicy-[^/]+\.fonts\.css|appearance-.+)$/;
const basename = (path: string) => path.split(/[\\/]/).pop() ?? path;
const corePackageFile = (file: string) =>
	`${file}: an Appearance Package's file in the core's dist -> the core bundles no package; it ships in the package's own build.`;

/**
 * verify:dist invariant 5's problems: the core's dist (`distFiles`, its
 * top-level names; `assets`, the names in dist/assets) holds a file only a
 * package's build emits, or one named like a workspace package's file
 * (`packageFiles`), or a bundle inlines one of those files.
 */
export const findClassicyCorePackageFiles = ({
	distFiles,
	assets,
	packageFiles,
	bundles,
}: {
	distFiles: ReadonlyArray<string>;
	assets: ReadonlyArray<string>;
	packageFiles: ReadonlyArray<{ path: string; bytes: Uint8Array }>;
	bundles: ReadonlyArray<{ file: string; source: string }>;
}): string[] => {
	const packageNames = new Set(packageFiles.map(({ path }) => basename(path)));
	return [
		...distFiles
			.filter((file) => PACKAGE_ONLY_DIST_FILE.test(file))
			.map((file) => corePackageFile(`dist/${file}`)),
		...assets
			.filter((file) => PACKAGE_ONLY_ASSET.test(file) || packageNames.has(file))
			.map((file) => corePackageFile(`dist/assets/${file}`)),
		...findClassicyInlinedFiles(bundles, packageFiles).map(
			({ bundle, path }) =>
				`${bundle}: inlines ${path} -> the core bundles no package; check that nothing under src/ imports one.`,
		),
	];
};
