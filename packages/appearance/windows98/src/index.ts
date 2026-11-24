// The Windows 98 Appearance Package, `@classicy/appearance-windows98`.
// Importing this module registers it. Like Platinum and System 7, it reaches
// the core only through `@classicy/classicy`, a peer dependency its build
// leaves external, so it registers into the host's one copy of the
// registries; the core neither imports nor bundles it.
//
// One package, eighteen themes: "Windows Standard" (Windows 98's own
// scheme, the defaults), "Windows 95" (the same palette with flat title
// bars) and the sixteen classic color schemes of the Display control panel
// (Brick, Desert, Eggplant, Lilac, Maple, Marine, Plum, Pumpkin, Rainy Day,
// Red White and Blue, Rose, Slate, Spruce, Storm, Teal, Wheat), each the
// system colors of its `[Control Panel\Colors]` block, every one drawn by
// the same stylesheet.
//
// Hand-written. Its exports are the package's public API.

import {
	type ClassicyAppearanceColorFamilies,
	type ClassicyAppearanceKnobs,
	type ClassicyAppearanceLayout,
	type ClassicyTheme,
	classicyKnobsToSchema,
	registerClassicyAppearancePackage,
	withDefaultThemeColorFamilies,
	withDefaultThemeMetrics,
} from "@classicy/classicy";
// Registers at module load: the sound pack, which must be registered before
// the registration below, since the package is validated and a theme's
// `sound.pack` must name a registered pack. The package lists the pack; it
// never registers it a second time.
import "./assets/sounds/windows98";
// The package's own icon (the Appearance Manager's Themes tab): a window on
// the teal desktop.
import windows98Icon from "./assets/art/windows98.svg";
import { windows98SoundPack } from "./assets/sounds/windows98";
import windows98Css from "./styles/windows98.scss?inline";
import windows98JsonSource from "./windows98.json";
import { deepFreeze } from "./windows98DeepFreeze.internal";

export * from "./assets/sounds/windows98";

/**
 * Windows 98's theme data (`windows98.json`), typed with the core's own
 * types, so a host can hand a preset, the defaults, the layout or the knobs
 * straight back to the core. The top level and each member's first level
 * are readonly; the object is deep-frozen at runtime.
 */
export type Windows98Json = {
	readonly id: string;
	readonly name: string;
	readonly defaults: Readonly<ClassicyTheme>;
	readonly presets: ReadonlyArray<Readonly<ClassicyTheme>>;
	readonly layout: Readonly<ClassicyAppearanceLayout>;
	readonly knobs: Readonly<ClassicyAppearanceKnobs>;
	/**
	 * Labels for the Windows colors no palette slot holds: the title bars'
	 * (`titleBar`), the selected text's (`selection`), the ToolTip's
	 * (`tooltip`) and the desktop icon labels' (`desktop`).
	 */
	readonly colorFamilies: Readonly<ClassicyAppearanceColorFamilies>;
};

/**
 * Windows 98's theme data (`windows98.json`), deep-frozen. It is a copy: the
 * registered package shares its objects with the source, so a host that
 * could mutate this export would edit a registered built-in theme. Its
 * presets and defaults are the JSON's, before Windows 98 completes them for
 * registration.
 */
export const windows98Json: Windows98Json = deepFreeze(
	structuredClone(windows98JsonSource),
) as unknown as Windows98Json;

/** The Windows 98 package's id. */
export const WINDOWS98_APPEARANCE_PACKAGE_ID = "windows98";

// A preset's missing measurements and package colors are filled key by key
// from the defaults', as `classicyThemeMeasurementDefaults("windows98")`
// will once the package is registered.
const windows98Measurements = windows98JsonSource.defaults.measurements;
const windows98ColorFamilies = windows98JsonSource.defaults.color.families;

/** A windows98.json theme as Windows 98 registers it: complete, its package named. */
const windows98Theme = (theme: ClassicyTheme): ClassicyTheme => ({
	...withDefaultThemeColorFamilies(
		withDefaultThemeMetrics(theme, windows98Measurements),
		windows98ColorFamilies,
	),
	package: theme.package ?? WINDOWS98_APPEARANCE_PACKAGE_ID,
});

const windows98Presets = (
	windows98JsonSource.presets as unknown as ClassicyTheme[]
).map(windows98Theme);

// The defaults are the preset with their id, the same object, so a switch to
// Windows 98 and ChangeTheme activate one and the same theme.
const windows98Defaults =
	windows98Presets.find(
		(theme) => theme.id === windows98JsonSource.defaults.id,
	) ?? windows98Theme(windows98JsonSource.defaults as unknown as ClassicyTheme);

// No hooks: the package plays no interface feedback (Windows' sounds are
// Microsoft's) and decorates nothing. No screen savers: it names none, so the
// Screen Saver control panel reads "This appearance has no screen savers."
registerClassicyAppearancePackage({
	id: WINDOWS98_APPEARANCE_PACKAGE_ID,
	name: windows98JsonSource.name,
	icon: windows98Icon,
	defaults: windows98Defaults,
	presets: windows98Presets,
	css: windows98Css,
	knobs: windows98JsonSource.knobs,
	colorFamilies: windows98JsonSource.colorFamilies,
	options: classicyKnobsToSchema(windows98JsonSource.knobs),
	layout: windows98JsonSource.layout as ClassicyAppearanceLayout,
	sounds: [windows98SoundPack],
});
