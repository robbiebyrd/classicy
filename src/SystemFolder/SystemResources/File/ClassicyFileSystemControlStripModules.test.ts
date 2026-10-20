import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	buildControlStripModulesFolder,
	CONTROL_STRIP_MODULES_FOLDER_NAME,
	withControlStripModulesFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemControlStripModules";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

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
