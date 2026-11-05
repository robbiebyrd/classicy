import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/Appearance/Platinum";
import { AZUL_DARK_2_1_8 } from "@/Appearance/__tests__/platinumLegacyWallpaperFixture";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import { platinumWallpaperUrl } from "@/Appearance/Platinum/assets/platinumWallpapers";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_CUSTOM_THEME_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { exportClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

// A library build inlines wallpapers as data: URIs (a 2.1.x save holds one);
// a later build serves them as files. Simulate the inlined build: Platinum's
// "Azul Dark" registered with a data: URI source.
const AZUL_DATA = "data:image/png;base64,QVpVTA==";
const OTHER_DATA = "data:image/png;base64,T1RIRVI=";

const customWith = (backgroundImage: string): ClassicyTheme => {
	const theme = structuredClone(getTheme("azul"));
	return {
		...theme,
		id: CLASSICY_CUSTOM_THEME_ID,
		name: "Custom",
		desktop: { ...theme.desktop, backgroundImage },
	};
};

/** Default state whose active theme is a custom theme with this background,
 * plus a second custom theme and a host-loaded theme with it too. */
const stateWith = (backgroundImage: string): ClassicyStore => {
	const state = mergeClassicyState(DefaultAppManagerState, {});
	const custom = customWith(backgroundImage);
	const appearance = state.System.Manager.Appearance;
	return {
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Appearance: {
					...appearance,
					activeTheme: custom,
					customThemes: [
						custom,
						{ ...customWith(backgroundImage), id: "custom-2", name: "Two" },
					],
					availableThemes: [
						...(appearance.availableThemes ?? []),
						{ ...customWith(backgroundImage), id: "host", name: "Host" },
					],
				},
			},
		},
	};
};

const backgrounds = (state: ClassicyStore) => {
	const a = state.System.Manager.Appearance;
	return {
		active: a.activeTheme.desktop.backgroundImage,
		custom: (a.customThemes ?? []).map((t) => t.desktop.backgroundImage),
		host: a.availableThemes?.find((t) => t.id === "host")?.desktop
			.backgroundImage,
	};
};

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const v of Object.values(value as object)) deepFreeze(v);
	}
	return value;
};

beforeEach(() => {
	registerClassicyWallpapers("platinum", [
		{ name: "Azul Dark", file: "azul_dark.png", src: AZUL_DATA },
	]);
});

describe("migrateClassicyState — wallpapers by filename", () => {
	it("turns a registered wallpaper's data: URI into its filename on every theme", () => {
		expect(backgrounds(migrateClassicyState(stateWith(AZUL_DATA)))).toEqual({
			active: "azul_dark.png",
			custom: ["azul_dark.png", "azul_dark.png"],
			host: "azul_dark.png",
		});
	});

	it("turns a registered wallpaper's URL into its filename", () => {
		const url = platinumWallpaperUrl("bondi.png");
		expect(url).not.toBe("");
		expect(backgrounds(migrateClassicyState(stateWith(url))).active).toBe(
			"bondi.png",
		);
	});

	it("turns an older build's wallpaper path into its filename", () => {
		expect(
			backgrounds(
				migrateClassicyState(stateWith("/assets/img/wallpapers/bondi.png")),
			).active,
		).toBe("bondi.png");
	});

	it("keeps a data: URI that matches no wallpaper, and it still renders", () => {
		const migrated = migrateClassicyState(stateWith(OTHER_DATA));
		expect(backgrounds(migrated)).toEqual({
			active: OTHER_DATA,
			custom: [OTHER_DATA, OTHER_DATA],
			host: OTHER_DATA,
		});
		expect(
			getThemeVars(migrated.System.Manager.Appearance.activeTheme)[
				"--desktop-background-image"
			],
		).toBe(`url("${OTHER_DATA}")`);
	});

	it("turns an older build's hashed asset URL into its filename", () => {
		expect(
			backgrounds(
				migrateClassicyState(stateWith("/assets/azul_dark-0a1b2c3d.png")),
			).active,
		).toBe("azul_dark.png");
	});

	it("keeps an old build's URL that matches no wallpaper", () => {
		const old = "/assets/retired-0a1b2c3d.png";
		expect(backgrounds(migrateClassicyState(stateWith(old))).active).toBe(old);
	});

	it("keeps a URL the user chose", () => {
		const url = "https://example.com/my-wallpaper.png";
		expect(backgrounds(migrateClassicyState(stateWith(url))).active).toBe(url);
	});

	it("is idempotent and copy-on-write", () => {
		const input = deepFreeze(stateWith(AZUL_DATA));
		const once = migrateClassicyState(input);
		expect(
			input.System.Manager.Appearance.activeTheme.desktop.backgroundImage,
		).toBe(AZUL_DATA);
		expect(migrateClassicyState(once)).toBe(once);
		const current = deepFreeze(stateWith("azul_dark.png"));
		expect(migrateClassicyState(current)).toBe(current);
	});

	it("renders the migrated filename as the wallpaper it was", () => {
		const migrated = migrateClassicyState(stateWith(AZUL_DATA));
		expect(
			getThemeVars(migrated.System.Manager.Appearance.activeTheme)[
				"--desktop-background-image"
			],
		).toBe(`url("${AZUL_DATA}")`);
	});
});

describe("ClassicyDesktopChangeBackground — stores a filename", () => {
	const run = (backgroundImage: string) =>
		classicyDesktopEventHandler(
			mergeClassicyState(DefaultAppManagerState, {}),
			{
				type: "ClassicyDesktopChangeBackground",
				backgroundImage,
			},
		).System.Manager.Appearance.activeTheme.desktop.backgroundImage;

	it("stores a registered wallpaper's resolved URL as its filename", () => {
		expect(run(AZUL_DATA)).toBe("azul_dark.png");
		expect(run(platinumWallpaperUrl("bondi.png"))).toBe("bondi.png");
	});

	it("stores a filename as it is", () => {
		expect(run("waves_bondi.png")).toBe("waves_bondi.png");
	});

	it("keeps a URL the user chose", () => {
		expect(run("https://example.com/bg.png")).toBe(
			"https://example.com/bg.png",
		);
	});
});

describe("sanitizeStateForPersistence — wallpapers by filename", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("writes a registered wallpaper's filename in the active and custom themes", async () => {
		const { sanitizeStateForPersistence, stopAppManagerPersistence } =
			await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
			);
		const { registerClassicyWallpapers: register } = await import(
			"@/Appearance/ClassicyAssetRegistry"
		);
		stopAppManagerPersistence();
		register("platinum", [
			{ name: "Azul Dark", file: "azul_dark.png", src: AZUL_DATA },
		]);
		const saved = sanitizeStateForPersistence(stateWith(AZUL_DATA));
		const a = saved.System.Manager.Appearance;
		expect(a.activeTheme.desktop.backgroundImage).toBe("azul_dark.png");
		expect(a.customThemes?.map((t) => t.desktop.backgroundImage)).toEqual([
			"azul_dark.png",
			"azul_dark.png",
		]);
	});

	it("keeps a URL the user chose and an unmatched data: URI", async () => {
		const { sanitizeStateForPersistence, stopAppManagerPersistence } =
			await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
			);
		stopAppManagerPersistence();
		const url = "https://example.com/my-wallpaper.png";
		expect(
			sanitizeStateForPersistence(stateWith(url)).System.Manager.Appearance
				.activeTheme.desktop.backgroundImage,
		).toBe(url);
		expect(
			sanitizeStateForPersistence(stateWith(OTHER_DATA)).System.Manager
				.Appearance.customThemes?.[0].desktop.backgroundImage,
		).toBe(OTHER_DATA);
	});
});

describe("a 2.1.x save, booted from localStorage", () => {
	beforeEach(() => {
		vi.resetModules();
		localStorage.clear();
	});
	afterEach(async () => {
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		mod.stopAppManagerPersistence();
		localStorage.clear();
	});

	const boot = async (backgroundImage: string) => {
		const persisted = JSON.parse(
			JSON.stringify(DefaultAppManagerState),
		) as ClassicyStore;
		const custom = customWith(backgroundImage);
		persisted.System.Manager.Appearance.activeTheme = custom;
		persisted.System.Manager.Appearance.customThemes = [custom];
		localStorage.setItem("classicyDesktopState", JSON.stringify(persisted));
		// Platinum first, as a host imports it: its wallpapers are registered
		// when the store loads.
		await import("@/Appearance/Platinum");
		const { registerClassicyWallpapers: register } = await import(
			"@/Appearance/ClassicyAssetRegistry"
		);
		register("platinum", [
			{ name: "Azul Dark", file: "azul_dark.png", src: AZUL_DATA },
		]);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const { getThemeVars: vars } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
		);
		const a = utils.useAppManager.getState().System.Manager.Appearance;
		return {
			active: a.activeTheme.desktop.backgroundImage,
			custom: a.customThemes?.[0].desktop.backgroundImage,
			css: vars(a.activeTheme)["--desktop-background-image"],
		};
	};

	it("loads a wallpaper's inlined data: URI as its filename, rendering the same image", async () => {
		expect(await boot(AZUL_DATA)).toEqual({
			active: "azul_dark.png",
			custom: "azul_dark.png",
			css: `url("${AZUL_DATA}")`,
		});
	});

	it("keeps a data: URI that matches no current wallpaper, and renders it", async () => {
		expect(await boot(OTHER_DATA)).toEqual({
			active: OTHER_DATA,
			custom: OTHER_DATA,
			css: `url("${OTHER_DATA}")`,
		});
	});
});

describe("a package that registers before its wallpapers", () => {
	it("registers, and its theme renders the wallpaper once it is registered", async () => {
		const { registerClassicyAppearancePackage, getClassicyAppearancePackage } =
			await import("@/Appearance/ClassicyAppearancePackageRegistry");
		const base = structuredClone(getTheme("default"));
		const defaults: ClassicyTheme = {
			...base,
			id: "late-walls",
			name: "Late Walls",
			package: "late-walls",
			desktop: { ...base.desktop, backgroundImage: "late_wall.png" },
		};
		registerClassicyAppearancePackage({
			id: "late-walls",
			name: "Late Walls",
			css: "",
			defaults,
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		expect(getClassicyAppearancePackage("late-walls")).toBeDefined();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(getThemeVars(defaults)["--desktop-background-image"]).toBe(
			'url("")',
		);
		warn.mockRestore();
		registerClassicyWallpapers("late-walls", [
			{ name: "Late Wall", file: "late_wall.png", src: "/late/wall.png" },
		]);
		// The theme's own package is searched first, though it is not active.
		expect(getThemeVars(defaults)["--desktop-background-image"]).toBe(
			'url("/late/wall.png")',
		);
	});
});

// After plan 3.3 Platinum's wallpapers are files: no source is a data: URI,
// so a 2.1.x save's inlined wallpaper matches by its legacy digest only.
describe("a 2.1.8 save once Platinum's wallpapers are files", () => {
	beforeEach(() => {
		registerClassicyWallpapers("platinum", [
			{
				name: "Azul Dark",
				file: "azul_dark.png",
				src: platinumWallpaperUrl("azul_dark.png"),
			},
		]);
	});

	it("migrates 2.1.8's inlined Azul Dark to its filename on every theme", () => {
		expect(platinumWallpaperUrl("azul_dark.png")).not.toMatch(/^data:/);
		expect(
			backgrounds(migrateClassicyState(stateWith(AZUL_DARK_2_1_8))),
		).toEqual({
			active: "azul_dark.png",
			custom: ["azul_dark.png", "azul_dark.png"],
			host: "azul_dark.png",
		});
	});

	it("saves it by filename, and Save Theme… writes the filename", () => {
		const theme = customWith(AZUL_DARK_2_1_8);
		expect(
			JSON.parse(exportClassicyTheme(theme)).theme.desktop.backgroundImage,
		).toBe("azul_dark.png");
	});

	it("renders the migrated theme with today's wallpaper", () => {
		const migrated = migrateClassicyState(stateWith(AZUL_DARK_2_1_8));
		expect(
			getThemeVars(migrated.System.Manager.Appearance.activeTheme)[
				"--desktop-background-image"
			],
		).toBe(`url("${platinumWallpaperUrl("azul_dark.png")}")`);
	});

	it("keeps an unknown data: URI, which still renders", () => {
		const migrated = migrateClassicyState(stateWith(OTHER_DATA));
		expect(backgrounds(migrated).active).toBe(OTHER_DATA);
		expect(
			getThemeVars(migrated.System.Manager.Appearance.activeTheme)[
				"--desktop-background-image"
			],
		).toBe(`url("${OTHER_DATA}")`);
	});
});
