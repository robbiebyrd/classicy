import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode, RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { FinderData } from "@/SystemFolder/Finder/FinderContext";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

// Captures the `appMenu` each window is handed, keyed by window id. Mocking
// ClassicyWindow (rather than ClassicyFileBrowser, as Finder.folderView does)
// is what makes the menu bar itself observable: appMenu never reaches the DOM
// from here, it is handed to the window shell.
const capturedMenuByWindow: Record<string, ClassicyMenuItem[] | undefined> = {};

// The ref Finder hands each folder window's browser. Captured so the Edit menu
// can be driven end to end: the menu item closes over this ref, so a Finder
// that stopped passing it would leave the item wired to a handle nothing ever
// fills — the exact silent failure this file exists to catch.
const capturedSelectionRefByPath: Record<
	string,
	RefObject<ClassicyTableSelectionApi | null> | undefined
> = {};

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		id,
		appMenu,
		children,
	}: {
		id: string;
		appMenu?: ClassicyMenuItem[];
		children?: ReactNode;
	}) => {
		capturedMenuByWindow[id] = appMenu;
		return <div data-testid={`classicy-window-${id}`}>{children}</div>;
	},
}));

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({
		path,
		selectionApiRef,
	}: {
		path: string;
		selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	}) => {
		capturedSelectionRefByPath[path] = selectionApiRef;
		return <div data-testid={`classicy-file-browser-${path}`} />;
	},
}));

// Stubbed so this file stays about the menu bar: the real Preferences window
// pulls in the whole Views tab, and one of these tests opens it.
vi.mock("@/SystemFolder/Finder/FinderPreferences", () => ({
	FinderPreferences: () => <div data-testid={"finder-preferences"} />,
}));

import { Finder } from "./Finder";

const DOCUMENTS_PATH = "Macintosh HD:Documents";

const finderData = (): FinderData =>
	(useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
		?.data ?? {}) as FinderData;

const folderMenu = (): ClassicyMenuItem[] =>
	capturedMenuByWindow[DOCUMENTS_PATH] ?? [];

const menuNamed = (title: string): ClassicyMenuItem | undefined =>
	folderMenu().find((m) => m.title === title);

const editItem = (title: string): ClassicyMenuItem | undefined =>
	menuNamed("Edit")?.menuChildren?.find((m) => m.title === title);

afterEach(() => {
	cleanup();
	for (const key of Object.keys(capturedMenuByWindow)) {
		delete capturedMenuByWindow[key];
	}
	for (const key of Object.keys(capturedSelectionRefByPath)) {
		delete capturedSelectionRefByPath[key];
	}
	dispatch({ type: "ClassicyAppFinderPreferencesClose" });
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS_PATH });
});

const openDocuments = async () => {
	dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS_PATH });
	render(<Finder />);
	await waitFor(() => {
		expect(capturedMenuByWindow[DOCUMENTS_PATH]).toBeDefined();
	});
};

describe("Finder folder-window menu bar", () => {
	it("puts an Edit menu between File and View", async () => {
		await openDocuments();
		expect(folderMenu().map((m) => m.title)).toEqual([
			"File",
			"Edit",
			"View",
			"Help",
		]);
	});

	it("gives the Edit menu Select All and Preferences…", async () => {
		await openDocuments();
		expect(
			menuNamed("Edit")
				?.menuChildren?.map((m) => m.title)
				.filter((t): t is string => typeof t === "string"),
		).toEqual(["Select All", "Preferences…"]);
		expect(editItem("Select All")?.keyboardShortcut).toBe("⌘A");
	});

	it("opens the Preferences window from Edit → Preferences…", async () => {
		await openDocuments();
		expect(finderData().showPreferences).not.toBe(true);

		act(() => {
			editItem("Preferences…")?.onClickFunc?.();
		});

		expect(finderData().showPreferences).toBe(true);
	});

	it("drives the folder's own selection handle from Edit → Select All", async () => {
		await openDocuments();
		const selectionRef = capturedSelectionRefByPath[DOCUMENTS_PATH];
		// Finder must have handed the browser a ref at all; the assertion below
		// would pass on a menu item wired to an unrelated ref without this.
		expect(selectionRef).toBeDefined();

		const selectAll = vi.fn();
		act(() => {
			if (selectionRef) selectionRef.current = { selectAll };
		});

		act(() => {
			editItem("Select All")?.onClickFunc?.();
		});

		expect(selectAll).toHaveBeenCalledTimes(1);
	});

	it("disables Select All outside the list view and re-enables it inside", async () => {
		await openDocuments();
		// No stored entry: the window opens in list, so the command is live.
		expect(editItem("Select All")?.disabled).toBe(false);

		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "icons",
			});
		});
		await waitFor(() => {
			expect(editItem("Select All")?.disabled).toBe(true);
		});

		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "list",
			});
		});
		await waitFor(() => {
			expect(editItem("Select All")?.disabled).toBe(false);
		});
	});
});
