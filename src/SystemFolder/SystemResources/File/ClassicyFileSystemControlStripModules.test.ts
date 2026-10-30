import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { resetClassicyDerivedAppEntryNameWarnings } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	buildControlStripModulesFolder,
	CONTROL_STRIP_MODULES_FOLDER_NAME,
	withControlStripModulesFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemControlStripModules";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const sound = { id: "classicy-sound", name: "Sound", icon: "/sound.png" };
const saver = {
	id: "classicy-screen-saver",
	name: "Screen Saver",
	icon: "/saver.png",
	appId: "ScreenSaver.app",
};

describe("buildControlStripModulesFolder", () => {
	it("lists one read-only, unopenable file per module", () => {
		const folder = buildControlStripModulesFolder([sound, saver]);
		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(folder._icon).toBe(ClassicyIcons.system.folders.controlStrip);
		expect(folder.Sound).toEqual({
			_type: ClassicyFileSystemEntryFileType.Extension,
			_icon: "/sound.png",
			_creator: "ControlStrip",
			_format: "ControlStripModule",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
		expect(folder["Screen Saver"]._creator).toBe("ScreenSaver.app");
	});

	it("tells two modules with the same label apart by id", () => {
		const folder = buildControlStripModulesFolder([
			sound,
			{ ...sound, id: "other-sound" },
		]);
		expect(folder.Sound).toBeDefined();
		expect(folder["Sound (other-sound)"]).toBeDefined();
	});
});

describe("withControlStripModulesFolder", () => {
	const tree = {
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"System Folder": {
				_type: ClassicyFileSystemEntryFileType.Directory,
				Finder: { _type: ClassicyFileSystemEntryFileType.File },
			},
		},
	} as unknown as ClassicyFileSystemEntry;

	it("adds System Folder:Control Strip Modules without mutating the tree", () => {
		const next = withControlStripModulesFolder(tree, [sound]);
		const systemFolder = next["Macintosh HD"]["System Folder"];
		expect(systemFolder.Finder).toBeDefined();
		expect(systemFolder[CONTROL_STRIP_MODULES_FOLDER_NAME].Sound).toBeDefined();
		expect(
			tree["Macintosh HD"]["System Folder"][CONTROL_STRIP_MODULES_FOLDER_NAME],
		).toBeUndefined();
	});

	it("passes the tree through with no modules or no drive", () => {
		expect(withControlStripModulesFolder(tree, [])).toBe(tree);
		const noDrive = {} as ClassicyFileSystemEntry;
		expect(withControlStripModulesFolder(noDrive, [sound])).toBe(noDrive);
	});
});

describe("withControlStripModulesFolder rebuilds", () => {
	it("drops a module file once its module is gone, keeping static files", () => {
		const tree = {
			_type: "directory",
			HD: {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"System Folder": {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Control Strip Modules": {
						_type: ClassicyFileSystemEntryFileType.Directory,
						"Static Module": {
							_type: ClassicyFileSystemEntryFileType.Extension,
						},
					},
				},
			},
		} as unknown as Parameters<typeof withControlStripModulesFolder>[0];
		const sound = { id: "s", name: "Sound", icon: "/s.png" };
		const clock = { id: "c", name: "Clock", icon: "/c.png" };
		const folder = (t: typeof tree) =>
			Object.keys(t.HD["System Folder"]["Control Strip Modules"]).filter(
				(k) => !k.startsWith("_"),
			);

		const first = withControlStripModulesFolder(tree, [sound, clock]);
		expect(folder(first)).toEqual(["Static Module", "Sound", "Clock"]);
		const second = withControlStripModulesFolder(first, [sound]);
		expect(folder(second)).toEqual(["Static Module", "Sound"]);
		const none = withControlStripModulesFolder(second, []);
		expect(folder(none)).toEqual(["Static Module"]);
		expect(withControlStripModulesFolder(none, [])).toBe(none);
	});
});

// K-R7: a module's display name never hides a static file in the folder.
describe("withControlStripModulesFolder reserves static names against display names", () => {
	const SINK_ID = "control-strip-modules-display-names";
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

	const mine = (data: string) => ({
		_type: ClassicyFileSystemEntryFileType.TextFile,
		_data: data,
	});
	const treeWith = (statics: Record<string, unknown>) =>
		({
			HD: {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"System Folder": {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Control Strip Modules": {
						_type: ClassicyFileSystemEntryFileType.Directory,
						...statics,
					},
				},
			},
		}) as unknown as ClassicyFileSystemEntry;
	const modulesFolder = (t: ClassicyFileSystemEntry) =>
		t.HD["System Folder"]["Control Strip Modules"];
	/** A module its app owns, shown under the app's display name. */
	const owned = {
		id: "owned",
		name: "Owner Display",
		label: "Owned",
		icon: "/owned.png",
		appId: "Owner.app",
	};

	it("lists the module under its own label when its display name is a static file's", () => {
		const folder = modulesFolder(
			withControlStripModulesFolder(treeWith({ "Owner Display": mine("a") }), [
				owned,
			]),
		);

		expect(folder["Owner Display"]._data).toBe("a");
		expect(folder.Owned._creator).toBe("Owner.app");
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0]).toMatchObject({
			subsystem: "ClassicyFileSystem",
			message:
				"App display name unusable in Control Strip Modules; using its own name",
			details: [
				{ moduleId: "owned", appId: "Owner.app", name: "Owner Display" },
			],
		});
	});

	it('lists it as "<label> (<id>)" when its own label is a static file\'s too', () => {
		const folder = modulesFolder(
			withControlStripModulesFolder(
				treeWith({ "Owner Display": mine("a"), Owned: mine("b") }),
				[owned],
			),
		);

		expect(folder["Owner Display"]._data).toBe("a");
		expect(folder.Owned._data).toBe("b");
		expect(folder["Owned (owned)"]._creator).toBe("Owner.app");
		expect(warnings()[0].message).toBe(
			'App display name unusable in Control Strip Modules; using "Owned (owned)"',
		);
	});

	it("warns once per collision across rebuilds", () => {
		const first = withControlStripModulesFolder(
			treeWith({ "Owner Display": mine("a") }),
			[owned],
		);
		withControlStripModulesFolder(first, [owned]);

		expect(warnings()).toHaveLength(1);
	});

	it("still lets a module shown under its own label replace a static file of that name", () => {
		const folder = modulesFolder(
			withControlStripModulesFolder(treeWith({ Sound: mine("a") }), [
				{ ...sound, label: "Sound" },
			]),
		);

		expect(folder.Sound._creator).toBe("ControlStrip");
		expect(warnings()).toHaveLength(0);
	});
});
