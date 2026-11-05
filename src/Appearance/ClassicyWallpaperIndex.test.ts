import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyAssets,
	registerClassicyWallpapers,
	resetClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyWallpaperDigest,
	classicyWallpaperFilename,
	defaultClassicyWallpaper,
	listClassicyWallpapers,
	portableClassicyWallpaper,
	resolveClassicyWallpaper,
	withPortableClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const AZUL = "/x/azul_dark-abc.png";
const AZUL_DATA = "data:image/png;base64,QVpVTA==";

describe("ClassicyWallpaperIndex", () => {
	let entries: ClassicyLogEntry[];

	beforeEach(() => {
		resetClassicyAssets();
		entries = [];
		registerClassicyLogSink({
			id: "wallpaper-index-test",
			onLog: (entry) => {
				if (entry.subsystem === "ClassicyWallpapers") entries.push(entry);
			},
		});
		registerClassicyWallpapers("platinum", [
			{ name: "Azul Dark", file: "azul_dark.png", src: AZUL },
		]);
	});

	afterEach(() => {
		unregisterClassicyLogSink("wallpaper-index-test");
	});

	describe("resolveClassicyWallpaper", () => {
		it("resolves a registered filename to its source", () => {
			expect(resolveClassicyWallpaper("azul_dark.png")).toBe(AZUL);
		});

		it("resolves a path by its basename, as a stale build's path", () => {
			expect(
				resolveClassicyWallpaper("/assets/img/wallpapers/azul_dark.png"),
			).toBe(AZUL);
		});

		it("passes a registered source through, so it is idempotent", () => {
			expect(resolveClassicyWallpaper(AZUL)).toBe(AZUL);
			expect(
				resolveClassicyWallpaper(resolveClassicyWallpaper("azul_dark.png")),
			).toBe(AZUL);
		});

		it("keeps an empty value empty, with no warning", () => {
			expect(resolveClassicyWallpaper("")).toBe("");
			expect(entries).toEqual([]);
		});

		it("passes data:, blob:, http(s) and protocol-relative URLs through", () => {
			for (const value of [
				"data:image/png;base64,T1RIRVI=",
				"blob:https://x.test/1234",
				"https://example.com/a.png",
				"http://example.com/a.png",
				"//example.com/a.png",
			]) {
				expect(resolveClassicyWallpaper(value)).toBe(value);
			}
			expect(entries).toEqual([]);
		});

		it("resolves an older build's hashed asset URL by its unhashed basename", () => {
			expect(resolveClassicyWallpaper("/assets/azul_dark-0a1b2c3d.png")).toBe(
				AZUL,
			);
			expect(
				resolveClassicyWallpaper("/assets/azul_dark-0a1b_2c-3d9.png"),
			).toBe(AZUL);
		});

		it("strips only a bundler hash: 8 or more of [A-Za-z0-9_-]", () => {
			expect(resolveClassicyWallpaper("/assets/azul_dark-0a1b2c3.png")).toBe(
				"",
			);
			registerClassicyWallpapers("platinum", [
				{ name: "My Wall", file: "my-wall.png", src: "/x/my-wall.png" },
			]);
			expect(resolveClassicyWallpaper("/assets/my-wall-Abc12345.png")).toBe(
				"/x/my-wall.png",
			);
			expect(resolveClassicyWallpaper("/assets/my-wall.png")).toBe(
				"/x/my-wall.png",
			);
		});

		it("passes an upper-case HTTPS URL through, as the schema accepts it", () => {
			expect(resolveClassicyWallpaper("HTTPS://example.com/x.png")).toBe(
				"HTTPS://example.com/x.png",
			);
			expect(resolveClassicyWallpaper("Data:image/png;base64,T1RIRVI=")).toBe(
				"Data:image/png;base64,T1RIRVI=",
			);
		});

		it("blanks an unknown filename and warns once per value", () => {
			expect(resolveClassicyWallpaper("nope.png")).toBe("");
			expect(resolveClassicyWallpaper("nope.png")).toBe("");
			expect(resolveClassicyWallpaper("other.png")).toBe("");
			expect(entries.map((e) => [e.level, e.details[0]])).toEqual([
				["warn", { value: "nope.png" }],
				["warn", { value: "other.png" }],
			]);
		});

		it("resolves an entry registered without a file by its name only", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Sunset", src: "/x/sunset.png" },
			]);
			expect(resolveClassicyWallpaper("Sunset")).toBe("/x/sunset.png");
			expect(resolveClassicyWallpaper("sunset.png")).toBe("");
			expect(classicyWallpaperFilename("/x/sunset.png")).toBeUndefined();
		});

		it("resolves wallpapers registered through registerClassicyAssets by name", () => {
			registerClassicyAssets("wallpapers", "platinum", {
				Plain: "/x/plain.png",
			});
			expect(resolveClassicyWallpaper("Plain")).toBe("/x/plain.png");
		});

		it("looks in the given package, then Platinum", () => {
			registerClassicyWallpapers("other", [
				{ name: "Azul", file: "azul_dark.png", src: "/o/azul.png" },
				{ name: "Own", file: "own.png", src: "/o/own.png" },
			]);
			expect(resolveClassicyWallpaper("azul_dark.png", "other")).toBe(
				"/o/azul.png",
			);
			expect(resolveClassicyWallpaper("own.png", "other")).toBe("/o/own.png");
			expect(resolveClassicyWallpaper("azul_dark.png")).toBe(AZUL);
			expect(resolveClassicyWallpaper("own.png")).toBe("");
			registerClassicyWallpapers("platinum", [
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
			]);
			expect(resolveClassicyWallpaper("bondi.png", "other")).toBe(
				"/x/bondi.png",
			);
		});

		it("sees a registration made after an earlier lookup", () => {
			expect(resolveClassicyWallpaper("late.png")).toBe("");
			registerClassicyWallpapers("platinum", [
				{ name: "Late", file: "late.png", src: "/x/late.png" },
			]);
			expect(resolveClassicyWallpaper("late.png")).toBe("/x/late.png");
		});

		it("forgets every wallpaper on resetClassicyAssets", () => {
			resetClassicyAssets();
			expect(resolveClassicyWallpaper("azul_dark.png")).toBe("");
			expect(classicyWallpaperFilename(AZUL)).toBeUndefined();
			// Its file goes too: the same name registered without one has none.
			registerClassicyWallpapers("platinum", [
				{ name: "Azul Dark", src: AZUL },
			]);
			expect(classicyWallpaperFilename(AZUL)).toBeUndefined();
		});
	});

	describe("classicyWallpaperDigest", () => {
		it("is the payload's length and FNV-1a 64 digest", () => {
			// FNV-1a 64 test vectors: "" → cbf29ce484222325, "a" → af63dc4c8601ec8c.
			expect(classicyWallpaperDigest("data:image/png;base64,")).toBe(
				"0:cbf29ce484222325",
			);
			expect(classicyWallpaperDigest("data:image/png;base64,a")).toBe(
				"1:af63dc4c8601ec8c",
			);
		});

		it("ignores the media type, which a build may spell differently", () => {
			expect(classicyWallpaperDigest("data:image/jpeg;base64,a")).toBe(
				classicyWallpaperDigest("data:image/png;base64,a"),
			);
		});

		it("is undefined for anything but a data: URI", () => {
			expect(classicyWallpaperDigest("https://x.test/a.png")).toBeUndefined();
			expect(classicyWallpaperDigest("azul_dark.png")).toBeUndefined();
			expect(classicyWallpaperDigest("data:no-comma")).toBeUndefined();
		});
	});

	describe("legacy data: URIs (an older build inlined the wallpaper)", () => {
		const OLD = "data:image/png;base64,T0xEQVpVTA==";

		beforeEach(() => {
			registerClassicyWallpapers("platinum", [
				{
					name: "Azul Dark",
					file: "azul_dark.png",
					src: AZUL,
					legacyDigests: [classicyWallpaperDigest(OLD) ?? ""],
				},
			]);
		});

		it("maps a registered legacy digest to its filename, though today's source is a URL", () => {
			expect(classicyWallpaperFilename(OLD)).toBe("azul_dark.png");
			expect(portableClassicyWallpaper(OLD)).toBe("azul_dark.png");
		});

		it("still passes the legacy data: URI itself through when rendering", () => {
			expect(resolveClassicyWallpaper(OLD)).toBe(OLD);
		});

		it("keeps an unknown data: URI", () => {
			const other = "data:image/png;base64,T1RIRVI=";
			expect(classicyWallpaperFilename(other)).toBeUndefined();
			expect(portableClassicyWallpaper(other)).toBe(other);
		});

		it("never maps a data: URI that could leave a quoted url() by digest", () => {
			// A digest is no proof of content: only a plain base64 URI matches.
			const unsafe = 'data:image/png;base64,QQ==");x:url(y';
			registerClassicyWallpapers("platinum", [
				{
					name: "Unsafe",
					file: "unsafe.png",
					src: "/x/unsafe.png",
					legacyDigests: [classicyWallpaperDigest(unsafe) ?? ""],
				},
			]);
			expect(classicyWallpaperFilename(unsafe)).toBeUndefined();
		});

		it("knows legacy digests of every package", () => {
			const pkgOld = "data:image/png;base64,UEtHT0xE";
			registerClassicyWallpapers("other", [
				{
					name: "Own",
					file: "own.png",
					src: "/o/own.png",
					legacyDigests: [classicyWallpaperDigest(pkgOld) ?? ""],
				},
			]);
			expect(classicyWallpaperFilename(pkgOld)).toBe("own.png");
		});

		it("ignores a legacy digest that is not one, with a warning", () => {
			const registry: ClassicyLogEntry[] = [];
			registerClassicyLogSink({
				id: "wallpaper-index-test-digest",
				onLog: (entry) => {
					if (entry.subsystem === "ClassicyAssetRegistry") registry.push(entry);
				},
			});
			try {
				registerClassicyWallpapers("platinum", [
					{
						name: "Bondi",
						file: "bondi.png",
						src: "/x/bondi.png",
						legacyDigests: ["nope", classicyWallpaperDigest(OLD) ?? ""],
					},
				]);
			} finally {
				unregisterClassicyLogSink("wallpaper-index-test-digest");
			}
			expect(registry.map((e) => e.message)).toEqual([
				expect.stringContaining('Ignored legacy digest "nope"'),
			]);
		});
	});

	describe("classicyWallpaperFilename", () => {
		it("maps a registered source back to its filename", () => {
			expect(classicyWallpaperFilename(AZUL)).toBe("azul_dark.png");
		});

		it("maps a registered filename to itself", () => {
			expect(classicyWallpaperFilename("azul_dark.png")).toBe("azul_dark.png");
		});

		it("maps a data: URI equal to a registered source to its filename", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Azul Inline", file: "azul_inline.png", src: AZUL_DATA },
			]);
			expect(classicyWallpaperFilename(AZUL_DATA)).toBe("azul_inline.png");
			expect(
				classicyWallpaperFilename("data:image/png;base64,T1RIRVI="),
			).toBeUndefined();
		});

		it("gives no filename for an http(s) URL, a name, or an unknown value", () => {
			expect(
				classicyWallpaperFilename("https://example.com/a.png"),
			).toBeUndefined();
			expect(classicyWallpaperFilename("Azul Dark")).toBeUndefined();
			expect(classicyWallpaperFilename("nope.png")).toBeUndefined();
			expect(classicyWallpaperFilename("")).toBeUndefined();
		});

		it("matches exactly, never by basename", () => {
			// The schema treats a mapped value as safe to put in url("…").
			expect(
				classicyWallpaperFilename('x");background:url(/azul_dark.png'),
			).toBeUndefined();
			expect(
				classicyWallpaperFilename("/assets/img/wallpapers/azul_dark.png"),
			).toBeUndefined();
		});

		it("knows the files of every registered package", () => {
			registerClassicyWallpapers("other", [
				{ name: "Own", file: "own.png", src: "/o/own.png" },
			]);
			expect(classicyWallpaperFilename("/o/own.png")).toBe("own.png");
			expect(classicyWallpaperFilename("own.png")).toBe("own.png");
		});

		it("follows a re-registration that changes a name's source or file", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Azul Dark", src: "/y/azul_dark-def.png" },
			]);
			expect(resolveClassicyWallpaper("azul_dark.png")).toBe(
				"/y/azul_dark-def.png",
			);
			expect(classicyWallpaperFilename("/y/azul_dark-def.png")).toBe(
				"azul_dark.png",
			);
			expect(classicyWallpaperFilename(AZUL)).toBeUndefined();
			registerClassicyWallpapers("platinum", [
				{ name: "Azul Dark", file: "azul.png", src: "/y/azul_dark-def.png" },
			]);
			expect(classicyWallpaperFilename("/y/azul_dark-def.png")).toBe(
				"azul.png",
			);
			expect(resolveClassicyWallpaper("azul_dark.png")).toBe("");
		});
	});

	describe("portableClassicyWallpaper", () => {
		it("stores a registered wallpaper by filename, whatever form it arrives in", () => {
			expect(portableClassicyWallpaper(AZUL)).toBe("azul_dark.png");
			expect(portableClassicyWallpaper("azul_dark.png")).toBe("azul_dark.png");
			expect(
				portableClassicyWallpaper("/assets/img/wallpapers/azul_dark.png"),
			).toBe("azul_dark.png");
		});

		it("stores an older build's hashed asset URL by its filename", () => {
			expect(portableClassicyWallpaper("/assets/azul_dark-0a1b2c3d.png")).toBe(
				"azul_dark.png",
			);
		});

		it("never rewrites a remote URL, whatever its case", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
			]);
			for (const value of [
				"HTTPS://example.com/walls/bondi.png",
				"Http://example.com/walls/bondi.png",
				"https://example.com/walls/bondi.png",
			]) {
				expect(portableClassicyWallpaper(value)).toBe(value);
			}
		});

		it("keeps any other value as it is", () => {
			for (const value of [
				"",
				"https://example.com/azul_dark.png",
				"data:image/png;base64,T1RIRVI=",
				"/assets/img/wallpapers/retired.png",
				"retired.png",
				"Azul Dark",
			]) {
				expect(portableClassicyWallpaper(value)).toBe(value);
			}
		});
	});

	describe("withPortableClassicyWallpaper", () => {
		it("rewrites a theme's background to its filename, copy-on-write", () => {
			const theme = {
				id: "t",
				desktop: { backgroundImage: AZUL, backgroundColor: 1 },
			};
			const next = withPortableClassicyWallpaper(theme);
			expect(next).toEqual({
				id: "t",
				desktop: { backgroundImage: "azul_dark.png", backgroundColor: 1 },
			});
			expect(theme.desktop.backgroundImage).toBe(AZUL);
		});

		it("returns the same theme when there is nothing to change", () => {
			const theme = { desktop: { backgroundImage: "azul_dark.png" } };
			expect(withPortableClassicyWallpaper(theme)).toBe(theme);
			const bare = {};
			expect(withPortableClassicyWallpaper(bare)).toBe(bare);
			const odd = { desktop: { backgroundImage: 3 } };
			expect(withPortableClassicyWallpaper(odd)).toBe(odd);
		});
	});

	describe("registerClassicyWallpapers with a file", () => {
		it("keeps keying the asset tree by name", () => {
			expect(resolveClassicyAsset("wallpapers", "Azul Dark")).toBe(AZUL);
			expect(
				resolveClassicyAsset("wallpapers", "azul_dark.png"),
			).toBeUndefined();
		});

		it("ignores a file that is not a plain filename, with a warning", () => {
			const registry: ClassicyLogEntry[] = [];
			registerClassicyLogSink({
				id: "wallpaper-index-test-registry",
				onLog: (entry) => {
					if (entry.subsystem === "ClassicyAssetRegistry") registry.push(entry);
				},
			});
			try {
				registerClassicyWallpapers("platinum", [
					{ name: "Slash", file: "a/b.png", src: "/x/slash.png" },
					{ name: "Quote", file: 'q".png', src: "/x/quote.png" },
					{ name: "Url", file: "https://x.test/u.png", src: "/x/u.png" },
				]);
			} finally {
				unregisterClassicyLogSink("wallpaper-index-test-registry");
			}
			expect(classicyWallpaperFilename("/x/slash.png")).toBeUndefined();
			expect(classicyWallpaperFilename("/x/quote.png")).toBeUndefined();
			expect(classicyWallpaperFilename("/x/u.png")).toBeUndefined();
			expect(resolveClassicyWallpaper("Slash")).toBe("/x/slash.png");
			expect(registry).toHaveLength(3);
		});

		it("records no file for a source the registry refused", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Bad", file: "bad.png", src: 'x").png' },
			]);
			expect(resolveClassicyWallpaper("bad.png")).toBe("");
		});
	});

	describe("listClassicyWallpapers", () => {
		it("lists Platinum's wallpapers in registration order", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
				{ name: "Sunset", src: "/x/sunset.png" },
			]);
			expect(listClassicyWallpapers()).toEqual([
				{ name: "Azul Dark", file: "azul_dark.png", src: AZUL },
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
				{ name: "Sunset", src: "/x/sunset.png" },
			]);
		});

		it("merges a package's own over Platinum's by name, as the asset tree does", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
			]);
			registerClassicyWallpapers("other", [
				{ name: "Own", file: "own.png", src: "/o/own.png" },
				{ name: "Azul Dark", file: "azul_o.png", src: "/o/azul.png" },
			]);
			expect(listClassicyWallpapers("other")).toEqual([
				{ name: "Azul Dark", file: "azul_o.png", src: "/o/azul.png" },
				{ name: "Bondi", file: "bondi.png", src: "/x/bondi.png" },
				{ name: "Own", file: "own.png", src: "/o/own.png" },
			]);
		});

		it("is empty with nothing registered", () => {
			resetClassicyAssets();
			expect(listClassicyWallpapers()).toEqual([]);
		});
	});

	describe("defaultClassicyWallpaper", () => {
		it("is the package's default.png", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Default", file: "default.png", src: "/x/default.png" },
			]);
			expect(defaultClassicyWallpaper()).toBe("/x/default.png");
		});

		it("is the package's first wallpaper when it has no default.png", () => {
			expect(defaultClassicyWallpaper()).toBe(AZUL);
		});

		it("is a package's own before Platinum's", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Default", file: "default.png", src: "/x/default.png" },
			]);
			registerClassicyWallpapers("other", [
				{ name: "Own", file: "own.png", src: "/o/own.png" },
			]);
			expect(defaultClassicyWallpaper("other")).toBe("/o/own.png");
			expect(defaultClassicyWallpaper("bare")).toBe("/x/default.png");
		});

		it("is empty with nothing registered", () => {
			resetClassicyAssets();
			expect(defaultClassicyWallpaper()).toBe("");
		});
	});
});
