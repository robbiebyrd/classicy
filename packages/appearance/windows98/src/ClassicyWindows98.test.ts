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
	// text's (HilightText), the ToolTip's (InfoWindow, InfoText), the
	// desktop labels' and the Start menu banner's. Windows 95's bars are
	// flat: both gradient ends equal.
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
			"startMenu",
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
			"--package-color-start-menu-banner": "#0000ff",
			"--package-color-start-menu-banner-gradient": "#000080",
			"--package-color-start-menu-banner-text": "#ffffff",
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

	// A window's menu bar is the band Windows 98 draws under the caption:
	// 18 px titles (`SM_CYMENU` 19, the 270-twip menu height plus one, less
	// the row above them) between a row of ButtonFace above and below, 20 px
	// in all (Wine's `MENU_MenuBarCalcSize` and `NC_DoNCPaint`; plan 0020-w98
	// §7). The titles' height is the package's `menuBar` knob, in every
	// theme, which the stylesheet alone reads.
	it("sets the menu bar's 18 px titles in every theme", async () => {
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			expect(theme.measurements.menuBar, theme.id).toEqual({
				titleHeight: 18,
			});
		await import("./index");
		for (const theme of getAllThemes())
			expect(getThemeVars(theme), theme.id).toMatchObject({
				"--menu-bar-title-height": "18px",
				"--window-border-size": "1px",
			});
	});

	// The taskbar's sizes (plan 0020-w98 §7; WIG Ch.3 "The Taskbar", p.15,
	// Figure 3.1; Ch.10 "Taskbar Integration", pp.211-212, Figure 10.2), the
	// package's `taskbar` knobs in every theme, which the stylesheet alone
	// reads (the core reads no knob for the taskbar: its band is measured):
	// the bar 28 px tall, its buttons and status area 22 (SM_CYSIZE 18 plus
	// two edges), 2 px under its two-row edge and 2 px above the bottom; the
	// Start button at least 54 wide, then the 4 px of SM_CXSIZEFRAME before
	// the window buttons (ReactOS `traywnd.cpp`); a window button at most 160
	// (SM_CXMINIMIZED) and at least 22 (SM_CXSIZE plus two edges) wide, 3 px
	// apart (comctl32's BUTTON_SPACINGX; ReactOS `UpdateButtonsSize`), its
	// icon 3 px in and 3 px before its label; the status area's 16 px icons in
	// 20 px cells (explorer's `ICON_BORDER` of 2 each side), 3 px in from the
	// pane's ends, and the clock's text 5 px from either side (ReactOS
	// `TRAY_CLOCK_WND_SPACING_X`). Quick Launch's flat buttons are a 16-pixel
	// icon and comctl32's toolbar padding (`DEFPAD_CX`, 7) wide; each band's
	// gripper is comctl32's rebar's (`GRIPPER_WIDTH` 3, `REBAR_PRE_GRIPPER` 2
	// before it and inset 2 from the band's top and bottom,
	// `REBAR_ALWAYS_SPACE` 4 after it), a band ending `REBAR_POST_CHILD` (4)
	// after its toolbar.
	it("sizes the taskbar from its knobs in every theme", async () => {
		const taskbar = {
			height: 28,
			buttonHeight: 22,
			startButtonWidth: 54,
			startGap: 4,
			buttonMaxWidth: 160,
			buttonMinWidth: 22,
			buttonGap: 3,
			buttonPaddingX: 3,
			iconGap: 3,
			trayIconSize: 16,
			trayIconPitch: 20,
			trayPaddingX: 3,
			clockPaddingX: 5,
			quickLaunchButtonWidth: 23,
			gripperWidth: 3,
			gripperInset: 2,
			gripperGap: 4,
			bandEndGap: 4,
		};
		for (const theme of [windows98Json.defaults, ...windows98Json.presets])
			expect(theme.measurements.taskbar, theme.id).toEqual(taskbar);
		// The bar is the buttons and the rows around them, whole pixels only.
		expect(taskbar.height).toBe(2 + 2 + taskbar.buttonHeight + 2);
		await import("./index");
		for (const theme of getAllThemes())
			expect(getThemeVars(theme), theme.id).toMatchObject({
				"--taskbar-height": "28px",
				"--taskbar-button-height": "22px",
				"--taskbar-start-button-width": "54px",
				"--taskbar-start-gap": "4px",
				"--taskbar-button-max-width": "160px",
				"--taskbar-button-min-width": "22px",
				"--taskbar-button-gap": "3px",
				"--taskbar-button-padding-x": "3px",
				"--taskbar-icon-gap": "3px",
				"--taskbar-tray-icon-size": "16px",
				"--taskbar-tray-icon-pitch": "20px",
				"--taskbar-tray-padding-x": "3px",
				"--taskbar-clock-padding-x": "5px",
				"--taskbar-quick-launch-button-width": "23px",
				"--taskbar-gripper-width": "3px",
				"--taskbar-gripper-inset": "2px",
				"--taskbar-gripper-gap": "4px",
				"--taskbar-band-end-gap": "4px",
				"--icon-small-size": "16px",
				"--pixel-unit": "1px",
			});
	});

	// The Start menu (plan 0020-w98 §3 and §7; WIG Ch.3 "The Start Button",
	// p.15): its banner is Windows 98 SE's explorer.exe bitmap 157, 21 px
	// wide, its letters set at 18 px (their 10-pixel x-height and 13-pixel
	// ascenders) from 5 px above its foot, drawn from the package's
	// `startMenu` colors, the same in every scheme as the bitmap was: blue
	// (`banner`) near the foot, navy (`bannerGradient`, the bitmap's top row)
	// above, the text white; its first level 32 px rows of 32 px icons, 2 px
	// in and 4 px before the label. The stylesheet alone reads the knobs.
	it("sizes the Start menu from its knobs and colors its banner from its family in every theme", async () => {
		const startMenu = {
			bannerWidth: 21,
			bannerFontSize: 18,
			bannerInset: 5,
			itemHeight: 32,
			iconSize: 32,
			iconInset: 2,
			iconGap: 4,
		};
		const family = {
			banner: 0x0000ff,
			bannerGradient: ACTIVE_TITLE,
			bannerText: WHITE,
		};
		for (const theme of [windows98Json.defaults, ...windows98Json.presets]) {
			expect(theme.measurements.startMenu, theme.id).toEqual(startMenu);
			expect(theme.color.families.startMenu, theme.id).toEqual(family);
		}
		// The row holds its icon exactly.
		expect(startMenu.itemHeight).toBe(startMenu.iconSize);
		expect(windows98Json.colorFamilies.startMenu).toEqual({
			label: "Start menu",
			colors: {
				banner: { label: "Banner" },
				bannerGradient: { label: "Banner gradient" },
				bannerText: { label: "Banner text" },
			},
		});
		await import("./index");
		for (const theme of getAllThemes())
			expect(getThemeVars(theme), theme.id).toMatchObject({
				"--start-menu-banner-width": "21px",
				"--start-menu-banner-font-size": "18px",
				"--start-menu-banner-inset": "5px",
				"--start-menu-item-height": "32px",
				"--start-menu-icon-size": "32px",
				"--start-menu-icon-inset": "2px",
				"--start-menu-icon-gap": "4px",
				"--package-color-start-menu-banner": "#0000ff",
				"--package-color-start-menu-banner-gradient": "#000080",
				"--package-color-start-menu-banner-text": "#ffffff",
			});
	});

	// Windows 98 is the shell (plan 0020-w98): each window carries its own
	// menu bar and no bar crosses the top of the screen (`menuBar.placement:
	// "window"`; WIG Ch.7 "The Menu Bar and Drop-down Menus", p.97); a
	// taskbar runs along the bottom with the Start button, labelled "Start",
	// at its left, its menu's banner reading "Windows 98", a button per open
	// window and the status area at its right (`taskbar`; WIG Ch.3 "The
	// Taskbar", "The Start Button", "Window Buttons" and "The Status Area",
	// pp.15-16, Figure 3.1; Ch.10 "Taskbar Integration", pp.211-212); and the
	// Minimize button sends a window to its taskbar button (`window.collapse:
	// "minimize"`; WIG Ch.6 "Minimizing Windows", p.85).
	// Windows keeps a window's scroll bars drawn, disabled, where its content
	// fits (Notepad's, say), so the bars stay in the `fits` state; its Open
	// and Save As dialogs are titled, movable boxes showing one folder at a
	// time under a pop-up that runs the path upward (Look in), and Save As
	// opens with the file name selected (WIG Ch.8 "Open Dialog Box" and
	// "Save As Dialog Box", pp.155-157, Figures 8.6 and 8.7); and a centered
	// dialog or alert lands on whole pixels, so its one-pixel bevels and
	// glyphs stay on the grid (`window.centering`, the audit's 8.8; WIG Ch.8
	// "Window Placement", p.147; Ch.13 "Design of Graphic Images", p.313).
	// The Maximize button fills the screen less the taskbar and Restore
	// returns the window (`window.zoom`, the audit's 6.6; WIG Ch.6
	// "Maximizing Windows" and "Restoring Windows", pp.84-85), and a
	// double-click on the caption maximizes or restores it, as Windows 98
	// shipped (`window.titleDoubleClick`; Wine `NC_HandleNCLButtonDblClk`).
	// A resizable window sizes from any edge of its frame and from its
	// corners (`window.frameEdges`, the audit's 6.5; WIG Ch.6 "Sizing
	// Borders", p.83; Wine `NC_HandleNCHitTest`). Every window has the
	// window pop-up menu, from a right-click on its title bar, a press on
	// its icon and ALT+SPACE, and closes on a double-click on its icon and
	// ALT+F4 (`window.systemMenu`, the audit's 6.2, 6.3, 7.10 and 8.7; WIG
	// Ch.6, pp.76-80; Ch.7 "The Window Pop-up Menu", p.102; App. B, Table
	// B.2, p.358). Each caption button names itself in a tooltip
	// (`window.captionTooltips`, Windows 98 as shipped). Every dialog and
	// message box has a titled caption with a Close box and moves by it
	// (`dialog.caption`, WIG Ch.8 "Appearance and Behavior", p.145, Figure
	// 8.1; "Message Boxes", p.164; "Message Box Types", p.166, Figure 8.17).
	it("lays the desktop out as Windows did: icons from the top left, a menu bar in each window and a taskbar along the bottom with Start, windows minimized to their taskbar buttons, scroll bars kept where the content fits, one folder at a time in the file dialogs, dialogs centered on whole pixels, windows maximized from the Maximize button and the caption's double-click, sized from their frame's edges and corners, given the window pop-up menu and caption-button tooltips, and every dialog titled, closable from its caption and movable", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("windows98")?.layout).toEqual({
			window: {
				growBoxCorner: "bottom-right",
				centering: "wholePixel",
				collapse: "minimize",
				zoom: "maximize",
				titleDoubleClick: "zoom",
				frameEdges: "resize",
				systemMenu: true,
				captionTooltips: true,
			},
			menuBar: { placement: "window" },
			desktop: { iconGridOrigin: "top-left" },
			scrollBar: { fitsBars: "shown" },
			fileDialog: {
				frame: "movable",
				navigation: "flat",
				saveName: "selected",
			},
			taskbar: {
				startLabel: "Start",
				startBanner: { title: "Windows", edition: "98" },
			},
			dialog: { caption: "titled" },
		});
	});

	// Plan 0020-w98 E4: the Control Strip control panel, Taskbar Properties
	// under the Windows shell, is Windows 98's "Taskbar & Start Menu".
	it("names the Control Strip control panel Taskbar & Start Menu, and no other app", async () => {
		await import("./index");
		expect(getClassicyAppearancePackage("windows98")?.apps).toEqual({
			"ControlStripManager.app": { name: "Taskbar & Start Menu" },
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
