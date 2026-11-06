// Library-internal: the link from the asset registry to the wallpaper index
// (ClassicyWallpaperIndex.ts), and the shape of a wallpaper filename. Not
// public API — `.internal.ts` modules are excluded from the barrels
// (.ts-barrel.json), so only the asset registry (which connects it), the
// wallpaper index (which reads it) and the theme schema import this file, by
// path. A leaf: no runtime imports, so any side may evaluate first.

/**
 * A wallpaper `file`: a bare filename, never a path, URL or anything that
 * could leave a quoted CSS `url("…")`, and never holding the package
 * separator (`|`), so a filename is never a package-qualified reference.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: refusing control characters is the point
const PLAIN_WALLPAPER_FILE = /^[^\s/\\:"'`()<>{};|\u0000-\u001f\u007f]+$/;

/** True for a plain wallpaper filename (`"azul_dark.png"`), registered or not. */
export const isPlainClassicyWallpaperFile = (value: string): boolean =>
	value.length <= 255 && PLAIN_WALLPAPER_FILE.test(value);

/**
 * What separates the package from the file in a package-qualified wallpaper
 * reference, `"<package>|<file>"`. Neither half may hold a `:` or `/`
 * (`isPlainClassicyWallpaperFile`), so a reference never starts like a URL
 * (`<scheme>:`, `//`, `/`) or a `data:` URI, and it is not a path.
 */
export const CLASSICY_WALLPAPER_PACKAGE_SEPARATOR = "|";

/**
 * The package and file of a package-qualified wallpaper reference
 * (`"platinum|default.png"`), registered or not; `undefined` for anything
 * else (a bare filename, a URL, a path).
 */
export const parseClassicyWallpaperReference = (
	value: string,
): { packageId: string; file: string } | undefined => {
	if (typeof value !== "string") return undefined;
	const at = value.indexOf(CLASSICY_WALLPAPER_PACKAGE_SEPARATOR);
	if (at < 0) return undefined;
	const packageId = value.slice(0, at);
	const file = value.slice(at + 1);
	return isPlainClassicyWallpaperFile(packageId) &&
		isPlainClassicyWallpaperFile(file)
		? { packageId, file }
		: undefined;
};

/** One registered wallpaper: its display name, source and, if given, filename. */
export type ClassicyWallpaperRecord = {
	name: string;
	src: string;
	file?: string;
	/** `classicyWallpaperDigest`s of `data:` URIs older builds inlined it as. */
	legacyDigests?: string[];
};

/** The shape of a `classicyWallpaperDigest`: payload length, FNV-1a 64 hex. */
const WALLPAPER_DIGEST = /^\d{1,9}:[0-9a-f]{16}$/;

/** True for a string shaped like a `classicyWallpaperDigest`. */
export const isClassicyWallpaperDigest = (value: unknown): value is string =>
	typeof value === "string" && WALLPAPER_DIGEST.test(value);

/** What the wallpaper index reads from the asset registry. */
export type ClassicyWallpaperSource = {
	/** Changes whenever any asset registration (or a reset) may have changed them. */
	version: () => number;
	/** Every package that registered wallpapers, in registration order. */
	packageIds: () => string[];
	/** A package's wallpapers, in the order its asset tree holds them. */
	entries: (packageId: string) => ClassicyWallpaperRecord[];
};

let source: ClassicyWallpaperSource | undefined;

/** Connects the wallpaper index to the asset registry; the registry calls it once. */
export const connectClassicyWallpaperSource = (
	next: ClassicyWallpaperSource,
): void => {
	source = next;
};

/** The connected source, or `undefined` before the registry evaluates. */
export const getClassicyWallpaperSource = ():
	| ClassicyWallpaperSource
	| undefined => source;
