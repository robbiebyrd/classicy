import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

describe("ClassicyWindowMenuBar under a package that renames the app", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
		registerTestRenamePackage();
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "TV.app", name: "TV", icon: "" },
			});
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_RENAME_PACKAGE_ID,
			});
		});
	});
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("titles an About inside the app's own Help with the display name once folded in", () => {
		render(
			<ClassicyWindowMenuBar
				appId="TV.app"
				windowId="w"
				menuItems={[
					{
						id: "tv_help",
						title: "Help",
						menuChildren: [{ id: "TV.app_about", title: "About TV" }],
					},
				]}
			/>,
		);
		fireEvent.click(screen.getByText("Help"));
		expect(screen.getByText("About Television")).toBeInTheDocument();
		expect(screen.queryByText("About TV")).toBeNull();
	});
});
