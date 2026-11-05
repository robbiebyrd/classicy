import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { getActiveClassicyAppearancePackageId } from "./ClassicyAssetRegistry";
import {
	type ClassicyWallpaperRecord,
	getClassicyWallpaperSource,
} from "./ClassicyWallpaperSource.internal";

/**
 * Wallpapers by filename, through the asset registry.
 *
 * A theme's `desktop.backgroundImage` holds a registered wallpaper as its
 * filename (`"azul_dark.png"`, the `file` given to `registerClassicyWallpapers`),
 * never as the URL a build resolved it to: that URL (a dev-server path, a
 * hashed asset, an inlined `data:` URI) only works in that build. Readers
 * resolve the filename at render (`getThemeVars`); writers store
 * `classicyWallpaperFilename(value) ?? value`.
 *
 * Store-free, like the registry it reads, so reducers and the theme schema may
 * import it. The index is rebuilt lazily, on the first lookup after any asset
 * registration.
 */

const PLATINUM = "platinum";

/** Values that are already loadable: `data:`/`blob:` URIs, remote URLs (any
 * case, as the theme schema accepts them). */
const LOADABLE = /^(data:|blob:|https?:\/\/|\/\/)/i;

/**
 * A base64 `data:` URI, every character of it inert inside a quoted CSS
 * `url("…")`. Only such a URI is matched by digest: a digest is no proof of
 * content, so a value holding a quote or parenthesis never maps to a filename.
 */
const PLAIN_BASE64_DATA_URI =
	/^data:[\w.+/-]+(;[\w.+=-]+)*;base64,[A-Za-z0-9+/]*={0,2}$/i;

/** A bundler's content hash before the extension: `name-<hash>.ext`. */
const HASHED_BASENAME = /^(.+)-[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9]+)$/;

type PackageIndex = {
	entries: ClassicyWallpaperRecord[];
	byFile: Map<string, string>;
	fileBySrc: Map<string, string>;
	fileByDigest: Map<string, string>;
	sources: Set<string>;
	byName: Map<string, string>;
};

let cache: { version: number; packages: Map<string, PackageIndex> } | undefined;
const warned = new Set<string>();
/** Digests already computed, by value (themes are re-persisted often). */
const digests = new Map<string, string | undefined>();
const MAX_CACHED_DIGESTS = 64;

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

/**
 * The content key of a `data:` URI: `<payload length>:<FNV-1a 64 of the
 * payload, 16 hex digits>`, the payload being everything after the first
 * comma (so the media type a build wrote does not matter). `undefined` for
 * anything but a `data:` URI. Cheap and synchronous, not cryptographic: a
 * package's `legacyDigests` name the `data:` URIs older builds inlined its
 * wallpapers as, so a theme saved by one maps to the filename after the
 * wallpaper's source changes (for Platinum, once its wallpapers are files).
 */
export const classicyWallpaperDigest = (value: string): string | undefined => {
	if (!/^data:/i.test(value)) return undefined;
	const comma = value.indexOf(",");
	if (comma < 0) return undefined;
	let hash = FNV_OFFSET;
	for (let i = comma + 1; i < value.length; i++) {
		hash ^= BigInt(value.charCodeAt(i));
		hash = BigInt.asUintN(64, hash * FNV_PRIME);
	}
	return `${value.length - comma - 1}:${hash.toString(16).padStart(16, "0")}`;
};

const cachedDigest = (value: string): string | undefined => {
	if (digests.has(value)) return digests.get(value);
	const digest = classicyWallpaperDigest(value);
	if (digests.size >= MAX_CACHED_DIGESTS) digests.clear();
	digests.set(value, digest);
	return digest;
};

/** The last path segment, then, for a bundler-hashed one, it unhashed. */
const basenames = (value: string): string[] => {
	const basename = value.split("/").pop() ?? "";
	const unhashed = basename.replace(HASHED_BASENAME, "$1$2");
	return unhashed === basename ? [basename] : [basename, unhashed];
};

const buildPackageIndex = (
	entries: ClassicyWallpaperRecord[],
): PackageIndex => {
	const index: PackageIndex = {
		entries,
		byFile: new Map(),
		fileBySrc: new Map(),
		fileByDigest: new Map(),
		sources: new Set(),
		byName: new Map(),
	};
	for (const { name, src, file, legacyDigests } of entries) {
		index.sources.add(src);
		index.byName.set(name, src);
		if (file === undefined) continue;
		if (!index.byFile.has(file)) index.byFile.set(file, src);
		if (!index.fileBySrc.has(src)) index.fileBySrc.set(src, file);
		for (const digest of legacyDigests ?? []) {
			if (!index.fileByDigest.has(digest)) index.fileByDigest.set(digest, file);
		}
	}
	return index;
};

/** Every package's index, rebuilt when the registry has changed since. */
const packages = (): Map<string, PackageIndex> => {
	const source = getClassicyWallpaperSource();
	if (!source) return new Map();
	const version = source.version();
	if (cache?.version === version) return cache.packages;
	const built = new Map<string, PackageIndex>();
	for (const id of source.packageIds()) {
		built.set(id, buildPackageIndex(source.entries(id)));
	}
	cache = { version, packages: built };
	// A registration may have made a warned value known; warn afresh.
	warned.clear();
	return built;
};

/** The given package, the active one, then Platinum. */
const lookupChain = (packageId?: string): PackageIndex[] => {
	const all = packages();
	const active = getActiveClassicyAppearancePackageId();
	return [...new Set([packageId ?? active, active, PLATINUM])]
		.map((key) => all.get(key))
		.filter((index): index is PackageIndex => index !== undefined);
};

/**
 * Turn a theme's `desktop.backgroundImage` into a URL the browser can load.
 *
 * - `""` stays `""` (a color-only theme).
 * - `data:`, `blob:`, http(s) and protocol-relative URLs pass through, so a
 *   background the user set (or an older build's inlined wallpaper) survives.
 * - A registered source passes through, which makes this idempotent.
 * - A registered filename, or a path whose basename is one (an older build's
 *   `/assets/img/wallpapers/…`), resolves to its source; so does the name of
 *   a wallpaper registered without a file.
 * - Anything else is `""`, with one warning per value: an unloadable path
 *   would only request a 404.
 *
 * Looks in `packageId` (a theme's own package), then the active package,
 * then Platinum, as `resolveClassicyAsset` does.
 */
export const resolveClassicyWallpaper = (
	value: string,
	packageId?: string,
): string => {
	if (!value) return "";
	if (LOADABLE.test(value)) return value;
	const names = basenames(value);
	for (const index of lookupChain(packageId)) {
		if (index.sources.has(value)) return value;
		let resolved = index.byFile.get(value);
		for (const name of names) resolved ??= index.byFile.get(name);
		resolved ??= index.byName.get(value);
		if (resolved !== undefined) return resolved;
	}
	if (!warned.has(value)) {
		warned.add(value);
		classicyLog(
			"warn",
			"ClassicyWallpapers",
			"Unknown wallpaper; falling back to no background image.",
			{ value },
		);
	}
	return "";
};

/**
 * The registered filename for a `backgroundImage` value — a registered
 * filename itself, the exact source (URL or `data:` URI) a package
 * registered for it, or a base64 `data:` URI whose `classicyWallpaperDigest`
 * is one of its `legacyDigests` (what an older build inlined) — or
 * `undefined` (an http(s) URL a user chose, an unknown value, a wallpaper
 * registered without a file). Never by basename. Searches the active
 * package, Platinum, then every other package. The inverse of
 * `resolveClassicyWallpaper`, used to store and persist a portable reference.
 */
export const classicyWallpaperFilename = (
	value: string,
): string | undefined => {
	if (!value) return undefined;
	const all = packages();
	const order = [
		...new Set([
			getActiveClassicyAppearancePackageId(),
			PLATINUM,
			...all.keys(),
		]),
	];
	for (const id of order) {
		const index = all.get(id);
		if (!index) continue;
		if (index.byFile.has(value)) return value;
		const file = index.fileBySrc.get(value);
		if (file !== undefined) return file;
	}
	if (!PLAIN_BASE64_DATA_URI.test(value)) return undefined;
	const digest = cachedDigest(value);
	if (digest === undefined) return undefined;
	for (const id of order) {
		const file = all.get(id)?.fileByDigest.get(digest);
		if (file !== undefined) return file;
	}
	return undefined;
};

/**
 * The form a theme stores a `backgroundImage` in: a registered wallpaper's
 * filename for the filename itself, the source a package registered for it,
 * a `data:` URI an older build inlined it as (`classicyWallpaperFilename`),
 * or a path whose basename is one, bundler hash stripped (an older build's
 * `/assets/img/wallpapers/azul_dark.png` or `/assets/azul_dark-0a1b2c3d.png`);
 * any other value as it is (`""`, a URL the user chose, a `data:` URI or
 * path no registered wallpaper matches). Idempotent.
 */
export const portableClassicyWallpaper = (value: string): string => {
	if (typeof value !== "string" || !value) return value;
	const file = classicyWallpaperFilename(value);
	if (file !== undefined) return file;
	if (LOADABLE.test(value) || !value.includes("/")) return value;
	for (const name of basenames(value)) {
		const found = classicyWallpaperFilename(name);
		if (found !== undefined) return found;
	}
	return value;
};

/**
 * `theme` with its `desktop.backgroundImage` in the stored form
 * (`portableClassicyWallpaper`); the same object back when that changes
 * nothing. Shape-detecting: anything without a string background is
 * returned as it is.
 */
export const withPortableClassicyWallpaper = <
	T extends { desktop?: { backgroundImage?: unknown } },
>(
	theme: T,
): T => {
	const value = theme?.desktop?.backgroundImage;
	if (typeof value !== "string") return theme;
	const portable = portableClassicyWallpaper(value);
	if (portable === value) return theme;
	return { ...theme, desktop: { ...theme.desktop, backgroundImage: portable } };
};

/**
 * The wallpapers the Desktop tab offers for `packageId` (default: the active
 * package): Platinum's, with the package's own merged over them by name, in
 * the order `useClassicyAssetTree("wallpapers")` holds them.
 */
export const listClassicyWallpapers = (
	packageId?: string,
): Array<{ file?: string; name: string; src: string }> => {
	const all = packages();
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	const merged = new Map<string, ClassicyWallpaperRecord>();
	for (const entry of all.get(PLATINUM)?.entries ?? []) {
		merged.set(entry.name, entry);
	}
	if (id !== PLATINUM) {
		for (const entry of all.get(id)?.entries ?? []) {
			merged.set(entry.name, entry);
		}
	}
	return [...merged.values()].map((entry) => ({ ...entry }));
};

const pickDefault = (
	entries: ClassicyWallpaperRecord[] | undefined,
): string | undefined =>
	(entries?.find((entry) => entry.file === "default.png") ?? entries?.[0])?.src;

/**
 * The default wallpaper's source for `packageId` (default: the active
 * package): its `default.png`, else its first wallpaper; a package with none
 * gets Platinum's; `""` when nothing is registered.
 */
export const defaultClassicyWallpaper = (packageId?: string): string => {
	const all = packages();
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	return (
		pickDefault(all.get(id)?.entries) ??
		pickDefault(all.get(PLATINUM)?.entries) ??
		""
	);
};
