// The Platinum Appearance Package (Mac OS 8). Importing this module registers
// it. The core neither imports nor exports it (plan 0015 §1.6): a host, a
// test (`@/__tests__/withPlatinum`) or Storybook's preview imports it, and
// the library build's entry (`src/ClassicyLibraryBuild.internal.ts`) bundles
// it until it ships as its own package.
//
// Hand-written, not a barrelsby barrel (it carries no barrelsby header, and
// `.ts-barrel.json` excludes this folder). Its exports are Platinum's public
// names, the future `@classicy/appearance-platinum`'s API.

import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { withDefaultThemeMetrics } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
// Both register at module load: the Platinum assets (system art, cursors,
// wallpapers, fonts) and the Platinum sound pack. The sound pack must be
// registered before the registration below, since the package is validated
// and a theme's `sound.pack` must name a registered pack. The package lists
// them; it never registers them a second time.
import "./assets/platinumAssets";
import { platinumArt } from "./assets/art/platinumArt";
import { platinumSoundPack } from "./assets/sounds/platinum";
import { platinumAppearanceHooks } from "./hooks";
import platinumJson from "./platinum.json";
import platinumCss from "./styles/platinum.scss?inline";

export * from "./assets/platinumAssets";
export * from "./assets/sounds/platinum";
export * from "./hooks";

/** The Platinum package's id. */
export const PLATINUM_APPEARANCE_PACKAGE_ID = "platinum";

// The presets carry only the core five; Platinum's knob families are in
// `defaults.measurements` alone and filled here (H-R8), key by key, as
// `classicyThemeMeasurementDefaults("platinum")` will once the package is
// registered (the core floor under these values, which hold every floor key).
const platinumMeasurements = platinumJson.defaults.measurements;

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
	platinumJson.presets as unknown as ClassicyTheme[]
).map(platinumTheme);

// The defaults are the preset with their id, the same object, so a switch to
// Platinum and ChangeTheme activate one and the same theme.
const platinumDefaults =
	platinumPresets.find((theme) => theme.id === platinumJson.defaults.id) ??
	platinumTheme(platinumJson.defaults as unknown as ClassicyTheme);

registerClassicyAppearancePackage({
	id: PLATINUM_APPEARANCE_PACKAGE_ID,
	name: platinumJson.name,
	icon: platinumArt("platinum.png"),
	defaults: platinumDefaults,
	presets: platinumPresets,
	css: platinumCss,
	knobs: platinumJson.knobs,
	options: classicyKnobsToSchema(platinumJson.knobs),
	layout: platinumJson.layout as ClassicyAppearanceLayout,
	sounds: [platinumSoundPack],
	hooks: platinumAppearanceHooks,
});
