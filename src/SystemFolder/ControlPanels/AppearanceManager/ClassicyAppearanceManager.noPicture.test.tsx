// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { expectDesktopTabNoPicture } from "./__tests__/desktopTabNoPicture";

// Story 0195-wuo under Platinum (System 7's twin is in its package): the
// Desktop tab's None reaches a solid desktop color, and the built-in theme
// brings its picture back.
describe("Appearance Manager — Desktop tab None, Platinum", {
	timeout: 15_000,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(
			JSON.parse(
				JSON.stringify(DefaultAppManagerState),
			) as typeof DefaultAppManagerState,
			true,
		);
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "platinum",
			});
		});
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.package,
		).toBe("platinum");
	});

	it.each([
		["default", 0x336699],
		["azul", 0x993333],
	])("removes %s's picture for a solid color, and the theme restores it", (themeId, color) =>
		expectDesktopTabNoPicture(themeId, color));
});
