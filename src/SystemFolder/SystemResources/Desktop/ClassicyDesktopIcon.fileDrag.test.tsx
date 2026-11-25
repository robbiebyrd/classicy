import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import {
	clearClassicyFileClipboard,
	setClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const PLAN = "HD:Desktop Folder:Plan.txt";
const ITEM_ID = `classicy-desktop-item:${PLAN}`;

const seedIcons = (
	icons: {
		appId: string;
		kind: string;
		filePath?: string;
		location: [number, number];
	}[],
	selected: string[] = [],
) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.icons = icons.map((i) => ({
					appName: i.appId,
					icon: "/i.png",
					...i,
				}));
				draft.System.Manager.Desktop.selectedIcons = selected;
			}),
		);
	});

const location = (appId: string) =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === appId)?.location;

// jsdom has no elementsFromPoint: stub the hit-test to return `target`.
const dragTo = (
	el: Element,
	from: [number, number],
	to: [number, number],
	target: Element,
) => {
	const original = document.elementsFromPoint;
	document.elementsFromPoint = () => [target];
	try {
		fireEvent.mouseDown(el, { button: 0, clientX: from[0], clientY: from[1] });
		fireEvent.mouseMove(document, { clientX: to[0], clientY: to[1] });
		fireEvent.mouseUp(document, { clientX: to[0], clientY: to[1] });
	} finally {
		document.elementsFromPoint = original;
	}
};

describe("ClassicyDesktopIcon — file-backed icons", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("marks folder, drive and Trash icons with a path as drop targets, and nothing else", () => {
		const { container } = render(
			<>
				<ClassicyDesktopIcon
					appId="d"
					appName="Disk"
					icon="/d.png"
					kind="drive"
					filePath="HD"
				/>
				<ClassicyDesktopIcon
					appId="f"
					appName="Folder"
					icon="/f.png"
					kind="directory"
					filePath="HD:Desktop Folder:F"
				/>
				<ClassicyDesktopIcon
					appId="t"
					appName="Trash"
					icon="/t.png"
					kind="trash"
					filePath="Trash"
				/>
				<ClassicyDesktopIcon
					appId="p"
					appName="Plan"
					icon="/p.png"
					kind="file"
					filePath={PLAN}
				/>
				<ClassicyDesktopIcon
					appId="a"
					appName="App"
					icon="/a.png"
					kind="app_shortcut"
				/>
			</>,
		);
		const targets = [
			...container.querySelectorAll("[data-classicy-drop-folder]"),
		].map((el) => el.getAttribute("data-classicy-drop-folder"));
		expect(targets).toEqual(["HD", "HD:Desktop Folder:F", "Trash"]);
	});

	it("drags an outline and moves the icon by the pointer's travel when let go on the desktop", () => {
		seedIcons([
			{ appId: ITEM_ID, kind: "file", filePath: PLAN, location: [100, 100] },
		]);
		const { container } = render(
			<ClassicyDesktopIcon
				appId={ITEM_ID}
				appName="Plan.txt"
				icon="/p.png"
				kind="file"
				filePath={PLAN}
			/>,
		);
		const desktop = document.createElement("div");
		desktop.setAttribute("data-classicy-drop-desktop", "");
		const icon = container.querySelector(".classicyDesktopIcon") as Element;

		fireEvent.mouseDown(icon, { button: 0, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(document, { clientX: 30, clientY: 30 });
		expect(document.querySelector(".classicyFileDragGhost")).not.toBeNull();
		// The icon itself stays put while its outline travels.
		expect(location(ITEM_ID)).toEqual([100, 100]);
		fireEvent.keyDown(document, { key: "Escape" });

		dragTo(icon, [10, 10], [60, 90], desktop);
		expect(location(ITEM_ID)).toEqual([150, 180]);
	});

	it("moves every selected file-backed item into the folder it is let go on", () => {
		const other = "HD:Desktop Folder:Notes.txt";
		seedIcons(
			[
				{ appId: ITEM_ID, kind: "file", filePath: PLAN, location: [100, 100] },
				{
					appId: `classicy-desktop-item:${other}`,
					kind: "file",
					filePath: other,
					location: [100, 200],
				},
				{ appId: "SomeApp", kind: "app_shortcut", location: [100, 300] },
			],
			[ITEM_ID, `classicy-desktop-item:${other}`, "SomeApp"],
		);
		const onMove = vi.fn();
		const { container } = render(
			<ClassicyDesktopIcon
				appId={ITEM_ID}
				appName="Plan.txt"
				icon="/p.png"
				kind="file"
				filePath={PLAN}
				onMoveFilePaths={onMove}
			/>,
		);
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", "HD:Archive");

		dragTo(
			container.querySelector(".classicyDesktopIcon") as Element,
			[10, 10],
			[80, 80],
			folder,
		);

		expect(onMove).toHaveBeenCalledWith(
			[PLAN, other],
			{ kind: "folder", path: "HD:Archive" },
			// The drop target itself, for activateClassicyDropWindow (5.31).
			{ destination: { kind: "folder", path: "HD:Archive" }, element: folder },
		);
		expect(location(ITEM_ID)).toEqual([100, 100]);
	});

	it("opens its item through onOpenFilePath, and never launches an app", () => {
		const onOpen = vi.fn();
		const { container } = render(
			<ClassicyDesktopIcon
				appId={ITEM_ID}
				appName="Plan.txt"
				icon="/p.png"
				kind="file"
				filePath={PLAN}
				noLaunch
				onOpenFilePath={onOpen}
			/>,
		);
		fireEvent.doubleClick(
			container.querySelector(".classicyDesktopIcon") as Element,
		);
		expect(onOpen).toHaveBeenCalledWith(PLAN);
		expect(
			useAppManager.getState().System.Manager.Applications.apps[ITEM_ID],
		).toBeUndefined();
	});
});

// A Control-press on a selected file icon waits for its click to toggle it
// (`selection.modifiers` "windows", the audit's A.6; WIG App. A Table A.3,
// "CTRL+Press" on a selected object: none; "CTRL+Click": unselects it), so
// a drag from it carries the selection, and the release that ends the drag
// over the icon takes nothing out.
describe("ClassicyDesktopIcon — a Control-drag of the selection under the Windows layout", () => {
	const OTHER = "HD:Desktop Folder:Notes.txt";
	const OTHER_ID = `classicy-desktop-item:${OTHER}`;
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		registerClassicyAppearancePackage({
			id: "windows-drag",
			name: "Windows drag",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-drag-default",
				package: "windows-drag",
			},
			layout: windows98.layout as never,
		});
		seedIcons(
			[
				{ appId: ITEM_ID, kind: "file", filePath: PLAN, location: [100, 100] },
				{
					appId: OTHER_ID,
					kind: "file",
					filePath: OTHER,
					location: [100, 200],
				},
			],
			[ITEM_ID, OTHER_ID],
		);
	});
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	const renderPlan = (onMove = vi.fn()) => {
		const { container } = render(
			<ClassicyDesktopIcon
				appId={ITEM_ID}
				appName="Plan.txt"
				icon="/p.png"
				kind="file"
				filePath={PLAN}
				onMoveFilePaths={onMove}
			/>,
		);
		return container.querySelector(".classicyDesktopIcon") as HTMLElement;
	};
	const selected = () =>
		useAppManager.getState().System.Manager.Desktop.selectedIcons;

	it("carries the whole selection and keeps it after the drag", () => {
		const onMove = vi.fn();
		const icon = renderPlan(onMove);
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", "HD:Archive");
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [folder];
		try {
			fireEvent.mouseDown(icon, {
				button: 0,
				ctrlKey: true,
				clientX: 10,
				clientY: 10,
			});
			expect(selected()).toEqual([ITEM_ID, OTHER_ID]);
			fireEvent.mouseMove(document, { clientX: 60, clientY: 60 });
			fireEvent.mouseUp(document, { clientX: 60, clientY: 60 });
			// The release lands back over the icon.
			fireEvent.click(icon, { button: 0, ctrlKey: true });
		} finally {
			document.elementsFromPoint = original;
		}
		expect(onMove).toHaveBeenCalledWith(
			[PLAN, OTHER],
			{ kind: "folder", path: "HD:Archive" },
			expect.objectContaining({
				destination: { kind: "folder", path: "HD:Archive" },
			}),
		);
		expect(selected()).toEqual([ITEM_ID, OTHER_ID]);
	});

	it("takes the icon out of the selection on a Control-click that never dragged", () => {
		const icon = renderPlan();
		fireEvent.mouseDown(icon, { button: 0, ctrlKey: true });
		fireEvent.mouseUp(icon, { button: 0, ctrlKey: true });
		fireEvent.click(icon, { button: 0, ctrlKey: true });
		expect(selected()).toEqual([OTHER_ID]);
		expect(
			useAppManager.getState().System.Manager.Desktop.selectionAnchor,
		).toBe(ITEM_ID);
	});
});

// Explorer's Cut on the desktop (the remaining chapters' audit's 5.28; WIG
// Ch.5 "Command Method Transfers", p.66): a Desktop Folder item cut and
// waiting for a Paste carries `classicyFileCut`, which only a package's
// stylesheet draws; a drive or the Trash never does.
describe("ClassicyDesktopIcon — cut", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => clearClassicyFileClipboard());

	it("carries classicyFileCut while its item is cut, until the clipboard lets it go", () => {
		const { container } = render(
			<>
				<ClassicyDesktopIcon
					appId={ITEM_ID}
					appName="Plan.txt"
					icon="/p.png"
					kind="file"
					filePath={PLAN}
				/>
				<ClassicyDesktopIcon
					appId="d"
					appName="Disk"
					icon="/d.png"
					kind="drive"
					filePath="HD"
				/>
			</>,
		);
		const icons = () =>
			[...container.querySelectorAll(".classicyDesktopIcon")].map((el) =>
				el.classList.contains("classicyFileCut"),
			);
		expect(icons()).toEqual([false, false]);
		act(() => setClassicyFileClipboard("cut", [PLAN, "HD"]));
		expect(icons()).toEqual([true, false]);
		act(() => setClassicyFileClipboard("copy", [PLAN]));
		expect(icons()).toEqual([false, false]);
		act(() => setClassicyFileClipboard("cut", [PLAN]));
		act(() => clearClassicyFileClipboard());
		expect(icons()).toEqual([false, false]);
	});
});
