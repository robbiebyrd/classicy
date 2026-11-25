import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import {
	classicyDesktopIconRenaming,
	resetClassicyDesktopIconRenameForTests,
	startClassicyDesktopIconRename,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
// The Windows-keys package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";

// A Desktop Folder item's name edited in place (the remaining chapters'
// audit's 5.40 and 10.3: Explorer's Rename and New on the desktop, and F2
// under `layout.fileBrowser.keys` "windows"): the label becomes the edit
// field, Return renames the item through the file system and selects its
// icon under the new name, Escape cancels.

const FOLDER = "Macintosh HD:Desktop Folder";
const PLAN = `${FOLDER}:Plan.txt`;
const ITEM_ID = `classicy-desktop-item:${PLAN}`;

const seed = (selected: string[] = []) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.icons = [
					{
						appId: ITEM_ID,
						appName: "Plan.txt",
						icon: "/i.png",
						kind: "file",
						filePath: PLAN,
						location: [10, 10],
					},
				];
				draft.System.Manager.Desktop.selectedIcons = selected;
			}),
		);
	});

const renderIcon = () =>
	render(
		<ClassicyDesktopIcon
			appId={ITEM_ID}
			appName="Plan.txt"
			icon="/i.png"
			kind="file"
			filePath={PLAN}
		/>,
	);
const field = (container: HTMLElement) =>
	container.querySelector<HTMLInputElement>(".classicyDesktopIconRename");

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	resetClassicyDesktopIconRenameForTests();
	const fs = new ClassicyFileSystem();
	fs.mkDir(FOLDER);
	fs.writeFile(PLAN, "x");
});
afterEach(() => {
	cleanup();
	resetClassicyDesktopIconRenameForTests();
	resetClassicyAppearancePackagesForTests();
});

describe("ClassicyDesktopIcon's name edited in place", () => {
	it("draws its label until a rename starts, then the field with the name", () => {
		seed();
		const { container } = renderIcon();
		expect(field(container)).toBeNull();
		expect(container.querySelector("p")?.textContent).toBe("Plan.txt");
		act(() => startClassicyDesktopIconRename(ITEM_ID));
		expect(field(container)?.value).toBe("Plan.txt");
		expect(document.activeElement).toBe(field(container));
	});

	it("renames the item on Return and selects its icon under the new name", () => {
		seed([ITEM_ID]);
		const { container } = renderIcon();
		act(() => startClassicyDesktopIconRename(ITEM_ID));
		const input = field(container) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "Budget.txt" } });
		fireEvent.keyDown(input, { key: "Enter" });
		const fs = new ClassicyFileSystem();
		expect(fs.resolve(PLAN)).toBeUndefined();
		expect(fs.resolve(`${FOLDER}:Budget.txt`)).toBeDefined();
		expect(classicyDesktopIconRenaming()).toBeNull();
		expect(
			useAppManager.getState().System.Manager.Desktop.selectedIcons,
		).toEqual([`classicy-desktop-item:${FOLDER}:Budget.txt`]);
	});

	it("keeps the name on Escape", () => {
		seed();
		const { container } = renderIcon();
		act(() => startClassicyDesktopIconRename(ITEM_ID));
		const input = field(container) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "Other.txt" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(field(container)).toBeNull();
		expect(new ClassicyFileSystem().resolve(PLAN)).toBeDefined();
	});

	it("starts on F2 under Windows' keys for the one selected item, never under the Mac's", () => {
		seed([ITEM_ID]);
		const first = renderIcon();
		const icon = first.container.querySelector(".classicyDesktopIcon");
		fireEvent.keyDown(icon as Element, { key: "F2" });
		expect(classicyDesktopIconRenaming()).toBeNull();
		cleanup();
		registerClassicyAppearancePackage({
			id: "test-desktop-f2",
			name: "F2",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-desktop-f2-default",
				package: "test-desktop-f2",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				fileBrowser: { keys: "windows" },
			},
		});
		const second = renderIcon();
		fireEvent.keyDown(
			second.container.querySelector(".classicyDesktopIcon") as Element,
			{ key: "F2" },
		);
		expect(classicyDesktopIconRenaming()).toBe(ITEM_ID);
		expect(field(second.container)).not.toBeNull();
	});
});
