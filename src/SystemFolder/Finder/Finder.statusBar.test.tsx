import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_EXPLORER_STATUS_ZONE,
	classicyExplorerStatusFiles,
	classicyExplorerStatusObjects,
	classicyExplorerStatusSize,
} from "@/SystemFolder/Finder/FinderStatusBar";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// Explorer's status bar in a folder window (`layout.finder.commands`
// "windows"), in place of the Finder's header; Platinum's header unchanged.
const captured: Record<
	string,
	{ header?: ReactNode; headerVariant?: string } | undefined
> = {};
let selectionChange: ((paths: string[]) => void) | undefined;

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		id,
		header,
		headerVariant,
		children,
	}: {
		id: string;
		header?: ReactNode;
		headerVariant?: string;
		children?: ReactNode;
	}) => {
		captured[id] = { header, headerVariant };
		return (
			<div data-testid={`classicy-window-${id}`}>
				<div data-testid={`header-${id}`}>{header}</div>
				{children}
			</div>
		);
	},
}));

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({
		onSelectionChange,
	}: {
		onSelectionChange?: (paths: string[]) => void;
	}) => {
		selectionChange = onSelectionChange;
		return null;
	},
}));

import { Finder } from "./Finder";

const DOCUMENTS = "Macintosh HD:Documents";

const parts = () =>
	Array.from(
		document.querySelectorAll(
			`[data-testid="header-${DOCUMENTS}"] .classicyWindowStatusPart`,
		),
	).map((part) => part.textContent);

afterEach(() => {
	cleanup();
	selectionChange = undefined;
	for (const key of Object.keys(captured)) delete captured[key];
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS });
});

const openDocuments = async () => {
	dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS });
	render(<Finder />);
	await waitFor(() => expect(captured[DOCUMENTS]).toBeDefined());
};

describe("Explorer's status bar text", () => {
	it("counts the objects, the hidden ones and a selection as shell32 does", () => {
		expect(classicyExplorerStatusObjects(3, 0, 0)).toBe("3 object(s)");
		expect(classicyExplorerStatusObjects(3, 1, 0)).toBe(
			"3 object(s) (plus 1 hidden)",
		);
		expect(classicyExplorerStatusObjects(3, 1, 2)).toBe("2 object(s) selected");
		expect(CLASSICY_EXPLORER_STATUS_ZONE).toBe("My Computer");
	});

	it("writes a size as StrFormatByteSize, empty while unknown", () => {
		expect(classicyExplorerStatusSize(undefined)).toBe("");
		expect(classicyExplorerStatusSize(-1)).toBe("");
		expect(classicyExplorerStatusSize(0)).toBe("0 bytes");
		expect(classicyExplorerStatusSize(512)).toBe("512 bytes");
	});

	it("adds up the selection's files, else the folder's own, never a folder", () => {
		const fs = new ClassicyFileSystem("statusBarTest");
		fs.mkDir(`${DOCUMENTS}:Sub`);
		fs.writeFile(`${DOCUMENTS}:a.txt`, "hello");
		const own = classicyExplorerStatusFiles(fs, DOCUMENTS, []);
		expect(own).toContain(`${DOCUMENTS}:a.txt`);
		expect(own).not.toContain(`${DOCUMENTS}:Sub`);
		expect(
			classicyExplorerStatusFiles(fs, DOCUMENTS, [
				`${DOCUMENTS}:Sub`,
				`${DOCUMENTS}:a.txt`,
			]),
		).toEqual([`${DOCUMENTS}:a.txt`]);
	});
});

describe("Finder's folder window footer", () => {
	it("is Explorer's status bar under finder.commands windows, following the selection", async () => {
		const restore = activateTestWindowsKeysPackage();
		try {
			await openDocuments();
			expect(captured[DOCUMENTS]?.headerVariant).toBe("status");
			await waitFor(() => expect(parts()[1]).not.toBe(""));
			expect(parts()[0]).toMatch(/^\d+ object\(s\)/);
			expect(parts()[2]).toBe("My Computer");
			act(() => selectionChange?.([`${DOCUMENTS}:x`, `${DOCUMENTS}:y`]));
			expect(parts()[0]).toBe("2 object(s) selected");
		} finally {
			restore();
		}
	});

	it("is the Finder's header by default (Platinum), with no status parts", async () => {
		await openDocuments();
		expect(captured[DOCUMENTS]?.headerVariant).toBeUndefined();
		expect(parts()).toEqual([]);
		expect(selectionChange).toBeUndefined();
		expect(
			document.querySelector(`[data-testid="header-${DOCUMENTS}"]`)
				?.textContent,
		).toMatch(/item/);
	});
});
