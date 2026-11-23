import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyWallpapers,
	resetClassicyAssets,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyWallpaperFilename,
	classicyWallpaperReferenceFor,
	portableClassicyWallpaper,
	resolveClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// A wallpaper's identity is its `file` (`azul_dark.png`); its `src` is the
// file this build emits for it, which is a WebP of another name
// (`azul_dark.webp`, and `default_photo.webp` for `default.jpg`). The index
// knows that file's name too, so a URL of it, from this build or another,
// stores and draws as the wallpaper.
const AZUL_SRC = "/assets/azul_dark.webp";
const PHOTO_SRC = "/assets/default_photo.webp";

describe("ClassicyWallpaperIndex: a wallpaper's emitted file name", () => {
	let entries: ClassicyLogEntry[];

	beforeEach(() => {
		resetClassicyAssets();
		entries = [];
		registerClassicyLogSink({
			id: "wallpaper-index-webp-test",
			onLog: (entry) => {
				if (entry.subsystem === "ClassicyWallpapers") entries.push(entry);
			},
		});
		registerClassicyWallpapers("pkg", [
			{ name: "Azul Dark", file: "azul_dark.png", src: AZUL_SRC },
			{ name: "Photo", file: "default.jpg", src: PHOTO_SRC },
		]);
	});

	afterEach(() => {
		unregisterClassicyLogSink("wallpaper-index-webp-test");
	});

	it("a WebP URL stores as its identity", () => {
		for (const packageId of ["pkg", undefined]) {
			expect(portableClassicyWallpaper(AZUL_SRC, packageId)).toBe(
				"azul_dark.png",
			);
			expect(
				portableClassicyWallpaper(
					"https://cdn.example/x/azul_dark-AbC12345.webp",
					packageId,
				),
			).toBe("azul_dark.png");
			expect(
				portableClassicyWallpaper("/a/default_photo-Zz9_Zz9_.webp", packageId),
			).toBe("default.jpg");
			expect(
				portableClassicyWallpaper("/old/assets/azul_dark.webp", packageId),
			).toBe("azul_dark.png");
			expect(portableClassicyWallpaper("azul_dark.webp", packageId)).toBe(
				"azul_dark.png",
			);
		}
	});

	it("a WebP URL from another build draws this build's file", () => {
		expect(
			resolveClassicyWallpaper("/old/assets/azul_dark-AbC12345.webp", "pkg"),
		).toBe(AZUL_SRC);
		expect(resolveClassicyWallpaper("/old/default_photo.webp", "pkg")).toBe(
			PHOTO_SRC,
		);
		expect(resolveClassicyWallpaper("default_photo.webp", "pkg")).toBe(
			PHOTO_SRC,
		);
		expect(entries).toEqual([]);
	});

	it("a bare emitted file name is a registered wallpaper, a path to one is not", () => {
		expect(classicyWallpaperFilename("azul_dark.webp")).toBe("azul_dark.png");
		expect(classicyWallpaperReferenceFor("default_photo.webp", "pkg")).toBe(
			"default.jpg",
		);
		expect(classicyWallpaperReferenceFor("default_photo.webp", "other")).toBe(
			"pkg|default.jpg",
		);
		// The theme schema reads a mapped value as safe; a path never maps.
		expect(
			classicyWallpaperFilename("/old/assets/azul_dark.webp"),
		).toBeUndefined();
		expect(
			classicyWallpaperFilename('x");background:url(/azul_dark.webp'),
		).toBeUndefined();
	});

	it("identity names and old PNG paths resolve as before", () => {
		for (const value of [
			"azul_dark.png",
			"/assets/img/wallpapers/azul_dark.png",
			"/assets/azul_dark-0a1b2c3d.png",
		]) {
			expect(resolveClassicyWallpaper(value, "pkg")).toBe(AZUL_SRC);
			expect(portableClassicyWallpaper(value, "pkg")).toBe("azul_dark.png");
		}
		expect(resolveClassicyWallpaper("default.jpg", "pkg")).toBe(PHOTO_SRC);
		expect(portableClassicyWallpaper("default.jpg", "pkg")).toBe("default.jpg");
		expect(resolveClassicyWallpaper(AZUL_SRC, "pkg")).toBe(AZUL_SRC);
		expect(entries).toEqual([]);
	});

	it("an unregistered WebP basename stays unmatched", () => {
		for (const value of [
			"/assets/retired-AbC12345.webp",
			"/assets/retired.webp",
			"https://cdn.example/x/retired-AbC12345.webp",
			"retired.webp",
			// Part of a registered file's name is not its name.
			"/assets/dark.webp",
			"/assets/azul_dark.png.webp",
		]) {
			expect(portableClassicyWallpaper(value, "pkg")).toBe(value);
			expect(classicyWallpaperFilename(value)).toBeUndefined();
		}
		expect(
			resolveClassicyWallpaper("/assets/retired-AbC12345.webp", "pkg"),
		).toBe("");
		expect(resolveClassicyWallpaper("retired.webp", "pkg")).toBe("");
		expect(entries.map((entry) => entry.details[0])).toEqual([
			{ value: "/assets/retired-AbC12345.webp" },
			{ value: "retired.webp" },
		]);
	});

	it("keeps a remote URL a user chose, unless it names a build's hashed file", () => {
		// An unhashed remote file may be the user's own image that shares the
		// name; it is never rewritten (and still loads as it is).
		for (const value of [
			"https://example.com/walls/azul_dark.webp",
			"HTTPS://example.com/walls/default_photo.webp",
			"//example.com/azul_dark.webp",
		]) {
			expect(portableClassicyWallpaper(value, "pkg")).toBe(value);
			expect(resolveClassicyWallpaper(value, "pkg")).toBe(value);
		}
		expect(
			portableClassicyWallpaper("//cdn.example/default_photo-AbC12345.webp"),
		).toBe("default.jpg");
		// A remote URL is never matched by a wallpaper's filename, hashed or
		// not: only another build's emitted file is that wallpaper.
		for (const value of [
			"https://cdn.example/x/azul_dark-0a1b2c3d.png",
			"https://cdn.example/x/default-AbC12345.jpg",
		]) {
			expect(portableClassicyWallpaper(value, "pkg")).toBe(value);
		}
		// A remote URL always loads as it is.
		expect(
			resolveClassicyWallpaper(
				"https://cdn.example/x/azul_dark-AbC12345.webp",
				"pkg",
			),
		).toBe("https://cdn.example/x/azul_dark-AbC12345.webp");
	});

	it("two packages sharing a WebP basename resolve within the theme's package", () => {
		registerClassicyWallpapers("other", [
			{ name: "Other Azul", file: "other_azul.png", src: "/o/azul_dark.webp" },
		]);
		const old = "/old/assets/azul_dark-AbC12345.webp";
		expect(resolveClassicyWallpaper(old, "pkg")).toBe(AZUL_SRC);
		expect(resolveClassicyWallpaper(old, "other")).toBe("/o/azul_dark.webp");
		expect(resolveClassicyWallpaper("azul_dark.webp", "other")).toBe(
			"/o/azul_dark.webp",
		);
		expect(portableClassicyWallpaper(old, "pkg")).toBe("azul_dark.png");
		expect(portableClassicyWallpaper(old, "other")).toBe("other_azul.png");
		expect(portableClassicyWallpaper("azul_dark.webp", "other")).toBe(
			"other_azul.png",
		);
		// Each package's exact source is its own wallpaper, whichever theme.
		expect(portableClassicyWallpaper("/o/azul_dark.webp", "pkg")).toBe(
			"other|other_azul.png",
		);
		expect(portableClassicyWallpaper(AZUL_SRC, "other")).toBe(
			"pkg|azul_dark.png",
		);
	});

	it("an identity name beats another wallpaper's src basename", () => {
		// Registered first, so a lookup that took the first name it met would
		// pick it.
		registerClassicyWallpapers("mix", [
			{ name: "Bar", file: "bar.png", src: "/assets/foo.webp" },
			{ name: "Foo", file: "foo.webp", src: "/x/foo_mark.webp" },
		]);
		for (const value of [
			"foo.webp",
			"/old/foo.webp",
			"/old/foo-AbC12345.webp",
		]) {
			expect(resolveClassicyWallpaper(value, "mix")).toBe("/x/foo_mark.webp");
			expect(portableClassicyWallpaper(value, "mix")).toBe("foo.webp");
		}
		expect(classicyWallpaperFilename("foo.webp")).toBe("foo.webp");
		// A remote URL of that name is not taken for Bar's file either.
		expect(
			portableClassicyWallpaper(
				"https://cdn.example/x/foo-AbC12345.webp",
				"mix",
			),
		).toBe("https://cdn.example/x/foo-AbC12345.webp");
		// Bar's own source is still Bar.
		expect(resolveClassicyWallpaper("/assets/foo.webp", "mix")).toBe(
			"/assets/foo.webp",
		);
		expect(portableClassicyWallpaper("/assets/foo.webp", "mix")).toBe(
			"bar.png",
		);
	});

	it("an identity name in another package beats an emitted file's name too", () => {
		registerClassicyWallpapers("platinum", [
			{ name: "Foo", file: "foo.webp", src: "/p/foo_mark.webp" },
		]);
		registerClassicyWallpapers("mix", [
			{ name: "Bar", file: "bar.png", src: "/assets/foo.webp" },
		]);
		// A bare "foo.webp" in a theme of mix drew Platinum's before mix
		// shipped a file of that name, and still does.
		for (const value of ["foo.webp", "/old/foo-AbC12345.webp"]) {
			expect(resolveClassicyWallpaper(value, "mix")).toBe("/p/foo_mark.webp");
			expect(portableClassicyWallpaper(value, "mix")).toBe("foo.webp");
		}
		// One outside the theme's lookup (its package, Platinum, the active
		// one) is still that package's wallpaper: it draws nothing in a theme
		// of mix, and a theme file pins it, as before.
		registerClassicyWallpapers("far", [
			{ name: "Far", file: "far.webp", src: "/f/far_mark.webp" },
		]);
		registerClassicyWallpapers("mix", [
			{ name: "Baz", file: "baz.png", src: "/assets/far.webp" },
		]);
		expect(resolveClassicyWallpaper("far.webp", "mix")).toBe("");
		expect(portableClassicyWallpaper("far.webp", "mix")).toBe("far.webp");
		expect(classicyWallpaperReferenceFor("far.webp", "mix")).toBe(
			"far|far.webp",
		);
		// Its own source is still Baz.
		expect(portableClassicyWallpaper("/assets/far.webp", "mix")).toBe(
			"baz.png",
		);
	});

	it("never indexes a data: source by its last path segment", () => {
		registerClassicyWallpapers("pkg", [
			{
				name: "Inline",
				file: "inline.png",
				src: "data:image/webp;base64,UklGRg/inline.webp",
			},
		]);
		expect(resolveClassicyWallpaper("inline.webp", "pkg")).toBe("");
		expect(portableClassicyWallpaper("/x/inline.webp", "pkg")).toBe(
			"/x/inline.webp",
		);
		expect(classicyWallpaperFilename("inline.webp")).toBeUndefined();
		// Its exact source and its identity still name it.
		expect(
			portableClassicyWallpaper(
				"data:image/webp;base64,UklGRg/inline.webp",
				"pkg",
			),
		).toBe("inline.png");
		expect(resolveClassicyWallpaper("inline.png", "pkg")).toBe(
			"data:image/webp;base64,UklGRg/inline.webp",
		);
	});
});
