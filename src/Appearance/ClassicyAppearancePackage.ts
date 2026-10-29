import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import type { z } from "zod";
import type {
	ClassicyAssetKind,
	ClassicyAssetTree,
} from "@/Appearance/ClassicyAssetRegistry";
import type {
	ClassicyComponentName,
	ClassicyState,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
} from "./ClassicyAppearanceDefaults";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";

export { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "./ClassicyAppearanceDefaults";
export {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";

/**
 * Where a package puts the pieces whose position differs between systems.
 * Read through `useClassicyAppearanceLayout` (useClassicyAppearanceLayout.ts).
 */
export type ClassicyAppearanceLayout = {
	window: {
		growBoxCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
	};
	menuBar: { placement: "screen" | "window" };
	desktop: {
		iconGridOrigin: "top-right" | "top-left" | "bottom-right" | "bottom-left";
	};
};

/**
 * A package's tunable measurements, as UI metadata: family → key →
 * `{ label, min, max, default }`. The values themselves are theme data, under
 * `defaults.measurements.<family>.<key>`; `classicyKnobsToSchema` turns the
 * metadata into the package's `options` schema.
 */
export type ClassicyAppearanceKnobs = Record<
	string,
	Record<string, { label: string; min: number; max: number; default: number }>
>;

/** A component lifecycle or interaction moment a package may react to. */
export type ClassicyAppearanceEvent =
	| "mount"
	| "unmount"
	| "press"
	| "release"
	| "click"
	| "open"
	| "close"
	| "focus"
	| "blur"
	| "collapse"
	| "expand"
	| "zoom"
	| "select"
	| "change"
	| "dragStart"
	| "dragEnd";

/** What a package hook adds to a component's root element. */
export type ClassicyAppearanceDecoration = {
	className?: string;
	style?: CSSProperties;
	attrs?: Record<string, string>;
};

export type ClassicyAppearanceContext = {
	component: ClassicyComponentName;
	event: ClassicyAppearanceEvent;
	element: HTMLElement | null;
	state: Partial<Record<ClassicyState, boolean>>;
	detail?: unknown;
};

/** Returning nothing keeps the previous decoration; `{}` clears it. */
export type ClassicyAppearanceHandler = (
	ctx: ClassicyAppearanceContext,
	// biome-ignore lint/suspicious/noConfusingVoidType: the contract's type, so a handler may simply not return.
) => ClassicyAppearanceDecoration | void;

export type ClassicyAppearanceHooks = {
	decorate?: (
		component: ClassicyComponentName,
		state: Partial<Record<ClassicyState, boolean>>,
	) => ClassicyAppearanceDecoration | undefined;
	on?: Partial<
		Record<
			ClassicyComponentName,
			Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>>
		>
	>;
};

/**
 * An Appearance Package: a complete look (CSS, default theme, presets,
 * arrangement, assets, sounds, behavior hooks) that the desktop can switch
 * to as a unit. Register one with `registerClassicyAppearancePackage`.
 */
export type ClassicyAppearancePackage = {
	/** Kebab-case, e.g. "platinum". */
	id: string;
	name: string;
	/**
	 * Compiled CSS, already one `@layer classicy.package { … }` block scoped
	 * under `.classicyDesktop[data-classicy-appearance=<id>]`.
	 */
	css: string;
	/** The package's default theme (color, typography, measurements, desktop, sound). */
	defaults: ClassicyTheme;
	/** Built-in themes offered with the package (Platinum's 21). */
	presets?: ClassicyTheme[];
	/** UI metadata per measurements family/key. */
	knobs?: ClassicyAppearanceKnobs;
	/** Built from `knobs` by `classicyKnobsToSchema(knobs)`. */
	// biome-ignore lint/suspicious/noExplicitAny: the contract's type; each package's knobs give the shape.
	options?: z.ZodObject<any>;
	layout: ClassicyAppearanceLayout;
	/** Descriptive: the package's assets, registered through the asset registries. */
	assets?: Partial<Record<ClassicyAssetKind, ClassicyAssetTree>>;
	/** Descriptive: the package's sound packs, registered through the sound pack registry. */
	sounds?: ClassicySoundPack[];
	hooks?: ClassicyAppearanceHooks;
};

// Built at module evaluation. ClassicyAppearance has no runtime edge back to
// this module, and the app manager (reached through `useAppManager`) is only
// read inside functions, so the themes are always initialized here whichever
// module a bundle evaluates first (ClassicyAppearancePackage.test.tsx loads
// each entry point into a fresh module graph).
/**
 * Platinum's structure without its look: the Platinum defaults, presets and
 * layout, and no CSS or hooks. Returned only while no package is registered
 * at all (lone-component tests, a host that never loads Platinum). Frozen
 * shallowly: `defaults` and `presets` are the shared built-in theme objects.
 */
export const CLASSICY_FALLBACK_APPEARANCE_PACKAGE: ClassicyAppearancePackage =
	Object.freeze({
		id: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		name: "Platinum",
		css: "",
		defaults: getTheme("default"),
		presets: getAllThemes(),
		layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	});

/** Registered packages in registration order; re-renders on any change. */
export const useClassicyAppearancePackages = (): ClassicyAppearancePackage[] =>
	useSyncExternalStore(
		subscribeClassicyAppearancePackages,
		listClassicyAppearancePackages,
		listClassicyAppearancePackages,
	);

// Read as possibly absent: a hand-built state may lack it until
// migrateClassicyState fills it, and a missing id means the default package.
const selectPackageId = (state: ClassicyStore): string | undefined =>
	state.System.Manager.Appearance.packageId;

const resolve = (packageId: string | undefined): ClassicyAppearancePackage =>
	(packageId === undefined
		? undefined
		: getClassicyAppearancePackage(packageId)) ??
	getClassicyAppearancePackage(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) ??
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE;

/**
 * The package that applies to `packageId`: that package when registered, else
 * Platinum, else `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`. With no argument it
 * reads the store's active package id at call time, for reducers, effects and
 * other non-hook callers; components use `useActiveClassicyAppearancePackage`.
 */
export const resolveClassicyAppearancePackage = (
	packageId: string | undefined = selectPackageId(useAppManager.getState()),
): ClassicyAppearancePackage => resolve(packageId);

/**
 * The active package: the store's `packageId` when that package is
 * registered, else Platinum, else `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`.
 * Re-renders when the store's id or the registry changes.
 */
export const useActiveClassicyAppearancePackage =
	(): ClassicyAppearancePackage => {
		const packageId = useAppManager(selectPackageId);
		useClassicyAppearancePackages();
		return resolve(packageId);
	};
