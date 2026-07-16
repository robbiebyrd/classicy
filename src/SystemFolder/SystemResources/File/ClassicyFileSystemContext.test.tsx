import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyDefaultFileSystemContext,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import {
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemTree,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";

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
