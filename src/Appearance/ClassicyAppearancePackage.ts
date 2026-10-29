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
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
} from "./ClassicyAppearanceDefaults";
import { ClassicyAppearancePackageSchema } from "./ClassicyAppearancePackageSchema";
import {
	CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX,
	injectClassicyAppearanceStyles,
} from "./ClassicyAppearanceStyles";

export { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "./ClassicyAppearanceDefaults";

const SUBSYSTEM = "ClassicyAppearance";

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

const registry = new Map<string, ClassicyAppearancePackage>();
const listeners = new Set<() => void>();
let snapshot: ClassicyAppearancePackage[] = [];

const publish = () => {
	snapshot = Array.from(registry.values());
	for (const listener of listeners) listener();
};

/**
 * Add an Appearance Package. Call it at module scope; consumers update live.
 * The package is validated against `ClassicyAppearancePackageSchema` (all but
 * `css`, `options` and `hooks`); an invalid one is logged as an error and not
 * registered. On success its CSS is injected (`injectClassicyAppearanceStyles`)
 * and the package object itself is stored. Re-registering an id replaces the
 * package and keeps its position.
 */
export function registerClassicyAppearancePackage(
	pkg: ClassicyAppearancePackage,
): void {
	const parsed = ClassicyAppearancePackageSchema.safeParse(pkg);
	const issues = parsed.success
		? []
		: parsed.error.issues.map(
				(issue) => `${issue.path.join(".") || "(package)"}: ${issue.message}`,
			);
	if (typeof pkg?.css !== "string") issues.push("css: must be a string");
	if (issues.length) {
		classicyLog(
			"error",
			SUBSYSTEM,
			`Package "${pkg?.id}" was not registered: ${issues.join("; ")}`,
		);
		return;
	}
	injectClassicyAppearanceStyles(pkg.id, pkg.css);
	registry.set(pkg.id, pkg);
	publish();
}

export const getClassicyAppearancePackage = (
	id: string,
): ClassicyAppearancePackage | undefined => registry.get(id);

/** Registered packages, in registration order. */
export const listClassicyAppearancePackages = (): ClassicyAppearancePackage[] =>
	snapshot;

export function subscribeClassicyAppearancePackages(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Registered packages in registration order; re-renders on any change. */
export const useClassicyAppearancePackages = (): ClassicyAppearancePackage[] =>
	useSyncExternalStore(
		subscribeClassicyAppearancePackages,
		listClassicyAppearancePackages,
		listClassicyAppearancePackages,
	);

// `System.Manager.Appearance.packageId` joins the store type with the store
// change (plan 0005-1b3 §2.1); a state without it means the default package.
const selectPackageId = (state: ClassicyStore): string | undefined =>
	(state.System.Manager.Appearance as { packageId?: string }).packageId;

const resolve = (packageId: string | undefined): ClassicyAppearancePackage =>
	(packageId === undefined ? undefined : registry.get(packageId)) ??
	registry.get(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) ??
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

/** Test helper: forget every registered package and remove its stylesheet. */
export const resetClassicyAppearancePackagesForTests = (): void => {
	registry.clear();
	if (typeof document !== "undefined") {
		for (const style of document.querySelectorAll(
			`style[id^="${CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX}"]`,
		))
			style.remove();
	}
	publish();
};
