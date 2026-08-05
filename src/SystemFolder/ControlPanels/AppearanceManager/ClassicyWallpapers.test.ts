import { describe, expect, it, vi } from "vitest";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	ClassicyDefaultWallpaper,
	resolveWallpaper,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import themesData from "@/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json";

describe("resolveWallpaper", () => {
	it("resolves a bare wallpaper filename to its bundled URL", () => {
		expect(resolveWallpaper("default.png")).toBe(ClassicyDefaultWallpaper);
	});

	it("resolves a source-tree path to the same bundled URL as its filename", () => {
		expect(resolveWallpaper("/assets/img/wallpapers/default.png")).toBe(
			ClassicyDefaultWallpaper,
		);
	});

	it("passes an empty value through so colour-only themes stay colour-only", () => {
		expect(resolveWallpaper("")).toBe("");
	});

	it("passes a data URI through untouched", () => {
		const uri = "data:image/png;base64,iVBORw0KGgo=";
		expect(resolveWallpaper(uri)).toBe(uri);
	});

	it("passes remote URLs through untouched", () => {
		expect(resolveWallpaper("https://example.com/bg.png")).toBe(
			"https://example.com/bg.png",
		);
		expect(resolveWallpaper("//example.com/bg.png")).toBe(
			"//example.com/bg.png",
		);
	});

	it("is idempotent, so re-resolving an already-resolved value is safe", () => {
		expect(resolveWallpaper(ClassicyDefaultWallpaper)).toBe(
			ClassicyDefaultWallpaper,
		);
	});

	it("blanks an unknown wallpaper rather than emitting a request that 404s", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(resolveWallpaper("no_such_wallpaper.png")).toBe("");
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("theme wallpapers resolve through the bundler", () => {
	// Regression: themes.json held literal "/assets/img/wallpapers/*.png" strings.
	// JSON imports bypass Vite's asset pipeline, so those shipped verbatim and
	// 404'd in any consuming app. Under vitest a bundled asset resolves to that
	// same source path, so the meaningful invariant is identity with the
	// resolver's output — that holds in dev and in a production build alike.
	it("names wallpapers in themes.json instead of pathing to them", () => {
		// The root cause: a path written here ships verbatim, because Vite's
		// asset pipeline never sees strings inside an imported JSON file. Only
		// a bare filename, resolved through the bundler at runtime, is safe.
		for (const theme of themesData) {
			expect(
				theme.desktop.backgroundImage,
				`theme "${theme.id}" must name its wallpaper, not path to it`,
			).not.toContain("/");
		}
	});

	it("gives the default theme the bundled default wallpaper", () => {
		expect(getTheme("default").desktop.backgroundImage).toBe(
			ClassicyDefaultWallpaper,
		);
	});

	it("resolves every theme background to a usable value", () => {
		for (const theme of getAllThemes()) {
			const bg = theme.desktop.backgroundImage;
			expect(
				bg === "" || bg === resolveWallpaper(bg),
				`theme "${theme.id}" has an unresolved backgroundImage: ${bg}`,
			).toBe(true);
		}
	});
});
