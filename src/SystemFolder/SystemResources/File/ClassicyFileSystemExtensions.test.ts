import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { resetClassicyDerivedAppEntryNameWarnings } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	buildExtensionsFolder,
	withExtensionsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const app = (
	id: string,
	name: string,
	extension = true,
): ClassicyStoreSystemApp => ({
	id,
	name,
	icon: `/icons/${id}.png`,
	windows: {},
	open: true,
	data: {},
	...(extension ? { extension: true } : {}),
});

describe("buildExtensionsFolder", () => {
	it("builds an Extension entry per extension app", () => {
		const folder = buildExtensionsFolder([
			app("ClockExt.app", "Clock"),
			app("NetExt.app", "Network"),
		]);

		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(folder._icon).toBe(ClassicyIcons.system.folders.extensions);
		expect(folder._readOnly).toBe(true);
		expect(folder.Clock).toEqual({
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: "/icons/ClockExt.app.png",
			_creator: "ClockExt.app",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
		expect(folder.Network._creator).toBe("NetExt.app");
	});

	it("excludes non-extension apps", () => {
		const folder = buildExtensionsFolder([
			app("Finder.app", "Finder", false),
			app("ClockExt.app", "Clock"),
		]);

		expect(folder.Finder).toBeUndefined();
		expect(folder.Clock).toBeDefined();
	});
});

describe("withExtensionsFolder", () => {
	// The tree root itself carries no _type (only its named drive children do),
	// mirroring the production root in ClassicyFileSystem.ts — cast through
	// unknown to satisfy the ClassicyFileSystemEntry parameter type.
	const drive = () =>
		({
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"System Folder": {
					_type: ClassicyFileSystemEntryFileType.Directory,
					Finder: {
						_type: ClassicyFileSystemEntryFileType.File,
						_system: true,
					},
				},
			},
		}) as unknown as ClassicyFileSystemEntry;

	it("merges the derived folder into System Folder on the first drive", () => {
		const tree = withExtensionsFolder(drive(), [app("ClockExt.app", "Clock")]);
		const extensions = tree["Macintosh HD"]["System Folder"].Extensions;

		expect(extensions.Clock._creator).toBe("ClockExt.app");
		// sibling seed entries survive
		expect(tree["Macintosh HD"]["System Folder"].Finder._system).toBe(true);
	});

	it("creates System Folder when the drive lacks one", () => {
		const tree = withExtensionsFolder(
			{
				"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
			} as unknown as ClassicyFileSystemEntry,
			[app("ClockExt.app", "Clock")],
		);

		expect(tree["Macintosh HD"]["System Folder"].Extensions.Clock._type).toBe(
			ClassicyFileSystemEntryFileType.Extension,
		);
	});

	it("keeps static Extensions children alongside derived entries", () => {
		const tree = drive();
		tree["Macintosh HD"]["System Folder"].Extensions = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hi",
			},
		};
		const result = withExtensionsFolder(tree, [app("ClockExt.app", "Clock")]);
		const extensions = result["Macintosh HD"]["System Folder"].Extensions;

		expect(extensions["Read Me.txt"]._data).toBe("hi");
		expect(extensions.Clock._creator).toBe("ClockExt.app");
	});

	it("passes through unchanged when no extension apps exist", () => {
		const tree = drive();
		expect(
			withExtensionsFolder(tree, [app("Finder.app", "Finder", false)]),
		).toBe(tree);
	});

	it("passes through a drive-less tree unchanged", () => {
		const tree = {
			Stuff: { _type: ClassicyFileSystemEntryFileType.Directory },
		} as unknown as ClassicyFileSystemEntry;
		expect(withExtensionsFolder(tree, [app("ClockExt.app", "Clock")])).toBe(
			tree,
		);
	});
});

describe("buildExtensionsFolder display names", () => {
	const SINK_ID = "extensions-folder-display-names";
	let entries: ClassicyLogEntry[];
	const warnings = () => entries.filter((entry) => entry.level === "warn");

	beforeEach(() => {
		entries = [];
		resetClassicyDerivedAppEntryNameWarnings();
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => entries.push(entry),
		});
		// The dev console mirror of the expected warnings; keep the output clean.
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		unregisterClassicyLogSink(SINK_ID);
		vi.restoreAllMocks();
	});

	it("keys an entry by its display name and icon, keeping its creator", () => {
		const folder = buildExtensionsFolder([app("A.app", "A")], {
			"A.app": { name: "Ay", icon: "i.png" },
		});

		expect(folder.Ay).toEqual({
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: "i.png",
			_creator: "A.app",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
		expect(folder.A).toBeUndefined();
		expect(warnings()).toHaveLength(0);
	});

	it("gives a colliding display name to the first extension and the later one its own name", () => {
		const folder = buildExtensionsFolder(
			[app("A.app", "A"), app("B.app", "B")],
			{ "A.app": { name: "Same" }, "B.app": { name: "Same" } },
		);

		expect(folder.Same._creator).toBe("A.app");
		expect(folder.B._creator).toBe("B.app");
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0]).toMatchObject({
			subsystem: "ClassicyFileSystem",
			message: "App display name unusable in Extensions; using its own name",
			details: [{ appId: "B.app", name: "Same" }],
		});
	});

	it("falls back to the extension's own name when the display name holds the separator", () => {
		const folder = buildExtensionsFolder(
			[app("A.app", "A")],
			{ "A.app": { name: "A/B" } },
			"/",
		);

		expect(folder.A._creator).toBe("A.app");
		expect(folder["A/B"]).toBeUndefined();
		expect(warnings()).toHaveLength(1);
	});

	it("forwards overrides and the separator through withExtensionsFolder", () => {
		const tree = {
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
		} as unknown as ClassicyFileSystemEntry;
		const result = withExtensionsFolder(
			tree,
			[app("A.app", "A"), app("B.app", "B")],
			{ "A.app": { name: "Ay" }, "B.app": { name: "B/2" } },
			"/",
		);
		const extensions = result["Macintosh HD"]["System Folder"].Extensions;

		expect(extensions.Ay._creator).toBe("A.app");
		expect(extensions.B._creator).toBe("B.app");
		expect(extensions["B/2"]).toBeUndefined();
	});

	it("keeps a static Extensions entry when a display name would take it", () => {
		const tree = {
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"System Folder": {
					_type: ClassicyFileSystemEntryFileType.Directory,
					Extensions: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						Clock: { _type: ClassicyFileSystemEntryFileType.TextFile },
					},
				},
			},
		} as unknown as ClassicyFileSystemEntry;
		const extensions = withExtensionsFolder(
			tree,
			[app("A.app", "A"), app("B.app", "B")],
			{ "A.app": { name: "Clock" }, "B.app": { name: "A" } },
		)["Macintosh HD"]["System Folder"].Extensions;

		// A cannot take the static "Clock"; B cannot take A's own name, which
		// A fell back to, and its own "B" is free.
		expect(extensions.Clock._type).toBe(
			ClassicyFileSystemEntryFileType.TextFile,
		);
		expect(extensions.A._creator).toBe("A.app");
		expect(extensions.B._creator).toBe("B.app");
	});
});
