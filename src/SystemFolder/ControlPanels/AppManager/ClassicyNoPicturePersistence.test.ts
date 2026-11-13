// Story 0195-wuo: the Desktop tab's None (ClassicyDesktopChangeBackground
// with "") forks the package's Custom theme with no picture, and that empty
// picture survives a save and a load: sanitizeStateForPersistence keeps the
// custom theme whole, and the load path neither fills in the preset's
// picture nor the default wallpaper. Each boot is a fresh module graph
// hydrated from saved state, as a page load is.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const APPEARANCE =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
const KEY = "classicyDesktopState";

const strip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const boot = async (saved?: unknown) => {
	vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, JSON.stringify(saved));
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	await import("@classicy/appearance-platinum");
	const appearance = await import(APPEARANCE);
	const state = (): ClassicyStore => store.useAppManager.getState();
	return {
		store,
		appearance,
		active: (): ClassicyTheme => state().System.Manager.Appearance.activeTheme,
		saved: (): ClassicyStore =>
			strip(store.sanitizeStateForPersistence(state())),
	};
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	vi.resetModules();
});

describe("None across a save and a load", () => {
	it("keeps the Custom theme's empty picture", async () => {
		const first = await boot();
		first.store.dispatch({
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "default",
		});
		expect(first.active().desktop.backgroundImage).not.toBe("");
		first.store.dispatch({
			type: "ClassicyDesktopChangeBackground",
			backgroundImage: "",
		});
		const custom = first.active();
		expect(custom.id).toBe("custom");
		expect(custom.desktop.backgroundImage).toBe("");

		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme.id).toBe("custom");
		expect(
			saved.System.Manager.Appearance.activeTheme.desktop.backgroundImage,
		).toBe("");

		const second = await boot(saved);
		expect(second.active().id).toBe("custom");
		expect(second.active().desktop.backgroundImage).toBe("");
		expect(
			second.appearance.getThemeVars(second.active())[
				"--desktop-background-image"
			],
		).toBe('url("")');
		const customs = second.store.useAppManager.getState().System.Manager
			.Appearance.customThemes as ClassicyTheme[];
		expect(
			customs.find((t) => t.id === "custom")?.desktop.backgroundImage,
		).toBe("");
	});
});
