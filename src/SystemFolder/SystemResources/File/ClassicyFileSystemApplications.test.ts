import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { CLASSICY_SEEDED_PLACEHOLDER } from "@/SystemFolder/SystemResources/File/ClassicyDerivedFolderPlaceholders.internal";
import {
	buildApplicationsFolder,
	resetClassicyDerivedAppEntryNameWarnings,
	withApplicationsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
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
		expect(warnings()[0].message).toBe(
			'App display name unusable in Applications; using "B (B.app)"',
		);
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

// Story 0096: only placeholders give way to an app; a user's file never does.
describe("withApplicationsFolder keeps static files, replacing only placeholders", () => {
	const SINK_ID = "applications-folder-placeholders";
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

	/** Platinum's seeded stand-in, exactly as builds before `_placeholder`
	 *  stored it. */
	const legacyPlaceholder = () => ({
		_type: ClassicyFileSystemEntryFileType.File,
		_mimeType: "text/plain",
		_data: "File Contents",
		_invisible: true,
	});
	const applicationsWith = (
		statics: Record<string, unknown>,
		icons: ClassicyStoreSystemDesktopManagerIcon[],
	) =>
		withApplicationsFolder(
			{
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Macintosh HD": {
					_type: ClassicyFileSystemEntryFileType.Drive,
					Applications: {
						_type: ClassicyFileSystemEntryFileType.Directory,
						...statics,
					},
				},
			} as ClassicyFileSystemEntry,
			icons,
		)["Macintosh HD"].Applications;

	it('keeps a user file named like an app, listing the app as "<own name> (<id>)"', () => {
		const apps = applicationsWith(
			{
				TV: { _type: ClassicyFileSystemEntryFileType.TextFile, _data: "mine" },
			},
			[appIcon("TV.app", "TV")],
		);

		expect(apps.TV._data).toBe("mine");
		expect(apps["TV (TV.app)"]._creator).toBe("TV.app");
		expect(warnings()).toHaveLength(1);
		expect(warnings()[0]).toMatchObject({
			subsystem: "ClassicyFileSystem",
			message: 'Name "TV" already taken in Applications; using "TV (TV.app)"',
			details: [{ appId: "TV.app", name: "TV" }],
		});
	});

	it("suffixes both apps that share a user file's name", () => {
		const apps = applicationsWith(
			{
				Twin: {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "mine",
				},
			},
			[appIcon("A.app", "Twin"), appIcon("B.app", "Twin")],
		);

		expect(apps.Twin._data).toBe("mine");
		expect(apps["Twin (A.app)"]._creator).toBe("A.app");
		expect(apps["Twin (B.app)"]._creator).toBe("B.app");
		expect(warnings()).toHaveLength(2);
	});

	it('numbers the suffix form when a static file holds "<own name> (<id>)" too', () => {
		const mine = (data: string) => ({
			_type: ClassicyFileSystemEntryFileType.TextFile,
			_data: data,
		});
		const apps = applicationsWith({ TV: mine("a"), "TV (TV.app)": mine("b") }, [
			appIcon("TV.app", "TV"),
		]);

		expect(apps.TV._data).toBe("a");
		expect(apps["TV (TV.app)"]._data).toBe("b");
		expect(apps["TV (TV.app) 2"]._creator).toBe("TV.app");
		expect(warnings()[0].message).toBe(
			'Name "TV" already taken in Applications; using "TV (TV.app) 2"',
		);
	});

	/** Platinum's marked stand-in, exactly as DefaultFSContent seeds it. */
	const seededPlaceholder = () => ({
		...legacyPlaceholder(),
		_placeholder: true,
	});

	it("seeds DefaultFSContent's stand-ins as copies of the frozen placeholder", () => {
		const applications = DefaultFSContent["Macintosh HD"].Applications;
		for (const standIn of [applications.SimpleText, applications.Calculator]) {
			expect({ ...standIn }).toEqual(seededPlaceholder());
			expect(standIn).not.toBe(CLASSICY_SEEDED_PLACEHOLDER);
		}
		expect(Object.isFrozen(CLASSICY_SEEDED_PLACEHOLDER)).toBe(true);
	});

	it("lets a marked placeholder give way to its app while it is exactly as seeded", () => {
		const apps = applicationsWith(
			{ SimpleText: seededPlaceholder(), Calculator: seededPlaceholder() },
			[
				appIcon("SimpleText.app", "SimpleText"),
				appIcon("Calculator.app", "Calculator"),
			],
		);

		expect(apps.SimpleText._creator).toBe("SimpleText.app");
		expect(apps.Calculator._creator).toBe("Calculator.app");
		expect(apps["SimpleText (SimpleText.app)"]).toBeUndefined();
		expect(apps["Calculator (Calculator.app)"]).toBeUndefined();
		expect(warnings()).toHaveLength(0);
	});

	// K-R11: once edited, a marked stand-in is the user's file.
	it.each([
		[
			"saved content (SimpleText's setMetadata)",
			{ _data: "my sums", _modifiedOn: "2026-10-30T00:00:00.000Z" },
		],
		["a modification date alone", { _modifiedOn: "2026-10-30T00:00:00.000Z" }],
		["other contents alone", { _data: "my sums" }],
		["an added key", { _label: "Red" }],
		["another type", { _type: ClassicyFileSystemEntryFileType.TextFile }],
	])("keeps a marked placeholder edited with %s", (_, change) => {
		const apps = applicationsWith(
			{ Calculator: { ...seededPlaceholder(), ...change } },
			[appIcon("Calculator.app", "Calculator")],
		);

		expect(apps.Calculator._creator).toBeUndefined();
		expect(apps["Calculator (Calculator.app)"]._creator).toBe("Calculator.app");
	});

	it("keeps a marked placeholder that has lost a seeded key", () => {
		const { _mimeType, ...trimmed } = seededPlaceholder();
		const apps = applicationsWith({ Calculator: trimmed }, [
			appIcon("Calculator.app", "Calculator"),
		]);

		expect(apps.Calculator._creator).toBeUndefined();
		expect(apps["Calculator (Calculator.app)"]._creator).toBe("Calculator.app");
	});

	it("keeps a marked entry of any other shape", () => {
		const apps = applicationsWith(
			{
				Calculator: {
					_type: ClassicyFileSystemEntryFileType.File,
					_invisible: true,
					_placeholder: true,
				},
			},
			[appIcon("Calculator.app", "Calculator")],
		);

		expect(apps.Calculator._creator).toBeUndefined();
		expect(apps["Calculator (Calculator.app)"]._creator).toBe("Calculator.app");
	});

	it("lets the seeded stand-in give way under any name it marks", () => {
		const apps = applicationsWith({ Notes: seededPlaceholder() }, [
			appIcon("Notes.app", "Notes"),
		]);

		expect(apps.Notes._creator).toBe("Notes.app");
		expect(apps["Notes (Notes.app)"]).toBeUndefined();
	});

	it("keeps a stray non-entry child, listing the app beside it", () => {
		const apps = applicationsWith({ TV: "stray" }, [appIcon("TV.app", "TV")]);

		expect(apps.TV).toBe("stray");
		expect(apps["TV (TV.app)"]._creator).toBe("TV.app");
	});

	it('reports a fallback once per form used, so a later "… 2" is reported too', () => {
		const mine = (data: string) => ({
			_type: ClassicyFileSystemEntryFileType.TextFile,
			_data: data,
		});
		const icons = [appIcon("TV.app", "TV")];
		applicationsWith({ TV: mine("a") }, icons);
		applicationsWith({ TV: mine("a") }, icons);
		applicationsWith({ TV: mine("a"), "TV (TV.app)": mine("b") }, icons);
		applicationsWith({ TV: mine("a"), "TV (TV.app)": mine("b") }, icons);

		expect(warnings().map((entry) => entry.message)).toEqual([
			'Name "TV" already taken in Applications; using "TV (TV.app)"',
			'Name "TV" already taken in Applications; using "TV (TV.app) 2"',
		]);
	});

	it("lets the unmarked SimpleText and Calculator placeholders older builds stored give way", () => {
		const apps = applicationsWith(
			{ SimpleText: legacyPlaceholder(), Calculator: legacyPlaceholder() },
			[
				appIcon("SimpleText.app", "SimpleText"),
				appIcon("Calculator.app", "Calculator"),
			],
		);

		expect(apps.SimpleText._creator).toBe("SimpleText.app");
		expect(apps.Calculator._creator).toBe("Calculator.app");
		expect(apps["SimpleText (SimpleText.app)"]).toBeUndefined();
		expect(warnings()).toHaveLength(0);
	});

	it("keeps a placeholder-shaped file under any other name", () => {
		const apps = applicationsWith({ Notes: legacyPlaceholder() }, [
			appIcon("Notes.app", "Notes"),
		]);

		expect(apps.Notes._creator).toBeUndefined();
		expect(apps.Notes._data).toBe("File Contents");
		expect(apps["Notes (Notes.app)"]._creator).toBe("Notes.app");
	});

	it.each([
		["a creation date", { _createdOn: "2026-10-30T00:00:00.000Z" }],
		["other contents", { _data: "my notes" }],
		["another type", { _type: ClassicyFileSystemEntryFileType.TextFile }],
		["another MIME type", { _mimeType: "text/markdown" }],
		["being visible", { _invisible: false }],
	])("keeps a SimpleText file that differs from the old placeholder by %s", (_, change) => {
		const apps = applicationsWith(
			{ SimpleText: { ...legacyPlaceholder(), ...change } },
			[appIcon("SimpleText.app", "SimpleText")],
		);

		expect(apps.SimpleText._creator).toBeUndefined();
		expect(apps["SimpleText (SimpleText.app)"]._creator).toBe("SimpleText.app");
	});
});
