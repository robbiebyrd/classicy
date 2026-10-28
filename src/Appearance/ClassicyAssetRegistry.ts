import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyAssetSource } from "./ClassicyAssetSource";

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

/**
 * Placeholder until plan 0002-ldj Part B reads
 * System.Manager.Appearance.packageId; Part B replaces the body, not the name.
 */
export const getActiveClassicyAppearancePackageId = (): string => PLATINUM;

const trees = new Map<ClassicyAssetKind, Map<string, ClassicyAssetTree>>();
let version = 0;
const listeners = new Set<() => void>();

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

/** Deep-merge `tree` into that package's namespace for `kind`. */
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
	mergeInto(stored, tree, "");
	notify();
};

/** Test-only: clears every package tree and bumps the version. */
export const resetClassicyAssets = (): void => {
	trees.clear();
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
	return () => {
		listeners.delete(listener);
	};
};

export const useClassicyAsset = (
	kind: ClassicyAssetKind,
	path: string,
): ClassicyAssetSource | undefined =>
	useSyncExternalStore(subscribeClassicyAssets, () =>
		resolveClassicyAsset(kind, path),
	);

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
): ClassicyAssetTree =>
	useSyncExternalStore(subscribeClassicyAssets, () => mergedTree(kind));

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
			if (typeof src === "string") {
				value[classicyAssetVarName(kind, key)] = `url("${src}")`;
			}
		}
	}
	varsCache = { version, key: activeId, value };
	return value;
};

/** `--classicy-cursor-<role>` / `--classicy-art-<key>` as `url("…")` strings. */
export const useClassicyAssetVars = (): Record<string, string> =>
	useSyncExternalStore(subscribeClassicyAssets, assetVars);

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
