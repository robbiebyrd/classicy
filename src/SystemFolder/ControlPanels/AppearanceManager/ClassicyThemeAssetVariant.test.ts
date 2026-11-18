// A theme's `assetVariant` (plan 0018-dbd 1.1) travels with the theme: the
// schema keeps it, theme files write and read it, a package's presets carry
// it, and a custom-theme fork keeps it.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// The themes here are Platinum's, and theme files need their package.
import "@classicy/appearance-platinum";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyStoreSystemAppearanceManager,
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { editActiveClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
	readClassicyLoadedThemes,
	readClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";

const PACKAGE = "variant-test";

const withVariant = (assetVariant: string): ClassicyTheme => ({
	...structuredClone(getTheme("default")),
	id: "variant-test-bw",
	name: "Variant Test B&W",
	package: PACKAGE,
	assetVariant,
});

const testPackage = (): ClassicyAppearancePackage => ({
	id: PACKAGE,
	name: "Variant Test",
	css: "",
	defaults: { ...structuredClone(getTheme("default")), package: PACKAGE },
	presets: [withVariant("bw")],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

beforeEach(() => {
	registerClassicyAppearancePackage(testPackage());
});

afterEach(() => {
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("ClassicyThemeSchema and assetVariant", () => {
	it("keeps a variant name", () => {
		const parsed = ClassicyThemeSchema.parse(withVariant("bw"));
		expect(parsed.assetVariant).toBe("bw");
	});

	it("leaves a theme without one without one", () => {
		const parsed = ClassicyThemeSchema.parse(getTheme("default"));
		expect(parsed).not.toHaveProperty("assetVariant");
	});

	it.each([
		"",
		"b w",
		"-bw",
		'bw"',
		"x".repeat(65),
	])("refuses %j", (assetVariant) => {
		expect(
			ClassicyThemeSchema.safeParse(withVariant(assetVariant)).success,
		).toBe(false);
	});

	it("refuses a non-string", () => {
		const theme = { ...withVariant("bw"), assetVariant: 7 };
		expect(ClassicyThemeSchema.safeParse(theme).success).toBe(false);
	});
});

describe("a package's presets", () => {
	it("carry their assetVariant through registration", () => {
		const registered = getClassicyAppearancePackage(PACKAGE);
		expect(registered?.presets?.[0]?.assetVariant).toBe("bw");
	});
});

describe("theme files", () => {
	it("export writes the variant and import reads it back", () => {
		const text = exportClassicyTheme(withVariant("bw"));
		expect(JSON.parse(text).theme.assetVariant).toBe("bw");
		const result = parseClassicyThemeFile(text);
		expect(result.ok && result.theme.assetVariant).toBe("bw");
	});

	it("a theme without one round-trips without one", () => {
		const text = exportClassicyTheme(structuredClone(getTheme("default")));
		expect(JSON.parse(text).theme).not.toHaveProperty("assetVariant");
		const result = parseClassicyThemeFile(text);
		expect(result.ok).toBe(true);
		expect(result.ok && result.theme).not.toHaveProperty("assetVariant");
	});

	it("an import payload and host-loaded themes keep it", () => {
		const imported = readClassicyTheme(withVariant("bw"));
		expect(imported.ok && imported.theme.assetVariant).toBe("bw");
		const loaded = readClassicyLoadedThemes([withVariant("bw")]);
		expect(loaded.themes[0]?.assetVariant).toBe("bw");
	});

	it("a file with an invalid variant is refused", () => {
		const text = exportClassicyTheme(withVariant("bw")).replace(
			'"assetVariant": "bw"',
			'"assetVariant": "b w"',
		);
		const result = parseClassicyThemeFile(text);
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toContain("assetVariant");
	});
});

describe("custom-theme forks", () => {
	const appearanceWith = (
		activeTheme: ClassicyTheme,
	): ClassicyStoreSystemAppearanceManager =>
		({
			activeTheme: structuredClone(activeTheme),
			availableThemes: [],
			customThemes: [],
		}) as unknown as ClassicyStoreSystemAppearanceManager;

	it("the fork of a built-in keeps its variant", () => {
		const appearance = appearanceWith(withVariant("bw"));
		const changed = editActiveClassicyTheme(appearance, (theme) => {
			theme.color.black = 0x010101;
		});
		expect(changed).toBe(true);
		expect(appearance.activeTheme.id).toBe(`custom-${PACKAGE}`);
		expect(appearance.activeTheme.assetVariant).toBe("bw");
		expect(appearance.customThemes?.[0]?.assetVariant).toBe("bw");
	});

	it("an edit of a custom theme keeps its variant", () => {
		const appearance = appearanceWith(withVariant("bw"));
		editActiveClassicyTheme(appearance, (theme) => {
			theme.color.black = 0x010101;
		});
		editActiveClassicyTheme(appearance, (theme) => {
			theme.color.black = 0x020202;
		});
		expect(appearance.customThemes).toHaveLength(1);
		expect(appearance.activeTheme.assetVariant).toBe("bw");
	});
});
