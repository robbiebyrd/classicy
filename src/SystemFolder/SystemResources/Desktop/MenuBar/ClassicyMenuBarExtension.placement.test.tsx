import { act, render } from "@testing-library/react";
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
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyMenuBarExtension } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension";

/**
 * F 5.1 review carry-forward: an extension portals into the screen bar's
 * extensions region, which window placement removes and screen placement
 * renders anew. The extension follows the placement, so a package round trip
 * (screen → window → screen) leaves it in the live region, never in a
 * detached one.
 */

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const setPackage = (packageId: string) =>
	act(() => {
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
			true,
		);
	});

const extensionInLiveRegion = () =>
	document
		.getElementById("classicyDesktopMenuExtensions")
		?.querySelector('[aria-label="Account"]') ?? null;

const renderBar = () =>
	render(
		<>
			<ClassicyDesktopMenuBar />
			<ClassicyMenuBarExtension id="user" icon="/user.png" title="Account" />
		</>,
	);

describe("ClassicyMenuBarExtension — menu bar placement", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		registerTestMirrorPackage();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("follows the region through a screen → window → screen round trip", () => {
		renderBar();
		expect(extensionInLiveRegion()).not.toBeNull();

		setPackage(TEST_MIRROR_PACKAGE_ID);
		expect(document.getElementById("classicyDesktopMenuExtensions")).toBeNull();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();

		setPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(extensionInLiveRegion()).not.toBeNull();
	});

	it("appears once a package mounted under window placement moves the bar to the screen", () => {
		setPackage(TEST_MIRROR_PACKAGE_ID);
		renderBar();
		expect(document.querySelector('[aria-label="Account"]')).toBeNull();

		setPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(extensionInLiveRegion()).not.toBeNull();
	});
});
