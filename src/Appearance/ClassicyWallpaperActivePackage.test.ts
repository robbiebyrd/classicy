import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import {
	registerClassicyWallpapers,
	resetClassicyAssets,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyWallpaperReferenceFor,
	portableClassicyWallpaper,
	resolveClassicyWallpaper,
	withPortableClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";

// 0143 review: whether a stored wallpaper is bare or `<package>|<file>` must
// not depend on the active package, which is session state. A stored theme
// renders the same image whichever package is active, and what it stores
// names the wallpaper its theme file names.
let active = "platinum";
const activate = (id: string) => {
	active = id;
};

beforeEach(() => {
	resetClassicyAssets();
	active = "platinum";
	connectClassicyAssetPackageSource({
		getId: () => active,
		subscribe: () => () => {},
	});
	registerClassicyWallpapers("platinum", [
		{ name: "Default", file: "default.png", src: "/p/default.png" },
		{ name: "Azul Dark", file: "azul_dark.png", src: "/p/azul_dark.png" },
	]);
	registerClassicyWallpapers("foo", [
		{ name: "Sunset", file: "sunset.png", src: "/foo/sunset.png" },
	]);
	registerClassicyWallpapers("bar", [
		{ name: "Bar Sunset", file: "sunset.png", src: "/bar/sunset.png" },
		{ name: "Bar Azul", file: "azul_dark.png", src: "/bar/azul_dark.png" },
		{ name: "Bar Only", file: "bar_only.png", src: "/bar/only.png" },
	]);
});

afterEach(() => {
	active = "platinum";
});

/** What a theme of `themePackage` renders `stored` as, with each package active. */
const renderedUnder = (stored: string, themePackage: string) =>
	["foo", "bar", "platinum"].map((id) => {
		activate(id);
		return resolveClassicyWallpaper(stored, themePackage);
	});

describe("a stored wallpaper does not depend on the active package", () => {
	it("qualifies the active package's wallpaper in a Platinum theme, as export does", () => {
		activate("foo");
		const stored = portableClassicyWallpaper("/foo/sunset.png", "platinum");
		expect(stored).toBe("foo|sunset.png");
		expect(stored).toBe(
			classicyWallpaperReferenceFor("/foo/sunset.png", "platinum"),
		);
		expect(renderedUnder(stored, "platinum")).toEqual([
			"/foo/sunset.png",
			"/foo/sunset.png",
			"/foo/sunset.png",
		]);
	});

	it("stores the same reference whichever package is active", () => {
		const stored = ["foo", "bar", "platinum"].map((id) => {
			activate(id);
			return portableClassicyWallpaper("/foo/sunset.png", "platinum");
		});
		expect(stored).toEqual([
			"foo|sunset.png",
			"foo|sunset.png",
			"foo|sunset.png",
		]);
	});

	it("keeps Platinum's wallpaper bare in a theme whose package lacks it, and an active package never takes it over", () => {
		// foo has no azul_dark.png; bar does, and is active.
		activate("bar");
		const stored = portableClassicyWallpaper("/p/azul_dark.png", "foo");
		expect(stored).toBe("azul_dark.png");
		expect(renderedUnder(stored, "foo")).toEqual([
			"/p/azul_dark.png",
			"/p/azul_dark.png",
			"/p/azul_dark.png",
		]);
	});

	it("qualifies a wallpaper owned by neither the theme's package nor Platinum", () => {
		activate("bar");
		const stored = portableClassicyWallpaper("/bar/only.png", "foo");
		expect(stored).toBe("bar|bar_only.png");
		expect(renderedUnder(stored, "foo")).toEqual([
			"/bar/only.png",
			"/bar/only.png",
			"/bar/only.png",
		]);
	});

	it("keeps a persisted theme's reference stable across active-package switches", () => {
		const theme = {
			package: "platinum",
			desktop: { backgroundImage: "foo|sunset.png" },
		};
		for (const id of ["foo", "bar", "platinum"]) {
			activate(id);
			expect(withPortableClassicyWallpaper(theme)).toBe(theme);
		}
	});

	it("still resolves an older bare name only the active package registers", () => {
		// Saved before references existed: it keeps rendering as it did.
		activate("bar");
		expect(resolveClassicyWallpaper("bar_only.png", "foo")).toBe(
			"/bar/only.png",
		);
		expect(portableClassicyWallpaper("bar_only.png", "foo")).toBe(
			"bar_only.png",
		);
	});
});

describe("import tie-break: a bare filename the theme's package lacks", () => {
	beforeEach(() => {
		registerClassicyWallpapers("baz", [
			{ name: "Baz Only", file: "bar_only.png", src: "/baz/only.png" },
		]);
	});

	it("pins to the importing host's active package when it registers the file", () => {
		activate("baz");
		expect(classicyWallpaperReferenceFor("bar_only.png", "foo")).toBe(
			"baz|bar_only.png",
		);
	});

	it("else to the first package that registered it", () => {
		expect(classicyWallpaperReferenceFor("bar_only.png", "foo")).toBe(
			"bar|bar_only.png",
		);
	});

	it("prefers Platinum to the active package, as rendering does", () => {
		activate("bar");
		expect(classicyWallpaperReferenceFor("azul_dark.png", "foo")).toBe(
			"platinum|azul_dark.png",
		);
	});
});
