// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so the metric tests mount a real #classicyDesktop
// carrying the desktop-icon variables; no getComputedStyle stub is needed.
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyDesktopIconMetrics,
	classicyDesktopIconEventHandler,
	classicyDesktopIconGridPosition,
	classicyDesktopIconMetrics,
	getIconSize,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	iconGridLattice,
	readClassicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const setViewport = (width: number, height: number) => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		writable: true,
		value: width,
	});
	Object.defineProperty(window, "innerHeight", {
		configurable: true,
		writable: true,
		value: height,
	});
};

const originalViewport: [number, number] = [
	window.innerWidth,
	window.innerHeight,
];

// iconSize 64 → padding 16, cell 64 * 2 = 128; the grid step is cell +
// padding = 144.
const metrics64: ClassicyDesktopIconMetrics = {
	size: 64,
	padding: 16,
	cell: 128,
};

describe("classicyDesktopIconGridPosition", () => {
	beforeEach(() => setViewport(1024, 768));
	afterEach(() => setViewport(...originalViewport));

	it("top-right reproduces today's formula", () =>
		expect(classicyDesktopIconGridPosition(metrics64, 1, 0)).toEqual([
			880, 64,
		]));
	// The default origin is the default layout's, so the two cannot drift.
	it("defaults the origin to the default layout's", () =>
		expect(classicyDesktopIconGridPosition(metrics64, 2, 3)).toEqual(
			classicyDesktopIconGridPosition(
				metrics64,
				2,
				3,
				CLASSICY_DEFAULT_APPEARANCE_LAYOUT.desktop.iconGridOrigin,
			),
		));
	it("top-left fills from the left edge", () =>
		expect(
			classicyDesktopIconGridPosition(metrics64, 1, 0, "top-left"),
		).toEqual([16, 64]));
	it("bottom-right fills from the bottom", () =>
		expect(
			classicyDesktopIconGridPosition(metrics64, 1, 0, "bottom-right"),
		).toEqual([880, 560]));
	it("bottom-left", () =>
		expect(
			classicyDesktopIconGridPosition(metrics64, 1, 0, "bottom-left"),
		).toEqual([16, 560]));

	// F 7.1 review: a viewport shorter than 8 × padding + one cell (272 px
	// here) still gets one row, and that row stays below the menu bar's band
	// (y ≥ 4 × padding) instead of landing at y = -8.
	it.each([
		"bottom-right",
		"bottom-left",
	] as const)("keeps a %s row on screen in a short viewport", (origin) => {
		setViewport(1024, 200);
		expect(classicyDesktopIconGridPosition(metrics64, 1, 0, origin)[1]).toBe(
			64,
		);
	});
});

describe("ClassicyDesktopIconCleanup", () => {
	const icons = [
		{ appId: "A.app", appName: "A", icon: "a.png", kind: "app_shortcut" },
		{ appId: "B.app", appName: "B", icon: "b.png", kind: "app_shortcut" },
	];

	const seedStore = (packageId: string, seeded = icons) =>
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme.desktop.iconSize = 64;
				draft.System.Manager.Desktop.icons = seeded.map((icon) => ({
					...icon,
				}));
			}),
			true,
		);

	/** `count` app icons, named so the kind-then-name sort keeps their order. */
	const manyIcons = (count: number) =>
		Array.from({ length: count }, (_, i) => ({
			appId: `I${String(i).padStart(2, "0")}.app`,
			appName: `I${String(i).padStart(2, "0")}`,
			icon: "i.png",
			kind: "app_shortcut",
		}));

	/** A CSS-less package whose only change is the icon grid's origin. */
	const registerOriginPackage = (
		id: string,
		iconGridOrigin: "bottom-right" | "bottom-left",
	) =>
		registerClassicyAppearancePackage({
			id,
			name: id,
			css: "",
			defaults: { ...getTheme("default"), id: `${id}-default`, package: id },
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin },
			},
		});

	const locations = () =>
		useAppManager
			.getState()
			.System.Manager.Desktop.icons.map((icon) => icon.location);

	beforeEach(() => {
		setViewport(1024, 768);
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
	});

	afterEach(() => {
		setViewport(...originalViewport);
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("ClassicyDesktopIconCleanup uses the active package's origin", () => {
		// test-mirror lays icons out from the top left.
		registerTestMirrorPackage();
		seedStore(TEST_MIRROR_PACKAGE_ID);
		dispatch({ type: "ClassicyDesktopIconCleanup" });
		expect(locations()).toEqual([
			[16, 64],
			[16, 208],
		]);
	});

	it("keeps today's top-right locations under Platinum", () => {
		seedStore(PLATINUM_APPEARANCE_PACKAGE_ID);
		dispatch({ type: "ClassicyDesktopIconCleanup" });
		expect(locations()).toEqual([
			[880, 64],
			[880, 208],
		]);
	});

	// F-R5: every cleaned-up icon stays on screen, whatever the origin.
	it.each([
		"bottom-right",
		"bottom-left",
	] as const)("keeps every %s row below the menu bar", (origin) => {
		registerOriginPackage(`test-${origin}`, origin);
		seedStore(`test-${origin}`, manyIcons(6));
		dispatch({ type: "ClassicyDesktopIconCleanup" });
		const ys = locations().map((location) => location?.[1] ?? -1);
		expect(ys).toHaveLength(6);
		for (const y of ys) expect(y).toBeGreaterThanOrEqual(64);
		// 768 px tall, 8 × 16 px reserved, 144 px a row: four rows, then the
		// next column.
		expect(ys).toEqual([560, 416, 272, 128, 560, 416]);
	});

	it("counts the desktop's columns with the icon step (7 at 1024 px)", () => {
		// One row per column (144 px ≤ height < 288 px), so every icon starts a
		// column: with 7 columns counted, the 7th icon wraps back to the first.
		setViewport(1024, 200);
		seedStore(PLATINUM_APPEARANCE_PACKAGE_ID, manyIcons(8));
		dispatch({ type: "ClassicyDesktopIconCleanup" });
		const xs = locations().map((location) => location?.[0]);
		expect(xs).toEqual([880, 736, 592, 448, 304, 160, 880, 736]);
	});

	it("keeps Platinum's first top-right positions with many icons", () => {
		seedStore(PLATINUM_APPEARANCE_PACKAGE_ID, manyIcons(6));
		dispatch({ type: "ClassicyDesktopIconCleanup" });
		expect(locations()).toEqual([
			[880, 64],
			[880, 208],
			[880, 352],
			[880, 496],
			[880, 640],
			[736, 64],
		]);
	});
});

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
