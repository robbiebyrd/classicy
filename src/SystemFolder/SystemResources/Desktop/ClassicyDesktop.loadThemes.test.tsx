// ClassicyDesktop loads the registered packages' built-in themes into
// `availableThemes` when it mounts with none. With no package registered,
// getAllThemes() is the core default theme alone, which as a loaded theme
// would shadow the default package's own `default`: the desktop waits for a
// package instead, and loads once one registers.
// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// jsdom plays no audio: a silent Howl keeps the output to real failures.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

// Platinum is registered here (withPlatinum); kept to put
// it back after each case.
const platinum = getClassicyAppearancePackage("platinum");

const strip = (t: ClassicyTheme | undefined) => JSON.parse(JSON.stringify(t));

const appearance = () => useAppManager.getState().System.Manager.Appearance;

describe("ClassicyDesktop's mount-time theme load", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		if (platinum) registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("waits for a package, then loads its built-ins", async () => {
		expect(platinum).toBeDefined();
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		await act(async () => {});
		// No package: nothing is loaded, so no core theme is listed.
		expect(appearance().availableThemes).toEqual([]);

		await act(async () => {
			if (platinum) registerClassicyAppearancePackage(platinum);
		});
		const presets = getAllThemes();
		expect(presets.map((t) => t.id)).toContain("bondi");
		expect(appearance().availableThemes?.map((t) => t.id)).toEqual(
			presets.map((t) => t.id),
		);

		act(() => {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "bondi" });
		});
		act(() => {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "default" });
		});
		const active = appearance().activeTheme;
		expect(active.desktop.backgroundImage).not.toBe("");
		expect(strip(active)).toEqual(strip(getTheme("default")));
	});
});
