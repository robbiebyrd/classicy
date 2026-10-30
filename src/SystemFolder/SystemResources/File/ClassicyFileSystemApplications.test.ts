import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	buildApplicationsFolder,
	resetClassicyDerivedAppEntryNameWarnings,
	withApplicationsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const appIcon = (
	appId: string,
	appName: string,
	kind = "app_shortcut",
): ClassicyStoreSystemDesktopManagerIcon => ({
	appId,
	appName,
	icon: `/icons/${appId}.png`,
	kind,
});

describe("buildApplicationsFolder", () => {
	it("builds an AppShortcut entry per app_shortcut icon", () => {
		const folder = buildApplicationsFolder([
			appIcon("TV.app", "TV"),
			appIcon("News.app", "News"),
		]);

		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(folder._icon).toBe(ClassicyIcons.system.folders.applications);
		expect(folder._readOnly).toBe(true);
		expect(folder.TV).toEqual({
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: "/icons/TV.app.png",
			_creator: "TV.app",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
		expect(folder.News._creator).toBe("News.app");
	});

	it("excludes icons of other kinds (drives, trash)", () => {
		const folder = buildApplicationsFolder([
			appIcon("Finder.app", "Macintosh HD", "drive"),
			appIcon("Finder.app", "Trash", "trash"),
			appIcon("TV.app", "TV"),
		]);

		expect(folder["Macintosh HD"]).toBeUndefined();
		expect(folder.Trash).toBeUndefined();
		expect(folder.TV).toBeDefined();
	});

	it("returns an empty directory when no app_shortcut icons exist", () => {
		const folder = buildApplicationsFolder([]);
		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(Object.keys(folder).filter((k) => !k.startsWith("_"))).toHaveLength(
			0,
		);
	});

	it("includes a hidden app_shortcut icon (Applications membership is independent of desktop visibility)", () => {
		const folder = buildApplicationsFolder([
			{ ...appIcon("DriveSetup.app", "Drive Setup"), hidden: true },
		]);

		expect(folder["Drive Setup"]).toEqual({
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: "/icons/DriveSetup.app.png",
			_creator: "DriveSetup.app",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
	});
});

describe("Applications folder opt-out", () => {
	// Mirrors what production passes in (ClassicyFileSystem.fs): a root entry
	// whose children are drives.
	const driveTree = (): ClassicyFileSystemEntry => ({
		_type: ClassicyFileSystemEntryFileType.Directory,
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			_icon: "/icons/hd.png",
		},
	});

	it("excludes an app_shortcut icon with inApplications: false", () => {
		const folder = buildApplicationsFolder([
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(folder.TV).toBeDefined();
		expect(folder.Secret).toBeUndefined();
	});

	it("includes icons where inApplications is undefined", () => {
		const folder = buildApplicationsFolder([appIcon("TV.app", "TV")]);
		expect(folder.TV).toBeDefined();
	});

	it("leaves the tree untouched when every app_shortcut opts out", () => {
		const tree = driveTree();
		const result = withApplicationsFolder(tree, [
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result).toBe(tree);
	});

	it("still merges Applications when at least one app opts in", () => {
		const result = withApplicationsFolder(driveTree(), [
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result["Macintosh HD"].Applications.TV).toBeDefined();
		expect(result["Macintosh HD"].Applications.Secret).toBeUndefined();
	});
});

describe("buildApplicationsFolder display names", () => {
	const SINK_ID = "applications-folder-display-names";
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
		const folder = buildApplicationsFolder([appIcon("A.app", "A")], {
			"A.app": { name: "Ay", icon: "i.png" },
		});

		expect(folder.Ay).toEqual({
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: "i.png",
			_creator: "A.app",
			_readOnly: true,
			_nameLocked: true,
			_derived: true,
		});
		expect(folder.A).toBeUndefined();
		expect(warnings()).toHaveLength(0);
	});

	it("gives a colliding display name to the first app and the later one its own name", () => {
		const folder = buildApplicationsFolder(
			[appIcon("A.app", "A"), appIcon("B.app", "B")],
			{ "A.app": { name: "Same" }, "B.app": { name: "Same" } },
		);

		expect(folder.Same._creator).toBe("A.app");
		expect(folder.B._creator).toBe("B.app");
		expect(folder.A).toBeUndefined();
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0]).toMatchObject({
			subsystem: "ClassicyFileSystem",
			message: "App display name unusable in Applications; using its own name",
			details: [{ appId: "B.app", name: "Same" }],
		});
	});

	it("falls back to the app's own name when the display name holds the separator", () => {
		const folder = buildApplicationsFolder(
			[appIcon("A.app", "A")],
			{ "A.app": { name: "A/B" } },
			"/",
		);

		expect(folder.A._creator).toBe("A.app");
		expect(folder["A/B"]).toBeUndefined();
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0].details).toEqual([{ appId: "A.app", name: "A/B" }]);
	});

	it("falls back to the app's own name when the display name starts with an underscore", () => {
		const folder = buildApplicationsFolder([appIcon("A.app", "A")], {
			"A.app": { name: "_icon" },
		});

		expect(folder.A._creator).toBe("A.app");
		expect(folder._icon).toBe(ClassicyIcons.system.folders.applications);
		expect(warnings()).toHaveLength(1);
	});

	it("lists every app when the fallback name is taken too, suffixing the id", () => {
		const folder = buildApplicationsFolder(
			[appIcon("A.app", "A"), appIcon("C.app", "C"), appIcon("B.app", "B")],
			{
				"A.app": { name: "Same" },
				"C.app": { name: "B" },
				"B.app": { name: "Same" },
			},
		);

		// B cannot have "Same" (A's), and its own name "B" is C's display
		// name, so B is listed as "B (B.app)": no app drops out (K-R4).
		expect(folder.Same._creator).toBe("A.app");
		expect(folder.B._creator).toBe("C.app");
		expect(folder["B (B.app)"]._creator).toBe("B.app");
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0].details).toEqual([{ appId: "B.app", name: "Same" }]);
	});

	it("reserves an un-renamed app's own name, even later in icon order", () => {
		// The reviewer's probe: Movie Player renamed "QuickTime Player", ahead
		// of a host app whose own name is "QuickTime Player".
		const folder = buildApplicationsFolder(
			[
				appIcon("MoviePlayer.app", "Movie Player"),
				appIcon("QT.app", "QuickTime Player"),
			],
			{ "MoviePlayer.app": { name: "QuickTime Player" } },
		);

		expect(folder["QuickTime Player"]._creator).toBe("QT.app");
		expect(folder["Movie Player"]._creator).toBe("MoviePlayer.app");
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0].details).toEqual([
			{ appId: "MoviePlayer.app", name: "QuickTime Player" },
		]);
	});

	it("never gives a static entry's name to a display name", () => {
		const folder = buildApplicationsFolder(
			[appIcon("A.app", "A"), appIcon("B.app", "Notes")],
			{ "A.app": { name: "Read Me" }, "B.app": { name: "Bee" } },
			":",
			["Read Me", "Notes"],
		);

		expect(folder["Read Me"]).toBeUndefined();
		expect(folder.A._creator).toBe("A.app");
		// B's display name is free; its own name being a static entry's
		// matters only when it falls back.
		expect(folder.Bee._creator).toBe("B.app");
		expect(warnings()).toHaveLength(1);
	});

	it("suffixes the id when the fallback own name is a static entry's", () => {
		const folder = buildApplicationsFolder(
			[appIcon("A.app", "Notes")],
			{ "A.app": { name: "Read Me" } },
			":",
			["Read Me", "Notes"],
		);

		expect(folder["Read Me"]).toBeUndefined();
		expect(folder.Notes).toBeUndefined();
		expect(folder["Notes (A.app)"]._creator).toBe("A.app");
	});

	it("warns once per collision, however many builds repeat it", () => {
		const icons = [appIcon("A.app", "A"), appIcon("B.app", "B")];
		const overrides = { "A.app": { name: "Same" }, "B.app": { name: "Same" } };
		buildApplicationsFolder(icons, overrides);
		buildApplicationsFolder(icons, overrides);
		expect(warnings()).toHaveLength(1);

		// A different losing app is a different collision.
		buildApplicationsFolder([...icons, appIcon("C.app", "C")], {
			...overrides,
			"C.app": { name: "Same" },
		});
		expect(warnings()).toHaveLength(2);
		expect(warnings()[1].details).toEqual([{ appId: "C.app", name: "Same" }]);
	});

	it("keeps a static Applications entry when a display name would take it", () => {
		const tree = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Applications: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Media Player": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "mine",
					},
				},
			},
		} as ClassicyFileSystemEntry;
		const apps = withApplicationsFolder(
			tree,
			[appIcon("MoviePlayer.app", "Movie Player")],
			{ "MoviePlayer.app": { name: "Media Player" } },
		)["Macintosh HD"].Applications;

		expect(apps["Media Player"]._data).toBe("mine");
		expect(apps["Movie Player"]._creator).toBe("MoviePlayer.app");
	});

	it("keeps last-wins, with no warning, for two apps with one own name", () => {
		const folder = buildApplicationsFolder([
			appIcon("A.app", "Twin"),
			appIcon("B.app", "Twin"),
		]);

		expect(folder.Twin._creator).toBe("B.app");
		expect(warnings()).toHaveLength(0);
	});

	it("lists every app by its own name with no overrides", () => {
		const folder = buildApplicationsFolder([appIcon("A.app", "A")], {});
		expect(folder.A._creator).toBe("A.app");
		expect(folder.A._icon).toBe("/icons/A.app.png");
	});

	it("forwards overrides and the separator through withApplicationsFolder", () => {
		const tree = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Macintosh HD": { _type: ClassicyFileSystemEntryFileType.Drive },
		} as ClassicyFileSystemEntry;
		const result = withApplicationsFolder(
			tree,
			[appIcon("A.app", "A"), appIcon("B.app", "B")],
			{ "A.app": { name: "Ay" }, "B.app": { name: "B/2" } },
			"/",
		);
		const apps = result["Macintosh HD"].Applications;

		expect(apps.Ay._creator).toBe("A.app");
		expect(apps.B._creator).toBe("B.app");
		expect(apps["B/2"]).toBeUndefined();
	});
});
