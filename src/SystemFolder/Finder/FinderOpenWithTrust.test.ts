import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyActionTrust,
	registerClassicyUntrustedActionAllowlist,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { routeClassicyAppOpenFile } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppOpenFileRouting";
import { classicyFinderEventHandler } from "@/SystemFolder/Finder/FinderContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
// Side-effect imports: each app's reducer registers itself, as the package
// barrel does in the real app.
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";
import "@/SystemFolder/WebViewer/WebViewerContext";

// Every type the kernel's generic app handler is handed from outside the
// kernel; an app's own OpenFile case never shows up here.
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

const REJECTED = "[ClassicyDesktopStateEventReducer] Rejected untrusted action";

const apps = (ds: ClassicyStore) => ds.System.Manager.Applications.apps;
const desktop = (ds: ClassicyStore) => ds.System.Manager.Desktop;

const reduce = (
	ds: ClassicyStore,
	action: ActionMessage,
	trust: ClassicyActionTrust,
): ClassicyStore =>
	produce(ds, (draft) => {
		classicyDesktopStateEventReducer(draft, action, trust);
	});

/** The default store plus one record for `id`, the handler for `fileType`. */
const storeWith = (
	id: string,
	name: string,
	fileType: ClassicyFileSystemEntryFileType,
): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps[id] = {
			id,
			name,
			icon: "",
			windows: {},
			open: false,
			data: {},
		};
		draft.System.Manager.Applications.fileTypeHandlers[fileType] = id;
	});

const finderOpen = (
	ds: ClassicyStore,
	file: Record<string, unknown>,
	path: string,
	trust: ClassicyActionTrust,
) => reduce(ds, { type: "ClassicyAppFinderOpenFile", file, path }, trust);

const openFileTypes = () => genericTypes.filter((t) => t.endsWith("OpenFile"));

const text = ClassicyFileSystemEntryFileType.TextFile;
const path = "Macintosh HD:Documents:Notes.txt";

// Two host apps with a declared OpenFile. Each test that allowlists a type
// uses its own app, so no test depends on another having run first: the
// allowlist is global and has no reset.
const hostPad = (id: string, prefix: string) =>
	registerApp({
		id,
		description: "A host note pad.",
		prefix,
		handler: (ds, action) => {
			if (action.type === `${prefix}OpenFile`) {
				const app = ds.System.Manager.Applications.apps[id];
				app.data = { ...app.data, lastOpened: action.path };
			}
			return ds;
		},
		actions: {
			[`${prefix}OpenFile`]: { description: "Open a note." },
		},
	});
hostPad("LockedPad.app", "ClassicyAppLockedPad"); // never allowlisted
hostPad("OpenPad.app", "ClassicyAppOpenPad"); // allowlisted by its test

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	genericTypes.length = 0;
	// Finder's OpenFile is not scriptable by default; a host has to allowlist
	// it before an untrusted dispatch reaches Finder at all.
	registerClassicyUntrustedActionAllowlist("ClassicyAppFinderOpenFile");
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	warn.mockRestore();
});

describe("Finder's open-with under untrusted dispatch", () => {
	it("rejects an app's own OpenFile that is not allowlisted", () => {
		const ds = storeWith("LockedPad.app", "Locked Pad", text);

		const result = finderOpen(ds, { _type: text }, path, "untrusted");

		expect(apps(result)["LockedPad.app"].data).toEqual({});
		expect(apps(result)["LockedPad.app"].open).toBe(false);
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyAppLockedPadOpenFile",
		});
	});

	it("rejects a generic OpenFile that is not allowlisted", () => {
		const ds = storeWith("Radio.app", "Radio", text);

		const result = finderOpen(ds, { _type: text }, path, "untrusted");

		expect(apps(result)["Radio.app"].data).toEqual({});
		expect(apps(result)["Radio.app"].open).toBe(false);
		expect(openFileTypes()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyAppRadioOpenFile",
		});
	});

	it("routes an allowlisted OpenFile to the app's own case", () => {
		registerClassicyUntrustedActionAllowlist("ClassicyAppOpenPadOpenFile");
		const ds = storeWith("OpenPad.app", "Open Pad", text);

		const result = finderOpen(ds, { _type: text }, path, "untrusted");

		expect(apps(result)["OpenPad.app"].data).toEqual({ lastOpened: path });
	});

	it("routes an allowlisted generic OpenFile", () => {
		registerClassicyUntrustedActionAllowlist("ClassicyAppTVOpenFile");
		const ds = storeWith("TV.app", "TV", text);

		const result = finderOpen(ds, { _type: text }, path, "untrusted");

		expect(apps(result)["TV.app"].data?.openFiles).toEqual([path]);
	});
});

describe("Finder opening a file itself", () => {
	// A host seed can give Finder's record another name; the generic type it
	// builds then is not the `ClassicyAppFinderOpenFile` that cleared the gate.
	const renamedFinder = (handler: string) =>
		produce(DefaultAppManagerState, (draft) => {
			draft.System.Manager.Applications.apps["Finder.app"].name = "Desk";
			draft.System.Manager.Applications.fileTypeHandlers[text] = handler;
		});

	it.each([
		["as the type's handler", "Finder.app"],
		["as the fallback for a missing handler", "Gone.app"],
	])("checks its own generic OpenFile %s", (_label, handler) => {
		const untrusted = finderOpen(
			renamedFinder(handler),
			{ _type: text },
			path,
			"untrusted",
		);
		expect(apps(untrusted)["Finder.app"].data?.openFiles).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyAppDeskOpenFile",
		});

		const trusted = finderOpen(
			renamedFinder(handler),
			{ _type: text },
			path,
			"trusted",
		);
		expect(apps(trusted)["Finder.app"].data?.openFiles).toEqual([path]);
	});
});

describe("Finder's legacy QuickTime documents", () => {
	const url = "https://example.com/a.mp4";
	const quickTime = {
		_type: ClassicyFileSystemEntryFileType.File,
		_creator: "QuickTime",
		_data: JSON.stringify({ url }),
	};

	it("does not hand an untrusted open to Movie Player", () => {
		const result = finderOpen(
			DefaultAppManagerState,
			quickTime,
			"Macintosh HD:Videos:a.mov",
			"untrusted",
		);

		const player = apps(result)["MoviePlayer.app"];
		expect(player?.data?.openFiles ?? []).toEqual([]);
		expect(player?.open ?? false).toBe(false);
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyAppMoviePlayerOpenDocument",
		});
	});

	it("still opens a trusted one", () => {
		const result = finderOpen(
			DefaultAppManagerState,
			quickTime,
			"Macintosh HD:Videos:a.mov",
			"trusted",
		);

		const player = apps(result)["MoviePlayer.app"];
		expect(player.data?.openFiles).toEqual([{ url }]);
		expect(player.open).toBe(true);
	});
});

describe("Finder's URL shortcuts", () => {
	const url = "https://example.com/";
	const shortcut = (disposition: string) => ({
		_type: ClassicyFileSystemEntryFileType.Shortcut,
		_url: url,
		_openIn: disposition,
	});

	it.each([
		"browser",
		"browser-new",
	])("refuses an untrusted %s shortcut", (disposition) => {
		const result = finderOpen(
			DefaultAppManagerState,
			shortcut(disposition),
			"Macintosh HD:Site",
			"untrusted",
		);

		expect(desktop(result).openUrlRequest ?? null).toBeNull();
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyDesktopOpenUrl",
		});
	});

	it("refuses an untrusted classicy shortcut", () => {
		const result = finderOpen(
			DefaultAppManagerState,
			shortcut("classicy"),
			"Macintosh HD:Site",
			"untrusted",
		);

		expect(apps(result)["WebViewer.app"]).toBeUndefined();
		expect(desktop(result).openUrlRequest ?? null).toBeNull();
		expect(warn).toHaveBeenCalledWith(REJECTED, {
			type: "ClassicyDesktopOpenUrl",
		});
	});

	it.each([
		"browser",
		"browser-new",
	])("still opens a trusted %s shortcut", (disposition) => {
		const result = finderOpen(
			DefaultAppManagerState,
			shortcut(disposition),
			"Macintosh HD:Site",
			"trusted",
		);

		expect(desktop(result).openUrlRequest).toEqual({ url, disposition });
	});

	it("still opens a trusted classicy shortcut", () => {
		const result = finderOpen(
			DefaultAppManagerState,
			shortcut("classicy"),
			"Macintosh HD:Site",
			"trusted",
		);

		expect(apps(result)["WebViewer.app"].data?.openUrls).toEqual([
			{ url, title: "Site" },
		]);
	});
});

describe("open-with without a trust", () => {
	// A JavaScript caller, or one that casts the type away, can still leave
	// trust out. That must never read as trusted.
	const pdf = ClassicyFileSystemEntryFileType.Pdf;

	it("routeClassicyAppOpenFile treats a missing trust as untrusted", () => {
		const ds = storeWith("PDFViewer.app", "PDF Viewer", pdf);
		const route = routeClassicyAppOpenFile as (
			...args: unknown[]
		) => ClassicyStore;

		const result = produce(ds, (draft) =>
			route(draft, { id: "PDFViewer.app", name: "PDF Viewer" }, "a.pdf"),
		);

		expect(apps(result)["PDFViewer.app"].data).toEqual({});
		expect(apps(result)["PDFViewer.app"].open).toBe(false);
	});

	it("Finder's handler treats a missing trust as untrusted", () => {
		const ds = storeWith("Radio.app", "Radio", text);
		const handler = classicyFinderEventHandler as (
			...args: unknown[]
		) => ClassicyStore;

		const result = produce(ds, (draft) =>
			handler(draft, {
				type: "ClassicyAppFinderOpenFile",
				file: { _type: text },
				path,
			}),
		);

		expect(apps(result)["Radio.app"].data).toEqual({});
	});

	it("requires trust in the types", () => {
		const ds = storeWith("Radio.app", "Radio", text);
		const action = { type: "ClassicyAppFinderOpenFile" };
		// The directives hold only while trust is required: a default would
		// leave them unused, which fails the type check.
		produce(ds, (draft) => {
			// @ts-expect-error trust is required
			routeClassicyAppOpenFile(draft, { id: "Radio.app", name: "Radio" }, path);
			// @ts-expect-error trust is required
			classicyFinderEventHandler(draft, action);
		});
	});
});
