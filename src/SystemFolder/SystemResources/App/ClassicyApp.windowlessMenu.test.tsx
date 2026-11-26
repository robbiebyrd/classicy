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
describe("ClassicyApp windowlessMenu: the front app with no window", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("publishes the app's menus when its last window closes, and not before", () => {
		render(
			<ClassicyApp
				id="Notes.app"
				name="Notes"
				icon=""
				windowlessMenu={NO_WINDOW_MENU}
			>
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

	// A closed ClassicyWindow stays mounted, and an app writes its menu inline:
	// any re-render must not bring the closed window's menus back (RR2-3).
	it("a closed window that stays mounted never republishes over the windowless menu", () => {
		const Tree = ({ tick }: { tick: number }) => (
			<ClassicyApp
				id="Notes.app"
				name="Notes"
				icon=""
				windowlessMenu={NO_WINDOW_MENU}
			>
				<ClassicyWindow
					id="doc"
					appId="Notes.app"
					title={`Doc ${tick}`}
					appMenu={[
						{
							id: "Notes_win_file",
							title: "File",
							menuChildren: [{ id: "Notes_close", title: "Close" }],
						},
					]}
					initialSize={[200, 100]}
					initialPosition={[10, 10]}
				>
					<p>text</p>
				</ClassicyWindow>
			</ClassicyApp>
		);
		const view = render(<Tree tick={0} />);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
			dispatch({ type: "ClassicyAppFocus", app: { id: "Notes.app" } });
		});
		act(() => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: "Notes.app" },
				window: { id: "doc" },
			});
		});
		expect(appMenuInBar()).toEqual(NO_WINDOW_MENU);
		for (const tick of [1, 2, 3]) view.rerender(<Tree tick={tick} />);
		expect(appMenuInBar()).toEqual(NO_WINDOW_MENU);
	});

	// While an extension holds the focus flag (an older or hand-built state)
	// the front app's last accessed window keeps republishing its menus.
	it("the front app's window keeps its menus fresh while an extension holds the focus flag", () => {
		const Tree = ({ label }: { label: string }) => (
			<>
				<ClassicyApp id="Notes.app" name="Notes" icon="">
					<ClassicyWindow
						id="doc"
						appId="Notes.app"
						title="Doc"
						appMenu={[
							{
								id: "Notes_win_file",
								title: "File",
								menuChildren: [{ id: "Notes_close", title: label }],
							},
						]}
						initialSize={[200, 100]}
						initialPosition={[10, 10]}
					>
						<p>text</p>
					</ClassicyWindow>
				</ClassicyApp>
				<ClassicyApp id="Ext.app" name="Ext" icon="" extension />
			</>
		);
		const view = render(<Tree label="Close A" />);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Ext.app", name: "Ext", icon: "" },
			});
			dispatch({ type: "ClassicyAppFocus", app: { id: "Notes.app" } });
		});
		act(() => {
			useAppManager.setState((s) => ({
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Applications: {
							...s.System.Manager.Applications,
							focusedAppId: "Ext.app",
						},
					},
				},
			}));
		});
		view.rerender(<Tree label="Close B" />);
		expect(appMenuInBar()?.[0].menuChildren?.[0].title).toBe("Close B");
	});

	// An extension window with an empty menu leaves the bar alone (m4).
	it("an extension window that passes appMenu={[]} does not empty the bar", () => {
		render(
			<>
				<ClassicyApp id="Notes.app" name="Notes" icon="">
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
				</ClassicyApp>
				<ClassicyApp id="Float.app" name="Float" icon="" extension>
					<ClassicyWindow
						id="f"
						appId="Float.app"
						title="F"
						appMenu={[]}
						initialSize={[100, 50]}
						initialPosition={[10, 10]}
					>
						<p>float</p>
					</ClassicyWindow>
				</ClassicyApp>
			</>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Float.app", name: "Float", icon: "" },
			});
			dispatch({ type: "ClassicyAppFocus", app: { id: "Notes.app" } });
		});
		expect(appMenuInBar()).toEqual(WINDOW_MENU);
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "Float.app", appMenu: [] },
				window: { id: "f", menuBar: [] },
			});
		});
		expect(appMenuInBar()).toEqual(WINDOW_MENU);
	});

	// RR2-4: an open (`ClassicyAppOpen`) of the running app must not reopen
	// a window record nothing draws, or the windowless menu is lost for the
	// phantom window's menus. `openApp` reopens only mounted windows
	// (story 0226-a6f); the rest reopen themselves if they mount.
	it("an open does not reopen an undrawn window record", () => {
		render(
			<ClassicyApp
				id="Notes.app"
				name="Notes"
				icon=""
				windowlessMenu={NO_WINDOW_MENU}
			/>,
		);
		act(() => {
			useAppManager.setState((s) => ({
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Applications: {
							...s.System.Manager.Applications,
							apps: {
								...s.System.Manager.Applications.apps,
								"Notes.app": {
									id: "Notes.app",
									name: "Notes",
									icon: "",
									open: true,
									focused: true,
									data: {},
									windows: {
										// A closed document whose window no longer mounts.
										gone: {
											id: "gone",
											closed: true,
											size: [1, 1],
											position: [0, 0],
											minimumSize: [1, 1],
											menuBar: WINDOW_MENU,
										},
									},
								},
							},
							focusedAppId: "Notes.app",
						},
					},
				},
			}));
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Notes.app", name: "Notes", icon: "" },
			});
		});
		expect(
			useAppManager.getState().System.Manager.Applications.apps["Notes.app"]
				.windows.gone.closed,
		).toBe(true);
		expect(appMenuInBar()).toEqual(NO_WINDOW_MENU);
	});
});
