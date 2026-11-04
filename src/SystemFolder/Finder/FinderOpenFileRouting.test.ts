import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassicyActionTrust } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import { registerClassicyUntrustedActionAllowlist } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import type { HyperCardData } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
// Side-effect imports: each app's reducer registers itself, as the package
// barrel does in the real app.
import "@/SystemFolder/Finder/FinderContext";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/HyperCard/HyperCardContext";

// Every type the kernel's generic app handler is handed from outside the
// kernel (Finder and the open-file router call it through this module). An
// app's own OpenFile case never shows up here; the generic fallback does.
const genericTypes = vi.hoisted((): string[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager")
			>();
		const classicyAppEventHandler: typeof actual.classicyAppEventHandler = (
			ds,
			action,
		) => {
			genericTypes.push(action.type);
			return actual.classicyAppEventHandler(ds, action);
		};
		return { ...actual, classicyAppEventHandler };
	},
);

const apps = (ds: ClassicyStore) => ds.System.Manager.Applications.apps;

const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

/** The default store plus one record for `id`, the handler for `fileType`. */
const storeWith = (
	id: string,
	name: string,
	fileType: ClassicyFileSystemEntryFileType,
	data: Record<string, unknown> = {},
): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps[id] = {
			id,
			name,
			icon: "",
			windows: {},
			open: false,
			data,
		};
		draft.System.Manager.Applications.fileTypeHandlers[fileType] = id;
	});

const finderOpen = (
	ds: ClassicyStore,
	fileType: ClassicyFileSystemEntryFileType,
	path: string,
	trust: ClassicyActionTrust = "trusted",
) =>
	reduce(
		ds,
		{ type: "ClassicyAppFinderOpenFile", file: { _type: fileType }, path },
		trust,
	);

const openFileTypes = () => genericTypes.filter((t) => t.endsWith("OpenFile"));

beforeEach(() => {
	genericTypes.length = 0;
});

// The QuickTime players and PDF Viewer reject a malformed `data` and start a
// fresh `{ openFiles: [] }`; the generic handler would keep the stray key and
// append. So the state after the open tells which case ran.
describe.each([
	{
		label: "Movie Player",
		id: "MoviePlayer.app",
		name: "Movie Player",
		fileType: ClassicyFileSystemEntryFileType.Video,
		path: "Macintosh HD:Videos:clip.mp4",
	},
	{
		label: "Picture Viewer",
		id: "PictureViewer.app",
		name: "Picture Viewer",
		fileType: ClassicyFileSystemEntryFileType.Image,
		path: "Macintosh HD:Pictures:photo.png",
	},
	{
		label: "PDF Viewer",
		id: "PDFViewer.app",
		name: "PDF Viewer",
		fileType: ClassicyFileSystemEntryFileType.Pdf,
		path: "Macintosh HD:Documents:manual.pdf",
	},
])("Finder opens a file in $label", ({ id, name, fileType, path }) => {
	it("reaches the app's own OpenFile case", () => {
		const ds = storeWith(id, name, fileType, {
			openFiles: "corrupt",
			stray: true,
		});

		const result = finderOpen(ds, fileType, path);

		expect(apps(result)[id].data).toEqual({ openFiles: [path] });
		expect(apps(result)[id].open).toBe(true);
		expect(openFileTypes()).toEqual([]);
	});

	it("brings the app forward when the file is already open", () => {
		let ds = storeWith(id, name, fileType);
		ds = finderOpen(ds, fileType, path);
		ds = produce(ds, (draft) => {
			draft.System.Manager.Applications.apps[id].focused = false;
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});

		const result = finderOpen(ds, fileType, path);

		expect(apps(result)[id].data?.openFiles).toEqual([path]);
		expect(result.System.Manager.Applications.focusedAppId).toBe(id);
	});
});

const demoStack: HCStack = {
	name: "Demo",
	variables: {},
	cards: [{ id: "c1", name: "One", parts: [] }],
};

describe("Finder opens a stack in HyperCard", () => {
	it("reaches HyperCard's own OpenFile case, which focuses an open stack", () => {
		const path = "Macintosh HD:Stacks:Demo.stack";
		let ds = storeWith(
			"HyperCard.app",
			"HyperCard",
			ClassicyFileSystemEntryFileType.Stack,
		);
		ds = reduce(ds, {
			type: "ClassicyAppHyperCardOpenStack",
			stackId: path,
			stackSource: path,
			stack: demoStack,
		});
		ds = produce(ds, (draft) => {
			(
				draft.System.Manager.Applications.apps["HyperCard.app"]
					.data as unknown as HyperCardData
			).activeStackId = undefined;
		});

		const result = finderOpen(ds, ClassicyFileSystemEntryFileType.Stack, path);

		const data = apps(result)["HyperCard.app"].data as unknown as HyperCardData;
		// The generic handler would queue the path again; HyperCard's own case
		// focuses the stack that is already open from it.
		expect(data.activeStackId).toBe(path);
		expect(data.openFiles ?? []).toEqual([]);
		expect(openFileTypes()).toEqual([]);
	});
});

// A host app whose internal name differs from its prefix, so only its
// manifest can say where its OpenFile goes.
const HOST_ID = "NotePad.app";
registerApp({
	id: HOST_ID,
	description: "A host note pad.",
	prefix: "ClassicyAppNotePad",
	handler: (ds, action) => {
		if (action.type === "ClassicyAppNotePadOpenFile") {
			const app = ds.System.Manager.Applications.apps[HOST_ID];
			app.data = { ...app.data, lastOpened: action.path };
		}
		return ds;
	},
	actions: {
		ClassicyAppNotePadOpenFile: {
			description: "Open a note from the file system.",
		},
	},
});

// Registered with a reducer but no declared OpenFile: Finder cannot know the
// reducer handles it, so the open stays generic.
registerApp({
	id: "Ledger.app",
	description: "A host ledger with no OpenFile case.",
	prefix: "ClassicyAppLedger",
	handler: (ds) => ds,
});

// A shorter prefix registered first claims every `ClassicyAppShadow…` type,
// so `ClassicyAppShadowedOpenFile` would never reach the app that declares it.
registerApp({
	id: "Shadow.app",
	description: "Claims a prefix another app's types also start with.",
	prefix: "ClassicyAppShadow",
	handler: (ds) => ds,
});
registerApp({
	id: "Shadowed.app",
	description: "Declares an OpenFile the kernel routes elsewhere.",
	prefix: "ClassicyAppShadowed",
	handler: (ds) => ds,
	actions: {
		ClassicyAppShadowedOpenFile: { description: "Never reached." },
	},
});

describe("Finder opens a file in a host app", () => {
	const path = "Macintosh HD:Documents:Notes.txt";
	const text = ClassicyFileSystemEntryFileType.TextFile;

	it("reaches a host app's registered OpenFile reducer case", () => {
		const ds = storeWith(HOST_ID, "Note Pad", text);

		const result = finderOpen(ds, text, path);

		expect(apps(result)[HOST_ID].data).toEqual({ lastOpened: path });
		expect(openFileTypes()).toEqual([]);
	});

	it("gives an app with no handler the generic OpenFile, by its record name", () => {
		const ds = storeWith("TV.app", "TV", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppTVOpenFile"]);
		expect(apps(result)["TV.app"].data?.openFiles).toEqual([path]);
		expect(apps(result)["TV.app"].open).toBe(true);
	});

	it("keeps the generic OpenFile for a reducer that declares no OpenFile", () => {
		const ds = storeWith("Ledger.app", "Ledger", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppLedgerOpenFile"]);
		expect(apps(result)["Ledger.app"].data?.openFiles).toEqual([path]);
	});

	it("keeps the generic OpenFile when the kernel would route the declared type to another app", () => {
		const ds = storeWith("Shadowed.app", "Shadowed", text);

		const result = finderOpen(ds, text, path);

		expect(openFileTypes()).toEqual(["ClassicyAppShadowedOpenFile"]);
		expect(apps(result)["Shadowed.app"].data?.openFiles).toEqual([path]);
	});
});

describe("Finder's open-with under untrusted dispatch", () => {
	// Finder's OpenFile is not scriptable by default; a host has to allowlist
	// it before an untrusted dispatch reaches Finder at all.
	registerClassicyUntrustedActionAllowlist("ClassicyAppFinderOpenFile");
	const path = "Macintosh HD:Documents:Notes.txt";
	const text = ClassicyFileSystemEntryFileType.TextFile;

	it("rejects an app's own OpenFile that is not allowlisted", () => {
		const ds = storeWith(HOST_ID, "Note Pad", text);

		const result = finderOpen(ds, text, path, "untrusted");

		expect(apps(result)[HOST_ID].data).toEqual({});
		expect(apps(result)[HOST_ID].open).toBe(false);
	});

	it("rejects a generic OpenFile that is not allowlisted", () => {
		const ds = storeWith("TV.app", "TV", text);

		const result = finderOpen(ds, text, path, "untrusted");

		expect(apps(result)["TV.app"].data).toEqual({});
		expect(apps(result)["TV.app"].open).toBe(false);
		expect(openFileTypes()).toEqual([]);
	});

	it("routes an allowlisted OpenFile to the app's own case", () => {
		registerClassicyUntrustedActionAllowlist("ClassicyAppNotePadOpenFile");
		const ds = storeWith(HOST_ID, "Note Pad", text);

		const result = finderOpen(ds, text, path, "untrusted");

		expect(apps(result)[HOST_ID].data).toEqual({ lastOpened: path });
	});

	it("routes an allowlisted generic OpenFile", () => {
		registerClassicyUntrustedActionAllowlist("ClassicyAppTVOpenFile");
		const ds = storeWith("TV.app", "TV", text);

		const result = finderOpen(ds, text, path, "untrusted");

		expect(apps(result)["TV.app"].data?.openFiles).toEqual([path]);
	});
});
