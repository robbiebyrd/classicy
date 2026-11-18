// The System 7 Appearance Package, `@classicy/appearance-system7` (design
// 0017-6me, plan 0018-dbd). Importing this module registers it. Like
// Platinum, it reaches the core only through `@classicy/classicy`, a peer
// dependency its build leaves external, so it registers into the host's one
// copy of the registries; the core neither imports nor bundles it.
//
// One package, two themes: "System 7" (black and white, drawing the `bw`
// variant of the package's assets) and "System 7 Color" (the Standard
// lavender window colors, drawing the base tree).
//
// Hand-written. Its exports are the package's public API.

import {
	type ClassicyAppearanceColorFamilies,
	type ClassicyAppearanceKnobs,
	type ClassicyAppearanceLayout,
	ClassicyIcons,
	type ClassicyTheme,
	classicyKnobsToSchema,
	registerClassicyAppearancePackage,
	withDefaultThemeMetrics,
} from "@classicy/classicy";
import { SYSTEM7_ICON_DIMMING } from "./system7IconDimming";
// Both register at module load: the fonts, and the sound pack, which must be
// registered before the registration below, since the package is validated
// and a theme's `sound.pack` must name a registered pack. The package lists
// the pack; it never registers it a second time.
import "./assets/system7Assets";
// The After Dark screen savers, Platinum's twelve, registered at load under
// Platinum and System 7 before the registration below names one of them its
// `defaultScreenSaver` (design 0017-6me, "Screen savers"; plan 0018-dbd
// §3.8). The build bundles the module by relative import, so a host loading
// only System 7 gets the savers without Platinum; it is the one Platinum path
// System 7 imports (System7SourceImports.test.ts). Nothing of it is
// re-exported, so System 7's declarations never reference Platinum's files.
import "../../platinum/src/screenSavers/platinumScreenSavers";
// The package's own icon (the Appearance Manager's Themes tab): the System
// file's icon, System 7's suitcase with a Mac.
import system7Icon from "./assets/icons/color/32/system-folders-suitcase-system.png";
import { system7SoundPack } from "./assets/sounds/system7";
import { system7AppearanceHooks } from "./hooks";
import system7Css from "./styles/system7.scss?inline";
import system7JsonSource from "./system7.json";
import { deepFreeze } from "./system7DeepFreeze.internal";

export * from "./assets/sounds/system7";
export { system7AppearanceHooks } from "./hooks";

/**
 * System 7's theme data (`system7.json`), typed with the core's own types, so
 * a host can hand a preset, the defaults, the layout or the knobs straight
 * back to the core. The top level and each member's first level are
 * readonly; the object is deep-frozen at runtime.
 */
export type System7Json = {
	readonly id: string;
	readonly name: string;
	readonly defaults: Readonly<ClassicyTheme>;
	readonly presets: ReadonlyArray<Readonly<ClassicyTheme>>;
	readonly layout: Readonly<ClassicyAppearanceLayout>;
	readonly knobs: Readonly<ClassicyAppearanceKnobs>;
	/** Labels for System 7's own colors (`outlineTriangle`, `controlStrip`). */
	readonly colorFamilies: Readonly<ClassicyAppearanceColorFamilies>;
};

/**
 * System 7's theme data (`system7.json`), deep-frozen. It is a copy: the
 * registered package shares its objects with the source, so a host that
 * could mutate this export would edit a registered built-in theme. Its
 * presets and defaults are the JSON's, before System 7 completes them for
 * registration.
 */
export const system7Json: System7Json = deepFreeze(
	structuredClone(system7JsonSource),
) as unknown as System7Json;

/** The System 7 package's id. */
export const SYSTEM7_APPEARANCE_PACKAGE_ID = "system7";

// The families System 7 sets beside the core floor's (`dither`, the 1-bit
// theme's switch): a preset's missing measurements are filled key by key
// from the defaults', as `classicyThemeMeasurementDefaults("system7")` will
// once the package is registered.
const system7Measurements = system7JsonSource.defaults.measurements;

/** A system7.json theme as System 7 registers it: complete, its package named. */
const system7Theme = (theme: ClassicyTheme): ClassicyTheme => ({
	...withDefaultThemeMetrics(theme, system7Measurements),
	package: theme.package ?? SYSTEM7_APPEARANCE_PACKAGE_ID,
});

const system7Presets = (
	system7JsonSource.presets as unknown as ClassicyTheme[]
).map(system7Theme);

// The defaults are the preset with their id, the same object, so a switch to
// System 7 and ChangeTheme activate one and the same theme.
const system7Defaults =
	system7Presets.find((theme) => theme.id === system7JsonSource.defaults.id) ??
	system7Theme(system7JsonSource.defaults as unknown as ClassicyTheme);

// Bouncing Ball is the default screen saver, as under Platinum. Its hooks
// play no sound (System 7 had no interface feedback sounds): they blink a
// chosen menu item.
registerClassicyAppearancePackage({
	id: SYSTEM7_APPEARANCE_PACKAGE_ID,
	name: system7JsonSource.name,
	icon: system7Icon,
	defaults: system7Defaults,
	presets: system7Presets,
	css: system7Css,
	knobs: system7JsonSource.knobs,
	// System 7's own colors, which no palette slot holds: the disclosure
	// triangle's #9999FF checker and the Control Strip's #CCCCCC face and
	// #444444 edge (white, white and black in 1-bit). Every theme carries
	// them, as it carries its measurements.
	colorFamilies: system7JsonSource.colorFamilies,
	options: classicyKnobsToSchema(system7JsonSource.knobs),
	layout: system7JsonSource.layout as ClassicyAppearanceLayout,
	hooks: system7AppearanceHooks,
	sounds: [system7SoundPack],
	defaultScreenSaver: "bouncing-ball",
	// The Finder is shown by the System file's Macintosh, its small icon
	// the Application menu's title (`*-755-appmenu-closed.png`). The core's
	// URL follows to the active theme's image (color, or the `bw` variant).
	apps: { "Finder.app": { icon: ClassicyIcons.system.mac } },
	iconDimming: SYSTEM7_ICON_DIMMING,
});
