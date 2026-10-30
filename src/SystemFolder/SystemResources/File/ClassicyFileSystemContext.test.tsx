import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import {
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	getClassicyFileSystemAdapters,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import {
	ClassicyDefaultFileSystemContext,
	resetClassicyFileSystemReconciliation,
	resolveDefaultFileSystem,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemTree,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
// Side-effect imports: register the Movie Player and Finder reducers, as the
// package barrel does in the real app.
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/Finder/FinderContext";

// Every action dispatched through the module, recorded on its way into the
// real store: the wrapper calls straight through, so the reducers still run.
const dispatched = vi.hoisted((): ActionMessage[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const { recordingAppManagerUtils } = await import(
			"@/__tests__/recordingAppManagerUtils"
		);
		return recordingAppManagerUtils(await importOriginal(), dispatched);
	},
);

type ContextValue = {
	defaultFileSystem?: ClassicyFileSystemTree;
	mode: "merge" | "exclusive";
};

function wrapperFor(value: ContextValue) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClassicyDefaultFileSystemContext.Provider value={value}>
				{children}
			</ClassicyDefaultFileSystemContext.Provider>
		);
	};
}

describe("useClassicyFileSystem", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("resolves to DefaultFSContent when no provider is present", () => {
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-no-provider"),
		);
		expect(result.current.fs).toEqual(DefaultFSContent);
	});

	it("resolves to a merge of DefaultFSContent and the override", () => {
		const { result } = renderHook(() => useClassicyFileSystem("test-merge"), {
			wrapper: wrapperFor({
				defaultFileSystem: {
					"Macintosh HD": {
						_type: ClassicyFileSystemEntryFileType.Drive,
						Documents: {
							_type: ClassicyFileSystemEntryFileType.Directory,
							"Welcome.txt": {
								_type: ClassicyFileSystemEntryFileType.TextFile,
								_data: "hello",
							},
						},
					},
				},
				mode: "merge",
			}),
		});
		expect(
			result.current.fs["Macintosh HD"].Documents["Welcome.txt"]._data,
		).toBe("hello");
		// original default content still present alongside the merged addition
		expect(
			result.current.fs["Macintosh HD"].Documents["Read Me.txt"],
		).toBeDefined();
	});

	it("resolves to exactly the override tree in exclusive mode", () => {
		const override = {
			"My Drive": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		const { result } = renderHook(
			() => useClassicyFileSystem("test-exclusive"),
			{
				wrapper: wrapperFor({ defaultFileSystem: override, mode: "exclusive" }),
			},
		);
		expect(result.current.fs).toEqual(override);
	});

	it("resolves to DefaultFSContent when defaultFileSystem is omitted regardless of mode", () => {
		const { result } = renderHook(() => useClassicyFileSystem("test-omitted"), {
			wrapper: wrapperFor({ mode: "exclusive" }),
		});
		expect(result.current.fs).toEqual(DefaultFSContent);
	});
});

describe("useClassicyFileSystem Applications overlay", () => {
	const drive = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Documents: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

	const addAppIcon = (id: string, name: string) => {
		act(() => {
			dispatch({
				type: "ClassicyDesktopIconAdd",
				app: { id, name, icon: `/icons/${id}.png` },
				kind: "app_shortcut",
			});
		});
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("overlays an Applications folder onto the first drive from registered app icons", () => {
		const { result } = renderHook(() => useClassicyFileSystem("test-overlay"), {
			wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
		});

		addAppIcon("TV.app", "TV");

		const apps = result.current.resolve("Macintosh HD:Applications");
		expect(apps._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(apps.TV._type).toBe(ClassicyFileSystemEntryFileType.AppShortcut);
		expect(apps.TV._creator).toBe("TV.app");
	});

	it("reflects icons registered after the initial render", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-overlay-reactive"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);

		addAppIcon("TV.app", "TV");
		expect(
			result.current.resolve("Macintosh HD:Applications:News"),
		).toBeUndefined();

		addAppIcon("News.app", "News");
		expect(
			result.current.resolve("Macintosh HD:Applications:News")._creator,
		).toBe("News.app");
	});

	it("does not persist the overlay to localStorage", () => {
		renderHook(() => useClassicyFileSystem("test-overlay-persist"), {
			wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
		});

		addAppIcon("TV.app", "TV");

		const persisted = localStorage.getItem("test-overlay-persist");
		expect(persisted).not.toBeNull();
		expect(
			JSON.parse(persisted as string)["Macintosh HD"].Applications,
		).toBeUndefined();
	});

	it("keeps consumer-provided static Applications content alongside the overlay", () => {
		const tree = drive();
		// biome-ignore lint/suspicious/noExplicitAny: test fixture
		(tree["Macintosh HD"] as any).Applications = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hi",
			},
		};
		const { result } = renderHook(
			() => useClassicyFileSystem("test-overlay-static"),
			{ wrapper: wrapperFor({ defaultFileSystem: tree, mode: "exclusive" }) },
		);

		addAppIcon("TV.app", "TV");

		const apps = result.current.resolve("Macintosh HD:Applications");
		expect(apps["Read Me.txt"]._data).toBe("hi");
		expect(apps.TV._creator).toBe("TV.app");
	});

	it("leaves a drive-less tree untouched", () => {
		const tree = {
			Stuff: { _type: ClassicyFileSystemEntryFileType.Directory },
		};
		const { result } = renderHook(
			() => useClassicyFileSystem("test-overlay-nodrive"),
			{ wrapper: wrapperFor({ defaultFileSystem: tree, mode: "exclusive" }) },
		);

		addAppIcon("TV.app", "TV");

		expect(result.current.fs).toEqual(tree);
	});

	it("adds no Applications folder when no app icons are registered", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-overlay-empty"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);
		expect(result.current.resolve("Macintosh HD:Applications")).toBeUndefined();
	});
});

describe("useClassicyFileSystem derived folders by display name", () => {
	// Importing the Platinum module registered it; keep that object so every
	// test can put the real Platinum registration back after a reset.
	const platinum = getClassicyAppearancePackage(
		PLATINUM_APPEARANCE_PACKAGE_ID,
	) as ClassicyAppearancePackage;

	const APPLICATIONS = "Macintosh HD:Applications";
	const MEDIA_PLAYER_PATH = `${APPLICATIONS}:Media Player`;

	const resetToPlatinum = () => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	};

	const switchPackage = (packageId: string) =>
		act(() =>
			dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
		);

	// The real hook on the real store, with Movie Player mounted beside it.
	const renderWithMoviePlayer = async () => {
		const view: { fs?: ClassicyFileSystem } = {};
		const Probe = () => {
			view.fs = useClassicyFileSystem();
			return null;
		};
		render(
			<>
				<MoviePlayer />
				<Probe />
			</>,
		);
		await waitFor(() =>
			expect(
				view.fs?.resolve(`${APPLICATIONS}:${MoviePlayerAppInfo.name}`),
			).toBeDefined(),
		);
		return () => view.fs as ClassicyFileSystem;
	};

	// Names a folder lists, metadata keys aside.
	const listed = (folder: ClassicyFileSystemEntry) =>
		Object.keys(folder).filter((key) => !key.startsWith("_"));

	beforeEach(() => {
		localStorage.clear();
		resetToPlatinum();
		registerTestRenamePackage();
		dispatched.length = 0;
	});

	afterEach(() => {
		resetToPlatinum();
	});

	it("relists Applications by display name on a package switch, and back", async () => {
		const fs = await renderWithMoviePlayer();
		expect(listed(fs().resolve(APPLICATIONS))).toContain("Movie Player");

		dispatched.length = 0;
		switchPackage(TEST_RENAME_PACKAGE_ID);

		const renamed = listed(fs().resolve(APPLICATIONS));
		expect(renamed).toContain("Media Player");
		expect(renamed).not.toContain("Movie Player");
		expect(fs().resolve(MEDIA_PLAYER_PATH)._creator).toBe(
			MoviePlayerAppInfo.id,
		);

		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);

		const restored = listed(fs().resolve(APPLICATIONS));
		expect(restored).toContain("Movie Player");
		expect(restored).not.toContain("Media Player");
		// The overlay followed the package alone: no other action reached the
		// store, so the store's icon and app sets never changed.
		expect(dispatched).toEqual([
			{
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_RENAME_PACKAGE_ID,
			},
			{
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: PLATINUM_APPEARANCE_PACKAGE_ID,
			},
		]);
	});

	it("opens Movie Player from its renamed Applications entry", async () => {
		const fs = await renderWithMoviePlayer();
		switchPackage(TEST_RENAME_PACKAGE_ID);

		const entry = fs().resolve(MEDIA_PLAYER_PATH);
		expect(entry).toBeDefined();
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				MoviePlayerAppInfo.id
			].open,
		).toBeFalsy();

		act(() =>
			dispatch({
				type: "ClassicyAppFinderOpenFile",
				file: entry,
				path: MEDIA_PLAYER_PATH,
			}),
		);

		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				MoviePlayerAppInfo.id
			].open,
		).toBe(true);
	});

	it("persists no display name outside derived entries", async () => {
		const fs = await renderWithMoviePlayer();
		switchPackage(TEST_RENAME_PACKAGE_ID);
		expect(fs().resolve(MEDIA_PLAYER_PATH)).toBeDefined();

		fs().flushNow();
		const persisted = localStorage.getItem("classicyStorage");
		expect(persisted).not.toBeNull();

		// Every "Media Player" key in the stored tree, with whether it is derived.
		const found: { path: string; derived: boolean }[] = [];
		const walk = (entry: ClassicyFileSystemEntry, path: string) => {
			for (const [key, child] of Object.entries(entry)) {
				if (key.startsWith("_") || typeof child !== "object" || !child) {
					continue;
				}
				const childPath = path ? `${path}:${key}` : key;
				if (key === "Media Player") {
					found.push({ path: childPath, derived: child._derived === true });
				}
				walk(child as ClassicyFileSystemEntry, childPath);
			}
		};
		walk(JSON.parse(persisted as string), "");

		expect(found.filter((hit) => !hit.derived)).toEqual([]);
	});
});

describe("useClassicyFileSystem Extensions overlay", () => {
	const drive = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"System Folder": { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

	const addExtensionApp = (id: string, name: string) => {
		act(() => {
			dispatch({
				type: "ClassicyAppLoad",
				app: { id, name, icon: `/icons/${id}.png` },
				extension: true,
			});
		});
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("overlays registered extensions into System Folder/Extensions", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-ext-overlay"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);

		addExtensionApp("ClockExt.app", "Clock");

		const entry = result.current.resolve(
			"Macintosh HD:System Folder:Extensions:Clock",
		);
		expect(entry._type).toBe(ClassicyFileSystemEntryFileType.Extension);
		expect(entry._creator).toBe("ClockExt.app");
	});

	it("adds no Extensions overlay when no extensions are registered", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-ext-overlay-empty"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);

		expect(
			result.current.resolve("Macintosh HD:System Folder:Extensions"),
		).toBeUndefined();
	});

	it("does not persist the Extensions overlay to localStorage", () => {
		renderHook(() => useClassicyFileSystem("test-ext-overlay-persist"), {
			wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
		});

		addExtensionApp("ClockExt.app", "Clock");

		const persisted = localStorage.getItem("test-ext-overlay-persist");
		expect(persisted).not.toBeNull();
		expect(
			JSON.parse(persisted as string)["Macintosh HD"]["System Folder"]
				.Extensions,
		).toBeUndefined();
	});
});

describe("useClassicyFileSystem Control Strip Modules overlay", () => {
	const drive = () => ({
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"System Folder": { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});
	const folder = "Macintosh HD:System Folder:Control Strip Modules";

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => {
		unregisterClassicyControlStripModule("fs-test-module");
	});

	it("lists each registered module as a file, following registration", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-strip-overlay"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);
		act(() => {
			registerClassicyControlStripModule({
				id: "fs-test-module",
				label: "Weather",
				icon: "/weather-16.png",
				fileIcon: "/weather-32.png",
			});
		});
		const entry = result.current.resolve(`${folder}:Weather`);
		expect(entry._type).toBe(ClassicyFileSystemEntryFileType.Extension);
		expect(entry._icon).toBe("/weather-32.png");

		act(() => {
			unregisterClassicyControlStripModule("fs-test-module");
		});
		expect(result.current.resolve(`${folder}:Weather`)).toBeUndefined();
	});

	it("lists a module with an appId only while its app is mounted", () => {
		registerClassicyControlStripModule({
			id: "fs-test-module",
			appId: "FsOwner.app",
			label: "Owned",
			icon: "/owned.png",
		});
		const { result } = renderHook(
			() => useClassicyFileSystem("test-strip-overlay-owner"),
			{
				wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
			},
		);
		expect(result.current.resolve(`${folder}:Owned`)).toBeUndefined();
		let unmount = () => {};
		act(() => {
			unmount = markClassicyAppMounted("FsOwner.app");
		});
		expect(result.current.resolve(`${folder}:Owned`)._creator).toBe(
			"FsOwner.app",
		);
		act(() => unmount());
		expect(result.current.resolve(`${folder}:Owned`)).toBeUndefined();
	});

	// K-D7: a module an app owns is filed under the app's display name; a
	// module with no owner keeps its own label. Display names never persist.
	it("names an app's module file by the app's display name", () => {
		registerTestAppsPackage("test-fs-strip-rename", {
			"FsOwner.app": { name: "Owner Display" },
			"fs-test-plain": { name: "Not A Module Label" },
		});
		registerClassicyControlStripModule({
			id: "fs-test-module",
			appId: "FsOwner.app",
			label: "Owned",
			icon: "/owned.png",
		});
		registerClassicyControlStripModule({
			id: "fs-test-plain",
			label: "Plain",
			icon: "/plain.png",
		});
		const unmount = markClassicyAppMounted("FsOwner.app");
		try {
			const { result } = renderHook(
				() => useClassicyFileSystem("test-strip-overlay-rename"),
				{
					wrapper: wrapperFor({
						defaultFileSystem: drive(),
						mode: "exclusive",
					}),
				},
			);
			expect(result.current.resolve(`${folder}:Owned`)).toBeDefined();
			act(() => {
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: "test-fs-strip-rename",
				});
			});
			expect(result.current.resolve(`${folder}:Owner Display`)._creator).toBe(
				"FsOwner.app",
			);
			expect(result.current.resolve(`${folder}:Owned`)).toBeUndefined();
			expect(result.current.resolve(`${folder}:Plain`)).toBeDefined();
			expect(localStorage.getItem("test-strip-overlay-rename")).not.toContain(
				"Owner Display",
			);

			act(() => {
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: "platinum",
				});
			});
			expect(result.current.resolve(`${folder}:Owned`)).toBeDefined();
			expect(result.current.resolve(`${folder}:Owner Display`)).toBeUndefined();
		} finally {
			act(() => unmount());
			unregisterClassicyControlStripModule("fs-test-plain");
			unregisterClassicyAppearancePackage("test-fs-strip-rename");
		}
	});

	it("does not persist the overlay to localStorage", () => {
		registerClassicyControlStripModule({
			id: "fs-test-module",
			label: "Weather",
			icon: "/weather.png",
		});
		renderHook(() => useClassicyFileSystem("test-strip-overlay-persist"), {
			wrapper: wrapperFor({ defaultFileSystem: drive(), mode: "exclusive" }),
		});
		const persisted = localStorage.getItem("test-strip-overlay-persist");
		expect(
			JSON.parse(persisted as string)["Macintosh HD"]["System Folder"][
				"Control Strip Modules"
			],
		).toBeUndefined();
	});
});

describe("useClassicyFileSystem sync integration", () => {
	afterEach(() => {
		for (const adapter of getClassicyFileSystemAdapters()) {
			unregisterClassicyFileSystemAdapter(adapter.id);
		}
		resetClassicyFileSystemReconciliation();
	});

	it("rebuilds the filesystem when fsVersion is bumped", () => {
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-fs-version-rebuild"),
		);
		const first = result.current;
		act(() => {
			dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
		});
		expect(result.current).not.toBe(first);
	});

	it("adopts a replacement tree from an adapter reconcile at boot", async () => {
		registerClassicyFileSystemAdapter({
			id: "test-reconcile-hook",
			reconcile: async () => ({
				action: "replace",
				tree: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"Macintosh HD": {
						_type: ClassicyFileSystemEntryFileType.Drive,
						"FromRemote.txt": {
							_type: ClassicyFileSystemEntryFileType.TextFile,
							_data: "remote",
						},
					},
				},
			}),
		});
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-reconcile-hook-key"),
		);
		await waitFor(() => {
			expect(result.current.resolve("Macintosh HD:FromRemote.txt")?._data).toBe(
				"remote",
			);
		});
	});

	it("runs reconciliation only once per storageKey across rebuilds", async () => {
		const reconcile = vi.fn(async () => ({ action: "useLocal" as const }));
		registerClassicyFileSystemAdapter({ id: "test-once", reconcile });
		renderHook(() => useClassicyFileSystem("test-reconcile-once"));
		await waitFor(() => {
			expect(reconcile).toHaveBeenCalledTimes(1);
		});
		act(() => {
			dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(reconcile).toHaveBeenCalledTimes(1);
	});
});

describe("resolveDefaultFileSystem", () => {
	it("returns DefaultFSContent when no override is given", () => {
		expect(resolveDefaultFileSystem(undefined, "merge")).toBe(DefaultFSContent);
	});

	it("returns the override verbatim in exclusive mode", () => {
		const override = { "My Disk": { _type: "drive" } } as never;
		expect(resolveDefaultFileSystem(override, "exclusive")).toBe(override);
	});

	it("merges the override onto DefaultFSContent in merge mode", () => {
		const override = { "My Disk": { _type: "drive" } } as never;
		const resolved = resolveDefaultFileSystem(override, "merge");
		// Base drive preserved AND override drive added.
		expect(resolved["Macintosh HD"]).toBeDefined();
		expect(resolved["My Disk"]).toBeDefined();
	});
});
