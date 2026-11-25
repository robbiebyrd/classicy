import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import windows98 from "../../../packages/appearance/windows98/src/windows98.json";
import { Finder } from "./Finder";

// A double-click in a Finder window's list opens every selected item under
// the Windows 98 layout (`selection.modifiers` "windows", the audit's A.9;
// WIG App. A Tables A.2, pp.352-353, and A.3, p.356: a modified
// double-click adjusts the selection, then carries out the default command
// on the set); under the default layout it opens the row under the pointer.

const DOCUMENTS = "Macintosh HD:Documents";
const PROJECTS = `${DOCUMENTS}:Projects`;
const ARCHIVE = `${DOCUMENTS}:Archive`;

const openPaths = () =>
	(
		useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
			?.data as { openPaths?: string[] } | undefined
	)?.openPaths ?? [];

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	const fs = new ClassicyFileSystem();
	fs.mkDir(PROJECTS);
	fs.mkDir(ARCHIVE);
});

afterEach(() => {
	cleanup();
	resetClassicyAppearancePackagesForTests();
	for (const path of [...openPaths()]) {
		dispatch({ type: "ClassicyAppFinderCloseFolder", path });
	}
});

const useWindowsLayout = () =>
	registerClassicyAppearancePackage({
		id: "windows-finder",
		name: "Windows Finder",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "windows-finder-default",
			package: "windows-finder",
		},
		layout: windows98.layout as never,
	});

const renderDocumentsList = async () => {
	dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
	dispatch({
		type: "ClassicyAppFinderSetFolderView",
		path: DOCUMENTS,
		viewType: "list",
	});
	const view = render(<Finder />);
	const row = (path: string) =>
		view.container.querySelector(
			`tr[data-row-id="${CSS.escape(path)}"]`,
		) as HTMLElement;
	await waitFor(() => {
		expect(row(PROJECTS)).not.toBeNull();
		expect(row(ARCHIVE)).not.toBeNull();
	});
	return row;
};

describe("Finder opens every selected item at a double-click (layout.selection.modifiers)", () => {
	it("opens both selected folders under the Windows layout", async () => {
		useWindowsLayout();
		const row = await renderDocumentsList();
		fireEvent.click(row(PROJECTS));
		// Control-double-click on Archive: the first press adds it, the second
		// leaves it, and the whole selection opens.
		fireEvent.mouseDown(row(ARCHIVE), { button: 0, detail: 1, ctrlKey: true });
		fireEvent.click(row(ARCHIVE), { detail: 1, ctrlKey: true });
		fireEvent.mouseDown(row(ARCHIVE), { button: 0, detail: 2, ctrlKey: true });
		fireEvent.click(row(ARCHIVE), { detail: 2, ctrlKey: true });
		fireEvent.doubleClick(row(ARCHIVE), { ctrlKey: true });
		await waitFor(() => {
			expect(openPaths()).toEqual(
				expect.arrayContaining([DOCUMENTS, PROJECTS, ARCHIVE]),
			);
		});
	});

	it("opens the double-clicked folder alone under the default layout", async () => {
		const row = await renderDocumentsList();
		fireEvent.click(row(PROJECTS));
		fireEvent.click(row(ARCHIVE), { metaKey: true });
		fireEvent.doubleClick(row(ARCHIVE));
		await waitFor(() => expect(openPaths()).toContain(ARCHIVE));
		expect(openPaths()).not.toContain(PROJECTS);
	});
});

// The icon view's part (the audit's 5.8 / A.1: the icon view keeps the
// selection a double-click opens): under the Windows 98 layout the press
// selects, the second press of a double-click changes nothing, and the
// double-click opens every selected icon; under the default layout it opens
// the icon double-clicked.
describe("Finder's icon view opens every selected item at a double-click", () => {
	const renderDocumentsIcons = async () => {
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
		dispatch({
			type: "ClassicyAppFinderSetFolderView",
			path: DOCUMENTS,
			viewType: "icons",
		});
		const view = render(<Finder />);
		const icon = (path: string) =>
			view.container.querySelector(
				`.classicyIcon[data-classicy-file-path="${CSS.escape(path)}"]`,
			) as HTMLElement;
		await waitFor(() => {
			expect(icon(PROJECTS)).not.toBeNull();
			expect(icon(ARCHIVE)).not.toBeNull();
		});
		return icon;
	};

	it("opens both selected folders under the Windows layout", async () => {
		useWindowsLayout();
		const icon = await renderDocumentsIcons();
		fireEvent.mouseDown(icon(PROJECTS), { button: 0, detail: 1 });
		fireEvent.click(icon(PROJECTS), { detail: 1 });
		fireEvent.mouseDown(icon(ARCHIVE), { button: 0, detail: 1, ctrlKey: true });
		fireEvent.click(icon(ARCHIVE), { detail: 1, ctrlKey: true });
		fireEvent.mouseDown(icon(ARCHIVE), { button: 0, detail: 2, ctrlKey: true });
		fireEvent.click(icon(ARCHIVE), { detail: 2, ctrlKey: true });
		fireEvent.doubleClick(icon(ARCHIVE), { ctrlKey: true });
		await waitFor(() => {
			expect(openPaths()).toEqual(
				expect.arrayContaining([DOCUMENTS, PROJECTS, ARCHIVE]),
			);
		});
	});

	it("opens the double-clicked folder alone under the default layout", async () => {
		const icon = await renderDocumentsIcons();
		fireEvent.click(icon(PROJECTS));
		fireEvent.click(icon(ARCHIVE), { metaKey: true });
		fireEvent.doubleClick(icon(ARCHIVE));
		await waitFor(() => expect(openPaths()).toContain(ARCHIVE));
		expect(openPaths()).not.toContain(PROJECTS);
	});
});
