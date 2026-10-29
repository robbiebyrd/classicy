import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	getClassicyAssetPackageSource,
	onClassicyAssetPackageSourceConnect,
} from "./ClassicyAssetPackageSource.internal";
import {
	type ClassicyAssetSource,
	isClassicyAssetSource,
} from "./ClassicyAssetSource";

const PLATINUM = "platinum";
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
	| "windowUtilityShade"
	| "windowUtilityHighlight"
	| "titleBarCapLeft"
	| "titleBarCapRight"
	| "titleBarCapLeftRed"
	| "titleBarCapRightRed"
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
let version = 0;
const listeners = new Set<() => void>();

let unsubscribePackageSource: (() => void) | undefined;
let lastActiveId: string | undefined;

/**
 * The active Appearance Package's id: the store's `packageId` resolved
 * against the registered packages (an unregistered id is Platinum), read at
 * call time. Platinum until the app manager connects its store (during module
 * evaluation of the default state, which resolves its own icons through here).
 */
export const getActiveClassicyAppearancePackageId = (): string =>
	getClassicyAssetPackageSource()?.getId() ?? PLATINUM;

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

/** Dotted-path lookup: the given (or active) package, then platinum. */
export const resolveClassicyAsset = (
	kind: ClassicyAssetKind,
	path: string,
	packageId?: string,
): ClassicyAssetSource | undefined => {
	const byPackage = trees.get(kind);
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	return walk(byPackage?.get(id), path) ?? walk(byPackage?.get(PLATINUM), path);
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
	const value = copyTree(byPackage?.get(PLATINUM) ?? {});
	if (activeId !== PLATINUM) {
		const active = byPackage?.get(activeId);
		if (active) mergeInto(value, active, "");
	}
	treeCache.set(key, { version, value });
	return value;
};

/** Merged COPY (platinum under the active package); stable until a registration. */
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

/**
 * System art that is `ClassicyPixelArt` rows (`encodeClassicyPixelArtRows`,
 * MIME `CLASSICY_PIXEL_ART_MIME`), not an image: drawn by the component, never
 * by CSS, so it gets no variable. Spelled out here because the registry cannot
 * import the component (the component reads the registry).
 */
const PIXEL_ART_SOURCE = "data:text/x-classicy-pixel-art,";

const assetVars = (): Record<string, string> => {
	const activeId = getActiveClassicyAppearancePackageId();
	if (varsCache.version === version && varsCache.key === activeId) {
		return varsCache.value;
	}
	const value: Record<string, string> = {};
	for (const kind of ["cursors", "systemArt"] as const) {
		for (const [key, src] of Object.entries(mergedTree(kind))) {
			if (typeof src === "string" && !src.startsWith(PIXEL_ART_SOURCE)) {
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

export const registerClassicySystemArt = (
	packageId: string,
	art: Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>,
): void =>
	registerClassicyAssets("systemArt", packageId, art as ClassicyAssetTree);

export const registerClassicyWallpapers = (
	packageId: string,
	list: Array<{ name: string; src: ClassicyAssetSource }>,
): void =>
	registerClassicyAssets(
		"wallpapers",
		packageId,
		Object.fromEntries(list.map((w) => [w.name, w.src])),
	);

const FONT_FORMATS: Record<string, string> = {
	woff2: "woff2",
	woff: "woff",
	ttf: "truetype",
	truetype: "truetype",
	otf: "opentype",
	opentype: "opentype",
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: refusing control characters is the point
const SAFE_FONT_NAME = /^[^"'\\;{}\u0000-\u001f\u007f]+$/;
const SAFE_FONT_DESCRIPTOR = /^[A-Za-z0-9 .%-]+$/;

/** ` format("…")` from a data: mime or the file extension; empty if unknown. */
const fontFormat = (src: ClassicyAssetSource): string => {
	const ext = src.startsWith("data:")
		? /^data:(?:font\/|application\/font-)([a-z0-9]+)/i.exec(src)?.[1]
		: /\.([a-z0-9]+)(?:[?#]|$)/i.exec(src)?.[1];
	const key = ext?.toLowerCase();
	return key && Object.hasOwn(FONT_FORMATS, key)
		? ` format("${FONT_FORMATS[key]}")`
		: "";
};

const fontFaceRule = (face: StoredFontFace): string => {
	const sources = face.sources
		.map((src) => `url("${src}")${fontFormat(src)}`)
		.join(",");
	return `@font-face{font-family:"${face.family}";src:${sources};font-weight:${face.weight};font-style:${face.style};font-display:swap}`;
};

/** Rewrites `<style id="classicy-fonts-<packageId>">` from that package's faces. */
const writeClassicyFontFaces = (packageId: string): void => {
	if (typeof document === "undefined") return;
	const id = `classicy-fonts-${packageId}`;
	let style = document.getElementById(id);
	if (!style) {
		style = document.createElement("style");
		style.id = id;
		const base = document.getElementById("classicy-styles");
		if (base) base.after(style);
		else document.head.prepend(style);
	}
	style.textContent = [...(fontFaces.get(packageId)?.values() ?? [])]
		.map(fontFaceRule)
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
