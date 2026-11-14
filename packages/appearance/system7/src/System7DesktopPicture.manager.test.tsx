// Story 0195-wuo under System 7 (Platinum's twin is the core's
// ClassicyAppearanceManager.noPicture test): the Desktop tab's None removes
// the theme's pattern, a solid desktop color then shows alone, and the
// built-in theme, chosen again, brings its pattern back.
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
// Platinum first, as a host loads it: the core default package beside System 7.
import "../../platinum/src/index";
import "./index";
import { expectDesktopTabNoPicture } from "@/SystemFolder/ControlPanels/AppearanceManager/__tests__/desktopTabNoPicture";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

describe("Appearance Manager — Desktop tab None, System 7", {
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
				packageId: "system7",
			});
		});
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.package,
		).toBe("system7");
	});

	it.each([
		["system7", 0x336699],
		["system7-color", 0x993333],
	])("removes %s's pattern for a solid color, and the theme restores it", (themeId, color) =>
		expectDesktopTabNoPicture(themeId, color));
});
