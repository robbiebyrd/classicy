import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "./ClassicyAppearanceDefaults";
import {
	getClassicyAssetPackageSource,
	onClassicyAssetPackageSourceConnect,
} from "./ClassicyAssetPackageSource.internal";
import {
	type ClassicyAssetSource,
	isClassicyAssetSource,
} from "./ClassicyAssetSource";
import { classicyFontFaceRule } from "./ClassicyFontFaceCss.internal";
import { parseClassicyPixelArtSource } from "./ClassicyPixelArtSource.internal";
import {
	type ClassicyWallpaperRecord,
	connectClassicyWallpaperSource,
	isClassicyWallpaperDigest,
	isPlainClassicyWallpaperFile,
} from "./ClassicyWallpaperSource.internal";

// Every lookup falls back to the default package's tree, where the core's
// own icon tree (ClassicyIcons.ts) registers.
const DEFAULT_PACKAGE = CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;
const SUBSYSTEM = "ClassicyAssetRegistry";
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type ClassicyAssetKind =
	| "icons"
	| "cursors"
	| "wallpapers"
	| "fonts"
	| "systemArt";

export type ClassicyAssetTree = {
	[key: string]: ClassicyAssetSource | ClassicyAssetTree;
};

export type ClassicyCursorRole =
	| "arrow"
	| "watch"
	| "hand"
	| "ibeam"
	| "crosshair"
	| "resizeLr"
	| "resizeUd"
	| "resizeNwse"
	| "resizeNesw"
	| "resizeU"
	| "resizeD"
	| "resizeL"
	| "resizeR";

export type ClassicySystemArtKey =
	| "appleMenu"
	| "sadMac"
	| "startupLogo"
	| "trashEmpty"
	| "trashFull"
	| "aliasBadge"
	| "helpButton"
	| "aboutLogo"
	| "aboutBackground"
	| "windowStripes"
	| "windowStripesRed"
	| "windowUtilityTexture"
	| "windowGrip"
	| "windowDither"
	| "zoomGlyph"
	| "collapseGlyph"
	| "submenuArrow"
	| "popupArrows"
	| "sliderThumb"
	| "sliderThumbRect"
	| "sliderStrikes"
	| "tabOutline"
	| "halftone"
	| "halftoneLarge"
	| "quickTimeThumbSlider"
	| "quickTimeVolumeSlider"
	| "controlStripTab"
	| "controlStripCollapse"
	| "controlStripScrollLeft"
	| "controlStripScrollLeftDisabled"
	| "controlStripScrollRight"
	| "controlStripScrollRightDisabled"
	| "controlStripModuleArrow"
	| "popUpSliderTrack"
	| "popUpSliderThumb"
	| "menuCheck"
	| "menuDash"
	| "triangle"
	| "downArrow";

export type ClassicyFontFace = {
	family: string;
	/** One source, or fallback sources in order (the first is the primary). */
	src: ClassicyAssetSource | ClassicyAssetSource[];
	weight?: string;
	style?: string;
};

type StoredFontFace = {
	family: string;
	sources: ClassicyAssetSource[];
	weight: string;
	style: string;
};

const trees = new Map<ClassicyAssetKind, Map<string, ClassicyAssetTree>>();
/** Every registered face per package, with its full fallback source list. */
const fontFaces = new Map<string, Map<string, StoredFontFace>>();
/** Each package's wallpaper files by wallpaper name (`registerClassicyWallpapers`). */
const wallpaperFiles = new Map<string, Map<string, string>>();
/** Each package's legacy `data:` URI digests by wallpaper name. */
const wallpaperLegacyDigests = new Map<string, Map<string, string[]>>();
let version = 0;
const listeners = new Set<() => void>();

let unsubscribePackageSource: (() => void) | undefined;
let lastActiveId: string | undefined;

/**
 * The active Appearance Package's id: the store's `packageId` resolved
 * against the registered packages (`resolveClassicyAppearancePackage`), read
 * at call time. The default package's id
 * (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`) until the app manager connects
 * its store (during module evaluation of the default state, which resolves
 * its own icons through here).
 */
export const getActiveClassicyAppearancePackageId = (): string =>
	getClassicyAssetPackageSource()?.getId() ?? DEFAULT_PACKAGE;

const onPackageSourceChange = (): void => {
	const id = getActiveClassicyAppearancePackageId();
	if (id === lastActiveId) return;
	lastActiveId = id;
	// The caches key on the active id, so no version bump: consumers only
	// need to re-read their snapshots.
	for (const listener of [...listeners]) listener();
};

/** Subscribe to the source on the first asset listener, never at import. */
const followPackageSource = (): void => {
	const source = getClassicyAssetPackageSource();
	if (!source || unsubscribePackageSource) return;
	lastActiveId = getActiveClassicyAppearancePackageId();
	unsubscribePackageSource = source.subscribe(onPackageSourceChange);
};

// The store connects its source through ClassicyAssetPackageSource.internal
// (never public API), so this module never imports the store (the default
// state imports this module). A (re)connection drops the old subscription and
// re-reads every consumer that is already listening.
onClassicyAssetPackageSourceConnect(() => {
	unsubscribePackageSource?.();
	unsubscribePackageSource = undefined;
	if (listeners.size > 0) {
		followPackageSource();
		for (const listener of [...listeners]) listener();
	}
});

const isTree = (value: unknown): value is ClassicyAssetTree =>
	typeof value === "object" && value !== null;

const copyTree = (tree: ClassicyAssetTree): ClassicyAssetTree => {
	const out: ClassicyAssetTree = {};
	mergeInto(out, tree, "");
	return out;
};

/** Recursive in-place merge; strings replace, trees merge, kind clashes warn. */
const mergeInto = (
	target: ClassicyAssetTree,
	source: ClassicyAssetTree,
	trail: string,
): void => {
	for (const key of Object.keys(source)) {
		const path = trail ? `${trail}.${key}` : key;
		if (FORBIDDEN_KEYS.has(key)) {
			classicyLog("warn", SUBSYSTEM, `Ignored forbidden key "${path}"`);
			continue;
		}
		const incoming = source[key];
		const existing = Object.hasOwn(target, key) ? target[key] : undefined;
		if (isTree(incoming)) {
			if (typeof existing === "string") {
				classicyLog(
					"warn",
					SUBSYSTEM,
					`"${path}" was an asset and is now a namespace; the new value wins`,
				);
			}
			const next = isTree(existing) ? existing : {};
			target[key] = next;
			mergeInto(next, incoming, path);
		} else {
			if (isTree(existing)) {
				classicyLog(
					"warn",
					SUBSYSTEM,
					`"${path}" was a namespace and is now an asset; the new value wins`,
				);
			}
			target[key] = incoming;
		}
	}
};

const notify = (): void => {
	version += 1;
	for (const listener of [...listeners]) listener();
};

/**
 * A copy of `tree` holding only leaves that pass `isClassicyAssetSource`.
 * Leaves land in CSS `url("…")` values, so an invalid one (a quote or
 * backslash that could break out of the URL, a `javascript:` scheme, an empty
 * string) is dropped with a warning naming the kind, package and dotted path;
 * the rest of the tree still registers. A subtree left with no leaves is
 * omitted.
 */
const validLeaves = (
	kind: ClassicyAssetKind,
	packageId: string,
	tree: ClassicyAssetTree,
	trail: string,
): ClassicyAssetTree => {
	const out: ClassicyAssetTree = {};
	for (const key of Object.keys(tree)) {
		const path = trail ? `${trail}.${key}` : key;
		if (FORBIDDEN_KEYS.has(key)) {
			classicyLog("warn", SUBSYSTEM, `Ignored forbidden key "${path}"`);
			continue;
		}
		const value = tree[key];
		if (isTree(value)) {
			const subtree = validLeaves(kind, packageId, value, path);
			// A subtree whose every leaf was dropped registers nothing: merging
			// `{}` would turn an existing valid leaf into an empty namespace.
			const emptied =
				Object.keys(subtree).length === 0 && Object.keys(value).length > 0;
			if (!emptied) out[key] = subtree;
		} else if (isClassicyAssetSource(value)) {
			out[key] = value;
		} else {
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Ignored ${kind} asset "${path}" for package "${packageId}": not a safe asset source`,
			);
		}
	}
	return out;
};

/**
 * Deep-merge `tree` into that package's namespace for `kind`. Leaves that are
 * not a valid `ClassicyAssetSource` are skipped with a warning.
 */
export const registerClassicyAssets = (
	kind: ClassicyAssetKind,
	packageId: string,
	tree: ClassicyAssetTree,
): void => {
	let byPackage = trees.get(kind);
	if (!byPackage) {
		byPackage = new Map();
		trees.set(kind, byPackage);
	}
	let stored = byPackage.get(packageId);
	if (!stored) {
		stored = {};
		byPackage.set(packageId, stored);
	}
	mergeInto(stored, validLeaves(kind, packageId, tree, ""), "");
	notify();
};

/** Test-only: clears every package tree and bumps the version. */
export const resetClassicyAssets = (): void => {
	trees.clear();
	fontFaces.clear();
	wallpaperFiles.clear();
	wallpaperLegacyDigests.clear();
	notify();
};

const walk = (
	tree: ClassicyAssetTree | undefined,
	path: string,
): ClassicyAssetSource | undefined => {
	let node: ClassicyAssetSource | ClassicyAssetTree | undefined = tree;
	for (const segment of path.split(".")) {
		if (!isTree(node) || !Object.hasOwn(node, segment)) return undefined;
		node = node[segment];
	}
	return typeof node === "string" ? node : undefined;
};

/** Dotted-path lookup: the given (or active) package, then the default package. */
export const resolveClassicyAsset = (
	kind: ClassicyAssetKind,
	path: string,
	packageId?: string,
): ClassicyAssetSource | undefined => {
	const byPackage = trees.get(kind);
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	return (
		walk(byPackage?.get(id), path) ??
		walk(byPackage?.get(DEFAULT_PACKAGE), path)
	);
};

export const subscribeClassicyAssets = (listener: () => void): (() => void) => {
	listeners.add(listener);
	followPackageSource();
	return () => {
		listeners.delete(listener);
	};
};

export const useClassicyAsset = (
	kind: ClassicyAssetKind,
	path: string,
): ClassicyAssetSource | undefined => {
	const getSnapshot = () => resolveClassicyAsset(kind, path);
	return useSyncExternalStore(
		subscribeClassicyAssets,
		getSnapshot,
		getSnapshot,
	);
};

const treeCache = new Map<
	string,
	{ version: number; value: ClassicyAssetTree }
>();

const mergedTree = (kind: ClassicyAssetKind): ClassicyAssetTree => {
	const activeId = getActiveClassicyAppearancePackageId();
	const key = `${kind}|${activeId}`;
	const cached = treeCache.get(key);
	if (cached && cached.version === version) return cached.value;
	const byPackage = trees.get(kind);
	const value = copyTree(byPackage?.get(DEFAULT_PACKAGE) ?? {});
	if (activeId !== DEFAULT_PACKAGE) {
		const active = byPackage?.get(activeId);
		if (active) mergeInto(value, active, "");
	}
	treeCache.set(key, { version, value });
	return value;
};

/** Merged COPY (the default package under the active one); stable until a registration. */
export const useClassicyAssetTree = (
	kind: ClassicyAssetKind,
): ClassicyAssetTree => {
	const getSnapshot = () => mergedTree(kind);
	return useSyncExternalStore(
		subscribeClassicyAssets,
		getSnapshot,
		getSnapshot,
	);
};

const kebab = (key: string): string =>
	key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export const classicyAssetVarName = (
	kind: "cursors" | "systemArt",
	key: string,
): string =>
	kind === "cursors"
		? `--classicy-cursor-${kebab(key)}`
		: `--classicy-art-${kebab(key)}`;

let varsCache: { version: number; key: string; value: Record<string, string> } =
	{ version: -1, key: "", value: {} };

const assetVars = (): Record<string, string> => {
	const activeId = getActiveClassicyAppearancePackageId();
	if (varsCache.version === version && varsCache.key === activeId) {
		return varsCache.value;
	}
	const value: Record<string, string> = {};
	for (const kind of ["cursors", "systemArt"] as const) {
		for (const [key, src] of Object.entries(mergedTree(kind))) {
			// Pixel art (the Control Strip and pop-up slider glyphs) is drawn
			// by ClassicyPixelArt, never by CSS, so it gets no variable.
			if (typeof src === "string" && !parseClassicyPixelArtSource(src)) {
				value[classicyAssetVarName(kind, key)] = `url("${src}")`;
			}
		}
	}
	varsCache = { version, key: activeId, value };
	return value;
};

/**
 * `--classicy-cursor-<role>` / `--classicy-art-<key>` as `url("…")` strings.
 * Pixel-art system art (the Control Strip and pop-up slider glyphs) is left
 * out: it is drawn by `ClassicyPixelArt`, not by stylesheets.
 */
export const useClassicyAssetVars = (): Record<string, string> =>
	useSyncExternalStore(subscribeClassicyAssets, assetVars, assetVars);

export const registerClassicyCursors = (
	packageId: string,
	cursors: Partial<Record<ClassicyCursorRole, ClassicyAssetSource>>,
): void =>
	registerClassicyAssets("cursors", packageId, cursors as ClassicyAssetTree);

/**
 * How each system-art key is drawn: `"image"` (a CSS image, published as
 * `--classicy-art-<key>`, or an `<img>`) or `"pixelArt"` (rows drawn by
 * `ClassicyPixelArt`, registered with `encodeClassicyPixelArtRows`). A
 * `Record` over the union, so a new key must be classified; its keys are also
 * the runtime list of known keys.
 */
const SYSTEM_ART_FORMS: Record<ClassicySystemArtKey, "image" | "pixelArt"> = {
	appleMenu: "image",
	sadMac: "image",
	startupLogo: "image",
	trashEmpty: "image",
	trashFull: "image",
	aliasBadge: "image",
	helpButton: "image",
	aboutLogo: "image",
	aboutBackground: "image",
	windowStripes: "image",
	windowStripesRed: "image",
	windowUtilityTexture: "image",
	windowGrip: "image",
	windowDither: "image",
	zoomGlyph: "image",
	collapseGlyph: "image",
	submenuArrow: "image",
	popupArrows: "image",
	sliderThumb: "image",
	sliderThumbRect: "image",
	sliderStrikes: "image",
	tabOutline: "image",
	halftone: "image",
	halftoneLarge: "image",
	quickTimeThumbSlider: "image",
	quickTimeVolumeSlider: "image",
	controlStripTab: "pixelArt",
	controlStripCollapse: "pixelArt",
	controlStripScrollLeft: "pixelArt",
	controlStripScrollLeftDisabled: "pixelArt",
	controlStripScrollRight: "pixelArt",
	controlStripScrollRightDisabled: "pixelArt",
	controlStripModuleArrow: "pixelArt",
	popUpSliderTrack: "pixelArt",
	popUpSliderThumb: "pixelArt",
	menuCheck: "image",
	menuDash: "image",
	triangle: "image",
	downArrow: "image",
};

/**
 * Alias → key. `triangle` and `downArrow` are other names for `submenuArrow`
 * and `popupArrows`: registering either name registers both, so a package
 * that registers only `submenuArrow` also covers `triangle`.
 */
const SYSTEM_ART_ALIASES = [
	["triangle", "submenuArrow"],
	["downArrow", "popupArrows"],
] as const satisfies readonly (readonly [
	ClassicySystemArtKey,
	ClassicySystemArtKey,
])[];

const isSystemArtKey = (key: string): key is ClassicySystemArtKey =>
	Object.hasOwn(SYSTEM_ART_FORMS, key);

/**
 * Register a package's system art. Aliases are written with their key (above;
 * when one call gives both different art, the key's wins, with a warning).
 * A source of the wrong form for its key is registered but logged, since it
 * draws nothing: a plain image for a pixel-art key, or pixel art for an image
 * key. In development, a key outside `ClassicySystemArtKey` (a removed key
 * from a JS host, a typo) is logged too.
 */
export const registerClassicySystemArt = (
	packageId: string,
	art: Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>,
): void => {
	const entries: Record<string, ClassicyAssetSource | undefined> = { ...art };
	for (const [alias, key] of SYSTEM_ART_ALIASES) {
		const src = art[key] ?? art[alias];
		if (src === undefined) continue;
		if (
			art[key] !== undefined &&
			art[alias] !== undefined &&
			art[key] !== art[alias]
		)
			classicyLog(
				"warn",
				SUBSYSTEM,
				`"${alias}" is an alias of "${key}"; package "${packageId}" gave them different art, so "${key}"'s is registered for both`,
			);
		entries[key] = src;
		entries[alias] = src;
	}
	for (const [key, src] of Object.entries(entries)) {
		if (!isSystemArtKey(key)) {
			if (process.env.NODE_ENV !== "production" && !FORBIDDEN_KEYS.has(key))
				classicyLog(
					"warn",
					SUBSYSTEM,
					`Registered unknown system-art key "${key}" for package "${packageId}": no ClassicySystemArtKey has that name, so nothing reads it`,
				);
			continue;
		}
		if (!isClassicyAssetSource(src)) continue;
		const pixelArt = parseClassicyPixelArtSource(src) !== undefined;
		if (SYSTEM_ART_FORMS[key] === "pixelArt" && !pixelArt)
			classicyLog(
				"warn",
				SUBSYSTEM,
				`System art "${key}" for package "${packageId}" is drawn by ClassicyPixelArt and needs pixel-art rows (encodeClassicyPixelArtRows); this source draws nothing`,
			);
		else if (SYSTEM_ART_FORMS[key] === "image" && pixelArt)
			classicyLog(
				"warn",
				SUBSYSTEM,
				`System art "${key}" for package "${packageId}" is pixel art, not an image; it draws nothing there`,
			);
	}
	registerClassicyAssets("systemArt", packageId, entries as ClassicyAssetTree);
};

/**
 * Register a package's wallpapers. The asset tree is keyed by `name` (the
 * Desktop tab's labels). `file` is the portable reference themes hold and
 * persist (`"azul_dark.png"`), resolved back to `src` through the wallpaper
 * index (`resolveClassicyWallpaper`); an entry without one resolves by its
 * name only. `legacyDigests` (`classicyWallpaperDigest`s, for a wallpaper
 * with a file) name the `data:` URIs older builds inlined it as, so a theme
 * saved by one still maps to the filename after the source changes.
 * Re-registering a name replaces its source, and its file and digests when
 * given. A file that is not a plain filename, or a digest of the wrong shape,
 * is ignored with a warning.
 */
export const registerClassicyWallpapers = (
	packageId: string,
	list: Array<{
		name: string;
		src: ClassicyAssetSource;
		file?: string;
		legacyDigests?: readonly string[];
	}>,
): void => {
	let files = wallpaperFiles.get(packageId);
	for (const { name, src, file, legacyDigests } of list) {
		if (file === undefined || !isClassicyAssetSource(src)) continue;
		// The theme schema accepts a registered filename as a safe
		// `backgroundImage`, so a file is never a path, URL or quote.
		if (!isPlainClassicyWallpaperFile(file) || FORBIDDEN_KEYS.has(name)) {
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Ignored wallpaper file "${file}" of "${name}" for package "${packageId}": not a plain filename`,
			);
			continue;
		}
		if (!files) {
			files = new Map();
			wallpaperFiles.set(packageId, files);
		}
		files.set(name, file);
		if (legacyDigests === undefined) continue;
		const digests = legacyDigests.filter((digest) => {
			if (isClassicyWallpaperDigest(digest)) return true;
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Ignored legacy digest "${String(digest)}" of wallpaper "${name}" for package "${packageId}": not a wallpaper digest (<length>:<16 hex digits>)`,
			);
			return false;
		});
		let byName = wallpaperLegacyDigests.get(packageId);
		if (!byName) {
			byName = new Map();
			wallpaperLegacyDigests.set(packageId, byName);
		}
		byName.set(name, digests);
	}
	registerClassicyAssets(
		"wallpapers",
		packageId,
		Object.fromEntries(list.map((w) => [w.name, w.src])),
	);
};

// The wallpaper index (ClassicyWallpaperIndex.ts) reads each package's
// wallpapers, with their files, through this link; rebuilt lazily whenever
// `version` moves.
connectClassicyWallpaperSource({
	version: () => version,
	packageIds: () => [...(trees.get("wallpapers")?.keys() ?? [])],
	entries: (packageId) => {
		const tree = trees.get("wallpapers")?.get(packageId) ?? {};
		const files = wallpaperFiles.get(packageId);
		const legacy = wallpaperLegacyDigests.get(packageId);
		const out: ClassicyWallpaperRecord[] = [];
		for (const [name, src] of Object.entries(tree)) {
			if (typeof src !== "string") continue;
			const file = files?.get(name);
			if (file === undefined) {
				out.push({ name, src });
				continue;
			}
			const legacyDigests = legacy?.get(name);
			out.push(
				legacyDigests?.length
					? { name, src, file, legacyDigests: [...legacyDigests] }
					: { name, src, file },
			);
		}
		return out;
	},
});

// biome-ignore lint/suspicious/noControlCharactersInRegex: refusing control characters is the point
const SAFE_FONT_NAME = /^[^"'\\;{}\u0000-\u001f\u007f]+$/;
const SAFE_FONT_DESCRIPTOR = /^[A-Za-z0-9 .%-]+$/;

/** Rewrites `<style id="classicy-fonts-<packageId>">` from that package's faces. */
const writeClassicyFontFaces = (packageId: string): void => {
	if (typeof document === "undefined") return;
	const id = `classicy-fonts-${packageId}`;
	let style = document.getElementById(id);
	if (!style) {
		style = document.createElement("style");
		style.id = id;
		// After the library stylesheet; on a dev server, which has none, after
		// the layer order statement, which must stay the head's first sheet.
		const base =
			document.getElementById("classicy-styles") ??
			document.getElementById("classicy-layer-order");
		if (base) base.after(style);
		else document.head.prepend(style);
	}
	style.textContent = [...(fontFaces.get(packageId)?.values() ?? [])]
		.map(classicyFontFaceRule)
		.join("\n");
};

/**
 * Registers font faces under `fonts.<family>.<weight>-<style>` and writes their
 * `@font-face` rules into `<style id="classicy-fonts-<packageId>">`. A face
 * with an unsafe family, descriptor or source is skipped with a warning.
 */
export const registerClassicyFonts = (
	packageId: string,
	fonts: ClassicyFontFace[],
): void => {
	let faces = fontFaces.get(packageId);
	if (!faces) {
		faces = new Map();
		fontFaces.set(packageId, faces);
	}
	const tree: ClassicyAssetTree = {};
	for (const font of fonts) {
		const weight = font.weight ?? "normal";
		const style = font.style ?? "normal";
		const sources = Array.isArray(font.src) ? font.src : [font.src];
		if (
			!SAFE_FONT_NAME.test(font.family) ||
			!SAFE_FONT_DESCRIPTOR.test(weight) ||
			!SAFE_FONT_DESCRIPTOR.test(style) ||
			sources.length === 0 ||
			!sources.every(isClassicyAssetSource)
		) {
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Ignored font face "${font.family}" ${weight} ${style}: unsafe family, descriptor or source`,
			);
			continue;
		}
		const key = `${weight}-${style}`;
		const family = Object.hasOwn(tree, font.family)
			? (tree[font.family] as ClassicyAssetTree)
			: {};
		family[key] = sources[0];
		tree[font.family] = family;
		faces.set(`${font.family}|${key}`, {
			family: font.family,
			sources,
			weight,
			style,
		});
	}
	registerClassicyAssets("fonts", packageId, tree);
	writeClassicyFontFaces(packageId);
};
