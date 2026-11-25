import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyOpenWithDialog,
	classicyOpenWithPrompt,
} from "@/SystemFolder/Finder/ClassicyOpenWithDialog";
// Finder's reducer, which the dialog's OK and Cancel reach.
import "@/SystemFolder/Finder/FinderContext";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// The remaining chapters' audit's 10.1 (WIG Ch.10 "Registering File
// Extensions", p.192; Windows 98 SE's Open With, shell32.dll): the dialog
// lists the applications that open files, makes the chosen one the type's
// handler when "Always use" is checked, and opens the file in it under the
// trust the open arrived with.

const PATH = "Macintosh HD:Documents:data.bin";

const finderData = () =>
	(useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
		?.data ?? {}) as { openWith?: unknown };
const appData = (id: string) =>
	(useAppManager.getState().System.Manager.Applications.apps[id]?.data ??
		{}) as { openFiles?: string[] };

const loadApp = (id: string, name: string, handles: string[] = []) => {
	act(() => dispatch({ type: "ClassicyAppLoad", app: { id, name, icon: "" } }));
	act(() =>
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Applications.apps[id].handlesFileTypes =
					handles as never;
			}),
		),
	);
};

let releases: (() => void)[] = [];
let restore: (() => void) | null = null;

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	restore = activateTestWindowsKeysPackage({
		files: { unregisteredOpen: "openWith" },
	});
	const fs = new ClassicyFileSystem();
	fs.writeFile(PATH, "bytes");
	fs.setMetadata(PATH, { _type: "file" as never });
	loadApp("Viewer.app", "Viewer", ["image"]);
	loadApp("Zebra.app", "Zebra", ["video"]);
	loadApp("Idle.app", "Idle");
	loadApp("Unmounted.app", "Unmounted", ["audio"]);
	releases = ["Viewer.app", "Zebra.app", "Idle.app", "Finder.app"].map(
		markClassicyAppMounted,
	);
	act(() =>
		dispatch({
			type: "ClassicyAppFinderOpenFile",
			file: new ClassicyFileSystem().resolve(PATH),
			path: PATH,
		}),
	);
});
afterEach(() => {
	cleanup();
	for (const release of releases) release();
	restore?.();
	restore = null;
});

const renderDialog = () =>
	render(
		<ClassicyOpenWithDialog
			appId={"Finder.app"}
			fs={new ClassicyFileSystem()}
			path={PATH}
		/>,
	);

describe("ClassicyOpenWithDialog", () => {
	it("asks in Windows 98's words, listing the mounted apps that open files", () => {
		expect(finderData().openWith).toEqual({ path: PATH, trust: "trusted" });
		renderDialog();
		expect(screen.getByText("Open With")).toBeInTheDocument();
		expect(
			screen.getByText(classicyOpenWithPrompt("data.bin")),
		).toBeInTheDocument();
		expect(classicyOpenWithPrompt("data.bin")).toBe(
			"Click the program you want to use to open the file 'data.bin'.",
		);
		expect(
			screen.getByText("Choose the program you want to use:"),
		).toBeInTheDocument();
		// Sorted by name; no Finder, no app that opens no file, no unmounted app.
		expect(
			screen.getAllByRole("option").map((option) => option.textContent),
		).toEqual(["Viewer", "Zebra"]);
		expect(
			screen.getByRole("checkbox", {
				name: "Always use this program to open this type of file",
			}),
		).toBeChecked();
		expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
	});

	it("underlines shell32.dll's access keys under a package that has them, none otherwise", () => {
		const { unmount } = renderDialog();
		// Without `menu.accessKeys` no key is drawn.
		expect(
			document.querySelectorAll('[data-classicy-part="access-key"]'),
		).toHaveLength(0);
		unmount();
		restore?.();
		restore = activateTestWindowsKeysPackage({
			files: { unregisteredOpen: "openWith" },
			menu: { keys: "windows", accessKeys: "explicit" },
		});
		renderDialog();
		// "&Choose the program you want to use:", "Always &use this program
		// to open this type of file".
		expect(
			[...document.querySelectorAll('[data-classicy-part="access-key"]')].map(
				(part) => part.textContent,
			),
		).toEqual(["C", "u"]);
	});

	it("opens the file in the app chosen, which becomes the type's handler", () => {
		renderDialog();
		fireEvent.click(screen.getByRole("option", { name: "Viewer" }));
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(appData("Viewer.app").openFiles).toEqual([PATH]);
		expect(
			useAppManager.getState().System.Manager.Applications.fileTypeHandlers
				.file,
		).toBe("Viewer.app");
		expect(finderData().openWith).toBeUndefined();
	});

	it("leaves the type's handler as it was with Always use unchecked", () => {
		renderDialog();
		fireEvent.click(
			screen.getByRole("checkbox", {
				name: "Always use this program to open this type of file",
			}),
		);
		fireEvent.click(screen.getByRole("option", { name: "Zebra" }));
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(appData("Zebra.app").openFiles).toEqual([PATH]);
		expect(
			useAppManager.getState().System.Manager.Applications.fileTypeHandlers
				.file,
		).toBe("Finder.app");
	});

	it("opens nothing on Cancel", () => {
		renderDialog();
		fireEvent.click(screen.getByRole("option", { name: "Viewer" }));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(appData("Viewer.app").openFiles).toBeUndefined();
		expect(finderData().openWith).toBeUndefined();
	});
});
