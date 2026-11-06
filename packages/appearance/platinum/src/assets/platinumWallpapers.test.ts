import { describe, expect, it } from "vitest";
import "../index";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyWallpaperFilename,
	defaultClassicyWallpaper,
	listClassicyWallpapers,
	resolveClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import {
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import platinumJson from "../platinum.json";
import { PLATINUM_LEGACY_WALLPAPER_DIGESTS } from "./platinumLegacyWallpapers";
import {
	PLATINUM_WALLPAPERS,
	platinumWallpaperUrl,
} from "./platinumWallpapers";

describe("Platinum's wallpapers", () => {
	it("lists 47 wallpapers, each with a file this build ships", () => {
		expect(PLATINUM_WALLPAPERS).toHaveLength(47);
		for (const { label, file } of PLATINUM_WALLPAPERS) {
			expect(platinumWallpaperUrl(file), `${label} (${file})`).not.toBe("");
		}
		expect(new Set(PLATINUM_WALLPAPERS.map((w) => w.file)).size).toBe(47);
	});

	it("registers every one by label, with its filename", () => {
		expect(listClassicyWallpapers("platinum")).toEqual(
			PLATINUM_WALLPAPERS.map(({ label, file }) => ({
				name: label,
				file,
				src: platinumWallpaperUrl(file),
				legacyDigests: PLATINUM_LEGACY_WALLPAPER_DIGESTS[file],
			})),
		);
		expect(resolveClassicyAsset("wallpapers", "Azul Dark")).toBe(
			platinumWallpaperUrl("azul_dark.png"),
		);
	});

	it("includes the jpg wallpaper", () => {
		expect(
			PLATINUM_WALLPAPERS.some(
				(w) => w.label === "Default Photo" && w.file === "default.jpg",
			),
		).toBe(true);
		expect(resolveClassicyWallpaper("default.jpg")).not.toBe("");
	});

	it("resolves each filename to this build's URL, and back", () => {
		for (const { file } of PLATINUM_WALLPAPERS) {
			const url = resolveClassicyWallpaper(file);
			expect(url).toBe(platinumWallpaperUrl(file));
			expect(classicyWallpaperFilename(url)).toBe(file);
		}
	});

	it("makes default.png the default wallpaper", () => {
		expect(defaultClassicyWallpaper("platinum")).toBe(
			platinumWallpaperUrl("default.png"),
		);
	});
});

describe("theme wallpapers resolve through the registry", () => {
	// Regression: themes.json (now platinum.json) held literal
	// "/assets/img/wallpapers/*.png" strings. JSON imports bypass Vite's asset
	// pipeline, so those shipped verbatim and 404'd in any consuming app.
	it("names wallpapers in platinum.json instead of pathing to them", () => {
		// The root cause: a path written here ships verbatim, because Vite's
		// asset pipeline never sees strings inside an imported JSON file. Only
		// a bare filename, resolved through the registry at render, is safe.
		for (const theme of platinumJson.presets) {
			expect(
				theme.desktop.backgroundImage,
				`theme "${theme.id}" must name its wallpaper, not path to it`,
			).not.toContain("/");
		}
	});

	it("keeps the default theme's wallpaper by filename, and renders it", () => {
		const theme = getTheme("default");
		expect(theme.desktop.backgroundImage).toBe("default.png");
		expect(getThemeVars(theme)["--desktop-background-image"]).toBe(
			`url("${platinumWallpaperUrl("default.png")}")`,
		);
	});

	it("names every theme's wallpaper by a registered filename", () => {
		for (const theme of getAllThemes()) {
			const bg = theme.desktop.backgroundImage;
			expect(
				bg === "" || classicyWallpaperFilename(bg) === bg,
				`theme "${theme.id}" has an unregistered backgroundImage: ${bg}`,
			).toBe(true);
			expect(resolveClassicyWallpaper(bg) === "", theme.id).toBe(bg === "");
		}
	});
});
