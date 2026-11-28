import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { produce } from "immer";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearanceLayout,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The packages below need a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The remaining chapters' audit's 2.2 / 5.27 / B.10 (WIG App. B Table B.2,
// p.358: Alt+Enter; Ch.5 "View Shortcuts", p.47: an Alt double-click) and
// 10.2 / 10.8 (WIG Ch.10 pp.197-198, p.210): Properties from the keyboard
// and the mouse, the package's type names and hidden extensions.

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
		new DOMRect(0, 0, 400, 400),
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	resetClassicyAppearancePackagesForTests();
});

let counter = 0;
const makeFs = () =>
	new ClassicyFileSystem(`test-browser-properties-${++counter}`, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_size: 9,
			},
			"data.bin": { _type: ClassicyFileSystemEntryFileType.File, _size: 1 },
			Projects: { _type: ClassicyFileSystemEntryFileType.Directory },
		},
	});

const registerPackage = (
	layout: Partial<ClassicyAppearanceLayout>,
	fileTypeNames?: Record<string, string>,
) =>
	registerClassicyAppearancePackage({
		id: "test-browser-properties",
		name: "Properties",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "test-browser-properties-default",
			package: "test-browser-properties",
		},
		layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, ...layout },
		...(fileTypeNames ? { fileTypeNames } : {}),
	});

const iconAt = (container: HTMLElement, path: string) =>
	container.querySelector<HTMLElement>(
		`.classicyIcon[data-classicy-file-path="${CSS.escape(path)}"]`,
	);

const renderBrowser = (
	display: "icons" | "list",
	onPropertiesItems?: (paths: string[]) => void,
) => {
	const fileOnClickFunc = vi.fn();
	const view = render(
		<ClassicyFileBrowser
			fs={makeFs()}
			path="Documents"
			appId="Finder.app"
			display={display}
			fileOnClickFunc={fileOnClickFunc}
			onPropertiesItems={onPropertiesItems}
			onRenameItem={() => undefined}
		/>,
	);
	return { ...view, fileOnClickFunc };
};

describe("Properties from the keyboard and the mouse (onPropertiesItems)", () => {
	it("shows the icon view's selection on Alt+Enter, an icon on an Alt double-click", async () => {
		const onProperties = vi.fn();
		const { container, fileOnClickFunc } = renderBrowser("icons", onProperties);
		const icon = await waitFor(() => {
			const el = iconAt(container, "Documents:data.bin");
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		fireEvent.click(icon);
		const enter = new KeyboardEvent("keydown", {
			key: "Enter",
			altKey: true,
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			icon.dispatchEvent(enter);
		});
		expect(onProperties).toHaveBeenLastCalledWith(["Documents:data.bin"]);
		expect(enter.defaultPrevented).toBe(true);
		fireEvent.doubleClick(icon, { altKey: true });
		expect(onProperties).toHaveBeenCalledTimes(2);
		expect(fileOnClickFunc).not.toHaveBeenCalled();
		// Without Alt, a double-click opens it as before.
		fireEvent.doubleClick(icon);
		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:data.bin");
	});

	it("shows a list row's on an Alt double-click anywhere along it", async () => {
		const onProperties = vi.fn();
		const { container, fileOnClickFunc } = renderBrowser("list", onProperties);
		const row = await waitFor(() => {
			const el = container.querySelector<HTMLElement>(
				'tr[data-row-id="Documents:data.bin"]',
			);
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		const lastCell = row.querySelectorAll("td");
		fireEvent.doubleClick(lastCell[lastCell.length - 1], { altKey: true });
		expect(onProperties).toHaveBeenCalledWith(["Documents:data.bin"]);
		expect(fileOnClickFunc).not.toHaveBeenCalled();
	});

	it("calls it with nothing selected on Alt+Enter, for the folder's own", async () => {
		const onProperties = vi.fn();
		const { container } = renderBrowser("list", onProperties);
		await waitFor(() =>
			expect(
				container.querySelector('tr[data-row-id="Documents:data.bin"]'),
			).not.toBeNull(),
		);
		const list = container.querySelector<HTMLElement>(
			".classicyFileBrowserFill",
		) as HTMLElement;
		fireEvent.keyDown(list, { key: "Enter", altKey: true });
		expect(onProperties).toHaveBeenCalledWith([]);
	});

	it("leaves Alt+Enter and an Alt double-click alone without it", async () => {
		const { container, fileOnClickFunc } = renderBrowser("icons");
		const icon = await waitFor(() => {
			const el = iconAt(container, "Documents:data.bin");
			expect(el).not.toBeNull();
			return el as HTMLElement;
		});
		fireEvent.doubleClick(icon, { altKey: true });
		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:data.bin");
	});
});

describe("names as the package shows them", () => {
	const registerHandlers = () =>
		act(() =>
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Applications.fileTypeHandlers.text_file =
						"SimpleText.app";
				}),
			),
		);

	it("hides a registered type's extension in both views under hideRegistered", async () => {
		registerPackage({ files: { extensions: "hideRegistered" } });
		registerHandlers();
		const { container, unmount } = renderBrowser("icons");
		await waitFor(() =>
			expect(iconAt(container, "Documents:Read Me.txt")?.textContent).toContain(
				"Read Me",
			),
		);
		expect(
			iconAt(container, "Documents:Read Me.txt")?.textContent,
		).not.toContain(".txt");
		// The Finder's own type keeps its whole name.
		expect(iconAt(container, "Documents:data.bin")?.textContent).toContain(
			"data.bin",
		);
		unmount();
		renderBrowser("list");
		expect(await screen.findByText("Read Me")).toBeInTheDocument();
		expect(screen.getByText("data.bin")).toBeInTheDocument();
	});

	it("renames the shown name in either view, keeping the hidden extension", async () => {
		registerPackage({ files: { extensions: "hideRegistered" } });
		registerHandlers();
		for (const display of ["icons", "list"] as const) {
			const commandsRef = createRef<ClassicyFileBrowserCommands>();
			const onRenameItem = vi.fn(() => undefined);
			const { container, unmount } = render(
				<ClassicyFileBrowser
					fs={makeFs()}
					path="Documents"
					appId="Finder.app"
					display={display}
					commandsRef={commandsRef}
					onRenameItem={onRenameItem}
				/>,
			);
			await waitFor(() => expect(container.textContent).toContain("Read Me"));
			act(() => commandsRef.current?.rename("Documents:Read Me.txt"));
			const field = await waitFor(() => {
				const input = container.querySelector<HTMLInputElement>(
					"input.classicyIconRename, input.classicyFileBrowserViewTableRename",
				);
				expect(input).not.toBeNull();
				return input as HTMLInputElement;
			});
			expect(field.value).toBe("Read Me");
			fireEvent.change(field, { target: { value: "Notes" } });
			fireEvent.keyDown(field, { key: "Enter" });
			expect(onRenameItem).toHaveBeenCalledWith(
				"Documents:Read Me.txt",
				"Notes.txt",
			);
			unmount();
		}
	});

	it("shows every name whole, and the core's type names, without the keys", async () => {
		registerHandlers();
		const { container, unmount } = renderBrowser("icons");
		await waitFor(() =>
			expect(iconAt(container, "Documents:Read Me.txt")?.textContent).toContain(
				"Read Me.txt",
			),
		);
		unmount();
		renderBrowser("list");
		expect(await screen.findByText("Read Me.txt")).toBeInTheDocument();
		expect(screen.getByText("Text file")).toBeInTheDocument();
		expect(screen.getByText("Directory")).toBeInTheDocument();
	});

	it("names the Kind column's types the package's way", async () => {
		registerPackage(
			{},
			{ text_file: "Text Document", directory: "File Folder" },
		);
		renderBrowser("list");
		expect(await screen.findByText("Text Document")).toBeInTheDocument();
		expect(screen.getByText("File Folder")).toBeInTheDocument();
		// A type it names not keeps the core's name.
		expect(screen.getByText("File")).toBeInTheDocument();
	});
});
