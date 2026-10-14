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
