import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	buildExtensionsFolder,
	withExtensionsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const app = (
	id: string,
	name: string,
	extension = true,
): ClassicyStoreSystemApp => ({
	id,
	name,
	icon: `/icons/${id}.png`,
	windows: [],
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
