// The Platinum Appearance Package (Mac OS 8), `@classicy/appearance-platinum`.
// Importing this module registers it. The core neither imports nor exports it
// (plan 0015 §1.6): a host, a test (`@/__tests__/withPlatinum`) or Storybook's
// preview imports it, and the core's library build entry
// (`src/ClassicyLibraryBuild.internal.ts`) still bundles it until the two
// builds separate (plan 0015 §3.4). It reaches the core only through
// `@classicy/classicy`, a peer dependency its own build leaves external, so
// it registers into the host's one copy of the registries.
//
// Hand-written. Its exports are the package's public API.

import {
	type ClassicyAppearanceLayout,
	type ClassicyTheme,
	classicyKnobsToSchema,
	registerClassicyAppearancePackage,
	withDefaultThemeMetrics,
} from "@classicy/classicy";
// Both register at module load: the Platinum assets (system art, cursors,
// wallpapers, fonts) and the Platinum sound pack. The sound pack must be
// registered before the registration below, since the package is validated
// and a theme's `sound.pack` must name a registered pack. The package lists
// them; it never registers them a second time.
import "./assets/platinumAssets";
import { platinumArt } from "./assets/art/platinumArt";
import { platinumSoundPack } from "./assets/sounds/platinum";
import { platinumAppearanceHooks } from "./hooks";
import platinumJsonSource from "./platinum.json";
import platinumCss from "./styles/platinum.scss?inline";

export * from "./assets/platinumAssets";
export * from "./assets/sounds/platinum";
export * from "./hooks";

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

const deepFreeze = <T extends object>(value: T): DeepReadonly<T> => {
	for (const child of Object.values(value))
		if (typeof child === "object" && child !== null) deepFreeze(child);
	return Object.freeze(value) as DeepReadonly<T>;
};

/**
 * Platinum's theme data (`platinum.json`), deep-frozen. It is a copy: the
 * registered package shares its objects with the source (knobs, the presets'
 * colors, typography and desktop), so a host that could mutate this export
 * would edit a registered built-in theme.
 */
export const platinumJson = deepFreeze(structuredClone(platinumJsonSource));

/** The Platinum package's id. */
export const PLATINUM_APPEARANCE_PACKAGE_ID = "platinum";

// The presets carry only the core five; Platinum's knob families are in
// `defaults.measurements` alone and filled here (H-R8), key by key, as
// `classicyThemeMeasurementDefaults("platinum")` will once the package is
// registered (the core floor under these values, which hold every floor key).
const platinumMeasurements = platinumJsonSource.defaults.measurements;

/**
 * A platinum.json theme as Platinum registers it: its wallpaper named by
 * filename, as the JSON names it and every theme holds it (`getThemeVars`
 * resolves it through the asset registry at render), its measurements
 * completed from Platinum's defaults, and its package named.
 */
const platinumTheme = (theme: ClassicyTheme): ClassicyTheme => ({
	...withDefaultThemeMetrics(theme, platinumMeasurements),
	package: theme.package ?? PLATINUM_APPEARANCE_PACKAGE_ID,
});

const platinumPresets = (
	platinumJsonSource.presets as unknown as ClassicyTheme[]
).map(platinumTheme);

// The defaults are the preset with their id, the same object, so a switch to
// Platinum and ChangeTheme activate one and the same theme.
const platinumDefaults =
	platinumPresets.find(
		(theme) => theme.id === platinumJsonSource.defaults.id,
	) ?? platinumTheme(platinumJsonSource.defaults as unknown as ClassicyTheme);

registerClassicyAppearancePackage({
	id: PLATINUM_APPEARANCE_PACKAGE_ID,
	name: platinumJsonSource.name,
	icon: platinumArt("platinum.png"),
	defaults: platinumDefaults,
	presets: platinumPresets,
	css: platinumCss,
	knobs: platinumJsonSource.knobs,
	options: classicyKnobsToSchema(platinumJsonSource.knobs),
	layout: platinumJsonSource.layout as ClassicyAppearanceLayout,
	sounds: [platinumSoundPack],
	hooks: platinumAppearanceHooks,
});
