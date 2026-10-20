import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

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

	it("marks folder and drive icons with a path as drop targets, and nothing else", () => {
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
		expect(targets).toEqual(["HD", "HD:Desktop Folder:F"]);
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

		expect(onMove).toHaveBeenCalledWith([PLAN, other], {
			kind: "folder",
			path: "HD:Archive",
		});
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
