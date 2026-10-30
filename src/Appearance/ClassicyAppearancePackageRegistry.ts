import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
} from "./ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "./ClassicyAppearancePackage";
import { ClassicyAppearancePackageSchema } from "./ClassicyAppearancePackageSchema";
import {
	CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX,
	injectClassicyAppearanceStyles,
} from "./ClassicyAppearanceStyles";

// The registry itself, apart from the store-reading hooks in
// ClassicyAppearancePackage.ts (which re-exports the contract's names from it;
// the barrel exports the rest). It never imports the app manager: the desktop reducer looks packages
// up here, and a path from the reducer to the store module would evaluate the
// store before its default state whenever the app manager loads first.

const SUBSYSTEM = "ClassicyAppearance";

// Built at module evaluation, and kept here (not beside the store-reading
// hooks) so reducers can fall back to it: ClassicyAppearance has no runtime
// edge back to this module, so the themes are always initialized here
// whichever module a bundle evaluates first (ClassicyAppearancePackage.test.tsx
// loads each entry point into a fresh module graph).
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
 * (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`), else `undefined`. Store-free,
 * so reducers resolve the active package by the same rule the hooks and the
 * root attribute use: `resolveClassicyAppearancePackage` is this, then
 * `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`.
 */
export const getRegisteredClassicyAppearancePackageOrDefault = (
	id: string | undefined,
): ClassicyAppearancePackage | undefined =>
	(id === undefined ? undefined : registry.get(id)) ??
	registry.get(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID);

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
