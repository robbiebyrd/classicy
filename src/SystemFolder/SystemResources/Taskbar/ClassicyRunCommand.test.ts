import { produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_NO_APP_IDENTITY_OVERRIDES } from "@/Appearance/ClassicyAppIdentity";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyRunCommandContext,
	classicyResolveRunCommand,
	classicyRunCommandText,
	classicyRunMissingMessage,
	openClassicyFolderWindow,
	runClassicyRunTarget,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyRunCommand.internal";
import * as registry from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

// Plan 0020-w98 E2, "Run": what the Windows shell's Run dialog opens for a
// command, in ShellExecute's order, and how it opens it.

const FIXTURE = {
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
		Applications: {
			_type: ClassicyFileSystemEntryFileType.Directory,
		},
	},
	Trash: { _type: ClassicyFileSystemEntryFileType.Directory, _invisible: true },
};

const app = (
	id: string,
	name: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name,
	icon: `${id}.png`,
	windows: {},
	open: false,
	...extra,
});

const context = (
	over: Partial<ClassicyRunCommandContext> = {},
): ClassicyRunCommandContext => ({
	apps: {
		"SimpleText.app": app("SimpleText.app", "SimpleText"),
		"Finder.app": app("Finder.app", "Finder"),
		"ScreenSaver.app": app("ScreenSaver.app", "Screen Saver", {
			extension: true,
		}),
		"Gone.app": app("Gone.app", "Gone"),
	},
	isMounted: (id) => id !== "Gone.app",
	overrides: CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	fs: new ClassicyFileSystem("runCommandTest", FIXTURE),
	...over,
});

describe("classicyRunCommandText", () => {
	it("trims the command and unquotes one in double quotes", () => {
		expect(classicyRunCommandText("  notepad ")).toBe("notepad");
		expect(classicyRunCommandText('"Macintosh HD:Documents"')).toBe(
			"Macintosh HD:Documents",
		);
		expect(classicyRunCommandText('"')).toBe('"');
	});
});

describe("classicyResolveRunCommand", () => {
	it("opens an http(s) URL, and takes no other scheme as one", () => {
		expect(
			classicyResolveRunCommand("https://example.com/a", context()),
		).toEqual({ kind: "url", url: "https://example.com/a" });
		expect(classicyResolveRunCommand("HTTP://x.org", context())).toEqual({
			kind: "url",
			url: "HTTP://x.org",
		});
		expect(classicyResolveRunCommand("javascript:alert(1)", context())).toEqual(
			{ kind: "missing", name: "javascript:alert(1)" },
		);
	});

	it("opens a path, case aside, with the file system's separator or Windows' backslash", () => {
		expect(
			classicyResolveRunCommand("macintosh hd:documents", context()),
		).toEqual({ kind: "folder", path: "Macintosh HD:Documents" });
		expect(
			classicyResolveRunCommand(
				'"Macintosh HD\\Documents\\read me.txt"',
				context(),
			),
		).toEqual({ kind: "file", path: "Macintosh HD:Documents:Read Me.txt" });
		expect(classicyResolveRunCommand("Macintosh HD", context())).toEqual({
			kind: "folder",
			path: "Macintosh HD",
		});
		expect(classicyResolveRunCommand("trash", context())).toEqual({
			kind: "folder",
			path: "Trash",
		});
	});

	it("runs a mounted program by its id, its id without .app, its name or the name shown", () => {
		const simpleText = {
			kind: "app",
			app: {
				id: "SimpleText.app",
				name: "SimpleText",
				icon: "SimpleText.app.png",
			},
		};
		for (const command of ["SimpleText.app", "simpletext", "SIMPLETEXT"])
			expect(classicyResolveRunCommand(command, context())).toEqual(simpleText);
		expect(
			classicyResolveRunCommand(
				"notepad",
				context({ overrides: { "SimpleText.app": { name: "Notepad" } } }),
			),
		).toEqual(simpleText);
	});

	it("finds nothing for an extension, an app not mounted, a metadata key or an unknown name", () => {
		for (const command of [
			"Screen Saver",
			"Gone",
			"Macintosh HD:_type",
			"Macintosh HD:Nope",
			"winword",
		])
			expect(classicyResolveRunCommand(command, context()).kind).toBe(
				"missing",
			);
		expect(classicyResolveRunCommand("   ", context())).toEqual({
			kind: "missing",
			name: "",
		});
	});

	it("names the missing file in Windows' message", () => {
		expect(classicyRunMissingMessage("winword")).toBe(
			"Cannot find the file 'winword' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.",
		);
	});
});

describe("runClassicyRunTarget", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("opens a URL, a file, a program, and nothing for a missing name", () => {
		const dispatch = vi.fn();
		const { fs } = context();
		expect(
			runClassicyRunTarget({ kind: "url", url: "https://a.b" }, fs, dispatch),
		).toBe(true);
		runClassicyRunTarget(
			{ kind: "file", path: "Macintosh HD:Documents:Read Me.txt" },
			fs,
			dispatch,
		);
		const simpleText = { id: "SimpleText.app", name: "SimpleText", icon: "" };
		runClassicyRunTarget({ kind: "app", app: simpleText }, fs, dispatch);
		expect(
			runClassicyRunTarget({ kind: "missing", name: "x" }, fs, dispatch),
		).toBe(false);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "ClassicyDesktopOpenUrl", url: "https://a.b" },
			{
				type: "ClassicyAppFinderOpenFile",
				file: { _type: ClassicyFileSystemEntryFileType.TextFile },
				path: "Macintosh HD:Documents:Read Me.txt",
			},
			{ type: "ClassicyAppOpen", app: simpleText },
		]);
	});

	it("opens a Finder window for a folder, and for the Finder itself one on the startup disk", () => {
		const dispatch = vi.fn();
		const { fs } = context();
		runClassicyRunTarget(
			{ kind: "folder", path: "Macintosh HD:Documents" },
			fs,
			dispatch,
		);
		runClassicyRunTarget(
			{ kind: "app", app: { id: "Finder.app", name: "Finder", icon: "" } },
			fs,
			dispatch,
		);
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			{ type: "ClassicyAppFinderOpenFolder", path: "Macintosh HD:Documents" },
			{ type: "ClassicyAppFinderOpenFolder", path: "Macintosh HD" },
		]);
	});

	it("brings a folder's open window forward, restoring it when minimized, instead of opening another", () => {
		const run = vi
			.spyOn(registry, "runClassicyWindowCommand")
			.mockReturnValue(true);
		const dispatch = vi.fn();
		const window = (collapsed: boolean) => ({
			id: "Macintosh HD",
			closed: false,
			collapsed,
			size: [100, 100] as [number, number],
			position: [0, 0] as [number, number],
			minimumSize: [0, 0] as [number, number],
		});
		for (const collapsed of [false, true]) {
			useAppManager.setState(
				produce(structuredClone(DefaultAppManagerState), (draft) => {
					draft.System.Manager.Applications.apps["Finder.app"].windows = {
						"Macintosh HD": window(collapsed),
					};
				}),
				true,
			);
			openClassicyFolderWindow("Macintosh HD", dispatch);
		}
		expect(run.mock.calls).toEqual([
			["Finder.app", "Macintosh HD", { type: "activate" }],
			["Finder.app", "Macintosh HD", { type: "restore" }],
		]);
		expect(dispatch).not.toHaveBeenCalled();
	});
});
