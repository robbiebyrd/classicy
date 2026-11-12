import { describe, expect, it } from "vitest";
import { resolveClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ActionMessage,
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import "./index";
import { SYSTEM7_WALLPAPERS } from "./assets/system7Assets";
import system7Json from "./system7.json";

// Plan 0018-dbd §3.7, fix round 1: System 7's desktop pattern is each
// theme's desktop picture, a registered wallpaper repeated from the top left,
// over a flat desktop color, so a user keeps it, picks another, or picks
// none for the flat color, as on Platinum.

const run = (ds: ClassicyStore, action: ActionMessage) =>
	classicyDesktopEventHandler(ds, action);

const store = (): ClassicyStore => {
	const ds = structuredClone(DefaultAppManagerState) as ClassicyStore;
	run(ds, {
		type: "ClassicyDesktopChangeAppearancePackage",
		packageId: "system7",
	});
	return ds;
};

const active = (ds: ClassicyStore): ClassicyTheme =>
	ds.System.Manager.Appearance.activeTheme;

describe("System 7's desktop picture", () => {
	it("registers ppat 16 in both depths as the package's wallpapers, labeled", () => {
		expect(SYSTEM7_WALLPAPERS).toEqual([
			{ label: "Gray", file: "desktop-gray.png" },
			{ label: "Gray (Black & White)", file: "desktop-gray-bw.png" },
		]);
		for (const { file } of SYSTEM7_WALLPAPERS)
			expect(resolveClassicyWallpaper(file, "system7")).toMatch(
				new RegExp(`wallpapers/${file.replace(".", "\\.")}$`),
			);
	});

	it("gives each theme its pattern, repeated from the top left, over the pattern's light cell", () => {
		const [bw, color] = system7Json.presets;
		expect(bw.desktop).toMatchObject({
			backgroundImage: "desktop-gray-bw.png",
			backgroundColor: 0xffffff,
			backgroundRepeat: "repeat",
			backgroundPosition: "top left",
			backgroundSize: "auto",
		});
		expect(color.desktop).toMatchObject({
			backgroundImage: "desktop-gray.png",
			backgroundColor: 0xaaaaaa,
			backgroundRepeat: "repeat",
			backgroundPosition: "top left",
			backgroundSize: "auto",
		});
		expect(system7Json.defaults.desktop).toEqual(bw.desktop);
	});

	it("draws the theme's pattern as the desktop picture, from its own file", () => {
		const ds = store();
		expect(active(ds).id).toBe("system7");
		const vars = getThemeVars(active(ds));
		expect(vars["--desktop-background-image"]).toMatch(
			/wallpapers\/desktop-gray-bw\.png"\)$/,
		);
		expect(vars["--desktop-background-color"]).toBe("#ffffff");
	});

	it("lets a user pick another pattern, none and a flat color, and return to the theme", () => {
		for (const [theme, other, flat] of [
			["system7", "desktop-gray.png", "#ffffff"],
			["system7-color", "desktop-gray-bw.png", "#aaaaaa"],
		] as const) {
			const ds = store();
			run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: theme });
			expect(getThemeVars(active(ds))["--desktop-background-color"]).toBe(flat);
			// Another pattern: the edit forks the package's Custom theme.
			run(ds, {
				type: "ClassicyDesktopChangeBackground",
				backgroundImage: other,
			});
			expect(active(ds).desktop.backgroundImage).toBe(other);
			// None, then a flat color: the desktop is that color alone.
			run(ds, { type: "ClassicyDesktopChangeBackground", backgroundImage: "" });
			run(ds, {
				type: "ClassicyDesktopChangeColor",
				colorKey: "desktopBackground",
				color: 0x336699,
			});
			const vars = getThemeVars(active(ds));
			expect(vars["--desktop-background-image"]).toBe('url("")');
			expect(vars["--desktop-background-color"]).toBe("#336699");
			// The built-in theme is untouched.
			run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: theme });
			expect(active(ds).id).toBe(theme);
			expect(getThemeVars(active(ds))["--desktop-background-color"]).toBe(flat);
			expect(active(ds).desktop.backgroundImage).not.toBe("");
		}
	});
});
