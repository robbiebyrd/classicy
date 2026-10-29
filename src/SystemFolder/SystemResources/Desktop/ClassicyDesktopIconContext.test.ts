// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so these tests mount a real #classicyDesktop carrying
// the desktop-icon variables; no getComputedStyle stub is needed.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyDesktopIconEventHandler,
	classicyDesktopIconMetrics,
	getIconSize,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	iconGridLattice,
	readClassicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";

const mountDesktop = (vars: Record<string, string>): HTMLElement => {
	const desktop = document.createElement("div");
	desktop.id = "classicyDesktop";
	for (const [name, value] of Object.entries(vars)) {
		desktop.style.setProperty(name, value);
	}
	document.body.append(desktop);
	return desktop;
};

// A desktop whose inline variables disagree with the default theme (48 / 12
// / 96), so a test can tell a DOM read from a theme computation.
const mountDisagreeingDesktop = () =>
	mountDesktop({
		"--desktop-icon-size": "64px",
		"--desktop-icon-padding": "16px",
		"--desktop-icon-cell": "80px",
	});

afterEach(() => {
	document.getElementById("classicyDesktop")?.remove();
	vi.restoreAllMocks();
});

describe("getIconSize (reducer-side, pure)", () => {
	it("derives from the theme in state and never reads the desktop", () => {
		mountDisagreeingDesktop();
		const styleRead = vi.spyOn(window, "getComputedStyle");
		expect(getIconSize(getTheme("default"))).toEqual([48, 12]);
		expect(styleRead).not.toHaveBeenCalled();
	});

	it("getIconSize falls back to the theme without a desktop", () =>
		expect(getIconSize(getTheme("default"))).toEqual([48, 12]));

	it("follows a theme with a different desktop.iconSize", () =>
		expect(
			getIconSize(getTheme("default", { desktop: { iconSize: 32 } })),
		).toEqual([32, 8]));

	it("classicyDesktopIconMetrics matches what getThemeVars emits", () =>
		expect(classicyDesktopIconMetrics(getTheme("default"))).toEqual({
			size: 48,
			padding: 12,
			cell: 96,
		}));
});

describe("readClassicyDesktopIconMetrics (render-side)", () => {
	it("readClassicyDesktopIconMetrics prefers the desktop's --desktop-icon-size over the theme number", () => {
		mountDesktop({
			"--desktop-icon-size": "64px",
			"--desktop-icon-padding": "16px",
		});
		const { size, padding } = readClassicyDesktopIconMetrics(
			getTheme("default"),
		);
		expect([size, padding]).toEqual([64, 16]);
	});

	it("falls back to the theme in hand, not the default theme, without a desktop", () =>
		expect(
			readClassicyDesktopIconMetrics(
				getTheme("default", { desktop: { iconSize: 32 } }),
			),
		).toEqual({ size: 32, padding: 8, cell: 64 }));
});

describe("iconGridLattice (render-side)", () => {
	it("iconGridLattice pitch reads --desktop-icon-cell", () => {
		mountDisagreeingDesktop();
		expect(iconGridLattice(getTheme("default"))).toEqual({
			origin: [16, 16],
			pitch: [80, 80],
		});
	});

	it("iconGridLattice with an override ignores the CSS cell", () => {
		mountDisagreeingDesktop();
		expect(iconGridLattice(getTheme("default"), 32).pitch).toEqual([64, 64]);
	});
});

describe("desktop Clean Up (reducer path)", () => {
	const icons = (): ClassicyStoreSystemDesktopManagerIcon[] => [
		{ appId: "A.app", appName: "A", icon: "a.png", kind: "app_shortcut" },
		{ appId: "B.app", appName: "B", icon: "b.png", kind: "app_shortcut" },
		{ appId: "C.app", appName: "C", icon: "c.png", kind: "app_shortcut" },
	];

	const cleanUp = (theme: ClassicyTheme) => {
		const ds = {
			System: {
				Manager: {
					Appearance: { activeTheme: theme },
					Desktop: { icons: icons(), selectedIcons: [] },
				},
			},
		} as unknown as ClassicyStore;
		classicyDesktopIconEventHandler(ds, { type: "ClassicyDesktopIconCleanup" });
		return ds.System.Manager.Desktop.icons.map((i) => i.location);
	};

	it("lays out the default theme exactly as before, without touching the DOM", () => {
		// jsdom's window is 1024 × 768.
		expect([window.innerWidth, window.innerHeight]).toEqual([1024, 768]);
		mountDisagreeingDesktop();
		const styleRead = vi.spyOn(window, "getComputedStyle");
		// Column 1 from the right: 1024 - (48 * 2 + 12) = 916; rows step by
		// 108 from a top margin of 12 * 4 = 48.
		expect(cleanUp(getTheme("default"))).toEqual([
			[916, 48],
			[916, 156],
			[916, 264],
		]);
		expect(styleRead).not.toHaveBeenCalled();
	});

	it("lays out a theme with a different desktop.iconSize from that theme", () => {
		mountDisagreeingDesktop();
		const styleRead = vi.spyOn(window, "getComputedStyle");
		// iconSize 32, padding 8: 1024 - (32 * 2 + 8) = 952; rows step by 72
		// from a top margin of 8 * 4 = 32.
		expect(cleanUp(getTheme("default", { desktop: { iconSize: 32 } }))).toEqual(
			[
				[952, 32],
				[952, 104],
				[952, 176],
			],
		);
		expect(styleRead).not.toHaveBeenCalled();
	});

	it("the spy does see a render-side read (sanity check for the tests above)", () => {
		mountDisagreeingDesktop();
		const styleRead = vi.spyOn(window, "getComputedStyle");
		readClassicyDesktopIconMetrics(getTheme("default"));
		expect(styleRead).toHaveBeenCalled();
	});
});
