// The Windows 98 Appearance Package, `@classicy/appearance-windows98`.
// Importing this module registers it. Like Platinum and System 7, it reaches
// the core only through `@classicy/classicy`, a peer dependency its build
// leaves external, so it registers into the host's one copy of the
// registries; the core neither imports nor bundles it.
//
// One package, thirty-four themes: the thirty-three color schemes of
// Windows 98 Second Edition's Display control panel, each read from the
// scheme Windows 98 SE's SHELL2.INF writes (`[schemes.reg]`, under
// HKCU\Control Panel\Appearance\Schemes: its 29 system colors, its border,
// scroll bar, caption, small caption and menu sizes and its caption, small
// caption, menu, message box and icon fonts), "Windows Standard" (the
// defaults, keeping USER's built-in caption gradients, which a fresh Windows
// 98 draws) first; and "Windows 95" (Windows Standard's palette with flat
// title bars and raised toolbar buttons). Every one is drawn by the same
// stylesheet.
//
// Hand-written. Its exports are the package's public API.

import {
	ABOUT_BALLOON_HELP_TOPIC_ID,
	type ClassicyAppearanceColorFamilies,
	type ClassicyAppearanceFontFamilies,
	type ClassicyAppearanceHooks,
	type ClassicyAppearanceKnobs,
	type ClassicyAppearanceLayout,
	type ClassicyTheme,
	classicyKnobsToSchema,
	registerAppleGuideTopic,
	registerClassicyAppearancePackage,
	withDefaultThemeColorFamilies,
	withDefaultThemeMetrics,
} from "@classicy/classicy";
import { createElement } from "react";
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
import { type DeepReadonly, deepFreeze } from "./windows98DeepFreeze.internal";
import { windows98FileTypeNames } from "./windows98FileTypeNames";
import { readWindows98ThemeFile } from "./windows98ThemeFile";

export * from "./assets/sounds/windows98";
export { readWindows98ThemeFile } from "./windows98ThemeFile";

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
	 * (`tooltip`), the desktop icon labels' (`desktop`), ButtonText and
	 * GrayText (`text`), the scroll bar's track (`scrollBar`), the sizing
	 * border's (`sizingBorder`) and a Help topic's text jumps (`help`).
	 */
	readonly colorFamilies: Readonly<ClassicyAppearanceColorFamilies>;
	/**
	 * Labels for each scheme's fonts (`typography.families`): the caption's,
	 * the small caption's, the menu's, the message box's and the icon's.
	 */
	readonly fontFamilies: Readonly<ClassicyAppearanceFontFamilies>;
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

/**
 * The Windows 98 package's hooks (`hooks` in its registration): one, a
 * chosen menu item's. Windows runs a menu command the moment the button
 * comes up over its item, the menu closing first, with no flash and no
 * sound (WIG Ch.4 "Mouse Actions", p.24; Ch.7 "Drop-down Menu
 * Interaction", p.97). The core runs a chosen item's action when an
 * animation of the item ends (else after a 400 ms fallback), so the press
 * gives the item `windows98MenuItemChosen`, whose 1 ms animation
 * (_Menu.scss) changes nothing drawn and ends within a frame; the release
 * clears it. It plays no sound. Deeply frozen, and read-only to the type
 * checker, as Platinum's are: to build on it, compose a new object.
 */
export const windows98AppearanceHooks: DeepReadonly<ClassicyAppearanceHooks> =
	deepFreeze<ClassicyAppearanceHooks>({
		on: {
			MenuItem: {
				press: () => ({ className: "windows98MenuItemChosen" }),
				release: () => ({}),
			},
		},
	});

/**
 * The Colors tab's names for the core's colors (1.2): the Item names of
 * Windows 98 SE's Display Properties Appearance tab (deskcp16.dll) where an
 * Item is the color (Desktop, Window, Selected Items, 3D Objects); the
 * button shades and the window text, which Windows derived from 3D Objects
 * and each Item's font color and offered as no Item, by their
 * `[Control Panel\Colors]` names (ButtonHilight, ButtonLight, ButtonShadow,
 * ButtonDkShadow, WindowText) in words. The Items that are no core color
 * (the title bars, the window borders, the scroll bar, the ToolTip) are the
 * package's own color families, labeled there.
 */
const windows98ColorLabels: Readonly<Record<string, string>> = Object.freeze({
	"--color-system-01": "Button Highlight",
	"--color-system-02": "Button Light",
	"--color-system-03": "3D Objects",
	"--color-system-05": "Button Shadow",
	"--color-system-07": "Button Dark Shadow",
	"--color-black": "Window Text",
	"--color-highlight": "Selected Items",
	"--color-window-document": "Window",
	"--desktop-background-color": "Desktop",
});

// One hook (above), playing no interface feedback (Windows' sounds are
// Microsoft's) and decorating nothing else. No screen savers: it names none, so the
// Screen Saver control panel reads "This appearance has no screen savers."
// A disabled control's image is embossed as Windows draws one (DrawState's
// DSS_DISABLED): its ink in ButtonShadow over a copy one pixel down and right
// in ButtonHilight, the scheme's two colors. Load Theme… reads Windows
// `.theme` files (windows98ThemeFile.ts).
registerClassicyAppearancePackage({
	id: WINDOWS98_APPEARANCE_PACKAGE_ID,
	name: windows98JsonSource.name,
	icon: windows98Icon,
	defaults: windows98Defaults,
	presets: windows98Presets,
	css: windows98Css,
	knobs: windows98JsonSource.knobs,
	colorFamilies: windows98JsonSource.colorFamilies,
	fontFamilies: windows98JsonSource.fontFamilies,
	colorLabels: windows98ColorLabels,
	options: classicyKnobsToSchema(windows98JsonSource.knobs),
	iconDimming: {
		disabledControl: {
			emboss: {
				highlight: { colorKey: "system", index: 0 },
				shadow: { colorKey: "system", index: 4 },
			},
		},
	},
	themeFileImporter: {
		extensions: [".theme"],
		read: readWindows98ThemeFile,
	},
	layout: windows98JsonSource.layout as ClassicyAppearanceLayout,
	sounds: [windows98SoundPack],
	// Windows' names for the file types (10.2): "File Folder", "Text
	// Document", in the Kind column and a property sheet's Type.
	fileTypeNames: windows98FileTypeNames,
	hooks: windows98AppearanceHooks,
});

// The Help menu's built-in topic in Windows' words, offered under this
// package alone, so Platinum and System 7 keep Apple Guide's "About Help"
// (the WIG audit's 12.18). A task topic is brief "how", without concepts
// (WIG Ch.12 "Guidelines for Writing Task Help Topics", pp.280-281): how to
// learn an item's name (its ToolTip, Ch.12 "Tooltips", p.276) and what it
// does (What's This?, Ch.12 "Context-Sensitive Help", pp.273-275).
registerAppleGuideTopic({
	id: ABOUT_BALLOON_HELP_TOPIC_ID,
	title: "Using Help",
	packages: [WINDOWS98_APPEARANCE_PACKAGE_ID],
	pages: [
		createElement(
			"ul",
			null,
			createElement(
				"li",
				null,
				"Point to an item and wait: its ToolTip names it.",
			),
			createElement(
				"li",
				null,
				"To learn what an item does, choose What's This? from the Help menu, then click the item.",
			),
		),
	],
});
