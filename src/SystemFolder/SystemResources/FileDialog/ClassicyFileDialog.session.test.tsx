import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { cleanup } from "@testing-library/react";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyFileDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";
import {
	type ClassicyFileDialogVolume,
	fileSystemVolume,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

// WIG Ch.8 "Interaction with Other Windows" (p.146): a secondary window
// shows as last accessed, the Open dialog's current directory included; Mac
// OS 8's Standard File reopened in the last folder too. So under every
// package the dialog reopens, for the rest of the session, at the volume and
// folder its app's dialog was left at: kept in `apps[appId].session`, which
// is never persisted.

const APP = "SessionTest.app";
let counter = 0;
const makeVolumes = (): ClassicyFileDialogVolume[] => {
	const fs = new ClassicyFileSystem(`test-dialog-session-${++counter}`, {
		_type: "directory",
		HD: {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Docs: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				Sub: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"deep.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				},
				"letter.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
			"top.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
		Other: {
			_type: ClassicyFileSystemEntryFileType.Drive,
			"other.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
	});
	return [fileSystemVolume(fs, "HD"), fileSystemVolume(fs, "Other")];
};

const registerLayout = (fileDialog: Record<string, string>) =>
	registerClassicyAppearancePackage({
		id: "test-dialog-session",
		name: "Dialog session",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "test-dialog-session-default",
			package: "test-dialog-session",
		},
		layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, fileDialog },
	});

const rows = () =>
	[
		...document.querySelectorAll(
			".classicyFileOpenDialogWell .classicyTreeNodeLabel",
		),
	].map((el) => el.textContent);
const row = (name: string) =>
	[
		...document.querySelectorAll<HTMLElement>(
			".classicyFileOpenDialogWell .classicyTreeNodeLabel",
		),
	]
		.find((el) => el.textContent === name)
		?.closest(".classicyTreeNodeLabelHolder") as HTMLElement;
const remembered = () =>
	useAppManager.getState().System.Manager.Applications.apps[APP]?.session
		?.fileDialog;

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	dispatch({
		type: "ClassicyAppLoad",
		app: { id: APP, name: "Session Test", icon: "" },
	});
});
afterEach(() => {
	cleanup();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("ClassicyFileDialog's last folder, for the session", () => {
	it("reopens in the folder a flat dialog was left in, and keeps it out of saved state", async () => {
		registerLayout({ navigation: "flat" });
		const volumes = makeVolumes();
		const dialog = (open: boolean) => (
			<ClassicyFileDialog
				id="session-open"
				appId={APP}
				open={open}
				mode="open"
				volumes={volumes}
				onOpenFunc={() => {}}
			/>
		);
		const { rerender } = render(dialog(true));
		await vi.waitFor(() => expect(row("Docs")).toBeTruthy());
		act(() => {
			row("Docs").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
		});
		await vi.waitFor(() => expect(rows()).toEqual(["Sub", "letter.txt"]));
		expect(remembered()).toBeUndefined();
		rerender(dialog(false));
		expect(remembered()).toEqual({ volumeId: "fs-HD", path: ["Docs"] });
		rerender(dialog(true));
		await vi.waitFor(() => expect(rows()).toEqual(["Sub", "letter.txt"]));
		// Session state only: a reload opens the dialog afresh.
		const saved = sanitizeStateForPersistence(useAppManager.getState());
		expect(
			saved.System.Manager.Applications.apps[APP]?.session,
		).toBeUndefined();
	});

	it("keeps the volume it was left on, and falls back to the first volume's top when a place is gone", async () => {
		registerLayout({ navigation: "flat" });
		const volumes = makeVolumes();
		dispatch({
			type: "ClassicyAppRememberFileDialogFolder",
			app: { id: APP },
			volumeId: "fs-Other",
			path: [],
		});
		const { unmount } = render(
			<ClassicyFileDialog
				id="session-open"
				appId={APP}
				open={true}
				mode="open"
				volumes={volumes}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(rows()).toEqual(["other.txt"]));
		unmount();
		dispatch({
			type: "ClassicyAppRememberFileDialogFolder",
			app: { id: APP },
			volumeId: "fs-HD",
			path: ["Gone"],
		});
		const again = render(
			<ClassicyFileDialog
				id="session-open"
				appId={APP}
				open={true}
				mode="open"
				volumes={volumes.slice(0, 1)}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(rows()).toEqual(["Docs", "top.txt"]));
		again.unmount();
		dispatch({
			type: "ClassicyAppRememberFileDialogFolder",
			app: { id: APP },
			volumeId: "fs-Missing",
			path: ["Docs"],
		});
		render(
			<ClassicyFileDialog
				id="session-open"
				appId={APP}
				open={true}
				mode="open"
				volumes={volumes}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(rows()).toEqual(["Docs", "top.txt"]));
	});

	it("reopens Mac OS 8's tree with the folders down to the last one open, and Save's target selected there", async () => {
		const volumes = makeVolumes();
		dispatch({
			type: "ClassicyAppRememberFileDialogFolder",
			app: { id: APP },
			volumeId: "fs-HD",
			path: ["Docs", "Sub"],
		});
		const dialog = (open: boolean) => (
			<ClassicyFileDialog
				id="session-save"
				appId={APP}
				open={open}
				mode="save"
				volumes={volumes}
				formats={[
					{
						label: "Text",
						extension: ".txt",
						fileType: "text_file",
						data: () => "",
					},
				]}
				onSaveFunc={() => {}}
			/>
		);
		const { rerender } = render(dialog(true));
		await vi.waitFor(() =>
			expect(rows()).toEqual([
				"Docs",
				"Sub",
				"deep.txt",
				"letter.txt",
				"top.txt",
			]),
		);
		expect(row("Sub").classList.contains("selected")).toBe(true);
		rerender(dialog(false));
		expect(remembered()).toEqual({ volumeId: "fs-HD", path: ["Docs", "Sub"] });
	});

	it("remembers an Open tree at the selected file's folder", async () => {
		const volumes = makeVolumes();
		const dialog = (open: boolean) => (
			<ClassicyFileDialog
				id="session-open"
				appId={APP}
				open={open}
				mode="open"
				volumes={volumes}
				onOpenFunc={() => {}}
			/>
		);
		const { rerender } = render(dialog(true));
		await vi.waitFor(() => expect(row("Docs")).toBeTruthy());
		fireEvent.click(row("Docs"));
		await vi.waitFor(() => expect(row("letter.txt")).toBeTruthy());
		fireEvent.click(row("letter.txt"));
		rerender(dialog(false));
		expect(remembered()).toEqual({ volumeId: "fs-HD", path: ["Docs"] });
	});
});

// WIG Ch.8 "Open Dialog Box" (pp.155-156, Figure 8.6): Windows' common
// dialogs show the folder in a list view in List mode, the items flowing in
// columns, scrolled sideways; Left and Right move a column. Only a package
// whose `layout.fileDialog.listFlow` is "columns" flows the list so.
describe("ClassicyFileDialog's list in columns", () => {
	const geometry = () => {
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				if (this.classList.contains("classicyTreeNode"))
					return DOMRect.fromRect({
						x: 0,
						y: 0,
						width: 40 + (this.textContent?.length ?? 0),
						height: 20,
					});
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			},
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyFileOpenDialogWellViewport")
					? 45
					: 0;
			},
		);
	};
	afterEach(() => vi.restoreAllMocks());

	const open = () =>
		render(
			<ClassicyFileDialog
				id="columns-open"
				appId={APP}
				open={true}
				mode="open"
				volumes={makeVolumes().slice(0, 1)}
				onOpenFunc={() => {}}
			/>,
		);
	const well = () =>
		document.querySelector(".classicyFileOpenDialogWell") as HTMLElement;

	it("flows one column under the Mac's layout", async () => {
		registerLayout({ navigation: "flat" });
		geometry();
		open();
		await vi.waitFor(() => expect(rows()).toEqual(["Docs", "top.txt"]));
		expect(well().classList.contains("classicyFileOpenDialogWellColumns")).toBe(
			false,
		);
		expect(
			well().style.getPropertyValue("--classicy-file-dialog-list-rows"),
		).toBe("");
	});

	it("flows in columns as many rows deep as the list holds, each as wide as the widest row", async () => {
		registerLayout(windows98.layout.fileDialog);
		geometry();
		open();
		await vi.waitFor(() => expect(rows()).toEqual(["Docs", "top.txt"]));
		expect(well().classList.contains("classicyFileOpenDialogWellColumns")).toBe(
			true,
		);
		// 45 px holds two 20 px rows; "top.txt" is the widest, 47 px.
		await vi.waitFor(() =>
			expect(
				well().style.getPropertyValue("--classicy-file-dialog-list-rows"),
			).toBe("2"),
		);
		expect(
			well().style.getPropertyValue("--classicy-file-dialog-list-column-width"),
		).toBe("47px");
	});

	it("moves a column on Left and Right, and nowhere past the last", async () => {
		registerLayout(windows98.layout.fileDialog);
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyTreeNode")
					? DOMRect.fromRect({ x: 0, y: 0, width: 50, height: 20 })
					: DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			},
		);
		// One row to a column: each item is a column of its own.
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyFileOpenDialogWellViewport")
					? 25
					: 0;
			},
		);
		open();
		await vi.waitFor(() => expect(rows()).toEqual(["Docs", "top.txt"]));
		await vi.waitFor(() =>
			expect(
				well().style.getPropertyValue("--classicy-file-dialog-list-rows"),
			).toBe("1"),
		);
		row("Docs").focus();
		fireEvent.keyDown(row("Docs"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(row("top.txt"));
		fireEvent.keyDown(row("top.txt"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(row("top.txt"));
		fireEvent.keyDown(row("top.txt"), { key: "ArrowLeft" });
		expect(document.activeElement).toBe(row("Docs"));
	});
});
