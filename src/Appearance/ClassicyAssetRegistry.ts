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

/**
 * An icon tree leaf that carries its own 16 px image beside the full-size
 * one (System 7's `ics#`/`ics8` small icons are drawn, not scaled). A plain
 * string leaf is still an icon: it scales at small sizes. Only the `icons`
 * kind accepts this form.
 */
export type ClassicyIconLeaf = {
	src: ClassicyAssetSource;
	small?: ClassicyAssetSource;
};

/** The small-icon size in px (the `--icon-small-size` the theme emits). */
export const CLASSICY_SMALL_ICON_SIZE = 16;

/**
 * What a stored `{ src, small }` leaf is. A class, not a shape, so a
 * namespace that happens to hold a `src` key is never mistaken for one.
 */
class StoredIconLeaf {
	// Structurally a tree of strings, so it nests in a ClassicyAssetTree.
	readonly [key: string]: string;
	/** `small` is "" when the leaf has no small image (never a valid source). */
	constructor(
		readonly src: ClassicyAssetSource,
		readonly small: ClassicyAssetSource = "",
	) {}
}

const isStoredLeaf = (value: unknown): value is StoredIconLeaf =>
	value instanceof StoredIconLeaf;

/** True for the `{ src, small? }` form an icon registration may hold. */
const isIconLeafShape = (value: unknown): value is ClassicyIconLeaf => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	return (
		Object.hasOwn(value, "src") &&
		Object.keys(value).every((k) => k === "src" || k === "small")
	);
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
	| "downArrow"
	| "ditherChecker"
	| "helpMenuTitle";

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
/**
 * Each package's variant trees per kind: kind → package → variant → tree
 * (`registerClassicyAssets(…, { variant })`). A theme picks one with
 * `assetVariant`; its lookups read it over the package's base tree.
 */
const variantTrees = new Map<
	ClassicyAssetKind,
	Map<string, Map<string, ClassicyAssetTree>>
>();
/** Every variant name each package registered, of any kind. */
const registeredVariants = new Map<string, Set<string>>();
/** `<package>|<variant>` pairs a theme named unregistered: warned or queued. */
const reportedVariants = new Set<string>();
/** Every registered face per package, with its full fallback source list. */
const fontFaces = new Map<string, Map<string, StoredFontFace>>();
/** Each package's wallpaper files by wallpaper name (`registerClassicyWallpapers`). */
const wallpaperFiles = new Map<string, Map<string, string>>();
/** Each package's legacy `data:` URI digests by wallpaper name. */
const wallpaperLegacyDigests = new Map<string, Map<string, string[]>>();
let version = 0;
const listeners = new Set<() => void>();

let unsubscribePackageSource: (() => void) | undefined;
let lastActiveKey: string | undefined;

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

/**
 * A name for an asset variant (`registerClassicyAssets(…, { variant })`,
 * `ClassicyTheme.assetVariant`): a letter or digit, then letters, digits,
 * `_` or `-`, at most 64 characters.
 */
export const CLASSICY_ASSET_VARIANT_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * The active theme's `assetVariant`, when that theme belongs to `packageId`:
 * a variant names one package's trees, so a theme drawn under another
 * package (its own not registered yet) selects none. Pure: no warning.
 */
const themeVariantFor = (packageId: string): string | undefined => {
	const theme = getClassicyAssetPackageSource()?.getActiveTheme?.();
	const variant = theme?.assetVariant;
	if (typeof variant !== "string") return undefined;
	return (theme?.package ?? DEFAULT_PACKAGE) === packageId
		? variant
		: undefined;
};

const isRegisteredVariant = (packageId: string, variant: string): boolean =>
	registeredVariants.get(packageId)?.has(variant) ?? false;

/**
 * `themeVariantFor`, warning once per package and variant per page when the
 * package never registered that variant (its lookups then read the base
 * tree, which they do anyway: an unregistered variant has no tree). Checked
 * after the current task, so a package whose variant trees register in the
 * same module evaluation as a first lookup is never warned.
 */
const activeVariantFor = (packageId: string): string | undefined => {
	const variant = themeVariantFor(packageId);
	if (variant === undefined || isRegisteredVariant(packageId, variant))
		return variant;
	const key = `${packageId}|${variant}`;
	if (reportedVariants.has(key)) return variant;
	reportedVariants.add(key);
	queueMicrotask(() => {
		if (isRegisteredVariant(packageId, variant)) {
			reportedVariants.delete(key);
			return;
		}
		classicyLog(
			"warn",
			SUBSYSTEM,
			`Theme asset variant "${variant}" is not registered for package "${packageId}"; its base assets are used`,
		);
	});
	return variant;
};

/** The active package and its theme's variant: what every snapshot keys on. */
const activeKey = (): string => {
	const id = getActiveClassicyAppearancePackageId();
	return `${id}|${themeVariantFor(id) ?? ""}`;
};

const onPackageSourceChange = (): void => {
	const key = activeKey();
	if (key === lastActiveKey) return;
	lastActiveKey = key;
	// The caches key on the active id and variant, so no version bump:
	// consumers only need to re-read their snapshots.
	for (const listener of [...listeners]) listener();
};

/** Subscribe to the source on the first asset listener, never at import. */
const followPackageSource = (): void => {
	const source = getClassicyAssetPackageSource();
	if (!source || unsubscribePackageSource) return;
	lastActiveKey = activeKey();
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
	typeof value === "object" && value !== null && !isStoredLeaf(value);

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
			if (typeof existing === "string" || isStoredLeaf(existing)) {
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
		if (kind === "icons" && isIconLeafShape(value)) {
			if (!isClassicyAssetSource(value.src)) {
				classicyLog(
					"warn",
					SUBSYSTEM,
					`Ignored ${kind} asset "${path}" for package "${packageId}": not a safe asset source`,
				);
			} else if (value.small === undefined) {
				out[key] = new StoredIconLeaf(value.src);
			} else if (isClassicyAssetSource(value.small)) {
				out[key] = new StoredIconLeaf(value.src, value.small);
			} else {
				classicyLog(
					"warn",
					SUBSYSTEM,
					`Ignored the small image of ${kind} asset "${path}" for package "${packageId}": not a safe asset source`,
				);
				out[key] = new StoredIconLeaf(value.src);
			}
		} else if (isTree(value)) {
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

export type ClassicyAssetRegistrationOptions = {
	/**
	 * Register `tree` as this named variant of the package's assets
	 * (`CLASSICY_ASSET_VARIANT_NAME`) instead of its base tree. A theme of the
	 * package selects it with `assetVariant`; its lookups read the variant's
	 * tree, then the package's base tree, then the default package's.
	 */
	variant?: string;
};

/** The tree `kind` keeps for `packageId` (its `variant`'s, when given), created on demand. */
const storedTree = (
	kind: ClassicyAssetKind,
	packageId: string,
	variant: string | undefined,
): ClassicyAssetTree => {
	let tree: ClassicyAssetTree | undefined;
	if (variant === undefined) {
		let byPackage = trees.get(kind);
		if (!byPackage) {
			byPackage = new Map();
			trees.set(kind, byPackage);
		}
		tree = byPackage.get(packageId);
		if (!tree) {
			tree = {};
			byPackage.set(packageId, tree);
		}
		return tree;
	}
	let byPackage = variantTrees.get(kind);
	if (!byPackage) {
		byPackage = new Map();
		variantTrees.set(kind, byPackage);
	}
	let byVariant = byPackage.get(packageId);
	if (!byVariant) {
		byVariant = new Map();
		byPackage.set(packageId, byVariant);
	}
	tree = byVariant.get(variant);
	if (!tree) {
		tree = {};
		byVariant.set(variant, tree);
	}
	let names = registeredVariants.get(packageId);
	if (!names) {
		names = new Set();
		registeredVariants.set(packageId, names);
	}
	names.add(variant);
	return tree;
};

/**
 * Deep-merge `tree` into that package's namespace for `kind`: its base tree,
 * or with `options.variant` that variant's tree. Leaves that are not a valid
 * `ClassicyAssetSource` are skipped with a warning; a variant name that is not
 * a `CLASSICY_ASSET_VARIANT_NAME` registers nothing, with a warning.
 */
export const registerClassicyAssets = (
	kind: ClassicyAssetKind,
	packageId: string,
	tree: ClassicyAssetTree,
	options?: ClassicyAssetRegistrationOptions,
): void => {
	const variant = options?.variant;
	if (variant !== undefined && !CLASSICY_ASSET_VARIANT_NAME.test(variant)) {
		classicyLog(
			"warn",
			SUBSYSTEM,
			`Ignored ${kind} assets for package "${packageId}": "${String(variant)}" is not a variant name (a letter or digit, then letters, digits, _ or -, at most 64)`,
		);
		return;
	}
	mergeInto(
		storedTree(kind, packageId, variant),
		validLeaves(kind, packageId, tree, ""),
		"",
	);
	notify();
};

/** Test-only: clears every package tree and bumps the version. */
export const resetClassicyAssets = (): void => {
	cursorHotspots.clear();
	trees.clear();
	variantTrees.clear();
	registeredVariants.clear();
	reportedVariants.clear();
	reportedSmallCollisions.clear();
	fontFaces.clear();
	wallpaperFiles.clear();
	wallpaperLegacyDigests.clear();
	notify();
};

type Node = ClassicyAssetSource | ClassicyAssetTree | StoredIconLeaf;

const walkNode = (
	tree: ClassicyAssetTree | undefined,
	path: string,
): Node | undefined => {
	let node: Node | undefined = tree;
	for (const segment of path.split(".")) {
		if (!isTree(node) || !Object.hasOwn(node, segment)) return undefined;
		node = node[segment];
	}
	return node;
};

const walk = (
	tree: ClassicyAssetTree | undefined,
	path: string,
): ClassicyAssetSource | undefined => {
	const node = walkNode(tree, path);
	if (isStoredLeaf(node)) return node.src;
	return typeof node === "string" ? node : undefined;
};

const walkIcon = (
	tree: ClassicyAssetTree | undefined,
	path: string,
): ClassicyIconLeaf | undefined => {
	const node = walkNode(tree, path);
	if (isStoredLeaf(node))
		return node.small === ""
			? { src: node.src }
			: { src: node.src, small: node.small };
	return typeof node === "string" ? { src: node } : undefined;
};

const variantTree = (
	kind: ClassicyAssetKind,
	packageId: string,
	variant: string | undefined,
): ClassicyAssetTree | undefined =>
	variant === undefined
		? undefined
		: variantTrees.get(kind)?.get(packageId)?.get(variant);

/**
 * Dotted-path lookup: the given (or active) package's `variant` tree, then
 * its base tree, then the default package's base tree. `variant` defaults to
 * the active theme's `assetVariant` when that theme belongs to the package;
 * pass it to resolve for another theme. Store-free: the active package and
 * theme are read through the source the store connects, so reducers may call
 * it.
 */
export const resolveClassicyAsset = (
	kind: ClassicyAssetKind,
	path: string,
	packageId?: string,
	variant?: string,
): ClassicyAssetSource | undefined => {
	const byPackage = trees.get(kind);
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	return (
		walk(variantTree(kind, id, variant ?? activeVariantFor(id)), path) ??
		walk(byPackage?.get(id), path) ??
		walk(byPackage?.get(DEFAULT_PACKAGE), path)
	);
};

/**
 * An icon with its small image: `resolveClassicyAsset("icons", path)` is the
 * `src`; `small` is present when the leaf was registered as `{ src, small }`.
 * Resolved like any asset: variant tree, base tree, default package.
 */
export const resolveClassicyIcon = (
	path: string,
	packageId?: string,
	variant?: string,
): ClassicyIconLeaf | undefined => {
	const byPackage = trees.get("icons");
	const id = packageId ?? getActiveClassicyAppearancePackageId();
	return (
		walkIcon(variantTree("icons", id, variant ?? activeVariantFor(id)), path) ??
		walkIcon(byPackage?.get(id), path) ??
		walkIcon(byPackage?.get(DEFAULT_PACKAGE), path)
	);
};

const smallIndexCache = new Map<
	string,
	{ version: number; value: Map<string, string> }
>();

/**
 * Every `src` to `small` pair of the icon set the active theme draws: the
 * theme's variant tree, then the active package's base tree, then the default
 * package's, each path counted once (a more specific tree's leaf hides the
 * same path below it, as lookups do).
 *
 * A small image belongs to its `src` image, not to one leaf, because icons
 * travel as plain URL strings. So a leaf with no `small` that shares a `src`
 * with a leaf that has one draws that `small`. When leaves sharing one `src`
 * declare different `small` images, the most specific tree wins (variant over
 * the active package over the default package), and within one tree the first
 * key in tree order; one `classicyLog` warning per such `src` and page says so.
 */
const smallIndex = (): Map<string, string> => {
	const activeId = getActiveClassicyAppearancePackageId();
	const variant = activeVariantFor(activeId);
	const key = `${activeId}|${variant ?? ""}`;
	const cached = smallIndexCache.get(key);
	if (cached && cached.version === version) return cached.value;
	const value = new Map<string, string>();
	const byPackage = trees.get("icons");
	const tiers = [
		variantTree("icons", activeId, variant),
		byPackage?.get(activeId),
		activeId === DEFAULT_PACKAGE ? undefined : byPackage?.get(DEFAULT_PACKAGE),
	];
	const seenPaths = new Set<string>();
	for (const tier of tiers) {
		if (!tier) continue;
		const tierPaths: string[] = [];
		const visit = (tree: ClassicyAssetTree, trail: string) => {
			for (const name of Object.keys(tree)) {
				const path = trail ? `${trail}.${name}` : name;
				const node: Node | undefined = tree[name];
				if (isStoredLeaf(node)) {
					tierPaths.push(path);
					if (seenPaths.has(path) || node.small === "") continue;
					const existing = value.get(node.src);
					if (existing === undefined) value.set(node.src, node.small);
					else if (existing !== node.small) warnSmallCollision(node.src);
				} else if (isTree(node)) visit(node, path);
				else if (typeof node === "string") tierPaths.push(path);
			}
		};
		visit(tier, "");
		for (const path of tierPaths) seenPaths.add(path);
	}
	smallIndexCache.set(key, { version, value });
	return value;
};

const reportedSmallCollisions = new Set<string>();

const warnSmallCollision = (src: string): void => {
	if (reportedSmallCollisions.has(src)) return;
	reportedSmallCollisions.add(src);
	classicyLog(
		"warn",
		SUBSYSTEM,
		`Icons sharing the image "${src}" declare different small images; the most specific tree's first one is used`,
	);
};

/**
 * The image to draw for the icon URL `src` at `px` (CSS px): its registered
 * small image when it has one and `px` is no larger than the small-icon size
 * (`CLASSICY_SMALL_ICON_SIZE`), else `src` itself. Icons travel as plain URL
 * strings (props, persisted records), so this looks `src` up in the active
 * theme's icon tree; a URL no leaf names returns unchanged. Pass `true` for
 * a surface whose size comes from CSS and is the small size.
 */
export const resolveClassicyIconImage = (
	src: string,
	px: number | true = true,
): string => {
	if (px !== true && !(px <= CLASSICY_SMALL_ICON_SIZE)) return src;
	return smallIndex().get(src) ?? src;
};

/** `resolveClassicyIconImage`, re-read when the registry or the theme changes. */
export const useClassicyIconImage = (
	src: string,
	px: number | true = true,
): string => {
	const getSnapshot = () => resolveClassicyIconImage(src, px);
	return useSyncExternalStore(
		subscribeClassicyAssets,
		getSnapshot,
		getSnapshot,
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
	const variant = activeVariantFor(activeId);
	const key = `${kind}|${activeId}|${variant ?? ""}`;
	const cached = treeCache.get(key);
	if (cached && cached.version === version) return cached.value;
	const byPackage = trees.get(kind);
	const value = copyTree(byPackage?.get(DEFAULT_PACKAGE) ?? {});
	if (activeId !== DEFAULT_PACKAGE) {
		const active = byPackage?.get(activeId);
		if (active) mergeInto(value, active, "");
	}
	const selected = variantTree(kind, activeId, variant);
	if (selected) mergeInto(value, selected, "");
	treeCache.set(key, { version, value });
	return value;
};

/**
 * Merged COPY (the default package under the active one, under the active
 * theme's variant of it); stable until a registration or a switch.
 */
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
	const key = activeKey();
	if (varsCache.version === version && varsCache.key === key) {
		return varsCache.value;
	}
	const value: Record<string, string> = {};
	for (const kind of ["cursors", "systemArt"] as const) {
		for (const [key, src] of Object.entries(mergedTree(kind))) {
			// Pixel art (the Control Strip and pop-up slider glyphs) is drawn
			// by ClassicyPixelArt, never by CSS, so it gets no variable.
			if (typeof src === "string" && !parseClassicyPixelArtSource(src)) {
				value[classicyAssetVarName(kind, key)] = `url("${src}")`;
				const hotspot = kind === "cursors" && cursorHotspots.get(src);
				if (hotspot)
					value[`${classicyAssetVarName(kind, key)}-hotspot`] =
						`${hotspot[0]} ${hotspot[1]}`;
			}
		}
	}
	varsCache = { version, key, value };
	return value;
};

/**
 * `--classicy-cursor-<role>` / `--classicy-art-<key>` as `url("…")` strings,
 * and `--classicy-cursor-<role>-hotspot` (`"<x> <y>"`) for a cursor registered
 * with a hotspot. Pixel-art system art (the Control Strip and pop-up slider
 * glyphs) is left out: it is drawn by `ClassicyPixelArt`, not by stylesheets.
 */
export const useClassicyAssetVars = (): Record<string, string> =>
	useSyncExternalStore(subscribeClassicyAssets, assetVars, assetVars);

/**
 * A cursor image's hotspot: the pixel, from its top left, that points (CSS
 * `cursor: url(…) <x> <y>`). A whole number from 0 to 127 on each axis.
 */
export type ClassicyCursorHotspot = readonly [x: number, y: number];

/** A cursor with its hotspot (`registerClassicyCursors`). */
export type ClassicyCursorLeaf = {
	src: ClassicyAssetSource;
	hotspot: ClassicyCursorHotspot;
};

/**
 * Each registered cursor image's hotspot, by image: a hotspot belongs to the
 * image, so a role resolves its hotspot from whichever tree its image came
 * from (variant, package, default package) and the two never disagree.
 */
const cursorHotspots = new Map<string, ClassicyCursorHotspot>();

const isHotspot = (value: unknown): value is ClassicyCursorHotspot =>
	Array.isArray(value) &&
	value.length === 2 &&
	value.every((n) => Number.isInteger(n) && n >= 0 && n < 128);

/**
 * Register a package's cursors (with `options.variant`, a variant's). A
 * cursor is an image, or `{ src, hotspot: [x, y] }` for one whose pointing
 * pixel is not where the stylesheets that draw it assume (each names its
 * own fallback, the center `8 8` for the resize cursors and the hand). The
 * hotspot is published beside the image as
 * `--classicy-cursor-<role>-hotspot` and used by `useClassicyCursor`; an
 * invalid one is ignored with a warning, keeping the image.
 */
export const registerClassicyCursors = (
	packageId: string,
	cursors: Partial<
		Record<ClassicyCursorRole, ClassicyAssetSource | ClassicyCursorLeaf>
	>,
	options?: ClassicyAssetRegistrationOptions,
): void => {
	const tree: ClassicyAssetTree = {};
	for (const [role, value] of Object.entries(cursors)) {
		if (typeof value !== "object" || value === null) {
			if (value !== undefined) tree[role] = value;
			continue;
		}
		tree[role] = value.src;
		if (!isClassicyAssetSource(value.src)) continue;
		if (isHotspot(value.hotspot))
			cursorHotspots.set(value.src, [value.hotspot[0], value.hotspot[1]]);
		else
			classicyLog(
				"warn",
				SUBSYSTEM,
				`Ignored the hotspot of cursor "${role}" for package "${packageId}": not two whole numbers from 0 to 127`,
			);
	}
	registerClassicyAssets("cursors", packageId, tree, options);
};

/**
 * The hotspot of the cursor `role` resolves to (`resolveClassicyAsset`), or
 * undefined when its image was registered without one.
 */
export const resolveClassicyCursorHotspot = (
	role: ClassicyCursorRole,
	packageId?: string,
	variant?: string,
): ClassicyCursorHotspot | undefined => {
	const src = resolveClassicyAsset("cursors", role, packageId, variant);
	return src === undefined ? undefined : cursorHotspots.get(src);
};

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
	ditherChecker: "image",
	helpMenuTitle: "image",
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
 * from a JS host, a typo) is logged too. With `options.variant`, the art is
 * that variant's.
 */
export const registerClassicySystemArt = (
	packageId: string,
	art: Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>,
	options?: ClassicyAssetRegistrationOptions,
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
	registerClassicyAssets(
		"systemArt",
		packageId,
		entries as ClassicyAssetTree,
		options,
	);
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
