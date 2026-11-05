import { setClassicyPackageMeasurementsLookup } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementSource.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
} from "./ClassicyAppearanceDefaults";
import type {
	ClassicyAppearancePackage,
	ClassicyAppIdentityOverride,
} from "./ClassicyAppearancePackage";
import { ClassicyAppearancePackageSchema } from "./ClassicyAppearancePackageSchema";
import {
	CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX,
	injectClassicyAppearanceStyles,
} from "./ClassicyAppearanceStyles";
import { CLASSICY_CORE_DEFAULT_THEME } from "./ClassicyCoreTheme";

// The registry itself, apart from the store-reading hooks in
// ClassicyAppearancePackage.ts (which re-exports the contract's names from it;
// the barrel exports the rest). It never imports the app manager: the desktop reducer looks packages
// up here, and a path from the reducer to the store module would evaluate the
// store before its default state whenever the app manager loads first.

const SUBSYSTEM = "ClassicyAppearance";

// Kept here (not beside the store-reading hooks) so reducers can fall back
// to it. Its theme is the core's own data (ClassicyCoreTheme.ts), so it reads
// no package and no module that reads this registry.
/**
 * The core's structure without a look: the id of the default package
 * (`"platinum"`), the core default theme (`CLASSICY_CORE_DEFAULT_THEME`: no
 * wallpaper, the core floor's measurements) as its defaults and only preset,
 * the default layout, and no CSS, hooks or icon. Returned only while no
 * package is registered at all, for lone components rendered outside a
 * desktop (`ClassicyDesktop` itself draws `ClassicyNoAppearancePackage`
 * then). Frozen shallowly: `defaults` is the shared, frozen core theme.
 */
export const CLASSICY_FALLBACK_APPEARANCE_PACKAGE: ClassicyAppearancePackage =
	Object.freeze({
		id: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		name: "Platinum",
		css: "",
		defaults: CLASSICY_CORE_DEFAULT_THEME,
		presets: [CLASSICY_CORE_DEFAULT_THEME],
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
 * A frozen copy of a package's validated `apps`, each override frozen too, so
 * a later change to the caller's object never reaches the registry unchecked
 * (K-R13).
 */
const frozenAppsCopy = (
	apps: NonNullable<ClassicyAppearancePackage["apps"]>,
): NonNullable<ClassicyAppearancePackage["apps"]> => {
	const copy: Record<string, ClassicyAppIdentityOverride> = {};
	for (const [appId, override] of Object.entries(apps)) {
		copy[appId] = Object.freeze({ ...override });
	}
	return Object.freeze(copy);
};

/**
 * Add an Appearance Package. Call it at module scope; consumers update live.
 * The package is validated against `ClassicyAppearancePackageSchema` (all but
 * `css`, `options` and `hooks`); an invalid one is logged as an error and not
 * registered. On success its CSS is injected (`injectClassicyAppearanceStyles`)
 * and the package object itself is stored, except that a package with `apps`
 * is stored as a shallow copy whose `apps` is a frozen copy of the validated
 * value: mutating the caller's `apps` afterward changes nothing.
 * Re-registering an id replaces the package and keeps its position.
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
	const apps = parsed.data?.apps;
	registry.set(
		pkg.id,
		apps === undefined ? pkg : { ...pkg, apps: frozenAppsCopy(apps) },
	);
	publish();
}

/**
 * Remove a registered package and its stylesheet. Returns whether one was
 * removed. A store whose `packageId` still names it resolves as for any
 * unregistered id (`getRegisteredClassicyAppearancePackageOrDefault`) until
 * it switches. Registering the package again appends it at the end. The
 * default package (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`) is refused with
 * a warning, since every unregistered id resolves to it; replace it by
 * re-registering its id instead.
 */
export function unregisterClassicyAppearancePackage(id: string): boolean {
	if (id === CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) {
		classicyLog(
			"warn",
			SUBSYSTEM,
			`The default package "${id}" cannot be unregistered; register a package with its id to replace it.`,
		);
		return false;
	}
	if (!registry.delete(id)) return false;
	injectClassicyAppearanceStyles(id, "");
	publish();
	return true;
}

export const getClassicyAppearancePackage = (
	id: string,
): ClassicyAppearancePackage | undefined => registry.get(id);

/**
 * The registered package for `id`, else the registered default package
 * (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`), else the first registered
 * package, else `undefined` (no package is registered). Store-free, so
 * reducers resolve the active package by the same rule the hooks and the
 * root attribute use: `resolveClassicyAppearancePackage` is this, then
 * `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`.
 */
export const getRegisteredClassicyAppearancePackageOrDefault = (
	id: string | undefined,
): ClassicyAppearancePackage | undefined =>
	(id === undefined ? undefined : registry.get(id)) ??
	registry.get(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) ??
	snapshot[0];

// `classicyThemeMeasurementDefaults` fills a theme's missing measurements
// from its package's defaults; the registry hands it the lookup (see
// ClassicyThemeMeasurementSource.internal.ts for why it is not imported).
// The theme's package, else the registered default, but never the first
// registered package: that one only decides what draws, while these values
// are theme data, which persistence strips against them, so a theme of a
// package that has not registered yet must not take another package's.
setClassicyPackageMeasurementsLookup(
	(id) =>
		(
			(id === undefined ? undefined : registry.get(id)) ??
			registry.get(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)
		)?.defaults.measurements,
);

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
