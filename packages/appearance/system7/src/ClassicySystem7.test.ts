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
import { classicyThemeMeasurementDefaults } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	getClassicySoundPack,
	listClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import system7Json from "./system7.json";

// The System 7 package registers on import (plan 0018-dbd §2.2): package
// `system7` with its two themes, its layout, its fonts and its sound pack,
// alone, with no other package registered (the test setup registers none).

const BLACK = 0x000000;
const WHITE = 0xffffff;

const allColors = (color: (typeof system7Json.presets)[number]["color"]) => [
	color.outline,
	color.select,
	color.highlight,
	color.black,
	color.white,
	color.alert,
	color.error,
	...color.system,
	...color.theme,
	...Object.values(color.window),
];

describe("the System 7 appearance package", () => {
	it("registers package system7 on import, alone and without an error", async () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		expect(pkg?.name).toBe("System 7");
		expect(listClassicyAppearancePackages().map((p) => p.id)).toEqual([
			"system7",
		]);
		expect(log).not.toHaveBeenCalledWith(
			"error",
			expect.anything(),
			expect.anything(),
		);
		log.mockRestore();
		// The first import loads the whole core barrel cold (see
		// ClassicyPlatinum.test.ts).
	}, 30_000);

	it("passes the package schema, defaults.package included", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		const parsed = ClassicyAppearancePackageSchema.safeParse(pkg);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
		expect(pkg?.defaults.package).toBe("system7");
		expect(typeof pkg?.css).toBe("string");
		expect(pkg?.knobs).toEqual({});
	});

	it("registers the two themes, the black-and-white one the defaults", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		expect(pkg?.presets?.map((t) => [t.id, t.name])).toEqual([
			["system7", "System 7"],
			["system7-color", "System 7 Color"],
		]);
		expect(pkg?.defaults).toBe(pkg?.presets?.[0]);
		expect(pkg?.presets).toEqual(getAllThemes());
		expect(getTheme("system7-color")).toBe(pkg?.presets?.[1]);
		for (const theme of pkg?.presets ?? [])
			expect(theme.package).toBe("system7");
	});

	// Design 0017-6me, "Per-theme art": the 1-bit theme draws the `bw`
	// variant of the package's assets, the color theme the base tree.
	it("names the bw asset variant on System 7 and none on System 7 Color", async () => {
		await import("./index");
		const [bw, color] = getClassicyAppearancePackage("system7")?.presets ?? [];
		expect(bw?.assetVariant).toBe("bw");
		expect(color?.assetVariant).toBeUndefined();
	});

	it("draws the 1-bit theme in black and white only, dithered", () => {
		const [bw] = system7Json.presets;
		expect(new Set(allColors(bw.color))).toEqual(new Set([BLACK, WHITE]));
		expect(bw.measurements.dither.tileSize).toBe(2);
	});

	// The desktop's flat color, under the theme's pattern (its desktop picture,
	// System7DesktopPicture.test.ts) and alone when a user picks no picture,
	// and the startup screen's: the pattern's light cell, white in 1-bit and
	// #AAAAAA (system-04) in color.
	it("sets the desktop's flat color to the pattern's light cell", () => {
		const [bw, color] = system7Json.presets;
		expect(bw.desktop.backgroundColor).toBe(WHITE);
		expect(color.desktop.backgroundColor).toBe(color.color.system[3]);
		expect(color.color.system[3]).toBe(0xaaaaaa);
	});

	// The Standard window colors as System 7.5 draws them at 256 colors
	// (docs/system7-reference-screenshots.md, MWD 4): the title-bar face,
	// bevel and stripes, the boxes' ink and fills, the inactive frame and
	// title, the windoid's dots; true gray, no dither. The slots the window
	// chrome reads are the ones named in styles/components/_Window.scss;
	// system-01 is the scroll track and arrow-box face (#DDDDDD) and system-02
	// the modal dialog frame's gray band (#BBBBBB), as the captures show them
	// (plan 0018-dbd §4.2), for the looks still to come.
	it("draws the color theme with the 7.5 Standard window colors", () => {
		const [, color] = system7Json.presets;
		expect(color.color.system).toEqual([
			0xdddddd, 0xbbbbbb, 0xbbbbbb, 0xaaaaaa, 0x888888, 0x777777, 0x555555,
		]);
		expect(color.color.theme).toEqual([
			0xeeeeee, 0xccccff, 0x9999cc, 0x666699, 0x333333, 0x888888, 0x333366,
		]);
		expect(color.color.window).toEqual({
			border: BLACK,
			borderOutset: 0xccccff,
			borderInset: 0x9999cc,
			frame: WHITE,
			title: BLACK,
			document: WHITE,
		});
		expect(color.color.highlight).toBe(BLACK);
		expect(color.measurements.dither.tileSize).toBe(0);
	});

	// System 7.5's Standard color tables (System `wctb` 0 and `cctb` 0, plan
	// 0018-dbd §4.2; docs/system7-asset-inventory.md, "Window colors"): the
	// content, frame and text entries are the window's own slots, and the two
	// tinges, #CCCCFF and #333366, end a lavender ramp the window and control
	// definitions draw in thirds, which the theme holds in theme-02, -03, -04
	// and -07 (every tinge the 256-color captures show).
	it("takes its window slots and tinge ramp from the Standard wctb and cctb", () => {
		const [, color] = system7Json.presets;
		const wctb = {
			wContentColor: WHITE,
			wFrameColor: BLACK,
			wTextColor: BLACK,
			wDialogLight: 0xccccff,
			wTingeLight: 0xccccff,
			wTingeDark: 0x333366,
		};
		const cctb = { cTingeLight: 0xccccff, cTingeDark: 0x333366 };
		expect(color.color.window.document).toBe(wctb.wContentColor);
		expect(color.color.window.border).toBe(wctb.wFrameColor);
		expect(color.color.window.title).toBe(wctb.wTextColor);
		expect(color.color.window.borderOutset).toBe(wctb.wTingeLight);
		expect(cctb.cTingeLight).toBe(wctb.wTingeLight);
		expect(cctb.cTingeDark).toBe(wctb.wTingeDark);
		const channels = (rgb: number) => [
			rgb >> 16,
			(rgb >> 8) & 0xff,
			rgb & 0xff,
		];
		const third = (light: number, dark: number, n: number) =>
			channels(light)
				.map((c, i) => Math.round((c * (3 - n) + channels(dark)[i] * n) / 3))
				.reduce((rgb, c) => (rgb << 8) | c, 0);
		const ramp = [0, 1, 2, 3].map((n) =>
			third(wctb.wTingeLight, wctb.wTingeDark, n),
		);
		expect(ramp).toEqual([0xccccff, 0x9999cc, 0x666699, 0x333366]);
		const { theme } = color.color;
		expect([theme[1], theme[2], theme[3], theme[6]]).toEqual(ramp);
		expect(color.color.window.borderInset).toBe(ramp[1]);
	});

	// The slots the window chrome reads hold, in the 1-bit theme, the black
	// or white the 1-bit captures show for the color theme's value (the box
	// ring's lower and right sides black, the bevel and fills white).
	it("maps each window-chrome slot to black or white in the 1-bit theme", () => {
		const [bw] = system7Json.presets;
		expect(bw.color.window.borderOutset).toBe(BLACK);
		expect(bw.color.window.borderInset).toBe(WHITE);
		expect(bw.color.theme.slice(0, 2)).toEqual([WHITE, WHITE]);
		expect(bw.color.theme.slice(4)).toEqual([BLACK, BLACK, BLACK]);
		expect(bw.color.system.slice(2)).toEqual([
			WHITE,
			WHITE,
			BLACK,
			BLACK,
			BLACK,
		]);
	});

	// HIG p.207, p.88: Chicago 12 for interface text, Geneva 9 for small text
	// and icon labels; 32 px icons.
	it("sets Chicago 12, Geneva 9 and 32 px icons in both themes", () => {
		for (const theme of system7Json.presets) {
			expect(theme.typography.ui).toMatch(/^"ChicagoFLF"/);
			expect(theme.typography.uiSize).toBe(12);
			expect(theme.typography.body).toMatch(/^"Geneva"/);
			expect(theme.typography.bodySize).toBe(9);
			expect(theme.desktop.iconSize).toBe(32);
			expect(theme.desktop.iconFontSize).toBe(9);
		}
	});

	// The windoid's 13-row bar is Apple Guide's (`*-floating-appleguide.png`),
	// with its 9 px close box (the bar less two borders above and below).
	it("sets System 7's window metrics: 11 px boxes, a 16 px scroll bar, a 19 px title bar", () => {
		for (const theme of system7Json.presets)
			expect(theme.measurements.window).toEqual({
				borderSize: 1,
				controlSize: 11,
				paddingSize: 6,
				scrollbarSize: 16,
				titleBarHeight: 19,
				utilityTitleBarHeight: 13,
			});
	});

	// The window chrome's knobs (styles/components/_Window.scss), measured
	// from the 7.5 captures: the stripes and the gaps around the boxes and
	// the title are the same at both depths; the boxes' bevel and the size
	// box's squares differ by a pixel between them.
	it("emits the window chrome's knobs, the 1-bit theme without bevels", async () => {
		await import("./index");
		const [bw, color] = (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[];
		const vars = (theme: ClassicyTheme | undefined) =>
			theme ? getThemeVars(theme) : {};
		for (const theme of [bw, color])
			expect(vars(theme)).toMatchObject({
				"--title-bar-stripe-inset": "1px",
				"--title-bar-stripe-height": "1px",
				"--title-bar-stripe-period": "2px",
				"--title-bar-box-margin": "8px",
				"--title-bar-box-gap": "1px",
				"--title-bar-title-gap": "6px",
				"--title-bar-title-top": "2px",
				"--window-box-pixel": "1px",
				"--window-box-zoom-glyph": "7px",
				"--grow-box-small-offset": "2px",
				"--grow-box-large-size": "9px",
				"--utility-title-bar-box-margin": "3px",
				"--utility-title-bar-dot-inset": "3px",
				"--utility-title-bar-texture-width": "3px",
				"--window-utility-control-box-size": "9px",
			});
		expect(vars(bw)).toMatchObject({
			"--window-box-bevel": "0px",
			"--grow-box-small-size": "7px",
			"--grow-box-large-offset": "4px",
		});
		expect(vars(color)).toMatchObject({
			"--window-box-bevel": "1px",
			"--grow-box-small-size": "6px",
			"--grow-box-large-offset": "3px",
		});
	});

	// The dimmed ink (styles/components/_Menu.scss): theme-06, the one slot
	// System 7 draws nothing else with, is the 7.5 dimmed menu text's #888888
	// in color and black in 1-bit, where the dither draws it at 50%.
	it("dedicates theme-06 to the dimmed ink: gray in color, black dithered in 1-bit", () => {
		const [bw, color] = system7Json.presets;
		expect(color.color.theme[5]).toBe(0x888888);
		expect(bw.color.theme[5]).toBe(BLACK);
		expect(bw.measurements.dither.tileSize).toBe(2);
		expect(color.measurements.dither.tileSize).toBe(0);
	});

	// The menus' knobs (styles/components/_Menu.scss, _MenuBar.scss,
	// _PopUpMenu.scss), measured from the 7.5 menu captures, the same at both
	// depths; and the menu bar's 20 px band, which windows keep clear of.
	it("emits the menus' knobs and a 20 px menu bar in both themes", async () => {
		await import("./index");
		for (const theme of (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[])
			expect(getThemeVars(theme)).toMatchObject({
				"--menu-bar-height": "20px",
				"--menu-bar-inset": "9px",
				"--menu-bar-title-padding": "10px",
				"--menu-bar-title-overlap": "5px",
				"--menu-bar-highlight-top": "1px",
				"--menu-bar-line-height": "16px",
				"--menu-frame-shadow-start": "2px",
				"--menu-frame-submenu-overlap": "5px",
				"--menu-item-height": "16px",
				"--menu-item-line-height": "14px",
				"--menu-item-text-inset": "14px",
				"--menu-item-text-end": "14px",
				"--menu-item-mark-inset": "3px",
				"--menu-item-mark-top": "4px",
				"--menu-item-shortcut-width": "22px",
				"--menu-item-arrow-inset": "8px",
				"--menu-item-arrow-top": "2px",
				"--menu-item-divider-top": "8px",
				"--menu-item-image-size": "16px",
				"--menu-item-image-pad": "1px",
				"--menu-item-image-gap": "4px",
				"--pop-up-menu-height": "18px",
				"--pop-up-menu-arrow-top": "5px",
				"--pop-up-menu-arrow-inset": "5px",
			});
	});

	// The dialogs', alerts' and push buttons' knobs (styles/components/
	// _Dialog.scss, _Alert.scss, _Button.scss and the window header in
	// _Window.scss), measured from the 7.5 captures. The modal frame differs
	// by depth: no bevels and a two-pixel white band and black line in 1-bit,
	// three one-pixel rings and a one-pixel line in color.
	it("emits the dialogs', alerts' and push buttons' knobs", async () => {
		await import("./index");
		const [bw, color] = (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[];
		for (const theme of [bw, color])
			expect(getThemeVars(theme)).toMatchObject({
				"--title-bar-modal-stripe-inset": "2px",
				"--dialog-frame-inset": "13px",
				"--alert-layout-icon-top": "13px",
				"--alert-layout-icon-inset": "23px",
				"--alert-layout-text-top": "12px",
				"--alert-layout-text-gap": "21px",
				"--alert-layout-edge": "13px",
				"--alert-layout-line-height": "16px",
				"--push-button-line-height": "16px",
				"--push-button-text-lift": "2px",
				"--window-header-height": "17px",
				"--window-header-rule": "3px",
				"--button-default-ring": "3px",
			});
		expect(getThemeVars(bw)).toMatchObject({
			"--dialog-frame-bevel": "0px",
			"--dialog-frame-band": "2px",
			"--dialog-frame-line": "2px",
		});
		expect(getThemeVars(color)).toMatchObject({
			"--dialog-frame-bevel": "1px",
			"--dialog-frame-band": "1px",
			"--dialog-frame-line": "1px",
		});
	});

	// The controls' knobs (styles/components/_Checkbox.scss, _LittleArrows.scss,
	// _TextField.scss, _ListBox.scss), measured from the 7.5 captures: the
	// same at both depths, since the HIG draws controls black on white in
	// color too (p.259).
	it("emits the controls' knobs, the same in both themes", async () => {
		await import("./index");
		const [bw, color] = (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[];
		for (const theme of [bw, color])
			expect(getThemeVars(theme)).toMatchObject({
				"--check-box-size": "12px",
				"--check-box-label-gap": "4px",
				"--radio-button-size": "12px",
				"--little-arrows-width": "11px",
				"--little-arrows-height": "18px",
				"--little-arrows-gap": "5px",
				"--text-field-inset": "3px",
				"--text-field-lift": "2px",
				"--list-box-row-height": "16px",
				"--combo-box-indicator-width": "20px",
				"--outline-triangle-size": "11px",
				"--channel-slider-channel": "13px",
				"--channel-slider-thumb-along": "11px",
				"--channel-slider-thumb-across": "23px",
				"--channel-slider-thumb-overhang": "5px",
				// The text field and the progress bar (the Copy dialog's) are
				// the core's derivations: 22 and 11 pixels.
				"--edit-field-height": "22px",
				"--progress-height": "11px",
			});
	});

	// The scroll bar (styles/components/_ScrollBar.scss): a 16 px box at both
	// depths; the color theme's arrow-box shadow and grip, the 1-bit theme's
	// wider arrows.
	it("emits the scroll bars' knobs, the color bevel and grip and the 1-bit spread", async () => {
		await import("./index");
		const [bw, color] = (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[];
		const vars = (theme: ClassicyTheme | undefined) =>
			theme ? getThemeVars(theme) : {};
		expect(vars(bw)).toMatchObject({
			"--scroll-bar-box-length": "16px",
			"--scroll-bar-bevel": "0px",
			"--scroll-bar-arrow-spread": "1px",
			"--scroll-bar-grip": "0px",
			"--scroll-bar-snap-back": "20px",
			"--window-scrollbar-size": "16px",
		});
		expect(vars(color)).toMatchObject({
			"--scroll-bar-box-length": "16px",
			"--scroll-bar-bevel": "1px",
			"--scroll-bar-arrow-spread": "0px",
			"--scroll-bar-grip": "6px",
			"--scroll-bar-snap-back": "20px",
			"--window-scrollbar-size": "16px",
		});
		// The defaults are the 1-bit theme's.
		expect(system7Json.defaults.measurements.scrollBar).toEqual(
			system7Json.presets[0].measurements.scrollBar,
		);
	});

	it("emits the Control Strip's bevel (color only), the icon labels' knobs and the 1-bit icon switch", async () => {
		await import("./index");
		const [bw, color] = (getClassicyAppearancePackage("system7")?.presets ??
			[]) as ClassicyTheme[];
		const vars = (theme: ClassicyTheme | undefined) =>
			theme ? getThemeVars(theme) : {};
		const labels = {
			"--icon-label-height": "12px",
			"--icon-label-pad": "2px",
			"--icon-label-text-top": "2px",
			"--desktop-icon-font-size": "9px",
		};
		expect(vars(bw)).toMatchObject({
			"--control-strip-bevel-width": "0px",
			"--icon-selection-invert": "1px",
			...labels,
		});
		expect(vars(color)).toMatchObject({
			"--control-strip-bevel-width": "1px",
			"--icon-selection-invert": "0px",
			...labels,
		});
		// The strip's geometry is the core floor's (Control Strip 1.3.1 is
		// the strip Mac OS 8 kept), System 7 adds only the bevel.
		expect(Object.keys(system7Json.defaults.measurements.controlStrip)).toEqual(
			["bevelWidth"],
		);
		expect(system7Json.defaults.measurements.iconLabel).toEqual(
			system7Json.presets[0].measurements.iconLabel,
		);
		expect(system7Json.defaults.measurements.iconSelection).toEqual(
			system7Json.presets[0].measurements.iconSelection,
		);
	});

	// The slider's thumb overhangs its channel the same on both sides
	// (_Slider.scss centers it by the overhang).
	it("centers the slider's thumb across its channel", () => {
		for (const theme of system7Json.presets) {
			const { channel, thumbAcross, thumbOverhang } =
				theme.measurements.channelSlider;
			expect(channel + thumbOverhang + thumbOverhang).toBe(thumbAcross);
		}
	});

	// The progress bar's track and fill (_ProgressBar.scss): #CCCCFF and
	// #444444 (half #333333, half #555555) in color, white and black in 1-bit.
	it("draws the progress bar from the tinge ramp in color, black and white in 1-bit", () => {
		const [bw, color] = system7Json.presets;
		expect([color.color.theme[1], color.color.theme[4]]).toEqual([
			0xccccff, 0x333333,
		]);
		expect(color.color.system[6]).toBe(0x555555);
		expect([bw.color.theme[1], bw.color.theme[4], bw.color.system[6]]).toEqual([
			WHITE,
			0,
			0,
		]);
	});

	// HIG p.190: "The outer line is one pixel thick and the inner line is two
	// pixels thick", two white pixels apart, in 1-bit; color's bevels and
	// band fill the same five pixels (the 7.5 captures).
	it("frames a modal dialog five pixels deep at both depths, in its own colors", () => {
		const [bw, color] = system7Json.presets;
		for (const theme of [bw, color]) {
			const { bevel, band, line } = theme.measurements.dialogFrame;
			expect(
				theme.measurements.window.borderSize + bevel + band + bevel + line,
			).toBe(5);
		}
		// The band (system-02) is white in 1-bit and the cctb's gray in color;
		// the bevels' light and dark (theme-02, theme-04) the tinge ramp's.
		expect(bw.color.system[1]).toBe(WHITE);
		expect(color.color.system[1]).toBe(0xbbbbbb);
		expect([color.color.theme[1], color.color.theme[3]]).toEqual([
			0xccccff, 0x666699,
		]);
	});

	it("completes each theme from the core floor and its own measurements", async () => {
		await import("./index");
		const floor = classicyThemeMeasurementDefaults("system7");
		for (const theme of getClassicyAppearancePackage("system7")?.presets ??
			[]) {
			expect(Object.keys(theme.measurements)).toEqual(
				Object.keys(system7Json.defaults.measurements),
			);
			expect(theme.measurements.window.controlSize).toBe(11);
			expect(Object.keys(floor)).toEqual(
				expect.arrayContaining(Object.keys(theme.measurements)),
			);
		}
		// The package's defaults win over the core floor's.
		expect(floor.window.scrollbarSize).toBe(16);
		expect(floor.dither.tileSize).toBe(2);
	});

	it("lays out as the HIG does: grow box bottom right, menu bar on the screen, icons from the top right", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("system7")?.layout).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
			// The scroll box stays put, an outline follows the pointer and the
			// content scrolls on release (HIG p.165); a document window keeps
			// its bars, inactive, while its document fits (p.160).
			scrollBar: { thumbDrag: "onRelease", fitsBars: "shown" },
		});
	});

	it("registers its own sound pack, which both themes name, and lists it once", async () => {
		const { system7SoundPack } = await import("./assets/sounds/system7");
		await import("./index");
		expect(getClassicyAppearancePackage("system7")?.sounds).toEqual([
			system7SoundPack,
		]);
		expect(getClassicySoundPack("system7")).toEqual(system7SoundPack);
		expect(listClassicySoundPacks().map((pack) => pack.id)).toEqual([
			"system7",
		]);
		for (const theme of system7Json.presets)
			expect(theme.sound.pack).toBe("system7");
		// System 7.5's six alerts, Simple Beep the default (plan 0018-dbd
		// §4.2; system7.alerts.test.ts).
		expect(system7SoundPack.alerts).toHaveLength(6);
		expect(system7SoundPack.defaultAlert).toBe("ClassicyAlertSimpleBeep");
	});

	// The After Dark savers register under System 7 too (plan 0018-dbd
	// §3.8; System7ScreenSavers.test.tsx).
	it("names bouncing-ball its default screen saver", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		expect(pkg?.defaultScreenSaver).toBe("bouncing-ball");
	});

	// The Themes tab shows the System file's icon (plan 0018-dbd §4.1).
	it("shows the System file's suitcase as its icon", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("system7")?.icon).toMatch(
			/\/icons\/color\/32\/system-folders-suitcase-system\.png$/,
		);
	});

	// System 7 had no interface feedback sounds: its one hook blinks a chosen
	// menu item (HIG p.56) and plays nothing.
	it("hooks only the menu item's blink, and plays no sound", async () => {
		const core = await import("@classicy/classicy");
		const play = vi.spyOn(core, "playClassicyAppearanceSound");
		const { system7AppearanceHooks } = await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		expect(pkg?.hooks).toBe(system7AppearanceHooks);
		expect(Object.keys(system7AppearanceHooks.on ?? {})).toEqual(["MenuItem"]);
		const menuItem = system7AppearanceHooks.on?.MenuItem ?? {};
		expect(Object.keys(menuItem).sort()).toEqual(["press", "release"]);
		const ctx = {
			component: "MenuItem",
			event: "press",
			detail: { itemId: "x" },
		} as never;
		expect(menuItem.press?.(ctx)).toEqual({
			className: "classicyMenuItemFlash",
		});
		expect(menuItem.release?.(ctx)).toEqual({});
		expect(play).not.toHaveBeenCalled();
		expect(Object.isFrozen(system7AppearanceHooks.on)).toBe(true);
	});

	it("exports its id and a frozen copy of its theme data", async () => {
		const mod = await import("./index");
		expect(mod.SYSTEM7_APPEARANCE_PACKAGE_ID).toBe("system7");
		expect(mod.system7Json).toEqual(system7Json);
		expect(mod.system7Json).not.toBe(system7Json);
		expect(Object.isFrozen(mod.system7Json.presets[1].color.theme)).toBe(true);
	});
});
