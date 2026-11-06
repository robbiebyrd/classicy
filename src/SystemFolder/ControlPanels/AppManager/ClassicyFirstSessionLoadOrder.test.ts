// A first session (nothing saved) starts from the core default theme
// (CLASSICY_CORE_DEFAULT_THEME, no wallpaper) and ends on the default
// package's own `default` theme, whichever comes first: the store or the
// package's registration. A host's entry (and the library build) evaluates
// the core's store before Platinum, so the registration replaces the core theme; a deep-importing host, a story
// iframe (preview.tsx imports Platinum before the store) and tests register
// Platinum first, so the store must resolve it when it is created.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const strip = (t: ClassicyTheme) => JSON.parse(JSON.stringify(t));

afterEach(() => {
	localStorage.clear();
	vi.resetModules();
});

describe("a first session's active theme, by module load order", () => {
	it.each<[string, Array<() => Promise<unknown>>]>([
		["Platinum, then the store", [() => import("@/Appearance/Platinum")]],
		[
			"Platinum, the bundled apps, then the store (Storybook's preview)",
			[
				() => import("@/Appearance/Platinum"),
				() => import("@/SystemFolder/ClassicyBundledApps.internal"),
			],
		],
		[
			"Platinum, the desktop, then the store",
			[
				() => import("@/Appearance/Platinum"),
				() => import("@/SystemFolder/SystemResources/Desktop/ClassicyDesktop"),
			],
		],
		["the store, then Platinum (the library barrel)", [() => import(STORE)]],
	])(
		"is Platinum's default preset, wallpaper included: %s",
		async (_name, first) => {
			vi.resetModules();
			localStorage.clear();
			for (const load of first) await load();
			await import("@/Appearance/Platinum");
			const store = await import(STORE);
			store.stopAppManagerPersistence();
			const { getTheme } = await import(
				"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
			);
			const preset = getTheme("default");
			const active = store.useAppManager.getState().System.Manager.Appearance
				.activeTheme as ClassicyTheme;
			expect(preset.desktop.backgroundImage).not.toBe("");
			expect(strip(active)).toEqual(strip(preset));
		},
		60_000,
	);
});
