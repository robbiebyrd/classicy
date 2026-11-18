// The Appearance Packages Storybook's Package toolbar switches between: the
// ones Classicy ships. Platinum is imported by preview.tsx, so it is
// registered in every iframe. Every other package is imported only when it
// is chosen (`loadStorybookAppearancePackage`), so an iframe nobody switched
// never registers it: the default stories, the Theme toolbar's Platinum
// themes and the parity baseline see Platinum alone, as a Platinum-only host
// does. The Storybook-only proofs (`mirrored`, `renamed`, the hooks probe)
// are not listed: their own stories register them.

import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getAllThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
// Read as data, not through the package's entry, which would register it.
import system7Json from "../../packages/appearance/system7/src/system7.json";

export type StorybookAppearancePackage = {
	id: string;
	/** The name the toolbars show. */
	title: string;
	/** The package's themes, readable before it is registered. */
	presets: () => ReadonlyArray<{ id: string; name: string }>;
	/** Registers the package; resolves once it is. */
	load: () => Promise<unknown>;
};

export const STORYBOOK_APPEARANCE_PACKAGES: readonly StorybookAppearancePackage[] =
	[
		{
			id: "platinum",
			title: "Platinum",
			presets: () => getClassicyAppearancePackage("platinum")?.presets ?? [],
			load: () => import("@classicy/appearance-platinum"),
		},
		{
			id: "system7",
			title: "System 7",
			presets: () => system7Json.presets,
			load: () => import("@classicy/appearance-system7"),
		},
	];

/** The Package toolbar's global, and the package it starts on. */
export const STORYBOOK_PACKAGE_GLOBAL = "appearancePackage";
export const STORYBOOK_DEFAULT_PACKAGE_ID =
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;

const switchable = (id: string) =>
	STORYBOOK_APPEARANCE_PACKAGES.find((pkg) => pkg.id === id);

/**
 * Registers a switchable package that is not registered yet. Resolves to
 * `false` for an id Storybook cannot load (unknown, or registered by its own
 * stories), which then renders under whatever package resolves.
 */
export const loadStorybookAppearancePackage = async (
	id: string,
): Promise<boolean> => {
	if (getClassicyAppearancePackage(id)) return true;
	const pkg = switchable(id);
	if (!pkg) return false;
	await pkg.load();
	return getClassicyAppearancePackage(id) !== undefined;
};

/** Whether a story under `id` must wait for `loadStorybookAppearancePackage`. */
export const isStorybookAppearancePackagePending = (id: string): boolean =>
	!getClassicyAppearancePackage(id) && switchable(id) !== undefined;

/**
 * The Theme toolbar's items: the themes of every registered package (Platinum
 * alone as the preview loads, in registration order), then those of each
 * switchable package not registered yet. Each names its package on the right,
 * since a theme only applies under its own package.
 */
export const storybookThemeToolbarItems = () => {
	const items: { value: string; title: string; right: string }[] = [];
	const seen = new Set<string>();
	const add = (
		packageTitle: string,
		presets: ReadonlyArray<{ id: string; name: string }>,
	) => {
		for (const theme of presets) {
			if (seen.has(theme.id)) continue;
			seen.add(theme.id);
			items.push({ value: theme.id, title: theme.name, right: packageTitle });
		}
	};
	for (const pkg of listClassicyAppearancePackages())
		add(switchable(pkg.id)?.title ?? pkg.name, pkg.presets ?? []);
	for (const pkg of STORYBOOK_APPEARANCE_PACKAGES)
		if (!getClassicyAppearancePackage(pkg.id)) add(pkg.title, pkg.presets());
	return items;
};

/** The Package toolbar's items. */
export const storybookPackageToolbarItems = () =>
	STORYBOOK_APPEARANCE_PACKAGES.map((pkg) => ({
		value: pkg.id,
		title: pkg.title,
	}));

/**
 * The theme a story draws under `packageId`: the Theme toolbar's choice when
 * it is one of that package's themes, else the package's defaults. Call it
 * once the package is registered.
 */
export const resolveStorybookThemeId = (
	packageId: string,
	themeId: string,
): string => {
	const own = getAllThemes().find(
		(theme) =>
			theme.id === themeId && (theme.package ?? "platinum") === packageId,
	);
	if (own) return own.id;
	return getClassicyAppearancePackage(packageId)?.defaults.id ?? themeId;
};
