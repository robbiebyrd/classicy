import { describe, expect, it, vi } from "vitest";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	getClassicySoundPack,
	listClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import windows98Json from "./windows98.json";

// The Windows 98 package registers on import: package `windows98` with its
// thirty-four themes, its layout, its color families and its sound pack, alone,
// with no other package registered (the test setup registers none).

const BLACK = 0x000000;
const WHITE = 0xffffff;
// Windows 98's system colors (the Windows Default scheme).
const BUTTON_FACE = 0xc0c0c0;
const BUTTON_SHADOW = 0x808080;
const ACTIVE_TITLE = 0x000080;
const GRADIENT_ACTIVE_TITLE = 0x1084d0;
const DESKTOP = 0x008080;
const PIXEL_STACK =
	'"Pixelated MS Sans Serif", "MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif';

describe("the Windows 98 appearance package", () => {
	it("registers package windows98 on import, alone and without an error", async () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		expect(pkg?.name).toBe("Windows 98");
		expect(listClassicyAppearancePackages().map((p) => p.id)).toEqual([
			"windows98",
		]);
		expect(log).not.toHaveBeenCalledWith(
			"error",
			expect.anything(),
			expect.anything(),
		);
		log.mockRestore();
	}, 30_000);

	it("passes the package schema, defaults.package included", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		const parsed = ClassicyAppearancePackageSchema.safeParse(pkg);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(pkg?.defaults.package).toBe("windows98");
		// vitest serves the `?inline` sheet as an empty string; the compiled
		// sheet is checked by styles/windows98.css.test.ts.
		expect(typeof pkg?.css).toBe("string");
		expect(pkg?.icon).toBeTruthy();
	});

	// Windows 98 SE's thirty-three schemes (SHELL2.INF), in the order its
	// Display control panel lists them (a sorted combo box), after Windows
	// Standard, the defaults, and Windows 95. Every id the package shipped
	// before is kept, so a saved choice still resolves.
	it("registers thirty-four themes, Windows Standard the defaults", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		expect(pkg?.presets?.map((t) => [t.id, t.name])).toEqual([
			["windows98", "Windows Standard"],
			["windows95", "Windows 95"],
			["windows98Brick", "Brick"],
			["windows98Desert", "Desert"],
			["windows98Eggplant", "Eggplant"],
			["windows98HighContrast1", "High Contrast #1"],
			["windows98HighContrast1ExtraLarge", "High Contrast #1 (extra large)"],
			["windows98HighContrast1Large", "High Contrast #1 (large)"],
			["windows98HighContrast2", "High Contrast #2"],
			["windows98HighContrast2ExtraLarge", "High Contrast #2 (extra large)"],
			["windows98HighContrast2Large", "High Contrast #2 (large)"],
			["windows98HighContrastBlack", "High Contrast Black"],
			[
				"windows98HighContrastBlackExtraLarge",
				"High Contrast Black (extra large)",
			],
			["windows98HighContrastBlackLarge", "High Contrast Black (large)"],
			["windows98HighContrastWhite", "High Contrast White"],
			[
				"windows98HighContrastWhiteExtraLarge",
				"High Contrast White (extra large)",
			],
			["windows98HighContrastWhiteLarge", "High Contrast White (large)"],
			["windows98Lilac", "Lilac"],
			["windows98LilacLarge", "Lilac (large)"],
			["windows98Maple", "Maple"],
			["windows98Marine", "Marine (high color)"],
			["windows98Plum", "Plum (high color)"],
			["windows98Pumpkin", "Pumpkin (large)"],
			["windows98RainyDay", "Rainy Day"],
			["windows98RedWhiteBlue", "Red, White, and Blue (VGA)"],
			["windows98Rose", "Rose"],
			["windows98RoseLarge", "Rose (large)"],
			["windows98Slate", "Slate"],
			["windows98Spruce", "Spruce"],
			["windows98Storm", "Storm (VGA)"],
			["windows98Teal", "Teal (VGA)"],
			["windows98Wheat", "Wheat"],
			["windows98ExtraLarge", "Windows Standard (extra large)"],
			["windows98Large", "Windows Standard (large)"],
		]);
		expect(pkg?.defaults).toBe(pkg?.presets?.[0]);
		expect(pkg?.presets).toEqual(getAllThemes());
		expect(getTheme("windows95")).toBe(pkg?.presets?.[1]);
		for (const theme of pkg?.presets ?? []) {
			expect(theme.package).toBe("windows98");
			expect(theme.sound.pack).toBe("windows98");
			expect(theme.assetVariant).toBeUndefined();
		}
	});

	// Windows Standard is the Windows Default scheme: ButtonHilight,
	// ButtonLight, ButtonFace, ButtonShadow and ButtonDkShadow in the system
	// slots the bevels read, Window as the document, the navy Hilight, and the
	// teal desktop with no picture.
	it("draws Windows Standard in Windows 98's system colors", () => {
		const [standard] = windows98Json.presets;
		expect(standard.color.system).toEqual([
			WHITE,
			0xdfdfdf,
			BUTTON_FACE,
			0xa0a0a0,
			BUTTON_SHADOW,
			0x404040,
			BLACK,
		]);
		expect(standard.color.window.frame).toBe(BUTTON_FACE);
		expect(standard.color.window.document).toBe(WHITE);
		expect(standard.color.window.borderOutset).toBe(WHITE);
		expect(standard.color.window.borderInset).toBe(BUTTON_SHADOW);
		expect(standard.color.highlight).toBe(ACTIVE_TITLE);
		expect(standard.color.theme[3]).toBe(ACTIVE_TITLE);
		expect(standard.desktop.backgroundColor).toBe(DESKTOP);
		expect(standard.desktop.backgroundImage).toBe("");
	});

	// The colors no palette slot holds are the package's families: the
	// title bars' (ActiveTitle, GradientActiveTitle, InactiveTitle,
	// GradientInactiveTitle, TitleText, InactiveTitleText), the selected
	// text's (HilightText), the ToolTip's (InfoWindow, InfoText) and the
	// desktop labels'. Windows 95's bars are flat: both gradient ends equal.
	it("carries the title-bar, selection, ToolTip and desktop colors as its color families", () => {
		const [standard, win95] = windows98Json.presets;
		expect(standard.color.families.titleBar).toEqual({
			active: ACTIVE_TITLE,
			activeGradient: GRADIENT_ACTIVE_TITLE,
			inactive: BUTTON_SHADOW,
			inactiveGradient: 0xb5b5b5,
			text: WHITE,
			inactiveText: BUTTON_FACE,
		});
		expect(win95.color.families.titleBar.activeGradient).toBe(
			win95.color.families.titleBar.active,
		);
		expect(win95.color.families.titleBar.inactiveGradient).toBe(
			win95.color.families.titleBar.inactive,
		);
		expect(standard.color.families.selection).toEqual({ text: WHITE });
		expect(standard.color.families.tooltip).toEqual({
			face: 0xffffe1,
			text: BLACK,
		});
		expect(standard.color.families.desktop).toEqual({ text: WHITE });
		// ButtonText and GrayText, Scrollbar, ActiveBorder and InactiveBorder:
		// the colors only a High Contrast or a solid-track scheme sets apart.
		expect(standard.color.families.text).toEqual({
			button: BLACK,
			gray: BUTTON_SHADOW,
		});
		expect(standard.color.families.scrollBar).toEqual({ track: BUTTON_FACE });
		expect(standard.color.families.sizingBorder).toEqual({
			active: BUTTON_FACE,
			inactive: BUTTON_FACE,
		});
		expect(Object.keys(windows98Json.colorFamilies)).toEqual([
			"titleBar",
			"selection",
			"tooltip",
			"desktop",
			"text",
			"scrollBar",
			"sizingBorder",
		]);
		for (const [family, { colors }] of Object.entries(
			windows98Json.colorFamilies,
		))
			for (const theme of windows98Json.presets)
				expect(
					Object.keys(
						theme.color.families[family as keyof typeof theme.color.families],
					).sort(),
					`${theme.id} ${family}`,
				).toEqual(Object.keys(colors).sort());
	});

	it("emits the color families and the window chrome's knobs", async () => {
		await import("./index");
		const theme = getTheme("windows98") as ClassicyTheme;
		const vars = getThemeVars(theme);
		expect(vars).toMatchObject({
			"--package-color-title-bar-active": "#000080",
			"--package-color-title-bar-active-gradient": "#1084d0",
			"--package-color-title-bar-inactive": "#808080",
			"--package-color-title-bar-inactive-gradient": "#b5b5b5",
			"--package-color-title-bar-text": "#ffffff",
			"--package-color-title-bar-inactive-text": "#c0c0c0",
			"--package-color-selection-text": "#ffffff",
			"--package-color-tooltip-face": "#ffffe1",
			"--package-color-tooltip-text": "#000000",
			"--package-color-desktop-text": "#ffffff",
			"--pixel-unit": "1px",
			"--title-bar-button-width": "16px",
			"--title-bar-button-height": "14px",
			"--title-bar-close-gap": "2px",
			"--checkbox-size": "13px",
			"--radio-size": "12px",
			"--push-button-height": "23px",
			"--progress-bar-block-width": "8px",
			"--window-scrollbar-size": "16px",
			"--window-title-bar-height": "18px",
		});
		// No wallpaper: a color-only desktop, never an empty url().
		expect(vars["--desktop-background-image"]).toBe("none");
	});

	// A family's knobs emit as `--<family>-<key>`: a family named
	// `window…` would emit inside the core `window` family's names, where a
	// core key added later would take the name and win (core inputs beat
	// package families). So Windows 98's own families keep out of every core
	// family's namespace.
	it("keeps its own knob families out of the core families' names", () => {
		const kebab = (name: string) =>
			name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		const core = ["window", "control", "button", "groupBox", "layout"];
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			for (const family of Object.keys(theme.measurements ?? {})) {
				if (core.includes(family)) continue;
				for (const owner of core)
					expect(kebab(family).startsWith(`${kebab(owner)}-`), family).toBe(
						false,
					);
			}
	});

	// Every scheme's key values, as Windows 98 SE's SHELL2.INF writes them
	// (the scheme blobs under HKCU\Control Panel\Appearance\Schemes,
	// decoded: its 29 COLORREFs and NONCLIENTMETRICS), written out here
	// rather than read from the JSON, so a wrong value in windows98.json
	// fails. The palette: ButtonFace, Hilight, the active caption's two ends
	// (flat in every named scheme, as the INF stores them; Windows Standard and
	// its sizes keep USER's 0 0 128 to 16 132 208), Window, WindowText,
	// GrayText, the ToolTip's InfoWindow and InfoText, Scrollbar. The metrics:
	// the scroll bar, caption, small caption and menu sizes, the sizing border,
	// and whether the track is solid (ButtonHilight not Window). The caption
	// font: its face, size (an MS Sans Serif request takes the bitmap size GDI
	// draws it at) and weight.
	const SCHEMES: [
		string,
		string,
		{
			face: number;
			hilight: number;
			title: [number, number];
			window: number;
			text: number;
			gray: number;
			tooltip: [number, number];
			scrollbar: number;
		},
		{
			scroll: number;
			caption: number;
			small: number;
			menu: number;
			border: number;
			solidTrack: number;
		},
		[string, number, number],
	][] = [
		[
			"windows98",
			"Windows Standard",
			{
				face: 0xc0c0c0,
				hilight: 0x000080,
				title: [0x000080, 0x1084d0],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffe1, 0x000000],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 16,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Brick",
			"Brick",
			{
				face: 0xc2bfa5,
				hilight: 0x8d8961,
				title: [0x800000, 0x800000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x8d8961,
				tooltip: [0xe1e0d2, 0x800000],
				scrollbar: 0xe1e0d2,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["Arial", 12, 700],
		],
		[
			"windows98Desert",
			"Desert",
			{
				face: 0xd5ccbb,
				hilight: 0x008080,
				title: [0x008080, 0x008080],
				window: 0xffffff,
				text: 0x000000,
				gray: 0xa28d68,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xeae6dd,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Eggplant",
			"Eggplant",
			{
				face: 0x90b0a8,
				hilight: 0x387470,
				title: [0x588078, 0x588078],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x588078,
				tooltip: [0xffffff, 0x800080],
				scrollbar: 0x90b0a8,
			},
			{
				scroll: 16,
				caption: 19,
				small: 17,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["Times New Roman", 15, 700],
		],
		[
			"windows98HighContrast1",
			"High Contrast #1",
			{
				face: 0x000000,
				hilight: 0x008000,
				title: [0x0000ff, 0x0000ff],
				window: 0x000000,
				text: 0xffff00,
				gray: 0x00ff00,
				tooltip: [0x000000, 0xffff00],
				scrollbar: 0x000000,
			},
			{
				scroll: 17,
				caption: 20,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98HighContrast1ExtraLarge",
			"High Contrast #1 (extra large)",
			{
				face: 0x000000,
				hilight: 0x008000,
				title: [0x0000ff, 0x0000ff],
				window: 0x000000,
				text: 0xffff00,
				gray: 0x00ff00,
				tooltip: [0x000000, 0xffff00],
				scrollbar: 0x000000,
			},
			{
				scroll: 32,
				caption: 37,
				small: 28,
				menu: 38,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 30, 700],
		],
		[
			"windows98HighContrast1Large",
			"High Contrast #1 (large)",
			{
				face: 0x000000,
				hilight: 0x008000,
				title: [0x0000ff, 0x0000ff],
				window: 0x000000,
				text: 0xffff00,
				gray: 0x00ff00,
				tooltip: [0x000000, 0xffff00],
				scrollbar: 0x000000,
			},
			{
				scroll: 28,
				caption: 31,
				small: 26,
				menu: 30,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 24, 700],
		],
		[
			"windows98HighContrast2",
			"High Contrast #2",
			{
				face: 0x000000,
				hilight: 0x0000ff,
				title: [0x00ffff, 0x00ffff],
				window: 0x000000,
				text: 0x00ff00,
				gray: 0x00ff00,
				tooltip: [0xffff00, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 17,
				caption: 20,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98HighContrast2ExtraLarge",
			"High Contrast #2 (extra large)",
			{
				face: 0x000000,
				hilight: 0x0000ff,
				title: [0x00ffff, 0x00ffff],
				window: 0x000000,
				text: 0x00ff00,
				gray: 0x00ff00,
				tooltip: [0xffff00, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 32,
				caption: 37,
				small: 28,
				menu: 38,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 30, 700],
		],
		[
			"windows98HighContrast2Large",
			"High Contrast #2 (large)",
			{
				face: 0x000000,
				hilight: 0x0000ff,
				title: [0x00ffff, 0x00ffff],
				window: 0x000000,
				text: 0x00ff00,
				gray: 0x00ff00,
				tooltip: [0xffff00, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 28,
				caption: 31,
				small: 26,
				menu: 30,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 24, 700],
		],
		[
			"windows98HighContrastBlack",
			"High Contrast Black",
			{
				face: 0x000000,
				hilight: 0x800080,
				title: [0x800080, 0x800080],
				window: 0x000000,
				text: 0xffffff,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 17,
				caption: 20,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98HighContrastBlackExtraLarge",
			"High Contrast Black (extra large)",
			{
				face: 0x000000,
				hilight: 0x800080,
				title: [0x800080, 0x800080],
				window: 0x000000,
				text: 0xffffff,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 32,
				caption: 37,
				small: 28,
				menu: 38,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 30, 700],
		],
		[
			"windows98HighContrastBlackLarge",
			"High Contrast Black (large)",
			{
				face: 0x000000,
				hilight: 0x800080,
				title: [0x800080, 0x800080],
				window: 0x000000,
				text: 0xffffff,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0x000000,
			},
			{
				scroll: 28,
				caption: 31,
				small: 26,
				menu: 30,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 24, 700],
		],
		[
			"windows98HighContrastWhite",
			"High Contrast White",
			{
				face: 0xffffff,
				hilight: 0x000000,
				title: [0x000000, 0x000000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xffffff,
			},
			{
				scroll: 17,
				caption: 20,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98HighContrastWhiteExtraLarge",
			"High Contrast White (extra large)",
			{
				face: 0xffffff,
				hilight: 0x000000,
				title: [0x000000, 0x000000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xffffff,
			},
			{
				scroll: 30,
				caption: 38,
				small: 28,
				menu: 38,
				border: 6,
				solidTrack: 1,
			},
			["Arial", 30, 700],
		],
		[
			"windows98HighContrastWhiteLarge",
			"High Contrast White (large)",
			{
				face: 0xffffff,
				hilight: 0x000000,
				title: [0x000000, 0x000000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x00ff00,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xffffff,
			},
			{
				scroll: 26,
				caption: 37,
				small: 28,
				menu: 27,
				border: 7,
				solidTrack: 1,
			},
			["Arial", 24, 700],
		],
		[
			"windows98Lilac",
			"Lilac",
			{
				face: 0xaea8d9,
				hilight: 0x7830d0,
				title: [0x5a4eb1, 0x5a4eb1],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x5a4eb1,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xaea8d9,
			},
			{
				scroll: 15,
				caption: 22,
				small: 16,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["Arial", 16, 700],
		],
		[
			"windows98LilacLarge",
			"Lilac (large)",
			{
				face: 0xaea8d9,
				hilight: 0x5a4eb1,
				title: [0x5a4eb1, 0x5a4eb1],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x5a4eb1,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xaea8d9,
			},
			{
				scroll: 15,
				caption: 29,
				small: 21,
				menu: 21,
				border: 1,
				solidTrack: 1,
			},
			["Arial", 23, 700],
		],
		[
			"windows98Maple",
			"Maple",
			{
				face: 0xe0cc98,
				hilight: 0xc8a848,
				title: [0x800000, 0x800000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0xc09c38,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xf0e8d0,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Marine",
			"Marine (high color)",
			{
				face: 0x88c0b8,
				hilight: 0x006cc8,
				title: [0x000080, 0x000080],
				window: 0xc8e0d8,
				text: 0x000000,
				gray: 0x4b8d84,
				tooltip: [0xc8e0d8, 0x000000],
				scrollbar: 0xc4dfdb,
			},
			{
				scroll: 13,
				caption: 18,
				small: 13,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Plum",
			"Plum (high color)",
			{
				face: 0xa89890,
				hilight: 0x284848,
				title: [0x484060, 0x484060],
				window: 0xd8d0c8,
				text: 0x000000,
				gray: 0x786058,
				tooltip: [0xd5ccc8, 0x300058],
				scrollbar: 0xd8d0c8,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Pumpkin",
			"Pumpkin (large)",
			{
				face: 0xf0d4a0,
				hilight: 0xb88850,
				title: [0xd7a52f, 0xde9f2c],
				window: 0xffffff,
				text: 0x000000,
				gray: 0xde9f2c,
				tooltip: [0xffffff, 0x800080],
				scrollbar: 0xf8eacf,
			},
			{
				scroll: 21,
				caption: 26,
				small: 22,
				menu: 22,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 19, 700],
		],
		[
			"windows98RainyDay",
			"Rainy Day",
			{
				face: 0x8098b0,
				hilight: 0x506478,
				title: [0x506480, 0x4e657c],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x4e657c,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xc0ccd8,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98RedWhiteBlue",
			"Red, White, and Blue (VGA)",
			{
				face: 0xc0c0c0,
				hilight: 0x800000,
				title: [0x800000, 0x800000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffff, 0x000080],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 13,
				caption: 19,
				small: 17,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["Times New Roman", 15, 700],
		],
		[
			"windows98Rose",
			"Rose",
			{
				face: 0xcfafb7,
				hilight: 0x9f6070,
				title: [0x9f6070, 0x9f6070],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x9f6070,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xcfafb7,
			},
			{
				scroll: 15,
				caption: 23,
				small: 17,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["Times New Roman", 19, 400],
		],
		[
			"windows98RoseLarge",
			"Rose (large)",
			{
				face: 0xd0b0b8,
				hilight: 0xa06070,
				title: [0xa06070, 0x9f6070],
				window: 0xffffff,
				text: 0x000000,
				gray: 0xa06070,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 17,
				caption: 28,
				small: 21,
				menu: 22,
				border: 2,
				solidTrack: 1,
			},
			["Times New Roman", 23, 400],
		],
		[
			"windows98Slate",
			"Slate",
			{
				face: 0x9db9c8,
				hilight: 0x558097,
				title: [0x558097, 0x558097],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x558097,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xcedce3,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Spruce",
			"Spruce",
			{
				face: 0xa2c8a9,
				hilight: 0xa0a848,
				title: [0x599764, 0x599764],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x599764,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xd0e3d3,
			},
			{
				scroll: 15,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 12, 700],
		],
		[
			"windows98Storm",
			"Storm (VGA)",
			{
				face: 0xc0c0c0,
				hilight: 0x800080,
				title: [0x800080, 0x800080],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffff, 0x800080],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["Arial", 11, 700],
		],
		[
			"windows98Teal",
			"Teal (VGA)",
			{
				face: 0xc0c0c0,
				hilight: 0x008080,
				title: [0x008080, 0x008080],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98Wheat",
			"Wheat",
			{
				face: 0xe0e0a0,
				hilight: 0x808000,
				title: [0x808000, 0x808000],
				window: 0xffffff,
				text: 0x000000,
				gray: 0xc0c03f,
				tooltip: [0xffffff, 0x000000],
				scrollbar: 0xf0f0d0,
			},
			{
				scroll: 13,
				caption: 18,
				small: 15,
				menu: 18,
				border: 1,
				solidTrack: 1,
			},
			["MS Sans Serif", 11, 700],
		],
		[
			"windows98ExtraLarge",
			"Windows Standard (extra large)",
			{
				face: 0xc0c0c0,
				hilight: 0x000080,
				title: [0x000080, 0x1084d0],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffe1, 0x000000],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 21,
				caption: 24,
				small: 18,
				menu: 21,
				border: 1,
				solidTrack: 0,
			},
			["Arial", 19, 700],
		],
		[
			"windows98Large",
			"Windows Standard (large)",
			{
				face: 0xc0c0c0,
				hilight: 0x000080,
				title: [0x000080, 0x1084d0],
				window: 0xffffff,
				text: 0x000000,
				gray: 0x808080,
				tooltip: [0xffffe1, 0x000000],
				scrollbar: 0xc0c0c0,
			},
			{
				scroll: 18,
				caption: 22,
				small: 18,
				menu: 18,
				border: 1,
				solidTrack: 0,
			},
			["MS Sans Serif", 16, 700],
		],
	];
	const MS_SANS_SERIF_HEIGHTS = [11, 13, 16, 18, 24, 32];

	it("pins every scheme's colors, metrics and caption font to Windows 98 SE's own", () => {
		expect(SCHEMES).toHaveLength(33);
		for (const [id, name, colors, metrics, [face, height, weight]] of SCHEMES) {
			const theme = windows98Json.presets.find((t) => t.id === id);
			expect(theme?.name, id).toBe(name);
			if (!theme) continue;
			const c = theme.color;
			const f = c.families;
			expect(
				{
					face: c.system[2],
					hilight: c.highlight,
					title: [f.titleBar.active, f.titleBar.activeGradient],
					window: c.window.document,
					text: c.black,
					gray: f.text.gray,
					tooltip: [f.tooltip.face, f.tooltip.text],
					scrollbar: f.scrollBar.track,
				},
				id,
			).toEqual(colors);
			const m = theme.measurements;
			expect(
				{
					scroll: m.window.scrollbarSize,
					caption: m.window.titleBarHeight,
					small: m.window.utilityTitleBarHeight,
					menu: m.menuBar.titleHeight,
					border: m.sizingBorder.width,
					solidTrack: m.scrollBar.solidTrack,
				},
				id,
			).toEqual(metrics);
			// SM_CXSIZE - 2 by SM_CYSIZE - 4, Windows' caption buttons.
			expect(m.titleBar.buttonWidth, id).toBe(metrics.caption - 2);
			expect(m.titleBar.buttonHeight, id).toBe(metrics.caption - 4);
			const caption = theme.typography.families.caption;
			expect(caption.weight, id).toBe(weight >= 600 ? 700 : 400);
			if (face === "MS Sans Serif") {
				expect(caption.size, id).toBe(
					MS_SANS_SERIF_HEIGHTS.filter((h) => h <= height).at(-1) ?? 11,
				);
				expect(caption.font, id).toMatch(
					caption.size === 11
						? /^"Pixelated MS Sans Serif", "MS Sans Serif"/
						: /^"MS Sans Serif"/,
				);
			} else {
				expect(caption.size, id).toBe(height);
				expect(caption.font.replaceAll('"', ""), id).toMatch(
					new RegExp(`^${face},`),
				);
			}
		}
	});

	// The four High Contrast schemes, in High Contrast's colors (the 98.js
	// report's section 5): High Contrast Black's frame (ButtonHilight 192,
	// ButtonShadow 128, ButtonDkShadow white, a yellow ActiveBorder), its
	// green GrayText; High Contrast #1's yellow WindowText beside white
	// ButtonText; High Contrast White's labels black on its white desktop.
	it("draws the High Contrast schemes in High Contrast's colors", () => {
		const theme = (id: string) => {
			const found = windows98Json.presets.find((t) => t.id === id);
			if (!found) throw new Error(id);
			return found;
		};
		const black = theme("windows98HighContrastBlack");
		expect(black.color.system).toEqual([
			0xc0c0c0,
			0xd0b0b8,
			BLACK,
			0x404040,
			BUTTON_SHADOW,
			0xc0c0c0,
			WHITE,
		]);
		expect(black.color.window.border).toBe(WHITE);
		expect(black.color.families.sizingBorder).toEqual({
			active: 0xffff00,
			inactive: 0x008000,
		});
		expect(black.color.families.text.gray).toBe(0x00ff00);
		expect(black.color.families.desktop.text).toBe(WHITE);
		const one = theme("windows98HighContrast1");
		expect(one.color.black).toBe(0xffff00);
		expect(one.color.families.text.button).toBe(WHITE);
		const white = theme("windows98HighContrastWhite");
		expect(white.desktop.backgroundColor).toBe(WHITE);
		expect(white.color.families.desktop.text).toBe(BLACK);
		// The (large) and (extra large) versions take their base's colors.
		for (const size of ["Large", "ExtraLarge"])
			for (const base of ["1", "2", "Black", "White"])
				expect(
					theme(`windows98HighContrast${base}${size}`).color,
					`${base}${size}`,
				).toEqual(theme(`windows98HighContrast${base}`).color);
		expect(
			theme("windows98HighContrastBlackLarge").measurements.sizingBorder,
		).toEqual({
			width: 6,
		});
	});

	// Each scheme's fonts: the caption, small caption, menu, message box and
	// icon fonts, Arial and Times New Roman where Windows 98 named them, the
	// pixel face only for MS Sans Serif's 8-point size; the icon font's size
	// is the desktop's label size.
	it("gives each scheme Windows 98's fonts, the pixel face only at MS Sans Serif 8", () => {
		const theme = (id: string) => {
			const found = windows98Json.presets.find((t) => t.id === id);
			if (!found) throw new Error(id);
			return found;
		};
		expect(theme("windows98").typography.families).toEqual({
			caption: { font: PIXEL_STACK, size: 11, weight: 700 },
			smallCaption: { font: PIXEL_STACK, size: 11, weight: 700 },
			menu: { font: PIXEL_STACK, size: 11, weight: 400 },
			message: { font: PIXEL_STACK, size: 11, weight: 400 },
			icon: { font: PIXEL_STACK, weight: 400 },
		});
		expect(theme("windows98Eggplant").typography.families.menu).toEqual({
			font: '"Times New Roman", Times, serif',
			size: 13,
			weight: 400,
		});
		expect(theme("windows98Rose").typography.families.caption).toEqual({
			font: '"Times New Roman", Times, serif',
			size: 19,
			weight: 400,
		});
		expect(theme("windows98Marine").typography.families.smallCaption).toEqual({
			font: '"Small Fonts", Arial, sans-serif',
			size: 9,
			weight: 700,
		});
		expect(theme("windows98Pumpkin").typography.families.caption).toEqual({
			font: '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif',
			size: 18,
			weight: 700,
		});
		expect(theme("windows98ExtraLarge").desktop.iconFontSize).toBe(16);
		expect(theme("windows98ExtraLarge").typography.families.icon.font).toBe(
			"Arial, Helvetica, sans-serif",
		);
		for (const t of windows98Json.presets) {
			expect(t.typography.ui, t.id).toBe(PIXEL_STACK);
			expect(t.typography.uiSize, t.id).toBe(11);
			expect(t.desktop.iconSize, t.id).toBe(32);
			expect(t.measurements.dither.tileSize, t.id).toBe(0);
			expect(t.measurements.window.borderSize, t.id).toBe(1);
			// IconSpacing 75 both ways (Wine sysparams.c, 1125 twips).
			expect(t.measurements.desktopIconGrid, t.id).toEqual({
				rowGap: 43,
				columnGap: 43,
			});
		}
		expect(Object.keys(windows98Json.fontFamilies)).toEqual([
			"caption",
			"smallCaption",
			"menu",
			"message",
			"icon",
		]);
	});

	// Windows 95 keeps its shipped palette (Windows Standard's with ButtonLight
	// on the face, flat captions) and Windows Standard's metrics and fonts,
	// and its toolbars' buttons are raised at rest (Figure 7.34; the audit's
	// 7.23); every Windows 98 scheme keeps the flat ones (TBSTYLE_FLAT).
	it("raises Windows 95's toolbar buttons at rest and no other scheme's", () => {
		const [standard, win95] = windows98Json.presets;
		expect(win95.color.system[1]).toBe(BUTTON_FACE);
		expect(win95.measurements.window).toEqual(standard.measurements.window);
		expect(win95.typography).toEqual(standard.typography);
		for (const theme of windows98Json.presets)
			expect(theme.measurements.toolbar.restBevel, theme.id).toBe(
				theme.id === "windows95" ? 1 : 0,
			);
		expect(windows98Json.knobs.toolbar.restBevel).toMatchObject({
			min: 0,
			max: 1,
			default: 0,
		});
	});

	// The fonts and the new knobs reach the desktop as package variables.
	it("emits each scheme's fonts and its track, toolbar and border knobs", async () => {
		await import("./index");
		const vars = getThemeVars(getTheme("windows98Brick") as ClassicyTheme);
		expect(vars).toMatchObject({
			"--package-font-caption": "Arial, Helvetica, sans-serif",
			"--package-font-caption-size": "12px",
			"--package-font-caption-weight": "700",
			"--package-font-menu-size": "11px",
			"--package-font-small-caption-weight": "400",
			"--package-color-scroll-bar-track": "#e1e0d2",
			"--package-color-text-gray": "#8d8961",
			"--scroll-bar-solid-track": "1px",
			"--toolbar-rest-bevel": "0px",
			"--sizing-border-width": "1px",
			"--menu-bar-title-height": "18px",
			"--window-scrollbar-size": "13px",
		});
		// The icon font's size is the theme's desktop.iconFontSize.
		expect(vars).not.toHaveProperty("--package-font-icon-size");
		expect(getThemeVars(getTheme("windows95") as ClassicyTheme)).toMatchObject({
			"--toolbar-rest-bevel": "1px",
		});
	});

	// Windows keeps a window's scroll bars drawn, disabled, where its content
	// fits (Notepad's, say), so the bars stay in the `fits` state; its Open
	// and Save As dialogs are titled, movable boxes showing one folder at a
	// time under a pop-up that runs the path upward (Look in), and Save As
	// opens with the file name selected (WIG Ch.8 "Open Dialog Box" and
	// "Save As Dialog Box", pp.155-157, Figures 8.6 and 8.7); and a centered
	// dialog or alert lands on whole pixels, so its one-pixel bevels and
	// glyphs stay on the grid (`window.centering`, the audit's 8.8; WIG Ch.8
	// "Window Placement", p.147; Ch.13 "Design of Graphic Images", p.313).
	// An open menu stays until the next click (`menuBar.idleTimeoutMs` 0, the
	// audit's 7.6 / 14.4; WIG Ch.7 "Drop-down Menu Interaction", p.97; Ch.14
	// "Timing and Navigational Interfaces", p.333), a cascading menu opens
	// and closes after Windows' 400 ms time-out (`menu.submenuDelayMs`, 7.12;
	// WIG Ch.7 "Cascading Menus", pp.104-105), and the keyboard browses a
	// dimmed item like any other (`menu.disabledItems`, 7.7; WIG Ch.7 "Menu
	// Items", p.107). Every titled item and every label of a focusable
	// control takes an access key of its own (`menu.accessKeys` "auto", 7.1
	// and 8.9; WIG Ch.4 "Access Keys", p.27; Ch.7 "Menu Titles", p.106), a
	// menu's shortcuts are spelled Ctrl+S (`menu.shortcutSpelling` "names",
	// 7.15; WIG Ch.7 "Shortcut Keys in Menu Items", p.110), and an empty
	// submenu shows a dimmed "(Empty)" (`menu.emptySubmenus` "placeholder",
	// as Windows 98's Start menu does). A bare Right Arrow expands a tree's
	// branch and a bare Left Arrow collapses it (`tree.keys` "windows", the
	// audit's 7.21; WIG Ch.7 "Tree View Controls", pp.123-124), and help
	// shows as a ToolTip below and right of the resting pointer, gone on a
	// press (`balloonHelp.placement` "pointer", 7.27; WIG Ch.7 "Tooltip
	// Controls", p.133); the file dialogs' flat list flows in columns
	// (`fileDialog.listFlow` "columns"; WIG Ch.8 Figure 8.6), the icon view
	// takes Explorer's selection keys (`fileBrowser.keys` "windows"; WIG
	// Ch.5 "Selection"), and file lists put folders first
	// (`fileList.foldersFirst`, as Explorer sorts). Its menus take Windows'
	// keyboard (`menu.keys` "windows"; WIG Ch.7 pp.97-98, 101), Shift+F10 and
	// the Application key open the focused element's contextual menu
	// (`keyboard.contextMenuKey`; Appendix B Table B.2), a Command
	// equivalent answers to Control alone, never the Windows key
	// (`keyboard.command` "ctrl", 4.19; WIG Ch.4 "Shortcut Keys", p.28;
	// App. B Table B.3), and Finder's item
	// menus lead with Open, their default (`finder.commands` "windows"; WIG
	// Ch.7 "Icon Pop-up Menus", pp.102-103). Button 2 selects what it
	// presses on, keeping a selection it presses inside
	// (`selection.secondaryButton` "select", the audit's 5.6 / 11.3 / A.3;
	// WIG Ch.5 "Selection with the Mouse", pp.37-38), and its menu opens at
	// the release (`contextMenu.openOn` "release", 5.7; p.38); lists, tables
	// and trees select at the press (`selection.selectOn` "press", 5.5 /
	// A.2; pp.37-38), a drag across a list's rows selects them
	// (`selection.dragRange`, 5.3; pp.37-39), and Control with Shift keeps
	// the other selections while a double-click opens the whole selection
	// (`selection.modifiers` "windows", 5.9 / A.9; p.39; App. A Tables A.2
	// and A.3); Page Up and Page Down move a list's keyboard row a screen
	// (`selection.pageKeys` "move", 5.2 / B.3; Table 5.1, pp.35-36), Space
	// selects a table's row, Control with a navigation key moves the
	// keyboard row alone and Shift+F8 takes Add mode
	// (`selection.keyboard` "windows", 5.16 / 5.18; pp.43-44), and Control
	// with an arrow scrolls a tree (`tree.keys` "windows", B.3; App. B
	// Table B.1, p.357); a drag of the icon view's selection carries all of
	// it (`fileBrowser.iconSelection` "view", 5.8 / 5.22 / A.1; WIG Ch.5
	// p.44, p.66), the list view takes a selection rectangle and either
	// view's scrolls the window (`fileBrowser.regionSelect`, 5.12; p.42),
	// and an icon view is one Tab stop (`selection.iconNavigation`
	// "roving", 5.17; Table 5.1, pp.35-36); a tab is
	// chosen at the press, an icon waits 4 px before it moves and only
	// button 1 drags (`mouse` "windows", 4.8-4.10; WIG Ch.4 "Mouse
	// Actions", pp.24-25); and Escape takes a drag back
	// (`input.escapeCancels`, 1.18 / 4.16; WIG Ch.1 "Forgiveness",
	// pp.2-3; Ch.4 "Shortcut Keys", p.27).
	it("lays the desktop out as Windows did: icons from the top left, the menu bar on the screen, menus on Windows' keys, kept open and cascades on a time-out, the context-menu keys, Command equivalents on Control alone, Explorer's Open first, access keys on every title, item and label, shortcuts spelled by name, scroll bars kept where the content fits and their thumbs snapping back past Windows' rectangle, one folder at a time in the file dialogs, flowing in columns, Explorer's selection keys, folders before files, dialogs centered on whole pixels, trees on the bare arrows, ToolTips at the pointer, button 2 selecting and its menus at the release, lists selecting at the press and across a drag, Control with Shift adding a range and a double-click opening the selection, the page keys moving a list's row, Space, Control and Add mode building a selection, a drag carrying the icon view's selection, the list view's selection rectangle, one Tab stop for the icons, Windows' press discipline, Escape taking a drag back", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("windows98")?.layout).toEqual({
			window: { growBoxCorner: "bottom-right", centering: "wholePixel" },
			menuBar: { placement: "screen", idleTimeoutMs: 0 },
			menu: {
				keys: "windows",
				submenuDelayMs: 400,
				disabledItems: "browse",
				accessKeys: "auto",
				shortcutSpelling: "names",
				emptySubmenus: "placeholder",
			},
			desktop: { iconGridOrigin: "top-left" },
			scrollBar: {
				fitsBars: "shown",
				liveSnapBack: true,
				snapBackScale: { across: 8, along: 2 },
			},
			fileDialog: {
				frame: "movable",
				navigation: "flat",
				saveName: "selected",
				listFlow: "columns",
			},
			keyboard: { contextMenuKey: true, command: "ctrl" },
			finder: { commands: "windows" },
			files: { names: "windows" },
			fileBrowser: {
				keys: "windows",
				iconSelection: "view",
				regionSelect: true,
			},
			fileList: { foldersFirst: true },
			tree: { keys: "windows" },
			balloonHelp: { placement: "pointer" },
			selection: {
				secondaryButton: "select",
				selectOn: "press",
				dragRange: true,
				modifiers: "windows",
				pageKeys: "move",
				keyboard: "windows",
				iconNavigation: "roving",
			},
			contextMenu: { openOn: "release" },
			mouse: "windows",
			input: { escapeCancels: true },
		});
	});

	// The core's `dialog` family is structural (every theme emits it from the
	// core floor); the package sets the two widths Windows caps a secondary
	// window at, 234 dialog base units, 415 px (WIG Ch.13 "Font and Size",
	// p.311; the audit's 8.10), so a message box or input dialog never grows
	// to the core's 460. The family's other keys stay the floor's.
	it("caps the alert and input dialogs at the WIG's 415 px in every theme", async () => {
		await import("./index");
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			expect(theme.measurements.dialog, theme.id).toEqual({
				alertMaxWidth: 415,
				inputMaxWidth: 415,
			});
		expect(getThemeVars(getTheme("windows98") as ClassicyTheme)).toMatchObject({
			"--dialog-alert-max-width": "415px",
			"--dialog-input-max-width": "415px",
			"--dialog-alert-min-width": "280px",
			"--dialog-keyboard-equivalent-max-width": "420px",
		});
	});

	// A ToolTip at the pointer stands under the arrow cursor: 20 px below the
	// pointer's hot spot, as TOOLTIPS_Show places it (Wine's tooltips.c; the
	// audit's 7.27; WIG Ch.7 "Tooltip Controls", p.133), in every theme. The
	// core places the box at the hot spot; `_BalloonHelp.scss` reads this.
	it("sets the ToolTip 20 px under the pointer in every theme", async () => {
		await import("./index");
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			expect(theme.measurements.tooltip, theme.id).toEqual({
				paddingX: 4,
				paddingY: 2,
				pointerOffset: 20,
			});
		expect(getThemeVars(getTheme("windows98") as ClassicyTheme)).toMatchObject({
			"--tooltip-pointer-offset": "20px",
		});
	});

	// The menu frame is `b.window-frame` from `--window-border-size`, so the
	// `menuFrame` family (Platinum's menu border, bevel and shadow knobs) is
	// read by nothing in this package: no theme declares it, the Options tab
	// does not offer it, and no `--menu-frame-*` variable is emitted for a
	// Windows 98 theme (the family is not in the core floor).
	it("declares no menuFrame family and emits no --menu-frame-* variable", async () => {
		await import("./index");
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			expect(theme.measurements, theme.id).not.toHaveProperty("menuFrame");
		expect(windows98Json.knobs).not.toHaveProperty("menuFrame");
		const vars = getThemeVars(getTheme("windows98") as ClassicyTheme);
		expect(
			Object.keys(vars).filter((name) => name.startsWith("--menu-frame-")),
		).toEqual([]);
	});

	// The pack: four alert tones synthesized for the package (Windows' own
	// sounds are Microsoft's), Ding the default, and the beep.
	it("registers its sound pack, which every theme names", async () => {
		await import("./index");
		const pack = getClassicySoundPack("windows98");
		expect(listClassicySoundPacks().map((p) => p.id)).toEqual(["windows98"]);
		expect(pack?.alerts?.map((a) => a.value)).toEqual([
			"ClassicyAlertChimes",
			"ClassicyAlertChord",
			"ClassicyAlertDing",
			"ClassicyAlertExclamation",
		]);
		expect(pack?.defaultAlert).toBe("ClassicyAlertDing");
		expect(Object.keys(pack?.sprite ?? {}).sort()).toEqual([
			"ClassicyAlertChimes",
			"ClassicyAlertChord",
			"ClassicyAlertDing",
			"ClassicyAlertExclamation",
			"ClassicyBeep",
		]);
		expect(getClassicyAppearancePackage("windows98")?.sounds).toEqual([pack]);
	});

	it("registers no fonts, no screen saver and no hooks", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		expect(document.getElementById("classicy-fonts-windows98")).toBeNull();
		expect(pkg?.defaultScreenSaver).toBeUndefined();
		expect(pkg?.hooks).toBeUndefined();
	});

	// A disabled control's image embossed in the scheme's ButtonHilight and
	// ButtonShadow (DrawState's DSS_DISABLED, the 98.js report's 2.7), the
	// one dimming rule the package declares; Load Theme… reading Windows
	// `.theme` files (2.10); the scheme fonts' labels for the Fonts tab.
	it("embosses disabled controls' images, reads .theme files and labels its fonts", async () => {
		const { readWindows98ThemeFile } = await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		expect(pkg?.iconDimming).toEqual({
			disabledControl: {
				emboss: {
					highlight: { colorKey: "system", index: 0 },
					shadow: { colorKey: "system", index: 4 },
				},
			},
		});
		expect(pkg?.themeFileImporter?.extensions).toEqual([".theme"]);
		expect(pkg?.themeFileImporter?.read).toBe(readWindows98ThemeFile);
		expect(pkg?.fontFamilies).toEqual({
			caption: { label: "Active title bar" },
			smallCaption: { label: "Palette title" },
			menu: { label: "Menu" },
			message: { label: "Message box" },
			icon: { label: "Icon" },
		});
	});

	// The exported data is a frozen copy: editing it edits no registered theme.
	it("exports its theme data deep-frozen", async () => {
		const { windows98Json: exported } = await import("./index");
		expect(Object.isFrozen(exported)).toBe(true);
		expect(Object.isFrozen(exported.presets[0].color)).toBe(true);
		expect(exported.presets[0]).not.toBe(
			getClassicyAppearancePackage("windows98")?.presets?.[0],
		);
	});
});
