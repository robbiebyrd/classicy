// The shell addendum's B9 (audit 5.41; WIG Ch.5 "Scope of Selection",
// p.37): a selection belongs to its window or the desktop, so pressing the
// shell's own elements (the Start button and its menu, a window's taskbar
// button, a notification icon, a window menu bar's title) leaves the
// desktop's `selectedIcons` and every Finder window's selection as they
// were. None of them is `#classicyDesktop` itself, so `ClassicyDesktopFocus`
// never clears the icons for them; a window minimized and restored from its
// button keeps its tree mounted, and so its selection.
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, waitFor } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { CLASSICY_START_MENU_ID } from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = "T.app";

const makeFs = () =>
	new ClassicyFileSystem("test-taskbar-selection", {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"apple.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
			},
			"mango.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/m.pdf",
			},
		},
	});

const renderShell = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<ClassicyApp id={APP_ID} name="Tee" icon="">
					<ClassicyWindow
						id="main"
						appId={APP_ID}
						title="Main"
						collapsable={true}
						appMenu={[
							{
								id: "t-file",
								title: "File",
								menuChildren: [{ id: "t-file-close", title: "Close" }],
							},
						]}
					>
						<ClassicyFileBrowser
							fs={makeFs()}
							path="Documents"
							appId={APP_ID}
							display="list"
						/>
					</ClassicyWindow>
				</ClassicyApp>
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const selectedIcons = () =>
	useAppManager.getState().System.Manager.Desktop.selectedIcons;
const selectedRows = () =>
	Array.from(
		document.querySelectorAll("#T\\.app_main tr.classicyTableRow.selected"),
		(row) => row.getAttribute("data-row-id"),
	);
const mainWindow = () =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP_ID],
		"main",
	);
// A press as a pointer makes it: down, up, click.
const press = (el: Element) => {
	fireEvent.mouseDown(el, { button: 0 });
	fireEvent.mouseUp(el, { button: 0 });
	fireEvent.click(el, { button: 0, detail: 1 });
};

describe("shell presses keep every selection (B9)", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Applications.apps[APP_ID] = {
					id: APP_ID,
					name: "Tee",
					icon: "",
					windows: {},
					open: true,
					data: {},
				};
			}),
		);
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("leaves the desktop's icons and a Finder window's rows selected through every shell press", async () => {
		renderShell();
		await waitFor(() =>
			expect(
				document.querySelectorAll("#T\\.app_main tr.classicyTableRow"),
			).toHaveLength(2),
		);
		// A row selected in the window, and icons selected on the desktop.
		const firstRow = document.querySelector(
			"#T\\.app_main tr.classicyTableRow",
		) as HTMLElement;
		act(() => {
			firstRow.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(selectedRows()).toEqual(["Documents:apple.pdf"]);
		act(() =>
			dispatch({
				type: "ClassicyDesktopIconSelectBox",
				iconIds: ["Finder.app", "Trash"],
			}),
		);
		const icons = selectedIcons();
		expect(icons).toEqual(["Finder.app", "Trash"]);
		const unchanged = () => {
			expect(selectedIcons()).toEqual(icons);
			expect(selectedRows()).toEqual(["Documents:apple.pdf"]);
		};

		// The Start button, opening its menu, and closing it again.
		const start = document.querySelector(".classicyTaskbarStart") as Element;
		press(start);
		expect(document.getElementById(CLASSICY_START_MENU_ID)).not.toBeNull();
		unchanged();
		press(start);
		expect(document.getElementById(CLASSICY_START_MENU_ID)).toBeNull();
		unchanged();

		// The window's taskbar button: activating, minimizing, restoring.
		const task = () =>
			document.querySelector("button.classicyTaskbarTask") as Element;
		// The window is active (its row was just clicked): its button
		// minimizes it, then restores it, then, with another window active,
		// would activate it.
		expect(mainWindow()?.focused).toBe(true);
		press(task());
		expect(mainWindow()?.collapsed).toBe(true);
		unchanged();
		press(task());
		expect(mainWindow()?.collapsed).toBe(false);
		expect(mainWindow()?.focused).toBe(true);
		unchanged();
		// Another app active: the button activates the window.
		act(() =>
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } }),
		);
		expect(mainWindow()?.focused).toBe(false);
		press(task());
		expect(mainWindow()?.focused).toBe(true);
		expect(mainWindow()?.collapsed).toBe(false);
		// Restored, the window shows the selection it had.
		unchanged();

		// A notification icon.
		const tray = document.querySelector(".classicyTaskbarTrayIcon");
		expect(tray).not.toBeNull();
		press(tray as Element);
		unchanged();
		fireEvent.keyDown(document.body, { key: "Escape" });

		// A window menu bar's title.
		const title = document.querySelector(
			"#T\\.app_main .classicyWindowMenuBar .classicyMenuItem",
		);
		expect(title).not.toBeNull();
		press(title as Element);
		unchanged();
	});

	it("still clears the icons for a press on the empty desktop, as before", () => {
		renderShell();
		act(() =>
			dispatch({ type: "ClassicyDesktopIconSelectBox", iconIds: ["Trash"] }),
		);
		const desktop = document.getElementById("classicyDesktop") as Element;
		fireEvent.mouseDown(desktop, { button: 0, clientX: 400, clientY: 300 });
		fireEvent.mouseUp(desktop, { button: 0, clientX: 400, clientY: 300 });
		expect(selectedIcons()).toEqual([]);
	});
});
