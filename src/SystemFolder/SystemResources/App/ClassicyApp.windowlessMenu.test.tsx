import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const NO_WINDOW_MENU: ClassicyMenuItem[] = [
	{
		id: "Notes_file",
		title: "File",
		menuChildren: [{ id: "Notes_new", title: "New" }],
	},
];
const WINDOW_MENU: ClassicyMenuItem[] = [
	{
		id: "Notes_win_file",
		title: "File",
		menuChildren: [{ id: "Notes_close", title: "Close" }],
	},
];

const appMenuInBar = () =>
	useAppManager.getState().System.Manager.Desktop.appMenu;

// Mac OS: an application in front with every window closed keeps its menu
// bar (File ▸ New, Open, Quit); a window's own menus take over while it is open.
describe("ClassicyApp appMenu: the front app with no window", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("publishes the app's menus when its last window closes, and not before", () => {
		render(
			<ClassicyApp id="Notes.app" name="Notes" icon="" appMenu={NO_WINDOW_MENU}>
				<ClassicyWindow
					id="doc"
					appId="Notes.app"
					title="Doc"
					appMenu={WINDOW_MENU}
					initialSize={[200, 100]}
					initialPosition={[10, 10]}
				>
					<p>text</p>
				</ClassicyWindow>
			</ClassicyApp>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
			dispatch({ type: "ClassicyAppFocus", app: { id: "Notes.app" } });
		});
		// While the window is open, its menus are the bar's.
		expect(appMenuInBar()).toEqual(WINDOW_MENU);

		act(() => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: "Notes.app" },
				window: { id: "doc" },
			});
		});
		expect(appMenuInBar()).toEqual(NO_WINDOW_MENU);
		expect(
			useAppManager.getState().System.Manager.Applications.focusedAppId,
		).toBe("Notes.app");
	});
});
