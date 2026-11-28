import { produce } from "immer";
import { describe, expect, it } from "vitest";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { getClassicyRecentDocuments } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
// Side-effect imports: each app's reducer registers itself, as the package
// barrel does in the real app.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";

// Plan 0020-w98 E2: Finder's open records each document it opens for the
// Windows shell's Start ▸ Documents, wherever the open came from, as
// Windows' shell adds a document opened from the Explorer to its Recent
// folder; programs, folders and refused opens are not documents opened.

const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

const PDF = "Macintosh HD:Documents:manual.pdf";

const store = (): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps["PDFViewer.app"] = {
			id: "PDFViewer.app",
			name: "PDF Viewer",
			icon: "",
			windows: {},
			open: false,
			data: {},
		};
		draft.System.Manager.Applications.fileTypeHandlers[
			ClassicyFileSystemEntryFileType.Pdf
		] = "PDFViewer.app";
	});

const open = (
	ds: ClassicyStore,
	file: Record<string, unknown>,
	path: string,
	trust: ClassicyActionTrust = "trusted",
) => reduce(ds, { type: "ClassicyAppFinderOpenFile", file, path }, trust);

describe("Finder's open and Start ▸ Documents", () => {
	it("lists a document it opens in its app", () => {
		open(store(), { _type: ClassicyFileSystemEntryFileType.Pdf }, PDF);
		expect(getClassicyRecentDocuments()).toEqual([PDF]);
	});

	it("does not list a program, a refused file or a type nothing opens", () => {
		const ds = store();
		open(ds, { _type: ClassicyFileSystemEntryFileType.AppShortcut }, "HD:App");
		open(
			ds,
			{ _type: ClassicyFileSystemEntryFileType.Pdf, _system: true },
			PDF,
		);
		open(
			ds,
			{ _type: ClassicyFileSystemEntryFileType.Extension },
			"HD:System Folder:Ext",
		);
		// A type no app opens: Finder's "cannot open" alert.
		open(ds, { _type: "no_such_type" }, "HD:file.xyz");
		expect(getClassicyRecentDocuments()).toEqual([]);
	});

	it("does not list a document a stack script opened (untrusted)", () => {
		open(
			store(),
			{ _type: ClassicyFileSystemEntryFileType.Pdf },
			PDF,
			"untrusted",
		);
		expect(getClassicyRecentDocuments()).toEqual([]);
	});

	it("follows a document a move takes elsewhere", () => {
		const ds = open(
			store(),
			{ _type: ClassicyFileSystemEntryFileType.Pdf },
			PDF,
		);
		reduce(ds, {
			type: "ClassicyAppFinderPathsMoved",
			moves: [{ from: "Macintosh HD:Documents", to: "Macintosh HD:Old" }],
		});
		expect(getClassicyRecentDocuments()).toEqual([
			"Macintosh HD:Old:manual.pdf",
		]);
	});
});
