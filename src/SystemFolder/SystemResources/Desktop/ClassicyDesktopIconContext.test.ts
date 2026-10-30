import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopIconGridPosition } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";

// Importing the Platinum module registered it; keep the object so each test
// can restore the real registration after a reset.
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

// iconSize 64 → padding 16, cell 64 * 2 + 16 = 144.
describe("classicyDesktopIconGridPosition", () => {
	beforeEach(() => setViewport(1024, 768));
	afterEach(() => setViewport(...originalViewport));

	it("top-right reproduces today's formula", () =>
		expect(classicyDesktopIconGridPosition(64, 16, 1, 0)).toEqual([880, 64]));
	// The default origin is the default layout's, so the two cannot drift.
	it("defaults the origin to the default layout's", () =>
		expect(classicyDesktopIconGridPosition(64, 16, 2, 3)).toEqual(
			classicyDesktopIconGridPosition(
				64,
				16,
				2,
				3,
				CLASSICY_DEFAULT_APPEARANCE_LAYOUT.desktop.iconGridOrigin,
			),
		));
	it("top-left fills from the left edge", () =>
		expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "top-left")).toEqual([
			16, 64,
		]));
	it("bottom-right fills from the bottom", () =>
		expect(
			classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-right"),
		).toEqual([880, 560]));
	it("bottom-left", () =>
		expect(
			classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-left"),
		).toEqual([16, 560]));

	// F 7.1 review: a viewport shorter than 8 × padding + one cell (272 px
	// here) still gets one row, and that row stays below the menu bar's band
	// (y ≥ 4 × padding) instead of landing at y = -8.
	it.each([
		"bottom-right",
		"bottom-left",
	] as const)("keeps a %s row on screen in a short viewport", (origin) => {
		setViewport(1024, 200);
		expect(classicyDesktopIconGridPosition(64, 16, 1, 0, origin)[1]).toBe(64);
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
