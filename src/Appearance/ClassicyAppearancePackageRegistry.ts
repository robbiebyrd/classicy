import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "./ClassicyAppearanceDefaults";
import type { ClassicyAppearancePackage } from "./ClassicyAppearancePackage";
import { ClassicyAppearancePackageSchema } from "./ClassicyAppearancePackageSchema";
import {
	CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX,
	injectClassicyAppearanceStyles,
} from "./ClassicyAppearanceStyles";

// The registry itself, apart from the store-reading hooks in
// ClassicyAppearancePackage.ts (which re-exports all of it, the contract's
// home). It never imports the app manager: the desktop reducer looks packages
// up here, and a path from the reducer to the store module would evaluate the
// store before its default state whenever the app manager loads first.

const SUBSYSTEM = "ClassicyAppearance";

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

/**
 * The registered package for `id`, else the registered default package
 * (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`), else `undefined`. The first two
 * tiers of `resolveClassicyAppearancePackage`, without its frozen fallback
 * and without the store, so reducers resolve the active package by the same
 * rule the hooks and the root attribute use.
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
