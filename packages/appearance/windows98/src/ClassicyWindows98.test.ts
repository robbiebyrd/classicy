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
// eighteen themes, its layout, its color families and its sound pack, alone,
// with no other package registered (the test setup registers none).

const BLACK = 0x000000;
const WHITE = 0xffffff;
// Windows 98's system colors (the Windows Default scheme).
const BUTTON_FACE = 0xc0c0c0;
const BUTTON_SHADOW = 0x808080;
const ACTIVE_TITLE = 0x000080;
const GRADIENT_ACTIVE_TITLE = 0x1084d0;
const DESKTOP = 0x008080;

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

	it("registers eighteen themes, Windows Standard the defaults", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("windows98");
		expect(pkg?.presets?.map((t) => [t.id, t.name])).toEqual([
			["windows98", "Windows Standard"],
			["windows95", "Windows 95"],
			["windows98Brick", "Brick"],
			["windows98Desert", "Desert"],
			["windows98Eggplant", "Eggplant"],
			["windows98Lilac", "Lilac"],
			["windows98Maple", "Maple"],
			["windows98Marine", "Marine (high color)"],
			["windows98Plum", "Plum (high color)"],
			["windows98Pumpkin", "Pumpkin (large)"],
			["windows98RainyDay", "Rainy Day"],
			["windows98RedWhiteBlue", "Red, White, and Blue (VGA)"],
			["windows98Rose", "Rose"],
			["windows98Slate", "Slate"],
			["windows98Spruce", "Spruce"],
			["windows98Storm", "Storm (VGA)"],
			["windows98Teal", "Teal (VGA)"],
			["windows98Wheat", "Wheat"],
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
		expect(Object.keys(windows98Json.colorFamilies)).toEqual([
			"titleBar",
			"selection",
			"tooltip",
			"desktop",
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

	// Windows 98's metrics: a 1 px ring, 16 px scroll bars, an 18 px title
	// bar with 16 x 14 buttons, 11 px MS Sans Serif, 32 px icons.
	it("sets Windows 98's metrics and type in every theme", () => {
		for (const theme of windows98Json.presets) {
			expect(theme.measurements.window).toEqual({
				borderSize: 1,
				controlSize: 12,
				paddingSize: 5,
				scrollbarSize: 16,
				titleBarHeight: 18,
				utilityTitleBarHeight: 13,
			});
			expect(theme.typography.ui).toMatch(/^"Pixelated MS Sans Serif"/);
			expect(theme.typography.uiSize).toBe(11);
			expect(theme.desktop.iconSize).toBe(32);
			expect(theme.measurements.dither.tileSize).toBe(0);
		}
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
	// Controls", p.133).
	it("lays the desktop out as Windows did: icons from the top left, the menu bar on the screen, menus kept open and cascades on a time-out, access keys on every title, item and label, shortcuts spelled by name, scroll bars kept where the content fits, one folder at a time in the file dialogs, dialogs centered on whole pixels, trees on the bare arrows, ToolTips at the pointer", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("windows98")?.layout).toEqual({
			window: { growBoxCorner: "bottom-right", centering: "wholePixel" },
			menuBar: { placement: "screen", idleTimeoutMs: 0 },
			menu: {
				submenuDelayMs: 400,
				disabledItems: "browse",
				accessKeys: "auto",
				shortcutSpelling: "names",
				emptySubmenus: "placeholder",
			},
			desktop: { iconGridOrigin: "top-left" },
			scrollBar: { fitsBars: "shown" },
			fileDialog: {
				frame: "movable",
				navigation: "flat",
				saveName: "selected",
			},
			tree: { keys: "windows" },
			balloonHelp: { placement: "pointer" },
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
