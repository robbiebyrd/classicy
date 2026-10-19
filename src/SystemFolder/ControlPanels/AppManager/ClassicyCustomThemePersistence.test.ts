import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_CUSTOM_THEME_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { ClassicyDefaultWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import {
	type ClassicyStore,
	type DeepPartial,
	DefaultAppManagerState,
	mergeClassicyState,
} from "./ClassicyAppManager";

const makeCustom = () => ({
	...structuredClone(getTheme("azul")),
	id: CLASSICY_CUSTOM_THEME_ID,
	name: "Custom",
	color: { ...structuredClone(getTheme("azul").color), black: 0x123456 },
});

// The shape a pre-custom-theme build persisted: no `customThemes` key.
const legacyPersisted = (): ClassicyStore => {
	const state = JSON.parse(
		JSON.stringify(DefaultAppManagerState),
	) as ClassicyStore;
	delete (state.System.Manager.Appearance as { customThemes?: unknown })
		.customThemes;
	return state;
};

const asPersisted = (state: ClassicyStore) =>
	state as unknown as DeepPartial<ClassicyStore>;

describe("customThemes — merge over defaults", () => {
	it("defaults to an empty list", () => {
		expect(
			DefaultAppManagerState.System.Manager.Appearance.customThemes,
		).toEqual([]);
	});

	it("keeps persisted custom themes and an active Custom theme", () => {
		const custom = makeCustom();
		const persisted = legacyPersisted();
		persisted.System.Manager.Appearance.customThemes = [custom];
		persisted.System.Manager.Appearance.activeTheme = custom;

		const merged = mergeClassicyState(
			DefaultAppManagerState,
			asPersisted(persisted),
		);
		const a = merged.System.Manager.Appearance;
		expect(a.customThemes).toEqual([custom]);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.color.black).toBe(0x123456);
		// Built-ins are still the full stock list.
		expect(a.availableThemes?.map((t) => t.id)).toEqual(
			DefaultAppManagerState.System.Manager.Appearance.availableThemes?.map(
				(t) => t.id,
			),
		);
	});

	it("loads state persisted before custom themes existed", () => {
		const merged = mergeClassicyState(
			DefaultAppManagerState,
			asPersisted(legacyPersisted()),
		);
		expect(merged.System.Manager.Appearance.customThemes).toEqual([]);
		expect(merged.System.Manager.Appearance.activeTheme.id).toBe("default");
	});
});

describe("customThemes — boot from localStorage", () => {
	beforeEach(() => {
		vi.resetModules();
		localStorage.clear();
	});
	afterEach(async () => {
		const mod = await import("./ClassicyAppManagerUtils");
		mod.stopAppManagerPersistence();
		localStorage.clear();
	});

	it("restores custom themes and heals their legacy wallpaper paths", async () => {
		const custom = makeCustom();
		custom.desktop.backgroundImage = "/assets/img/wallpapers/default.png";
		const persisted = legacyPersisted();
		persisted.System.Manager.Appearance.customThemes = [custom];
		persisted.System.Manager.Appearance.activeTheme = structuredClone(custom);
		localStorage.setItem("classicyDesktopState", JSON.stringify(persisted));

		const utils = await import("./ClassicyAppManagerUtils");
		const a = utils.useAppManager.getState().System.Manager.Appearance;
		expect(utils.wasHydratedFromStorage()).toBe(true);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.customThemes).toHaveLength(1);
		expect(a.customThemes?.[0].color.black).toBe(0x123456);
		expect(a.customThemes?.[0].desktop.backgroundImage).toBe(
			ClassicyDefaultWallpaper,
		);
		expect(a.activeTheme.desktop.backgroundImage).toBe(
			ClassicyDefaultWallpaper,
		);
	});

	it("boots legacy persisted state without customThemes", async () => {
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(legacyPersisted()),
		);
		const utils = await import("./ClassicyAppManagerUtils");
		const a = utils.useAppManager.getState().System.Manager.Appearance;
		expect(utils.wasHydratedFromStorage()).toBe(true);
		expect(a.customThemes).toEqual([]);
		expect(a.activeTheme.id).toBe("default");
	});
});
