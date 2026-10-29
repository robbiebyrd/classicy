import { afterEach, describe, expect, it, vi } from "vitest";
import { resetClassicyAppearancePackagesForTests } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	assignImportedClassicyThemeIdentity,
	slugifyClassicyThemeName,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	classicyThemeFileName,
	downloadClassicyTheme,
	exportClassicyTheme,
	parseClassicyThemeFile,
	portableClassicyThemeBackground,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	buildClassicyWallpaperIndex,
	ClassicyDefaultWallpaper,
	classicyWallpaperFilename,
	resolveWallpaper,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

const theme = (id: string): ClassicyTheme => structuredClone(getTheme(id));

const parseOk = (text: string): ClassicyTheme => {
	const result = parseClassicyThemeFile(text);
	if (!result.ok) throw new Error(result.error);
	return result.theme;
};

const parseError = (text: string): string => {
	const result = parseClassicyThemeFile(text);
	if (result.ok) throw new Error("expected the file to be rejected");
	return result.error;
};

describe("exportClassicyTheme", () => {
	it("wraps the theme in a versioned classicy-theme envelope", () => {
		const file = JSON.parse(exportClassicyTheme(theme("azul")));
		expect(file.format).toBe("classicy-theme");
		expect(file.version).toBe(1);
		expect(file.theme.id).toBe("azul");
		expect(file.theme.name).toBe("Azul");
	});

	it("writes a bundled wallpaper as its filename, not this build's URL", () => {
		const azul = theme("azul");
		expect(azul.desktop.backgroundImage).toBe(
			resolveWallpaper("azul_dark.png"),
		);
		const file = JSON.parse(exportClassicyTheme(azul));
		expect(file.theme.desktop.backgroundImage).toBe("azul_dark.png");
	});

	it("keeps a remote http(s) wallpaper URL", () => {
		const t = theme("default");
		t.desktop.backgroundImage = "https://example.com/bg.png";
		const file = JSON.parse(exportClassicyTheme(t));
		expect(file.theme.desktop.backgroundImage).toBe(
			"https://example.com/bg.png",
		);
	});

	it.each([
		["a custom data: URI", "data:image/png;base64,iVBORw0KGgo="],
		["a blob: URL", "blob:https://x.test/1"],
		["a host-relative path", "/my/own.png"],
		["an unsafe URL", "https://x.test/a.png) ; background:red"],
	])("drops %s to no image", (_label, value) => {
		const t = theme("default");
		t.desktop.backgroundImage = value;
		const file = JSON.parse(exportClassicyTheme(t));
		expect(file.theme.desktop.backgroundImage).toBe("");
	});

	it("strips keys the schema does not declare", () => {
		const t = { ...theme("default"), scratch: 1 } as ClassicyTheme;
		expect(JSON.parse(exportClassicyTheme(t)).theme).not.toHaveProperty(
			"scratch",
		);
	});
});

describe("export → import round trip", () => {
	it.each([
		"default",
		"azul",
		"bondi",
		"copper",
		"frenchBlue",
		"sunny",
	])("%s loads back identical", (id) => {
		const original = theme(id);
		expect(parseOk(exportClassicyTheme(original))).toEqual(original);
	});

	it("every bundled theme round-trips", () => {
		for (const original of getAllThemes()) {
			expect(parseOk(exportClassicyTheme(original))).toEqual(original);
		}
	});

	it("resolves the wallpaper back to this build's URL (wallpaper theme)", () => {
		expect(
			parseOk(exportClassicyTheme(theme("default"))).desktop.backgroundImage,
		).toBe(ClassicyDefaultWallpaper);
	});

	it("keeps a colour-only theme colour-only", () => {
		expect(
			parseOk(exportClassicyTheme(theme("crimson"))).desktop.backgroundImage,
		).toBe("");
	});
});

describe("parseClassicyThemeFile — accepted input", () => {
	it("accepts a bare theme object without the envelope", () => {
		const bare = JSON.stringify(theme("plum"));
		expect(parseOk(bare)).toEqual(theme("plum"));
	});

	it("accepts a bare themes.json-style entry naming its wallpaper", () => {
		const t = theme("bondi");
		t.desktop.backgroundImage = "waves_bondi.png";
		expect(parseOk(JSON.stringify(t)).desktop.backgroundImage).toBe(
			resolveWallpaper("waves_bondi.png"),
		);
	});
});

describe("parseClassicyThemeFile — errors", () => {
	const envelope = (body: Record<string, unknown>) =>
		JSON.stringify({ format: "classicy-theme", version: 1, ...body });

	it("reports a file that is not JSON", () => {
		expect(parseError("{ not json")).toBe("This file is not valid JSON.");
	});

	it.each([
		"[]",
		"42",
		'"azul"',
		"null",
	])("reports JSON that is not an object (%s)", (text) => {
		expect(parseError(text)).toBe("This file does not contain a theme.");
	});

	it("reports a different format tag", () => {
		expect(
			parseError(JSON.stringify({ format: "hypercard-stack", version: 1 })),
		).toBe("This file is not a Classicy theme file.");
	});

	it("reports a missing version", () => {
		expect(
			parseError(JSON.stringify({ format: "classicy-theme", theme: {} })),
		).toBe("This theme file has no format version.");
	});

	it("reports a newer format version", () => {
		expect(parseError(envelope({ version: 2, theme: theme("azul") }))).toMatch(
			/newer version of Classicy \(format version 2\)/,
		);
	});

	it("reports an unsupported older version", () => {
		expect(parseError(envelope({ version: 0, theme: theme("azul") }))).toMatch(
			/unsupported format version \(0\)/,
		);
	});

	it("reports an envelope without a theme", () => {
		expect(parseError(envelope({}))).toBe(
			"This theme file does not contain a theme.",
		);
	});

	it("summarises schema issues with their paths", () => {
		const t = theme("azul") as unknown as {
			color: { select: number; system: number[] };
			sound: { pack: string };
		};
		t.color.select = -1;
		t.color.system = [1, 2, 3];
		t.sound.pack = "sosumi";
		const error = parseError(envelope({ theme: t }));
		expect(error).toMatch(/^This theme has invalid settings: /);
		expect(error).toContain("color.select:");
		expect(error).toContain("color.system:");
		expect(error).toContain("sound.pack:");
	});

	it("lists only the first three issues, counting the rest", () => {
		const t = theme("azul") as unknown as { color: Record<string, number> };
		for (const key of ["outline", "select", "highlight", "black", "white"]) {
			t.color[key] = -1;
		}
		expect(parseError(envelope({ theme: t }))).toMatch(
			/\(and 2 more problems\)\.$/,
		);
	});

	it("rejects an unsafe backgroundImage", () => {
		const t = theme("azul");
		t.desktop.backgroundImage = "javascript:alert(1)";
		expect(parseError(envelope({ theme: t }))).toContain(
			"desktop.backgroundImage:",
		);
	});

	it("rejects a file far larger than any theme", () => {
		expect(parseError(" ".repeat(300 * 1024))).toBe(
			"This file is too large to be a theme.",
		);
	});
});

describe("classicyWallpaperFilename / buildClassicyWallpaperIndex", () => {
	it("maps a resolved bundled wallpaper URL back to its filename", () => {
		expect(classicyWallpaperFilename(ClassicyDefaultWallpaper)).toBe(
			"default.png",
		);
		expect(classicyWallpaperFilename("azul_dark.png")).toBe("azul_dark.png");
		expect(classicyWallpaperFilename("https://x.test/a.png")).toBeUndefined();
	});

	it("maps data: URIs from a library build back to their filename", () => {
		const index = buildClassicyWallpaperIndex({
			"../../../../assets/img/wallpapers/azul_dark.png":
				"data:image/png;base64,QVpVTA==",
			"../../../../assets/img/wallpapers/poppy.png":
				"data:image/png;base64,UE9QUFk=",
		});
		expect(index.get("data:image/png;base64,QVpVTA==")).toBe("azul_dark.png");
		expect(index.get("data:image/png;base64,UE9QUFk=")).toBe("poppy.png");
		expect(index.get("poppy.png")).toBe("poppy.png");
		expect(index.get("data:image/png;base64,AAAA")).toBeUndefined();
	});

	it("portable references come from the same index", () => {
		expect(portableClassicyThemeBackground(ClassicyDefaultWallpaper)).toBe(
			"default.png",
		);
		expect(portableClassicyThemeBackground("")).toBe("");
	});
});

describe("classicyThemeFileName", () => {
	it.each([
		["French Blue", "french-blue.classicy-theme.json"],
		["  Azul!! 2 ", "azul-2.classicy-theme.json"],
		["***", "theme.classicy-theme.json"],
	])("%s → %s", (name, expected) => {
		expect(classicyThemeFileName({ name })).toBe(expected);
	});

	it("slugs long hyphen runs in linear time", () => {
		expect(slugifyClassicyThemeName(`a${"-".repeat(100_000)}b`)).toBe("a-b");
	});
});

describe("assignImportedClassicyThemeIdentity", () => {
	const named = (id: string, name: string) =>
		({ ...theme("default"), id, name }) as ClassicyTheme;
	const builtIns = getAllThemes();

	it("derives custom-<slug> from the name and ignores the file's id", () => {
		const out = assignImportedClassicyThemeIdentity(
			named("azul", "Midnight Oil"),
			builtIns,
		);
		expect(out.id).toBe("custom-midnight-oil");
		expect(out.name).toBe("Midnight Oil");
	});

	it("disambiguates a name already taken by a built-in, ignoring case", () => {
		const out = assignImportedClassicyThemeIdentity(
			named("x", "azul"),
			builtIns,
		);
		expect(out.name).toBe("azul 2");
		expect(out.id).toBe("custom-azul-2");
	});

	it("counts up from a trailing number instead of stacking suffixes", () => {
		const existing = [...builtIns, named("custom-azul-2", "Azul 2")];
		const out = assignImportedClassicyThemeIdentity(
			named("x", "Azul 2"),
			existing,
		);
		expect(out.name).toBe("Azul 3");
		expect(out.id).toBe("custom-azul-3");
	});

	it("appends -2, -3 … when the id is taken by a differently named theme", () => {
		const existing = [
			...builtIns,
			named("custom-ocean", "Something Else"),
			named("custom-ocean-2", "Another"),
		];
		const out = assignImportedClassicyThemeIdentity(
			named("x", "Ocean"),
			existing,
		);
		expect(out.name).toBe("Ocean");
		expect(out.id).toBe("custom-ocean-3");
	});

	it("never takes the Custom fork slot's id", () => {
		const out = assignImportedClassicyThemeIdentity(named("custom", "-"), []);
		expect(out.id).toBe("custom-theme");
		expect(out.id).not.toBe("custom");
	});

	it("keeps disambiguated names within the 64-character limit", () => {
		const long = "N".repeat(64);
		const out = assignImportedClassicyThemeIdentity(named("x", long), [
			named("y", long),
		]);
		expect(out.name.length).toBeLessThanOrEqual(64);
		expect(out.name.endsWith(" 2")).toBe(true);
	});

	it("does not mutate its input", () => {
		const input = named("azul", "Azul");
		assignImportedClassicyThemeIdentity(input, builtIns);
		expect(input.id).toBe("azul");
		expect(input.name).toBe("Azul");
	});
});

describe("downloadClassicyTheme", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("downloads <name>.classicy-theme.json holding the exported file", async () => {
		let blob: Blob | undefined;
		const createObjectURL = vi.fn((b: Blob) => {
			blob = b;
			return "blob:theme";
		});
		const revokeObjectURL = vi.fn();
		// A real URL class (the schema parses URLs) with the blob statics mocked.
		vi.stubGlobal(
			"URL",
			class extends URL {
				static createObjectURL = createObjectURL;
				static revokeObjectURL = revokeObjectURL;
			},
		);
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				expect(this.download).toBe("french-blue.classicy-theme.json");
				expect(this.href).toBe("blob:theme");
			});

		const t = theme("frenchBlue");
		expect(downloadClassicyTheme(t)).toEqual({ ok: true });
		expect(click).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:theme");
		expect(blob?.type).toBe("application/json");
		expect(await blob?.text()).toBe(exportClassicyTheme(t));
	});

	it("refuses a theme that would not load back, without downloading", () => {
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
		const t = theme("azul") as unknown as { sound: { pack: string } };
		t.sound.pack = "sosumi";
		const result = downloadClassicyTheme(t as unknown as ClassicyTheme);
		expect(result.ok).toBe(false);
		expect(click).not.toHaveBeenCalled();
	});
});

describe("theme files written before metric groups existed", () => {
	it("a saved v1 file without metric groups round-trips with the full block", () => {
		const file = JSON.parse(exportClassicyTheme(theme("default")));
		file.theme.measurements = {
			window: {
				borderSize: 1,
				controlSize: 12,
				paddingSize: 6,
				scrollbarSize: 17,
			},
		};
		const loaded = parseOk(JSON.stringify(file));
		expect(loaded.measurements.layout.dialogEdge).toBe(12);
		expect(loaded.measurements.window.titleBarHeight).toBe(19);

		const exported = JSON.parse(exportClassicyTheme(loaded));
		expect(exported.theme.measurements.layout.dialogEdge).toBe(12);
		expect(exported.theme.measurements.groupBox.gap).toBe(12);
	});
});

describe("theme files and appearance packages", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	it("writes the package id", () => {
		const file = JSON.parse(exportClassicyTheme(theme("default")));
		expect(file.theme.package).toBe("platinum");
	});

	it("a v1 file without package loads as platinum", () => {
		const file = JSON.parse(exportClassicyTheme(theme("azul")));
		delete file.theme.package;
		expect(parseOk(JSON.stringify(file)).package).toBe("platinum");
	});

	it("refuses a theme for an uninstalled package", () => {
		resetClassicyAppearancePackagesForTests();
		const file = JSON.parse(exportClassicyTheme(theme("azul")));
		file.theme.package = "irix";
		expect(parseError(JSON.stringify(file))).toBe(
			'This theme needs the "irix" appearance package, which is not installed.',
		);
	});
});
