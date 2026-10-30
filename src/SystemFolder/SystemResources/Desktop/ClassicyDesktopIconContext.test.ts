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
});

describe("ClassicyDesktopIconCleanup", () => {
	const icons = [
		{ appId: "A.app", appName: "A", icon: "a.png", kind: "app_shortcut" },
		{ appId: "B.app", appName: "B", icon: "b.png", kind: "app_shortcut" },
	];

	const seedStore = (packageId: string) =>
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme.desktop.iconSize = 64;
				draft.System.Manager.Desktop.icons = icons.map((icon) => ({
					...icon,
				}));
			}),
			true,
		);

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
});
