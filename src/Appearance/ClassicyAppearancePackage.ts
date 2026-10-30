import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import type { z } from "zod";
import type {
	ClassicyAssetKind,
	ClassicyAssetTree,
} from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import type {
	ClassicyComponentName,
	ClassicyState,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";

export { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "./ClassicyAppearanceDefaults";
export {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	subscribeClassicyAppearancePackages,
	unregisterClassicyAppearancePackage,
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

/**
 * Every event a component may emit to a package (`ClassicyAppearanceEvent`),
 * in the contract's order. Frozen.
 */
export const CLASSICY_APPEARANCE_EVENTS = Object.freeze([
	"mount",
	"unmount",
	"press",
	"release",
	"click",
	"open",
	"close",
	"focus",
	"blur",
	"collapse",
	"expand",
	"zoom",
	"select",
	"change",
	"dragStart",
	"dragEnd",
] as const);

/** A component lifecycle or interaction moment a package may react to. */
export type ClassicyAppearanceEvent =
	(typeof CLASSICY_APPEARANCE_EVENTS)[number];

/**
 * How the user drove an event that a component emits from both a pointer
 * path and a keyboard path: `detail.input`. A package uses it
 * to tell, say, a mouse press on a tab from an arrow key landing on it.
 */
export type ClassicyAppearanceInput = "pointer" | "keyboard";

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
	/**
	 * What the package adds to a component's root for its state. It must be a
	 * pure function of `(component, state)`: its result is memoized on the
	 * component's state classes and the package, so anything else it reads
	 * (the active theme, the store, the time) goes stale until one of those
	 * changes.
	 */
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

/** A package's display override for one app (by app id). Display only:
 *  the app's id, action types, routing and saved state never change. */
export type ClassicyAppIdentityOverride = {
	/** Shown wherever the app's name is shown. */
	name?: string;
	/** Shown wherever the app's icon is shown. */
	icon?: ClassicyAssetSource;
	/** Balloon-help copy for the app's desktop icon when the app supplies none. */
	description?: string;
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
	/** Per-app display overrides keyed by app id (`"MoviePlayer.app"`); read with `useClassicyAppIdentity`. */
	apps?: Readonly<Record<string, ClassicyAppIdentityOverride>>;
	hooks?: ClassicyAppearanceHooks;
};

/** Registered packages in registration order; re-renders on any change. */
export const useClassicyAppearancePackages = (): ClassicyAppearancePackage[] =>
	useSyncExternalStore(
		subscribeClassicyAppearancePackages,
		listClassicyAppearancePackages,
		listClassicyAppearancePackages,
	);

// Read as possibly absent: a hand-built state may lack it until
// migrateClassicyState fills it, and a missing id means the default package.
// Mocked stores in tests may lack the slice altogether.
const selectPackageId = (state: ClassicyStore): string | undefined =>
	state.System?.Manager?.Appearance?.packageId;

// The store-free registry helper (shared with the reducers, J-R16), then the
// frozen structure-only fallback.
const resolve = (packageId: string | undefined): ClassicyAppearancePackage =>
	getRegisteredClassicyAppearancePackageOrDefault(packageId) ??
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
