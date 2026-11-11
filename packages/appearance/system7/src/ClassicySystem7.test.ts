import { describe, expect, it, vi } from "vitest";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { ClassicyAppearancePackageSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import {
	getAllThemes,
	getTheme,
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
		expect(bw.desktop.backgroundColor).toBe(WHITE);
		expect(bw.measurements.dither.tileSize).toBe(2);
	});

	// The Standard window colors measured from the HIG's color figures
	// (docs/superpowers/specs/2026-11-11-system7-hig-controls-icons-color.md,
	// "Color"): the gray ramp and the lavender tinge ramp; true gray, no dither.
	it("draws the color theme with the measured grays and lavender tinge", () => {
		const [, color] = system7Json.presets;
		expect(color.color.system).toEqual([
			0xececec, 0xd8d8d8, 0xcdcdcd, 0xa8a8a8, 0x828282, 0x393939, 0x202020,
		]);
		expect(color.color.theme).toEqual([
			0xf5f5f5, 0xd6d8ea, 0xb2b5d4, 0xa8abce, 0x898bb2, 0x46528b, 0x3d4885,
		]);
		expect(color.color.window.document).toBe(WHITE);
		expect(color.color.highlight).toBe(BLACK);
		expect(color.desktop.backgroundColor).toBe(0xcacaca);
		expect(color.measurements.dither.tileSize).toBe(0);
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
			expect(theme.desktop.backgroundImage).toBe("");
		}
	});

	it("sets System 7's window metrics: 11 px boxes, a 16 px scroll bar, a 19 px title bar", () => {
		for (const theme of system7Json.presets)
			expect(theme.measurements.window).toEqual({
				borderSize: 1,
				controlSize: 11,
				paddingSize: 6,
				scrollbarSize: 16,
				titleBarHeight: 19,
				utilityTitleBarHeight: 11,
			});
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
		// No alerts until the System 7.5 sounds land (plan 0018-dbd §4.2).
		expect(system7SoundPack.alerts).toEqual([]);
		expect(system7SoundPack.sprite).toEqual({});
	});

	// Until the savers register under System 7 (plan 0018-dbd §3.8), and with
	// no art or hooks yet (§4.1; System 7 had no feedback sounds).
	it("names no screen saver, icon or hooks yet", async () => {
		await import("./index");
		const pkg = getClassicyAppearancePackage("system7");
		expect(pkg?.defaultScreenSaver).toBeUndefined();
		expect(pkg?.icon).toBeUndefined();
		expect(pkg?.hooks).toBeUndefined();
	});

	it("exports its id and a frozen copy of its theme data", async () => {
		const mod = await import("./index");
		expect(mod.SYSTEM7_APPEARANCE_PACKAGE_ID).toBe("system7");
		expect(mod.system7Json).toEqual(system7Json);
		expect(mod.system7Json).not.toBe(system7Json);
		expect(Object.isFrozen(mod.system7Json.presets[1].color.theme)).toBe(true);
	});
});
